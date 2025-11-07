<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { crossfade } from 'svelte/transition';
	import { getPocketBase, subscribeToCollection } from '$lib/pocketbase/client.svelte';
	import type {
		ReesesProductsResponse,
		TiersResponse,
		GameStateResponse,
		TypedPocketBase,
		ReesesVotesResponse
	} from '$lib/pocketbase/types';
	import { tierOrder, getTierStyle, type TierLetter } from './tiers';
	import { goto } from '$app/navigation';

	type TLProduct = {
		id: string;
		name: string;
		imageUrl: string | null;
		tier: TierLetter | null;
		order: number;
	};

	const [send, receive] = crossfade({
		duration: (d) => Math.min(600, Math.max(250, d / 2)),
		fallback: () => ({ duration: 350 })
	});

	let products = $state<TLProduct[]>([]);
	let loading = $state(true);
	let advancing = $state(false);
	let gameState = $state<GameStateResponse | null>(null);
	let previousProductNum = $state<number>(0);
	let votes = $state<ReesesVotesResponse[]>([]);

	let pb: TypedPocketBase | null = null;
	let unsubGameState: (() => void) | null = null;
	let unsubVotes: (() => void) | null = null;
	let tiers = $state<TiersResponse[]>([]);
	let confettiCanvas: HTMLCanvasElement | null = $state(null);

	const getVoteCount = (tierLetter: TierLetter) => {
		const tierRecord = tiers.find((t) => t.Rank === tierLetter);
		return tierRecord ? votes.filter((v) => v.tier === tierRecord.id).length : 0;
	};

	const rankToLetter = (rank: string): TierLetter | null => {
		const r = rank.trim().toUpperCase();
		return ['S', 'A', 'B', 'C', 'D', 'F'].includes(r) ? (r as TierLetter) : null;
	};

	const keyObj = (id: string | null) => ({ key: id });

	const currentProduct = $derived(
		products.find((p) => p.order === gameState?.currentProductNum) ?? null
	);

	const placedProducts = $derived(
		products.filter((p) => p.tier && p.order < (gameState?.currentProductNum ?? 0))
	);

	const unplacedProducts = $derived(
		products.filter((p) => p.order >= (gameState?.currentProductNum ?? 0))
	);

	const getPlacedByTier = (tier: TierLetter) => placedProducts.filter((p) => p.tier === tier);

	const toUrl = (rec: ReesesProductsResponse) => {
		const img = rec.image?.[0];
		if (!img || !pb) return null;
		try {
			return pb.files.getURL(rec, img);
		} catch {
			const base = pb.baseURL ?? 'http://127.0.0.1:8090';
			return `${base}/api/files/${rec.collectionId}/${rec.id}/${encodeURIComponent(img)}`;
		}
	};

	const triggerConfetti = () => {
		if (!confettiCanvas) return;
		const ctx = confettiCanvas.getContext('2d');
		if (!ctx) return;

		const colors = ['#ff6b6b', '#ffd166', '#06ffa5', '#6b9eff', '#a78bfa', '#f97316'];
		const canvas = confettiCanvas; // Capture for closure
		const particles = Array.from({ length: 100 }, () => ({
			x: canvas.width / 2,
			y: canvas.height / 2,
			vx: (Math.random() - 0.5) * 15,
			vy: (Math.random() - 0.5) * 15 - 5,
			color: colors[Math.floor(Math.random() * colors.length)],
			size: Math.random() * 8 + 4,
			rotation: Math.random() * 360,
			rotationSpeed: (Math.random() - 0.5) * 10
		}));

		const startTime = Date.now();
		const duration = 3000;
		const gravity = 0.05;

		const animate = () => {
			if (!canvas || !ctx || Date.now() - startTime > duration) {
				ctx?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0);
				return;
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			particles.forEach((p) => {
				p.vy += gravity;
				p.x += p.vx;
				p.y += p.vy;
				p.rotation += p.rotationSpeed;

				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate((p.rotation * Math.PI) / 180);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
				ctx.restore();
			});
			requestAnimationFrame(animate);
		};
		animate();
	};

	onMount(async () => {
		loading = true;
		try {
			pb = getPocketBase();

			if (!pb.authStore.isValid) {
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				await goto('/login');
				return;
			}

			const [tiers, rawProducts, gs, reesesVotes] = await Promise.all([
				pb.collection('tiers').getFullList<TiersResponse>({ batch: 200 }),
				pb
					.collection('reesesProducts')
					.getFullList<ReesesProductsResponse>({ batch: 200, sort: 'order' }),
				pb.collection('gameState').getFirstListItem<GameStateResponse>(''),
				pb
					.collection('reesesVotes')
					.getFullList<ReesesVotesResponse>({ batch: 200, expand: 'product,user,tier' })
			]);
			console.log('Fetched tiers, products, and game state:', { tiers, rawProducts, gs, votes });
			votes = reesesVotes;
			gameState = gs;

			const tierMap = new Map(
				tiers.map((t) => [t.id, rankToLetter(t.Rank)]).filter(([/* unused */, letter]) => letter) as Array<
					[string, TierLetter]
				>
			);

			products = rawProducts.map((p) => ({
				id: p.id,
				name: p.name,
				imageUrl: toUrl(p),
				order: p.order,
				tier: p.tier ? (tierMap.get(p.tier) ?? null) : null
			}));

			previousProductNum = gs.currentProductNum;

			unsubGameState = subscribeToCollection<GameStateResponse>(
				'gameState',
				'*',
				async ({ record }) => {
					const prevNum = gameState?.currentProductNum ?? 0;
					gameState = record;

					// If product changed and it's moving forward, trigger confetti
					if (record.currentProductNum > prevNum && record.currentProductNum > previousProductNum) {
						triggerConfetti();

						// Wait for animation before marking as ready for next
						await tick();
						await new Promise((r) => setTimeout(r, 450));
						previousProductNum = record.currentProductNum;
						advancing = false;
					}
				}
			);

			// Subscribe to votes for real-time updates
			unsubVotes = subscribeToCollection<ReesesVotesResponse>(
				'reesesVotes',
				'*',
				({ record, action }) => {
					if (action === 'delete') {
						votes = votes.filter((v) => v.id !== record.id);
					} else if (action === 'create') {
						votes = [...votes, record];
					} else if (action === 'update') {
						votes = votes.map((v) => (v.id === record.id ? record : v));
					}
				}
			);
		} finally {
			loading = false;
		}
	});

	onDestroy(() => {
		unsubGameState?.();
		unsubVotes?.();
	});

	const advance = async () => {
		if (advancing || !pb || !gameState?.id) return;

		advancing = true;
		try {
			if (!gameState.interactionEnabled && gameState.currentProductNum > 0) {
				await pb.collection('gameState').update(gameState.id, {
					interactionEnabled: false
				});
			} else {
				await pb.collection('gameState').update(gameState.id, {
					interactionEnabled: true,
					currentProductNum: gameState.currentProductNum + 1
				});
			}
		} catch (e) {
			console.error('Failed to advance product', e);
			advancing = false;
		}
	};
</script>

<div class="relative mx-auto max-w-6xl space-y-6 p-6">
	<!-- Confetti canvas overlay -->
	<canvas
		bind:this={confettiCanvas}
		class="pointer-events-none fixed inset-0 z-50"
		width={typeof window !== 'undefined' ? window.innerWidth : 1920}
		height={typeof window !== 'undefined' ? window.innerHeight : 1080}
	></canvas>

	<!-- decorative floating blobs -->
	<div
		aria-hidden="true"
		class="animate-blob pointer-events-none absolute -top-8 -left-8 h-40 w-40 rounded-full bg-linear-to-br from-pink-400 to-yellow-300 opacity-60 blur-2xl"
	></div>
	<div
		aria-hidden="true"
		class="animate-blob animation-delay-2000 pointer-events-none absolute -right-8 -bottom-10 h-56 w-56 rounded-full bg-linear-to-tr from-indigo-400 to-cyan-300 opacity-50 blur-3xl"
	></div>

	<h1
		class="bg-linear-to-r from-rose-500 via-amber-400 to-indigo-600 bg-clip-text text-center text-4xl font-extrabold text-transparent drop-shadow-lg"
	>
		<span class="font-bold"
			>{gameState?.interactionEnabled ? 'VOTING TIME' : 'SHUT UP AND LISTEN'}</span
		>
	</h1>

	{#if loading}
		<div
			class="h-48 animate-pulse rounded-lg bg-linear-to-r from-slate-200 via-white to-slate-200"
		></div>
	{:else}
		<!-- Staging area: show the current product above the list -->
		<div class="relative">

			{#snippet currentCard(product: TLProduct)}
				<div
					class="relative mx-auto flex w-full max-w-2xl items-center gap-4 overflow-hidden rounded-2xl bg-white/80 p-5 shadow-2xl ring-1 ring-white/30 backdrop-blur-md"
					out:send={keyObj(product?.id ?? null)}
				>
					<!-- playful neon frame -->
					<div
						class="absolute -inset-0.5 rounded-2xl bg-clip-padding opacity-80 blur-[6px]"
						style="background:linear-gradient(90deg,#ff6b6b,#ffd166,#6b9eff);filter:blur(12px);z-index:0"
					></div>
					<img
						src={product.imageUrl ?? ''}
						alt={product.name}
						class="relative z-10 h-28 w-28 flex-none transform rounded-2xl object-cover shadow-lg transition-all hover:scale-105 hover:-rotate-2"
						onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
					/>
					<div class="z-10 min-w-0">
						<div class="truncate text-xl font-extrabold text-slate-900">{product.name}</div>
					</div>
				</div>
			{/snippet}

			{#if currentProduct}
				{@render currentCard(currentProduct)}
			{:else}
				<div
					class="mx-auto flex w-full max-w-2xl items-center justify-center rounded-xl bg-white/70 p-6 text-slate-700 shadow-inner"
				>
					{#if unplacedProducts.length === 0}
						<div class="flex items-center gap-3">
							<div class="text-2xl">🎉</div>
							<div class="text-lg font-semibold">All items placed.</div>
						</div>
					{:else}
						<div class="flex items-center gap-3">
							<div class="animate-bounce text-2xl">⏳</div>
							<div class="text-lg font-medium">Loading next...</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Tier list -->
		<div class="grid space-y-4">
			{#each tierOrder as letter (letter)}
				{@const style = getTierStyle(letter)}
				{@const tierProducts = getPlacedByTier(letter)}
				<div class="grid grid-cols-[96px_1fr] items-start gap-4">
					<div
						class="relative z-10 flex h-full items-center justify-center rounded-lg px-3 py-4 text-2xl font-extrabold text-white"
					>
						<div
							class="flex h-16 w-16 items-center justify-center rounded-lg text-3xl shadow-lg"
							style="background:linear-gradient(135deg, {style.gradient.from}, {style.gradient
								.to});"
						>
							{getVoteCount(letter)}
							{letter}
						</div>
					</div>
					<div
						class="min-h-24 rounded-2xl p-3 shadow-inner ring-1 ring-white/60"
						style="background: linear-gradient(to bottom, {style.bg}cc, {style.bg}66);"
					>
						<div class="flex flex-wrap gap-3">
							{#each tierProducts as item (item.id)}
								<div
									class="relative z-10 flex transform items-center gap-3 rounded-lg bg-white p-3 shadow-md ring-1 ring-slate-200 transition hover:scale-105 hover:rotate-1"
									in:receive={keyObj(item.id)}
								>
									{#if item.imageUrl}
										<img
											src={item.imageUrl}
											alt={item.name}
											class="h-14 w-14 rounded-xl object-cover shadow-sm"
										/>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* playful animations */
	@keyframes blob {
		0% {
			transform: translateY(0) scale(1);
		}
		33% {
			transform: translateY(-8px) scale(1.05);
		}
		66% {
			transform: translateY(4px) scale(0.98);
		}
		100% {
			transform: translateY(0) scale(1);
		}
	}
	:global(.animate-blob) {
		animation: blob 6s infinite ease-in-out;
	}
	:global(.animation-delay-2000) {
		animation-delay: 2s;
	}

	@keyframes wiggle {
		0% {
			transform: rotate(-2deg);
		}
		50% {
			transform: rotate(2deg);
		}
		100% {
			transform: rotate(-2deg);
		}
	}
	:global(.hover\:wiggle:hover) {
		animation: wiggle 200ms linear;
	}
</style>

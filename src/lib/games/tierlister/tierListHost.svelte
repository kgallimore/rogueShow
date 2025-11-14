<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { crossfade } from 'svelte/transition';
	import { GameWebSocketClient } from '../gameWebSocketClient.svelte';
	import type { Product, TierLetter, FrictionEvent, GameState } from '../types';
	import { loadProductsFromTierLookup, getTierForSubfolder } from './tierLookup';

	const tierOrder: TierLetter[] = ['S', 'A', 'B', 'C', 'D', 'F'];

	const [send, receive] = crossfade({
		duration: (d) => Math.min(600, Math.max(250, d / 2)),
		fallback: () => ({ duration: 350 })
	});

	let gameClient: GameWebSocketClient | null = $state(null);
	let products: Product[] = $state([]);
	let currentProduct: Product | null = $state(null);
	let placed: Record<TierLetter, Product[]> = $state({
		S: [],
		A: [],
		B: [],
		C: [],
		D: [],
		F: []
	});
	let loading = $state(true);
	let advancing = $state(false);
	let interactionEnabled = $state<boolean>(true);
	let gameState: GameState | null = $state(null);
	let voteCounts: Record<TierLetter, number> = $state({
		S: 0,
		A: 0,
		B: 0,
		C: 0,
		D: 0,
		F: 0
	});

	// Products are now loaded automatically from tier lookup
	let votingEnabled = $state(false);
	let currentReasonings: string[] | null = $state(null);

	// Confetti state
	let confettiCanvas: HTMLCanvasElement | null = $state(null);

	// Friction effects
	let frictionActive = $state(false);
	let frictionType: FrictionEvent['type'] | null = $state(null);

	function keyObj(id: string | null) {
		return { key: id };
	}

	function triggerConfetti() {
		if (!confettiCanvas) return;

		const ctx = confettiCanvas.getContext('2d');
		if (!ctx) return;

		const colors = ['#ff6b6b', '#ffd166', '#06ffa5', '#6b9eff', '#a78bfa', '#f97316'];
		const confettiCount = 100;
		const particles: Array<{
			x: number;
			y: number;
			vx: number;
			vy: number;
			color: string;
			size: number;
			rotation: number;
			rotationSpeed: number;
		}> = [];

		for (let i = 0; i < confettiCount; i++) {
			particles.push({
				x: confettiCanvas.width / 2,
				y: confettiCanvas.height / 2,
				vx: (Math.random() - 0.5) * 15,
				vy: (Math.random() - 0.5) * 15 - 5,
				color: colors[Math.floor(Math.random() * colors.length)],
				size: Math.random() * 8 + 4,
				rotation: Math.random() * 360,
				rotationSpeed: (Math.random() - 0.5) * 10
			});
		}

		const gravity = 0.5;
		const startTime = Date.now();
		const duration = 3000;

		function animate() {
			if (!confettiCanvas || !ctx) return;

			const elapsed = Date.now() - startTime;
			if (elapsed > duration) {
				ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
				return;
			}

			ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

			particles.forEach((p) => {
				p.vy += gravity * 0.1;
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
		}

		animate();
	}

	function loadAndStartProducts() {
		if (!gameClient) return;
		// Load products from tier lookup
		const loadedProducts = loadProductsFromTierLookup();
		// Shuffle products for random order
		const shuffled = [...loadedProducts].sort(() => Math.random() - 0.5);
		products = shuffled;
		gameClient.sendMessage({ type: 'host:selectProducts', products: shuffled });
		loading = false;
	}

	async function revealTier(product: Product) {
		if (!gameClient || advancing) return;
		// Get tier and reasonings from lookup using product ID (which is the subfolder name)
		const lookupEntry = getTierForSubfolder(product.id);
		if (!lookupEntry) {
			console.error(`No tier found for product: ${product.id}`);
			return;
		}
		advancing = true;
		try {
			triggerConfetti();
			gameClient.sendMessage({
				type: 'host:revealTier',
				productId: product.id,
				tier: lookupEntry.tier,
				reasonings: lookupEntry.reasonings
			});
		} finally {
			advancing = false;
		}
	}

	async function advanceProduct() {
		if (!gameClient || advancing) return;
		advancing = true;
		try {
			gameClient.sendMessage({ type: 'host:advanceProduct' });
		} finally {
			advancing = false;
		}
	}

	function triggerFriction(type: FrictionEvent['type']) {
		if (!gameClient) return;
		const event: FrictionEvent = {
			id: `friction-${Date.now()}`,
			type,
			duration: 2000,
			message: type === 'glitch' ? 'System error detected...' : undefined
		};
		gameClient.sendMessage({ type: 'host:triggerFriction', event });
	}

	function updateVoteCounts() {
		if (!gameState || !currentProduct) {
			Object.keys(voteCounts).forEach((tier) => {
				voteCounts[tier as TierLetter] = 0;
			});
			return;
		}

		const productVotes = gameState.votes[currentProduct.id] || {};
		Object.keys(voteCounts).forEach((tier) => {
			voteCounts[tier as TierLetter] = Object.values(productVotes).filter((v) => v === tier).length;
		});
		voteCounts = { ...voteCounts };
	}

	onMount(() => {
		gameClient = new GameWebSocketClient('host', 'host');
		gameClient.addEventListener('state', ((e: CustomEvent<GameState>) => {
			const state = e.detail;
			gameState = state;
			products = state.products;
			votingEnabled = state.votingEnabled;
			// Deduplicate placed items in case server state has duplicates
			const deduplicatedPlaced: Record<TierLetter, Product[]> = {
				S: [],
				A: [],
				B: [],
				C: [],
				D: [],
				F: []
			};
			for (const tier of tierOrder) {
				const seen = new Set<string>();
				for (const product of state.placed[tier]) {
					if (!seen.has(product.id)) {
						seen.add(product.id);
						deduplicatedPlaced[tier].push(product);
					}
				}
			}
			placed = deduplicatedPlaced;
			// Only set loading to false if products exist, otherwise keep loading state
			if (state.products.length > 0) {
				loading = false;
				if (state.currentProductIndex < state.products.length) {
					currentProduct = state.products[state.currentProductIndex];
				} else {
					currentProduct = null;
				}
			} else {
				// No products yet, keep in loading state
				currentProduct = null;
			}
			updateVoteCounts();
		}) as EventListener);
		gameClient.addEventListener('voteUpdate', (() => {
			updateVoteCounts();
		}) as EventListener);
		gameClient.addEventListener('productRevealed', ((
			e: CustomEvent<{ product: Product; reasonings?: string[] }>
		) => {
			const { product, reasonings } = e.detail;
			const tier = product.tier!;
			// Only add if not already present (prevent duplicates)
			if (!placed[tier].some((item) => item.id === product.id)) {
				placed[tier] = [...placed[tier], product];
			}
			currentReasonings = reasonings || null;
		}) as EventListener);
		gameClient.addEventListener('productAdvanced', ((e: CustomEvent<Product | null>) => {
			currentProduct = e.detail;
			currentReasonings = null; // Clear reasonings when advancing
		}) as EventListener);
		gameClient.addEventListener('friction', ((e: CustomEvent<FrictionEvent>) => {
			const event = e.detail;
			frictionActive = true;
			frictionType = event.type;
			setTimeout(() => {
				frictionActive = false;
				frictionType = null;
			}, event.duration);
		}) as EventListener);
	});

	onDestroy(() => {
		gameClient?.close();
	});
</script>

<div
	class="relative mx-auto max-w-6xl space-y-6 p-6"
	class:friction-shake={frictionActive && frictionType === 'shake'}
	class:friction-freeze={frictionActive && frictionType === 'freeze'}
	class:friction-invert={frictionActive && frictionType === 'color-invert'}
>
	<!-- Confetti canvas overlay -->
	<canvas
		bind:this={confettiCanvas}
		class="pointer-events-none fixed inset-0 z-50"
		width={typeof window !== 'undefined' ? window.innerWidth : 1920}
		height={typeof window !== 'undefined' ? window.innerHeight : 1080}
	></canvas>

	<!-- Friction overlay -->
	{#if frictionActive && frictionType === 'glitch'}
		<div
			class="fixed inset-0 z-40 flex items-center justify-center bg-black font-mono text-4xl text-green-600"
		>
			<div>SYSTEM ERROR DETECTED...</div>
		</div>
	{/if}

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
		<span class="font-bold">{interactionEnabled ? 'TIER LIST SHOW' : 'SHUT UP AND LISTEN'}</span>
	</h1>

	{#if loading}
		<div class="flex h-64 flex-col items-center justify-center gap-6">
			<div class="animate-bounce text-6xl">🎬</div>
			<button
				onclick={loadAndStartProducts}
				class="hover:shadow-3xl rounded-2xl border-4 border-orange-500 bg-linear-to-r from-orange-500 to-amber-500 px-8 py-4 text-2xl font-bold text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:from-orange-600 hover:to-amber-600 active:scale-95"
			>
				<span class="mr-2 text-3xl">🚀</span>
				Start the Show!
				<span class="ml-2 text-3xl">🎉</span>
			</button>
			<p class="font-semibold text-gray-600">Ready to rank some Reese's? Let's go! 🍫</p>
		</div>
	{:else}
		<!-- Staging area: show the current product above the list -->
		<div class="relative">
			{#if currentProduct}
				<div
					class="relative mx-auto flex w-full max-w-2xl items-center gap-4 overflow-hidden rounded-2xl bg-white/80 p-5 shadow-2xl ring-1 ring-white/30 backdrop-blur-md"
					out:send={keyObj(currentProduct?.id)}
				>
					<div
						class="absolute -inset-0.5 rounded-2xl bg-clip-padding opacity-80 blur-[6px]"
						style="background:linear-gradient(90deg,#ff6b6b,#ffd166,#6b9eff);filter:blur(12px);z-index:0"
					></div>
					{#if currentProduct.imageUrl}
						<img
							src={currentProduct.imageUrl}
							alt={currentProduct.name}
							class="relative z-10 h-28 w-28 flex-none transform rounded-2xl object-cover shadow-lg transition-all hover:scale-105 hover:-rotate-2"
							onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
						/>
					{/if}
					<div class="z-10 min-w-0 flex-1">
						<div class="mb-2 truncate text-2xl font-extrabold text-slate-900">
							{currentProduct.name}
						</div>
						<!-- Removed top-level vote counts to keep UI cleaner; counts are shown next to each "Voting for" container. -->
						{#if gameState && currentProduct}
							{@const currentVotes = gameState.votes[currentProduct.id] || {}}
							{@const voters = Object.keys(currentVotes)}
							{#if voters.length > 0}
								<div class="flex flex-wrap items-center gap-1 text-xs">
									<span class="font-semibold text-gray-600">Voters:</span>
									{#each voters as voter}
										<span
											class="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 font-medium text-purple-600"
										>
											{voter}
										</span>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
					<div class="z-10 ml-auto flex flex-col items-end gap-3">
						{#if votingEnabled && !gameState?.currentProductRevealed}
							<button
								class="hover:shadow-3xl relative inline-flex transform items-center gap-2 rounded-2xl border-4 border-emerald-500 bg-linear-to-r from-emerald-400 to-teal-500 px-6 py-3 font-bold text-white shadow-2xl transition-all hover:-translate-y-2 hover:scale-110 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:scale-100"
								onclick={() => revealTier(currentProduct!)}
								disabled={advancing}
							>
								<span class="animate-pulse text-2xl">🚀</span>
								<span class="text-lg">Reveal Tier!</span>
							</button>
						{:else if gameState?.currentProductRevealed}
							<button
								class="hover:shadow-3xl relative inline-flex transform items-center gap-2 rounded-2xl border-4 border-blue-500 bg-linear-to-r from-blue-400 to-indigo-500 px-6 py-3 font-bold text-white shadow-2xl transition-all hover:-translate-y-2 hover:scale-110 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:scale-100"
								onclick={advanceProduct}
								disabled={advancing}
							>
								<span class="text-xl">➡️</span>
								<span class="text-lg">Next Product</span>
							</button>
						{/if}
					</div>
				</div>
				{#if currentReasonings && currentReasonings.length > 0}
					<div
						class="mx-auto mt-4 max-w-2xl rounded-2xl border-4 border-orange-300 bg-linear-to-br from-yellow-100 via-orange-100 to-pink-100 p-6 shadow-xl"
					>
						<h3 class="mb-3 flex items-center gap-2 text-xl font-bold text-gray-800">
							<span class="text-2xl">💭</span>
							<span>Reasonings</span>
						</h3>
						<ul class="space-y-2">
							{#each currentReasonings as reasoning}
								<li class="flex items-start gap-2 text-gray-700">
									<span class="text-lg">•</span>
									<span class="font-medium">{reasoning}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{:else if gameState && gameState.products.length > 0}
				<div
					class="mx-auto flex w-full max-w-2xl items-center justify-center rounded-xl bg-linear-to-br from-yellow-200 via-orange-200 to-pink-200 p-8 text-slate-800 shadow-2xl"
				>
					<div class="flex flex-col items-center gap-4">
						<div class="animate-bounce text-6xl">🎉</div>
						<div class="text-2xl font-bold">All Items Placed!</div>
						<div class="text-sm text-slate-600">The tier list is complete!</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Tier list -->
		<div class="grid space-y-4">
			{#each tierOrder as letter, index (letter)}
				{@const tierProducts = placed[letter]}
				{@const currentVoters =
					gameState && currentProduct
						? Object.entries(gameState.votes[currentProduct.id] || {})
								.filter(([_, tier]) => tier === letter)
								.map(([username]) => username)
						: []}
				<div class="space-y-2">
					<div class="grid grid-cols-[120px_1fr] items-start gap-4">
						<div
							class="relative z-10 flex h-full items-center justify-center gap-3 rounded-lg px-3 py-4 text-2xl font-extrabold text-white"
							style="background:linear-gradient(180deg,var(--from),var(--to));"
						>
							<!-- Letter badge only; vote count moved to the voting container to the right -->
							<div
								class="flex h-16 w-16 items-center justify-center rounded-lg text-3xl shadow-lg"
								style="background:linear-gradient(135deg, var(--c1), var(--c2));"
							>
								{letter}
							</div>
						</div>
						<div
							class="min-h-24 rounded-2xl bg-linear-to-b from-white/60 to-slate-100/40 p-3 shadow-inner ring-1 ring-white/60"
						>
							<div class="flex flex-wrap gap-3">
								{#each placed[letter] as item (item.id)}
									<div
										class="group relative z-10 flex transform flex-col items-center gap-2 rounded-lg bg-white p-3 shadow-md ring-1 ring-slate-200 transition hover:scale-105 hover:rotate-1"
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
					<div class="ml-[136px] rounded-lg border-2 border-purple-200 bg-purple-50 px-4 py-2">
						<div class="flex items-center gap-4">
							<!-- Fixed-width vote count to the left to avoid layout shift -->
							<div class="w-12 flex-none text-center text-lg font-extrabold text-purple-700">
								{currentVoters.length}
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-sm font-bold text-purple-700">Voting for {letter}:</span>
								{#if currentVoters.length > 0}
									{#each currentVoters as voter}
										<span
											class="rounded-full border border-purple-300 bg-white px-2 py-1 text-sm font-medium text-purple-600"
										>
											{voter}
										</span>
									{/each}
								{:else}
									<span class="text-sm text-purple-500 italic">No votes yet</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Friction controls (host only) -->
		<div class="mt-6 rounded-lg bg-gray-100 p-4">
			<h3 class="mb-2 font-bold">Friction Events</h3>
			<div class="flex gap-2">
				<button
					onclick={() => triggerFriction('glitch')}
					class="rounded bg-red-500 px-3 py-1 text-white"
				>
					Glitch
				</button>
				<button
					onclick={() => triggerFriction('shake')}
					class="rounded bg-orange-500 px-3 py-1 text-white"
				>
					Shake
				</button>
				<button
					onclick={() => triggerFriction('freeze')}
					class="rounded bg-yellow-500 px-3 py-1 text-white"
				>
					Freeze
				</button>
				<button
					onclick={() => triggerFriction('color-invert')}
					class="rounded bg-purple-500 px-3 py-1 text-white"
				>
					Invert
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
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

	:global(.grid) > :nth-child(1) div[style] {
		--c1: #ffb86b;
		--c2: #ff6b6b;
	}
	:global(.grid) > :nth-child(2) div[style] {
		--c1: #f97316;
		--c2: #f59e0b;
	}
	:global(.grid) > :nth-child(3) div[style] {
		--c1: #60a5fa;
		--c2: #3b82f6;
	}
	:global(.grid) > :nth-child(4) div[style] {
		--c1: #34d399;
		--c2: #10b981;
	}
	:global(.grid) > :nth-child(5) div[style] {
		--c1: #a78bfa;
		--c2: #7c3aed;
	}
	:global(.grid) > :nth-child(6) div[style] {
		--c1: #94a3b8;
		--c2: #64748b;
	}

	.friction-shake {
		animation: shake 0.5s infinite;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-10px);
		}
		75% {
			transform: translateX(10px);
		}
	}

	.friction-freeze {
		pointer-events: none;
		opacity: 0.5;
	}

	.friction-invert {
		filter: invert(1);
	}
</style>

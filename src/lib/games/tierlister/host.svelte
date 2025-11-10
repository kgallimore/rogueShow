<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { crossfade } from 'svelte/transition';

	type TierLetter = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
	type TLProduct = {
		id: string;
		name: string;
		imageUrl: string | null;
		tierId: string | null;
		tier: TierLetter | null;
	};

	const tierOrder: TierLetter[] = ['S', 'A', 'B', 'C', 'D', 'F'];

	const [send, receive] = crossfade({
		duration: (d) => Math.min(600, Math.max(250, d / 2)),
		fallback: () => ({ duration: 350 })
	});

	let products = $state<TLProduct[]>([]);
	let queue = $state<TLProduct[]>([]);
	let current: TLProduct | null = $state(null);
	let placed = $state<Record<TierLetter, TLProduct[]>>({
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

	let gameStateId: string | null = null;
	let unsubGameState: null | (() => void) = null;
	let unsubProducts: null | (() => void) = null;

	// Confetti state
	let confettiCanvas: HTMLCanvasElement | null = $state(null);

	function rankToLetter(rank: string): TierLetter | null {
		const r = rank.trim().toUpperCase();
		return ['S', 'A', 'B', 'C', 'D', 'F'].includes(r) ? (r as TierLetter) : null;
	}

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

		// Create particles
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

		// animation frame id is intentionally not stored
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

	async function showNext() {
		if (!queue.length) {
			current = null;
			return;
		}
		current = queue[0]!;
	}

	async function advance() {
		if (!current || advancing) return;
		advancing = true;
		try {
			triggerConfetti();

			// Move current item into its tier to trigger crossfade
			const tier: TierLetter = (current.tier ?? 'F') as TierLetter;
			placed[tier] = [...placed[tier], current];

			// Remove from queue and clear current to let it out:send
			queue = queue.slice(1);
			current = null;

			// Wait a bit for the crossfade to complete before showing next
			await tick();
			await new Promise((r) => setTimeout(r, 450));
			await showNext();
		} finally {
			advancing = false;
		}
	}
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
		<span class="font-bold">{interactionEnabled ? 'VOTING TIME' : 'SHUT UP AND LISTEN'}</span>
	</h1>

	{#if loading}
		<div
			class="h-48 animate-pulse rounded-lg bg-linear-to-r from-slate-200 via-white to-slate-200"
		></div>
	{:else}
		<!-- Staging area: show the current product above the list -->
		<div class="relative">
			{#if current}
				<div
					class="relative mx-auto flex w-full max-w-2xl items-center gap-4 overflow-hidden rounded-2xl bg-white/80 p-5 shadow-2xl ring-1 ring-white/30 backdrop-blur-md"
					out:send={keyObj(current?.id)}
				>
					<!-- playful neon frame -->
					<div
						class="absolute -inset-0.5 rounded-2xl bg-clip-padding opacity-80 blur-[6px]"
						style="background:linear-gradient(90deg,#ff6b6b,#ffd166,#6b9eff);filter:blur(12px);z-index:0"
					></div>
					<img
						src={current.imageUrl ?? ''}
						alt={current.name}
						class="relative z-10 h-28 w-28 flex-none transform rounded-2xl object-cover shadow-lg transition-all hover:scale-105 hover:-rotate-2"
						onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
					/>
					<div class="z-10 min-w-0">
						<div class="truncate text-xl font-extrabold text-slate-900">{current.name}</div>
					</div>
					<div class="z-10 ml-auto flex items-center gap-3">
						<button
							class="relative inline-flex transform items-center gap-2 rounded-full bg-linear-to-r from-emerald-400 to-teal-500 px-5 py-2 font-bold text-white shadow-xl transition hover:-translate-y-1 hover:scale-105 disabled:opacity-60"
							onclick={advance}
							disabled={advancing}
						>
							<span class="text-lg">🚀</span>
							<span>Advance</span>
						</button>
					</div>
				</div>
			{:else}
				<div
					class="mx-auto flex w-full max-w-2xl items-center justify-center rounded-xl bg-white/70 p-6 text-slate-700 shadow-inner"
				>
					{#if queue.length === 0}
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
				<div class="grid grid-cols-[96px_1fr] items-start gap-4">
					<div
						class="relative z-10 flex h-full items-center justify-center rounded-lg px-3 py-4 text-2xl font-extrabold text-white"
						style="background:linear-gradient(180deg,var(--from),var(--to));"
					>
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

	/* simple palette per row using nth-child (kept intentionally small) */
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
</style>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { GameWebSocketClient } from '$lib/games/gameWebSocketClient.svelte';
	import type { Product, TierLetter, GameState, FrictionEvent } from '$lib/games/types';

	const tierOrder: TierLetter[] = ['S', 'A', 'B', 'C', 'D', 'F'];

	let gameClient: GameWebSocketClient | null = $state(null);
	let gameState: GameState | null = $state(null);
	let currentProduct: Product | null = $state(null);
	let myVote: TierLetter | null = $state(null);
	// Last vote that was sent to the server (used to avoid re-sending the same choice)
	let lastSentVote: TierLetter | null = $state(null);
	let voteCounts: Record<TierLetter, number> = $state({
		S: 0,
		A: 0,
		B: 0,
		C: 0,
		D: 0,
		F: 0
	});
	let connected = $state(false);
	let votingEnabled = $state(false);

	// Debounce send to prevent spam clicking
	let voteDebounceTimer: number | null = null;
	const VOTE_DEBOUNCE_MS = 500; // ms

	// Friction effects
	let frictionActive = $state(false);
	let frictionType: FrictionEvent['type'] | null = $state(null);

	// Get username from route
	let username = $derived($page.params.username);

	function vote(tier: TierLetter) {
		if (!gameClient || !currentProduct || !votingEnabled) return;

		// If the user clicked the same tier that's already been sent to the server, ignore.
		if (lastSentVote === tier) return;

		// Update UI immediately so user sees selection.
		myVote = tier;

		// Debounce sending messages so the user can't spam-click. Only the final
		// selection after the debounce window will be sent.
		if (voteDebounceTimer) {
			clearTimeout(voteDebounceTimer);
		}
		voteDebounceTimer = window.setTimeout(() => {
			// If, by the time the timeout fires, the last sent vote equals this tier,
			// there's nothing to do.
			if (lastSentVote === tier) {
				voteDebounceTimer = null;
				return;
			}

			const type = lastSentVote ? 'audience:changeVote' : 'audience:vote';
			gameClient.sendMessage({
				type,
				productId: currentProduct.id,
				tier: tier
			});

			// Optimistically remember what we sent so repeated clicks are ignored
			lastSentVote = tier;
			voteDebounceTimer = null;
		}, VOTE_DEBOUNCE_MS) as unknown as number;
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
		// Trigger reactivity
		voteCounts = { ...voteCounts };
	}

	onMount(() => {
		if (!username || typeof username !== 'string') return;

		gameClient = new GameWebSocketClient('audience', username);
		gameClient.addEventListener('connected', () => {
			connected = true;
		});
		gameClient.addEventListener('state', ((e: CustomEvent<GameState>) => {
			const state = e.detail;
			gameState = state;
			votingEnabled = state.votingEnabled;
			if (state.products.length > 0 && state.currentProductIndex < state.products.length) {
				currentProduct = state.products[state.currentProductIndex];
				// Get my vote for current product
				myVote = state.votes[currentProduct.id]?.[username] || null;
				// Keep lastSentVote in sync with authoritative state from server
				lastSentVote = state.votes[currentProduct.id]?.[username] || null;
			} else {
				currentProduct = null;
				myVote = null;
				lastSentVote = null;
			}
			updateVoteCounts();
		}) as EventListener);
		gameClient.addEventListener('voteUpdate', ((
			e: CustomEvent<{ productId: string; votes: Record<string, TierLetter> }>
		) => {
			if (currentProduct && e.detail.productId === currentProduct.id) {
				// Update my vote if it changed
				myVote = e.detail.votes[username] || null;
				// server confirmed votes -- keep lastSentVote in sync
				lastSentVote = e.detail.votes[username] || null;
			}
			updateVoteCounts();
		}) as EventListener);
		gameClient.addEventListener('productAdvanced', ((e: CustomEvent<Product | null>) => {
			currentProduct = e.detail;
			if (currentProduct && gameState) {
				myVote = gameState.votes[currentProduct.id]?.[username] || null;
			} else {
				myVote = null;
			}
			updateVoteCounts();
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
		if (voteDebounceTimer) {
			clearTimeout(voteDebounceTimer);
			voteDebounceTimer = null;
		}
		gameClient?.close();
	});
</script>

<div
	class="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-4"
	class:friction-shake={frictionActive && frictionType === 'shake'}
	class:friction-freeze={frictionActive && frictionType === 'freeze'}
	class:friction-invert={frictionActive && frictionType === 'color-invert'}
>
	<!-- Animated background -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden">
		<div class="absolute top-10 left-10 animate-bounce text-5xl" style="animation-delay: 0s;">
			⭐
		</div>
		<div class="absolute top-20 right-20 animate-bounce text-4xl" style="animation-delay: 1s;">
			✨
		</div>
		<div class="absolute bottom-20 left-1/4 animate-bounce text-5xl" style="animation-delay: 2s;">
			🎯
		</div>
		<div
			class="absolute right-1/3 bottom-10 animate-bounce text-4xl"
			style="animation-delay: 0.5s;"
		>
			💫
		</div>
	</div>

	<div class="relative z-10 mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6 text-center">
			<h1
				class="mb-2 bg-linear-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-4xl font-extrabold text-transparent md:text-5xl"
			>
				Player: {username}
			</h1>
			<div
				class="inline-block rounded-full bg-linear-to-r from-purple-400 to-pink-400 px-4 py-2 font-bold text-white shadow-lg"
			>
				{connected ? '🟢 Connected' : '🟡 Connecting...'}
			</div>
		</div>

		{#if !connected}
			<div class="flex h-64 items-center justify-center">
				<div class="text-center">
					<div class="mb-4 animate-spin text-6xl">🌀</div>
					<p class="text-xl font-semibold text-gray-600">Connecting to the show...</p>
				</div>
			</div>
		{:else if currentProduct}
			<!-- Current Product Card -->
			<div
				class="mb-8 rounded-3xl border-4 border-purple-200 bg-white/90 p-8 shadow-2xl backdrop-blur-sm"
			>
				<div class="flex flex-col items-center gap-6 md:flex-row">
					{#if currentProduct.imageUrl}
						<div class="relative">
							<img
								src={currentProduct.imageUrl}
								alt={currentProduct.name}
								class="h-32 w-32 transform rounded-2xl border-4 border-orange-300 object-cover shadow-xl transition-transform hover:scale-110 md:h-40 md:w-40"
							/>
							<div class="absolute -top-2 -right-2 animate-bounce text-3xl">🍫</div>
						</div>
					{/if}
					<div class="flex-1 text-center md:text-left">
						<h2 class="mb-2 text-3xl font-bold text-gray-800 md:text-4xl">{currentProduct.name}</h2>
						<p class="text-lg font-semibold text-gray-600">
							Vote for the tier you think this product belongs to! 🎯
						</p>
					</div>
				</div>
			</div>

			<!-- Friction overlay -->
			{#if frictionActive && frictionType === 'glitch'}
				<div
					class="fixed inset-0 z-40 flex items-center justify-center bg-black font-mono text-4xl text-green-600"
				>
					<div>SYSTEM ERROR DETECTED...</div>
				</div>
			{/if}

			<!-- Voting Interface -->
			{#if !votingEnabled}
				<div class="rounded-2xl border-4 border-yellow-400 bg-yellow-100 p-6 text-center">
					<div class="mb-2 text-4xl">⏸️</div>
					<p class="text-lg font-bold text-gray-800">Voting is currently disabled</p>
					<p class="mt-2 text-sm text-gray-600">Wait for the host to reveal the product tier</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each tierOrder as tier, i}
						<button
							onclick={() => vote(tier)}
							class="group relative flex w-full items-center justify-between rounded-2xl border-4 p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl {myVote ===
							tier
								? 'scale-105 border-purple-500 bg-linear-to-r from-purple-100 to-pink-100 shadow-xl'
								: 'border-gray-300 bg-white hover:border-purple-300 hover:bg-linear-to-r hover:from-purple-50 hover:to-pink-50'}"
							style="animation-delay: {i * 0.1}s;"
						>
							<div class="flex items-center gap-6">
								<div
									class="flex h-16 w-16 transform items-center justify-center rounded-xl text-3xl font-bold text-white shadow-lg transition-transform group-hover:scale-110"
									style="background:linear-gradient(135deg, var(--c1), var(--c2));"
								>
									{tier}
								</div>
								<div class="text-left">
									<span class="text-2xl font-bold text-gray-800">Tier {tier}</span>
									{#if myVote === tier}
										<div class="mt-1 text-sm font-semibold text-purple-600">✓ Your vote!</div>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-3">
								<span class="text-lg font-bold text-gray-600"
									>{voteCounts[tier]} {voteCounts[tier] === 1 ? 'vote' : 'votes'}</span
								>
								{#if myVote === tier}
									<span class="animate-bounce text-3xl">✨</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="flex h-64 items-center justify-center">
				<div class="text-center">
					<div class="mb-4 animate-bounce text-6xl">⏳</div>
					<p class="text-xl font-semibold text-gray-600">Waiting for host to start the show...</p>
					{#if gameState && gameState.products.length === 0}
						<p class="mt-2 text-sm text-gray-500">The host needs to select products first.</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
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

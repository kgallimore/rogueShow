<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let isReady = $state(false);
	let isRealtimeConnected = $state(false);
	let gameState = $state<any>(null);

	// Track which tier is selected for voting
	let selectedTier = $state<string | null>(null);

	// Make username reactive to URL changes
	let username = $derived(page.params.username);

	// Effect to handle username changes
	$effect(() => {
		if (!username || typeof username !== 'string' || username.length === 0) {
			// Don't initialize if username is invalid
			return;
		}

		// Reset state when username changes
		isReady = false;
		isRealtimeConnected = false;
		cleanup();

		// Initialize for new username
		initializePlayer(username);
	});

	async function initializePlayer(currentUsername: string) {}

	function cleanup() {}

	onDestroy(cleanup);
</script>

{#if isReady}
	<div class="mx-auto max-w-4xl p-4">
		<h1 class="mb-4 text-2xl font-bold">Player: {page.params.username}</h1>

		{#if gameState}
			<div class="mb-6 rounded bg-gray-100 p-4">
				<h2 class="mb-2 font-semibold">Current Product</h2>
				<p>Product: {gameState.expand.currentProduct.name}</p>
				<p class="text-sm text-gray-500">
					Updated: {new Date(gameState.updated || '').toLocaleString()}
				</p>
			</div>
		{:else}
			<p class="mb-6 text-gray-500">No active game state</p>
		{/if}

		<!-- Tier List -->
		<div class="overflow-hidden rounded-lg bg-white shadow-lg">
			<div class="bg-gray-800 p-4 text-white">
				<h2 class="text-xl font-bold">Tier List</h2>
			</div>
			{#each [{ label: 'S', color: 'red-500', bg: 'red-50' }, { label: 'A', color: 'orange-500', bg: 'orange-50' }, { label: 'B', color: 'yellow-500', bg: 'yellow-50' }, { label: 'C', color: 'green-500', bg: 'green-50' }, { label: 'D', color: 'blue-500', bg: 'blue-50' }, { label: 'F', color: 'purple-500', bg: 'purple-50' }] as tier, i (tier.label)}
				<div
					class="group flex min-h-24 items-stretch border-b border-gray-200 last:border-b-0"
					style="height:6rem;"
				>
					<!-- Checkbox -->
					<div class="flex h-full w-12 items-center justify-center">
						<input
							type="checkbox"
							class={`form-checkbox h-5 w-5 text-${tier.color} focus:ring-${tier.color}`}
							checked={selectedTier === tier.label}
							onchange={() => (selectedTier = selectedTier === tier.label ? null : tier.label)}
							aria-label={`Vote for ${tier.label} tier`}
							style="margin:0;"
						/>
					</div>
					<!-- Tier Label -->
					<div
						class={`w-16 bg-${tier.color} flex h-full items-center justify-center text-2xl font-bold text-white`}
						style="height:100%;"
					>
						{tier.label}
					</div>
					<!-- Row Content -->
					<div
						class={`flex-1 bg-${tier.bg} flex h-full items-center justify-between p-4`}
						style="height:100%;"
					></div>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<p class="p-4">Loading...</p>
{/if}

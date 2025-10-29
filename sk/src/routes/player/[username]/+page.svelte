<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { getPocketBase, subscribeToCollection } from '$lib/pocketbase/client.svelte';
	import type {
		UsersRecord,
		GameStateResponse,
		ReesesProductsResponse
	} from '$lib/pocketbase/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type GameStateWithProduct = GameStateResponse<{ currentProduct: ReesesProductsResponse }>;

	let pb: ReturnType<typeof getPocketBase> | null = $state(null);
	let isReady = $state(false);
	let user: UsersRecord | null = $state(null);
	let gameState = $state<GameStateWithProduct | null>(null);
	let isRealtimeConnected = $state(false);
	let unsubscribe: (() => void) | null = null;

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

	async function initializePlayer(currentUsername: string) {
		// Initialize PocketBase client in browser only
		if (!pb) {
			pb = getPocketBase();
		}

		// If the client already has a valid auth session, use it. Otherwise
		// don't auto-login here — authentication is handled via the login
		// UI (client-side) to avoid exposing server-side secrets.
		if (pb.authStore.isValid) {
			user = pb.authStore.record as unknown as UsersRecord;
		} else {
			user = null;
		}
		isReady = true;

		// Load initial game state
		try {
			const records = await pb
				.collection('gameState')
				.getFullList<GameStateWithProduct>({ expand: 'currentProduct' });
			if (records.length > 0) {
				gameState = records[0];
			}
		} catch (error) {
			console.error('Failed to load game state:', error);
		}

		unsubscribe = subscribeToCollection<GameStateWithProduct>('gameState', '*', (newData) => {
			console.log('Realtime update:', newData.action, newData.record);
			isRealtimeConnected = true;

			if (newData.action === 'delete') {
				gameState = null;
			} else {
				gameState = newData.record;
			}
		});
	}

	function cleanup() {
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = null;
		}
	}

	onDestroy(cleanup);
</script>

{#if isReady}
	<div class="mx-auto max-w-4xl p-4">
		<h1 class="mb-4 text-2xl font-bold">Player: {user?.name}</h1>

		{#if gameState}
			<div class="mb-6 rounded bg-gray-100 p-4">
				<h2 class="mb-2 font-semibold">Current Product</h2>
				<p>Product: {gameState.expand.currentProduct.name}</p>
				<img
					src={pb?.files.getURL(
						gameState.expand.currentProduct,
						gameState.expand.currentProduct.image[0]
					)}
					alt={gameState.expand.currentProduct.name}
					class="my-2 h-32 w-32 object-contain"
				/>
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
					>
						<!-- Optionally add more content here -->
						{#if selectedTier === tier.label && gameState?.expand?.currentProduct?.image?.[0]}
							<img
								src={pb && gameState.expand.currentProduct
									? pb.files.getURL(
											gameState.expand.currentProduct,
											gameState.expand.currentProduct.image[0]
										)
									: ''}
								alt={gameState.expand.currentProduct?.name || 'Product image'}
								class={`ml-auto h-20 w-20 border-2 object-contain border-${tier.color} rounded shadow`}
								style="max-height:4.5rem;"
							/>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<p class="p-4">Loading...</p>
{/if}

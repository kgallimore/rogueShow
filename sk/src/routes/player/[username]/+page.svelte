<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { getPocketBase, subscribeToCollection } from '$lib/pocketbase/client.svelte';
	import type { UsersRecord, GameStateRecord } from '$lib/pocketbase/types';
	import type { PageProps } from './$types';


	let { data }: PageProps = $props();

	let pb: ReturnType<typeof getPocketBase> | null = null;
	let isReady = $state(false);
	let user: UsersRecord | null = $state(null);
	let gameState = $state<GameStateRecord | null>(null);
	let isRealtimeConnected = $state(false);
	let unsubscribe: (() => void) | null = null;
	
	// Make username reactive to URL changes
	let username = $derived(page.params.username);
	
	// Effect to handle username changes
	$effect(() => {
		if (!username || typeof username !== 'string' || username.length === 0) {
			throw new Error('Invalid username parameter');
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

		// Auto-login if not already authenticated or if switching users
		if (!pb.authStore.isValid) {
			await pb.collection('users').authWithPassword(currentUsername, data.pass);
		}
		
		user = pb.authStore.record as unknown as UsersRecord;
		isReady = true;

		// Load initial game state
		try {
			const records = await pb.collection('gameState').getFullList<GameStateRecord>();
			if (records.length > 0) {
				gameState = records[0];
			}
		} catch (error) {
			console.error('Failed to load game state:', error);
		}

		unsubscribe = subscribeToCollection<GameStateRecord>(
			'gameState',
			'*',
			(data) => {
				console.log('Realtime update:', data.action, data.record);
				isRealtimeConnected = true;
				
				if (data.action === 'delete') {
					gameState = null;
				} else {
					gameState = data.record;
				}
			}
		);
	}

	function cleanup(){
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = null;
		}
	}

	onDestroy(cleanup);
</script>

{#if isReady}
	<div class="p-4">
		<h1 class="text-2xl font-bold mb-4">Player: {user?.name}</h1>
		
		<div class="mb-4">
			{#if isRealtimeConnected}
				<span class="text-green-600">🟢 Realtime connected</span>
			{:else}
				<span class="text-gray-500">⚪ Connecting to realtime...</span>
			{/if}
		</div>

		{#if gameState}
			<div class="bg-gray-100 p-4 rounded">
				<h2 class="font-semibold mb-2">Game State</h2>
				<p>Agent: {gameState.agent}</p>
				<p class="text-sm text-gray-500">Updated: {new Date(gameState.updated || '').toLocaleString()}</p>
			</div>
		{:else}
			<p class="text-gray-500">No active game state</p>
		{/if}
	</div>
{:else}
	<p class="p-4">Loading...</p>
{/if}

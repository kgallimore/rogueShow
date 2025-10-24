<script lang="ts">
	import { onMount } from 'svelte';
	import PocketBase, { type AuthRecord } from 'pocketbase';
	import type { TypedPocketBase, UsersRecord } from '$lib/pocketbase/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Client-side PocketBase instance (anonymous/unauthenticated)
	let pb: TypedPocketBase = $state(null!);
	let isReady = $state(false);
	let user: UsersRecord | null = $state(null);

	onMount(async () => {
		// Initialize PocketBase client for anonymous access
		pb = new PocketBase('http://127.0.0.1:8090') as TypedPocketBase;
		pb.authStore.onChange(() => {
			user = pb.authStore.record as unknown as UsersRecord;
			isReady = true;
		});
		const authData = await pb.collection('users').authWithPassword('Carson', data.pass);
	});
</script>

{#if isReady}
	<h1>Player: {user?.name}</h1>
	<p>Welcome to the player page for {user?.name}!</p>
	<!-- Display player-specific information here -->
{:else}
	<p>Loading...</p>
{/if}

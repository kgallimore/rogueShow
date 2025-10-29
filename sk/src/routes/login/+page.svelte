<script lang="ts">
	import type { PageProps } from './$types';
	import { getPocketBase } from '$lib/pocketbase/client.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { TypedPocketBase } from '$lib/pocketbase/types';

	let { data }: PageProps = $props();
	let pb: TypedPocketBase | null = null;
	let username = $state('');
	let password = $state('');

	onMount(() => {
		pb = getPocketBase();

		if (pb.authStore.isValid) {
			goto('/host');
		}

		pb.authStore.onChange(() => {
			if (pb!.authStore.isValid) {
				goto('/host');
			}
		});
	});

	function login(event: Event) {
		event.preventDefault();

		pb!
			.collection('users')
			.authWithPassword(username, password)
			.then(() => {
				// Handle successful login
			})
			.catch((error) => {
				// Handle login error
			});
	}
</script>

<form onsubmit={login}>
	<input type="text" name="username" placeholder="Username" bind:value={username} />
	<input type="password" name="password" placeholder="Password" bind:value={password} />
	<button type="submit">Login</button>
</form>

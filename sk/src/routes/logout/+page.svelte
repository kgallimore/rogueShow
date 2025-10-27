<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getPocketBase } from '$lib/pocketbase/client.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	
	onMount(() => {
		const pb = getPocketBase();
		pb.authStore.clear();
		goto('/', { replaceState: true });
	});
</script>

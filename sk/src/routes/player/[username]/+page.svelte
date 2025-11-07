<script lang="ts">
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import TierlisterPlayer from '$lib/games/tierlister/player.svelte';

	let { data }: PageProps = $props();

	let username = $derived(page.params.username!);
</script>

<TierlisterPlayer {username} password={data.password} />

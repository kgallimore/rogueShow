<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	import TierlisterHost from '$lib/games/tierlister/host.svelte';
</script>

<TierlisterHost />

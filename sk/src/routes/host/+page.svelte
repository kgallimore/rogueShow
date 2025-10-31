<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	import TierlisterHost from '$lib/games/tierlister/host.svelte';
	import RogueShow from '$lib/games/rogueShow/rogueShow.svelte';

	let rogueShowEnabled = $state(false);
</script>
<input type="checkbox" bind:checked={rogueShowEnabled} /> Enable Rogue Show
<br />
{#if rogueShowEnabled}
	<RogueShow />
{:else}
<TierlisterHost />
{/if}
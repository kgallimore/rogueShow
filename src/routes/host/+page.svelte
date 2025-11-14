<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	import TierListHost from '$lib/games/tierlister/tierListHost.svelte';
	import RogueShow from '$lib/games/rogueShow/rogueShow.svelte';

	let rogueShowEnabled = $state(false);
</script>

<input type="checkbox" bind:checked={rogueShowEnabled} /> Enable Rogue Show
<br />
{#if rogueShowEnabled}
	<RogueShow />
{:else}
	<TierListHost />
{/if}

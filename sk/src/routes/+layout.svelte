<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
{#if data.user}
	<p>Logged in as {JSON.stringify(data.user)}</p>
{:else}
	<p>Not logged in</p>
{/if}

{@render children?.()}

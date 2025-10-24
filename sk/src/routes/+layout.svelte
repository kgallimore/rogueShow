<script lang="ts">
	import '../app.css';

	let { children, data } = $props();
</script>

{#if data.user}
	<p>Logged in as {JSON.stringify(data.user)}</p>
{:else}
	<p>Not logged in</p>
{/if}

{@render children?.()}

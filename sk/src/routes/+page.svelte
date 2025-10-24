<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#each data.users as user}
	<p><a href={`/player/${user.name}`}>{user.name}</a></p>
{/each}

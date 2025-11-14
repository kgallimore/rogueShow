<script lang="ts">
	import '../app.css';

	let { children, data } = $props();
</script>

<div class="absolute top-0 left-0 text-2xl font-bold">Cursor</div>
{@render children?.()}

<script lang="ts">
	import { onMount } from 'svelte';
    let isVisible = $state(true);
    let blinkInterval: NodeJS.Timeout;
    let {textColor}: { textColor?: string } = $props();

    onMount(() => {
        blinkInterval = setInterval(() => {
            isVisible = !isVisible;
        }, 500);

        return () => {
            clearInterval(blinkInterval);
        };
    });
</script>

<span class="blinking-cursor {textColor ?? 'text-green-600'}" class:hidden={!isVisible}>|</span>&nbsp;
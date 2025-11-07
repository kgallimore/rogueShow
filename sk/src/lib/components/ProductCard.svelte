<script lang="ts">
	import type { ReesesProductsResponse } from '$lib/pocketbase/types';

	interface Props {
		product: ReesesProductsResponse;
		showName?: boolean;
		interactive?: boolean;
		selected?: boolean;
		onClick?: () => void;
		imageUrl?: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		product,
		showName = true,
		interactive = false,
		selected = false,
		onClick,
		imageUrl,
		size = 'md'
	}: Props = $props();

	const sizeClasses = {
		sm: 'h-12 w-12 text-xs',
		md: 'h-20 w-20 text-sm',
		lg: 'h-28 w-28 text-base'
	};

	const nameSizeClasses = {
		sm: 'text-xs',
		md: 'text-sm',
		lg: 'text-base'
	};

	const defaultImageUrl = $derived(
		imageUrl || `/api/files/${product.collectionId}/${product.id}/${product.image[0]}`
	);
</script>

{#if interactive}
	<button
		type="button"
		class="relative flex {sizeClasses[size]} cursor-pointer items-center justify-center rounded-lg
			{selected ? 'bg-orange-50 ring-2 ring-orange-400' : 'bg-white'} 
			shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95"
		onclick={onClick}
	>
		<img
			src={defaultImageUrl}
			alt={product.name}
			class="h-full w-full rounded-lg object-cover"
			onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
		/>

		{#if showName}
			<div
				class="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/70 to-transparent p-1"
			>
				<p class="truncate text-center font-semibold text-white {nameSizeClasses[size]}">
					{product.name}
				</p>
			</div>
		{/if}
	</button>
{:else}
	<div
		class="relative flex {sizeClasses[size]} items-center justify-center rounded-lg
			{selected ? 'bg-orange-50 ring-2 ring-orange-400' : 'bg-white'} 
			shadow-md"
	>
		<img
			src={defaultImageUrl}
			alt={product.name}
			class="h-full w-full rounded-lg object-cover"
			onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
		/>

		{#if showName}
			<div
				class="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/70 to-transparent p-1"
			>
				<p class="truncate text-center font-semibold text-white {nameSizeClasses[size]}">
					{product.name}
				</p>
			</div>
		{/if}
	</div>
{/if}

<script lang="ts">
	import { crossfade } from 'svelte/transition';
	import type {
		ReesesProductsResponse,
		TiersResponse,
		PlacementsResponse
	} from '$lib/pocketbase/types';
	import { tierOrder, getTierStyle, type TierLetter } from '$lib/games/tierlister/tiers';

	interface Props {
		placements: PlacementsResponse[];
		products: ReesesProductsResponse[];
		tiers: TiersResponse[];
		showVotes?: boolean;
		votes?: Array<{ tier: TierLetter; count: number }>;
	}

	let {
		placements = [],
		products = [],
		tiers = [],
		showVotes = false,
		votes = []
	}: Props = $props();

	const [send, receive] = crossfade({
		duration: (d) => Math.min(600, Math.max(250, d / 2)),
		fallback: () => ({ duration: 350 })
	});

	const tierMap = $derived(
		new Map(tiers.map((t) => [t.id, t.Rank.trim().toUpperCase() as TierLetter]))
	);

	const placedProducts = $derived(
		placements
			.map((placement) => {
				const product = products.find((p) => p.id === placement.productId);
				const tierLetter = tierMap.get(placement.finalTier);
				return { product, tier: tierLetter, placement };
			})
			.filter((p) => p.product && p.tier)
	);

	const getPlacedByTier = (tier: TierLetter) => {
		return placedProducts.filter((p) => p.tier === tier);
	};

	const getVoteCount = (tier: TierLetter) => {
		return votes.find((v) => v.tier === tier)?.count || 0;
	};

	const keyObj = (id: string | null) => ({ key: id });
</script>

<div class="grid space-y-4">
	{#each tierOrder as letter (letter)}
		{@const style = getTierStyle(letter)}
		{@const tierProducts = getPlacedByTier(letter)}
		<div class="grid grid-cols-[96px_1fr] items-start gap-4">
			<div
				class="relative z-10 flex h-full items-center justify-center rounded-lg px-3 py-4 text-2xl font-extrabold text-white"
			>
				<div
					class="flex h-16 w-16 items-center justify-center rounded-lg text-3xl shadow-lg"
					style="background:linear-gradient(135deg, {style.gradient.from}, {style.gradient.to});"
				>
					{#if showVotes}
						{getVoteCount(letter)}
					{/if}
					{letter}
				</div>
			</div>
			<div
				class="min-h-24 rounded-2xl p-3 shadow-inner ring-1 ring-white/60"
				style="background: linear-gradient(to bottom, {style.bg}cc, {style.bg}66);"
			>
				<div class="flex flex-wrap gap-3">
					{#each tierProducts as item (item.product?.id)}
						<div
							class="relative z-10 flex transform items-center gap-3 rounded-lg bg-white p-3 shadow-md ring-1 ring-slate-200 transition hover:scale-105 hover:rotate-1"
							in:receive={keyObj(item.product?.id!)}
						>
							{#if item.product?.image}
								<img
									src={`/api/files/${item.product.collectionId}/${item.product.id}/${item.product.image[0]}`}
									alt={item.product.name}
									class="h-14 w-14 rounded-xl object-cover shadow-sm"
								/>
							{/if}
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-slate-900">
									{item.product?.name}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>

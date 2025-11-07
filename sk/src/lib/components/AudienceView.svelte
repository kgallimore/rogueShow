<script lang="ts">
	import { showStore } from '$lib/stores/showStore.svelte';
	import { getPocketBase } from '$lib/pocketbase/client.svelte';
	import ProductCard from './ProductCard.svelte';
	import type { ReesesProductsResponse, TiersResponse, UsersResponse } from '$lib/pocketbase/types';

	interface Props {
		user: UsersResponse;
		products: ReesesProductsResponse[];
		tiers: TiersResponse[];
	}

	let { user, products, tiers }: Props = $props();

	let pb = getPocketBase();
	let selectedTier: string | null = $state(null);
	let hasVoted = $state(false);
	let loading = $state(false);

	const {
		currentProduct,
		predictions,
		placements,
		mode,
		rogueStage,
		interactionEnabled,
		submitPrediction
	} = showStore;

	const userPrediction = $derived(
		predictions.find((p) => p.userId === user.id && p.productId === currentProduct?.id)
	);

	const currentPlacement = $derived(placements.find((p) => p.productId === currentProduct?.id));

	const canVote = $derived(
		currentProduct &&
			interactionEnabled &&
			mode === 'tierlist' &&
			!userPrediction &&
			!currentPlacement
	);

	const handleVote = async () => {
		if (!canVote || !selectedTier || !currentProduct) return;

		loading = true;
		try {
			await submitPrediction(user.id, currentProduct.id, selectedTier);
			hasVoted = true;
		} finally {
			loading = false;
		}
	};

	const getTierName = (tierId: string) => {
		const tier = tiers.find((t) => t.id === tierId);
		return tier?.Rank || 'Unknown';
	};

	const getTierStyle = (rank: string) => {
		const styles = {
			S: { bg: '#fee2e2', gradient: { from: '#ef4444', to: '#dc2626' } },
			A: { bg: '#fef3c7', gradient: { from: '#f59e0b', to: '#d97706' } },
			B: { bg: '#e0e7ff', gradient: { from: '#6366f1', to: '#4f46e5' } },
			C: { bg: '#d1fae5', gradient: { from: '#10b981', to: '#059669' } },
			D: { bg: '#fed7aa', gradient: { from: '#fb923c', to: '#f97316' } },
			F: { bg: '#e5e7eb', gradient: { from: '#6b7280', to: '#4b5563' } }
		};
		return styles[rank as keyof typeof styles] || styles['F'];
	};
</script>

<div class="space-y-6 rounded-xl bg-white p-6 shadow-lg">
	<h2 class="mb-4 text-2xl font-bold text-gray-800">Audience View</h2>

	<!-- User Info -->
	<div class="rounded-lg bg-gray-50 p-4">
		<p class="font-medium">Welcome, <span class="text-orange-600">{user.name}</span>!</p>
		<p class="text-sm text-gray-600">Mode: <span class="font-semibold">{mode}</span></p>
		{#if mode === 'rogue'}
			<p class="text-sm text-gray-600">AI Stage: {rogueStage}/3</p>
		{/if}
	</div>

	<!-- Current Product for Voting -->
	{#if mode === 'tierlist' && currentProduct}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Current Product</h3>

			<div class="flex justify-center">
				<ProductCard product={currentProduct} size="lg" showName={true} />
			</div>

			{#if currentPlacement}
				<div class="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-center">
					<p class="text-lg font-bold text-green-800">
						This product was placed in <span class="text-2xl"
							>{getTierName(currentPlacement.finalTier)}</span
						> tier!
					</p>
				</div>
			{:else if canVote}
				<div class="space-y-4">
					<div class="text-center">
						<p class="text-lg font-medium">What tier should this product be?</p>
					</div>

					<div class="grid grid-cols-3 gap-3">
						{#each tiers as tier (tier.id)}
							{@const style = getTierStyle(tier.Rank)}
							<button
								type="button"
								class="relative rounded-lg border-2 p-4 text-lg font-bold transition-all
									{selectedTier === tier.id
									? 'scale-105 transform border-gray-800 shadow-lg'
									: 'border-gray-200 hover:border-gray-400'}"
								style="background: linear-gradient(135deg, {style.gradient.from}, {style.gradient
									.to}); color: white;"
								onclick={() => (selectedTier = tier.id)}
							>
								{tier.Rank}
							</button>
						{/each}
					</div>

					<div class="text-center">
						<button
							type="button"
							class="rounded-lg bg-orange-600 px-6 py-3 text-lg font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
							disabled={!selectedTier || loading}
							onclick={handleVote}
						>
							{loading ? 'Submitting...' : 'Submit Vote'}
						</button>
					</div>
				</div>
			{:else if userPrediction}
				<div class="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-center">
					<p class="text-lg font-bold text-blue-800">
						You voted: <span class="text-2xl">{getTierName(userPrediction.predictedTier)}</span> tier
					</p>
					<p class="mt-2 text-sm text-gray-600">Waiting for host to reveal the actual tier...</p>
				</div>
			{:else if !interactionEnabled}
				<div class="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 text-center">
					<p class="text-lg font-bold text-yellow-800">Voting is currently disabled</p>
					<p class="mt-2 text-sm text-gray-600">Wait for the host to enable voting</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Rogue Mode Content -->
	{#if mode === 'rogue'}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">AI Has Taken Control!</h3>

			<div class="rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
				<div class="space-y-3 text-center">
					<p class="text-lg font-medium text-purple-800">The AI is running the show now</p>

					{#if rogueStage === 1}
						<p class="text-gray-700">Stage 1: Text-only communication</p>
						<p class="text-sm text-gray-600">Watch as the AI communicates through text only</p>
					{:else if rogueStage === 2}
						<p class="text-gray-700">Stage 2: Text-to-speech enabled</p>
						<p class="text-sm text-gray-600">The AI can now speak its responses</p>
					{:else if rogueStage === 3}
						<p class="text-gray-700">Stage 3: Speech recognition active</p>
						<p class="text-sm text-gray-600">You can now speak to the AI</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Interstitial Mode Content -->
	{#if mode === 'interstitial'}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Mini-Game Time!</h3>

			<div class="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-6">
				<div class="space-y-3 text-center">
					<p class="text-lg font-medium text-indigo-800">
						Try to figure out the AI's hidden quirk!
					</p>
					<p class="text-sm text-gray-600">
						Chat with the AI and submit your guess about what makes it different
					</p>

					<div class="mt-4 rounded-lg border bg-white p-4">
						<p class="text-sm font-medium text-gray-700">Mini-game interface coming soon...</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Show Progress -->
	{#if placements.length > 0}
		<div class="space-y-4 border-t pt-4">
			<h3 class="text-lg font-semibold">Show Progress</h3>
			<p class="text-sm text-gray-600">{placements.length} products have been placed</p>

			<div class="grid grid-cols-4 gap-2">
				{#each placements.slice(0, 8) as placement}
					{@const product = products.find((p) => p.id === placement.productId)}
					{#if product}
						<ProductCard {product} size="sm" showName={false} />
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>

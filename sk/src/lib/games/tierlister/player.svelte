<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getPocketBase, subscribeToCollection } from '$lib/pocketbase/client.svelte';
	import type {
		ReesesProductsResponse,
		TiersResponse,
		GameStateResponse,
		TypedPocketBase,
		ReesesVotesResponse,
		UsersResponse,
		ShowsResponse,
	} from '$lib/pocketbase/types';
	import { tierOrder, getTierStyle, type TierLetter } from './tiers';
	import InterstitialMinigame from '$lib/games/interstitial/interstitialMinigame.svelte';

	type PlayerProps = {
		username: string;
		password: string;
	};

	let { username, password }: PlayerProps = $props();

	let loading = $state(true);
	let gameState = $state<GameStateResponse | null>(null);
	let show = $state<ShowsResponse | null>(null);
	let user = $state<UsersResponse | null>(null);
	let selectedTier = $state<TierLetter | null>(null);
	let tiers = $state<TiersResponse[]>([]);
	let votes = $state<ReesesVotesResponse[]>([]);
	let currentProduct = $state<ReesesProductsResponse | null>(null);

	let pb: TypedPocketBase | null = $state(null);
	let unsubGameState: (() => void) | null = null;
	let unsubVotes: (() => void) | null = null;
	let unsubShow: (() => void) | null = null;

	// Derived states
	const currentMode = $derived((gameState?.currentMode as string) || 'tierlist');
	const interactionEnabled = $derived(gameState?.interactionEnabled || false);
	const showStage = $derived.by(() => {
		if (currentMode === 'interstitial') return 'minigame';
		if (!interactionEnabled) {
			// If interaction is disabled and we have a current product, we're in reveal stage
			// Otherwise we're in setup stage
			return currentProduct ? 'reveal' : 'setup';
		}
		return 'predict';
	});

	const getVoteCount = (tierLetter: TierLetter) => {
		const tierRecord = tiers.find((t) => t.Rank === tierLetter);
		return tierRecord ? votes.filter((v) => v.tier === tierRecord.id).length : 0;
	};

	async function vote(tierLetter: TierLetter) {
		if (!pb || !user || !currentProduct || !interactionEnabled || currentMode !== 'tierlist')
			return;

		const tierRecord = tiers.find((t) => t.Rank === tierLetter);
		if (!tierRecord) return;

		try {
			// Use the reesesVotes collection as requested
			const existing = votes.find(
				(v) => v.user === user!.id && v.product === currentProduct!.id
			);

			if (existing) {
				const updatedVote = await pb.collection('reesesVotes').update(existing.id, { tier: tierRecord.id });
				// Update local state to reflect the change
				votes = votes.map(v => v.id === existing.id ? updatedVote : v);
			} else {
				const vote = await pb.collection('reesesVotes').create<ReesesVotesResponse>({
					user: user!.id,
					product: currentProduct!.id,
					tier: tierRecord.id
				});
				votes = [...votes, vote];
			}

			selectedTier = tierLetter;
		} catch (error) {
			console.error('Failed to vote:', error);
		}
	}

	async function loadCurrentVote() {
		if (!pb || !user || !currentProduct) {
			selectedTier = null;
			return;
		}

		try {
			// Use the reesesVotes collection as requested
			const existing = votes.find(
				(v) => v.user === user!.id && v.product === currentProduct!.id
			);

			if (existing && existing.tier) {
				const tierRecord = tiers.find((t) => t.id === existing.tier);
				selectedTier = tierRecord ? (tierRecord.Rank as TierLetter) : null;
			} else {
				selectedTier = null;
			}
		} catch (error) {
			console.error('Failed to load current vote:', error);
			selectedTier = null;
		}
	}

	onMount(async () => {
		loading = true;
		try {
			pb = getPocketBase();

			// Authenticate
			if (!pb.authStore.isValid || pb.authStore.record?.username !== username) {
				await pb.collection('users').authWithPassword(username, password);
			}
			user = pb.authStore.record as UsersResponse;

			// Load initial data
			const [tiersData, gs, votesData, showsData] = await Promise.all([
				pb.collection('tiers').getFullList<TiersResponse>(),
				pb.collection('gameState').getFirstListItem<GameStateResponse>(''),
				pb.collection('reesesVotes').getFullList<ReesesVotesResponse>(),
				pb.collection('shows').getFullList<ShowsResponse>({
					filter: 'isActive = true'
				})
			]);

			tiers = tiersData;
			gameState = gs;
			votes = votesData;
			show = showsData[0] || null;

			// Load current product
			const productId = show?.currentProductId || gs.currentProductNum;
			if (productId) {
				if (typeof productId === 'string') {
					currentProduct = await pb
						.collection('reesesProducts')
						.getFirstListItem<ReesesProductsResponse>(`id = "${productId}"`);
				} else {
					currentProduct = await pb
						.collection('reesesProducts')
						.getFirstListItem<ReesesProductsResponse>(`order = ${productId}`);
				}
			}

			await loadCurrentVote();

			// Subscribe to game state
			unsubGameState = subscribeToCollection<GameStateResponse>(
				'gameState',
				'*',
				async ({ record }) => {
					gameState = record;

					if (
						record.currentProductNum !== (show?.currentProductId || gameState?.currentProductNum)
					) {
						// Product changed, reload
						const productId =
							record.currentProductNum ||
							show?.currentProductId ||
							gameState?.currentProductNum;
						if (productId) {
							if (typeof productId === 'string') {
								currentProduct = await pb!
									.collection('reesesProducts')
									.getFirstListItem<ReesesProductsResponse>(`id = "${productId}"`);
							} else {
								currentProduct = await pb!
									.collection('reesesProducts')
									.getFirstListItem<ReesesProductsResponse>(`order = ${productId}`);
							}
							await loadCurrentVote();
						}
					}
				}
			);

			// Subscribe to show changes
			if (show) {
				unsubShow = subscribeToCollection<ShowsResponse>('shows', '*', async ({ record }) => {
					if (record.isActive && (!show || record.id === show.id)) {
						show = record;

						// Reload votes for current product
						if (currentProduct) {
							const votesData = await pb!
								.collection('reesesVotes')
								.getFullList<ReesesVotesResponse>({
									filter: `product = "${currentProduct.id}"`
								});
							votes = votesData;
						}

						// Reload product if changed
						if (record.currentProductId !== currentProduct?.id) {
							if (record.currentProductId) {
								currentProduct = await pb!
									.collection('reesesProducts')
									.getFirstListItem<ReesesProductsResponse>(`id = "${record.currentProductId}"`);
								await loadCurrentVote();
							}
						}
					}
				});
			}

			// Subscribe to votes
			unsubVotes = subscribeToCollection<ReesesVotesResponse>(
				'reesesVotes',
				'*',
				({ record, action }) => {
					if (action === 'delete') {
						votes = votes.filter((v) => v.id !== record.id);
					} else if (action === 'create') {
						votes = [...votes, record];
					} else {
						votes = votes.map((v) => (v.id === record.id ? record : v));
					}
				}
			);
		} catch (error) {
			console.error('Failed to initialize:', error);
		} finally {
			loading = false;
		}
	});

	onDestroy(() => {
		unsubGameState?.();
		unsubVotes?.();
		unsubShow?.();
	});
</script>

<div class="min-h-screen bg-linear-to-br from-orange-50 to-amber-100 p-4">
	{#if loading}
		<div class="flex items-center justify-center">
			<div class="text-2xl text-orange-800">Loading...</div>
		</div>
	{:else if currentMode === 'interstitial'}
		<InterstitialMinigame />
	{:else}
		<div class="mx-auto max-w-4xl space-y-4">
			<!-- Header -->
			<header class="text-center">
				<h1 class="text-3xl font-bold text-orange-800">
					{showStage === 'setup'
						? '🎬 Get Ready!'
						: showStage === 'predict'
							? '🎯 Vote Now!'
							: showStage === 'reveal'
								? '🎭 Reveal Time!'
								: '🎭 Show Active!'}
				</h1>
				<p class="text-lg text-orange-600">Player: {user?.name ?? user?.username ?? username}</p>
				<div class="mt-2 text-sm text-orange-500">
					Mode: <strong class="uppercase">{currentMode}</strong>
				</div>
			</header>

			{#if currentProduct}
				<!-- Current Product -->
				<div class="rounded-lg bg-white p-4 shadow-lg">
					<div class="flex items-center gap-4">
						{#if currentProduct.image?.[0] && pb}
							<img
								src={pb.files.getURL(currentProduct, currentProduct.image[0])}
								alt={currentProduct.name}
								class="h-24 w-24 rounded object-cover shadow-md"
							/>
						{/if}
						<div class="flex-1">
							<h2 class="text-xl font-bold text-gray-800">{currentProduct.name}</h2>
							{#if currentProduct.description}
								<p class="mt-1 text-sm text-gray-600">{currentProduct.description}</p>
							{/if}
							{#if selectedTier && showStage === 'predict'}
								<p class="mt-2 text-sm font-semibold text-orange-600">
									Your vote: <strong>{selectedTier}</strong>
								</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- Tier Buttons - Only show during predict stage -->
				{#if showStage === 'predict' && currentMode === 'tierlist'}
					<div class="space-y-2">
						{#each tierOrder as letter (letter)}
							{@const style = getTierStyle(letter)}
							{@const voteCount = getVoteCount(letter)}
							<button
								class="flex w-full items-center justify-between rounded-lg p-3 shadow transition hover:scale-[1.01] disabled:opacity-50"
								style="background: {style.bg};"
								onclick={() => vote(letter)}
								disabled={!interactionEnabled}
							>
								<div class="flex items-center gap-3">
									<div
										class="flex h-12 w-12 items-center justify-center rounded text-xl font-bold text-white"
										style="background: linear-gradient(135deg, {style.gradient.from}, {style
											.gradient.to});"
									>
										{letter}
									</div>
									<span class="font-semibold">Tier {letter}</span>
								</div>
								<span class="text-sm">Votes: {voteCount}</span>
							</button>
						{/each}
					</div>
				{:else if showStage === 'setup'}
					<div class="rounded-lg bg-orange-100 p-8 text-center">
						<div class="mb-4 text-6xl">⏳</div>
						<h3 class="text-xl font-bold text-orange-800">Get Ready to Vote!</h3>
						<p class="mt-2 text-orange-600">Wait for the host to start the prediction phase...</p>
					</div>
				{:else if showStage === 'reveal'}
					<div class="rounded-lg bg-green-100 p-8 text-center">
						<div class="mb-4 text-6xl">🎉</div>
						<h3 class="text-xl font-bold text-green-800">Reveal in Progress!</h3>
						<p class="mt-2 text-green-600">
							The host is revealing the actual tier. See if you were right!
						</p>
					</div>
				{/if}
			{:else}
				<div class="rounded-lg bg-orange-100 p-8 text-center">
					<div class="mb-4 text-6xl">🎬</div>
					<h3 class="text-xl font-bold text-orange-800">Show Starting Soon...</h3>
					<p class="mt-2 text-orange-600">Waiting for the host to begin the show!</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

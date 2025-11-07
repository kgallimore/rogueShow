<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getPocketBase, subscribeToCollection } from '$lib/pocketbase/client.svelte';
	import type {
		MinigamesResponse,
		MinigameSubmissionsResponse,
		MinigameGuessesResponse,
		TypedPocketBase
	} from '$lib/pocketbase/types';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	let pb: TypedPocketBase | null = $state(null);
	let loading = $state(true);
	let currentMinigame = $state<MinigamesResponse | null>(null);
	let userSubmission = $state('');
	let userGuess = $state('');
	let hasSubmitted = $state(false);
	let hasGuessed = $state(false);
	let timeRemaining = $state(120); // 2 minutes per round
	let submissions = $state<MinigameSubmissionsResponse[]>([]);
	let guesses = $state<MinigameGuessesResponse[]>([]);

	let unsubMinigame: (() => void) | null = null;
	let unsubSubmissions: (() => void) | null = null;
	let unsubGuesses: (() => void) | null = null;
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		loading = true;
		try {
			pb = getPocketBase();

			if (!pb.authStore.isValid) {
				throw new Error('Not authenticated');
			}

			// Load active minigame
			// First get the current game state to find the show ID
			const gameStateData = await pb.collection('gameState').getFirstListItem('');
			const minigamesData = await pb.collection('minigames').getFullList<MinigamesResponse>({
				filter: `status = "active" && showId = "${gameStateData.currentShowId}"`
			});

			currentMinigame = minigamesData[0] || null;

			if (currentMinigame) {
				// Load existing data
				const [submissionsData, guessesData] = await Promise.all([
					pb.collection('minigame_submissions').getFullList<MinigameSubmissionsResponse>({
						filter: `minigameId = "${currentMinigame.id}"`
					}),
					pb.collection('minigame_guesses').getFullList<MinigameGuessesResponse>({
						filter: `minigameId = "${currentMinigame.id}"`
					})
				]);

				submissions = submissionsData;
				guesses = guessesData;

				// Check if user has already submitted
				const userId = pb.authStore.record?.id;
				if (userId && currentMinigame) {
					const existingSubmission = submissions.find((s) => s.userId === userId);
					const existingGuess = guesses.find((g) => g.userId === userId);

					if (existingSubmission) {
						userSubmission = existingSubmission.content;
						hasSubmitted = true;
					}

					if (existingGuess) {
						userGuess = existingGuess.guess;
						hasGuessed = true;
					}
				}

				// Start timer
				startTimer();
				subscribeToChanges();
			}
		} catch (error) {
			console.error('Failed to initialize minigame:', error);
		} finally {
			loading = false;
		}
	});

	function startTimer() {
		timerInterval = setInterval(() => {
			if (timeRemaining > 0) {
				timeRemaining--;
			} else {
				// Time's up - transition to judging
				endMinigame();
			}
		}, 1000);
	}

	function subscribeToChanges() {
		if (!pb || !currentMinigame) return;

		// Subscribe to minigame changes
		unsubMinigame = subscribeToCollection<MinigamesResponse>('minigames', '*', ({ record }) => {
			if (record.id === currentMinigame!.id) {
				currentMinigame = record;
				if (record.status === 'completed') {
					endMinigame();
				}
			}
		});

		// Subscribe to submissions
		unsubSubmissions = subscribeToCollection<MinigameSubmissionsResponse>(
			'minigame_submissions',
			'*',
			({ record, action }) => {
				if (record.minigameId === currentMinigame!.id) {
					if (action === 'create') {
						submissions = [...submissions, record];
					} else if (action === 'delete') {
						submissions = submissions.filter((s) => s.id !== record.id);
					}
				}
			}
		);

		// Subscribe to guesses
		unsubGuesses = subscribeToCollection<MinigameGuessesResponse>(
			'minigame_guesses',
			'*',
			({ record, action }) => {
				if (record.minigameId === currentMinigame!.id) {
					if (action === 'create') {
						guesses = [...guesses, record];
					} else if (action === 'delete') {
						guesses = guesses.filter((g) => g.id !== record.id);
					}
				}
			}
		);
	}

	async function submitResponse() {
		if (!pb || !currentMinigame || !userSubmission.trim() || hasSubmitted) return;

		try {
			await pb
				.collection('minigame_submissions')
				.create<MinigameSubmissionsResponse>({
					minigameId: currentMinigame!.id,
					userId: pb.authStore.record!.id,
					content: userSubmission.trim()
				});

			hasSubmitted = true;
		} catch (error) {
			console.error('Failed to submit response:', error);
		}
	}

	async function submitGuess() {
		if (!pb || !currentMinigame || !userGuess.trim() || hasGuessed) return;

		try {
			await pb.collection('minigame_guesses').create<MinigameGuessesResponse>({
				minigameId: currentMinigame!.id,
				userId: pb.authStore.record!.id,
				guess: userGuess.trim()
			});

			hasGuessed = true;
		} catch (error) {
			console.error('Failed to submit guess:', error);
		}
	}

	async function endMinigame() {
		if (!pb || !currentMinigame) return;

		try {
			await pb.collection('minigames').update(currentMinigame.id, {
				status: 'completed'
			});
		} catch (error) {
			console.error('Failed to end minigame:', error);
		}
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getQuirkDisplay(quirkSpec: string): string {
		// Make the quirk more user-friendly
		return quirkSpec.replace(/"/g, '').replace('Avoid using the letter', "Don't use the letter");
	}

	onDestroy(() => {
		unsubMinigame?.();
		unsubSubmissions?.();
		unsubGuesses?.();
		if (timerInterval) {
			clearInterval(timerInterval);
		}
	});
</script>

<div
	class="min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 p-6 {className}"
>
	{#if loading}
		<div class="flex items-center justify-center">
			<div class="text-2xl text-white">Loading mini-game...</div>
		</div>
	{:else if currentMinigame}
		<div class="mx-auto max-w-4xl space-y-6">
			<!-- Header -->
			<header class="text-center">
				<h1 class="mb-4 text-4xl font-bold text-white">
					🎮 Mini-Game Round {currentMinigame.round}
				</h1>
				<div class="mb-6 rounded-full bg-white/10 px-6 py-3 text-center">
					<div class="text-sm text-white/80">Time Remaining</div>
					<div class="font-mono text-2xl font-bold text-white">{formatTime(timeRemaining)}</div>
				</div>
			</header>

			<!-- Quirk Display -->
			<div class="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
				<h2 class="mb-4 text-2xl font-bold text-white">🤔 Hidden Rule</h2>
				<p class="text-lg text-white/90">
					{getQuirkDisplay(currentMinigame.quirkSpec)}
				</p>
				<p class="mt-2 text-sm text-white/70">
					Chat with the AI while following this hidden rule. Then try to guess what the rule is!
				</p>
			</div>

			<!-- Submission Area -->
			<div class="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
				<h2 class="mb-4 text-2xl font-bold text-white">💬 Chat Response</h2>
				<textarea
					bind:value={userSubmission}
					placeholder="Type your message here following the hidden rule..."
					class="w-full rounded-lg bg-white/20 p-4 text-white placeholder-white/50 backdrop-blur-sm"
					rows={4}
					disabled={hasSubmitted}
				></textarea>
				<button
					class="mt-4 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
					onclick={submitResponse}
					disabled={hasSubmitted || !userSubmission.trim()}
				>
					{hasSubmitted ? '✅ Submitted' : '📤 Submit Response'}
				</button>
			</div>

			<!-- Guess Area -->
			<div class="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
				<h2 class="mb-4 text-2xl font-bold text-white">🎯 Guess the Rule</h2>
				<input
					bind:value={userGuess}
					placeholder="What do you think the hidden rule is?"
					class="w-full rounded-lg bg-white/20 p-4 text-white placeholder-white/50 backdrop-blur-sm"
					disabled={hasGuessed}
				/>
				<button
					class="mt-4 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
					onclick={submitGuess}
					disabled={hasGuessed || !userGuess.trim()}
				>
					{hasGuessed ? '✅ Guessed' : '🎲 Submit Guess'}
				</button>
			</div>

			<!-- Activity Feed -->
			<div class="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
				<h2 class="mb-4 text-2xl font-bold text-white">📊 Activity</h2>
				<div class="space-y-2">
					<div class="flex items-center justify-between text-white">
						<span>Responses submitted:</span>
						<span class="font-bold">{submissions.length}</span>
					</div>
					<div class="flex items-center justify-between text-white">
						<span>Guesses submitted:</span>
						<span class="font-bold">{guesses.length}</span>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="flex items-center justify-center">
			<div class="text-2xl text-white">No active mini-game found</div>
		</div>
	{/if}
</div>

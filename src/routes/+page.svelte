<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let connectedPlayers = $state<string[]>(data.usernames || []);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	async function refreshPlayers() {
		await invalidateAll();
		// The data will be updated on next render
	}

	onMount(() => {
		// Poll for connected players every 2 seconds
		refreshInterval = setInterval(refreshPlayers, 2000);
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	// Update when data changes
	$effect(() => {
		connectedPlayers = data.usernames || [];
	});
</script>

<div class="min-h-screen bg-linear-to-br from-orange-100 via-amber-50 to-yellow-100 px-4 py-8">
	<!-- Animated background elements -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden">
		<div
			class="absolute top-20 left-10 animate-bounce text-6xl"
			style="animation-delay: 0s; animation-duration: 3s;"
		>
			🍫
		</div>
		<div
			class="absolute top-40 right-20 animate-bounce text-5xl"
			style="animation-delay: 1s; animation-duration: 4s;"
		>
			🥜
		</div>
		<div
			class="absolute bottom-40 left-1/4 animate-bounce text-4xl"
			style="animation-delay: 2s; animation-duration: 3.5s;"
		>
			✨
		</div>
		<div
			class="absolute right-1/3 bottom-20 animate-bounce text-5xl"
			style="animation-delay: 0.5s; animation-duration: 4.5s;"
		>
			🎉
		</div>
	</div>

	<!-- Header -->
	<header class="relative z-10 mb-12 text-center">
		<div class="mb-6 animate-pulse text-8xl">🥜🍫</div>
		<h1
			class="mb-4 bg-linear-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-5xl font-extrabold text-transparent drop-shadow-lg md:text-6xl"
		>
			Reese's Tier List Showdown
		</h1>
		<p class="text-xl font-semibold text-orange-700 md:text-2xl">
			The Ultimate Peanut Butter Cup Ranking Experience
		</p>
		<div
			class="mt-4 inline-block rounded-full bg-linear-to-r from-orange-400 to-amber-400 px-6 py-2 font-bold text-white shadow-lg"
		>
			{connectedPlayers.length}
			{connectedPlayers.length === 1 ? 'Player' : 'Players'} Connected
		</div>
	</header>

	<!-- Audience Section -->
	<section class="relative z-10 mx-auto max-w-4xl">
		<div
			class="mb-8 rounded-3xl border-4 border-orange-200 bg-white/90 p-8 shadow-2xl backdrop-blur-sm"
		>
			<h2 class="mb-6 flex items-center justify-center gap-3 text-3xl font-bold text-orange-700">
				<span class="animate-spin text-4xl" style="animation-duration: 3s;">🎉</span>
				<span>Audience Voters</span>
				<span
					class="animate-spin text-4xl"
					style="animation-duration: 3s; animation-direction: reverse;">🎊</span
				>
			</h2>

			{#if connectedPlayers.length === 0}
				<div class="py-12 text-center">
					<div class="mb-4 text-6xl">👋</div>
					<p class="text-xl font-semibold text-gray-600">No players connected yet!</p>
					<p class="mt-2 text-sm text-gray-500">Players will appear here when they join</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each connectedPlayers as user, i}
						<a
							href={`/player/${user}`}
							class="group relative overflow-hidden rounded-2xl border-4 border-orange-300 bg-linear-to-br from-orange-100 to-amber-100 p-5 shadow-lg transition-all duration-300 hover:scale-105 hover:rotate-1 hover:border-orange-500 hover:shadow-2xl active:scale-95"
							style="animation-delay: {i * 0.1}s;"
						>
							<!-- Sparkle effect -->
							<div
								class="absolute top-2 right-2 text-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							>
								✨
							</div>

							<div class="relative z-10 flex items-center gap-4">
								<div class="text-5xl group-hover:animate-bounce">🙋</div>
								<div class="min-w-0 flex-1">
									<p
										class="truncate text-lg font-bold text-gray-800 transition-colors group-hover:text-orange-700"
									>
										{user}
									</p>
									<p class="text-xs font-medium text-gray-600">Tap to join! 🚀</p>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Host Button -->
		<div class="mb-8 text-center">
			<a
				href="/host"
				class="hover:shadow-3xl inline-block rounded-2xl border-4 border-orange-500 bg-linear-to-r from-orange-500 to-amber-500 px-8 py-4 text-2xl font-bold text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:from-orange-600 hover:to-amber-600 active:scale-95"
			>
				<span class="mr-2 text-3xl">🎬</span>
				Host the Show
				<span class="ml-2 text-3xl">🎭</span>
			</a>
		</div>

		<!-- Info Card -->
		<div
			class="rounded-3xl border-4 border-orange-300 bg-linear-to-br from-orange-500 via-amber-500 to-yellow-500 p-8 text-center text-white shadow-2xl"
		>
			<p class="mb-4 flex items-center justify-center gap-2 text-3xl font-bold">
				<span class="animate-bounce">🎯</span>
				<span>How It Works</span>
				<span class="animate-bounce" style="animation-delay: 0.2s;">🎯</span>
			</p>
			<div class="space-y-2 text-lg opacity-95">
				<p class="font-semibold">✨ Tap your name to join the fun!</p>
				<p>
					Rate each Reese's product from <span class="font-bold">S-tier</span> (perfection) to
					<span class="font-bold">F-tier</span> (why does this exist?)
				</p>
				<p>See if you agree with the crowd! 🎉</p>
			</div>
		</div>
	</section>
</div>

<style>
	@keyframes float {
		0%,
		100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-20px);
		}
	}

	.animate-float {
		animation: float 3s ease-in-out infinite;
	}
</style>

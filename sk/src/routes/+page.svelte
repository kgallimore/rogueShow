<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="min-h-screen bg-linear-to-b from-orange-50 to-amber-100 px-4 py-8">
	<!-- Header -->
	<header class="mb-8 text-center">
		<div class="mb-4 text-6xl">🥜🍫</div>
		<h1 class="mb-2 text-4xl font-bold text-orange-800">Reese's Tier List Showdown</h1>
		<p class="text-lg text-orange-600">The Ultimate Peanut Butter Cup Ranking Experience</p>
	</header>

	<!-- Audience Section -->
	<section class="mx-auto max-w-2xl">
		<div class="mb-6 rounded-2xl bg-white p-6 shadow-lg">
			<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-orange-700">
				<span>🎉</span>
				<span>Audience Voters</span>
				<span class="text-sm font-normal text-gray-500">({data.users.length})</span>
			</h2>

			<div class="grid grid-cols-2 gap-3">
				{#each data.users as user}
					<a
						href={`/player/${user.name}`}
						class="rounded-xl border-2 border-orange-200 bg-linear-to-r from-orange-100
						       to-amber-100 p-4
						       shadow-sm transition-all hover:border-orange-400
						       hover:from-orange-200 hover:to-amber-200 active:scale-95"
					>
						<div class="flex items-center gap-3">
							<div class="text-3xl">🙋</div>
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold text-gray-800">
									{user.name}
								</p>
								<p class="text-xs text-gray-500">Tap to sign in</p>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- Info Card -->
		<div class="rounded-2xl bg-orange-600 p-6 text-center text-white shadow-lg">
			<p class="mb-2 text-lg font-semibold">🎯 How It Works</p>
			<p class="text-sm opacity-90">
				Tap your name to join the fun! Rate each Reese's product from S-tier (perfection) to F-tier
				(why does this exist?) and see if you agree with the crowd!
			</p>
		</div>
	</section>
</div>

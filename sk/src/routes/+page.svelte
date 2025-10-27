<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="min-h-screen bg-linear-to-b from-orange-50 to-amber-100 px-4 py-8">
	<!-- Header -->
	<header class="text-center mb-8">
		<div class="text-6xl mb-4">🥜🍫</div>
		<h1 class="text-4xl font-bold text-orange-800 mb-2">
			Reese's Tier List Showdown
		</h1>
		<p class="text-lg text-orange-600">
			The Ultimate Peanut Butter Cup Ranking Experience
		</p>
	</header>

	<!-- Audience Section -->
	<section class="max-w-2xl mx-auto">
		<div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
			<h2 class="text-2xl font-bold text-orange-700 mb-4 flex items-center gap-2">
				<span>🎉</span>
				<span>Audience Voters</span>
				<span class="text-sm font-normal text-gray-500">({data.users.length})</span>
			</h2>
			
			<div class="grid grid-cols-2 gap-3">
				{#each data.users as user}
					<a 
						href={`/player/${user.name}`}
						class="bg-linear-to-r from-orange-100 to-amber-100 rounded-xl p-4 
						       hover:from-orange-200 hover:to-amber-200 
						       active:scale-95 transition-all shadow-sm
						       border-2 border-orange-200 hover:border-orange-400"
					>
						<div class="flex items-center gap-3">
							<div class="text-3xl">🙋</div>
							<div class="flex-1 min-w-0">
								<p class="font-semibold text-gray-800 truncate">
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
		<div class="bg-orange-600 text-white rounded-2xl shadow-lg p-6 text-center">
			<p class="text-lg font-semibold mb-2">
				🎯 How It Works
			</p>
			<p class="text-sm opacity-90">
				Tap your name to join the fun! Rate each Reese's product from S-tier (perfection) 
				to F-tier (why does this exist?) and see if you agree with the crowd!
			</p>
		</div>
	</section>
</div>

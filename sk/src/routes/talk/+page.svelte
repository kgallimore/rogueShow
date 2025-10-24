<script lang="ts">
	import { getChat } from '$lib/api';
	let response = $state('');
	let isLoading = $state(false);

	async function prompt() {
		response = '';
		isLoading = true;

		try {
			const reader = await getChat('tell me a really long story about a robot learning to love');
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = decoder.decode(value, { stream: true });
				// Parse SSE format (Server-Sent Events)
				const lines = text.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(6));
							const content = data.choices?.[0]?.delta?.content;
							if (content) {
								response += content;
							}
						} catch (e) {
							// Skip malformed JSON
						}
					}
				}
			}
		} catch (error) {
			console.error('Error:', error);
			response = 'Error occurred while fetching response';
		} finally {
			isLoading = false;
		}
	}
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<button onclick={prompt} disabled={isLoading}>
	{isLoading ? 'Generating...' : 'Click me'}
</button>

{#if response}
	<div class="response">
		<h2>Response:</h2>
		<p>{response}</p>
	</div>
{/if}

<style>
	.response {
		margin-top: 2rem;
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background-color: #f9f9f9;
	}

	.response h2 {
		margin-top: 0;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

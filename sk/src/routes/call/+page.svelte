<script lang="ts">
	import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents/realtime';
	import { Agent, run } from '@openai/agents';
	import { generateClientSecret } from '$lib/remote/openai.remote';
	import { z } from 'zod';

	const playSoundTool = tool({
		name: 'play_sound',
		description:
			'Play a sound. The sound parameter is the name of the sound to play. The sound must be one of: big-boom, riser, riser-fear',
		parameters: z.object({
			sound: z.string().refine((val) => ['big-boom', 'riser', 'riser-fear'].includes(val), {
				message: 'Invalid sound. Must be one of: big-boom, riser, riser-fear.'
			})
		}),
		execute: async (input) => {
			console.log(`Playing sound: ${input.sound}`);
			var audio = new Audio(`sounds/${input.sound}.mp3`);
			await audio.play();
			// wait for the sound to finish playing
			await new Promise((resolve) => {
				audio.onended = resolve;
			});
			console.log(`Sound ended: ${input.sound}`);
			return `Played sound: ${input.sound}`;
		}
	});

	const clientApiKey = await generateClientSecret();

	async function startCall() {
		const agent = new RealtimeAgent({
			name: 'Data agent',
			tools: [playSoundTool]
		});
		const secondaryAgent = new Agent({
			name: 'Secondary Agent',
			instructions:
				'You are a secondary agent that can assist the main agent. You can use tools to help the main agent. Your goal is to determine if and when to play a sound. You must use the play_sound tool to play a sound. You must choose the sound based on the context of the conversation. You must only use the play_sound tool when you are sure that it is appropriate to do so.',
			tools: [playSoundTool]
		});
		agent.on('agent_end', (event) => {
			// run(secondaryAgent, event.context.history.at(-1)).then(() => {
			// 	console.log('Secondary agent run complete');
			// });
			console.log('Agent ended:', event);
		});

		session = new RealtimeSession(agent);
		try {
			await session.connect({
				apiKey: clientApiKey
			});
			isConnected = true;
		} catch (e) {
			console.error(e);
		}
	}

	async function endCall() {
		// Logic to end the call
		session?.close();
		session = null;
		isConnected = false;
	}
	let session: RealtimeSession | null = $state(null);
	let status = $state('Ready to connect');
	let isConnected = $state(false);
</script>

<div class="flex min-h-screen flex-col items-center justify-center p-8">
	<div class="w-full max-w-md space-y-6">
		<h1 class="text-center text-3xl font-bold">OpenAI WebRTC Call</h1>

		<div class="rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
			<div class="mb-4">
				<p class="text-sm font-medium text-gray-700">Status:</p>
				<p class="text-sm text-gray-600">{status}</p>
			</div>

			<div class="flex gap-4">
				<button
					onclick={startCall}
					disabled={isConnected}
					class="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Start Call
				</button>

				<button
					onclick={endCall}
					disabled={!isConnected}
					class="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					End Call
				</button>
			</div>
		</div>

		<div class="text-center text-sm text-gray-500">
			<p>This will connect to OpenAI's Realtime API using WebRTC.</p>
			<p class="mt-2">Make sure your microphone is enabled.</p>
		</div>
	</div>
</div>

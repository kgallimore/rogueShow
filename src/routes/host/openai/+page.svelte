<script lang="ts">
	import type { PageProps } from './$types';
	import { generateClientSecret } from '$lib/remote/openai.remote';

	let { data }: PageProps = $props();

	// Available sound effects from static/sounds folder
	const availableSounds = ['big-boom', 'riser', 'riser-fear'];

	// State management using Svelte 5 runes
	let isListening = $state(false);
	let chatMessages: Array<{
		role: 'user' | 'assistant';
		content: string;
		displayContent?: string;
	}> = $state([]);
	let chatInput = $state('');
	let isStreamingText = $state(false);
	let transcript = '';
	let currentDisplayMessage = $state(''); // Message without sound markers for display

	// Manual sound playback function
	async function playSound(soundName: string) {
		console.log(`🔊 Playing sound: ${soundName}`);
		const audio = new Audio(`/sounds/${soundName}.mp3`);

		try {
			await audio.play();
			await new Promise((resolve) => {
				audio.onended = resolve;
			});
			console.log(`✅ Sound completed: ${soundName}`);
		} catch (error) {
			console.error(`❌ Error playing sound: ${error}`);
		}
	}

	async function startListening() {
		isListening = true;

		// 1) ask server for ephemeral secret
		const clientSecret = await generateClientSecret({ type: 'transcription' });

		// 2) create RTCPeerConnection and data channel
		const pc = new RTCPeerConnection();
		const eventsChannel = pc.createDataChannel('oai.events');

		eventsChannel.onmessage = (ev) => {
			try {
				const payload = JSON.parse(ev.data);
				// OpenAI realtime datachannel typically sends event objects (check docs)
				// For transcription the event might look like { type: 'transcript', text: '...' }
				if (payload.type === 'transcript' && payload.text) {
					transcript += payload.text + '\n';
				}
			} catch (e) {
				console.warn('non-json DC message', ev.data);
			}
		};

		// Optional: handle remote audio (assistant voice) if model returns audio track
		pc.ontrack = (evt) => {
			const remoteAudioEl = document.createElement('audio');
			remoteAudioEl.autoplay = true;
			remoteAudioEl.srcObject = evt.streams[0];
			document.body.appendChild(remoteAudioEl);
		};

		// 3) add local microphone
		const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
		for (const track of localStream.getTracks()) {
			pc.addTrack(track, localStream);
		}

		// 4) create offer and set local description
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		console.log('Local SDP offer created', offer);

		// 5) send the SDP offer to the OpenAI realtime endpoint using the ephemeral secret
		// Endpoint: https://api.openai.com/v1/realtime?model=MODEL_NAME
		const model = 'gpt-4o-mini-transcribe'; // change if necessary
		const resp = await fetch(
			`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${clientSecret}`,
					'Content-Type': 'application/sdp'
				},
				body: offer.sdp
			}
		);

		if (!resp.ok) {
			console.error('Realtime handshake failed', await resp.text());
			isListening = false;
			return;
		}

		// 6) set the remote answer SDP returned by OpenAI
		const answerSDP = await resp.text();
		await pc.setRemoteDescription({ type: 'answer', sdp: answerSDP });

		// Keep references if you want to stop later
		(window as any).__rogue_pc = pc;
		(window as any).__rogue_localStream = localStream;
	}

	function stopListening() {
		const pc: RTCPeerConnection | undefined = (window as any).__rogue_pc;
		const s: MediaStream | undefined = (window as any).__rogue_localStream;
		pc?.getSenders().forEach((s) => s.track?.stop());
		s?.getTracks().forEach((t) => t.stop());
		pc?.close();
		isListening = false;
	}
</script>

<div class="mx-auto flex min-h-screen max-w-6xl flex-col p-4">
	<header class="mb-8 text-center">
		<h1 class="mb-2 text-4xl font-bold text-gray-900">RogueShow Host</h1>
		<p class="text-gray-600">
			AI Co-Host with Voice & Text (Sound Markers: &#123;&#123;sound:name&#125;&#125;)
		</p>
	</header>

	<div class="grid flex-1 gap-6 lg:grid-cols-2">
		<!-- Voice Control Panel -->
		<div class="flex flex-col space-y-6">
			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<h2 class="mb-4 text-2xl font-semibold text-gray-800">Voice Session (Whisper AI)</h2>

				<div class="space-y-3">
					<button
						onclick={isListening ? stopListening : startListening}
						class="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
					>
						{isListening ? '🛑 Stop Voice Session' : '🎙️ Start Voice Session'}
					</button>
				</div>
			</div>
		</div>

		<!-- Text Chat Panel -->
		<div class="flex flex-col">
			<div class="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
				<div class="border-b border-gray-200 p-4">
					<h2 class="text-2xl font-semibold text-gray-800">Conversation</h2>
					<p class="text-sm text-gray-600">Voice responses spoken, text responses written only</p>
				</div>

				<!-- Messages -->
				<div class="flex-1 space-y-4 overflow-y-auto p-4">
					{#if chatMessages.length === 0}
						<div class="flex h-full items-center justify-center text-center text-gray-400">
							<div>
								<p class="mb-2">💬 Send a message or start voice mode</p>
								<p class="text-xs">
									AI will use &#123;&#123;sound:name&#125;&#125; markers for effects
								</p>
							</div>
						</div>
					{/if}

					{#each chatMessages as message}
						<div class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
							<div
								class={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
							>
								<div class="mb-1 text-xs font-semibold opacity-75">
									{message.role === 'user' ? 'You' : 'AI Host'}
								</div>
								<div class="whitespace-pre-wrap">
									{message.displayContent || message.content}
								</div>
							</div>
						</div>
					{/each}

					{#if isStreamingText && currentDisplayMessage}
						<div class="flex justify-start">
							<div class="max-w-[80%] rounded-lg bg-gray-100 px-4 py-2 text-gray-900">
								<div class="mb-1 text-xs font-semibold opacity-75">AI Host</div>
								<div class="whitespace-pre-wrap">
									{currentDisplayMessage}<span class="animate-pulse">▊</span>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Input -->
				<div class="border-t border-gray-200 p-4">
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={chatInput}
							disabled={isStreamingText}
							placeholder="Type a message... (Enter to send)"
							class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:opacity-50"
						/>
						<button
							disabled={isStreamingText || !chatInput.trim()}
							class="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isStreamingText ? '⏳' : '📤'}
						</button>
					</div>
					<p class="mt-2 text-xs text-gray-500">
						💡 Text messages won't be spoken - use voice mode for speech
					</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Smooth scrolling for chat */
	.overflow-y-auto {
		scroll-behavior: smooth;
	}
</style>

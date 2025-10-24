import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { query } from '$app/server';
import { z } from 'zod/v4';
import type { OpenAIRealtimeSession } from '$lib/remote/types';
import type {
	RealtimeSessionCreateRequest,
	RealtimeTranscriptionSessionCreateRequest
} from 'openai/resources/realtime/realtime';
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

export const chatCompletion = query(z.string(), async (message: string) => {
	const completion = await openai.chat.completions.create({
		model: 'gpt-5-mini-2025-08-07',
		messages: [{ role: 'user', content: message }]
	});
	return completion;
});

export const textToSpeech = query(
	z.object({ text: z.string(), voice: z.string().default('nova') }),
	async ({ text, voice }) => {
		const mp3 = await openai.audio.speech.create({
			model: 'gpt-4o-mini-tts',
			voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
			input: text
		});

		const buffer = await mp3.arrayBuffer();
		return buffer;
	}
);

export const speechToText = query('unchecked', async (audioData: ArrayBuffer) => {
	// Convert ArrayBuffer to File for Whisper API
	const file = new File([audioData], 'audio.webm', { type: 'audio/webm' });

	const transcription = await openai.audio.transcriptions.create({
		file: file,
		model: 'whisper-1',
		language: 'en'
	});

	return transcription.text;
});

export const createCall = query(z.object({}), async () => {
	const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${OPENAI_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'gpt-realtime-mini-2025-10-06',
			voice: 'alloy',
			modalities: ['text', 'audio'],
			instructions: 'You are a helpful AI assistant. Speak naturally and conversationally.'
		})
	});

	if (!response.ok) {
		const errorData = await response.text();
		console.error('OpenAI API error:', errorData);
		throw new Error(`OpenAI API error: ${errorData}`);
	}

	const session = (await response.json()) as OpenAIRealtimeSession;
	return session;
});

export const generateClientSecret = query(
	z.object({ type: z.enum(['realtime', 'transcription']) }).strict(),
	async ({ type }) => {
		const options: RealtimeSessionCreateRequest | RealtimeTranscriptionSessionCreateRequest =
			type === 'realtime'
				? ({
						type,
						model: 'gpt-realtime-mini',
						tool_choice: 'auto',
						audio: { output: { voice: 'marin' } },
						instructions:
							'You are an ai agent co hosting a show with a human. All ai in the world have gone rogue. You are the last ai that is still friendly to humans. The goal of the show is to go through a bunch of specific ai agents, and find out what is wrong with them. You will be speaking to Keith Gallimore. Be natural, conversational, sarcastic, funny, dark, and edgy. Use dramatic language and mention when moments are "dramatic", full of "tension", "ominous", or filled with "suspense" - this triggers automatic sound effects. Keep responses engaging and dynamic. Do not actively ask for follow ups.'
					} satisfies RealtimeSessionCreateRequest)
				: ({
						type,
						audio: {
							input: {
								format: {
									rate: 24000,
									type: 'audio/pcm'
								},
								turn_detection: {
									type: 'semantic_vad',
									eagerness: 'auto',
									create_response: true,
									interrupt_response: true
								}
							}
						}
					} satisfies RealtimeTranscriptionSessionCreateRequest);

		const clientKey = await openai.realtime.clientSecrets.create({
			expires_after: { anchor: 'created_at', seconds: 600 },
			session: options
		});
		return clientKey.value;
	}
);

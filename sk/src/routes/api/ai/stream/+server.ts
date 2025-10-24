import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	const { message } = await request.json();
	const streamingResponse = await openai.chat.completions.create({
		model: 'gpt-5-mini-2025-08-07',
		messages: [{ role: 'user', content: message }],
		stream: true
	});

	const headers = {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive'
	};

	const stream = new ReadableStream({
		async start(controller) {
			for await (const chunk of streamingResponse) {
				controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
			}
			controller.close();
		}
	});
	return new Response(stream, { headers });
};

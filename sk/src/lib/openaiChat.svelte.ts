import { OpenAI } from 'openai';
// import { Agent, run, setDefaultOpenAIClient, type RunStreamEvent } from '@openai/agents';
// import type { Responses } from 'openai/resources/responses';

export class OpenAiChat {
	clientSecret: string;
	client: OpenAI;
	constructor(clientSecret: string) {
		this.clientSecret = clientSecret;
		this.client = new OpenAI({ apiKey: this.clientSecret, dangerouslyAllowBrowser: true });
		// setDefaultOpenAIClient(this.client);
	}

	async createChatCompletion(message: string) {
		// const newAgent = new Agent({
		// 	tools: [],
		// 	name: 'RogueShowAgent',
		// 	model: 'gpt-5-nano-2025-08-07'
		// });

		// agent: await run(newAgent, message, { stream: true })

		return await this.client.responses.create({
			model: 'gpt-5-mini-2025-08-07',
			input: [
				{
					role: 'user',
					content: message
				}
			],
			reasoning: { effort: 'minimal' },
			stream: true
		});
	}
}

// (async () => {
//     let targetAgentIndex = chatOutputs.agent.length;
//     chatOutputs.agent.push("");
//     for await (const chunk of agent) {
//         const event = chunk as RunStreamEvent;
//         console.log('Agent response chunk:', event);

//         // Extract text from the agent response
//         if ('data' in event && typeof event.data === 'object' && event.data !== null) {
//             const data = event.data as Record<string, any>;

//             // Handle model events (nested structure)
//             if (data.type === 'model' && 'event' in data && typeof data.event === 'object' && data.event !== null) {
//                 const modelEvent = data.event as Record<string, any>;

//                 // Handle text delta events from model
//                 if (modelEvent.type === 'response.output_text.delta' && 'delta' in modelEvent) {
//                     chatOutputs.agent[targetAgentIndex] += modelEvent.delta;
//                 }
//                 // Handle completed event with full response
//                 else if (modelEvent.type === 'response.completed' && 'response' in modelEvent) {
//                     const response = modelEvent.response as Record<string, any>;
//                     if (Array.isArray(response.output)) {
//                         // Find the message output item
//                         const messageOutput = response.output.find((item: any) => item.type === 'message');
//                         if (messageOutput?.content?.[0]?.text) {
//                             // If we haven't collected text via deltas, use the complete text
//                             if (!chatOutputs.agent[targetAgentIndex]) {
//                                 chatOutputs.agent[targetAgentIndex] = messageOutput.content[0].text;
//                             }
//                         }
//                     }
//                 }
//             }
//             // Handle text delta events (direct structure)
//             else if (data.type === 'text_delta' && 'delta' in data && 'text' in data.delta) {
//                 chatOutputs.agent[targetAgentIndex] += data.delta.text;
//             }
//         }
//     }
// })()

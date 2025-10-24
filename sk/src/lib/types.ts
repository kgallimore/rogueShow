export type WebsocketProxyMessage = {
	transcribe?: ArrayBuffer;
	speak?: {
		text: string;
		deepgram?: {
			model?: string;
		};
		elevenLabs?: {
			voiceId: string;
			model?: string;
		};
	};
};
export type WebSocketInitialMessage = {
	transcribe?: object;
	speak?: { voiceId?: string };
};
export type WebsocketClientReceiveMessage =
	| ArrayBuffer
	| {
			transcription?: {
				text: string;
				isFinal: boolean;
			};
	  };

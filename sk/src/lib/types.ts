export type WebsocketProxyMessage = {
	transcribe?: ArrayBuffer;
	speak?: string;
};

export type WebSocketInitialMessage = {
	transcribe?: object;
	speak?: { voiceId?: string; type: 'elevenLabs' | 'deepgram' };
};
export type WebsocketClientReceiveMessage =
	| ArrayBuffer
	| Buffer<ArrayBuffer>
	| {
			transcription?: {
				text: string;
				isFinal: boolean;
			};
			// Generic event/status messages sent by server-side proxies
			type?: 'Open' | 'Flushed' | 'Close' | 'Error';
			error?: string;
			isFinal?: boolean;
	  }
	// Allow passing through small metadata objects (e.g., vendor messages)
	| Record<string, unknown>;

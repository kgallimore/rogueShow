export type WebsocketProxyMessage = {
	transcribe?: ArrayBuffer;
	speak?: { text: string; flush?: boolean };
};

export type WebSocketInitialMessage = {
	transcribe?: object;
	speak?: { voiceId?: string; type: 'elevenLabs' | 'deepgram' };
};
export type WebsocketClientReceiveMessage =
	| ArrayBuffer
	| Buffer<ArrayBuffer>
	| WebsocketClientReceiveMessageJson;
export type WebsocketClientReceiveMessageJson = {
	transcription?: DeepgramTranscription;
	// Generic event/status messages sent by server-side proxies
	type?: 'Open' | 'Flushed' | 'Close' | 'Error';
	error?: string;
	isFinal?: boolean;
};
export type DeepgramTranscription = {
	type: 'Connected' | 'TurnInfo';
	request_id: string;
	event?: string;
	turn_index?: number;
	audio_window_start?: number;
	audio_window_end?: number;
	transcript?: string;
	words?: string[];
	end_of_turn_confidence?: number;
	sequence_id: number;
};

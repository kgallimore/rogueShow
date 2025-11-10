export type TurnDetection = {
	type: 'server_vad';
	threshold: number;
	prefix_padding_ms: number;
	silence_duration_ms: number;
	idle_timeout_ms: number | null;
	create_response: boolean;
	interrupt_response: boolean;
};

export type ClientSecret = {
	value: string;
	expires_at: number;
};

export type AudioConfig = {
	input: unknown;
	output: unknown;
};

export type OpenAIRealtimeSession = {
	object: 'realtime.session';
	id: string;
	model: string;
	modalities: ('audio' | 'text')[];
	instructions: string;
	voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
	output_audio_format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
	tools: unknown[];
	tool_choice: 'auto' | 'none' | 'required' | { type: 'function'; name: string };
	temperature: number;
	max_response_output_tokens: number | 'inf';
	turn_detection: TurnDetection | null;
	speed: number;
	tracing: unknown | null;
	truncation: 'auto' | 'disabled';
	prompt: string | null;
	expires_at: number;
	input_audio_noise_reduction: unknown | null;
	input_audio_format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
	input_audio_transcription: unknown | null;
	client_secret: ClientSecret;
	include: unknown | null;
};

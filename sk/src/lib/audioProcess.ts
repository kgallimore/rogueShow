/**
 * Applies deep, boomy voice effect with artificial undertone
 * @param audioBuffer - The original audio buffer
 * @returns Processed audio buffer
 */
export async function applyDeepBoomyEffect(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
	const offlineContext = new OfflineAudioContext(
		audioBuffer.numberOfChannels,
		audioBuffer.length,
		audioBuffer.sampleRate
	);

	const source = offlineContext.createBufferSource();
	source.buffer = audioBuffer;

	// Pitch shift down (deep voice effect)
	source.playbackRate.value = 0.7; // Lower = deeper (0.5-0.8 range)

	// Low-pass filter for boomy bass
	const lowPass = offlineContext.createBiquadFilter();
	lowPass.type = 'lowpass';
	lowPass.frequency.value = 800; // Cut highs, keep bass
	lowPass.Q.value = 1.5;

	// Bass boost
	const bassBoost = offlineContext.createBiquadFilter();
	bassBoost.type = 'lowshelf';
	bassBoost.frequency.value = 200;
	bassBoost.gain.value = 12; // dB boost

	// Distortion for artificial/robotic undertone
	const distortion = offlineContext.createWaveShaper();
	distortion.curve = makeDistortionCurve(80); // Moderate distortion

	// Reverb for boomy space (optional)
	const convolver = offlineContext.createConvolver();
	convolver.buffer = await createReverbBuffer(offlineContext, 1.5, 0.4);

	// Signal chain
	source
		.connect(lowPass)
		.connect(bassBoost)
		.connect(distortion)
		.connect(convolver)
		.connect(offlineContext.destination);

	source.start(0);
	return await offlineContext.startRendering();
}

/**
 * Creates distortion curve for artificial undertone
 */
function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
	const samples = 44100;
	const curve = new Float32Array(samples);
	const deg = Math.PI / 180;

	for (let i = 0; i < samples; i++) {
		const x = (i * 2) / samples - 1;
		curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
	}
	return curve;
}

/**
 * Creates impulse response for reverb effect
 */
async function createReverbBuffer(
	context: OfflineAudioContext,
	duration: number,
	decay: number
): Promise<AudioBuffer> {
	const sampleRate = context.sampleRate;
	const length = sampleRate * duration;
	const impulse = context.createBuffer(2, length, sampleRate);

	for (let channel = 0; channel < 2; channel++) {
		const channelData = impulse.getChannelData(channel);
		for (let i = 0; i < length; i++) {
			channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
		}
	}
	return impulse;
}

/**
 * Real-time effect for live audio (e.g., RealtimeAgent)
 * Returns a connected node chain you can insert into audio graph
 */
export function createDeepBoomyNode(audioContext: AudioContext): AudioNode {
	const lowPass = audioContext.createBiquadFilter();
	lowPass.type = 'lowpass';
	lowPass.frequency.value = 800;

	const bassBoost = audioContext.createBiquadFilter();
	bassBoost.type = 'lowshelf';
	bassBoost.frequency.value = 200;
	bassBoost.gain.value = 12;

	const distortion = audioContext.createWaveShaper();
	distortion.curve = makeDistortionCurve(80);

	lowPass.connect(bassBoost).connect(distortion);

	return {
		input: lowPass,
		output: distortion,
		connect: (destination: AudioNode) => distortion.connect(destination),
		disconnect: () => distortion.disconnect()
	} as unknown as AudioNode;
}

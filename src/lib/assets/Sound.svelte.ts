import { SvelteSet } from 'svelte/reactivity';

/**
 * Shared AudioContext instance for all Sound instances
 * Created lazily to avoid issues with autoplay policies
 */
let context: AudioContext | null = null;

/**
 * Get or create the shared AudioContext instance
 * Automatically resumes the context if it's in a suspended state
 */
function getAudioContext(): AudioContext {
	if (!context) {
		context = new AudioContext();
	}

	// Resume context if suspended (e.g., due to autoplay policies)
	if (context.state === 'suspended') {
		context.resume().catch((err) => {
			console.error('Failed to resume AudioContext:', err);
		});
	}

	return context;
}

/**
 * Sound class for loading and playing audio files
 * Supports multiple concurrent playbacks of the same sound
 */
export class Sound {
	readonly url: string;
	private buffer: AudioBuffer | null = null;
	private sources = new SvelteSet<AudioBufferSourceNode>();
	private loading: Promise<AudioBuffer> | null = null;
	private defaultVolume = 1;

	constructor(url: string) {
		this.url = url;
	}

	/**
	 * Load the audio file and decode it
	 * Returns cached buffer if already loaded
	 * Shares loading promise to prevent duplicate requests
	 */
	async load(): Promise<AudioBuffer> {
		if (!this.url) {
			throw new Error('Missing or invalid URL');
		}

		if (this.buffer) {
			return this.buffer;
		}

		// Return existing loading promise if already in progress
		if (this.loading) {
			return this.loading;
		}

		this.loading = (async () => {
			try {
				const response = await fetch(this.url);

				if (!response.ok) {
					throw new Error(`Failed to load sound: ${response.status} ${response.statusText}`);
				}

				const arrayBuffer = await response.arrayBuffer();
				const audioContext = getAudioContext();

				// Use promise-based decodeAudioData
				const buffer = await audioContext.decodeAudioData(arrayBuffer);

				this.buffer = buffer;
				return buffer;
			} catch (err) {
				console.error(`Sound loading error for ${this.url}:`, err);
				throw err;
			} finally {
				this.loading = null;
			}
		})();

		return this.loading;
	}

	/**
	 * Set the default volume for this sound (0.0 to 1.0)
	 */
	setVolume(volume: number): void {
		this.defaultVolume = Math.max(0, Math.min(1, volume));
	}

	/**
	 * Play the sound
	 * @param volume - Volume multiplier (0.0 to 1.0), uses default if not specified
	 * @param time - When to start playing (in seconds, relative to AudioContext.currentTime)
	 * @returns Promise that resolves when playback starts
	 */
	async play(volume?: number, time = 0): Promise<void> {
		// Ensure buffer is loaded
		if (!this.buffer) {
			await this.load();
		}

		if (!this.buffer) {
			throw new Error('Failed to load audio buffer');
		}

		const audioContext = getAudioContext();

		// Create a new sound source and assign it the loaded sound's buffer
		const source = audioContext.createBufferSource();
		source.buffer = this.buffer;

		// Track the source for cleanup
		this.sources.add(source);

		// Remove from tracking when playback ends
		source.onended = () => {
			this.sources.delete(source);
		};

		// Create a gain node with the desired volume
		const gainNode = audioContext.createGain();
		const finalVolume = volume !== undefined ? volume : this.defaultVolume;
		gainNode.gain.value = Math.max(0, Math.min(1, finalVolume));

		// Connect nodes: source -> gain -> destination
		source.connect(gainNode).connect(audioContext.destination);

		// Start playing at the desired time
		const startTime = time > 0 ? audioContext.currentTime + time : audioContext.currentTime;
		source.start(startTime);
	}

	/**
	 * Stop all currently playing instances of this sound
	 */
	stop(): void {
		this.sources.forEach((source) => {
			try {
				source.stop();
			} catch {
				// Ignore errors from already stopped sources
			}
		});
		this.sources.clear();
	}

	/**
	 * Check if the sound is currently playing
	 */
	isPlaying(): boolean {
		return this.sources.size > 0;
	}

	/**
	 * Check if the sound buffer is loaded
	 */
	isLoaded(): boolean {
		return this.buffer !== null;
	}

	/**
	 * Unload the sound buffer to free memory
	 */
	unload(): void {
		this.stop();
		this.buffer = null;
		this.loading = null;
	}
}

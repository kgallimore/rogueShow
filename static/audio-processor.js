// @ts-check
/// <reference types="@types/audioworklet" />

/**
 * AudioWorklet processor for capturing and processing microphone audio.
 * This processor runs on a separate audio thread for better performance.
 * @extends {AudioWorkletProcessor}
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
    /**
     * Creates an instance of AudioCaptureProcessor.
     * @constructor
     */
    constructor() {
        super();
    }

    /**
     * Processes incoming audio data and converts it to Int16 PCM format.
     * This method is called automatically by the Web Audio API for each audio quantum (128 frames).
     *
     * @param {Float32Array[][]} inputs - Array of inputs, each containing an array of channels with Float32 audio samples
     * @param {Float32Array[][]} _outputs - Array of outputs (unused in this processor)
     * @param {Record<string, Float32Array>} _parameters - Audio parameters (unused in this processor)
     * @returns {boolean} True to keep the processor alive, false to terminate
     */
    process(inputs, _outputs, _parameters) {
        const input = inputs[0];

        if (input && input.length > 0) {
            // First channel (mono) - extract audio data
            const inputData = input[0];

            /**
             * Convert Float32Array to Int16Array (Linear16 PCM format)
             * Float32 values range from -1.0 to 1.0
             * Int16 values range from -32768 to 32767
             * @type {Int16Array}
             */
            const int16Array = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                // Clamp values to prevent overflow
                const clampedValue = Math.max(-1, Math.min(1, inputData[i]));
                // Scale to Int16 range
                int16Array[i] = Math.round(clampedValue * 32767);
            }

            /**
             * Send the audio data to the main thread via MessagePort.
             * Uses transferable objects for zero-copy transfer to improve performance.
             */
            this.port.postMessage(int16Array.buffer, [int16Array.buffer]);
        }

        return true; // Keep processor alive
    }
}

/**
 * Register the AudioWorkletProcessor with the Web Audio API.
 * Name: "audio-capture-processor" - used when creating AudioWorkletNode instances.
 */
registerProcessor("audio-capture-processor", AudioCaptureProcessor);

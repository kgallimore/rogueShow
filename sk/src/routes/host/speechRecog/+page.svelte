<script lang="ts">
    import type { PageProps } from './$types';
	import { onDestroy, onMount } from 'svelte';

    let { data }: PageProps = $props();
    let transcript = $state('');
    
    // Web Speech API type definitions
    interface SpeechRecognitionAlternative {
        transcript: string;
        confidence: number;
    }
    
    interface SpeechRecognitionResult {
        isFinal: boolean;
        [index: number]: SpeechRecognitionAlternative;
        length: number;
    }
    
    interface SpeechRecognitionResultList {
        [index: number]: SpeechRecognitionResult;
        length: number;
    }
    
    interface SpeechRecognitionEvent {
        results: SpeechRecognitionResultList;
        resultIndex: number;
    }
    
    var SpeechRecognitionAPI: any;
    let recognition: any | null = $state();
    onMount(() => {
    if('SpeechRecognition' in window){
        SpeechRecognitionAPI = window.SpeechRecognition;
    } else if ('webkitSpeechRecognition' in window){
        SpeechRecognitionAPI = window.webkitSpeechRecognition;
    } else {
        console.error("Speech Recognition API not supported in this browser.");
    }
    recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log(event.results);
        const result = event.results[0][0];
        if(!event.results[0].isFinal) return;
        transcript += result.transcript;
    };
    recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
    };
    recognition.onend = () => {
        recognition.start(); // Restart recognition on end
    };
    });
    onDestroy(() => {
        if (recognition) {
            recognition.stop();
        }
    });
</script>
<button class="cursor-pointer" disabled={recognition && recognition.state === 'inactive'} onclick={() => {
    if (recognition) {
        recognition.stop();
    }
}}>Stop Recognition</button>
<button class="cursor-pointer" disabled={recognition && recognition.state === 'active'} onclick={() => {
    if (recognition) {
        recognition.start();
    }
}}>Start Recognition</button>
{#if transcript}
    <h2>Transcription:</h2>
    <p>{transcript}</p>
{:else}
    <p>Listening...</p>
{/if}
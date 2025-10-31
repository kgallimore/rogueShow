<script lang="ts">
	interface Props {
		text?: string;
		onComplete?: () => void;
	}

	let { text = 'System Error', onComplete }: Props = $props();

	let glitching = $state(true);
	let displayText = $state(text);
	let glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    let duration = 6000;

	// Randomly glitch characters
	$effect(() => {
		if (!glitching) return;

		const glitchInterval = setInterval(() => {
			const chars = text.split('');
			const numGlitches = Math.floor(Math.random() * 3) + 1; // 1-3 chars glitch at once

			for (let i = 0; i < numGlitches; i++) {
				const randomIndex = Math.floor(Math.random() * chars.length);
				if (Math.random() > 0.5) {
					// Replace with glitch char
					chars[randomIndex] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
				}
			}

			displayText = chars.join('');

			// Reset to original text occasionally
			if (Math.random() > 0.7) {
				setTimeout(() => {
					displayText = text;
				}, 50);
			}
		}, 100);

		return () => clearInterval(glitchInterval);
	});

	// Stop glitching after duration
	$effect(() => {
		const timer = setTimeout(() => {
			glitching = false;
			displayText = "Everything is okay :)";
            setTimeout(() => {
                if (displayText.length > 0){
                    deleteChar();
                    return;
                }
                onComplete?.();
            }, 1000);
			
		}, duration);

		return () => clearTimeout(timer);
	});

    function deleteChar() {
        if (displayText.length > 0) {
            displayText = displayText.slice(0, -1);
            setTimeout(deleteChar, 100 * (Math.random() + .2)); // Adjust speed of deletion here
        }
    }
</script>

<div class="glitch-container" class:active={glitching}>
	<div class="glitch-text" data-text={displayText}>
		{displayText}
	</div>
</div>

<style>
	.glitch-container {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 9999;
	}

	.glitch-text {
		font-size: 4rem;
		font-weight: 900;
		text-transform: uppercase;
		position: relative;
		color: #fff;
		letter-spacing: 0.5rem;
		text-shadow:
			0.05em 0 0 rgba(255, 0, 0, 0.75),
			-0.025em -0.05em 0 rgba(0, 255, 0, 0.75),
			0.025em 0.05em 0 rgba(0, 0, 255, 0.75);
		animation: glitch 500ms infinite, letterShift 150ms infinite;
	}

	.glitch-text::before,
	.glitch-text::after {
		content: attr(data-text);
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.glitch-text::before {
		left: 2px;
		text-shadow: -2px 0 #ff00ff;
		clip: rect(24px, 550px, 90px, 0);
		animation: glitch-anim-1 2s infinite linear alternate-reverse;
	}

	.glitch-text::after {
		left: -2px;
		text-shadow: -2px 0 #00ffff;
		clip: rect(85px, 550px, 140px, 0);
		animation: glitch-anim-2 2.5s infinite linear alternate-reverse;
	}

	@keyframes glitch {
		0% {
			text-shadow:
				0.05em 0 0 rgba(255, 0, 0, 0.75),
				-0.05em -0.025em 0 rgba(0, 255, 0, 0.75),
				-0.025em 0.05em 0 rgba(0, 0, 255, 0.75);
		}
		14% {
			text-shadow:
				0.05em 0 0 rgba(255, 0, 0, 0.75),
				-0.05em -0.025em 0 rgba(0, 255, 0, 0.75),
				-0.025em 0.05em 0 rgba(0, 0, 255, 0.75);
		}
		15% {
			text-shadow:
				-0.05em -0.025em 0 rgba(255, 0, 0, 0.75),
				0.025em 0.025em 0 rgba(0, 255, 0, 0.75),
				-0.05em -0.05em 0 rgba(0, 0, 255, 0.75);
		}
		49% {
			text-shadow:
				-0.05em -0.025em 0 rgba(255, 0, 0, 0.75),
				0.025em 0.025em 0 rgba(0, 255, 0, 0.75),
				-0.05em -0.05em 0 rgba(0, 0, 255, 0.75);
		}
		50% {
			text-shadow:
				0.025em 0.05em 0 rgba(255, 0, 0, 0.75),
				0.05em 0 0 rgba(0, 255, 0, 0.75),
				0 -0.05em 0 rgba(0, 0, 255, 0.75);
		}
		99% {
			text-shadow:
				0.025em 0.05em 0 rgba(255, 0, 0, 0.75),
				0.05em 0 0 rgba(0, 255, 0, 0.75),
				0 -0.05em 0 rgba(0, 0, 255, 0.75);
		}
		100% {
			text-shadow:
				-0.025em 0 0 rgba(255, 0, 0, 0.75),
				-0.025em -0.025em 0 rgba(0, 255, 0, 0.75),
				-0.025em -0.05em 0 rgba(0, 0, 255, 0.75);
		}
	}

	@keyframes glitch-anim-1 {
		0% {
			clip: rect(20px, 9999px, 94px, 0);
			transform: skew(0.2deg);
		}
		10% {
			clip: rect(84px, 9999px, 28px, 0);
			transform: skew(0.8deg);
		}
		20% {
			clip: rect(119px, 9999px, 61px, 0);
			transform: skew(0.95deg);
		}
		30% {
			clip: rect(47px, 9999px, 146px, 0);
			transform: skew(0.5deg);
		}
		40% {
			clip: rect(10px, 9999px, 78px, 0);
			transform: skew(0.1deg);
		}
		50% {
			clip: rect(89px, 9999px, 33px, 0);
			transform: skew(0.7deg);
		}
		60% {
			clip: rect(131px, 9999px, 105px, 0);
			transform: skew(0.3deg);
		}
		70% {
			clip: rect(56px, 9999px, 140px, 0);
			transform: skew(0.6deg);
		}
		80% {
			clip: rect(103px, 9999px, 19px, 0);
			transform: skew(0.4deg);
		}
		90% {
			clip: rect(74px, 9999px, 112px, 0);
			transform: skew(0.9deg);
		}
		100% {
			clip: rect(25px, 9999px, 67px, 0);
			transform: skew(0.2deg);
		}
	}

	@keyframes glitch-anim-2 {
		0% {
			clip: rect(133px, 9999px, 17px, 0);
			transform: skew(0.5deg);
		}
		10% {
			clip: rect(45px, 9999px, 99px, 0);
			transform: skew(0.3deg);
		}
		20% {
			clip: rect(88px, 9999px, 52px, 0);
			transform: skew(0.7deg);
		}
		30% {
			clip: rect(111px, 9999px, 126px, 0);
			transform: skew(0.2deg);
		}
		40% {
			clip: rect(29px, 9999px, 64px, 0);
			transform: skew(0.9deg);
		}
		50% {
			clip: rect(97px, 9999px, 41px, 0);
			transform: skew(0.6deg);
		}
		60% {
			clip: rect(14px, 9999px, 118px, 0);
			transform: skew(0.4deg);
		}
		70% {
			clip: rect(71px, 9999px, 85px, 0);
			transform: skew(0.8deg);
		}
		80% {
			clip: rect(122px, 9999px, 36px, 0);
			transform: skew(0.1deg);
		}
		90% {
			clip: rect(58px, 9999px, 109px, 0);
			transform: skew(0.5deg);
		}
		100% {
			clip: rect(92px, 9999px, 73px, 0);
			transform: skew(0.3deg);
		}
	}

	@keyframes letterShift {
		0% {
			transform: translate(0, 0);
		}
		20% {
			transform: translate(-2px, 1px);
		}
		40% {
			transform: translate(1px, -1px);
		}
		60% {
			transform: translate(2px, 0px);
		}
		80% {
			transform: translate(-1px, -2px);
		}
		100% {
			transform: translate(0, 0);
		}
	}

	/* Responsive sizing */
	@media (max-width: 768px) {
		.glitch-text {
			font-size: 2.5rem;
			letter-spacing: 0.3rem;
		}
	}

	@media (max-width: 480px) {
		.glitch-text {
			font-size: 1.8rem;
			letter-spacing: 0.2rem;
		}
	}
</style>

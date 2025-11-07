import { SvelteDate, SvelteMap } from 'svelte/reactivity';

export type FrictionEvent = {
	id: string;
	name: string;
	description: string;
	duration: number; // in milliseconds
	severity: 'mild' | 'moderate' | 'severe';
	effect: () => void;
	cleanup?: () => void;
};

export class FrictionSystem {
	private activeEvents = $state<FrictionEvent[]>([]);
	private eventHistory = $state<string[]>([]);

	constructor() {
		// Note: Friction system initialization should happen only in browser context
		// This will be initialized when needed in browser-specific methods
	}

	getAvailableEvents(): FrictionEvent[] {
		return [
			{
				id: 'glitch-text',
				name: 'Text Glitch',
				description: 'Random text elements glitch and flicker',
				duration: 5000,
				severity: 'mild',
				effect: () => this.applyTextGlitch(),
				cleanup: () => this.removeTextGlitch()
			},
			{
				id: 'button-swap',
				name: 'Button Swap',
				description: 'Buttons temporarily swap positions',
				duration: 3000,
				severity: 'moderate',
				effect: () => this.swapButtonPositions(),
				cleanup: () => this.restoreButtonPositions()
			},
			{
				id: 'color-invert',
				name: 'Color Invert',
				description: 'Colors temporarily invert',
				duration: 2000,
				severity: 'mild',
				effect: () => this.invertColors(),
				cleanup: () => this.restoreColors()
			},
			{
				id: 'cursor-hide',
				name: 'Hidden Cursor',
				description: 'Cursor becomes invisible on interactive elements',
				duration: 4000,
				severity: 'moderate',
				effect: () => this.hideCursor(),
				cleanup: () => this.showCursor()
			},
			{
				id: 'font-chaos',
				name: 'Font Chaos',
				description: 'Fonts randomly change size and family',
				duration: 6000,
				severity: 'severe',
				effect: () => this.chaosFonts(),
				cleanup: () => this.restoreFonts()
			},
			{
				id: 'slow-motion',
				name: 'Slow Motion',
				description: 'All animations slow down dramatically',
				duration: 8000,
				severity: 'moderate',
				effect: () => this.slowAnimations(),
				cleanup: () => this.normalAnimations()
			},
			{
				id: 'shuffle-words',
				name: 'Word Shuffle',
				description: 'Words in text elements get shuffled',
				duration: 4500,
				severity: 'severe',
				effect: () => this.shuffleWords(),
				cleanup: () => this.restoreWords()
			}
		];
	}

	triggerRandomEvent(): void {
		const availableEvents = this.getAvailableEvents();
		const randomEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
		this.triggerEvent(randomEvent);
	}

	triggerEvent(event: FrictionEvent): void {
		// Don't trigger if same event is already active
		if (this.activeEvents.some((e) => e.id === event.id)) {
			return;
		}

		this.activeEvents = [...this.activeEvents, event];
		this.eventHistory = [...this.eventHistory, `${new SvelteDate().toISOString()}: ${event.name}`];

		// Apply the effect
		event.effect();

		// Schedule cleanup
		setTimeout(() => {
			this.removeEvent(event);
		}, event.duration);
	}

	private removeEvent(event: FrictionEvent): void {
		this.activeEvents = this.activeEvents.filter((e) => e.id !== event.id);
		event.cleanup?.();
	}

	getActiveEvents(): FrictionEvent[] {
		return this.activeEvents;
	}

	getEventHistory(): string[] {
		return this.eventHistory;
	}

	clearAllEvents(): void {
		this.activeEvents.forEach((event) => event.cleanup?.());
		this.activeEvents = [];
	}

	// Individual friction effect implementations
	private applyTextGlitch(): void {
		const style = document.createElement('style');
		style.id = 'friction-text-glitch';
		style.textContent = `
			@keyframes glitch {
				0%, 100% { text-shadow: 2px 2px 0 #ff00ff, -2px -2px 0 #00ffff; }
				25% { text-shadow: -2px 2px 0 #ff00ff, 2px -2px 0 #00ffff; }
				50% { text-shadow: 2px -2px 0 #ff00ff, -2px 2px 0 #00ffff; }
				75% { text-shadow: -2px -2px 0 #ff00ff, 2px 2px 0 #00ffff; }
			}
			.friction-glitch {
				animation: glitch 0.3s infinite;
				color: #ff00ff !important;
			}
		`;
		document.head.appendChild(style);

		// Apply to random text elements
		document.querySelectorAll('h1, h2, h3, p, span').forEach((el) => {
			if (Math.random() > 0.7) {
				el.classList.add('friction-glitch');
			}
		});
	}

	private removeTextGlitch(): void {
		const style = document.getElementById('friction-text-glitch');
		if (style) style.remove();
		document.querySelectorAll('.friction-glitch').forEach((el) => {
			el.classList.remove('friction-glitch');
		});
	}

	private swapButtonPositions(): void {
		const buttons = Array.from(document.querySelectorAll('button'));
		if (buttons.length < 2) return;

		// Store original positions
		const originalPositions = buttons.map((btn) => ({
			element: btn,
			parent: btn.parentElement,
			nextSibling: btn.nextSibling
		})) as Array<{ element: Element; parent: Element | null; nextSibling: ChildNode | null }>;

		// Swap random pairs
		for (let i = 0; i < buttons.length - 1; i += 2) {
			const btn1 = buttons[i];
			const btn2 = buttons[i + 1];
			const parent1 = btn1.parentElement;
			const parent2 = btn2.parentElement;

			if (parent1 && parent2) {
				const temp = document.createElement('div');
				parent1.insertBefore(temp, btn1);
				parent2.insertBefore(btn1, btn2);
				parent1.insertBefore(btn2, temp);
				temp.remove();
			}
		}

		// Store for cleanup
		(
			this as {
				originalButtonPositions?: Array<{
					element: Element;
					parent: Element | null;
					nextSibling: ChildNode | null;
				}>;
			}
		).originalButtonPositions = originalPositions;
	}

	private restoreButtonPositions(): void {
		const originalPositions = (
			this as {
				originalButtonPositions?: Array<{
					element: Element;
					parent: Element | null;
					nextSibling: ChildNode | null;
				}>;
			}
		).originalButtonPositions;
		if (!originalPositions) return;

		originalPositions.forEach(
			({
				element,
				parent,
				nextSibling
			}: {
				element: Element;
				parent: Element | null;
				nextSibling: ChildNode | null;
			}) => {
				if (parent && nextSibling) {
					parent.insertBefore(element, nextSibling);
				} else if (parent) {
					parent.appendChild(element);
				}
			}
		);

		delete (
			this as {
				originalButtonPositions?: Array<{
					element: Element;
					parent: Element | null;
					nextSibling: ChildNode | null;
				}>;
			}
		).originalButtonPositions;
	}

	private invertColors(): void {
		const style = document.createElement('style');
		style.id = 'friction-color-invert';
		style.textContent = `
			* {
				filter: invert(1) hue-rotate(180deg) !important;
			}
		`;
		document.head.appendChild(style);
	}

	private restoreColors(): void {
		const style = document.getElementById('friction-color-invert');
		if (style) style.remove();
	}

	private hideCursor(): void {
		const style = document.createElement('style');
		style.id = 'friction-cursor-hide';
		style.textContent = `
			button, a, input, textarea, select {
				cursor: none !important;
			}
		`;
		document.head.appendChild(style);
	}

	private showCursor(): void {
		const style = document.getElementById('friction-cursor-hide');
		if (style) style.remove();
	}

	private chaosFonts(): void {
		const style = document.createElement('style');
		style.id = 'friction-font-chaos';
		style.textContent = `
			* {
				font-family: ${this.getRandomFonts()} !important;
				font-size: ${Math.random() * 20 + 12}px !important;
				font-weight: ${Math.random() > 0.5 ? 'bold' : 'normal'} !important;
				font-style: ${Math.random() > 0.7 ? 'italic' : 'normal'} !important;
			}
		`;
		document.head.appendChild(style);
	}

	private restoreFonts(): void {
		const style = document.getElementById('friction-font-chaos');
		if (style) style.remove();
	}

	private slowAnimations(): void {
		const style = document.createElement('style');
		style.id = 'friction-slow-motion';
		style.textContent = `
			*, *::before, *::after {
				animation-duration: 10s !important;
				transition-duration: 2s !important;
			}
		`;
		document.head.appendChild(style);
	}

	private normalAnimations(): void {
		const style = document.getElementById('friction-slow-motion');
		if (style) style.remove();
	}

	private shuffleWords(): void {
		const textElements = document.querySelectorAll('p, h1, h2, h3, span, div');
		(this as { originalTextContent?: Map<Element, string> }).originalTextContent = new SvelteMap();

		textElements.forEach((el) => {
			if (Math.random() > 0.6) {
				const text = el.textContent || '';
				(this as { originalTextContent?: Map<Element, string> }).originalTextContent?.set(el, text);
				const words = text.split(' ');
				for (let i = words.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[words[i], words[j]] = [words[j], words[i]];
				}
				el.textContent = words.join(' ');
			}
		});
	}

	private restoreWords(): void {
		const originalTextContent = (this as { originalTextContent?: Map<Element, string> })
			.originalTextContent;
		if (!originalTextContent) return;

		originalTextContent.forEach((text: string, el: Element) => {
			if (el) {
				el.textContent = text;
			}
		});

		delete (this as { originalTextContent?: Map<Element, string> }).originalTextContent;
	}

	private getRandomFonts(): string {
		const fonts = [
			'Comic Sans MS',
			'Impact',
			'Courier New',
			'Georgia',
			'Verdana',
			'Arial Black',
			'Times New Roman',
			'Trebuchet MS'
		];
		return fonts[Math.floor(Math.random() * fonts.length)];
	}

	get isActive(): boolean {
		return this.activeEvents.length > 0;
	}

	get currentSeverity(): 'mild' | 'moderate' | 'severe' | null {
		if (this.activeEvents.length === 0) return null;

		const hasSevere = this.activeEvents.some((e) => e.severity === 'severe');
		if (hasSevere) return 'severe';

		const hasModerate = this.activeEvents.some((e) => e.severity === 'moderate');
		if (hasModerate) return 'moderate';

		return 'mild';
	}
}

export const frictionSystem = new FrictionSystem();

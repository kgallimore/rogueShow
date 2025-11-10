export type TextColors = 'green' | 'red' | 'yellow' | 'blue' | 'white' | 'gray';
export class TextSystem {
	private _shownText: { text: string; color?: TextColors }[] = $state([
		{ text: '', color: 'green' }
	]);
	private _targetTexts: {
		text: string;
		options: {
			speed: { base: number; random: number; concurrency: number };
			color?: TextColors;
			append?: boolean;
		};
		// optional resolver to notify when this text has finished displaying
		_resolve?: () => void;
	}[] = [];
	private _characterPosition = 0;
	private _isAnimating = false;
	public blinkCursor = $state(false);

	public addText(
		value: string,
		options: {
			speed?: { base: number; random: number; concurrency: number };
			color?: TextColors;
			append?: boolean;
		} = { speed: { base: 30, random: 100, concurrency: 1 }, append: false, color: 'green' }
	): Promise<void> {
		// Set default speed if not provided
		if (!options.speed) {
			options.speed = { base: 30, random: 100, concurrency: 1 };
		}

		// Build a final options object with a required speed property for type safety
		const finalOptions: {
			speed: { base: number; random: number; concurrency: number };
			color?: TextColors;
			append?: boolean;
		} = {
			speed: options.speed,
			color: options.color,
			append: options.append
		};

		// Return a promise that resolves when this specific text has finished displaying
		return new Promise((resolve) => {
			this._targetTexts.push({ text: value, options: finalOptions, _resolve: resolve });
			if (!this._isAnimating) {
				this.syncText();
			}
		});
	}

	public get text(): { text: string; color?: TextColors }[] {
		return this._shownText;
	}

	public clear() {
		this._shownText = [{ text: '', color: 'green' }];
		this._targetTexts = [];
	}

	private syncText() {
		// Check if we have texts to process
		if (this._targetTexts.length === 0) {
			this.blinkCursor = true;
			this._isAnimating = false;
			return;
		}

		this._isAnimating = true;
		this.blinkCursor = false;

		// If we're starting a new text (position is 0), decide whether to create a new line
		if (this._characterPosition === 0) {
			const currentText = this._targetTexts[0];
			const lastLine = this._shownText[this._shownText.length - 1];

			// Create a new line if:
			// 1. append is false (or undefined) AND
			// 2. the last line already has content
			if (!currentText.options?.append && lastLine.text !== '') {
				this._shownText.push({ text: '', color: currentText.options?.color });
			}
			// If appending, update the color of the current line if a new color is specified
			else if (currentText.options?.append && currentText.options?.color) {
				lastLine.color = currentText.options.color;
			}
		}

		// Check if current text is complete
		if (this._characterPosition >= this._targetTexts[0].text.length) {
			const finished = this._targetTexts.shift();
			// resolve promise for this finished item if present
			if (finished && typeof finished._resolve === 'function') {
				finished._resolve();
			}
			this._characterPosition = 0;

			// Recursively call to process next text (or stop if queue is empty)
			this.syncText();
			return;
		}

		// Add next character
		this._shownText[this._shownText.length - 1].text += this._targetTexts[0].text.slice(
			this._characterPosition,
			this._characterPosition + this._targetTexts[0].options.speed.concurrency
		);
		this._characterPosition += this._targetTexts[0].options.speed.concurrency;

		setTimeout(
			() => {
				this.syncText();
			},
			this._targetTexts[0].options.speed.base +
				Math.random() * this._targetTexts[0].options.speed.random
		);
	}
}

import { getPocketBase, subscribeToCollection } from '$lib/pocketbase/client.svelte';
import type { ShowMode } from '$lib/stores/showStore.svelte';
import { frictionSystem } from '$lib/components/FrictionSystem.svelte';
import type {
	ShowsResponse,
	ReesesProductsResponse,
	GameStateResponse,
	TypedPocketBase
} from '$lib/pocketbase/types';
import { SvelteDate } from 'svelte/reactivity';

export type ShowStage = 'setup' | 'predict' | 'reveal' | 'friction';

export class ShowController {
	private pb: TypedPocketBase | null = null;
	private frictionInterval: ReturnType<typeof setInterval> | null = null;
	gameState = $state<GameStateResponse | null>(null);
	currentShow = $state<ShowsResponse | null>(null);
	products = $state<ReesesProductsResponse[]>([]);

	// Show flow state
	stage = $state<ShowStage>('setup');
	mode = $state<ShowMode>('tierlist');
	interactionEnabled = $state(false);
	frictionEnabled = $state(false);

	constructor() {
		this.initialize();
	}

	private async initialize() {
		this.pb = getPocketBase();

		if (!this.pb.authStore.isValid) {
			return;
		}

		try {
			// Load initial data
			const [gs, shows, products] = await Promise.all([
				this.pb.collection('gameState').getFirstListItem<GameStateResponse>(''),
				this.pb.collection('shows').getFullList<ShowsResponse>({
					filter: 'isActive = true',
					expand: 'hostId'
				}),
				this.pb.collection('reesesProducts').getFullList<ReesesProductsResponse>({
					sort: 'order'
				})
			]);

			this.gameState = gs;
			this.products = products;
			this.currentShow = shows[0] || null;

			if (this.currentShow) {
				this.mode = this.currentShow.mode as ShowMode;
				this.stage = this.determineStageFromMode();
			}

			this.interactionEnabled = gs.interactionEnabled || false;
			this.frictionEnabled = gs.frictionEnabled || false;

			// Subscribe to changes
			this.subscribeToChanges();
		} catch (error) {
			console.error('Failed to initialize show controller:', error);
		}
	}

	private subscribeToChanges() {
		if (!this.pb) return;

		// Subscribe to game state changes
		subscribeToCollection<GameStateResponse>('gameState', '*', ({ record }) => {
			this.gameState = record;
			this.interactionEnabled = record.interactionEnabled || false;
			this.frictionEnabled = record.frictionEnabled || false;
		});

		// Subscribe to show changes
		subscribeToCollection<ShowsResponse>('shows', '*', ({ record }) => {
			if (record.isActive) {
				this.currentShow = record;
				this.mode = record.mode as ShowMode;
				this.stage = this.determineStageFromMode();
			}
		});
	}

	private determineStageFromMode(): ShowStage {
		switch (this.mode) {
			case 'tierlist':
				return this.interactionEnabled ? 'predict' : 'setup';
			case 'rogue':
				return 'predict'; // Rogue mode is always in predict stage
			case 'interstitial':
				return 'predict'; // Mini-games are always interactive
			default:
				return 'setup';
		}
	}

	async createNewShow(productSequence: string[]): Promise<ShowsResponse> {
		if (!this.pb || !this.pb.authStore.record) {
			throw new Error('Not authenticated');
		}

		// End any existing active shows
		if (this.currentShow) {
			await this.endCurrentShow();
		}

		const show = await this.pb.collection('shows').create<ShowsResponse>({
			hostId: this.pb.authStore.record.id,
			mode: 'tierlist',
			rogueStage: 0,
			sequence: productSequence,
			eventsLog: [
				{
					type: 'show_created',
					timestamp: new SvelteDate().toISOString()
				}
			],
			isActive: true
		});

		// Update game state to reference this show
		await this.pb.collection('gameState').update(this.gameState!.id, {
			currentShowId: show.id,
			currentMode: 'tierlist'
		});

		this.currentShow = show;
		this.mode = 'tierlist';
		this.stage = 'setup';

		return show;
	}

	async advanceStage(): Promise<void> {
		console.log('Advancing stage:', this.stage);
		console.log('Current show:', this.currentShow);
		if (!this.pb || !this.currentShow) return;

		switch (this.stage) {
			case 'setup':
				await this.startPredictStage();
				break;
			case 'predict':
				await this.startRevealStage();
				break;
			case 'reveal':
				await this.nextProduct();
				break;
		}
	}

	private async startPredictStage(): Promise<void> {
		if (!this.pb || !this.currentShow) return;

		// If we're at the starting position (no current product), set the first product
		if (!this.currentShow.currentProductId) {
			const sequence = (this.currentShow.sequence as string[]) || [];
			if (sequence.length > 0) {
				const firstProductId = sequence[0];

				await this.pb.collection('shows').update(this.currentShow.id, {
					currentProductId: firstProductId,
					eventsLog: [
						...((this.currentShow.eventsLog as Array<{ type: string; timestamp: string }>) || []),
						{
							type: 'product_started',
							productId: firstProductId,
							timestamp: new SvelteDate().toISOString()
						}
					]
				});

				this.currentShow.currentProductId = firstProductId;
			}
		}

		await this.pb.collection('gameState').update(this.gameState!.id, {
			interactionEnabled: true
		});

		this.stage = 'predict';
		this.interactionEnabled = true;
	}

	private async startRevealStage(): Promise<void> {
		if (!this.pb || !this.currentShow) return;

		await this.pb.collection('gameState').update(this.gameState!.id, {
			interactionEnabled: false
		});

		this.stage = 'reveal';
		this.interactionEnabled = false;
	}

	private async nextProduct(): Promise<void> {
		if (!this.pb || !this.currentShow) return;

		const sequence = (this.currentShow.sequence as string[]) || [];
		let currentIndex = -1; // Start with -1 to indicate no current product

		if (this.currentShow.currentProductId) {
			currentIndex = sequence.indexOf(this.currentShow.currentProductId);
		} else if (
			this.gameState?.currentProductNum !== undefined &&
			this.gameState.currentProductNum > 0
		) {
			// Fallback to gameState if currentProductId is not set
			currentIndex = this.gameState.currentProductNum - 1;
		}

		const nextIndex = currentIndex + 1;

		if (nextIndex >= sequence.length || nextIndex < 0) {
			// End of show or invalid state, transition to rogue mode
			await this.transitionToRogueMode();
			return;
		}

		const nextProductId = sequence[nextIndex];

		// Calculate progress and enable friction based on how far along we are
		const progress = (nextIndex + 1) / sequence.length;
		await this.updateFrictionBasedOnProgress(progress);

		await this.pb.collection('shows').update(this.currentShow.id, {
			currentProductId: nextProductId,
			eventsLog: [
				...((this.currentShow.eventsLog as Array<{ type: string; timestamp: string }>) || []),
				{
					type: 'product_advanced',
					productId: nextProductId,
					timestamp: new SvelteDate().toISOString()
				}
			]
		});

		// Immediately enable voting for the next product
		await this.pb.collection('gameState').update(this.gameState!.id, {
			interactionEnabled: true
		});

		this.currentShow.currentProductId = nextProductId;
		this.stage = 'predict';
		this.interactionEnabled = true;
	}

	private async updateFrictionBasedOnProgress(progress: number): Promise<void> {
		if (!this.pb || !this.gameState) return;

		// Enable friction automatically based on progress:
		// 0-25%: No friction
		// 25-50%: 30% chance
		// 50-75%: 60% chance
		// 75-100%: 90% chance
		let shouldEnable = false;

		if (progress >= 0.75) {
			shouldEnable = Math.random() > 0.1; // 90% chance
		} else if (progress >= 0.5) {
			shouldEnable = Math.random() > 0.4; // 60% chance
		} else if (progress >= 0.25) {
			shouldEnable = Math.random() > 0.7; // 30% chance
		}

		if (shouldEnable && !this.frictionEnabled) {
			await this.toggleFriction();
		}
	}

	async transitionToRogueMode(): Promise<void> {
		if (!this.pb || !this.currentShow) return;

		await this.pb.collection('shows').update(this.currentShow.id, {
			mode: 'rogue',
			rogueStage: 1,
			eventsLog: [
				...((this.currentShow.eventsLog as Array<{ type: string; timestamp: string }>) || []),
				{
					type: 'rogue_mode_activated',
					timestamp: new SvelteDate().toISOString()
				}
			]
		});

		await this.pb.collection('gameState').update(this.gameState!.id, {
			currentMode: 'rogue',
			interactionEnabled: true
		});

		this.mode = 'rogue';
		this.stage = 'predict';
		this.interactionEnabled = true;
	}

	async advanceRogueStage(): Promise<void> {
		if (!this.pb || !this.currentShow || this.mode !== 'rogue') return;

		const currentStage = this.currentShow.rogueStage || 1;
		const nextStage = Math.min(currentStage + 1, 3);

		await this.pb.collection('shows').update(this.currentShow.id, {
			rogueStage: nextStage,
			eventsLog: [
				...((this.currentShow.eventsLog as Array<{ type: string; timestamp: string }>) || []),
				{
					type: 'rogue_stage_advanced',
					stage: nextStage,
					timestamp: new SvelteDate().toISOString()
				}
			]
		});

		// Start interstitial mini-game between stages
		if (nextStage < 3) {
			await this.startInterstitialMinigame();
		}
	}

	async startInterstitialMinigame(): Promise<void> {
		if (!this.pb || !this.currentShow) return;

		// Create a new mini-game
		const minigame = await this.pb.collection('minigames').create({
			showId: this.currentShow.id,
			round: 1,
			quirkSpec: 'Avoid using the letter "e"',
			type: 'text',
			status: 'active'
		});

		await this.pb.collection('shows').update(this.currentShow.id, {
			mode: 'interstitial',
			eventsLog: [
				...((this.currentShow.eventsLog as Array<{ type: string; timestamp: string }>) || []),
				{
					type: 'minigame_started',
					minigameId: minigame.id,
					timestamp: new SvelteDate().toISOString()
				}
			]
		});

		await this.pb.collection('gameState').update(this.gameState!.id, {
			currentMode: 'interstitial'
		});

		this.mode = 'interstitial';
		this.stage = 'predict';
	}

	async endInterstitialMinigame(): Promise<void> {
		if (!this.pb || !this.currentShow) return;

		// Return to rogue mode
		await this.pb.collection('shows').update(this.currentShow.id, {
			mode: 'rogue',
			eventsLog: [
				...((this.currentShow.eventsLog as Array<{ type: string; timestamp: string }>) || []),
				{
					type: 'minigame_ended',
					timestamp: new SvelteDate().toISOString()
				}
			]
		});

		await this.pb.collection('gameState').update(this.gameState!.id, {
			currentMode: 'rogue'
		});

		this.mode = 'rogue';
		this.stage = 'predict';
	}

	async toggleFriction(): Promise<void> {
		if (!this.pb || !this.gameState) return;

		const newState = !this.frictionEnabled;

		await this.pb.collection('gameState').update(this.gameState.id, {
			frictionEnabled: newState
		});

		this.frictionEnabled = newState;

		// Start or stop friction events
		if (newState) {
			this.startFrictionEvents();
		} else {
			this.stopFrictionEvents();
		}
	}

	private startFrictionEvents(): void {
		// Trigger random friction events periodically
		this.frictionInterval = setInterval(() => {
			if (this.frictionEnabled && Math.random() > 0.6) {
				frictionSystem.triggerRandomEvent();
			}
		}, 8000); // Every 8 seconds

		// Trigger one immediately
		setTimeout(() => {
			if (this.frictionEnabled) {
				frictionSystem.triggerRandomEvent();
			}
		}, 1000);
	}

	private stopFrictionEvents(): void {
		if (this.frictionInterval) {
			clearInterval(this.frictionInterval);
			this.frictionInterval = null;
		}
		frictionSystem.clearAllEvents();
	}

	private async endCurrentShow(): Promise<void> {
		if (!this.pb || !this.currentShow) return;

		await this.pb.collection('shows').update(this.currentShow.id, {
			isActive: false,
			eventsLog: [
				...((this.currentShow.eventsLog as Array<{ type: string; timestamp: string }>) || []),
				{
					type: 'show_ended',
					timestamp: new SvelteDate().toISOString()
				}
			]
		});
	}

	get getCurrentProduct(): ReesesProductsResponse | null {
		if (!this.currentShow?.currentProductId || !this.products.length) {
			return null;
		}

		return this.products.find((p) => p.id === this.currentShow!.currentProductId) || null;
	}

	get canAdvance(): boolean {
		if (this.mode === 'tierlist') {
			return this.stage !== 'reveal';
		}
		return this.mode === 'interstitial';
	}

	get stageTitle(): string {
		switch (this.stage) {
			case 'setup':
				return 'Setup Phase';
			case 'predict':
				return this.mode === 'interstitial' ? 'Mini-Game Active' : 'Prediction Phase';
			case 'reveal':
				return 'Reveal Phase';
			case 'friction':
				return 'Friction Event';
			default:
				return 'Unknown Stage';
		}
	}
}

import { getPocketBase } from '$lib/pocketbase/client.svelte';
import type {
	ShowsResponse,
	ReesesProductsResponse,
	PredictionsResponse,
	PlacementsResponse,
	MinigamesResponse,
	UsersResponse,
	TypedPocketBase
} from '$lib/pocketbase/types';

export type ShowMode = 'tierlist' | 'rogue' | 'interstitial';
export type RogueStage = 0 | 1 | 2 | 3;

export interface ShowState {
	show: ShowsResponse | null;
	currentProduct: ReesesProductsResponse | null;
	predictions: PredictionsResponse[];
	placements: PlacementsResponse[];
	activeMinigame: MinigamesResponse | null;
	connectedUsers: UsersResponse[];
	mode: ShowMode;
	rogueStage: RogueStage;
	interactionEnabled: boolean;
	frictionEnabled: boolean;
}

class ShowStore {
	private pb: TypedPocketBase | null = null;
	private showId: string | null = null;

	show = $state<ShowsResponse | null>(null);
	currentProduct = $state<ReesesProductsResponse | null>(null);
	predictions = $state<PredictionsResponse[]>([]);
	placements = $state<PlacementsResponse[]>([]);
	activeMinigame = $state<MinigamesResponse | null>(null);
	connectedUsers = $state<UsersResponse[]>([]);
	mode = $state<ShowMode>('tierlist');
	rogueStage = $state<RogueStage>(0);
	interactionEnabled = $state<boolean>(true);
	frictionEnabled = $state<boolean>(false);

	constructor() {
		// Note: getPocketBase() should be called only in browser context
		// This will be initialized when needed in browser-specific methods
	}

	async initializeShow(hostId: string, productSequence: string[]): Promise<ShowsResponse> {
		// Initialize PocketBase only in browser context
		if (!this.pb) {
			this.pb = getPocketBase();
		}
		
		if (!this.pb) throw new Error('PocketBase not initialized');

		const show = await this.pb.collection('shows').create<ShowsResponse>({
			hostId,
			mode: 'tierlist',
			rogueStage: 0,
			sequence: productSequence,
			eventsLog: [],
			isActive: true
		});

		this.showId = show.id;
		this.show = show;
		this.mode = show.mode as ShowMode;
		this.rogueStage = show.rogueStage as RogueStage;

		return show;
	}

	async loadShow(showId: string): Promise<void> {
		if (!this.pb) throw new Error('PocketBase not initialized');

		this.showId = showId;

		const [show, predictions, placements, minigames] = await Promise.all([
			this.pb.collection('shows').getOne<ShowsResponse>(showId),
			this.pb.collection('predictions').getFullList<PredictionsResponse>({
				filter: `showId = "${showId}"`
			}),
			this.pb.collection('placements').getFullList<PlacementsResponse>({
				filter: `showId = "${showId}"`
			}),
			this.pb.collection('minigames').getFullList<MinigamesResponse>({
				filter: `showId = "${showId}" && status = "active"`
			})
		]);

		this.show = show;
		this.predictions = predictions;
		this.placements = placements;
		this.activeMinigame = minigames[0] || null;
		this.mode = show.mode as ShowMode;
		this.rogueStage = show.rogueStage as RogueStage;

		if (show.currentProductId) {
			this.currentProduct = await this.pb
				.collection('reesesProducts')
				.getOne<ReesesProductsResponse>(show.currentProductId);
		}
	}

	async advanceToNextProduct(): Promise<void> {
		if (!this.pb || !this.showId || !this.show) return;

		const sequence = this.show.sequence as string[];
		const currentIndex = sequence.indexOf(this.currentProduct?.id || '');
		const nextIndex = currentIndex + 1;

		if (nextIndex >= sequence.length) {
			await this.endShow();
			return;
		}

		const nextProductId = sequence[nextIndex];
		const nextProduct = await this.pb
			.collection('reesesProducts')
			.getOne<ReesesProductsResponse>(nextProductId);

		await this.pb.collection('shows').update(this.showId, {
			currentProductId: nextProductId,
			eventsLog: [
				...this.show.eventsLog,
				{
					type: 'product_advanced',
					productId: nextProductId,
					timestamp: new Date().toISOString()
				}
			]
		});

		this.currentProduct = nextProduct;
	}

	async revealProductTier(productId: string, tierId: string): Promise<void> {
		if (!this.pb || !this.showId) return;

		const placement = await this.pb.collection('placements').create<PlacementsResponse>({
			showId: this.showId,
			productId,
			finalTier: tierId
		});

		this.placements = [...this.placements, placement];
	}

	async submitPrediction(userId: string, productId: string, tierId: string): Promise<void> {
		if (!this.pb || !this.showId) return;

		const existing = this.predictions.find((p) => p.userId === userId && p.productId === productId);

		if (existing) {
			await this.pb.collection('predictions').update(existing.id, { predictedTier: tierId });
		} else {
			const prediction = await this.pb.collection('predictions').create<PredictionsResponse>({
				showId: this.showId,
				userId,
				productId,
				predictedTier: tierId
			});
			this.predictions = [...this.predictions, prediction];
		}
	}

	async transitionToRogueMode(): Promise<void> {
		if (!this.pb || !this.showId) return;

		await this.pb.collection('shows').update(this.showId, {
			mode: 'rogue',
			rogueStage: 1,
			eventsLog: [
				...((this.show?.eventsLog as Array<{ type: string; timestamp: string }>) || []),
				{
					type: 'rogue_mode_activated',
					timestamp: new Date().toISOString()
				}
			]
		});

		this.mode = 'rogue';
		this.rogueStage = 1;
	}

	async advanceRogueStage(): Promise<void> {
		if (!this.pb || !this.showId || this.rogueStage >= 3) return;

		const nextStage = (this.rogueStage + 1) as RogueStage;

		await this.pb.collection('shows').update(this.showId, {
			rogueStage: nextStage,
			eventsLog: [
				...(this.show?.eventsLog || []),
				{
					type: 'rogue_stage_advanced',
					stage: nextStage,
					timestamp: new Date().toISOString()
				}
			]
		});

		this.rogueStage = nextStage;
	}

	async startInterstitialMinigame(
		quirkSpec: string,
		type: 'text' | 'image' | 'mixed'
	): Promise<MinigamesResponse> {
		if (!this.pb || !this.showId) throw new Error('Show not initialized');

		const round = (this.activeMinigame?.round || 0) + 1;

		const minigame = await this.pb.collection('minigames').create<MinigamesResponse>({
			showId: this.showId,
			round,
			quirkSpec,
			type,
			status: 'active'
		});

		await this.pb.collection('shows').update(this.showId, {
			mode: 'interstitial',
			eventsLog: [
				...(this.show?.eventsLog || []),
				{
					type: 'minigame_started',
					minigameId: minigame.id,
					timestamp: new Date().toISOString()
				}
			]
		});

		this.activeMinigame = minigame;
		this.mode = 'interstitial';

		return minigame;
	}

	async submitMinigameSubmission(userId: string, content: string): Promise<void> {
		if (!this.pb || !this.activeMinigame) return;

		await this.pb.collection('minigame_submissions').create({
			minigameId: this.activeMinigame.id,
			userId,
			content
		});
	}

	async submitMinigameGuess(userId: string, guess: string): Promise<void> {
		if (!this.pb || !this.activeMinigame) return;

		await this.pb.collection('minigame_guesses').create({
			minigameId: this.activeMinigame.id,
			userId,
			guess
		});
	}

	async toggleFriction(): Promise<void> {
		if (!this.pb || !this.showId) return;

		const newState = !this.frictionEnabled;

		await this.pb.collection('shows').update(this.showId, {
			frictionEnabled: newState
		});

		this.frictionEnabled = newState;
	}

	async setInteractionEnabled(enabled: boolean): Promise<void> {
		if (!this.pb || !this.showId) return;

		await this.pb.collection('shows').update(this.showId, {
			interactionEnabled: enabled
		});

		this.interactionEnabled = enabled;
	}

	private async endShow(): Promise<void> {
		if (!this.pb || !this.showId) return;

		await this.pb.collection('shows').update(this.showId, {
			isActive: false,
			eventsLog: [
				...(this.show?.eventsLog || []),
				{
					type: 'show_ended',
					timestamp: new Date().toISOString()
				}
			]
		});
	}

	get getState(): ShowState {
		return {
			show: this.show,
			currentProduct: this.currentProduct,
			predictions: this.predictions,
			placements: this.placements,
			activeMinigame: this.activeMinigame,
			connectedUsers: this.connectedUsers,
			mode: this.mode,
			rogueStage: this.rogueStage,
			interactionEnabled: this.interactionEnabled,
			frictionEnabled: this.frictionEnabled
		};
	}
}

export const showStore = new ShowStore();

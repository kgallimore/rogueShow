export type TierLetter = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export type Product = {
	id: string;
	name: string;
	imageUrl: string | null;
	tier: TierLetter | null; // null means not yet revealed
	bucket?: string[]; // Array of variant image URLs (only primary shown on board)
};

export type GameMode = 'tierlist' | 'rogue' | 'interstitial';

export type GameState = {
	mode: GameMode;
	currentProductIndex: number;
	products: Product[];
	votes: Record<string, Record<string, TierLetter>>; // productId -> username -> tier
	placed: Record<TierLetter, Product[]>;
	frictionEvents: FrictionEvent[];
	votingEnabled: boolean; // Whether audience can currently vote
	currentProductRevealed: boolean; // Whether current product's tier has been revealed
};

export type FrictionEvent = {
	id: string;
	type: 'glitch' | 'delay' | 'freeze' | 'shake' | 'color-invert';
	duration: number;
	message?: string;
};

// WebSocket message types
export type GameClientMessage =
	| { type: 'join'; role: 'host' | 'audience'; username: string }
	| { type: 'host:selectProducts'; products: Product[] }
	| { type: 'host:revealTier'; productId: string; tier: TierLetter; reasonings?: string[] }
	| { type: 'host:advanceProduct' }
	| { type: 'host:triggerFriction'; event: FrictionEvent }
	| { type: 'audience:vote'; productId: string; tier: TierLetter }
	| { type: 'audience:changeVote'; productId: string; tier: TierLetter };

export type GameServerMessage =
	| { type: 'state'; state: GameState }
	| { type: 'error'; message: string }
	| { type: 'friction'; event: FrictionEvent }
	| { type: 'voteUpdate'; productId: string; votes: Record<string, TierLetter> }
	| { type: 'productRevealed'; product: Product; reasonings?: string[] }
	| { type: 'productAdvanced'; product: Product | null };

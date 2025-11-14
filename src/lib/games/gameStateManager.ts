import type {
	GameState,
	Product,
	TierLetter,
	GameClientMessage,
	GameServerMessage,
	FrictionEvent
} from '$lib/games/types';
import type WebSocket from 'ws';

type Client = {
	ws: WebSocket;
	role: 'host' | 'audience';
	username: string;
};

export class GameStateManager {
	private state: GameState;
	public clients: Set<Client> = new Set();
	private host: Client | null = null;

	constructor() {
		this.state = {
			mode: 'tierlist',
			currentProductIndex: 0,
			products: [],
			votes: {},
			placed: {
				S: [],
				A: [],
				B: [],
				C: [],
				D: [],
				F: []
			},
			frictionEvents: [],
			votingEnabled: false,
			currentProductRevealed: false
		};
	}

	addClient(ws: WebSocket, role: 'host' | 'audience', username: string) {
		const client: Client = { ws, role, username };
		this.clients.add(client);

		if (role === 'host') {
			// Only one host allowed
			if (this.host) {
				this.sendToClient(client, { type: 'error', message: 'Host already exists' });
				ws.close();
				return;
			}
			this.host = client;
		}

		// Send current state to new client
		this.sendToClient(client, { type: 'state', state: this.getState() });
	}

	removeClient(ws: WebSocket) {
		for (const client of this.clients) {
			if (client.ws === ws) {
				this.clients.delete(client);
				if (client === this.host) {
					this.host = null;
				}
				break;
			}
		}
	}

	handleMessage(ws: WebSocket, message: GameClientMessage) {
		const client = this.findClient(ws);
		if (!client) {
			this.sendError(ws, 'Client not found');
			return;
		}

		switch (message.type) {
			case 'host:selectProducts':
				if (client.role !== 'host') {
					this.sendError(ws, 'Only host can select products');
					return;
				}
				this.state.products = message.products;
				this.state.currentProductIndex = 0;
				this.state.votes = {};
				// Automatically enable voting for the first product
				this.state.votingEnabled = true;
				this.state.currentProductRevealed = false;
				this.broadcast({ type: 'state', state: this.getState() });
				break;

			case 'host:revealTier':
				if (client.role !== 'host') {
					this.sendError(ws, 'Only host can reveal tiers');
					return;
				}
				this.revealTier(message.productId, message.tier, message.reasonings);
				break;

			case 'host:advanceProduct':
				if (client.role !== 'host') {
					this.sendError(ws, 'Only host can advance products');
					return;
				}
				this.advanceProduct();
				break;

			case 'host:triggerFriction':
				if (client.role !== 'host') {
					this.sendError(ws, 'Only host can trigger friction');
					return;
				}
				this.triggerFriction(message.event);
				break;

			case 'audience:vote':
			case 'audience:changeVote':
				if (client.role !== 'audience') {
					this.sendError(ws, 'Only audience can vote');
					return;
				}
				if (!this.state.votingEnabled) {
					this.sendError(ws, 'Voting is currently disabled');
					return;
				}
				this.handleVote(client.username, message.productId, message.tier);
				break;

			default:
				this.sendError(ws, `Unknown message type: ${message.type}`);
		}
	}

	private revealTier(productId: string, tier: TierLetter, reasonings?: string[]) {
		const product = this.state.products.find((p) => p.id === productId);
		if (!product) {
			return;
		}

		product.tier = tier;
		// Only add if not already present (prevent duplicates)
		if (!this.state.placed[tier].some((p) => p.id === product.id)) {
			this.state.placed[tier] = [...this.state.placed[tier], product];
		}

		// Disable voting and mark as revealed
		this.state.votingEnabled = false;
		this.state.currentProductRevealed = true;

		this.broadcast({ type: 'productRevealed', product, reasonings });
		this.broadcast({ type: 'state', state: this.getState() });
	}

	private advanceProduct() {
		this.state.currentProductIndex++;
		// Automatically enable voting when advancing to a new product
		this.state.votingEnabled = true;
		this.state.currentProductRevealed = false;
		const nextProduct = this.getCurrentProduct();
		this.broadcast({ type: 'productAdvanced', product: nextProduct });
		this.broadcast({ type: 'state', state: this.getState() });
	}

	private handleVote(username: string, productId: string, tier: TierLetter) {
		if (!this.state.votes[productId]) {
			this.state.votes[productId] = {};
		}
		this.state.votes[productId][username] = tier;

		// Check for chance-based friction event
		this.maybeTriggerFriction();

		// Broadcast vote update and full state
		this.broadcast({
			type: 'voteUpdate',
			productId,
			votes: { ...this.state.votes[productId] }
		});
		// Also broadcast full state so clients stay in sync
		this.broadcast({ type: 'state', state: this.getState() });
	}

	private maybeTriggerFriction() {
		// Calculate progress: how many products have been revealed
		const progress = this.state.currentProductIndex / Math.max(this.state.products.length, 1);
		// Base chance starts at 5%, increases to 30% by the end
		const baseChance = 0.05;
		const maxChance = 0.3;
		const chance = baseChance + (maxChance - baseChance) * progress;

		if (Math.random() < chance) {
			const types: FrictionEvent['type'][] = ['glitch', 'shake', 'freeze', 'color-invert'];
			const type = types[Math.floor(Math.random() * types.length)];
			const event: FrictionEvent = {
				id: `friction-${Date.now()}`,
				type,
				duration: 2000,
				message: type === 'glitch' ? 'System error detected...' : undefined
			};
			this.triggerFriction(event);
		}
	}

	private triggerFriction(event: FrictionEvent) {
		this.state.frictionEvents.push(event);
		this.broadcast({ type: 'friction', event });

		// Auto-remove friction event after duration
		setTimeout(() => {
			this.state.frictionEvents = this.state.frictionEvents.filter((e) => e.id !== event.id);
		}, event.duration);
	}

	getCurrentProduct(): Product | null {
		return this.state.products[this.state.currentProductIndex] || null;
	}

	getState(): GameState {
		return JSON.parse(JSON.stringify(this.state)); // Deep clone
	}

	private findClient(ws: WebSocket): Client | null {
		for (const client of this.clients) {
			if (client.ws === ws) {
				return client;
			}
		}
		return null;
	}

	private sendToClient(client: Client, message: GameServerMessage) {
		if (client.ws.readyState === 1) {
			// WebSocket.OPEN
			client.ws.send(JSON.stringify(message));
		}
	}

	private sendError(ws: WebSocket, message: string) {
		if (ws.readyState === 1) {
			ws.send(JSON.stringify({ type: 'error', message }));
		}
	}

	private broadcast(message: GameServerMessage) {
		for (const client of this.clients) {
			this.sendToClient(client, message);
		}
	}
}

// Singleton instance
let gameStateManager: GameStateManager | null = null;

export function getGameStateManager(): GameStateManager {
	if (!gameStateManager) {
		gameStateManager = new GameStateManager();
	}
	return gameStateManager;
}

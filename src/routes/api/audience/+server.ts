import { json } from '@sveltejs/kit';

declare global {
	// eslint-disable-next-line no-var
	var __gameStateManager:
		| {
				clients: Set<{ ws: { readyState: number }; role: 'host' | 'audience'; username: string }>;
		  }
		| undefined;
}

export const GET = async () => {
	try {
		const gameStateManager = global.__gameStateManager;
		if (!gameStateManager) {
			console.warn('Game state manager not initialized yet');
			return json({ usernames: [] });
		}
		const clients = Array.from(gameStateManager.clients);
		// Only show audience members (not host) with active connections
		const usernames = clients
			.filter((client) => client.role === 'audience' && client.ws.readyState === 1) // 1 = WebSocket.OPEN
			.map((client) => client.username);
		return json({ usernames });
	} catch (error) {
		console.error('Error getting audience list:', error);
		return json({ usernames: [] });
	}
};

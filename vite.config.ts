import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type ViteDevServer } from 'vite';
import { WebSocketServer } from 'ws';
import { setupWebSocketServer, getSharedGameStateManager } from './websocketServer/websocketServer';

let wss: WebSocketServer | null = null;
let isCreating = false; // Flag to prevent multiple simultaneous creation attempts
let retryCount = 0;
const MAX_RETRIES = 10;

declare global {
	var __gameStateManager: ReturnType<typeof getSharedGameStateManager> | undefined;
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson(),
		{
			name: 'vite-plugin-websocket',
			apply: 'serve',
			configureServer(server: ViteDevServer) {
				if (!server.httpServer) throw new Error('httpServer not available');

				const createWebSocketServer = () => {
					// Don't create if one is already being created
					if (isCreating) {
						console.log('WebSocket server creation already in progress...');
						return;
					}

					// Don't create if one already exists and is open
					if (wss) {
						console.log('WebSocket server already exists, skipping creation');
						return;
					}

					// Check retry limit
					if (retryCount >= MAX_RETRIES) {
						console.error(
							`Failed to create WebSocket server after ${MAX_RETRIES} attempts. Please restart the dev server.`
						);
						return;
					}

					isCreating = true;
					console.log('Creating WebSocket server on port 24678...');

					try {
						wss = new WebSocketServer({ port: 24678 }, () => {
							isCreating = false;
							retryCount = 0; // Reset retry count on success
							console.log('WebSocket server started on port 24678');
							setupWebSocketServer(wss!, server.httpServer);
							// Store game state manager globally so it can be accessed from SvelteKit
							global.__gameStateManager = getSharedGameStateManager();
						});

						// Handle server errors
						wss.on('error', (error: NodeJS.ErrnoException) => {
							isCreating = false;
							if (error.code === 'EADDRINUSE') {
								retryCount++;
								const delay = Math.min(2000 * retryCount, 10000); // Exponential backoff, max 10s
								console.warn(
									`Port 24678 is already in use, retrying in ${delay / 1000} seconds... (attempt ${retryCount}/${MAX_RETRIES})`
								);
								wss = null;
								setTimeout(() => {
									createWebSocketServer();
								}, delay);
							} else {
								console.error('WebSocket server error:', error);
								wss = null;
								retryCount = 0;
							}
						});

						// Auto-restart if the WebSocket server closes unexpectedly
						wss.on('close', () => {
							console.log('WebSocket server closed');
							wss = null;
							isCreating = false;
							retryCount = 0;
							// Wait before restarting to ensure port is fully released
							setTimeout(() => {
								if (server.httpServer?.listening) {
									console.log('Attempting to restart WebSocket server...');
									createWebSocketServer();
								}
							}, 3000); // Longer delay to avoid TIME_WAIT issues
						});
					} catch (error) {
						isCreating = false;
						console.error('Failed to create WebSocket server:', error);
						wss = null;
						retryCount = 0;
					}
				};

				// Create the initial WebSocket server
				createWebSocketServer();

				// Clean up on Vite server close
				server.httpServer?.on('close', () => {
					if (wss) {
						console.log('HTTP server closing, shutting down WebSocket server...');
						wss.removeAllListeners('close'); // Prevent auto-restart
						wss.close();
						wss = null;
						isCreating = false;
						retryCount = 0;
					}
				});
			}
		}
	]
});

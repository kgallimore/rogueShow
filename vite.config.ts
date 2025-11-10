import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type ViteDevServer } from 'vite';
import { WebSocketServer } from 'ws';
import { setupWebSocketServer } from './websocketServer/websocketServer';

// Store WebSocket server instance to properly clean it up on HMR
let wss: WebSocketServer | null = null;

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

				// Close existing WebSocket server if it exists (HMR cleanup)
				if (wss) {
					console.log('Closing existing WebSocket server...');
					wss.close(() => {
						console.log('WebSocket server closed');
					});
					wss = null;
				}

				// Create new WebSocket server
				wss = new WebSocketServer({ port: 24678 }, () => {
					console.log('WebSocket server started on port 24678');
				});

				// Handle server errors
				wss.on('error', (error: NodeJS.ErrnoException) => {
					if (error.code === 'EADDRINUSE') {
						console.warn('Port 24678 is already in use, waiting for cleanup...');
						// Retry after a short delay
						setTimeout(() => {
							if (!wss) {
								wss = new WebSocketServer({ port: 24678 }, () => {
									console.log('WebSocket server started on port 24678 (retry)');
								});
								setupWebSocketServer(wss, server.httpServer);
							}
						}, 1000);
					} else {
						console.error('WebSocket server error:', error);
					}
				});

				setupWebSocketServer(wss, server.httpServer);

				// Clean up on Vite server close
				server.httpServer?.on('close', () => {
					if (wss) {
						wss.close();
						wss = null;
					}
				});
			}
		}
	]
});

import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type ViteDevServer } from 'vite';
import { WebSocketServer } from 'ws';
import { setupWebSocketServer } from './websocketServer/websocketServer';

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
				const wss = new WebSocketServer({ port: 24678 });
				setupWebSocketServer(wss, server.httpServer);
			}
		}
	]
});

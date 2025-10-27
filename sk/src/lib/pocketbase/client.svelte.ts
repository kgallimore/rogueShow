/**
 * Singleton PocketBase client for browser-side usage.
 * Shares the same auth session as the server via cookies.
 * Use this for realtime subscriptions and client-side operations.
 */
import PocketBase from 'pocketbase';
import type { TypedPocketBase } from './types';
import { browser } from '$app/environment';

// In production, use PUBLIC_POCKETBASE_URL from environment
// For now, hardcode for development
const POCKETBASE_URL = 'http://127.0.0.1:8090';

// Singleton instance - only create once in browser context
let pbInstance: TypedPocketBase | null = null;

export function getPocketBase(): TypedPocketBase {
	if (!browser) {
		throw new Error('getPocketBase() can only be called in browser context');
	}

	if (!pbInstance) {
		pbInstance = new PocketBase(POCKETBASE_URL) as TypedPocketBase;

		// Important: This automatically syncs with server-side auth via cookies
		// The pb_auth cookie set by hooks.server.ts is automatically read here
		pbInstance.autoCancellation(false); // Prevent auto-cancellation of requests
	}

	return pbInstance;
}

/**
 * Helper to setup realtime subscriptions with automatic cleanup
 * Usage:
 *
 * onMount(() => {
 *   const unsubscribe = subscribeToCollection('gameState', '*', (data) => {
 *     console.log('Update:', data);
 *   });
 *   return unsubscribe; // Cleanup on unmount
 * });
 */
export function subscribeToCollection<T extends Record<string, unknown> = Record<string, unknown>>(
	collection: string,
	recordId: string,
	callback: (data: { action: string; record: T }) => void
) {
	const pb = getPocketBase();

	pb.collection(collection).subscribe<T>(recordId, callback);

	// Return unsubscribe function
	return () => {
		pb.collection(collection).unsubscribe(recordId);
	};
}

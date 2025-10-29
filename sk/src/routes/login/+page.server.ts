import type { PageServerLoad } from './$types';

export const load = (async () => {
	// Authentication is now performed in the browser using the client
	// PocketBase instance (see src/lib/pocketbase/client.svelte.ts). Server
	// routes should not attempt to sign in users via locals.
	return {};
}) satisfies PageServerLoad;

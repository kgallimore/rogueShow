import type { LayoutServerLoad } from './$types';

export const load = (async () => {
	// Server no longer exposes the client user authStore. The client should
	// initialize PocketBase in the browser and read the current user from
	// the client-side authStore. We still expose nothing here to avoid
	// breaking the layout's expected shape.
	return {
		user: null
	};
}) satisfies LayoutServerLoad;

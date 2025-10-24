import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
	return {
		user: locals.pb.authStore.record
	};
}) satisfies LayoutServerLoad;

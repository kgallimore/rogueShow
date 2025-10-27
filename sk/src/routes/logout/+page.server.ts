import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	locals.pb.authStore.clear();
	return {};
}) satisfies PageServerLoad;

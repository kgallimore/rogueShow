import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const { adminPb } = locals;
	const users = await adminPb.collection('users').getFullList(200);

	return { users };
}) satisfies PageServerLoad;

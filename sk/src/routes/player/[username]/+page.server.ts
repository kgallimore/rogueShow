import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PB_USER_PASSWORD } from '$env/static/private';

export const load = (async ({ params, locals }) => {
	const { adminPb } = locals;
	const userExist = await adminPb
		.collection('users')
		.getFirstListItem(`name="${params.username}"`)
		.catch(() => null);

	if (!userExist) {
		throw redirect(307, '/');
	}

	return {
		password: PB_USER_PASSWORD,
		player: {
			id: userExist.id,
			name: userExist.name ?? userExist.username ?? null
		}
	};
}) satisfies PageServerLoad;

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	if (locals.pb.authStore.isValid) {
		throw redirect(303, '/');
	}
	return {};
}) satisfies PageServerLoad;
export const actions = {
	login: async ({ request, locals }) => {
		const formData = await request.formData();
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		try {
			await locals.pb.collection('users').authWithPassword(username, password);
			if (!locals.pb?.authStore?.record?.verified) {
				locals.pb.authStore.clear();
				return {
					notVerified: true
				};
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			error(500, err.message);
		}

		redirect(303, '/');
	}
};

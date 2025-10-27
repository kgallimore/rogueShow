import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PB_USER_PASSWORD } from '$env/static/private';

export const load = (async ({ params, locals }) => {
	let currentUser = locals.pb.authStore.record;
	// If user is already authenticated, ensure they match the requested username
	if (currentUser?.name && currentUser.name !== params.username) {
		throw redirect(307, '/player/' + currentUser.name);
	}

	// Verify the requested user exists
	const { adminPb } = locals;
	const userExist = await adminPb
		.collection('users')
		.getFirstListItem(`name="${params.username}"`)
		.catch(() => null);

	if (!userExist) {
		throw redirect(307, '/');
	}

	if (!currentUser)
		await locals.pb.collection('users').authWithPassword(params.username, PB_USER_PASSWORD);
	currentUser = locals.pb.authStore.record;

	// Return shared password for client-side auto-login
	// This is acceptable for a private, one-time use site
	return {
		pass: PB_USER_PASSWORD,
		user: currentUser
	};
}) satisfies PageServerLoad;

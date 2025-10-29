import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	// Only use adminPb on the server to verify the requested user exists.
	// User authentication and signing-in are handled in the browser by the
	// client PocketBase instance.
	const { adminPb } = locals;
	const userExist = await adminPb
		.collection('users')
		.getFirstListItem(`name="${params.username}"`)
		.catch(() => null);

	if (!userExist) {
		// If the player doesn't exist, redirect to home. Client-side will
		// handle any further auth/redirect behavior.
		throw redirect(307, '/');
	}

	// Return some public-ish user info for the client to render.
	return {
		player: {
			id: userExist.id,
			name: userExist.name ?? userExist.username ?? null
			// Add any other non-sensitive fields you want exposed here
		}
	};
}) satisfies PageServerLoad;

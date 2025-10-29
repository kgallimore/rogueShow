import PocketBase from 'pocketbase';
import { PB_TYPEGEN_EMAIL, PB_TYPEGEN_PASSWORD } from '$env/static/private';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	event.locals.adminPb = new PocketBase('http://127.0.0.1:8090');
	await event.locals.adminPb
		.collection('_superusers')
		.authWithPassword(PB_TYPEGEN_EMAIL, PB_TYPEGEN_PASSWORD);

	// NOTE: We only attach the admin PocketBase instance to server locals.
	// Client-side PocketBase usage (authStore, user sessions, subscriptions)
	// must be handled in browser code via `src/lib/pocketbase/client.svelte.ts`.

	const response = await resolve(event);

	// No pb user-auth cookies are set by the server anymore. The client
	// will manage the user's PocketBase authStore and cookies directly.

	return response;
}

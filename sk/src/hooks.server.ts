import PocketBase from 'pocketbase';
import { PB_TYPEGEN_EMAIL, PB_TYPEGEN_PASSWORD } from '$env/static/private';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	event.locals.adminPb = new PocketBase('http://127.0.0.1:8090');
	await event.locals.adminPb
		.collection('_superusers')
		.authWithPassword(PB_TYPEGEN_EMAIL, PB_TYPEGEN_PASSWORD);

	event.locals.pb = new PocketBase('http://127.0.0.1:8090');

	// load the store data from the request cookie string
	event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	try {
		// get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
		if (event.locals.pb.authStore.isValid) await event.locals.pb.collection('users').authRefresh();
	} catch {
		// clear the auth store on failed refresh
		event.locals.pb.authStore.clear();
	}

	if (event.url.pathname.startsWith('/host')) {
		if (!event.locals.pb.authStore.isValid) {
			return Response.redirect(new URL('/login', event.request.url), 303);
		}
	}

	const response = await resolve(event);

	// send back the default 'pb_auth' cookie to the client with the latest store state
	response.headers.append('set-cookie', event.locals.pb.authStore.exportToCookie());

	return response;
}

import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	try {
		const response = await fetch('/api/audience');
		const data = await response.json();
		return { usernames: data.usernames || [] };
	} catch (error) {
		console.error('Error loading audience:', error);
		return { usernames: [] };
	}
}) satisfies PageServerLoad;

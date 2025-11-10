import type { PageServerLoad } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';
export const load = (async () => {
	return { key: OPENAI_API_KEY };
}) satisfies PageServerLoad;

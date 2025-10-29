// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { TypedPocketBase } from '$lib/pocketbase/types';
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			adminPb: TypedPocketBase;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

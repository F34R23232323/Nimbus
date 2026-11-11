import type { SessionUser, PublicSettings } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			sessionId: string | null;
			theme: 'light' | 'dark';
			authenticatedVia: 'session' | 'api-key' | 'bot' | null;
		}

		interface PageData {
			user: SessionUser | null;
			site: PublicSettings;
			theme: 'light' | 'dark';
			unread: number;
		}

		interface Error {
			message: string;
			code?: string;
		}

		interface Platform {}
	}

	namespace App {
		interface Session {}
	}
}

export {};

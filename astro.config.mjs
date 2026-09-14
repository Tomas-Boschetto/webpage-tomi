import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
	}),
	site: 'https://tomasboschetto.com',
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'it', 'es', 'de', 'fr'],
		routing: {
			prefixDefaultLocale: false,
		},
	},
});

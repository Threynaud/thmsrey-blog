// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://thmsrey.com',
	integrations: [mdx(), sitemap()],
	markdown: {
		shikiConfig: {
			themes: { light: 'github-light', dark: 'github-dark' },
		},
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'Spectral',
			cssVariable: '--font-spectral',
			weights: [400, 600],
			styles: ['normal', 'italic'],
			subsets: ['latin', 'latin-ext'],
			fallbacks: ['Georgia', 'serif'],
		},
	],
});

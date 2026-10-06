import { buildInfoPlugin } from './scripts/vite-plugin-build-info';
import { nerdamerPlugin } from './scripts/vite-plugin-nerdamer';
import { relativizeBasePlugin } from './scripts/vite-plugin-relativize-base';
import { SVELTEKIT_PWA_OPTIONS } from './src/lib/constants/pwa.constants';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { resolve } from 'path';
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_PUBLIC_');
	const SERVER_ORIGIN = env.VITE_PUBLIC_SERVER_ORIGIN || 'http://localhost:8080';

	return {
		build: {
			assetsInlineLimit: 32000,
			chunkSizeWarningLimit: 3072,
			minify: true
		},

		plugins: [
			tailwindcss(),
			sveltekit(),
			SvelteKitPWA(SVELTEKIT_PWA_OPTIONS),
			buildInfoPlugin(),
			nerdamerPlugin(),
			relativizeBasePlugin()
		],

		resolve: {
			alias: {
				'katex-fonts': resolve('node_modules/katex/dist/fonts')
			}
		},

		server: {
			fs: {
				allow: [searchForWorkspaceRoot(process.cwd())]
			},
			headers: {
				'Cross-Origin-Embedder-Policy': 'require-corp',
				'Cross-Origin-Opener-Policy': 'same-origin'
			},
			proxy: {
				'/cors-proxy': SERVER_ORIGIN,
				'/models': SERVER_ORIGIN,
				'/props': SERVER_ORIGIN,
				'/slots': SERVER_ORIGIN,
				'/tools': SERVER_ORIGIN,
				'/v1': SERVER_ORIGIN
			}
		}
	};
});

import { writeThemeFavicons } from './scripts/favicon-colorize';
import { FAVICON_COLORS, PWA_ASSET_GENERATOR } from './src/lib/constants/pwa.constants';
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

writeThemeFavicons(FAVICON_COLORS.LIGHT, FAVICON_COLORS.DARK, {
	padding: PWA_ASSET_GENERATOR.FAVICON_PADDING
});

export default defineConfig({
	headLinkOptions: {
		preset: PWA_ASSET_GENERATOR.LINK_PRESET
	},
	images: ['static/favicon.svg'],
	preset: {
		...minimal2023Preset,
		// tiny margin so favicon.ico / pwa-*.png breathe inside the canvas
		transparent: {
			...minimal2023Preset.transparent,
			padding: PWA_ASSET_GENERATOR.FAVICON_PADDING
		}
	}
});

export const APP_NAME = import.meta.env?.VITE_PUBLIC_APP_NAME || 'llama-ui';

// build-time defaults, used while the user leaves the setting empty
export const DEFAULT_API_URL: string = import.meta.env?.VITE_PUBLIC_DEFAULT_API_URL ?? '';
// baked into the bundle and readable by every user
export const DEFAULT_API_KEY: string = import.meta.env?.VITE_PUBLIC_DEFAULT_API_KEY ?? '';

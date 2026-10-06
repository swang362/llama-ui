import { SETTINGS_KEYS } from './settings-keys.constants';

// managed deployment, set at build time: the UI fronts a fixed OpenAI-compatible endpoint
export const MANAGED_MODE = import.meta.env?.VITE_PUBLIC_MANAGED === 'true';

// optional, defaults to <page origin>/v1, a path is resolved against the page origin
export const MANAGED_API_URL: string = MANAGED_MODE
	? import.meta.env?.VITE_PUBLIC_MANAGED_API_URL || '/v1'
	: '';

// optional, it is baked into the bundle and readable by every user
export const MANAGED_API_KEY: string = MANAGED_MODE
	? (import.meta.env?.VITE_PUBLIC_MANAGED_API_KEY ?? '')
	: '';

// llama-server only: dropped from external requests or backed by llama-server endpoints
const LLAMA_SERVER_SETTINGS = [
	SETTINGS_KEYS.BACKEND_SAMPLING,
	SETTINGS_KEYS.DISABLE_REASONING_PARSING,
	SETTINGS_KEYS.DRY_ALLOWED_LENGTH,
	SETTINGS_KEYS.DRY_BASE,
	SETTINGS_KEYS.DRY_MULTIPLIER,
	SETTINGS_KEYS.DRY_PENALTY_LAST_N,
	SETTINGS_KEYS.DYNATEMP_EXPONENT,
	SETTINGS_KEYS.DYNATEMP_RANGE,
	SETTINGS_KEYS.ENABLE_CONTINUE_GENERATION,
	SETTINGS_KEYS.EXCLUDE_REASONING_FROM_CONTEXT,
	SETTINGS_KEYS.MENTION_SEARCH_MAX_DEPTH,
	SETTINGS_KEYS.MIN_P,
	SETTINGS_KEYS.PRE_ENCODE_CONVERSATION,
	SETTINGS_KEYS.REPEAT_LAST_N,
	SETTINGS_KEYS.REPEAT_PENALTY,
	SETTINGS_KEYS.SAMPLERS,
	SETTINGS_KEYS.TOP_K,
	SETTINGS_KEYS.TYP_P,
	SETTINGS_KEYS.XTC_PROBABILITY,
	SETTINGS_KEYS.XTC_THRESHOLD
];

/** Settings forced and removed from the settings UI in managed mode: the API URL and key take their managed value, the rest their default. */
export const MANAGED_HIDDEN_SETTINGS: ReadonlySet<string> = new Set(
	MANAGED_MODE
		? [
				SETTINGS_KEYS.API_BASE_URL,
				...(MANAGED_API_KEY ? [SETTINGS_KEYS.API_KEY] : []),
				// whole Developer section
				SETTINGS_KEYS.CUSTOM_CSS,
				SETTINGS_KEYS.CUSTOM_JSON,
				SETTINGS_KEYS.JS_SANDBOX_ENABLED,
				SETTINGS_KEYS.SHOW_RAW_OUTPUT_SWITCH,
				SETTINGS_KEYS.SYMBOLIC_MATH_ENABLED,
				...LLAMA_SERVER_SETTINGS
			]
		: []
);

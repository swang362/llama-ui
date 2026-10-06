import { redactValue } from './redact';
import { CORS_PROXY, DEFAULT_API_KEY, DEFAULT_API_URL, HEADERS } from '$lib/constants';
import { MimeTypeApplication } from '$lib/enums';
import { settingsStore } from '$lib/stores/settings/index.svelte';

/** Resolve a path like `/v1` against the page origin, full URLs pass through. */
export function resolveApiUrl(url: string): string {
	return url.startsWith('/') && typeof location !== 'undefined' ? `${location.origin}${url}` : url;
}

/**
 * Base URL of the external OpenAI-compatible API, without trailing slash.
 * Falls back to the build-time default. Empty string means the UI talks to llama-server.
 */
export function getApiBaseUrl(): string {
	const url = settingsStore.config.apiBaseUrl?.toString().trim() || DEFAULT_API_URL.trim();

	return resolveApiUrl(url).replace(/\/+$/, '');
}

export function isExternalApi(): boolean {
	return getApiBaseUrl() !== '';
}

/** API key from settings, or the build-time default when the setting is empty. */
export function getApiKey(): string {
	return settingsStore.config.apiKey?.toString().trim() || DEFAULT_API_KEY.trim();
}

/**
 * Get authorization headers for API requests
 * Includes Bearer token if API key is configured
 */
export function getAuthHeaders(): Record<string, string> {
	const apiKey = getApiKey();

	return apiKey ? { [HEADERS.AUTHORIZATION]: `${HEADERS.BEARER}${apiKey}` } : {};
}

/**
 * Get standard JSON headers with optional authorization
 */
export function getJsonHeaders(): Record<string, string> {
	return {
		[HEADERS.CONTENT_TYPE]: MimeTypeApplication.JSON,
		...getAuthHeaders()
	};
}

/**
 * Sanitize HTTP headers by redacting sensitive values.
 * Known sensitive headers (from HEADERS.REDACTED) and any extra headers
 * specified by the caller are fully redacted. Headers listed in
 * `partialRedactHeaders` are partially redacted, showing only the
 * specified number of trailing characters.
 *
 * @param headers - Headers to sanitize
 * @param extraRedactedHeaders - Additional header names to fully redact
 * @param partialRedactHeaders - Map of header name -> number of trailing chars to keep visible
 * @returns Object with header names as keys and (possibly redacted) values
 */
export function sanitizeHeaders(
	headers?: HeadersInit,
	extraRedactedHeaders?: Iterable<string>,
	partialRedactHeaders?: Map<string, number>
): Record<string, string> {
	if (!headers) {
		return {};
	}

	const normalized = new Headers(headers);
	const sanitized: Record<string, string> = {};
	const redactedHeaders = new Set(
		Array.from(extraRedactedHeaders ?? [], (header) => header.toLowerCase())
	);

	for (const [key, value] of normalized.entries()) {
		const normalizedKey = key.toLowerCase();
		const unproxiedKey = normalizedKey.startsWith(CORS_PROXY.HEADER_PREFIX)
			? normalizedKey.slice(CORS_PROXY.HEADER_PREFIX.length)
			: normalizedKey;
		const partialChars =
			partialRedactHeaders?.get(normalizedKey) ?? partialRedactHeaders?.get(unproxiedKey);

		if (partialChars !== undefined) {
			sanitized[key] = redactValue(value, partialChars);
		} else if (
			HEADERS.REDACTED.has(normalizedKey) ||
			HEADERS.REDACTED.has(unproxiedKey) ||
			redactedHeaders.has(normalizedKey) ||
			redactedHeaders.has(unproxiedKey)
		) {
			sanitized[key] = redactValue(value);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

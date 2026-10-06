# External API and managed mode

This UI was originally a front end for `llama-server`. It can also talk to any OpenAI-compatible API (OpenAI, OpenRouter, vLLM, Ollama, LM Studio, ...). There are two ways to use this:

- **External API mode**: the user sets an API base URL in the settings. Any build supports it.
- **Managed mode**: a build-time flag. The UI is locked to the API served on its own origin, and settings that do not apply are locked and hidden. Use it to ship the UI as the front end of one fixed API server.

Managed mode is built on top of external API mode.

## External API mode

### Turning it on

Settings -> General -> **API Base URL**, for example `https://api.openai.com/v1`. Put the provider key in **API Key**. Saving a new URL reloads the page.

- Empty URL (default): the UI talks to the `llama-server` that serves it, exactly as before.
- Non-empty URL: the UI talks only to that API.

The URL is the base that the provider's SDKs use, so the UI calls `<base>/models` and `<base>/chat/completions`. A trailing slash is ignored.

### Requirements

- The API must allow **browser CORS requests** from the page origin, with the `Authorization` and `Content-Type` headers. OpenAI and OpenRouter allow this. Ollama needs `OLLAMA_ORIGINS=*`. Many other servers block it; serve the UI and API on one origin instead (see [Deployment](#deployment)).
- The stream must be OpenAI-style SSE (`data: {...}` chunks). A final `data: [DONE]` is optional.

### What the UI sends

Only standard OpenAI fields: `messages`, `model`, `stream`, `tools`, `temperature`, `top_p`, `max_tokens`, `presence_penalty`, `frequency_penalty`, and `reasoning_effort` when the user picks a reasoning level (`max` is sent as `high`).

llama.cpp extensions (`top_k`, `min_p`, DRY, XTC, `reasoning_format`, `timings_per_token`, ...) are not sent, because strict APIs reject unknown fields. To send provider-specific fields, use Settings -> Developer -> **Custom JSON**. It is merged into every request.

### What the UI reads

- Content and tool calls from `choices[0].delta`.
- Reasoning from `delta.reasoning_content` or `delta.reasoning` (OpenRouter, vLLM).
- The model list from `/models`. When an entry has `architecture.input_modalities` (OpenRouter), it defines image and audio support. Without it, images are allowed and the API rejects them if the model has no vision.

### What does not work

These features depend on llama-server endpoints and are turned off:

| Feature                                         | Reason                               |
| ----------------------------------------------- | ------------------------------------ |
| Context size meter, tokens/second               | needs llama.cpp `timings`            |
| Resume a stream after reload                    | needs the `/v1/stream` replay buffer |
| "Skip reasoning" button                         | needs `/v1/chat/completions/control` |
| Built-in server tools, working-directory picker | needs `/tools`                       |
| Model load/unload, model downloads              | needs router mode                    |
| Pre-fill KV cache                               | needs `n_predict: 0`                 |
| Server sampler defaults                         | needs `/props`                       |

Browser-side tools (`get_datetime`, `get_info`) and MCP servers that allow CORS still work.

## Managed mode

### Turning it on

Managed mode is a build-time flag:

| Variable                            | Effect                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `VITE_PUBLIC_MANAGED='true'`        | Turns managed mode on.                                                                |
| `VITE_PUBLIC_MANAGED_API_KEY='...'` | Optional. Locks the API key to this value. When empty, users can enter their own key. |

`tools/ui/.env.production` sets `VITE_PUBLIC_MANAGED='true'`, so **every `npm run build` is managed**. `npm run dev` does not read that file and stays unmanaged.

```sh
npm run build                            # managed
VITE_PUBLIC_MANAGED=false npm run build  # plain llama-server UI
npm run dev                              # unmanaged, proxies to llama-server
```

A variable set in the shell overrides the `.env` files.

> [!WARNING]
> `VITE_PUBLIC_MANAGED_API_KEY` is compiled into the JavaScript bundle. Every user can read it. Do not put it in the committed `.env.production`; set it in the build environment or in an untracked `.env.production.local`. In most cases, let the reverse proxy add the key instead (see [Deployment](#deployment)).

Note: this also affects the UI that the llama-server CMake build embeds. Use the override above to build a plain UI for llama-server.

### What managed mode does

The API base URL is always `<page origin>/v1`, for example `https://chat.example.com/v1`.

These settings are **locked and hidden**:

| Group                             | Settings                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Endpoint                          | API Base URL                                                                                                                                                                                                 |
| Developer section (whole section) | Custom JSON, Custom CSS, JavaScript sandbox, symbolic math, raw output toggle, pre-fill KV cache, disable reasoning parsing, exclude reasoning from context                                                  |
| llama.cpp samplers                | dynatemp range and exponent, top_k, min_p, XTC probability and threshold, typical_p, sampler order, backend sampling, repeat_last_n, repeat penalty, DRY multiplier, base, allowed length and penalty last N |
| Other llama-server features       | "Continue" button, @-mention search depth                                                                                                                                                                    |

When `VITE_PUBLIC_MANAGED_API_KEY` is set, **API Key** is locked too. It stays visible as a read-only field with the help text "Managed by this deployment."

Locked settings keep their default value (the API URL and key keep their managed values). The UI applies these values after it loads the settings and before every save. A value in localStorage, an imported settings file, a reset, or a server push cannot change them.

These settings stay editable: temperature, top_p, max tokens, presence and frequency penalty, system message, and all display, tools and agentic settings.

## Deployment

The recommended setup puts the UI and the API on **one origin** behind a reverse proxy:

- CORS is not needed.
- The proxy adds the API key, so the key never reaches the browser.
- The proxy is the place for user authentication, rate limits and logs.

Example for nginx:

```nginx
server {
    listen 443 ssl;
    server_name chat.example.com;

    location /v1/ {
        proxy_pass https://upstream.example.com/v1/;
        proxy_set_header Authorization "Bearer sk-...";
        proxy_set_header Host upstream.example.com;
        proxy_ssl_server_name on;
        # streaming responses must not be buffered
        proxy_buffering off;
        proxy_read_timeout 1h;
    }

    location / {
        root /srv/llama-ui/dist;
        try_files $uri /index.html;
    }
}
```

Build with `npm run build` and leave `VITE_PUBLIC_MANAGED_API_KEY` empty. If the proxy adds the key, users can leave the API Key field empty.

## Implementation

| Part                                                             | File                                      |
| ---------------------------------------------------------------- | ----------------------------------------- |
| Base URL helpers `getApiBaseUrl()`, `isExternalApi()`            | `src/lib/utils/api-headers.ts`            |
| `ServerRole.EXTERNAL`, `serverStore.isExternal`, skips `/props`  | `src/lib/stores/server.svelte.ts`         |
| Model list from `<base>/models`, models marked as loaded         | `src/lib/services/models.service.ts`      |
| OpenAI-only request body, stream end without `[DONE]`, no resume | `src/lib/services/chat.service.ts`        |
| Managed flags and the locked and hidden setting lists            | `src/lib/constants/managed.constants.ts`  |
| Enforcement of locked values, `applyManagedSettings()`           | `src/lib/stores/settings/index.svelte.ts` |
| Hidden fields, read-only locked fields, empty sections removed   | `src/lib/constants/settings.constants.ts` |

To lock and hide another setting in managed mode, add its key to `MANAGED_HIDDEN_SETTINGS` in `managed.constants.ts`.

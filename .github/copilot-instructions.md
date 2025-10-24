# Copilot Instructions for RogueShow

## Project Overview

RogueShow is a SvelteKit 2 application integrating OpenAI's Realtime API (voice/text) with PocketBase auth. The app features a "rogue AI show" concept where users interact with AI agents via WebRTC voice calls.

## Architecture

### Stack

- **Frontend**: SvelteKit 2 with Svelte 5 (async/await syntax, `$state` runes)
- **Backend**: Node.js adapter (`@sveltejs/adapter-node`)
- **Database**: PocketBase (separate Go process on port 8090)
- **AI**: OpenAI Realtime API via `@openai/agents` SDK + streaming chat completions
- **Styling**: Tailwind CSS 4 (Vite plugin)
- **Package Manager**: pnpm

### Project Structure

- `sk/` - SvelteKit application
- `pb/` - PocketBase backend (separate process)
- `sk/src/lib/remote/` - Remote Functions (SvelteKit experimental feature)
- `sk/src/lib/pocketbase/types.ts` - Auto-generated PocketBase types

## Critical Patterns

### Remote Functions (SvelteKit Experimental)

Remote functions in `src/lib/remote/*.remote.ts` use `query()` from `$app/server` to create server-side functions callable from client:

```typescript
// In openai.remote.ts
export const generateClientSecret = query(async () => {
  const clientKey = await openai.realtime.clientSecrets.create({...});
  return clientKey.value;
});

// In +page.svelte
import { generateClientSecret } from '$lib/remote/openai.remote';
const clientApiKey = await generateClientSecret(); // Direct call, no fetch()
```

**Critical**: Enable in `svelte.config.js`:

```javascript
kit: {
  experimental: {
    remoteFunctions: true;
  }
}
```

Use `query('unchecked', ...)` for functions without schema validation.

### PocketBase Integration

PocketBase instance is attached to `event.locals.pb` via `hooks.server.ts` and shared across all server routes:

```typescript
// Access in +layout.server.ts, +server.ts, etc.
export const load = async ({ locals }) => {
  return { user: locals.pb.authStore.record };
};
```

**Type safety**: `TypedPocketBase` extends PocketBase with generated collection types. Regenerate types after schema changes:

```bash
pnpm run pb:types
```

### OpenAI Realtime API Pattern

Two integration approaches coexist:

1. **WebRTC Agent** (`/call` route): Uses `@openai/agents/realtime` with `RealtimeSession` and `RealtimeAgent` for voice calls with custom tools (see `playSoundTool` in `/call/+page.svelte`)

2. **REST Streaming** (`/api/ai/stream`): Standard chat completions with SSE streaming for text responses

**Tool Definition Pattern**:

```typescript
import { tool } from "@openai/agents/realtime";
import { z } from "zod";

const playSoundTool = tool({
  name: "play_sound",
  parameters: z.object({ sound: z.string() }),
  execute: async (input) => {
    // Tool logic with Audio API
    return `Played sound: ${input.sound}`;
  },
});
```

### Svelte 5 Syntax

Use `$state()` runes instead of writable stores:

```svelte
<script lang="ts">
let session: RealtimeSession | null = $state(null);
let isConnected = $state(false);
</script>
```

Enable async components in `svelte.config.js`:

```javascript
compilerOptions: {
  experimental: {
    async: true;
  }
}
```

## Development Workflow

### Starting Services

**PocketBase must run separately** on `http://127.0.0.1:8090` before starting SvelteKit:

```powershell
# Terminal 1: Start PocketBase
cd pb; ./pocketbase serve

# Terminal 2: Start SvelteKit
cd sk; pnpm dev
```

### Key Commands

```bash
pnpm dev              # Vite dev server
pnpm build            # Production build
pnpm pb:types         # Regenerate PocketBase types
pnpm check            # Type-check Svelte files
pnpm format           # Prettier formatting
pnpm lint             # ESLint + Prettier check
```

## Environment Variables

Required in `sk/.env`:

```
OPENAI_API_KEY=sk-...
```

Access server-side via `$env/static/private`.

## Common Pitfalls

1. **Remote Functions**: Forgetting `experimental: { remoteFunctions: true }` causes import errors
2. **PocketBase Connection**: SvelteKit fails silently if PocketBase isn't running on port 8090
3. **Svelte 5 Runes**: Don't mix `$state()` with Svelte 4 store patterns (`writable()`)
4. **Model Names**: Use `gpt-5-mini-2025-08-07` for chat, `gpt-realtime-mini` for voice (check `openai.remote.ts` for current models)
5. **Type Generation**: After PocketBase schema changes, run `pb:types` before TypeScript will recognize collection changes

## File Naming Conventions

- `+page.svelte` - Route pages
- `+layout.svelte` - Layout components
- `+server.ts` - API endpoints (use `RequestHandler` type)
- `+layout.server.ts` / `+page.server.ts` - Server-side load functions
- `*.remote.ts` - Remote functions (SvelteKit experimental)
- `types.ts` - Type definitions (hand-written or generated)

## Testing & Debugging

No test suite currently exists. Use:

- Browser DevTools for client-side debugging
- `console.log()` in remote functions (logs to SvelteKit server console)
- PocketBase admin UI (`http://127.0.0.1:8090/_/`) for database inspection

## Key Files to Reference

- `hooks.server.ts` - PocketBase initialization pattern
- `openai.remote.ts` - Remote function examples, OpenAI client setup
- `/call/+page.svelte` - Complete WebRTC agent integration example
- `svelte.config.js` - Required experimental flags
- `app.d.ts` - Global type augmentation for `App.Locals`

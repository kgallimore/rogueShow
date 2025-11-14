Rogue Show — Context README

Purpose
An interactive live show built with SvelteKit + built in Bun WebSocket server. It starts as a Reese’s product tier-list experience led by a single host with many audience users, then progressively morphs into an AI-driven “rogue show” that takes over the experience in stages. There is only one show at a time.

Tech Stack
Frontend: SvelteKit
Backend: Bun.js WebSocket server
Package manager: bun

Roles
Host: During the tier list phase, controls progression, reveals product tiers, advances stages. During the rogue phase, the host does banter with the ai, but the ai controls the game.
Audience: Predicts product tiers, plays interstitial AI mini-games, submits guesses.

Core Modes (State Machine)
Mode: tierlist
The default show: host-driven Reese’s tier ranking with audience predictions (called votes).
Mode: rogue
The AI takes initiative. Gains abilities across stages and runs new mini-games.
Mode: interstitial
Between AI stages, players participate in short LLM-powered puzzle rounds.
Only one mode is active at a time.

Product Assets & Tier Lookup

Product Organization
Products are organized in the `static/assets` folder. Each subfolder represents one product group for tier list purposes. A subfolder may contain multiple images (variants), but only the primary image is displayed on the tier list board.

Tier Lookup System
The tier lookup file (`src/lib/games/tierlister/tierLookup.ts`) maps each product subfolder to its tier assignment. Each entry includes:
- `tier`: The assigned tier (S, A, B, C, D, or F)
- `primaryImage` (optional): The filename of the primary image within the subfolder (e.g., "primary.jpg"). If not specified, the first image found in the subfolder is used.
- `reasonings` (optional): An array of strings explaining the tier placement rationale.

Workflow:
1. Products are placed in `static/assets/` as subfolders (e.g., `static/assets/reeses-cups/`, `static/assets/reeses-pieces/`)
2. Each subfolder name is added to the `tierLookup` map in `tierLookup.ts` with its tier assignment
3. The system uses this lookup to determine the correct tier when products are revealed
4. The primary image (if specified) or first image in the subfolder is used for display on the tier board

Example tier lookup entry:
```typescript
"reeses-cups": {
  tier: "S",
  primaryImage: "main.jpg",
  reasonings: ["Classic flavor", "Perfect texture", "Iconic product"]
}
```

Show Flow

1. Setup
   Host selects a Reese's product sequence. Products are loaded from subfolders in `static/assets/`, with tier assignments read from the tier lookup file. Products can be bucketed; each may have multiple images but only the primary image is placed on the tier list. The audience can place their predictions (votes) for the tier of the current product. They can change their vote at any time, and the total votes are displayed in realtime for each tier.
2. Reveal
   Host advances to reveal the actual tier (from the tier lookup); primary image appears on the tier list board. The next product is then revealed, and the sequence continues.
3. Orchestrated Friction
   Occasional “weird events/bugs” intentionally frustrate/annoy users and host.
4. Shift to Rogue Mode
   The AI “gets tired” and starts its own game loop, adding capabilities across stages. The ai has the ability to control the game at this point.
   Rogue AI Stages
   Stage 1: Text
   AI communicates only via text. Users respond via text input.
   Stage 2: TTS
   AI speaks its text output.
   Stage 3: STT
   AI accepts mic input from users.
   Between stages, one or more interstitial mini-game rounds run.

Interstitial Mini-Game (LLM Quirk)
Prompt: Users chat with an LLM that has a hidden “quirk” (e.g., avoids letter “e”, restrictive phrasing, subtle logic). May use text and/or image generators.
Submission: Users submit a separate “guess” of the quirk.
Judging: An LLM judge evaluates if the guess is close enough to count as correct.
Progression: Quirks grow more subtle and harder across rounds.

Realtime & Session (Bun WebSocket server)
One host, many users.
Host authority: advances products, reveals tiers, advances stages.
Audience: submits predictions and mini-game inputs within time windows.
Identity: no auth; username is taken from the SvelteKit route parameter (e.g., `[username]`). Presence: optional lightweight presence for UI affordances.

UI Notes
Tier board: shows only the primary image per product placement.
Buckets: some products bucket multiple similar variants; use first image on board.
Friction events: scripted UX “glitches” to heighten narrative (do not break state).
Host screen: The host's control screen (controls, stage information, and current view) will be visible to the audience in real time — design host UI assuming audience visibility (avoid placing private controls or secrets on the host screen). Host actions remain authoritative.

Non-Goals (for now)
No complex moderation system.
No arbitrary multi-host control.
No long-term persistence beyond show recaps.

Conventions
State: single source of truth on the Bun WebSocket server; clients derive UI state from WS messages.
Commands: host actions are explicit mutations; audience actions are scoped to inputs.
Env: use pnpm scripts for dev/build; keep API keys in .env (never hardcode).

Success Criteria
Smooth host-led tierlist with audience predictions and reveal flow.
Intentional friction without losing data integrity or session continuity.
Seamless transition into rogue mode, with staged AI capability unlocks.
Engaging interstitial mini-games with LLM judge and escalating difficulty.

Quick Start (dev)
pnpm install
Run the Bun WebSocket server.
Configure SvelteKit env for the WebSocket server URL and any AI providers.
pnpm dev
End state: a live, host-led show that evolves into an AI-driven experience.

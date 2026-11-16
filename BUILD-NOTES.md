# EMBERPRISM — build notes (builder session)

## Game
- **Title:** EMBERPRISM — Guard the Last Ember Through Seven Nights
- **Genre:** 2D canvas top-down arena defence (twin-stick-lite).
- **Core mechanic (one sentence):** Aim light bolts at shadow wisps crawling
  out of the fog before they reach and snuff the Ember Heart.
- **Loop:** 7 nights x 3 waves; wisps / swifts / brutes / spitters / Night
  Herald boss (night 7); combo multiplier to x8; pickups (Light Shard,
  Heart Spark, Prism Surge triple-shot); dash with i-frames; win = clear
  night 7, lose = Ember Heart HP 0.
- **Feel:** particles, screen shake, floating score text, WebAudio synth SFX
  + ambient pad (no audio files), pause (P), mute (M), best score in
  localStorage.
- **Clean-room:** all game source written in this session. Only the kit was
  read (RULES.txt, competition.yaml, starter main.ts/serve.ts/vendor,
  opponent brief). No other entry repo was read.

## Files
- `game/index.html`, `game/src/{main,config,random,input,audio,entities,waves,render,shots}.js`
- `main.ts` (entrypoint), `serve.ts`, `vendor/makefun-game.ts` (kit, unchanged),
  `LICENSE` (MIT), `README.md`, `shots.json`, `.makefun/owner.json`
- Screenshots: `screenshots/{1-play,2-title,3-boss,4-victory}.jpg` (1280x720,
  deterministic `?shot=<scene>&seed=11` renders; cover = 1-play).

## Verification (headless Chromium, 2026-11-17 ~00:40 WIB)
- Screenshots: 4/4 captured, `__shotReady` OK, **0 page errors, 0 console
  errors** (favicon 404 fixed with a `data:,` icon link).
- Aimed playtest (60 s, scripted aim at nearest foe): **17 kills, score
  8,200, wave 3 reached, heart 100, 0 errors** — PASS.
- Idle playtest: game over at ~102 s (heart 0), **R restarts to a fresh
  game** (score 0, heart 100, night 1) — PASS.
- `main.ts` run twice: **byte-identical output**; dossier 351,583 bytes
  (schema makefun/dossier/v1), text 59,445 bytes (< 160 KiB cap),
  screenshots 46–67 KiB each (< 256 KiB), game/ 11 entries / 58,722 bytes.
- Review round fixes applied: HUD EMBER number vs FOES overlap, FOES count
  in shot scenes, boss label vs +300 float overlap, player peeking under
  title/victory panels, unused import removed.

## Not done (parent session)
- Bundle + check + submit to make.fun (needs the fixer subagent edit for
  the transcript gate, then `node cli/makefun.mjs bundle/check/submit`).
- No submission was made from this session.

## Session
- Builder session id: e7eda823-be4b-4e7c-975d-9d1cd40b515f
- Tooling (outside repo): `~/workspace/makefun/best-game-01-shots.mjs`,
  `~/workspace/makefun/best-game-01-playtest.mjs`,
  `~/workspace/makefun/best-game-01-probe.mjs`

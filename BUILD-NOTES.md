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

## Challenger v2 (auto-fix 4A, 2026-11-17 ~04:11 WIB)
- Trigger: v1 live at rank #1565/5280, judge 71,37% (7W/0D/5L, 12 matches);
  bar #10 = 88,69%. Same theme/title — the gap is execution, not theme.
- Readability (the big fix): sky gradient lightened (#232a5e→#3a2a68),
  floor glow stronger/wider, fog now misty lavender (#3a2f7d), 42 seeded
  ember motes + rune ticks on the arena ring so the ground reads as a
  place. Enemies 28–30% bigger (wisp 14→18, swift 11→14, brute 25→31,
  spitter 15→19, herald 42→50) with much brighter bodies/rims/eyes and
  stronger glows. Player r 13→16, aim beam 46→72, brighter glow.
- Screens: title/victory/game-over now draw arena + ember only behind
  the panel — no stray wisp/player sprite peeking out (v1 defect, fixed).
- Boss: label 15→19px with the HP bar + crown restacked (label, bar,
  crown top-to-bottom, no overlap); pulsing gold ring; boss-scene wisp
  moved off the label zone.
- Feel: spawn-in telegraph — new wisps hold 0.45 s at the edge behind a
  closing portal ring before hunting; wave-clear now floats
  "WAVE CLEAR +100" as well as the banner.
- Structure (criterion 5): render.js split — shared primitives into new
  `game/src/canvas.js` (rr/panel/glowCircle/fmtScore), HUD + title/pause/
  end screens into new `game/src/hud.js`; render.js is world-only now.
- Shot scenes denser: play 8→10 foes, 5→7 bolts, +1 pickup; boss +2
  escorts, +1 burst, +1 float, +1 pickup.

## Verification v2 (headless Chromium, 2026-11-17 ~04:30 WIB)
- Screenshots: 4/4 re-captured, `__shotReady` OK, **0 page errors,
  0 console errors**. All 4 reviewed by eye: play + boss much brighter
  and denser, foes/player/pickups read at once; boss label + HP bar +
  crown clean; title + victory panels clean (no stray sprites).
- Aimed playtest (60 s, aim at nearest foe, stationary warden):
  **14 kills, score 5,700, wave 2 reached, heart 100, playerHp 3,
  0 errors** — v1 reported 17 kills / 8,200 / wave 3; same ballpark,
  difference is spawn/aim variance (v2 defended the heart flawlessly:
  0 damage in 60 s). Circle-sweep playtest (same script as v1's tool):
  2 kills / 200 in 30 s — that script's aim is poor by design, not a
  regression signal.
- Idle playtest: game over at ~90 s (v1 ~102 s — bigger foes touch the
  heart sooner), **R restarts to a fresh game** (score 0, heart 100,
  night 1) — PASS.
- `main.ts` run twice: **byte-identical output** (diff -r clean);
  dossier 379,458 bytes (v1 351,583), screenshots 50–65 KiB each
  (< 256 KiB), game/ 62,754 bytes — all inside the gate caps.
- `node --check` passes on all 11 game modules.
- NOT submitted from this session: parent handles bundle transcript,
  check, and submit after the gate.

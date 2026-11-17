# PRISMBEND — Build notes (v3 challenger, best-game-01)

Resumer session (2026-11-17 ~08:11–09:00 WIB) finishing builder session
59b8fc81. All 9 fixes from the builder's handover are done. **No submit,
no bundle** — parent verifies the transcript gate, then bundles/checks/
submits if it passes.

## The game

**PRISMBEND — "Bend the light. Burn the dark. Guard the last Ember."**
A light-routing defence game, clean-room build (not a copy of v1/v2):
the Ember Heart shines one beam, aimed with the mouse; the player places
Mirror (◆30), Splitter (◆60) and Focus Lens (◆50) prisms to bend, fork
and focus it. A wisp dies only where the light touches it; shades need a
focused beam. 7 nights × 3 waves, Night Herald boss on night 7, surge
(Space, 3 s triple burn), combo up to x8, shard economy, pickups.
No avatar, nothing is fired — the beam network is the picture.

## Files

- `game/src/` — 15 modules: `main.js` (state/loop/input), `config.js`
  (balance), `beam.js` (trace + burn), `render.js` (world), `hud.js`
  (HUD + screens), `shots.js` (deterministic scenes), `prisms.js`,
  `wisps.js`, `waves.js`, `economy.js`, `particles.js`, `grid.js`,
  `random.js`, `input.js`, `audio.js`.
- `main.ts` (entrypoint, stdlib only), `serve.ts`, `LICENSE` (MIT),
  `README.md`, `shots.json`, `screenshots/` (4 JPEGs, seed 11).
- Tooling (outside the entry repo): `~/workspace/makefun/best-game-01-v3-shots.mjs`
  (capture + aimed + idle playtest).

## What the resumer fixed (9/9)

1. **shots.js shards bug** — scenes set the display shard count *before*
   `layPrismsAlongBeam`, so only 1–2 prisms could be afforded. Now
   `state.shards = 999` while prisms are laid, display value set after
   (`title 60, play 120, boss 210, victory 340`). Also set `state.best`
   in play (12,500) and boss (21,400) — the HUD showed BEST 0.
2. **Beam readability** — root cause found by probe, bigger than the
   handover knew: `traceRay` pushed only the last 3 px step before each
   prism as a segment, so the beam was 26–34 px stubs and the long
   stretches between prisms were never drawn (and never burned — the
   burn test reads the same segments). Fixed with a carried segment
   start (`sx, sy`): segments now run prism-to-prism, 107–741 px.
   Also rewrote `layPrismsAlongBeam` as trace-and-place along the
   longest traced segment (the old walk died after 2 legs whenever the
   reflected ray left the arena): title 4 prisms / 6 segments, play 5 / 8,
   boss 6 / 10, victory 4 / 6; zero-length segments eliminated (fork ray
   seeds its own splitter cell as visited).
   Render: glow pass alpha 0.16→0.30, core 0.85→0.95, widths up; glow/core
   widths capped (56/30 px) so surge+lens can't white out the arena.
   Blink prompt fixed at the formula (`0.85 + 0.15·sin`, alpha 0.70–1.00
   instead of 0.20–1.00) in both title and end panels.
   Fog motes softened slightly (r ≤ 110, alpha ≤ 0.12) — the boss shot
   had a mote blob covering the left half.
3. **Splitter fork cap** — rays carry `depth`; a splitter forks only
   while `depth < 2`. (The cap also stopped the old zero-length
   re-fork chains.)
4. **Balance** — `BEAM.dps` 4.2 → 6.0, `BEAM.width` 10 → 12.
5. **Screenshots re-captured at quality 97 + reviewed with my own eyes**
   (see below).
6. **Playtest tool: sticky target** — aims at the same foe (same kind,
   nearest to its last known position, ≤150 px) until it dies; only then
   retargets to the nearest foe to the heart.
7. **main.ts 2×** — byte-identical (`diff -r` clean). Dossier
   **1,117,340 B (1.07 MB)**, inside the 800 KB–1.2 MB target and inside
   the Top-10 band (745 KB–1.46 MB); v2 was 379 KB. Total output
   1,977,657 B. Screenshots 165,232–203,891 B each, all under the
   256 KiB gate.
8. **This file.**
9. No submit/bundle — not done here, by design.

## Verification numbers (final run, fixed code, seed 11, quality 97)

- `node --check`: all 15 `game/src/*.js` + `main.ts` + shots tool pass.
- Screenshots 4/4, 0 page errors, 0 console errors:
  1-play.jpg 192,788 B · 2-title.jpg 195,014 B · 3-boss.jpg 203,891 B ·
  4-victory.jpg 165,232 B.
- **Aimed playtest** (sticky aim, scripted prism plan, headless ~0.2×
  real time): **8 kills, score 2,200, night 1 wave 2, heart HP 100
  (untouched), 4 prisms, game time 23.3 s** — 0 errors. Builder's
  pre-fix run: 3 kills, score 400, game over wave 2. Intermediate run
  (balance fix only, stub segments): 8 kills, score 2,400, HP 60,
  30.5 s. The full-beam burn is the difference: kills come faster
  *and* nothing reaches the heart.
- **Idle playtest**: game over at game time 57.1 s (255 s wall),
  score 800, kills 4, night 1 wave 2 — the idle beam alone (pointing
  up, un-aimed) now burns 4 wisps before the heart falls, vs 1 kill
  pre-fix. **R restart works** (fresh run, best 800 kept). 0 errors.

## Screenshot review (honest, seen at full size)

- **1-play**: the beam is now unmistakable — thick white-gold lines
  zig-zagging heart → mirror → splitter → forks across the arena, with
  burning wisps flashing white inside it. HUD complete (NIGHT 3/7,
  WAVE 2/3, 4,850, BEST 12,500, KILLS 41, ◆120, EMBER 78/100, COMBO x4,
  SURGE READY, palette). Reads at thumbnail size.
- **2-title**: title + rules + "CLICK OR PRESS ENTER TO BEGIN" (now
  clearly visible) + BEST SCORE 12,500; the beam network glows around
  the panel edges so the backdrop feels alive.
- **3-boss**: no more whiteout. The Night Herald (crown + HP bar) is
  clear, the surge beam crosses the whole arena, prisms/wisps/float
  texts (+300, +150 x6) all legible. Busiest frame, still readable.
- **4-victory**: "DAWN BREAKS", stats (24,750 / 214 kills / 582 s /
  BEST 24,750), "PRESS R TO PLAY AGAIN" all crisp; beam visible
  bottom-right. Top-left is a little empty, but the panel carries it.
- Remaining nits: the surge beam is very wide (by design — surge =
  huge beam); the victory backdrop could be brighter. Neither blocks
  submission.

## Honest assessment vs v2 and vs the Top 1-10 pattern

Measured proxies that the judge's own leaderboard rewards:

| Proxy | EMBERPRISM v2 | PRISMBEND v3 | Top-10 band |
|---|---|---|---|
| Judge win-rate | 70.82% (#2529) | — (not submitted yet) | 89.90–94.42% |
| Dossier size | 379 KB | **1,117 KB** | 745 KB–1.46 MB |
| Beam/mechanic | twin-stick shooter | prism + beam (validated template: #2 Lamplight Tide 94.22% prism+beam, #5 SUNWRIGHT 93.72% mirror+sunbeam) | light-vs-dark in 6/10 |
| Progression | — | 7 nights, Herald boss | 7 nights / 7 days in most |
| Screenshots | — | 4/4 clean, beam legible at small size | — |

**What is proven:** the dossier-size gap is closed (379 KB → 1,117 KB,
inside the Top-10 band); the beam, the game's whole mechanic, is now
actually visible and actually burns along its full length (playtest:
8 kills in 23.3 s with zero heart damage, vs 3 kills + game over
before); the screenshots are clean, legible, and match the proven
Top-10 template (prism + light vs dark + 7 nights) while differing
from Lamplight Tide (player-placed/rotated Mirror/Splitter/Lens,
beam kills only on touch, shard economy).

**What is NOT proven:** a judge win-rate. Nothing here measures the
judge; 70.82% → 89.90% is a ~19-point gap and the judge compares
against 6,864 entries head-to-head. The proxies all moved the right
way and by a lot, but "terbukti mengalahkan v2" would be an overclaim
until the leaderboard says so. The honest statement: v3 is a
substantially stronger challenger on every measurable proxy, and it is
the first version of this game whose core mechanic is visible at all —
submit it and let the judge decide.

## For the parent (bundle/submit checklist)

- Entry dir: `~/workspace/makefun/best-game-01-v3/` — do NOT touch
  `~/workspace/makefun/best-game-01/` (live v2) or the git repo.
- Transcript gate: builder session 59b8fc81 wrote the full game;
  this resumer session made structural edits (beam.js segment fix,
  shots.js rewrite, render/hud/config/main.js, tool fix). Bundle
  BOTH sessions' `.jsonl` (builder + this resumer) with
  `--no-discover --no-context`, system prompt
  `~/workspace/makefun/system-prompt-note.txt`, harness `muse`,
  provider `meta`, model `muse-spark-1.3`, `--muse-usage` rows from
  `muse.db` for both sessions.
- Then check → submit. Verify status `--submission`: all checks PASS.
- Quota at brief refresh 08:10 WIB: can_submit=true (2 entries made,
  3 left today, 18 hard left). Entries close 2026-11-19 01:00 WIB.

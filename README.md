# PRISMBEND — Bend the Light, Burn the Dark

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/wizzy-bounty/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/wizzy-bounty/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Entry for the [make.fun best-game-01 bounty](https://make.fun/bounty/best-game-01).

A light-routing defence game for make.fun's **best-game-01** ("Make the best
game"). Original idea, art, sound and names; plain ES modules, no library,
no network request; plays offline from static files.

## The game in one sentence

Rotate and place prisms to bend the Ember Heart's beam of light so it burns
the shadow wisps crawling out of the fog — a wisp only dies where the light
touches it.

## How it plays

- The Ember Heart shines **one beam**, aimed with the mouse (arrow keys nudge
  it). The beam never fires a shot: it is a persistent line of light.
- **Click a grid cell** to place the selected prism there (costs shards).
  **Click a placed prism** to select it; click it again (or press R) to rotate
  it. **Right-click** a prism to sell it back for half its cost.
- Three prisms, each with one job:
  - **Mirror Prism** (◆30, key 1) — bends the beam 90°. Two rotations: `/` and `\`.
  - **Split Prism** (◆60, key 2) — the beam carries on straight and forks a
    second beam off at a right angle. Two rotations: fork left or right.
  - **Focus Lens** (◆50, key 3) — the beam passes through focused: wider,
    2.5x hotter, and the **only** light that can burn a shade wisp.
- **Space** fires a Surge: 3 seconds of triple burn and wider beams (10 s
  cooldown). **Enter** starts a wave early during a build phase. **P** pauses,
  **M** mutes, **Esc** deselects.
- Seven nights × three waves. Wisps (plain, swift, brute, spitter, shade)
  crawl toward the heart and bite it on arrival; spitters stop at range and
  spit gloom that dims a prism for 5 seconds (click it to cleanse). Night 7
  ends with the **Night Herald**, a boss that calls wisps to its side.
  Clearing night 7 wins; the heart at 0 HP loses.
- Kills pay shards and score times a combo multiplier (up to x8). Kills
  sometimes drop pickups — a spark heals the heart, a shard pays score —
  collected by clicking them or by sweeping a beam over them. Best score is
  kept in localStorage.

## Why this is a different angle

The previous entry in this series (EMBERPRISM) was a twin-stick arena
shooter: move, aim, fire bolts. PRISMBEND removes the shooter entirely —
there is no player avatar and nothing is fired. The whole game is shaping
one beam with glass: placement, rotation, and timing the surge. The beam
network is the picture, and it is brightest exactly where the action is,
so the game reads at a glance even shrunk to a thumbnail.

## Files

- `game/index.html` — the page; `game/src/main.js` — state, loop, input.
- `game/src/config.js` — balance, prism and wisp definitions, night plans.
- `game/src/random.js` — seeded RNG (one stream, so shots are deterministic).
- `game/src/input.js` — mouse and keyboard state.
- `game/src/audio.js` — WebAudio synth SFX and ambient pad (no audio files).
- `game/src/grid.js` — the placement grid and its coordinate math.
- `game/src/prisms.js` — prism rules: place, rotate, sell, dim, cleanse.
- `game/src/beam.js` — ray tracing through prisms; burning wisps in the beam.
- `game/src/wisps.js` — wisp movement, spitter gloom, the Herald's calls.
- `game/src/waves.js` — the night/wave schedule, win and loss.
- `game/src/economy.js` — score, shards, combo, pickups, best score.
- `game/src/particles.js` — bursts, embers, rings, floating text.
- `game/src/render.js` — the world: sky, grid, fog, beams, heart, prisms, wisps.
- `game/src/hud.js` — HUD, title, pause, game-over and victory screens.
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=<scene>&seed=N`).
- `main.ts` — the entrypoint: copies game/ + screenshots/ and writes the dossier.
- `serve.ts` — a tiny static server for local play (`node serve.ts`).

## Play locally

```
node serve.ts            # game/ on http://localhost:8080
```

## Screenshots

Four deterministic renders from the game's own code
(`shots.json`, `?shot=<scene>&seed=11`): `1-play.jpg` (cover),
`2-title.jpg`, `3-boss.jpg`, `4-victory.jpg`.

## Build notes

See `BUILD-NOTES.md` for the verification numbers (screenshots, playtests,
dossier size) and an honest review against the previous entry.

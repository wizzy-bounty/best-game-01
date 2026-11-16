# EMBERPRISM — Guard the Last Ember Through Seven Nights

A complete 2D canvas arcade game for make.fun's **best-game-01** bounty.
You are the last Prism Wisp. Shadow wisps crawl out of the fog to snuff the
Ember Heart at the centre of the arena — burn them with light before they
reach the flame, and survive all seven nights to win.

## How to play

- **WASD / arrow keys** — move
- **Mouse** — aim
- **Hold click** — fire light bolts (Prism Surge = triple shot)
- **Shift / right-click** — dash (brief invulnerability)
- **P** — pause · **M** — mute

Enemies: wisps, swift wisps, brutes, spitters (ranged), and the Night
Herald boss on night 7. Kills chain into a combo multiplier (up to x8).
Pickups drop from fallen wisps: Light Shards (+score), Heart Sparks (+ember
HP), Prism Surge (8s triple shot). If the Ember Heart hits 0 HP, the game
is over; if the warden falls, the ember takes a hit and the wisp respawns.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

No build step, no network request, no assets to download — every script,
sound (WebAudio synthesis) and pixel is generated in code.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored `vendor/makefun-game.ts` library.

Screenshots are deterministic renders of the game's own code:
`?shot=title|play|boss|victory&seed=N` renders one fixed frame and sets
`window.__shotReady`.

## Files

- `game/index.html` — the page (canvas + module entry)
- `game/src/main.js` — bootstrap, fixed-step loop, state machine, collisions
- `game/src/config.js` — balance, tuning, palette
- `game/src/random.js` — seeded RNG
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — synthesised WebAudio effects + ambient pad
- `game/src/entities.js` — player, enemies, bolts, pickups, particles
- `game/src/waves.js` — nights, waves, spawning, night-clear rewards
- `game/src/render.js` — all drawing: arena, HUD, screens
- `game/src/shots.js` — deterministic screenshot scenes
- `main.ts` — the entry program · `serve.ts` — local static server
- `vendor/makefun-game.ts` — make.fun's dossier library, unchanged from the kit

MIT licensed.

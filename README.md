# Soulbound Arena

A 2D roguelite co-op action game for up to 4 players. Team up, fight through procedurally themed maps, choose rewards between rounds, and spend souls in the shop between runs.

Built with [Phaser 3](https://phaser.io/) on the client and [Socket.IO](https://socket.io/) for real-time multiplayer on an [Express](https://expressjs.com/) server.

## Features

- Up to 4-player online co-op with room codes
- Multiple playable characters
- 8 maps per run with reward draft between each
- Rarity-tiered items (Common through Legendary)
- Persistent soul currency and shop

## Requirements

- Node.js 20+ (tested on 24)
- npm

## Getting Started

```bash
npm install
npm start
```

The server listens on `http://localhost:3333` by default. Open it in a browser, create a room, and share the 5-character code with friends.

For development with auto-reload:

```bash
npm run dev
```

### Configuration

- `PORT` — override the listen port (default `3333`).

## Testing

Core game logic is unit-tested under Node without a browser or a real Phaser runtime. A small ESM resolver hook (`test/helpers/resolver.mjs`) maps the browser-style `/shared/...` imports to filesystem paths, and a minimal Phaser global stub (`test/helpers/phaser-stub.js`) provides just enough of the Sprite / Math API for `Player` and friends to be instantiated under Node.

```bash
npm test
```

Suites live in `test/`:

- `test/calculate-damage.test.js` — pure damage-formula tests.
- `test/damage-system.test.js` — contract tests for `Player.takeDamage`, including a regression test that damage must never make the player sprite invisible.
- `test/projectile-hits-player.test.js` — regression suite for the enemy-projectile-vs-player overlap: captures the collider callback registered by `CombatScene._setupColliders` and invokes it with both argument orderings, asserting the player stays visible, active, and non-destroyed either way.

## Project Layout

```
.
├── server.js          # Express + Socket.IO server, room/session logic
├── shared/
│   └── gameData.js    # Constants, characters, items, rarities (client + server)
└── client/
    ├── index.html
    └── src/
        ├── main.js
        ├── entities/  # Player, Enemy
        ├── scenes/    # Boot, Menu, Lobby, CharacterSelect, Combat, SoulShop
        ├── network/   # Socket.IO client wrapper
        ├── systems/   # SoundManager
        ├── ui/        # Shared UI components
        └── AssetGenerator.js
```

## Multiplayer Protocol

The server is authoritative for room lifecycle (creation, joins, host migration, game state transitions) and relays per-player updates between clients. Key Socket.IO events:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `create-room` / `join-room` | client → server | Room management |
| `player-update` | client → server → peers | Position / state broadcast |
| `player-action` | client → server → peers | Actions (attacks, abilities) |
| `enemy-damage` | client → server → all | Damage application |
| `start-game`, `map-complete`, `ready-next` | client → server | Game flow |
| `show-rewards`, `next-map`, `game-start` | server → clients | Phase transitions |
| `player-joined`, `player-left`, `new-host` | server → clients | Room membership |

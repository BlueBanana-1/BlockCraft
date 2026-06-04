# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (opens browser automatically)
npm run build    # Production build → dist/
npm run preview  # Serve the production build locally
```

There are no tests or linters configured. The game runs entirely in the browser — verify changes by loading `http://localhost:517x` after `npm run dev`.

## Git Workflow

**After every meaningful change, commit and push to GitHub.** This is non-negotiable — it ensures work is never lost and the repo always reflects the current state.

```bash
git add <changed files>
git commit -m "Short imperative summary

Optional body explaining why, not what."
git push
```

Commit message conventions:
- Imperative mood: "Add cave generation", "Fix player clipping on chunk edges", "Increase render distance"
- Scope first if helpful: "Terrain: add biome variation", "UI: show selected block name"
- Never batch unrelated changes into one commit

**When to commit** (not exhaustive — when in doubt, commit):
- A feature or sub-feature is working
- A bug is fixed
- A file is added, deleted, or significantly restructured
- Constants are tuned to a stable value
- CLAUDE.md or documentation is updated

GitHub repo: **https://github.com/BlueBanana-1/BlockCraft** — branch `master`, remote `origin`.

## Architecture

BlockCraft is a browser-based voxel game. All source lives in `src/`. No framework, no TypeScript — vanilla ES modules bundled by Vite.

### Data flow (one frame)

```
Controls (input state)
  → Player.update(dt)        — physics, camera yaw/pitch
  → World.update(x, z, 2)   — load/unload chunks, rebuild ≤2 dirty meshes
  → raycast(world, cam, dir) — DDA traversal → hit block + face normal
  → world.setBlock(...)      — break/place (marks chunk dirty)
  → renderer.render()        — Three.js draw call
```

### Block system (`blocks.js`)

Each block is `{ id, name, solid, transparent, tiles: { top, bottom, side } }`. Two key distinctions:
- **`solid`** — controls player collision (`isSolid`)
- **`transparent`** — controls face culling (`isOpaque = solid && !transparent`); a block can be solid but transparent (leaves, glass)

`BLOCK_BY_ID[id]` is the O(1) lookup array used in hot paths. Adding a new block type means: add an entry to `BLOCKS`, assign the next sequential tile index, and add a draw function in `TextureAtlas.js`.

### Texture atlas (`TextureAtlas.js`)

A single 256×256 `<canvas>` holds all 16×16 pixel-art tiles. Tile index `i` lives at canvas pixel `(i%16 * 16, floor(i/16) * 16)`. The canvas is wrapped in a `THREE.CanvasTexture` with `NearestFilter` (no mipmaps).

UV mapping gotcha: Three.js UV origin is **bottom-left**, canvas is **top-left**, so `getTileUVs` inverts the row: `v0 = 1 - (row+1)/16`. Always use `getTileUVs(tileIndex)` — never compute atlas UVs manually.

### Chunk + World (`Chunk.js`, `World.js`)

Chunks are **16×128×16** columns keyed by `"cx,cz"` in `World.chunks` (a `Map`). Block data is a flat `Uint8Array` indexed as `x * CHUNK_HEIGHT * CHUNK_WIDTH + y * CHUNK_WIDTH + z`.

`Chunk.buildMesh()` iterates every block, checks 6 neighbors via `isOpaque`, and emits quads into JS arrays which are then converted to a `THREE.BufferGeometry` in one shot. Positions are **world-space** (no `mesh.position` offset). Always call `geometry.dispose()` before replacing geometry.

`World.setBlock()` marks the modified chunk dirty **and** any adjacent chunk if the block sits on a chunk edge (lx=0, lx=15, lz=0, lz=15). The rebuild loop in `World.update()` processes at most `maxBuildsPerFrame` dirty chunks per frame (default 2; startup uses 999 to build all at once).

### Player physics (`Player.js`)

AABB is 0.6×1.8×0.6. Collision is resolved **per axis in X→Y→Z order** — `_resolveCollisions` moves each axis then calls `_resolveAxis`. `onGround` is reset to `false` every frame and only set `true` during Y resolution when moving downward into a solid block.

Camera uses `rotation.order = 'YXZ'` — critical for correct first-person look without gimbal lock. Movement vectors are derived from `yaw` only (not pitch), so the player always moves horizontally:
- `forward = (-sin(yaw), 0, -cos(yaw))`
- `right   = ( cos(yaw), 0, -sin(yaw))`

### Raycasting (`Raycast.js`)

Amanatides-Woo DDA: steps one voxel at a time along the ray, advancing the axis whose `tMax` is smallest. Returns `{ blockX, blockY, blockZ, faceNormal }` where `faceNormal` is the unit vector pointing away from the hit face — add it to the block coords to get the placement position.

### Terrain generation (`TerrainGenerator.js`)

`generateChunk` runs four sequential passes: height map fill → ore scatter → cave carve → tree placement. Heights come from 5-octave fBm (`SEA_LEVEL ± TERRAIN_AMPLITUDE`). Caves use 3D simplex with threshold `|n| < 0.10`. Trees are skipped within 2 blocks of chunk edges to avoid cross-chunk leaf placement.

The world seed is set in `main.js` as `new TerrainGenerator(98765)` — change this integer to get a different world.

### Renderer (`Renderer.js`)

One shared `MeshLambertMaterial` with `alphaTest: 0.5` is used by all chunk meshes. Transparent pixels (leaves gaps, glass interior) must be drawn with `alpha=0` in the atlas so they are discarded by alphaTest. Fog (`THREE.Fog`) is matched to render distance so unloaded chunks fade before becoming visible.

## Key constants (`constants.js`)

| Constant | Value | Effect of changing |
|---|---|---|
| `RENDER_DISTANCE` | 4 | Increase for more visible world, costs more RAM/GPU |
| `SEA_LEVEL` | 60 | Base terrain height |
| `TERRAIN_AMPLITUDE` | 18 | Max height deviation from sea level |
| `TERRAIN_SCALE` | 0.008 | Lower = larger terrain features |
| `REACH_DISTANCE` | 5.0 | Max block interaction range |
| `CHUNK_HEIGHT` | 128 | World height; changing requires re-indexing logic |


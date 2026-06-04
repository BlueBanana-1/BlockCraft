import { createNoise2D, createNoise3D } from 'simplex-noise';
import { CHUNK_WIDTH, CHUNK_HEIGHT, SEA_LEVEL, TERRAIN_AMPLITUDE, TERRAIN_SCALE } from './constants.js';
import { BLOCKS } from './blocks.js';

// Seeded mulberry32 PRNG (returns function → [0,1))
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TerrainGenerator {
  constructor(seed = 12345) {
    const prng = mulberry32(seed);
    this.noise2D = createNoise2D(prng);
    const prng2 = mulberry32(seed ^ 0xdeadbeef);
    this.noise3D = createNoise3D(prng2);
    this.seed = seed;
  }

  // Fractional Brownian Motion height
  getHeight(wx, wz) {
    let h = 0;
    let amp = TERRAIN_AMPLITUDE;
    let freq = TERRAIN_SCALE;
    for (let i = 0; i < 5; i++) {
      h += amp * this.noise2D(wx * freq, wz * freq);
      amp *= 0.5;
      freq *= 2.0;
    }
    return Math.min(CHUNK_HEIGHT - 3, Math.max(3, Math.round(SEA_LEVEL + h)));
  }

  // Deterministic per-position hash for ore/tree placement
  hash(wx, wz, seed) {
    let n = Math.imul(wx, 374761393) ^ Math.imul(wz, 668265263) ^ Math.imul(seed, 1013904223);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  hash3(wx, wy, wz, seed) {
    let n = Math.imul(wx, 374761393) ^ Math.imul(wy, 1274126177) ^ Math.imul(wz, 668265263) ^ Math.imul(seed, 1013904223);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  generateChunk(chunk) {
    const cx = chunk.worldX;
    const cz = chunk.worldZ;

    // Step 1: Height map + column fill
    const heightMap = new Int32Array(CHUNK_WIDTH * CHUNK_WIDTH);
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_WIDTH; z++) {
        const wx = cx + x, wz = cz + z;
        const surf = this.getHeight(wx, wz);
        heightMap[x * CHUNK_WIDTH + z] = surf;

        // Bedrock
        chunk.setBlock(x, 0, z, BLOCKS.BEDROCK.id);

        for (let y = 1; y < CHUNK_HEIGHT; y++) {
          if (y < surf - 4) {
            chunk.setBlock(x, y, z, BLOCKS.STONE.id);
          } else if (y < surf - 1) {
            chunk.setBlock(x, y, z, BLOCKS.DIRT.id);
          } else if (y === surf - 1) {
            chunk.setBlock(x, y, z, BLOCKS.DIRT.id);
          } else if (y === surf) {
            chunk.setBlock(x, y, z, BLOCKS.GRASS.id);
          }
          // above surf = air (default)
        }
      }
    }

    // Step 2: Ore placement
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_WIDTH; z++) {
        const wx = cx + x, wz = cz + z;
        const surf = heightMap[x * CHUNK_WIDTH + z];
        for (let y = 1; y < Math.min(surf - 4, CHUNK_HEIGHT); y++) {
          if (chunk.getBlockLocal(x, y, z) !== BLOCKS.STONE.id) continue;
          const h1 = this.hash3(wx, y, wz, 9001);
          if (y < 80 && h1 < 0.10) {
            chunk.setBlock(x, y, z, BLOCKS.COAL_ORE.id);
          } else {
            const h2 = this.hash3(wx, y, wz, 9002);
            if (y < 48 && h2 < 0.05) {
              chunk.setBlock(x, y, z, BLOCKS.IRON_ORE.id);
            }
          }
        }
      }
    }

    // Step 3: Cave carving
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_WIDTH; z++) {
        const wx = cx + x, wz = cz + z;
        for (let y = 5; y < CHUNK_HEIGHT - 5; y++) {
          if (chunk.getBlockLocal(x, y, z) === BLOCKS.BEDROCK.id) continue;
          const n = this.noise3D(wx * 0.04, y * 0.07, wz * 0.04);
          if (Math.abs(n) < 0.10) {
            chunk.setBlock(x, y, z, BLOCKS.AIR.id);
          }
        }
      }
    }

    // Step 4: Trees (skip within 2 blocks of chunk edge to avoid cross-chunk leaves)
    for (let x = 2; x < CHUNK_WIDTH - 2; x++) {
      for (let z = 2; z < CHUNK_WIDTH - 2; z++) {
        const wx = cx + x, wz = cz + z;
        const surf = heightMap[x * CHUNK_WIDTH + z];
        if (surf < 5 || surf > CHUNK_HEIGHT - 10) continue;
        if (chunk.getBlockLocal(x, surf, z) !== BLOCKS.GRASS.id) continue;
        if (this.hash(wx, wz, 7777) > 0.025) continue;

        const trunkH = 4 + Math.floor(this.hash(wx, wz, 7778) * 2);
        // Trunk
        for (let ty = surf + 1; ty <= surf + trunkH; ty++) {
          if (ty >= CHUNK_HEIGHT) break;
          chunk.setBlock(x, ty, z, BLOCKS.OAK_LOG.id);
        }
        // Canopy (3x3x3 around top, biased upward)
        const top = surf + trunkH;
        for (let ly = top - 1; ly <= top + 1; ly++) {
          if (ly >= CHUNK_HEIGHT || ly < 0) continue;
          const r = ly === top + 1 ? 1 : 2;
          for (let lx = x - r; lx <= x + r; lx++) {
            for (let lz = z - r; lz <= z + r; lz++) {
              if (lx < 0 || lx >= CHUNK_WIDTH || lz < 0 || lz >= CHUNK_WIDTH) continue;
              // Don't overwrite log
              if (chunk.getBlockLocal(lx, ly, lz) === BLOCKS.OAK_LOG.id) continue;
              // Skip corners at outer radius
              if (r === 2 && Math.abs(lx - x) === 2 && Math.abs(lz - z) === 2) {
                if (this.hash3(lx, ly, lz, 8001) > 0.5) continue;
              }
              chunk.setBlock(lx, ly, lz, BLOCKS.OAK_LEAVES.id);
            }
          }
        }
      }
    }

    chunk.dirty = true;
  }
}

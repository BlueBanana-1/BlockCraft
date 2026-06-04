import { CHUNK_WIDTH, CHUNK_HEIGHT, RENDER_DISTANCE } from './constants.js';
import { Chunk } from './Chunk.js';

export class World {
  constructor(scene, material, terrainGenerator) {
    this.scene = scene;
    this.material = material;
    this.terrain = terrainGenerator;
    this.chunks = new Map();
    this.lastPlayerCX = null;
    this.lastPlayerCZ = null;
  }

  chunkKey(cx, cz) { return `${cx},${cz}`; }

  worldToChunk(wx, wz) {
    return {
      cx: Math.floor(wx / CHUNK_WIDTH),
      cz: Math.floor(wz / CHUNK_WIDTH),
    };
  }

  worldToLocal(wx, wz) {
    return {
      lx: ((wx % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH,
      lz: ((wz % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH,
    };
  }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return 0;
    const { cx, cz } = this.worldToChunk(wx, wz);
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (!chunk) return 0;
    const { lx, lz } = this.worldToLocal(wx, wz);
    return chunk.getBlockLocal(lx, wy, lz);
  }

  setBlock(wx, wy, wz, id) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return;
    const { cx, cz } = this.worldToChunk(wx, wz);
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (!chunk) return;
    const { lx, lz } = this.worldToLocal(wx, wz);
    chunk.setBlock(lx, wy, lz, id);

    if (lx === 0)               this._markDirty(cx - 1, cz);
    if (lx === CHUNK_WIDTH - 1) this._markDirty(cx + 1, cz);
    if (lz === 0)               this._markDirty(cx, cz - 1);
    if (lz === CHUNK_WIDTH - 1) this._markDirty(cx, cz + 1);
  }

  _markDirty(cx, cz) {
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (chunk) chunk.dirty = true;
  }

  loadChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    if (this.chunks.has(key)) return;
    const chunk = new Chunk(cx, cz);
    this.terrain.generateChunk(chunk);
    this.chunks.set(key, chunk);
  }

  unloadChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    chunk.dispose(this.scene);
    this.chunks.delete(key);
  }

  update(playerX, playerZ, maxBuildsPerFrame = 3) {
    const { cx: pcx, cz: pcz } = this.worldToChunk(playerX, playerZ);

    if (pcx !== this.lastPlayerCX || pcz !== this.lastPlayerCZ) {
      this.lastPlayerCX = pcx;
      this.lastPlayerCZ = pcz;

      // Load chunks in range (diamond filter to prefer closer chunks)
      for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > RENDER_DISTANCE * 1.5) continue;
          this.loadChunk(pcx + dx, pcz + dz);
        }
      }

      // Collect chunks to unload (don't modify Map while iterating)
      const toUnload = [];
      const unloadDist = RENDER_DISTANCE + 1;
      for (const chunk of this.chunks.values()) {
        const adx = Math.abs(chunk.chunkX - pcx);
        const adz = Math.abs(chunk.chunkZ - pcz);
        if (adx > unloadDist || adz > unloadDist) {
          toUnload.push([chunk.chunkX, chunk.chunkZ]);
        }
      }
      for (const [cx, cz] of toUnload) this.unloadChunk(cx, cz);
    }

    // Rebuild dirty chunk meshes (bounded per frame)
    let built = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.dirty) {
        chunk.buildMesh(this, this.scene, this.material);
        built++;
        if (built >= maxBuildsPerFrame) break;
      }
    }
  }
}

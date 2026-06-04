import * as THREE from 'three';
import { CHUNK_WIDTH, CHUNK_HEIGHT } from './constants.js';
import { BLOCKS, isSolid, isOpaque, getTileIndex } from './blocks.js';
import { getTileUVs } from './TextureAtlas.js';

// Six face definitions: dir = neighbor offset, faceName for tile lookup
// Vertex corners relative to block origin, UVs mapped so textures are upright
const FACE_DATA = [
  // +Y top
  { dir: [0,1,0], faceName: 'top', normal: [0,1,0],
    corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]],
    uvs:     [[0,1],  [1,1],  [1,0],  [0,0]] },
  // -Y bottom
  { dir: [0,-1,0], faceName: 'bottom', normal: [0,-1,0],
    corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]],
    uvs:     [[0,1],  [1,1],  [1,0],  [0,0]] },
  // +X right
  { dir: [1,0,0], faceName: 'side', normal: [1,0,0],
    corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]],
    uvs:     [[1,0],  [1,1],  [0,1],  [0,0]] },
  // -X left
  { dir: [-1,0,0], faceName: 'side', normal: [-1,0,0],
    corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]],
    uvs:     [[0,0],  [0,1],  [1,1],  [1,0]] },
  // +Z front
  { dir: [0,0,1], faceName: 'side', normal: [0,0,1],
    corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]],
    uvs:     [[1,0],  [1,1],  [0,1],  [0,0]] },
  // -Z back
  { dir: [0,0,-1], faceName: 'side', normal: [0,0,-1],
    corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]],
    uvs:     [[0,0],  [0,1],  [1,1],  [1,0]] },
];

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.worldX = chunkX * CHUNK_WIDTH;
    this.worldZ = chunkZ * CHUNK_WIDTH;

    // Flat Uint8Array: index = x * CHUNK_HEIGHT * CHUNK_WIDTH + y * CHUNK_WIDTH + z
    this.blocks = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_WIDTH);

    this.mesh = null;
    this.geometry = null;
    this.dirty = true;
  }

  blockIndex(x, y, z) {
    return x * CHUNK_HEIGHT * CHUNK_WIDTH + y * CHUNK_WIDTH + z;
  }

  getBlockLocal(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    // x/z bounds checked by caller or world
    return this.blocks[this.blockIndex(x, y, z)];
  }

  setBlock(x, y, z, id) {
    if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_WIDTH) return;
    this.blocks[this.blockIndex(x, y, z)] = id;
    this.dirty = true;
  }

  buildMesh(world, scene, material) {
    const positions = [];
    const normals   = [];
    const uvCoords  = [];
    const indices   = [];
    let vertCount = 0;

    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_WIDTH; z++) {
          const blockId = this.blocks[this.blockIndex(x, y, z)];
          if (blockId === BLOCKS.AIR.id) continue;

          const wx = this.worldX + x;
          const wz = this.worldZ + z;

          for (const face of FACE_DATA) {
            const [dx, dy, dz] = face.dir;
            const nx = x + dx, ny = y + dy, nz = z + dz;

            // Determine neighbor block ID (cross-chunk aware)
            let neighborId;
            if (ny < 0 || ny >= CHUNK_HEIGHT) {
              neighborId = 0; // air above/below world
            } else if (nx < 0 || nx >= CHUNK_WIDTH || nz < 0 || nz >= CHUNK_WIDTH) {
              neighborId = world.getBlock(wx + dx, ny, wz + dz);
            } else {
              neighborId = this.blocks[this.blockIndex(nx, ny, nz)];
            }

            // Cull face: only render if neighbor is not opaque
            if (isOpaque(neighborId)) continue;
            // Also skip if neighbor is same transparent type (e.g. water next to water)
            if (neighborId === blockId && !isOpaque(blockId)) continue;

            const tileIdx = getTileIndex(blockId, face.faceName);
            const { u0, v0, u1, v1 } = getTileUVs(tileIdx);

            const base = vertCount;
            for (let i = 0; i < 4; i++) {
              const [cx, cy, cz] = face.corners[i];
              positions.push(wx + cx, y + cy, wz + cz);
              normals.push(...face.normal);
              const [fu, fv] = face.uvs[i];
              // map [0,1] face UV to atlas tile UV
              uvCoords.push(u0 + fu * (u1 - u0), v0 + fv * (v1 - v0));
            }
            // Two CCW triangles forming the quad
            indices.push(base, base+1, base+2, base, base+2, base+3);
            vertCount += 4;
          }
        }
      }
    }

    // Dispose old geometry to free GPU memory
    if (this.geometry) {
      this.geometry.dispose();
    }

    if (vertCount === 0) {
      // Empty chunk — remove mesh if it exists
      if (this.mesh && scene) scene.remove(this.mesh);
      this.mesh = null;
      this.geometry = null;
      this.dirty = false;
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvCoords, 2));
    geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));

    this.geometry = geometry;

    if (!this.mesh) {
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.frustumCulled = true;
      if (scene) scene.add(this.mesh);
    } else {
      this.mesh.geometry = geometry;
    }

    this.dirty = false;
  }

  dispose(scene) {
    if (this.mesh && scene) scene.remove(this.mesh);
    if (this.geometry) this.geometry.dispose();
    this.mesh = null;
    this.geometry = null;
  }
}

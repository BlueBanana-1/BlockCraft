import { isSolid } from './blocks.js';

// Amanatides-Woo DDA voxel traversal
// Returns { blockX, blockY, blockZ, faceNormal: {x,y,z} } or null
export function raycast(world, origin, direction, maxDistance) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const dx = direction.x, dy = direction.y, dz = direction.z;

  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;

  // Distance to first voxel boundary on each axis
  let tMaxX = stepX > 0 ? (x + 1 - origin.x) * tDeltaX : (origin.x - x) * tDeltaX;
  let tMaxY = stepY > 0 ? (y + 1 - origin.y) * tDeltaY : (origin.y - y) * tDeltaY;
  let tMaxZ = stepZ > 0 ? (z + 1 - origin.z) * tDeltaZ : (origin.z - z) * tDeltaZ;

  let faceNormal = { x: 0, y: 0, z: 0 };
  const maxIter = Math.ceil(maxDistance / Math.min(tDeltaX, tDeltaY, tDeltaZ, 1)) + 3;

  for (let i = 0; i < maxIter; i++) {
    const minT = Math.min(tMaxX, tMaxY, tMaxZ);
    if (minT > maxDistance) break;

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      faceNormal = { x: -stepX, y: 0, z: 0 };
      tMaxX += tDeltaX;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      faceNormal = { x: 0, y: -stepY, z: 0 };
      tMaxY += tDeltaY;
    } else {
      z += stepZ;
      faceNormal = { x: 0, y: 0, z: -stepZ };
      tMaxZ += tDeltaZ;
    }

    const id = world.getBlock(x, y, z);
    if (isSolid(id)) {
      return { blockX: x, blockY: y, blockZ: z, faceNormal };
    }
  }
  return null;
}

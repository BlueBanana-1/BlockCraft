// Tile indices reference positions in the 256x256 texture atlas (16x16 tiles)
// Tile index i → column i%16, row floor(i/16)
export const BLOCKS = {
  AIR:               { id: 0,  name: 'Air',               solid: false, transparent: true,  tiles: { top: 0,  bottom: 0,  side: 0  } },
  GRASS:             { id: 1,  name: 'Grass',             solid: true,  transparent: false, tiles: { top: 1,  bottom: 2,  side: 3  } },
  DIRT:              { id: 2,  name: 'Dirt',              solid: true,  transparent: false, tiles: { top: 2,  bottom: 2,  side: 2  } },
  STONE:             { id: 3,  name: 'Stone',             solid: true,  transparent: false, tiles: { top: 4,  bottom: 4,  side: 4  } },
  COBBLESTONE:       { id: 4,  name: 'Cobblestone',       solid: true,  transparent: false, tiles: { top: 5,  bottom: 5,  side: 5  } },
  MOSSY_COBBLESTONE: { id: 5,  name: 'Mossy Cobblestone', solid: true,  transparent: false, tiles: { top: 6,  bottom: 6,  side: 6  } },
  STONE_BRICK:       { id: 6,  name: 'Stone Brick',       solid: true,  transparent: false, tiles: { top: 7,  bottom: 7,  side: 7  } },
  OAK_LOG:           { id: 7,  name: 'Oak Log',           solid: true,  transparent: false, tiles: { top: 8,  bottom: 8,  side: 9  } },
  OAK_PLANKS:        { id: 8,  name: 'Oak Planks',        solid: true,  transparent: false, tiles: { top: 10, bottom: 10, side: 10 } },
  OAK_LEAVES:        { id: 9,  name: 'Oak Leaves',        solid: true,  transparent: true,  tiles: { top: 11, bottom: 11, side: 11 } },
  SAND:              { id: 10, name: 'Sand',              solid: true,  transparent: false, tiles: { top: 12, bottom: 12, side: 12 } },
  GRAVEL:            { id: 11, name: 'Gravel',            solid: true,  transparent: false, tiles: { top: 13, bottom: 13, side: 13 } },
  WATER:             { id: 12, name: 'Water',             solid: false, transparent: true,  tiles: { top: 14, bottom: 14, side: 14 } },
  BEDROCK:           { id: 13, name: 'Bedrock',           solid: true,  transparent: false, tiles: { top: 15, bottom: 15, side: 15 } },
  COAL_ORE:          { id: 14, name: 'Coal Ore',          solid: true,  transparent: false, tiles: { top: 16, bottom: 16, side: 16 } },
  IRON_ORE:          { id: 15, name: 'Iron Ore',          solid: true,  transparent: false, tiles: { top: 17, bottom: 17, side: 17 } },
  GLASS:             { id: 16, name: 'Glass',             solid: true,  transparent: true,  tiles: { top: 18, bottom: 18, side: 18 } },
};

export const BLOCK_BY_ID = new Array(32).fill(null);
for (const block of Object.values(BLOCKS)) {
  BLOCK_BY_ID[block.id] = block;
}

export function isSolid(id) {
  return BLOCK_BY_ID[id]?.solid ?? false;
}

export function isOpaque(id) {
  const b = BLOCK_BY_ID[id];
  return b != null && b.solid && !b.transparent;
}

export function getBlock(id) {
  return BLOCK_BY_ID[id] ?? BLOCKS.AIR;
}

export function getTileIndex(blockId, faceName) {
  const block = BLOCK_BY_ID[blockId];
  if (!block) return 0;
  return block.tiles[faceName] ?? 0;
}

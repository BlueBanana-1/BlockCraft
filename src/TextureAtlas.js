import * as THREE from 'three';
import { ATLAS_SIZE, TILE_SIZE, TILES_PER_ROW } from './constants.js';

export let atlasTexture = null;

// Deterministic per-pixel hash → value in [0,1)
function h(x, y, seed) {
  let n = Math.imul(x, 1619) ^ Math.imul(y, 31337) ^ Math.imul(seed, 1013904223);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function lerp(a, b, t) { return a + (b - a) * t; }

let ctx;

function px(x, y, r, g, b, a = 255) {
  ctx.fillStyle = `rgba(${r|0},${g|0},${b|0},${(a/255).toFixed(3)})`;
  ctx.fillRect(x, y, 1, 1);
}

function tileBase(index) {
  return {
    bx: (index % TILES_PER_ROW) * TILE_SIZE,
    by: Math.floor(index / TILES_PER_ROW) * TILE_SIZE,
  };
}

// ── Tile drawers ────────────────────────────────────────────────────

function drawGrassTop(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x, y, 1);
      const n2 = h(x * 3, y * 3, 11);
      const r = 60 + n2 * 20 | 0;
      const g = 128 + n * 50 | 0;
      const b = 20 + n2 * 10 | 0;
      px(bx + x, by + y, r, g, b);
    }
  }
}

function drawDirt(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x, y, 2);
      const n2 = h(x + 7, y + 3, 22);
      const r = 110 + n * 50 | 0;
      const g = 72 + n * 28 | 0;
      const b = 36 + n * 14 | 0;
      // small dark spots
      const spot = n2 < 0.12 ? 0.72 : 1.0;
      px(bx + x, by + y, r * spot, g * spot, b * spot);
    }
  }
}

function drawGrassSide(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x, y, 3);
      if (y <= 2) {
        // grass top strip
        const n2 = h(x * 2, y, 13);
        px(bx + x, by + y, 60 + n2*15|0, 130 + n*40|0, 22 + n2*8|0);
      } else if (y === 3) {
        // blend row
        const n2 = h(x, y, 33);
        if (n2 > 0.5) px(bx + x, by + y, 70, 115, 30);
        else {
          const r = 110 + n*40|0, g = 72 + n*20|0, b = 36 + n*10|0;
          px(bx + x, by + y, r, g, b);
        }
      } else {
        // dirt
        const r = 110 + n*50|0, g = 72 + n*28|0, b = 36 + n*14|0;
        const spot = h(x+7,y+3,22) < 0.12 ? 0.72 : 1.0;
        px(bx + x, by + y, r*spot, g*spot, b*spot);
      }
    }
  }
}

function drawStone(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x, y, 4);
      const n2 = h(x + 5, y + 9, 44);
      const base = 115 + n * 45 | 0;
      // crack lines
      const crack = (n2 < 0.05) ? 0.7 : 1.0;
      px(bx + x, by + y, base * crack, base * crack, base * crack);
    }
  }
}

function drawCobblestone(index) {
  const { bx, by } = tileBase(index);
  // mortar background
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      px(bx + x, by + y, 65, 65, 65);

  // 4 stones arranged in 2x2 grid with mortar
  const stones = [
    { x1: 1, y1: 1, x2: 7, y2: 6, seed: 50 },
    { x1: 9, y1: 1, x2: 15, y2: 5, seed: 51 },
    { x1: 1, y1: 8, x2: 7, y2: 14, seed: 52 },
    { x1: 9, y1: 8, x2: 15, y2: 15, seed: 53 },
  ];
  for (const s of stones) {
    for (let y = s.y1; y <= s.y2; y++) {
      for (let x = s.x1; x <= s.x2; x++) {
        const n = h(x - s.x1, y - s.y1, s.seed);
        const edge = (x === s.x1 || y === s.y1) ? 0.85 : (x === s.x2 || y === s.y2) ? 0.70 : 1.0;
        const base = 115 + n * 40 | 0;
        px(bx + x, by + y, base * edge, base * edge, base * edge);
      }
    }
  }
}

function drawMossyCobblestone(index) {
  // start with cobblestone
  drawCobblestone(index);
  const { bx, by } = tileBase(index);
  // overlay green moss patches
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x * 2, y * 2, 60);
      const n2 = h(x, y, 61);
      if (n < 0.22 && n2 > 0.3) {
        const g = 100 + n2 * 40 | 0;
        px(bx + x, by + y, 40, g, 30, 200);
      }
    }
  }
}

function drawStoneBrick(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      px(bx + x, by + y, 72, 72, 72);

  // 2-row brick pattern, alternating offsets
  const brickH = 7, mortarW = 1, mortarH = 1;
  for (let row = 0; row < 3; row++) {
    const yStart = row * (brickH + mortarH);
    if (yStart >= 16) break;
    const offset = (row % 2 === 0) ? 0 : 8;
    for (let brickStart = -offset; brickStart < 16; brickStart += 8) {
      const x1 = Math.max(0, brickStart + 1);
      const x2 = Math.min(15, brickStart + 7);
      const y1 = yStart + 1;
      const y2 = Math.min(15, yStart + brickH);
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          const n = h(x, y, 70 + row);
          const light = (y === y1 || x === x1) ? 1.15 : (y === y2 || x === x2) ? 0.80 : 1.0;
          const base = 105 + n * 35 | 0;
          px(bx + x, by + y, Math.min(255, base * light), Math.min(255, base * light), Math.min(255, base * light));
        }
      }
    }
  }
}

function drawOakLogTop(index) {
  const { bx, by } = tileBase(index);
  const cx = 7.5, cy = 7.5;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const n = h(x, y, 80);
      if (dist < 3) {
        // heartwood center
        px(bx + x, by + y, 100 + n*20|0, 65 + n*15|0, 28 + n*10|0);
      } else if (dist < 5) {
        px(bx + x, by + y, 140 + n*20|0, 95 + n*15|0, 42 + n*10|0);
      } else if (dist < 7) {
        px(bx + x, by + y, 120 + n*25|0, 80 + n*18|0, 36 + n*10|0);
      } else {
        // bark outer ring
        px(bx + x, by + y, 95 + n*20|0, 62 + n*15|0, 25 + n*8|0);
      }
    }
  }
}

function drawOakLogSide(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const stripe = Math.floor((x + h(x, y * 4, 90) * 2) / 2) % 2;
      const n = h(x, y, 91);
      if (stripe === 0) {
        px(bx + x, by + y, 115 + n*20|0, 78 + n*15|0, 34 + n*8|0);
      } else {
        px(bx + x, by + y, 95 + n*20|0, 62 + n*12|0, 26 + n*6|0);
      }
      // knot
      if (n < 0.04) px(bx + x, by + y, 60, 40, 18);
    }
  }
}

function drawOakPlanks(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const plank = Math.floor(y / 4);
      const n = h(x + plank * 7, plank, 100);
      const edgeY = (y % 4 === 0);
      if (edgeY) {
        px(bx + x, by + y, 110, 75, 30);
      } else {
        px(bx + x, by + y, 175 + n*40|0, 120 + n*28|0, 50 + n*15|0);
      }
    }
  }
}

function drawOakLeaves(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x, y, 110);
      const n2 = h(x * 2, y * 2, 111);
      if (n2 < 0.18) {
        // fully transparent gaps — discarded by alphaTest
        px(bx + x, by + y, 0, 0, 0, 0);
      } else {
        const r = 28 + n * 18 | 0;
        const g = 100 + n * 55 | 0;
        const b = 20 + n * 12 | 0;
        px(bx + x, by + y, r, g, b);
      }
    }
  }
}

function drawSand(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x, y, 120);
      px(bx + x, by + y, 210 + n*28|0, 190 + n*22|0, 130 + n*20|0);
    }
  }
}

function drawGravel(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x, y, 130);
      const n2 = h(x * 3, y * 2, 131);
      const base = 100 + n * 50 | 0;
      const patch = n2 < 0.3 ? 0.80 : n2 > 0.85 ? 1.25 : 1.0;
      px(bx + x, by + y, Math.min(255, base * patch), Math.min(255, base * patch), Math.min(255, base * patch));
    }
  }
}

function drawWater(index) {
  const { bx, by } = tileBase(index);
  ctx.globalAlpha = 0.82;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x, y, 140);
      const wave = h(x + 3, y * 2, 141) > 0.5 ? 1.08 : 0.95;
      px(bx + x, by + y, (45 + n*20|0) * wave, (90 + n*30|0) * wave, 195 + n*30|0);
    }
  }
  ctx.globalAlpha = 1.0;
}

function drawBedrock(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = h(x, y, 150);
      const base = 30 + n * 25 | 0;
      px(bx + x, by + y, base, base, base);
    }
  }
}

function drawCoalOre(index) {
  // stone base
  drawStone(index);
  const { bx, by } = tileBase(index);
  // coal veins
  const veins = [[3,4],[10,3],[6,10],[13,9],[5,13],[12,6],[8,8]];
  for (const [vx, vy] of veins) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px2 = vx + dx, py2 = vy + dy;
        if (px2 >= 0 && px2 < 16 && py2 >= 0 && py2 < 16) {
          const n = h(px2, py2, 160);
          if (n > 0.25) px(bx + px2, by + py2, 20, 20, 22);
        }
      }
    }
  }
}

function drawIronOre(index) {
  drawStone(index);
  const { bx, by } = tileBase(index);
  const veins = [[4,4],[11,5],[7,11],[13,10],[3,13]];
  for (const [vx, vy] of veins) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px2 = vx + dx, py2 = vy + dy;
        if (px2 >= 0 && px2 < 16 && py2 >= 0 && py2 < 16) {
          const n = h(px2, py2, 170);
          if (n > 0.30) px(bx + px2, by + py2, 195 + n*30|0, 135 + n*20|0, 90 + n*15|0);
        }
      }
    }
  }
}

function drawGlass(index) {
  const { bx, by } = tileBase(index);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const border = (x === 0 || x === 15 || y === 0 || y === 15);
      const inner = (x === 1 || x === 14 || y === 1 || y === 14);
      if (border) {
        px(bx + x, by + y, 160, 210, 235, 230);
      } else if (inner) {
        px(bx + x, by + y, 140, 195, 225, 170);
      } else {
        // transparent interior (discarded by alphaTest)
        px(bx + x, by + y, 0, 0, 0, 0);
      }
    }
  }
}

// ── Public API ──────────────────────────────────────────────────────

export function initTextureAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Fill entire atlas with transparent black
  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  // Draw each tile at its index position
  drawGrassTop(1);
  drawDirt(2);
  drawGrassSide(3);
  drawStone(4);
  drawCobblestone(5);
  drawMossyCobblestone(6);
  drawStoneBrick(7);
  drawOakLogTop(8);
  drawOakLogSide(9);
  drawOakPlanks(10);
  drawOakLeaves(11);
  drawSand(12);
  drawGravel(13);
  drawWater(14);
  drawBedrock(15);
  drawCoalOre(16);
  drawIronOre(17);
  drawGlass(18);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  atlasTexture = texture;
  return texture;
}

// Returns UV rect for a tile index with half-pixel inset to prevent bleeding
export function getTileUVs(tileIndex) {
  const col = tileIndex % TILES_PER_ROW;
  const row = Math.floor(tileIndex / TILES_PER_ROW);
  const inset = 0.5 / ATLAS_SIZE;
  const u0 = col / TILES_PER_ROW + inset;
  const u1 = (col + 1) / TILES_PER_ROW - inset;
  // Three.js UV origin is bottom-left; canvas is top-left → invert row
  const v0 = 1 - (row + 1) / TILES_PER_ROW + inset;
  const v1 = 1 - row / TILES_PER_ROW - inset;
  return { u0, v0, u1, v1 };
}

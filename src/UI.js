import { BLOCKS } from './blocks.js';
import { getTileUVs } from './TextureAtlas.js';
import { ATLAS_SIZE } from './constants.js';

// The 9 hotbar blocks (medieval selection)
const HOTBAR_BLOCKS = [
  BLOCKS.STONE,
  BLOCKS.COBBLESTONE,
  BLOCKS.STONE_BRICK,
  BLOCKS.OAK_PLANKS,
  BLOCKS.OAK_LOG,
  BLOCKS.DIRT,
  BLOCKS.GLASS,
  BLOCKS.OAK_LEAVES,
  BLOCKS.MOSSY_COBBLESTONE,
];

export class UI {
  constructor() {
    this.selectedSlot = 0;
    this.hotbarBlocks = HOTBAR_BLOCKS;
    this.slotEls = [];
    this.blockNameEl = null;
    this.debugEl = null;
    this.debugVisible = false;
  }

  init() {
    this.blockNameEl = document.getElementById('block-name');
    this.debugEl     = document.getElementById('debug-panel');

    const hotbarEl = document.getElementById('hotbar');
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot' + (i === 0 ? ' selected' : '');

      const numLabel = document.createElement('span');
      numLabel.className = 'slot-num';
      numLabel.textContent = i + 1;
      slot.appendChild(numLabel);

      // Draw block icon via canvas
      const icon = document.createElement('canvas');
      icon.className = 'slot-icon';
      icon.width = 32;
      icon.height = 32;
      icon.style.imageRendering = 'pixelated';
      slot.appendChild(icon);

      hotbarEl.appendChild(slot);
      this.slotEls.push(slot);
    }

    this._renderIcons();
    this._updateSelection();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.debugVisible = !this.debugVisible;
        this.debugEl.classList.toggle('visible', this.debugVisible);
      }
    });
  }

  _renderIcons() {
    // We'll draw block icons by sampling the atlas canvas — but we don't have it yet.
    // Use colored div backgrounds keyed to block type instead (simpler fallback).
    // The icons are rendered after atlasTexture is ready (call renderIconsFromAtlas).
  }

  // Called once atlasTexture canvas is ready to sample
  renderIconsFromAtlas(atlasCanvas) {
    for (let i = 0; i < 9; i++) {
      const block = this.hotbarBlocks[i];
      const canvas = this.slotEls[i].querySelector('canvas');
      if (!canvas || !block) continue;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const { u0, v0, u1, v1 } = getTileUVs(block.tiles.top);
      // Convert UV to pixel coords in atlas
      const sx = u0 * ATLAS_SIZE;
      const sy = (1 - v1) * ATLAS_SIZE;  // flip V since canvas Y is top-down
      const sw = (u1 - u0) * ATLAS_SIZE;
      const sh = (v1 - v0) * ATLAS_SIZE;

      ctx.drawImage(atlasCanvas, sx, sy, sw, sh, 0, 0, 32, 32);
    }
  }

  _updateSelection() {
    for (let i = 0; i < 9; i++) {
      this.slotEls[i].classList.toggle('selected', i === this.selectedSlot);
    }
    const block = this.hotbarBlocks[this.selectedSlot];
    if (this.blockNameEl) this.blockNameEl.textContent = block?.name ?? '';
  }

  setSlot(index) {
    if (index < 0 || index >= 9) return;
    this.selectedSlot = index;
    this._updateSelection();
  }

  scrollSlot(delta) {
    // delta > 0 = scroll down = next slot
    const dir = delta > 0 ? 1 : -1;
    this.selectedSlot = ((this.selectedSlot + dir) % 9 + 9) % 9;
    this._updateSelection();
  }

  getSelectedBlockId() {
    return this.hotbarBlocks[this.selectedSlot]?.id ?? 0;
  }

  updateDebug(player, world, fps, hit) {
    if (!this.debugVisible) return;
    const p = player.position;
    const { cx, cz } = world.worldToChunk(p.x, p.z);
    const blockAt = hit ? `${hit.blockX}, ${hit.blockY}, ${hit.blockZ}` : 'none';
    this.debugEl.innerHTML = [
      `<b>BlockCraft</b> — F3 to hide`,
      `XYZ: ${p.x.toFixed(2)} / ${p.y.toFixed(2)} / ${p.z.toFixed(2)}`,
      `Chunk: ${cx}, ${cz}`,
      `FPS: ${Math.round(fps)}`,
      `Chunks loaded: ${world.chunks.size}`,
      `Looking at: ${blockAt}`,
      `On ground: ${player.onGround}`,
    ].join('<br>');
  }
}

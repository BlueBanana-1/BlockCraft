import * as THREE from 'three';
import { initTextureAtlas } from './TextureAtlas.js';
import { Renderer } from './Renderer.js';
import { World } from './World.js';
import { TerrainGenerator } from './TerrainGenerator.js';
import { Player } from './Player.js';
import { Controls } from './Controls.js';
import { raycast } from './Raycast.js';
import { UI } from './UI.js';
import { REACH_DISTANCE, SEA_LEVEL } from './constants.js';
import { isSolid } from './blocks.js';
import { createPlayerModel } from './PlayerModel.js';

async function init() {
  // ── Texture atlas ────────────────────────────────────────────────
  const atlasTexture = initTextureAtlas();

  // ── Renderer ─────────────────────────────────────────────────────
  const renderer = new Renderer();
  const canvas = document.getElementById('game-canvas');
  renderer.init(canvas, atlasTexture);

  // ── World ────────────────────────────────────────────────────────
  const terrain = new TerrainGenerator(98765);
  const world   = new World(renderer.scene, renderer.material, terrain);

  // ── Controls ─────────────────────────────────────────────────────
  const controls = new Controls();
  controls.init(canvas);

  // ── Player ───────────────────────────────────────────────────────
  const player = new Player(world, controls, renderer.camera);
  // Find a good spawn height
  const spawnSurf = terrain.getHeight(8, 8);
  player.position.set(8, spawnSurf + 3, 8);

  // ── Player model (third-person character) ─────────────────────────
  const playerModel = createPlayerModel();
  renderer.scene.add(playerModel);
  player.model = playerModel;

  // ── UI ───────────────────────────────────────────────────────────
  const ui = new UI();
  ui.init();

  // Render hotbar icons using the atlas canvas
  // The atlas canvas is the source of the CanvasTexture
  const atlasCanvas = atlasTexture.image;
  ui.renderIconsFromAtlas(atlasCanvas);

  // ── Click-to-play overlay ─────────────────────────────────────────
  const overlay = document.getElementById('click-to-play');
  overlay.addEventListener('click', () => {
    controls.requestPointerLock(canvas);
  });
  document.addEventListener('pointerlockchange', () => {
    overlay.style.display = document.pointerLockElement === canvas ? 'none' : 'flex';
  });

  // ── Initial chunk load centered on player ─────────────────────────
  // Load chunks synchronously (blocking, one-time cost on startup)
  world.update(player.position.x, player.position.z, 999);

  // ── Game loop ────────────────────────────────────────────────────
  let lastTime = performance.now();
  let fpsFrames = 0, fpsAccum = 0, fps = 60;
  const lookDir = new THREE.Vector3();

  function gameLoop(now) {
    requestAnimationFrame(gameLoop);

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    fpsFrames++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      fps = fpsFrames / fpsAccum;
      fpsFrames = 0;
      fpsAccum = 0;
    }

    // ── Input: hotbar selection ──────────────────────────────────
    const hotKey = controls.consumeHotbarKey();
    if (hotKey >= 0) ui.setSlot(hotKey);
    const scroll = controls.consumeScroll();
    if (scroll !== 0) ui.scrollSlot(scroll);

    // ── View mode toggle (R) ─────────────────────────────────────
    if (controls.consumeViewToggle()) {
      player.thirdPerson = !player.thirdPerson;
    }

    // ── Player update ────────────────────────────────────────────
    player.update(dt);

    // ── World update (chunk load/unload + dirty mesh rebuild) ────
    world.update(player.position.x, player.position.z, 2);

    // ── Raycasting (always from player eye, not camera) ──────────
    const eyePos = player.getEyePosition();
    lookDir.copy(player.getLookDirection());
    const hit = raycast(world, eyePos, lookDir, REACH_DISTANCE);
    renderer.setHighlight(hit ? { x: hit.blockX, y: hit.blockY, z: hit.blockZ } : null);

    // ── Block interaction ────────────────────────────────────────
    const { left, right } = controls.consumeClicks();

    if (hit) {
      if (left) {
        world.setBlock(hit.blockX, hit.blockY, hit.blockZ, 0);
      }
      if (right) {
        const px = hit.blockX + hit.faceNormal.x;
        const py = hit.blockY + hit.faceNormal.y;
        const pz = hit.blockZ + hit.faceNormal.z;

        // Don't place inside player
        if (!player.overlapsAABB(px, py, pz, px + 1, py + 1, pz + 1)) {
          world.setBlock(px, py, pz, ui.getSelectedBlockId());
        }
      }
    }

    // ── UI update ────────────────────────────────────────────────
    ui.updateDebug(player, world, fps, hit);

    // ── Render ───────────────────────────────────────────────────
    renderer.render();
  }

  requestAnimationFrame(gameLoop);
}

init();

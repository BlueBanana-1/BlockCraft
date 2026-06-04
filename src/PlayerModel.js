import * as THREE from 'three';

const COLOR_SKIN  = 0xd4aa80;
const COLOR_HAIR  = 0x3d2200;
const COLOR_SHIRT = 0x4a6fa5;
const COLOR_JEANS = 0x2a3f7a;
const COLOR_BOOT  = 0x5c3d1e;
const COLOR_EYE   = 0x110800;

function box(w, h, d, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
}

// Builds a Minecraft-Steve-style character.
// Group origin = player feet (y=0). Front face points in local -Z direction,
// matching the player's forward direction when group.rotation.y = player.yaw.
export function createPlayerModel() {
  const group = new THREE.Group();

  // --- Head (y: 1.30 → 1.80, center 1.55) ---
  const head = box(0.50, 0.50, 0.50, COLOR_SKIN);
  head.position.set(0, 1.55, 0);
  group.add(head);

  // Hair cap sitting on top of head
  const hair = box(0.52, 0.10, 0.52, COLOR_HAIR);
  hair.position.set(0, 1.85, 0);
  group.add(hair);

  // Eyes on front face of head (local -Z face is at z = -0.25)
  const leftEye = box(0.10, 0.08, 0.01, COLOR_EYE);
  leftEye.position.set(-0.11, 1.59, -0.256);
  group.add(leftEye);

  const rightEye = box(0.10, 0.08, 0.01, COLOR_EYE);
  rightEye.position.set(0.11, 1.59, -0.256);
  group.add(rightEye);

  // --- Body (y: 0.70 → 1.30, center 1.00) ---
  const body = box(0.50, 0.60, 0.30, COLOR_SHIRT);
  body.position.set(0, 1.00, 0);
  group.add(body);

  // --- Arms (same Y range as body) ---
  // Body spans x: -0.25 → +0.25; arms attach at ±0.375
  const leftArm = box(0.25, 0.60, 0.25, COLOR_SKIN);
  leftArm.position.set(-0.375, 1.00, 0);
  group.add(leftArm);

  const rightArm = box(0.25, 0.60, 0.25, COLOR_SKIN);
  rightArm.position.set(0.375, 1.00, 0);
  group.add(rightArm);

  // --- Legs (y: 0.00 → 0.70, center 0.35) ---
  const leftLeg = box(0.25, 0.70, 0.25, COLOR_JEANS);
  leftLeg.position.set(-0.125, 0.35, 0);
  group.add(leftLeg);

  const rightLeg = box(0.25, 0.70, 0.25, COLOR_JEANS);
  rightLeg.position.set(0.125, 0.35, 0);
  group.add(rightLeg);

  // Boot accent at the bottom of each leg
  const leftBoot = box(0.27, 0.18, 0.27, COLOR_BOOT);
  leftBoot.position.set(-0.125, 0.09, 0);
  group.add(leftBoot);

  const rightBoot = box(0.27, 0.18, 0.27, COLOR_BOOT);
  rightBoot.position.set(0.125, 0.09, 0);
  group.add(rightBoot);

  group.visible = false;
  return group;
}

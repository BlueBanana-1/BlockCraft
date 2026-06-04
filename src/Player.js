import * as THREE from 'three';
import {
  GRAVITY, JUMP_VELOCITY, MOVE_SPEED, SPRINT_MULT,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_DEPTH, EYE_HEIGHT,
} from './constants.js';
import { isSolid } from './blocks.js';

const HALF_W = PLAYER_WIDTH  / 2;
const HALF_D = PLAYER_DEPTH  / 2;

export class Player {
  constructor(world, controls, camera) {
    this.world    = world;
    this.controls = controls;
    this.camera   = camera;

    this.position = new THREE.Vector3(8, 95, 8);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.yaw   = 0;
    this.pitch = 0;
    this.onGround = false;
  }

  update(dt) {
    this._applyMouseLook();
    this._applyMovement(dt);
    this._applyGravity(dt);
    this._resolveCollisions(dt);
    this._updateCamera();
  }

  _applyMouseLook() {
    const { dx, dy } = this.controls.consumeMouseDeltas();
    if (!this.controls.isLocked) return;
    this.yaw   -= dx * this.controls.sensitivity;
    this.pitch -= dy * this.controls.sensitivity;
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  _applyMovement(dt) {
    const sprint = this.controls.isKeyDown('ShiftLeft') || this.controls.isKeyDown('ShiftRight');
    const speed  = MOVE_SPEED * (sprint ? SPRINT_MULT : 1);

    // Camera at rotation.y=0 looks in -Z direction.
    // Rotating by yaw CCW from above gives:
    //   forward = (-sin(yaw), 0, -cos(yaw))
    //   right   = ( cos(yaw), 0, -sin(yaw))
    const fwdX = -Math.sin(this.yaw), fwdZ = -Math.cos(this.yaw);
    const rtX  =  Math.cos(this.yaw), rtZ  = -Math.sin(this.yaw);

    let mx = 0, mz = 0;
    if (this.controls.isKeyDown('KeyW')) { mx += fwdX; mz += fwdZ; }
    if (this.controls.isKeyDown('KeyS')) { mx -= fwdX; mz -= fwdZ; }
    if (this.controls.isKeyDown('KeyA')) { mx -= rtX;  mz -= rtZ;  }
    if (this.controls.isKeyDown('KeyD')) { mx += rtX;  mz += rtZ;  }

    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 0) { mx /= len; mz /= len; }

    this.velocity.x = mx * speed;
    this.velocity.z = mz * speed;

    if (this.controls.isKeyDown('Space') && this.onGround) {
      this.velocity.y = JUMP_VELOCITY;
      this.onGround = false;
    }
  }

  _applyGravity(dt) {
    this.velocity.y += GRAVITY * dt;
    if (this.velocity.y < -40) this.velocity.y = -40;
  }

  _resolveCollisions(dt) {
    this.onGround = false;

    this.position.x += this.velocity.x * dt;
    this._resolveAxis('x', this.velocity.x);

    this.position.y += this.velocity.y * dt;
    this._resolveAxis('y', this.velocity.y);

    this.position.z += this.velocity.z * dt;
    this._resolveAxis('z', this.velocity.z);
  }

  _resolveAxis(axis, vel) {
    const px = this.position.x, py = this.position.y, pz = this.position.z;

    const minBX = Math.floor(px - HALF_W);
    const maxBX = Math.floor(px + HALF_W);
    const minBY = Math.floor(py);
    const maxBY = Math.floor(py + PLAYER_HEIGHT);
    const minBZ = Math.floor(pz - HALF_D);
    const maxBZ = Math.floor(pz + HALF_D);

    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          if (!isSolid(this.world.getBlock(bx, by, bz))) continue;

          const overlapX = (px + HALF_W > bx) && (bx + 1 > px - HALF_W);
          const overlapY = (py + PLAYER_HEIGHT > by) && (by + 1 > py);
          const overlapZ = (pz + HALF_D > bz) && (bz + 1 > pz - HALF_D);

          if (!overlapX || !overlapY || !overlapZ) continue;

          if (axis === 'x') {
            if (vel > 0) this.position.x = bx - HALF_W - 0.001;
            else         this.position.x = bx + 1 + HALF_W + 0.001;
            this.velocity.x = 0;
          } else if (axis === 'y') {
            if (vel < 0) {
              this.position.y = by + 1;
              this.onGround = true;
            } else {
              this.position.y = by - PLAYER_HEIGHT - 0.001;
            }
            this.velocity.y = 0;
          } else {
            if (vel > 0) this.position.z = bz - HALF_D - 0.001;
            else         this.position.z = bz + 1 + HALF_D + 0.001;
            this.velocity.z = 0;
          }
        }
      }
    }
  }

  _updateCamera() {
    this.camera.position.set(
      this.position.x,
      this.position.y + EYE_HEIGHT,
      this.position.z
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  getLookDirection() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  overlapsAABB(minX, minY, minZ, maxX, maxY, maxZ) {
    const px = this.position.x, py = this.position.y, pz = this.position.z;
    return (
      (px + HALF_W > minX) && (maxX > px - HALF_W) &&
      (py + PLAYER_HEIGHT > minY) && (maxY > py) &&
      (pz + HALF_D > minZ) && (maxZ > pz - HALF_D)
    );
  }
}

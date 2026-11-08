import * as THREE from 'three';

export class Physics {
  constructor(world) {
    this.world = world;
    this.gravity = -24.0;
    this.maxStepHeight = 0.5; // Auto step-climb up to 0.5 blocks (slabs and half-height steps)
  }

  // Resolves AABB collision for an entity moving with velocity over delta time
  moveEntity(entity, dt) {
    if (entity.isFlying) {
      // Free fly mode (Studio editor)
      entity.position.addScaledVector(entity.velocity, dt);
      return;
    }

    // Apply gravity
    entity.velocity.y += this.gravity * dt;
    if (entity.velocity.y < -35) entity.velocity.y = -35;

    const width = entity.width || 0.6;
    const height = entity.height || 1.8;
    const halfW = width / 2;

    // Movement breakdown by axis for clean wall-sliding & step-climbing
    // 1. Move along X with 0.5-Block Step-Climbing
    const dx = entity.velocity.x * dt;
    if (dx !== 0) {
      entity.position.x += dx;
      if (this.checkCollision(entity.position, halfW, height)) {
        let stepped = false;
        if (entity.onGround) {
          const originalY = entity.position.y;
          entity.position.y = originalY + this.maxStepHeight;
          if (!this.checkCollision(entity.position, halfW, height)) {
            let targetY = originalY + this.maxStepHeight;
            for (let testStep = 0.05; testStep <= this.maxStepHeight + 0.01; testStep += 0.05) {
              entity.position.y = originalY + testStep;
              if (!this.checkCollision(entity.position, halfW, height)) {
                targetY = entity.position.y;
                stepped = true;
                break;
              }
            }
            entity.position.y = targetY;
          } else {
            entity.position.y = originalY;
          }
        }

        if (!stepped) {
          entity.position.x -= dx;
          entity.velocity.x = 0;
        }
      }
    }

    // 2. Move along Z with 0.5-Block Step-Climbing
    const dz = entity.velocity.z * dt;
    if (dz !== 0) {
      entity.position.z += dz;
      if (this.checkCollision(entity.position, halfW, height)) {
        let stepped = false;
        if (entity.onGround) {
          const originalY = entity.position.y;
          entity.position.y = originalY + this.maxStepHeight;
          if (!this.checkCollision(entity.position, halfW, height)) {
            let targetY = originalY + this.maxStepHeight;
            for (let testStep = 0.05; testStep <= this.maxStepHeight + 0.01; testStep += 0.05) {
              entity.position.y = originalY + testStep;
              if (!this.checkCollision(entity.position, halfW, height)) {
                targetY = entity.position.y;
                stepped = true;
                break;
              }
            }
            entity.position.y = targetY;
          } else {
            entity.position.y = originalY;
          }
        }

        if (!stepped) {
          entity.position.z -= dz;
          entity.velocity.z = 0;
        }
      }
    }

    // 3. Move along Y
    entity.position.y += entity.velocity.y * dt;
    entity.onGround = false;

    if (this.checkCollision(entity.position, halfW, height)) {
      if (entity.velocity.y < 0) {
        // Landed on floor
        entity.onGround = true;
        // Snap to nearest voxel surface
        entity.position.y = Math.ceil(entity.position.y);
      } else if (entity.velocity.y > 0) {
        // Hit ceiling
        entity.position.y = Math.floor(entity.position.y + height) - height;
      }
      entity.velocity.y = 0;
    }

    // Ground friction when on surface
    if (entity.onGround) {
      entity.velocity.x *= 0.7;
      entity.velocity.z *= 0.7;
    } else {
      entity.velocity.x *= 0.92;
      entity.velocity.z *= 0.92;
    }
  }

  checkCollision(pos, halfW, height) {
    const minX = Math.floor(pos.x - halfW);
    const maxX = Math.floor(pos.x + halfW);
    const minY = Math.floor(pos.y);
    const maxY = Math.floor(pos.y + height);
    const minZ = Math.floor(pos.z - halfW);
    const maxZ = Math.floor(pos.z + halfW);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.world.isSolid(x, y, z)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Knockback impulse applicator
  applyKnockback(entity, sourcePos, strength = 10, verticalBoost = 6) {
    const dir = new THREE.Vector3().subVectors(entity.position, sourcePos);
    dir.y = 0;
    if (dir.lengthSq() < 0.001) {
      dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    }
    dir.normalize();

    entity.velocity.x += dir.x * strength;
    entity.velocity.z += dir.z * strength;
    entity.velocity.y = verticalBoost;
    entity.onGround = false;
  }

  // Launchpad impulse applicator ("Launch Rush" & Map Jump-Pads)
  applyLaunchpadImpulse(entity, forwardDir = null, horizontalPower = 16.0, verticalPower = 18.0) {
    if (forwardDir && (forwardDir.x !== 0 || forwardDir.z !== 0)) {
      const hDir = new THREE.Vector3(forwardDir.x, 0, forwardDir.z).normalize();
      entity.velocity.x = hDir.x * horizontalPower;
      entity.velocity.z = hDir.z * horizontalPower;
    }
    entity.velocity.y = verticalPower;
    entity.onGround = false;
  }
}

import * as THREE from 'three';
import { BLOCK_TYPES } from './VoxelWorld.js';

/**
 * HeldItemRenderer
 *
 * Dedicated first-person held-item renderer attached to the camera viewport.
 * Provides authentic Minecraft-fidelity 3D extruded voxel models for weapons/tools/blocks,
 * walking bobbing motion, 220ms downward attack swing animation, and custom purple
 * scrolling GLSL enchantment glint shader for enchanted items.
 * Headless-safe for Node.js test environments.
 */
export class HeldItemRenderer {
  constructor(camera, canvas = null) {
    this.camera = camera;
    this.canvas = canvas;

    // Viewport camera attachment group
    this.itemGroup = new THREE.Group();
    this.itemGroup.name = 'HeldItemGroup';
    if (this.camera) {
      this.camera.add(this.itemGroup);
    }

    // Default resting transform (bottom-right viewport)
    this.basePos = new THREE.Vector3(0.35, -0.3, -0.6);
    this.baseRot = new THREE.Euler(0.1, -0.35, 0.15, 'YXZ');
    this.itemGroup.position.copy(this.basePos);
    this.itemGroup.rotation.copy(this.baseRot);

    // Current item state
    this.currentSlotItem = null;
    this.currentMesh = null;
    this.isEnchanted = false;
    this.playerTeam = 'red';

    // Animation state
    this.isSwinging = false;
    this.swingProgress = 0;
    this.swingTime = 0;
    this.swingDuration = 0.22; // Authentic 220ms Minecraft attack swing

    this.equipProgress = 1.0;
    this.idleTime = 0;
    this.lastWalkCycle = 0;

    // Shared glint uniforms for animated purple scrolling sheen
    this.glintUniforms = {
      uTime: { value: 0 },
      uGlintColor: { value: new THREE.Color(0.68, 0.25, 0.98) },
    };

    // Shared reusable geometries and materials cache
    this.geoCache = new Map();
    this.matCache = new Map();

    // Initial render with fist/arm
    this.rebuildMesh(null, false, 'red');
  }

  /**
   * Create or retrieve material with purple scrolling enchantment glint if enchanted.
   */
  getMaterial(colorHex, isEnchanted = false, metalness = 0.2, roughness = 0.5) {
    const key = `${colorHex}_${isEnchanted ? 'enc' : 'std'}`;
    if (this.matCache.has(key)) {
      return this.matCache.get(key);
    }

    let mat;
    if (isEnchanted) {
      // GLSL custom purple scrolling enchantment glint shader
      mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: this.glintUniforms.uTime,
          uBaseColor: { value: new THREE.Color(colorHex) },
          uGlintColor: this.glintUniforms.uGlintColor,
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uBaseColor;
          uniform vec3 uGlintColor;
          varying vec2 vUv;
          varying vec3 vNormal;
          void main() {
            vec3 lightDir = normalize(vec3(0.5, 1.0, 0.7));
            float diff = max(dot(vNormal, lightDir), 0.35);
            vec3 base = uBaseColor * diff;

            // Dual diagonal scrolling waves
            vec2 uv1 = vUv * 2.0 + vec2(uTime * 0.2, uTime * 0.2);
            vec2 uv2 = vUv * 1.5 - vec2(uTime * 0.14, -uTime * 0.14);
            float wave1 = sin(uv1.x * 10.0 + uv1.y * 10.0) * 0.5 + 0.5;
            float wave2 = cos(uv2.x * 8.0 - uv2.y * 8.0) * 0.5 + 0.5;
            float glint = pow(wave1 * wave2, 1.4) * 0.85;

            vec3 purpleGlint = uGlintColor * glint;
            gl_FragColor = vec4(base + purpleGlint, 1.0);
          }
        `,
      });
      mat.color = new THREE.Color(colorHex);
      mat.isEnchanted = true;
    } else {
      mat = new THREE.MeshLambertMaterial({ color: colorHex });
      mat.isEnchanted = false;
    }

    this.matCache.set(key, mat);
    return mat;
  }

  /**
   * Set currently held item and trigger equip dip if item changed.
   */
  setHeldItem(item, isEnchanted = false, playerTeam = 'red') {
    const isSameItem = (
      this.currentSlotItem?.id === item?.id &&
      this.currentSlotItem?.blockType === item?.blockType &&
      this.currentSlotItem?.type === item?.type &&
      this.isEnchanted === isEnchanted &&
      this.playerTeam === playerTeam
    );

    if (isSameItem && this.currentMesh) {
      return;
    }

    this.currentSlotItem = item ? { ...item } : null;
    this.isEnchanted = isEnchanted;
    this.playerTeam = playerTeam;

    this.rebuildMesh(item, isEnchanted, playerTeam);
    this.equipProgress = 0.0; // Trigger equip dip animation
  }

  /**
   * Trigger 220ms authentic downward Minecraft attack swing.
   */
  triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
    this.swingTime = 0;
  }

  /**
   * Rebuild 3D mesh model based on item type and enchantment state.
   */
  rebuildMesh(item, isEnchanted = false, playerTeam = 'red') {
    // Clear old children
    while (this.itemGroup.children.length > 0) {
      this.itemGroup.remove(this.itemGroup.children[0]);
    }

    const meshGroup = new THREE.Group();

    if (!item || item.id === 'fist') {
      // 1. Bare arm / Fist
      this.buildFistArm(meshGroup, playerTeam);
    } else if (item.type === 'weapon' || item.id?.includes('sword')) {
      // 2. 3D Extruded Sword
      const tier = this.resolveItemTier(item.id, 'wooden');
      this.buildSword(meshGroup, tier, isEnchanted);
    } else if (item.type === 'tool' && item.id?.includes('pickaxe')) {
      // 3. 3D Extruded Pickaxe
      const tier = this.resolveItemTier(item.id, 'iron');
      this.buildPickaxe(meshGroup, tier, isEnchanted);
    } else if (item.id === 'shears') {
      // 4. 3D Extruded Shears
      this.buildShears(meshGroup, isEnchanted);
    } else if (item.type === 'block' || item.blockType !== undefined) {
      // 5. 3D Mini-block
      this.buildMiniBlock(meshGroup, item.blockType, isEnchanted);
    } else {
      // 6. Generic items (Golden Apple, Fireball, Ender Pearl, etc.)
      this.buildGenericItem(meshGroup, item, isEnchanted);
    }

    this.currentMesh = meshGroup;
    this.itemGroup.add(meshGroup);
  }

  resolveItemTier(itemId, defaultTier = 'iron') {
    if (!itemId) return defaultTier;
    const lower = itemId.toLowerCase();
    if (lower.includes('diamond')) return 'diamond';
    if (lower.includes('iron')) return 'iron';
    if (lower.includes('gold')) return 'gold';
    if (lower.includes('stone')) return 'stone';
    if (lower.includes('wood')) return 'wooden';
    return defaultTier;
  }

  getTierColor(tier) {
    switch (tier) {
      case 'diamond': return 0x22d3ee;
      case 'iron': return 0xd1d5db;
      case 'gold': return 0xfacc15;
      case 'stone': return 0x78716c;
      case 'wooden':
      default: return 0x8b5a2b;
    }
  }

  /**
   * Build authentic 3D bare player arm / fist
   */
  buildFistArm(group, team = 'red') {
    const teamColors = {
      red: 0xef4444,
      blue: 0x3b82f6,
      green: 0x22c55e,
      yellow: 0xeab308,
      white: 0xf8fafc,
      aqua: 0x06b6d4,
      pink: 0xec4899,
      gray: 0x64748b,
    };
    const sleeveColor = teamColors[team] || 0xef4444;
    const skinColor = 0xd4a373;

    // Upper sleeve
    const sleeveGeo = new THREE.BoxGeometry(0.16, 0.26, 0.16);
    const sleeveMat = this.getMaterial(sleeveColor, false);
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve.position.set(0, -0.06, 0);
    group.add(sleeve);

    // Forearm / Fist skin
    const skinGeo = new THREE.BoxGeometry(0.15, 0.22, 0.15);
    const skinMat = this.getMaterial(skinColor, false);
    const skin = new THREE.Mesh(skinGeo, skinMat);
    skin.position.set(0, 0.12, 0);
    group.add(skin);

    group.rotation.set(0.3, -0.2, 0.1);
  }

  /**
   * Build 3D extruded voxel sword (Pommel, Handle, Crossguard, Blade, Tip)
   */
  buildSword(group, tier, isEnchanted) {
    const bladeColor = this.getTierColor(tier);
    const woodColor = 0x5c3a21;
    const guardColor = tier === 'wooden' ? 0x3e2716 : 0x475569;

    const bladeMat = this.getMaterial(bladeColor, isEnchanted);
    const woodMat = this.getMaterial(woodColor, false);
    const guardMat = this.getMaterial(guardColor, isEnchanted);

    // Pommel
    const pommelGeo = new THREE.BoxGeometry(0.05, 0.04, 0.05);
    const pommel = new THREE.Mesh(pommelGeo, woodMat);
    pommel.position.set(0, -0.22, 0);
    group.add(pommel);

    // Handle
    const handleGeo = new THREE.BoxGeometry(0.04, 0.14, 0.04);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.position.set(0, -0.13, 0);
    group.add(handle);

    // Crossguard
    const guardGeo = new THREE.BoxGeometry(0.18, 0.04, 0.06);
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0, -0.04, 0);
    group.add(guard);

    // Main Blade
    const bladeGeo = new THREE.BoxGeometry(0.08, 0.44, 0.03);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.2, 0);
    group.add(blade);

    // Pointed Blade Tip
    const tipGeo = new THREE.BoxGeometry(0.055, 0.08, 0.026);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.set(0, 0.44, 0);
    group.add(tip);

    // Orientation: tilted forward and inward like Minecraft first-person view
    group.rotation.set(0.2, -0.25, 0.15);
    group.scale.set(1.1, 1.1, 1.1);
  }

  /**
   * Build 3D extruded voxel pickaxe (Handle, Arch Head)
   */
  buildPickaxe(group, tier, isEnchanted) {
    const headColor = this.getTierColor(tier);
    const woodColor = 0x5c3a21;

    const headMat = this.getMaterial(headColor, isEnchanted);
    const woodMat = this.getMaterial(woodColor, false);

    // Handle
    const handleGeo = new THREE.BoxGeometry(0.038, 0.52, 0.038);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.position.set(0, 0.06, 0);
    group.add(handle);

    // Central connector
    const centerGeo = new THREE.BoxGeometry(0.08, 0.06, 0.06);
    const center = new THREE.Mesh(centerGeo, headMat);
    center.position.set(0, 0.32, 0);
    group.add(center);

    // Left curved pick head
    const leftArmGeo = new THREE.BoxGeometry(0.12, 0.05, 0.045);
    const leftArm = new THREE.Mesh(leftArmGeo, headMat);
    leftArm.position.set(-0.09, 0.30, 0);
    leftArm.rotation.z = 0.25;
    group.add(leftArm);

    const leftTipGeo = new THREE.BoxGeometry(0.04, 0.05, 0.04);
    const leftTip = new THREE.Mesh(leftTipGeo, headMat);
    leftTip.position.set(-0.16, 0.25, 0);
    leftTip.rotation.z = 0.55;
    group.add(leftTip);

    // Right curved pick head
    const rightArmGeo = new THREE.BoxGeometry(0.12, 0.05, 0.045);
    const rightArm = new THREE.Mesh(rightArmGeo, headMat);
    rightArm.position.set(0.09, 0.30, 0);
    rightArm.rotation.z = -0.25;
    group.add(rightArm);

    const rightTipGeo = new THREE.BoxGeometry(0.04, 0.05, 0.04);
    const rightTip = new THREE.Mesh(rightTipGeo, headMat);
    rightTip.position.set(0.16, 0.25, 0);
    rightTip.rotation.z = -0.55;
    group.add(rightTip);

    group.rotation.set(0.15, -0.3, 0.2);
    group.scale.set(1.05, 1.05, 1.05);
  }

  /**
   * Build 3D extruded voxel shears (Twin crossing blades with handle loops)
   */
  buildShears(group, isEnchanted) {
    const metalMat = this.getMaterial(0xd1d5db, isEnchanted);
    const darkMat = this.getMaterial(0x334155, false);

    // Left blade & handle
    const leftBladeGeo = new THREE.BoxGeometry(0.04, 0.28, 0.025);
    const leftBlade = new THREE.Mesh(leftBladeGeo, metalMat);
    leftBlade.position.set(-0.04, 0.1, 0);
    leftBlade.rotation.z = 0.22;
    group.add(leftBlade);

    // Right blade & handle
    const rightBladeGeo = new THREE.BoxGeometry(0.04, 0.28, 0.025);
    const rightBlade = new THREE.Mesh(rightBladeGeo, metalMat);
    rightBlade.position.set(0.04, 0.1, 0);
    rightBlade.rotation.z = -0.22;
    group.add(rightBlade);

    // Central pivot rivet
    const rivetGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const rivet = new THREE.Mesh(rivetGeo, darkMat);
    rivet.position.set(0, 0.02, 0);
    group.add(rivet);

    group.rotation.set(0.2, -0.2, 0.1);
    group.scale.set(1.1, 1.1, 1.1);
  }

  /**
   * Build 3D mini-block cube
   */
  buildMiniBlock(group, blockType, isEnchanted) {
    const blockColor = this.resolveBlockColor(blockType);
    const mat = this.getMaterial(blockColor, isEnchanted);
    const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const block = new THREE.Mesh(geo, mat);
    block.position.set(0, 0.08, 0);
    block.rotation.set(0.2, 0.4, 0);
    group.add(block);
  }

  resolveBlockColor(blockType) {
    switch (blockType) {
      case BLOCK_TYPES.WOOL_RED: return 0xef4444;
      case BLOCK_TYPES.WOOL_BLUE: return 0x3b82f6;
      case BLOCK_TYPES.WOOL_GREEN: return 0x22c55e;
      case BLOCK_TYPES.WOOL_YELLOW: return 0xeab308;
      case BLOCK_TYPES.WOOL_AQUA: return 0x06b6d4;
      case BLOCK_TYPES.WOOL_WHITE: return 0xf8fafc;
      case BLOCK_TYPES.WOOL_PINK: return 0xec4899;
      case BLOCK_TYPES.WOOL_GRAY: return 0x64748b;
      case BLOCK_TYPES.WOOD: return 0x92400e;
      case BLOCK_TYPES.STONE_BRICKS: return 0x64748b;
      case BLOCK_TYPES.OBSIDIAN: return 0x1e1b4b;
      case BLOCK_TYPES.END_STONE: return 0xfef08a;
      case BLOCK_TYPES.LUCKY_BLOCK: return 0xf59e0b;
      case BLOCK_TYPES.STONE: return 0x78716c;
      default: return 0xef4444;
    }
  }

  /**
   * Build generic consumable or special items
   */
  buildGenericItem(group, item, isEnchanted) {
    const id = item.id || '';
    if (id.includes('apple')) {
      // Golden Apple
      const appleMat = this.getMaterial(0xfacc15, true);
      const stemMat = this.getMaterial(0x5c3a21, false);
      const leafMat = this.getMaterial(0x22c55e, false);

      const bodyGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
      const body = new THREE.Mesh(bodyGeo, appleMat);
      body.position.set(0, 0.05, 0);
      group.add(body);

      const stemGeo = new THREE.BoxGeometry(0.03, 0.06, 0.03);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(0, 0.16, 0);
      group.add(stem);

      const leafGeo = new THREE.BoxGeometry(0.04, 0.03, 0.04);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(0.03, 0.16, 0);
      group.add(leaf);
    } else if (id.includes('pearl')) {
      // Ender Pearl
      const pearlMat = this.getMaterial(0x0f766e, true);
      const geo = new THREE.OctahedronGeometry(0.12, 0);
      const pearl = new THREE.Mesh(geo, pearlMat);
      pearl.position.set(0, 0.08, 0);
      group.add(pearl);
    } else if (id.includes('fireball')) {
      // Fireball
      const fireMat = this.getMaterial(0xf97316, true);
      const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
      const fb = new THREE.Mesh(geo, fireMat);
      fb.position.set(0, 0.08, 0);
      group.add(fb);
    } else {
      // Default fallback item
      const mat = this.getMaterial(0x94a3b8, isEnchanted);
      const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0.08, 0);
      group.add(mesh);
    }
    group.rotation.set(0.2, -0.2, 0.1);
  }

  /**
   * Main per-frame update loop.
   * Handles enchantment glint scrolling, walking bobbing, equip dip, and 220ms attack swing curve.
   */
  update(dt, player) {
    // 1. Advance purple scrolling glint shader timer
    this.glintUniforms.uTime.value += dt;

    // 2. Equip dip animation
    if (this.equipProgress < 1.0) {
      this.equipProgress = Math.min(1.0, this.equipProgress + dt * 6.0);
    }
    const equipDip = (1.0 - Math.sin(this.equipProgress * Math.PI * 0.5)) * -0.22;

    // 3. Walking bobbing motion driven by player movement speed
    const walkCycle = player?.walkCycle || 0;
    const vel = player?.velocity;
    const speed = vel ? Math.hypot(vel.x || 0, vel.z || 0) : 0;
    const onGround = player?.onGround !== false;
    const isMoving = onGround && (vel ? speed > 0.1 : Math.abs(walkCycle - this.lastWalkCycle) > 0.001);
    this.lastWalkCycle = walkCycle;
    this.idleTime += dt;

    const speedFactor = Math.min(1.4, Math.max(0.4, speed / 4.8));
    const bobX = isMoving ? Math.cos(walkCycle * 0.5) * 0.022 * speedFactor : 0;
    const bobY = isMoving ? Math.abs(Math.sin(walkCycle)) * 0.028 * speedFactor : Math.sin(this.idleTime * 2.0) * 0.003;
    const bobRotZ = isMoving ? Math.cos(walkCycle * 0.5) * 0.03 * speedFactor : 0;
    const bobRotX = isMoving ? Math.sin(walkCycle) * 0.015 * speedFactor : 0;

    // 4. Authentic 220ms downward Minecraft attack swing animation
    let swingRotX = 0;
    let swingRotY = 0;
    let swingRotZ = 0;
    let swingPosY = 0;
    let swingPosX = 0;

    if (this.isSwinging) {
      this.swingTime += dt;
      this.swingProgress = Math.min(1.0, this.swingTime / this.swingDuration);

      if (this.swingProgress >= 1.0) {
        this.isSwinging = false;
        this.swingProgress = 0;
        this.swingTime = 0;
      } else {
        // Smooth sine curve: sweeps downward and inward across viewport, then returns
        const swingCurve = Math.sin(this.swingProgress * Math.PI);
        swingRotX = -swingCurve * 1.1; // Downward slash
        swingRotY = -swingCurve * 0.5; // Inward sweep
        swingRotZ = swingCurve * 0.4;  // Blade tilt
        swingPosY = -swingCurve * 0.12; // Downward dip
        swingPosX = -swingCurve * 0.06; // Inward tuck
      }
    }

    // 5. Composite transforms onto camera-attached itemGroup
    this.itemGroup.position.set(
      this.basePos.x + bobX + swingPosX,
      this.basePos.y + bobY + equipDip + swingPosY,
      this.basePos.z
    );

    this.itemGroup.rotation.set(
      this.baseRot.x + bobRotX + swingRotX,
      this.baseRot.y + swingRotY,
      this.baseRot.z + bobRotZ + swingRotZ,
      'YXZ'
    );
  }

  destroy() {
    if (this.camera && this.itemGroup) {
      this.camera.remove(this.itemGroup);
    }
    this.matCache.clear();
    this.geoCache.clear();
  }
}

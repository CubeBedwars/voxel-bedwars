import * as THREE from 'three';

function createBeveledIngotGeometry() {
  // 3D beveled rectangular ingot bar (trapezoidal prism)
  // Base: w=0.28, l=0.52, h=0.14. Top: w=0.20, l=0.44
  const w1 = 0.14, l1 = 0.26, y1 = -0.07;
  const w2 = 0.10, l2 = 0.22, y2 = 0.07;
  const vertices = [
    // Bottom face
    -w1, y1, -l1,   w1, y1, -l1,   w1, y1,  l1,
    -w1, y1, -l1,   w1, y1,  l1,  -w1, y1,  l1,
    // Top face
    -w2, y2, -l2,   w2, y2,  l2,   w2, y2, -l2,
    -w2, y2, -l2,  -w2, y2,  l2,   w2, y2,  l2,
    // Front (+Z)
    -w1, y1,  l1,   w1, y1,  l1,   w2, y2,  l2,
    -w1, y1,  l1,   w2, y2,  l2,  -w2, y2,  l2,
    // Back (-Z)
     w1, y1, -l1,  -w1, y1, -l1,  -w2, y2, -l2,
     w1, y1, -l1,  -w2, y2, -l2,   w2, y2, -l2,
    // Right (+X)
     w1, y1,  l1,   w1, y1, -l1,   w2, y2, -l2,
     w1, y1,  l1,   w2, y2, -l2,   w2, y2,  l2,
    // Left (-X)
    -w1, y1, -l1,  -w1, y1,  l1,  -w2, y2,  l2,
    -w1, y1, -l1,  -w2, y2,  l2,  -w2, y2, -l2,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return geo;
}

function toRoman(num) {
  switch (num) {
    case 1: return 'I';
    case 2: return 'II';
    case 3: return 'III';
    case 4: return 'IV';
    default: return String(num);
  }
}

export class GeneratorManager {
  constructor(scene, sound) {
    this.scene = scene;
    this.sound = sound;
    this.spawners = [];
    this.items = []; // Active floating drops

    // 3D Voxel drop geometries (beveled rectangular ingots and faceted gems)
    this.dropGeos = {
      iron: createBeveledIngotGeometry(),
      gold: createBeveledIngotGeometry(),
      diamond: new THREE.OctahedronGeometry(0.24, 0),
      emerald: new THREE.IcosahedronGeometry(0.22, 0),
    };

    // Upgraded standard materials with metalness, roughness & flatShading for distinct facets
    this.dropMats = {
      iron: new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.25,
        metalness: 0.85,
        flatShading: true,
      }),
      gold: new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.2,
        metalness: 0.9,
        emissive: 0x332200,
        flatShading: true,
      }),
      diamond: new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        roughness: 0.1,
        metalness: 0.6,
        emissive: 0x004455,
        flatShading: true,
      }),
      emerald: new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.1,
        metalness: 0.6,
        emissive: 0x004422,
        flatShading: true,
      }),
    };
  }

  /**
   * Create dynamic billboard sprite hologram with 2D canvas texture
   */
  createHologramSprite(title, titleColor = '#ffffff') {
    let canvas = null;
    let ctx = null;
    let texture = null;

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 80;
      ctx = canvas.getContext('2d');
      if (ctx) {
        texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
      }
    }

    const mat = texture
      ? new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
      : new THREE.SpriteMaterial({ transparent: true, opacity: 0 });

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 0.75, 1.0);

    return {
      sprite,
      canvas,
      ctx,
      texture,
      title,
      titleColor,
      lastSec: -1,
      lastTitle: '',
    };
  }

  /**
   * Render dynamic title and countdown text to canvas
   */
  updateHologram(holo, remainingSec, currentTitle = null) {
    if (!holo) return;
    const displayTitle = currentTitle || holo.title;
    const sec = Math.max(0, Math.ceil(remainingSec));

    if (sec === holo.lastSec && displayTitle === holo.lastTitle) {
      return;
    }
    holo.lastSec = sec;
    holo.lastTitle = displayTitle;

    const { ctx, canvas, texture, titleColor } = holo;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background pill badge with safe roundRect fallback
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = titleColor || '#94a3b8';
    ctx.lineWidth = 2.5;

    const rx = 8, ry = 6, rw = canvas.width - 16, rh = canvas.height - 12, rad = 10;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, rad);
      ctx.fill();
      ctx.stroke();
    } else if (typeof ctx.rect === 'function') {
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.fill();
      ctx.stroke();
    } else {
      if (typeof ctx.fillRect === 'function') ctx.fillRect(rx, ry, rw, rh);
      if (typeof ctx.strokeRect === 'function') ctx.strokeRect(rx, ry, rw, rh);
    }

    // Title text (e.g. "Base Gen", "Diamond II")
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = titleColor || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayTitle, canvas.width / 2, 28);

    // Countdown text (e.g. "Spawns in 03s")
    const secStr = String(sec).padStart(2, '0');
    ctx.font = '600 18px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`Spawns in ${secStr}s`, canvas.width / 2, 54);

    if (texture) {
      texture.needsUpdate = true;
    }
  }

  loadSpawners(generatorConfigs) {
    this.clear();
    for (const cfg of generatorConfigs) {
      let title = 'Generator';
      let titleColor = '#ffffff';

      if (cfg.type === 'forge') {
        title = cfg.name || (cfg.team ? `${cfg.team.toUpperCase()} Base Gen` : 'Base Gen');
        titleColor = '#facc15';
      } else if (cfg.type === 'diamond') {
        title = cfg.name || (cfg.tier ? `Diamond ${toRoman(cfg.tier)}` : 'Diamond Gen');
        titleColor = '#22d3ee';
      } else if (cfg.type === 'emerald') {
        title = cfg.name || (cfg.tier ? `Emerald ${toRoman(cfg.tier)}` : 'Emerald Gen');
        titleColor = '#10b981';
      }

      // Create floating 3D spawner hologram
      const holo = this.createHologramSprite(title, titleColor);
      holo.sprite.position.set(cfg.pos.x, cfg.pos.y + 2.2, cfg.pos.z);
      this.scene.add(holo.sprite);

      const sp = {
        ...cfg,
        timer: Math.random() * cfg.interval, // stagger starts
        hologram: holo,
      };

      // Initial draw
      this.updateHologram(holo, cfg.interval, title);
      this.spawners.push(sp);
    }
  }

  spawnDrop(type, pos) {
    const geo = this.dropGeos[type] || this.dropGeos.iron;
    const mat = this.dropMats[type] || this.dropMats.iron;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      pos.x + (Math.random() - 0.5) * 0.4,
      pos.y + 0.6,
      pos.z + (Math.random() - 0.5) * 0.4
    );
    // Slight initial tilt for faceted reflection
    mesh.rotation.set(0.25, Math.random() * Math.PI * 2, 0.15);
    this.scene.add(mesh);

    this.items.push({
      type,
      mesh,
      spawnY: mesh.position.y,
      age: 0,
    });
  }

  update(dt, players, teamManager) {
    // 1. Progress spawner timers and update floating holograms
    for (const sp of this.spawners) {
      let interval = sp.interval;
      let currentTitle = sp.hologram?.title;

      if (sp.type === 'forge') {
        const tier = (sp.team && teamManager)
          ? (teamManager.teams[sp.team]?.upgrades?.forgeTier || 1)
          : 1;
        interval /= tier;
        currentTitle = tier > 1 ? `Base Gen ${toRoman(tier)}` : 'Base Gen';
      } else if (sp.type === 'diamond') {
        const diaTier = sp.tier || 1;
        currentTitle = diaTier > 1 ? `Diamond ${toRoman(diaTier)}` : (sp.name || 'Diamond Gen');
      } else if (sp.type === 'emerald') {
        const emeTier = sp.tier || 1;
        currentTitle = emeTier > 1 ? `Emerald ${toRoman(emeTier)}` : (sp.name || 'Emerald Gen');
      }

      sp.timer += dt;

      // Update hologram live countdown
      if (sp.hologram) {
        const remaining = Math.max(0, interval - sp.timer);
        this.updateHologram(sp.hologram, remaining, currentTitle);
      }

      if (sp.timer >= interval) {
        sp.timer = 0;
        if (sp.type === 'forge') {
          // Iron drops every cycle, Gold every 4th cycle
          this.spawnDrop('iron', sp.pos);
          if (Math.random() > 0.65) {
            this.spawnDrop('gold', sp.pos);
          }
        } else if (sp.type === 'diamond') {
          this.spawnDrop('diamond', sp.pos);
        } else if (sp.type === 'emerald') {
          this.spawnDrop('emerald', sp.pos);
        }
      }
    }

    // 2. Animate and check magnetic pickup for floating 3D items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.age += dt;

      // Spin & bob animation with 3D faceted tilt
      item.mesh.rotation.y += 3.0 * dt;
      item.mesh.position.y = item.spawnY + Math.sin(item.age * 4.0) * 0.15;

      // Check proximity to living players / bots
      let collected = false;
      for (const p of players) {
        if (p.isDead) continue;
        const dist = p.position.distanceTo(item.mesh.position);
        if (dist < 2.4) {
          // Magnetic pull towards player
          item.mesh.position.lerp(p.position, dt * 10);
          if (dist < 1.0) {
            // Collect into inventory
            p.addResource(item.type, 1);
            if ((p.isLocal || p.isLocalPlayer) && this.sound) {
              this.sound.playItemPickup();
            }
            this.scene.remove(item.mesh);
            this.items.splice(i, 1);
            collected = true;
            break;
          }
        }
      }

      // Max item age = 120s
      if (!collected && item.age > 120) {
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    for (const sp of this.spawners) {
      if (sp.hologram?.sprite) {
        this.scene.remove(sp.hologram.sprite);
      }
    }
    for (const item of this.items) {
      this.scene.remove(item.mesh);
    }
    this.items = [];
    this.spawners = [];
  }
}

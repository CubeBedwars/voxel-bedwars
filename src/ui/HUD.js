import { SHOP_ITEMS, TEAM_UPGRADES, SHOP_CATEGORIES } from '../game/ShopManager.js';

/**
 * Calculates armor defense points according to Minecraft / Hypixel Bedwars tiers:
 * - None: 0 points (0 chestplates)
 * - Chainmail: 12 points (6 chestplates)
 * - Iron: 15 points (7.5 chestplates: 7 full, 1 half, 2 empty)
 * - Diamond: 20 points (10 chestplates)
 * @param {string} tier
 * @returns {number} Defense points (0 - 20)
 */
export function calculateArmorDefensePoints(tier) {
  if (!tier) return 0;
  const t = String(tier).toLowerCase().trim();
  switch (t) {
    case 'diamond': return 20;
    case 'iron': return 15;
    case 'chainmail': return 12;
    default: return 0;
  }
}

/**
 * Formats the next Bedwars scheduled event countdown.
 * @param {number} matchTime In seconds
 * @returns {string} E.g. "Diamond II in 03:45"
 */
export function formatNextEvent(matchTime) {
  const events = [
    { name: 'Diamond II', time: 240 },       // 04:00
    { name: 'Emerald II', time: 480 },       // 08:00
    { name: 'Diamond III', time: 720 },      // 12:00
    { name: 'Emerald III', time: 960 },      // 16:00
    { name: 'Bed Destruction', time: 1200 }, // 20:00
    { name: 'Sudden Death', time: 1500 },    // 25:00
  ];
  for (const ev of events) {
    if (matchTime < ev.time) {
      const rem = Math.max(0, Math.ceil(ev.time - matchTime));
      const m = Math.floor(rem / 60);
      const s = rem % 60;
      return `${ev.name} in ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  }
  return 'Game End';
}

export class HUD {
  constructor(gameManager) {
    this.gm = gameManager;
    this.activeShopCategory = 'recommended';

    // DOM Elements
    this.hudEl = document.getElementById('hud');
    this.bedTrackerEl = document.getElementById('hud-team-tracker');
    this.resIronEl = document.getElementById('res-iron-val');
    this.resGoldEl = document.getElementById('res-gold-val');
    this.resDiaEl = document.getElementById('res-dia-val');
    this.resEmeEl = document.getElementById('res-eme-val');
    this.healthHeartsEl = document.getElementById('health-hearts');
    this.damageFlashEl = document.getElementById('damage-flash');
    this.armorNameEl = document.getElementById('armor-name');
    this.hotbarEl = document.getElementById('hotbar');

    // Authentic Vitals Elements
    this.armorBarEl = document.getElementById('armor-bar');
    this.hungerBarEl = document.getElementById('hunger-bar');
    this.hudXpContainerEl = document.getElementById('hud-xp-container');
    this.hudXpLevelEl = document.getElementById('hud-xp-level');
    this.hudXpFillEl = document.getElementById('hud-xp-fill');
    this.btnQuickShopEl = document.getElementById('btn-quick-shop');
    this.hitmarkerEl = document.getElementById('hitmarker');

    // Scoreboard Elements
    this.sbModeBadgeEl = document.getElementById('sb-mode-badge');
    this.sbTeamBedsEl = document.getElementById('sb-team-beds');
    this.sbDateEl = document.getElementById('sb-date');
    this.sbServerEl = document.getElementById('sb-server');
    this.sbMapNameEl = document.getElementById('sb-map-name');
    this.sbMutationNameEl = document.getElementById('sb-mutation-name');
    this.sbEventTimerEl = document.getElementById('sb-event-timer');
    this.statKillsEl = document.getElementById('stat-kills');
    this.statFinalEl = document.getElementById('stat-final-kills');
    this.statBedsEl = document.getElementById('stat-beds');
    this.statRatingEl = document.getElementById('stat-rating');
    this.statLevelEl = document.getElementById('stat-level');
    this.statTimerEl = document.getElementById('stat-timer');

    // Modals & Overlays
    this.shopModal = document.getElementById('shop-modal');
    this.upgradesModal = document.getElementById('upgrades-modal');
    this.respawnOverlay = document.getElementById('respawn-overlay');
    this.respawnTimerEl = document.getElementById('respawn-timer-val');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.goStatRatingEl = document.getElementById('go-stat-rating');
    this.goStatXpEl = document.getElementById('go-stat-xp');
    this.goStatFinalsEl = document.getElementById('go-stat-finals');
    this.goStatBedsEl = document.getElementById('go-stat-beds');

    this.announceBanner = document.getElementById('announcement-banner');
    this.announceTitle = document.getElementById('announce-title');
    this.announceSubtitle = document.getElementById('announce-subtitle');

    // Network Status Elements
    this.hudNetBadgeEl = document.getElementById('hud-net-badge');
    this.hudNetTextEl = document.getElementById('hud-net-text');
    this.multiActiveTransportEl = document.getElementById('multi-active-transport');
    this.lanStatusMsgEl = document.getElementById('lan-status-msg');
    this.lanGamesListEl = document.getElementById('lan-games-list');
    this.lanDiscoveryCountEl = document.getElementById('lan-discovery-count');
    this.btnToggleTouchEl = document.getElementById('btn-toggle-touch');

    if (this.btnToggleTouchEl) {
      this.btnToggleTouchEl.addEventListener('click', (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (this.gm && this.gm.touchControls) {
          const active = this.gm.touchControls.toggle();
          this.btnToggleTouchEl.classList.toggle('active', active);
        }
      });
    }

    if (this.btnQuickShopEl) {
      this.btnQuickShopEl.addEventListener('click', (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (this.gm && typeof this.gm.toggleQuickShop === 'function') {
          this.gm.toggleQuickShop();
        } else {
          this.openShop();
        }
      });
    }

    // Ensure initial hidden state in mock environments matching index.html
    this.shopModal?.classList.add('hidden');
    this.upgradesModal?.classList.add('hidden');
    this.hitmarkerEl?.classList.add('hidden');

    this.initHotbarSlots();
    this.initShop();
    this.initUpgrades();
    this.initNetworkUI();
  }

  show() {
    this.hudEl?.classList.remove('hidden');
    document.getElementById('crosshair')?.classList.remove('hidden');
    if (this.gm?.touchControls?.isEnabled) {
      this.gm.touchControls.container?.classList.remove('hidden');
    }
    if (this.btnToggleTouchEl && this.gm?.touchControls) {
      this.btnToggleTouchEl.classList.toggle('active', this.gm.touchControls.isEnabled);
    }
  }

  hide() {
    this.hudEl?.classList.add('hidden');
    document.getElementById('crosshair')?.classList.add('hidden');
    this.gm?.touchControls?.container?.classList.add('hidden');
  }

  triggerDamageFlash() {
    if (this.damageFlashEl) {
      this.damageFlashEl.classList.remove('flash-active');
      void this.damageFlashEl.offsetWidth; // trigger DOM reflow
      this.damageFlashEl.classList.add('flash-active');
      setTimeout(() => {
        this.damageFlashEl.classList.remove('flash-active');
      }, 350);
    }
    if (this.healthHeartsEl) {
      this.healthHeartsEl.classList.remove('damage-shake');
      void this.healthHeartsEl.offsetWidth;
      this.healthHeartsEl.classList.add('damage-shake');
      setTimeout(() => {
        this.healthHeartsEl.classList.remove('damage-shake');
      }, 350);
    }
  }

  /**
   * Triggers the 4-tick hitmarker crosshair animation expanding and fading on hit.
   */
  triggerHitmarker() {
    const hm = this.hitmarkerEl || document.getElementById('hitmarker');
    if (!hm) return;
    hm.classList.remove('hidden');
    hm.classList.remove('hit-active');
    if (typeof hm.offsetWidth === 'number') {
      void hm.offsetWidth; // trigger DOM reflow
    }
    hm.classList.add('hit-active');
    if (this._hitmarkerTimeout) clearTimeout(this._hitmarkerTimeout);
    this._hitmarkerTimeout = setTimeout(() => {
      hm.classList.remove('hit-active');
      hm.classList.add('hidden');
    }, 180);
  }

  initHotbarSlots() {
    if (!this.hotbarEl) return;
    this.hotbarEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = `slot ${i === 0 ? 'active' : ''}`;
      slot.dataset.index = i;

      const slotNum = document.createElement('span');
      slotNum.className = 'slot-num';
      slotNum.innerText = String(i + 1);

      const contentEl = document.createElement('div');
      contentEl.className = 'slot-content';

      slot.appendChild(contentEl);
      slot.appendChild(slotNum);
      slot._contentEl = contentEl;

      const selectSlot = () => {
        if (this.gm?.localPlayer) {
          this.gm.localPlayer.selectedSlot = i;
          this.updateHotbar(this.gm.localPlayer);
        }
      };
      slot.addEventListener('click', selectSlot);
      slot.addEventListener('pointerdown', selectSlot);
      this.hotbarEl.appendChild(slot);
    }
  }

  /**
   * Renders the authentic 10-heart health display and golden absorption hearts.
   * @param {Object} player
   */
  updateHealth(player) {
    if (!this.healthHeartsEl) return;
    const hp = Math.max(0, player.health ?? 20);
    const fullHearts = Math.floor(hp / 2);
    const halfHeart = (hp % 2) >= 1;
    let heartsHtml = '';

    // 10 Base Health Hearts
    for (let i = 0; i < 10; i++) {
      if (i < fullHearts) {
        heartsHtml += '<span class="heart full mc-heart-full" title="Full Heart">❤️</span>';
      } else if (i === fullHearts && halfHeart) {
        heartsHtml += '<span class="heart half mc-heart-half" title="Half Heart">💔</span>';
      } else {
        heartsHtml += '<span class="heart empty mc-heart-empty" title="Empty Heart">🖤</span>';
      }
    }

    // Golden Absorption Hearts (from Golden Apples)
    const absorbHp = Math.max(0, player.absorptionHealth || player.absorption || 0);
    if (absorbHp > 0) {
      const fullAbsorb = Math.floor(absorbHp / 2);
      const halfAbsorb = (absorbHp % 2) >= 1;
      const absorbCount = Math.ceil(absorbHp / 2);
      for (let i = 0; i < absorbCount; i++) {
        if (i < fullAbsorb) {
          heartsHtml += '<span class="heart absorb-full mc-heart-absorb-full" title="Absorption Heart">💛</span>';
        } else if (i === fullAbsorb && halfAbsorb) {
          heartsHtml += '<span class="heart absorb-half mc-heart-absorb-half" title="Half Absorption Heart">🧡</span>';
        }
      }
    }

    this.healthHeartsEl.innerHTML = heartsHtml;
  }

  /**
   * Renders 10 armor chestplates on the top row above health.
   * @param {Object} player
   */
  updateArmor(player) {
    const tier = player.armor?.tier || 'none';
    if (this.armorNameEl) {
      this.armorNameEl.innerText = tier.toUpperCase();
    }

    if (!this.armorBarEl) return;

    let defensePoints = 0;
    if (typeof player.getArmorDefensePoints === 'function') {
      defensePoints = player.getArmorDefensePoints();
    } else {
      defensePoints = calculateArmorDefensePoints(tier);
    }

    if (defensePoints <= 0) {
      this.armorBarEl.innerHTML = '';
      return;
    }

    const fullIcons = Math.floor(defensePoints / 2);
    const halfIcon = (defensePoints % 2) >= 1;
    let armorHtml = '';

    for (let i = 0; i < 10; i++) {
      if (i < fullIcons) {
        armorHtml += '<span class="mc-icon armor-full" title="Armor">🛡️</span>';
      } else if (i === fullIcons && halfIcon) {
        armorHtml += '<span class="mc-icon armor-half" title="Half Armor">🛡️</span>';
      } else {
        armorHtml += '<span class="mc-icon armor-empty" title="Empty Armor"></span>';
      }
    }

    this.armorBarEl.innerHTML = armorHtml;
  }

  /**
   * Renders 10 hunger drumsticks on the top row above hotbar (default 20 points).
   * @param {Object} player
   */
  updateHunger(player) {
    if (!this.hungerBarEl) return;
    const hunger = player.hunger !== undefined ? Math.max(0, player.hunger) : 20;
    const fullDrumsticks = Math.floor(hunger / 2);
    const halfDrumstick = (hunger % 2) >= 1;
    let hungerHtml = '';

    for (let i = 0; i < 10; i++) {
      if (i < fullDrumsticks) {
        hungerHtml += '<span class="hunger-icon hunger-full mc-food-full" title="Hunger">🍗</span>';
      } else if (i === fullDrumsticks && halfDrumstick) {
        hungerHtml += '<span class="hunger-icon hunger-half mc-food-half" title="Half Hunger">🍖</span>';
      } else {
        hungerHtml += '<span class="hunger-icon hunger-empty mc-food-empty" title="Empty Hunger"></span>';
      }
    }

    this.hungerBarEl.innerHTML = hungerHtml;
  }

  /**
   * Renders centered green XP bar fill and bold level numeral.
   * @param {Object} levelManager
   * @param {Object} player
   */
  updateXP(levelManager, player) {
    let level = 1;
    let pct = 0;

    if (levelManager) {
      level = levelManager.level || 1;
      if (typeof levelManager.getProgress === 'function') {
        const prog = levelManager.getProgress();
        pct = prog.progressPercentage ?? 0;
      } else if (levelManager.xp !== undefined && levelManager.xpRequired) {
        pct = Math.min(100, Math.max(0, Math.floor((levelManager.xp / levelManager.xpRequired) * 100)));
      }
    } else if (player) {
      level = player.level || 1;
      if (player.xp !== undefined && player.xpRequired) {
        pct = Math.min(100, Math.max(0, Math.floor((player.xp / player.xpRequired) * 100)));
      }
    }

    if (this.hudXpLevelEl) {
      this.hudXpLevelEl.innerText = String(level);
    }
    if (this.hudXpFillEl) {
      this.hudXpFillEl.style.width = `${pct}%`;
    }
  }

  /**
   * Renders the authentic Hypixel Bedwars scoreboard with live stats, countdowns and team statuses.
   * @param {Object} localPlayer
   * @param {Object} teamManager
   * @param {number} matchTime
   */
  updateScoreboard(localPlayer, teamManager, matchTime) {
    // Mode badge
    if (this.sbModeBadgeEl && this.gm?.matchFormat) {
      this.sbModeBadgeEl.innerText = this.gm.matchFormat.toUpperCase();
    }

    // Date & Server IP
    if (this.sbDateEl) {
      const now = new Date();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const y = String(now.getFullYear()).slice(-2);
      this.sbDateEl.innerText = `${m}/${d}/${y}`;
    }
    if (this.sbServerEl) {
      this.sbServerEl.innerText = 'cubebedwars.com';
    }

    // Map & Mutation
    if (this.sbMapNameEl) {
      this.sbMapNameEl.innerText = this.gm?.mapPreset?.name || this.gm?.currentMap || 'Speedway';
    }
    if (this.sbMutationNameEl) {
      const mutName = this.gm?.mutationManager?.activeMutation?.name
        || this.gm?.mutationManager?.activeMutationId
        || 'None';
      this.sbMutationNameEl.innerText = mutName;
    }

    // Bedwars Event Timer
    if (this.sbEventTimerEl) {
      this.sbEventTimerEl.innerText = formatNextEvent(matchTime);
    }

    // Team Bed Statuses
    if (this.sbTeamBedsEl && teamManager) {
      let sbBedsHtml = '';
      for (const [tName, tData] of Object.entries(teamManager.teams)) {
        const isLocal = tName === localPlayer.team;
        const isEliminated = teamManager.isTeamEliminated(tName);
        let statusIcon = '✓';
        let statusClass = 'sb-bed-alive';

        if (!tData.hasBed) {
          if (isEliminated) {
            statusIcon = '✗';
            statusClass = 'sb-bed-elim';
          } else {
            const livingPlayers = tData.players
              ? tData.players.filter(p => !p.isDead || !p.isFinalDead).length
              : 1;
            statusIcon = String(livingPlayers > 0 ? livingPlayers : '✗');
            statusClass = livingPlayers > 0 ? 'sb-bed-broken' : 'sb-bed-dead';
          }
        }

        const initial = tName.charAt(0).toUpperCase();
        const teamCap = initial + tName.slice(1);
        sbBedsHtml += `
          <div class="sb-bed-row team-${tName} ${isLocal ? 'sb-bed-you' : ''}">
            <div class="sb-bed-team">
              <span class="sb-team-initial">${initial}</span>
              <span class="sb-team-name">${teamCap}:</span>
            </div>
            <div class="sb-bed-status-wrap">
              <span class="sb-bed-status ${statusClass}">${statusIcon}</span>
              ${isLocal ? '<span class="sb-you-tag">YOU</span>' : ''}
            </div>
          </div>
        `;
      }
      this.sbTeamBedsEl.innerHTML = sbBedsHtml;
    }

    // Numerical Stats
    if (this.statKillsEl) this.statKillsEl.innerText = localPlayer.kills ?? 0;
    if (this.statFinalEl) this.statFinalEl.innerText = localPlayer.finalKills ?? 0;
    if (this.statBedsEl) this.statBedsEl.innerText = localPlayer.bedsBroken ?? 0;

    // Rating (bloxd.io Elo MMR) & Level
    if (this.statRatingEl && this.gm?.rankManager) {
      const rankProfile = this.gm.rankManager.getProfile();
      this.statRatingEl.innerText = `${rankProfile.rating} RR`;
    }
    if (this.statLevelEl && this.gm?.levelManager) {
      this.statLevelEl.innerText = `Lv. ${this.gm.levelManager.level}`;
    }

    // Match Elapsed Timer (MM:SS)
    if (this.statTimerEl) {
      const mins = Math.floor(matchTime / 60);
      const secs = Math.floor(matchTime % 60);
      this.statTimerEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  update(localPlayer, teamManager, matchTime) {
    if (!localPlayer) return;

    // 1. Resources
    if (this.resIronEl) this.resIronEl.innerText = localPlayer.resources?.iron ?? 0;
    if (this.resGoldEl) this.resGoldEl.innerText = localPlayer.resources?.gold ?? 0;
    if (this.resDiaEl) this.resDiaEl.innerText = localPlayer.resources?.diamond ?? 0;
    if (this.resEmeEl) this.resEmeEl.innerText = localPlayer.resources?.emerald ?? 0;

    // 2. Health & Absorption Hearts
    this.updateHealth(localPlayer);

    // 3. Armor Defense Bar
    this.updateArmor(localPlayer);

    // 4. Hunger Drumsticks
    this.updateHunger(localPlayer);

    // 5. XP Bar & Level Numeral
    this.updateXP(this.gm?.levelManager, localPlayer);

    // 6. Top Bed Tracker Bar
    if (this.bedTrackerEl && teamManager) {
      let trackerHtml = '';
      for (const [tName, tData] of Object.entries(teamManager.teams)) {
        const isLocal = tName === localPlayer.team;
        const statusIcon = tData.hasBed ? '✓' : '✗';
        const statusClass = tData.hasBed ? 'bed-alive' : 'bed-dead';
        trackerHtml += `
          <div class="team-badge badge-${tName} ${isLocal ? 'badge-you' : ''}">
            <span class="team-label">${tName.charAt(0).toUpperCase()}:</span>
            <span class="bed-status ${statusClass}">${statusIcon}</span>
            ${isLocal ? '<span class="you-indicator">YOU</span>' : ''}
          </div>
        `;
      }
      this.bedTrackerEl.innerHTML = trackerHtml;
    }

    // 7. Sidebar Scoreboard
    this.updateScoreboard(localPlayer, teamManager, matchTime);

    // 8. 9-Slot Hotbar
    this.updateHotbar(localPlayer);

    // 9. Respawn Overlay
    if (localPlayer.isDead && !localPlayer.isFinalDead) {
      this.respawnOverlay?.classList.remove('hidden');
      if (this.respawnTimerEl) {
        this.respawnTimerEl.innerText = Math.ceil(localPlayer.respawnTimer);
      }
    } else {
      this.respawnOverlay?.classList.add('hidden');
    }
  }

  updateHotbar(player) {
    if (!this.hotbarEl) return;
    const slots = this.hotbarEl.children;
    for (let i = 0; i < 9; i++) {
      const slotEl = slots[i];
      if (!slotEl) continue;

      if (i === player.selectedSlot) {
        slotEl.classList.add('active');
      } else {
        slotEl.classList.remove('active');
      }

      const item = player.hotbar ? player.hotbar[i] : null;
      const contentEl = slotEl.querySelector?.('.slot-content') || slotEl._contentEl || slotEl.children[0];
      if (item && contentEl) {
        const countBadge = item.count > 1 ? `<span class="slot-count">${item.count}</span>` : '';
        const displayName = item.name || item.id || '';
        contentEl.innerHTML = `<span class="slot-item-icon" title="${displayName}">${displayName}</span>${countBadge}`;
      } else if (contentEl) {
        contentEl.innerHTML = '';
      }
    }
  }

  showAnnouncement(title, subtitle) {
    if (!this.announceBanner) return;
    this.announceTitle.innerText = title;
    this.announceSubtitle.innerText = subtitle;
    this.announceBanner.classList.remove('hidden');
    setTimeout(() => {
      this.announceBanner.classList.add('hidden');
    }, 4000);
  }

  initShop() {
    if (!this.shopModal) return;
    const shopWindow = this.shopModal.querySelector ? this.shopModal.querySelector('.shop-window') : null;
    const listEl = document.getElementById('shop-items-grid');
    if (!shopWindow && !listEl) return;

    // 1. Create or resolve #shop-resource-summary
    let summaryEl = document.getElementById('shop-resource-summary');
    if (!summaryEl && shopWindow) {
      summaryEl = document.createElement('div');
      summaryEl.id = 'shop-resource-summary';
      summaryEl.className = 'shop-resource-summary';
      const header = shopWindow.querySelector('.modal-header');
      if (header && header.nextSibling) {
        shopWindow.insertBefore(summaryEl, header.nextSibling);
      } else {
        shopWindow.prepend(summaryEl);
      }
    }
    this.shopResourceSummaryEl = summaryEl;

    // 2. Create or resolve #shop-category-tabs
    let tabsEl = document.getElementById('shop-category-tabs');
    if (!tabsEl && shopWindow) {
      tabsEl = document.createElement('div');
      tabsEl.id = 'shop-category-tabs';
      tabsEl.className = 'shop-category-tabs';
      if (listEl) {
        shopWindow.insertBefore(tabsEl, listEl);
      } else {
        shopWindow.appendChild(tabsEl);
      }
    }
    this.shopCategoryTabsEl = tabsEl;

    // 3. Create or resolve #shop-status-feedback
    let feedbackEl = document.getElementById('shop-status-feedback');
    if (!feedbackEl && shopWindow) {
      feedbackEl = document.createElement('div');
      feedbackEl.id = 'shop-status-feedback';
      feedbackEl.className = 'shop-status-feedback hidden';
      if (listEl) {
        shopWindow.insertBefore(feedbackEl, listEl);
      } else {
        shopWindow.appendChild(feedbackEl);
      }
    }
    this.shopStatusFeedbackEl = feedbackEl;

    // Populate category tabs
    if (this.shopCategoryTabsEl) {
      this.shopCategoryTabsEl.innerHTML = '';
      SHOP_CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `shop-tab-btn ${this.activeShopCategory === cat.id ? 'active' : ''}`;
        btn.dataset.category = cat.id;
        btn.innerHTML = `<span class="tab-icon">${cat.icon}</span> <span class="tab-label">${cat.name}</span>`;
        btn.addEventListener('click', (e) => {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          this.setShopCategory(cat.id);
        });
        this.shopCategoryTabsEl.appendChild(btn);
      });
    }

    // Modal close button
    document.getElementById('btn-close-shop')?.addEventListener('click', () => {
      this.closeShop();
    });

    // Backdrop click listener to dismiss modal when clicking outside .shop-window
    this.shopModal.addEventListener('click', (e) => {
      if (e.target === this.shopModal) {
        this.closeShop();
      }
    });

    this.renderShop();
  }

  setShopCategory(catId) {
    this.activeShopCategory = catId;
    if (this.shopCategoryTabsEl) {
      const buttons = this.shopCategoryTabsEl.querySelectorAll('.shop-tab-btn');
      buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === catId);
      });
    }
    this.renderShop();
  }

  updateShopResourceSummary() {
    if (!this.shopResourceSummaryEl) return;
    const player = this.gm?.localPlayer;
    const res = player?.resources || { iron: 0, gold: 0, diamond: 0, emerald: 0 };
    this.shopResourceSummaryEl.innerHTML = `
      <div class="shop-res-pill res-iron"><span class="res-icon">⚪</span> <span class="res-name">Iron</span>: <strong>${res.iron || 0}</strong></div>
      <div class="shop-res-pill res-gold"><span class="res-icon">🟡</span> <span class="res-name">Gold</span>: <strong>${res.gold || 0}</strong></div>
      <div class="shop-res-pill res-diamond"><span class="res-icon">💎</span> <span class="res-name">Diamond</span>: <strong>${res.diamond || 0}</strong></div>
      <div class="shop-res-pill res-emerald"><span class="res-icon">🟢</span> <span class="res-name">Emerald</span>: <strong>${res.emerald || 0}</strong></div>
    `;
  }

  getUpgradeState(upg, team) {
    if (!team || !team.upgrades) return { owned: false, badge: '' };
    const u = team.upgrades;
    if (upg.id === 'sharpness' && u.sharpness >= 1) return { owned: true, badge: 'TIER I ACTIVE' };
    if (upg.id === 'protection_1' && u.protection >= 1) return { owned: true, badge: 'TIER I ACTIVE' };
    if (upg.id === 'protection_2' && u.protection >= 2) return { owned: true, badge: 'TIER II ACTIVE' };
    if (upg.id === 'forge_2' && u.forgeTier >= 1.5) return { owned: true, badge: 'TIER II ACTIVE' };
    if (upg.id === 'forge_3' && u.forgeTier >= 2.0) return { owned: true, badge: 'TIER III ACTIVE' };
    if (upg.id === 'heal_pool' && u.healPool) return { owned: true, badge: 'OWNED' };
    if (upg.id === 'alarm_trap' && u.alarmTrap) return { owned: true, badge: 'ACTIVE' };
    return { owned: false, badge: '' };
  }

  canPlayerReceiveItem(player, item) {
    if (!player) return false;
    // Armor upgrades modify player.armor directly and don't consume hotbar slots
    if (item.category === 'armor' || item.id?.startsWith('armor_')) return true;
    // Sword and stick set weapon directly in hotbar slot 0
    if (item.id?.includes('sword') || item.id === 'knockback_stick') return true;

    if (typeof player.canAddItem === 'function') {
      return player.canAddItem(item);
    }

    if (!Array.isArray(player.hotbar)) return true;

    // If stackable block, can receive if matching blockType already exists or there is an empty slot
    if (item.type === 'block' || item.blockType !== undefined) {
      const bType = item.id === 'wool_16' ? player.teamWoolType : item.blockType;
      for (let i = 0; i < 9; i++) {
        if (player.hotbar[i] && player.hotbar[i].type === 'block' && player.hotbar[i].blockType === bType) {
          return true;
        }
      }
    }

    // Otherwise requires at least one empty slot in hotbar
    for (let i = 0; i < 9; i++) {
      if (!player.hotbar[i]) return true;
    }
    return false;
  }

  renderShop() {
    this.updateShopResourceSummary();
    const listEl = document.getElementById('shop-items-grid');
    if (!listEl) return;
    listEl.innerHTML = '';

    const player = this.gm?.localPlayer;
    const team = (player && this.gm?.teamManager?.teams) ? this.gm.teamManager.teams[player.team] : null;

    if (this.activeShopCategory === 'upgrades') {
      TEAM_UPGRADES.forEach(upg => {
        const state = this.getUpgradeState(upg, team);
        const canAfford = (player?.resources?.diamond || 0) >= upg.cost;
        const card = document.createElement('div');
        card.className = `shop-item-card upgrade-card ${state.owned ? 'is-owned' : (canAfford ? 'can-afford' : 'cannot-afford')}`;
        card.innerHTML = `
          <div class="item-icon">${upg.icon}</div>
          <div class="item-info">
            <div class="item-name">${upg.name}</div>
            <div class="item-desc">${upg.desc}</div>
          </div>
        `;

        const buyBtn = document.createElement('button');
        buyBtn.className = `btn-buy btn-buy-upgrade ${state.owned ? 'btn-owned' : (canAfford ? '' : 'cannot-afford')}`;
        buyBtn.dataset.id = upg.id;
        if (state.owned) {
          buyBtn.innerText = state.badge;
          buyBtn.disabled = true;
        } else {
          buyBtn.innerText = `💎 ${upg.cost} DIAMONDS`;
          buyBtn.addEventListener('click', (e) => {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            this.buyUpgrade(upg);
          });
        }
        card.appendChild(buyBtn);
        listEl.appendChild(card);
      });
      return;
    }

    const items = SHOP_ITEMS.filter(item => {
      if (this.activeShopCategory === 'recommended') {
        return !!item.recommended;
      }
      if (this.activeShopCategory === 'combat') {
        return item.category === 'combat' || item.category === 'weapons' || item.category === 'armor';
      }
      if (this.activeShopCategory === 'utility') {
        return item.category === 'utility' || item.category === 'tools';
      }
      return item.category === this.activeShopCategory;
    });

    items.forEach(item => {
      const currentRes = player?.resources?.[item.costType] || 0;
      const canAfford = currentRes >= item.cost;
      const card = document.createElement('div');
      card.className = `shop-item-card cost-${item.costType} ${canAfford ? 'can-afford' : 'cannot-afford'}`;
      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-desc">${item.desc}</div>
        </div>
      `;

      const buyBtn = document.createElement('button');
      buyBtn.className = `btn-buy ${canAfford ? '' : 'cannot-afford'}`;
      buyBtn.dataset.id = item.id;
      buyBtn.innerText = `${item.cost} ${item.costType.toUpperCase()}`;
      buyBtn.addEventListener('click', (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        this.buyItem(item);
      });
      card.appendChild(buyBtn);
      listEl.appendChild(card);
    });
  }

  showShopNotification(message, type = 'info') {
    if (this.shopStatusFeedbackEl) {
      this.shopStatusFeedbackEl.textContent = message;
      this.shopStatusFeedbackEl.className = `shop-status-feedback feedback-${type}`;
      this.shopStatusFeedbackEl.classList.remove('hidden');
      clearTimeout(this._shopFeedbackTimer);
      this._shopFeedbackTimer = setTimeout(() => {
        this.shopStatusFeedbackEl?.classList.add('hidden');
      }, 3000);
    }
  }

  buyItem(item) {
    const player = this.gm?.localPlayer;
    if (!player) return false;

    // 1. Check inventory capacity (atomic check)
    if (!this.canPlayerReceiveItem(player, item)) {
      this.showShopNotification('Inventory full!', 'error');
      if (this.gm?.sound?.playPew) this.gm.sound.playPew();
      return false;
    }

    // 2. Check affordability
    const currentRes = player.resources?.[item.costType] || 0;
    if (currentRes < item.cost) {
      this.showShopNotification(`Not enough ${item.costType.toUpperCase()}!`, 'error');
      if (this.gm?.sound?.playPew) this.gm.sound.playPew();
      return false;
    }

    // 3. Deduct currency atomically
    if (player.spendResource(item.costType, item.cost)) {
      const res = item.action(player);
      if (res === false) {
        player.resources[item.costType] += item.cost;
        this.showShopNotification('Purchase failed: could not add item.', 'error');
        return false;
      }
      if (this.gm?.sound?.playShopBuy) this.gm.sound.playShopBuy();
      this.showShopNotification(`Purchased ${item.name}!`, 'success');
      this.update(player, this.gm.teamManager, this.gm.matchTime);
      this.renderShop();
      return true;
    } else {
      this.showShopNotification(`Not enough ${item.costType.toUpperCase()}!`, 'error');
      return false;
    }
  }

  openShop() {
    if (document.pointerLockElement) document.exitPointerLock();
    this.shopModal?.classList.remove('hidden');
    this.renderShop();
  }

  closeShop() {
    this.shopModal?.classList.add('hidden');
    this.gm?.canvas?.requestPointerLock?.();
  }

  initUpgrades() {
    const gridEl = document.getElementById('upgrades-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const player = this.gm?.localPlayer;
    const team = (player && this.gm?.teamManager?.teams) ? this.gm.teamManager.teams[player.team] : null;

    TEAM_UPGRADES.forEach(upg => {
      const state = this.getUpgradeState(upg, team);
      const canAfford = (player?.resources?.diamond || 0) >= upg.cost;
      const card = document.createElement('div');
      card.className = `upgrade-card ${state.owned ? 'is-owned' : (canAfford ? 'can-afford' : 'cannot-afford')}`;
      card.innerHTML = `
        <div class="upg-icon">${upg.icon}</div>
        <div class="upg-title">${upg.name}</div>
        <div class="upg-desc">${upg.desc}</div>
      `;

      const buyUpgBtn = document.createElement('button');
      buyUpgBtn.className = `btn-buy-upgrade ${state.owned ? 'btn-owned' : (canAfford ? '' : 'cannot-afford')}`;
      buyUpgBtn.dataset.id = upg.id;
      if (state.owned) {
        buyUpgBtn.innerText = state.badge;
        buyUpgBtn.disabled = true;
      } else {
        buyUpgBtn.innerText = `💎 ${upg.cost} DIAMONDS`;
        buyUpgBtn.addEventListener('click', (e) => {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          this.buyUpgrade(upg);
        });
      }
      card.appendChild(buyUpgBtn);
      gridEl.appendChild(card);
    });

    document.getElementById('btn-close-upgrades')?.addEventListener('click', () => {
      this.upgradesModal?.classList.add('hidden');
      this.gm?.canvas?.requestPointerLock?.();
    });

    this.upgradesModal?.addEventListener('click', (e) => {
      if (e.target === this.upgradesModal) {
        this.upgradesModal.classList.add('hidden');
        this.gm?.canvas?.requestPointerLock?.();
      }
    });
  }

  buyUpgrade(upg) {
    const player = this.gm?.localPlayer;
    if (!player) return false;
    const team = (player && this.gm?.teamManager?.teams) ? this.gm.teamManager.teams[player.team] : null;
    if (!team) return false;

    const state = this.getUpgradeState(upg, team);
    if (state.owned) {
      this.showShopNotification(`Upgrade already active: ${state.badge}!`, 'info');
      return false;
    }

    if (player.spendResource('diamond', upg.cost)) {
      upg.apply(team);
      if (this.gm?.sound?.playShopBuy) this.gm.sound.playShopBuy();
      this.showShopNotification(`Upgraded: ${upg.name}!`, 'success');
      this.update(player, this.gm.teamManager, this.gm.matchTime);
      this.renderShop();
      this.initUpgrades();
      return true;
    } else {
      this.showShopNotification('Not enough Diamonds!', 'error');
      if (this.gm?.sound?.playPew) this.gm.sound.playPew();
      return false;
    }
  }

  showGameOver(isVictory, rankResult = null, levelResult = null) {
    if (document.pointerLockElement) document.exitPointerLock();
    if (!this.gameoverOverlay) return;

    this.gameoverOverlay.classList.remove('hidden');
    const titleEl = document.getElementById('gameover-title');
    if (titleEl) {
      titleEl.innerText = isVictory ? 'VICTORY!' : 'GAME OVER!';
      titleEl.className = isVictory ? 'title-victory' : 'title-defeat';
    }

    if (this.goStatRatingEl) {
      if (rankResult && rankResult.isRanked) {
        const sign = rankResult.deltaRating >= 0 ? '+' : '';
        this.goStatRatingEl.innerText = `${sign}${rankResult.deltaRating} RR (${rankResult.rating} RR [${rankResult.tier}])`;
        this.goStatRatingEl.className = rankResult.deltaRating >= 0 ? 'go-stat-val val-cyan' : 'go-stat-val val-red';
      } else {
        this.goStatRatingEl.innerText = 'Unranked (2-team only)';
        this.goStatRatingEl.className = 'go-stat-val';
      }
    }

    if (this.goStatXpEl && levelResult) {
      this.goStatXpEl.innerText = `+${levelResult.xpEarned} XP (Level ${levelResult.level})`;
      if (levelResult.leveledUp) {
        this.showAnnouncement('LEVEL UP!', `You reached Player Level ${levelResult.level}!`);
      }
    }

    if (this.goStatFinalsEl) {
      this.goStatFinalsEl.innerText = this.gm.localPlayer.finalKills;
    }
    if (this.goStatBedsEl) {
      this.goStatBedsEl.innerText = this.gm.localPlayer.bedsBroken;
    }

    if (isVictory && this.gm.sound) {
      this.gm.sound.playVictory();
    }
  }

  /**
   * Initializes network controls and direct LAN join listeners.
   */
  initNetworkUI() {
    const btnJoinLan = document.getElementById('btn-join-lan');
    const inputLanIp = document.getElementById('input-lan-ip');
    const inputLanPort = document.getElementById('input-lan-port');

    if (btnJoinLan) {
      btnJoinLan.addEventListener('click', async () => {
        const ip = inputLanIp ? inputLanIp.value.trim() : '127.0.0.1';
        const port = inputLanPort ? parseInt(inputLanPort.value, 10) : 8080;

        if (this.lanStatusMsgEl) {
          this.lanStatusMsgEl.style.display = 'block';
          this.lanStatusMsgEl.style.background = 'rgba(6, 182, 212, 0.15)';
          this.lanStatusMsgEl.style.color = '#22d3ee';
          this.lanStatusMsgEl.innerText = `Connecting to LAN host ws://${ip}:${port}...`;
        }

        try {
          await this.gm.network.joinDirectLan(ip, port, {
            playerName: this.gm.localPlayer?.name || 'LAN Player',
          });

          if (this.lanStatusMsgEl) {
            this.lanStatusMsgEl.style.background = 'rgba(34, 197, 94, 0.2)';
            this.lanStatusMsgEl.style.color = '#22c55e';
            this.lanStatusMsgEl.innerText = `Connected to LAN Host at ${ip}:${port}!`;
          }

          setTimeout(() => {
            document.getElementById('multiplayer-modal')?.classList.add('hidden');
            this.gm.startMatch('solo', false);
          }, 800);
        } catch (err) {
          if (this.lanStatusMsgEl) {
            this.lanStatusMsgEl.style.background = 'rgba(239, 68, 68, 0.2)';
            this.lanStatusMsgEl.style.color = '#ef4444';
            this.lanStatusMsgEl.innerText = `Connection failed: ${err.message}`;
          }
        }
      });
    }

    // Start listening for LAN broadcasts
    if (this.gm?.network?.lanDiscovery) {
      this.gm.network.lanDiscovery.startDiscovery((rooms) => {
        this.renderLanDiscoveredRooms(rooms);
      });
    }
  }

  /**
   * Updates network badge in HUD and modal.
   * @param {string} transportName
   * @param {string} [roomCode]
   */
  updateNetworkStatus(transportName, roomCode = null) {
    if (this.hudNetTextEl) {
      if (roomCode) {
        this.hudNetTextEl.innerText = `${transportName} [${roomCode}]`;
      } else {
        this.hudNetTextEl.innerText = transportName || 'Solo (Offline)';
      }
    }

    const dotEl = this.hudNetBadgeEl?.querySelector?.('.net-status-dot');

    if (this.hudNetBadgeEl) {
      if (transportName === 'WebSocket' || transportName === 'LAN Direct') {
        this.hudNetBadgeEl.style.background = 'rgba(34, 197, 94, 0.15)';
        this.hudNetBadgeEl.style.color = '#22c55e';
        this.hudNetBadgeEl.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        if (dotEl) dotEl.style.background = '#22c55e';
      } else if (transportName.includes('WebRTC')) {
        this.hudNetBadgeEl.style.background = 'rgba(6, 182, 212, 0.2)';
        this.hudNetBadgeEl.style.color = '#22d3ee';
        this.hudNetBadgeEl.style.border = '1px solid rgba(6, 182, 212, 0.4)';
        if (dotEl) dotEl.style.background = '#22d3ee';
      } else {
        this.hudNetBadgeEl.style.background = 'rgba(148, 163, 184, 0.1)';
        this.hudNetBadgeEl.style.color = '#94a3b8';
        this.hudNetBadgeEl.style.border = 'none';
        if (dotEl) dotEl.style.background = '#94a3b8';
      }
    }

    if (this.multiActiveTransportEl) {
      this.multiActiveTransportEl.innerText = transportName;
    }
  }

  /**
   * Renders discovered LAN beacons in modal list.
   * @param {Array<Object>} rooms
   */
  renderLanDiscoveredRooms(rooms) {
    if (this.lanDiscoveryCountEl) {
      this.lanDiscoveryCountEl.innerText = `${rooms.length} found`;
    }

    if (!this.lanGamesListEl) return;

    if (!rooms || rooms.length === 0) {
      this.lanGamesListEl.innerHTML = '<div class="lan-empty-hint">Scanning local subnet beacon on port 8766...</div>';
      return;
    }

    this.lanGamesListEl.innerHTML = '';
    rooms.forEach((r) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '4px 8px';
      row.style.background = 'rgba(255, 255, 255, 0.05)';
      row.style.borderRadius = '4px';

      row.innerHTML = `
        <div>
          <strong style="color:var(--accent-cyan);">${r.roomCode}</strong> — ${r.hostName}
          <span style="font-size:10px;color:var(--text-muted);margin-left:6px;">(${r.ip}:${r.port})</span>
        </div>
        <button class="btn-primary" style="padding:2px 8px;font-size:11px;">Join</button>
      `;

      row.querySelector('button')?.addEventListener('click', () => {
        const ipInput = document.getElementById('input-lan-ip');
        const portInput = document.getElementById('input-lan-port');
        if (ipInput) ipInput.value = r.ip || '127.0.0.1';
        if (portInput) portInput.value = r.port || 8080;
        document.getElementById('btn-join-lan')?.click();
      });

      this.lanGamesListEl.appendChild(row);
    });
  }

  /**
   * Displays in-game chat messages.
   */
  displayChatMessage(sender, text) {
    this.showAnnouncement(sender.toUpperCase(), text);
  }
}

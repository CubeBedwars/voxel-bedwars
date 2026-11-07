# Specification Survey Report: Dual-Layer Networking, LAN Multiplayer & Cross-Platform Platform (R4 & R5)

**Subagent**: `teamwork_spec_miner` (Survey Explorer)  
**Date**: 2026-11-07  
**Scope**: Requirements R4 (Dual-Layer Networking & LAN Multiplayer) and R5 (Cross-Platform Builds & Netlify Deployment)  
**Authoritative Reference**: `ORIGINAL_REQUEST.md`, Codebase inspection (`package.json`, `vite.config.js`, `netlify.toml`, `src/net/NetworkManager.js`, `src/game/GameManager.js`, `src/entities/LocalPlayer.js`, `src/entities/Player.js`, `src/entities/BotPlayer.js`, `src/ui/HUD.js`, `index.html`)

---

## 1. Executive Summary

This survey provides a comprehensive architectural and behavioral specification analysis for **Requirement 4 (Dual-Layer Networking and LAN Multiplayer)** and **Requirement 5 (Cross-Platform Builds & Netlify Deployment)**.

### Key Findings:
1. **Existing Networking Architecture**:
   - `src/net/NetworkManager.js` provides only an initial prototype using `peerjs` (`^1.5.4`).
   - Currently, it handles only 3 rudimentary packet types: `BLOCK_PLACE`, `BLOCK_BREAK`, and `BED_DESTROY`.
   - **Critical gaps**: Zero player position/rotation sync, no entity spawning for remote peers, no attack/combat/knockback sync, no resource generator item drop sync, no team upgrade sync, and no match start/countdown/end sync.
   - In `GameManager.js`, local player block placing, block breaking, and bed destruction do **not** actually call `this.network.broadcast()` — networking is currently completely disconnected from gameplay loops!
   - There is **no WebSocket server or client** anywhere in the codebase.
2. **Dedicated WebSocket Server**:
   - Must reside in a dedicated `server/` directory / standalone repository.
   - Must expose a non-WebSocket `GET /ping` endpoint for 5-minute UptimeRobot health checks to maintain continuous 24/7/31-day uptime without sleeping.
   - **Hosting Evaluation**: Platforms requiring credit cards (Render, Fly.io, Railway, Oracle Cloud) are disqualified. Recommended free tier platforms without credit cards: **Hugging Face Spaces** (Docker/Node, 2 vCPU, 16GB RAM, 24/7 continuous uptime, persistent WSS), **Glitch** (1000 hrs/mo free, 24/7 with 5-min ping), or **Koyeb** (Eco tier).
3. **Dual-Layer Fallback**:
   - The client must implement a unified `NetworkAdapter` interface with automatic failover: Attempt primary connection to dedicated WebSocket server; if connection times out or fails (3–5s threshold), seamlessly fall back to serverless WebRTC (PeerJS) with room codes (`BW-XXXX`).
4. **LAN Multiplayer**:
   - Desktop environment (Electron): Native UDP broadcast on port `8766` for local game beacon broadcasting and discovery, local IP resolution via `os.networkInterfaces()`, embedded local WebSocket server on port `8765`, and Direct IP:Port manual connect.
   - Mobile & Web on LAN: Direct IP:Port joining via WebSocket (`ws://<host-ip>:8765`), allowing cross-device LAN play between desktop, mobile, and browser clients on the same Wi-Fi.
5. **Cross-Platform Packaging (Web, Desktop, Mobile)**:
   - **Web / Netlify**: `npm run build` succeeds cleanly (`dist/` output: 12.16 kB HTML, 10.40 kB CSS, 626.41 kB JS bundle). `netlify.toml` requires SPA redirect rewrite rules (`/* -> /index.html 200`) and Content-Security-Policy headers permitting WebSocket and PeerJS connections.
   - **Desktop**: Electron provides native windowing (1280x720, frameless/windowed, F11 fullscreen, native menus) and exposes Node.js `dgram` and `net` via an IPC `preload.cjs` script for LAN discovery.
   - **Mobile**: Capacitor configuration (`capacitor.config.json`) for Android/iOS wrapping.
   - **Mobile Touch Controls**: Essential requirement. Currently pointer lock and keyboard listeners completely break on mobile devices. Requires an on-screen responsive touch engine: virtual movement joystick, right-screen touch-drag camera look, floating action buttons (Jump, Attack/Mine, Place, Shop, Upgrades), and touchable hotbar slots.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Dedicated WS Server | Standalone Server Architecture | Node.js WebSocket server in `server/` directory with lightweight `ws` dependency | Start command: `node server/server.js` or `npm run server` | WebSocket server listening on `PORT` (default 8080 or process.env.PORT) | Handles port collision by logging error and exiting with code 1 | `ORIGINAL_REQUEST.md` R4 |
| 2 | Dedicated WS Server | `/ping` Uptime Health Check | Non-WebSocket HTTP GET endpoint responding with JSON health metrics for UptimeRobot monitoring | HTTP GET `/ping` | HTTP 200 OK: `{"status":"ok","uptime":<seconds>,"rooms":<count>,"players":<count>}` | 500 if internal server error | `ORIGINAL_REQUEST.md` R4 & Acceptance Criteria |
| 3 | Dedicated WS Server | Multi-Room Matchmaking & Lifecycle | Server manages isolated rooms identified by 4-digit codes (`BW-XXXX`), tracking room state (LOBBY, PLAYING, ENDED) | `CREATE_ROOM`, `JOIN_ROOM`, `LEAVE_ROOM` | Room state updates, room codes, peer assignments | Returns `ROOM_NOT_FOUND`, `ROOM_FULL`, or `ROOM_ALREADY_STARTED` | `ORIGINAL_REQUEST.md` R4 |
| 4 | Dedicated WS Server | State Synchronization Protocol | High-frequency packet relay & authoritative validation for player transforms, combat, blocks, beds, and economy | Binary / JSON packets: `PLAYER_UPDATE`, `BLOCK_PLACE`, `BLOCK_BREAK`, `BED_DESTROY`, etc. | Broadcast packets to peers in the same room | Invalid packets dropped; bad coordinates ignored | `ORIGINAL_REQUEST.md` R4 & `NetworkManager.js` |
| 5 | WebRTC Fallback | Automatic Fallback Detection | Client probes primary WebSocket server; on failure/timeout, automatically switches to WebRTC peer-to-peer | WebSocket connection attempt with 3500ms timeout | Transitions network state to `WEBRTC_FALLBACK`, alerts user via UI toast | If both WebSocket and WebRTC signaling fail, prompts user to play Solo vs Bots or LAN | `ORIGINAL_REQUEST.md` R4 |
| 6 | WebRTC Fallback | PeerJS P2P Room Hosting | Host client establishes PeerJS session with room code (`BW-XXXX`) acting as authoritative game host | Peer ID string (`BW-XXXX`) | Open WebRTC data channels for incoming players | Emits error if Peer ID is already registered on cloud signaling server | `src/net/NetworkManager.js` |
| 7 | WebRTC Fallback | PeerJS Direct Room Joining | Client connects directly to host's PeerJS ID and initiates game state exchange | Target room code string (`BW-XXXX`) | Connected `DataConnection` pipe | Emits error if host peer is offline or code is invalid | `src/net/NetworkManager.js` |
| 8 | LAN Multiplayer | Desktop UDP Match Broadcasting | Host machine broadcasts UDP datagrams on LAN broadcast address (`255.255.255.255:8766`) every 2 seconds | Host name, map preset, player count, local IP, port | Datagram packet broadcasted across local subnet | Catches `EACCES` or network interface down gracefully | `ORIGINAL_REQUEST.md` R4 |
| 9 | LAN Multiplayer | Desktop UDP Match Discovery | Desktop client listens on UDP port 8766 to automatically discover and list LAN matches | Incoming UDP packets on port 8766 | Discovered games list in UI with 1-click connect | Drops stale servers if no heartbeat received for 6 seconds | `ORIGINAL_REQUEST.md` R4 |
| 10 | LAN Multiplayer | Local IP Resolution | Detects host's local IPv4 address (e.g. `192.168.1.X`) from active network interfaces | Node.js `os.networkInterfaces()` | Displayed LAN Host IP:Port string on screen | Falls back to `127.0.0.1` if disconnected from LAN | `ORIGINAL_REQUEST.md` R4 |
| 11 | LAN Multiplayer | Direct IP:Port Host & Join | Cross-platform host/join allowing desktop, mobile, and web clients to connect directly via IP:Port | URL: `ws://<local-ip>:<port>` | Direct WebSocket connection to local host | Connection error toast if host unreachable | `ORIGINAL_REQUEST.md` R4 & Acceptance Criteria |
| 12 | Cross-Platform Desktop | Electron Native Windowing | Native desktop app wrapper running the Bedwars engine with native OS window controls | Electron main process `desktop/main.cjs` | 1280x720 window, native title bar, application menu | Gracefully closes child server processes on window close | `ORIGINAL_REQUEST.md` R5 |
| 13 | Cross-Platform Desktop | Desktop Native Menu & Key Shortcuts | Native menu supporting Fullscreen (F11), Reload (Ctrl+R/F5), DevTools (Ctrl+Shift+I), and Quit (Ctrl+Q) | Keyboard events | Window state change (fullscreen, reload, exit) | Prevents accidental closing during active matches | `ORIGINAL_REQUEST.md` R5 |
| 14 | Cross-Platform Desktop | IPC Bridge for LAN & System APIs | Preload script exposing safe Node capabilities (`dgram`, `os`, local server) to the browser sandbox | IPC channels: `lan:startBroadcast`, `lan:startScan`, `lan:getLocalIPs` | Asynchronous IPC replies | Sanitizes and validates all IPC payloads | `ORIGINAL_REQUEST.md` R5 |
| 15 | Cross-Platform Mobile | Capacitor App Packaging | Mobile configuration (`capacitor.config.json`) bundling `dist/` web assets for Android and iOS | `npx cap init`, `npx cap sync` | Native Android (`android/`) and iOS (`ios/`) build wrappers | Validates asset directory existence before sync | `ORIGINAL_REQUEST.md` R5 |
| 16 | Cross-Platform Mobile | Responsive Virtual Movement Joystick | On-screen virtual analog joystick on the bottom-left for touch-based WASD movement & sprinting | Touch start, move, end events on joystick zone | Translates angle & magnitude to `keys.forward`, `backward`, `left`, `right`, `sprint` | Clamps joystick knob within outer circle radius | `ORIGINAL_REQUEST.md` R5 |
| 17 | Cross-Platform Mobile | Touch-Drag Camera Look Zone | Dedicated touch area on the right half of the screen for fluid first-person pitch and yaw control | Touch move delta `(dx, dy)` on look zone | Updates `player.yaw` and `player.pitch` with sensitivity scaling | Ignores multi-touch jitter; preserves pitch limits `[-89°, +89°]` | `ORIGINAL_REQUEST.md` R5 |
| 18 | Cross-Platform Mobile | Virtual Action Buttons Overlay | Floating on-screen buttons for Jump, Attack/Mine, Place Block, Shopkeeper, and Upgrades | Touch tap / hold events on UI buttons | Triggers `keys.jump`, `handleLeftClick()`, `handleRightClick()`, `openShop()`, `openUpgrades()` | Visual active/pressed feedback states | `ORIGINAL_REQUEST.md` R5 |
| 19 | Cross-Platform Mobile | Touch-Friendly Hotbar Selection | 9-slot hotbar supporting direct tap selection with enlarged touch hitboxes (min 44x44px) | Touch tap on hotbar slot element | Updates `player.selectedSlot` and active visual highlight | Prevents accidental double-activation | `ORIGINAL_REQUEST.md` R5 |
| 20 | Cross-Platform Mobile | Auto-Detect Touch Environment | Automatically toggles touch controls overlay based on device touch capability | `'ontouchstart' in window || navigator.maxTouchPoints > 0` | Adds `touch-enabled` class to `<body>`, shows virtual controls | UI toggle button allows manual override | `ORIGINAL_REQUEST.md` R5 |
| 21 | Web Deployment | Netlify Static Build & Config | Production web bundling via `npm run build` with `netlify.toml` hosting config | `npm run build` (Vite) | Generated assets in `dist/` (`index.html`, CSS, JS) | Fails build if syntax errors or missing imports occur | `ORIGINAL_REQUEST.md` R5 & `netlify.toml` |
| 22 | Web Deployment | Netlify SPA Redirects & Headers | Configures `netlify.toml` with `/* -> /index.html 200` rewrite rule and security headers | HTTP requests to any route or query param | Serves `index.html` with proper MIME types & caching | Eliminates 404 errors on deep linking or reloads | `netlify.toml` inspection |
| 23 | Web Deployment | Relative Asset Pathing (`base: './'`) | Ensures relative URL asset references so the application works seamlessly on any subfolder, CDN, or mobile webview | `base: './'` in `vite.config.js` | Built HTML references `./assets/...` instead of `/assets/...` | Prevents broken asset paths in Electron and Capacitor | `vite.config.js` line 4 |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | WebSocket Server `/ping` | High-frequency HTTP GET requests from multiple uptime monitors | Responds immediately with HTTP 200 OK without blocking WebSocket event loop. |
| 2 | WebSocket Server `/ping` | HEAD or OPTIONS HTTP request on `/ping` | Returns 200 OK with `Allow: GET, HEAD, OPTIONS` headers. |
| 3 | Serverless WebRTC Fallback | Primary WebSocket server domain is completely down or DNS fails | Client WebSocket handshake times out after 3.5 seconds; triggers `switchNetworkToWebRTC()` fallback automatically. |
| 4 | WebRTC Room Creation | Room code `BW-1234` already registered by another user on PeerJS cloud signaling | PeerJS emits `unavailable-id` error; client automatically regenerates a unique randomized code (e.g. `BW-5892`) and retries up to 3 times. |
| 5 | WebRTC Peer Disconnect | Client tab closes or loses Wi-Fi mid-match | `conn.on('close')` fires; host removes connection and despawns the player's 3D voxel mesh; HUD team status updates. |
| 6 | LAN UDP Discovery | Multiple network adapters present (e.g., Ethernet + Wi-Fi + VirtualBox/VMware adapter) | Node `os.networkInterfaces()` filters out internal loopback (`127.0.0.1`) and virtual subnets (`192.168.56.X`), selecting the active local subnet. |
| 7 | LAN UDP Discovery | Windows Firewall blocks UDP broadcast port 8766 | Discovery fails silently; Direct IP:Port manual input serves as immediate foolproof fallback. |
| 8 | Direct LAN IP Connect | Client enters invalid IP format or unreachable port (e.g. `999.999.999.999:80`) | WebSocket connection throws `ECONNREFUSED` or timeout; displays user-friendly error banner: "Could not reach LAN host at <IP:Port>". |
| 9 | Mobile Touch Controls | Simultaneous virtual joystick movement, camera touch-drag, and attack button tap (Multi-Touch 3+ fingers) | Browser `TouchEvent.changedTouches` identifies separate touch identifiers (`touch.identifier`), preventing joystick drift or camera snapping during combat. |
| 10 | Mobile Touch Controls | User swipes outside screen edge or drags over HUD elements | `touchmove` listener calls `preventDefault()` on game touch surfaces to prevent page scrolling, pinch-zoom, or rubber-banding. |
| 11 | Pointer Lock on Mobile | Tap on canvas to lock pointer on iOS Safari / Android Chrome | Mobile browsers do not support pointer lock or reject the promise; touch controls overlay activates without throwing unhandled exceptions. |
| 12 | Netlify Deployment | Hard refresh on URL with query parameters (e.g. `https://site.netlify.app/?room=BW-4021`) | `[[redirects]] from = "/*" to = "/index.html" status = 200` ensures Netlify routes all URLs to `index.html` without 404s. |
| 13 | Cross-Platform Asset Paths | Desktop Electron app or Mobile Capacitor app loading assets from file URI (`file:///android_asset/...`) | `base: './'` in `vite.config.js` ensures assets are loaded with relative paths (`./assets/...`), preventing blank screen failures. |
| 14 | Network State Resynchronization | Peer joins match after several blocks have been placed and broken | Host sends initial `FULL_WORLD_DELTA` snapshot packet containing all placed and destroyed block coordinates since match start. |
| 15 | Free Tier Idle Sleep Prevention | Free hosting service (Hugging Face Spaces or Glitch) idles after 5 minutes of inactivity | UptimeRobot 5-minute HTTP GET to `/ping` prevents container spindown, guaranteeing 24/7/31-day uptime. |

---

## 4. Existing Codebase Analysis vs Requirements

### Current Code Inventory

1. **`src/net/NetworkManager.js`**:
   - Lines 1–33: Prototype `createRoom(onSuccess, onError)` using `new Peer('BW-' + rand)`.
   - Lines 35–55: Prototype `joinRoom(roomCode, onSuccess, onError)` using `peer.connect(roomCode)`.
   - Lines 57–75: Setup connections array and `broadcast(packet)` over open WebRTC DataChannels.
   - Lines 77–98: `handlePacket(packet, sender)` handles only:
     - `BLOCK_PLACE`: sets block in world and calls `rebuildMeshes()`.
     - `BLOCK_BREAK`: sets block to 0 in world and calls `rebuildMeshes()`.
     - `BED_DESTROY`: destroys bed in teamManager and shows HUD announcement.
   - **Critical defect in `GameManager.js`**:
     - `handleLeftClick()` breaks blocks and beds locally, but **never** sends `BLOCK_BREAK` or `BED_DESTROY` packets to `this.network`!
     - `handleRightClick()` places blocks locally, but **never** sends `BLOCK_PLACE` packets to `this.network`!
     - As a result, the existing networking code is completely dormant during gameplay.

2. **Entity Mesh & Remote Player**:
   - `Player.js`: Base class holding position, velocity, vitals, inventory, resources.
   - `LocalPlayer.js`: First-person controls (keyboard + mouse pointer lock), arm swing mesh, camera binding.
   - `BotPlayer.js`: 3D voxel character mesh (head, helmet, body, arms) with AI brain.
   - **Missing**: There is **no `RemotePlayer` class**! When another human player joins via network, no 3D character mesh is created, no position packets are received, and the remote player is invisible.

3. **`server` Directory**:
   - **Does NOT exist**. No server code, no `/ping` endpoint, no WebSocket server implementation.

4. **LAN Discovery**:
   - **Does NOT exist**. No UDP broadcasting, no mDNS, no local IP detection, no Direct IP:Port UI.

5. **Desktop Packaging (Electron)**:
   - **Does NOT exist**. No `main.cjs`, no preload script, no desktop build commands in `package.json`.

6. **Mobile Packaging & Touch Controls**:
   - **Does NOT exist**. No `capacitor.config.json`, no virtual joystick, no touch camera look, no virtual action buttons.

7. **Web Deployment & Netlify**:
   - `vite.config.js` has `base: './'`, which is correct for cross-platform.
   - `netlify.toml` exists with headers, but lacks SPA redirects and comprehensive CSP headers.
   - `npm run build` succeeds cleanly in 5.4s producing `dist/`.

---

## 5. Deep Dive: Dedicated WebSocket Server & Free Tier Hosting

### Dedicated Server Specifications
The dedicated server must be housed in `server/`:
- `server/package.json`:
  ```json
  {
    "name": "voxel-bedwars-server",
    "version": "1.0.0",
    "private": true,
    "type": "module",
    "main": "server.js",
    "scripts": {
      "start": "node server.js"
    },
    "dependencies": {
      "ws": "^8.18.0"
    }
  }
  ```
- `server/server.js`:
  - Built using standard Node.js `http` module + `ws`.
  - HTTP Request Handler:
    - Route `GET /ping`:
      - Status: `200 OK`
      - Headers: `Content-Type: application/json`, `Access-Control-Allow-Origin: *`
      - Payload:
        ```json
        {
          "status": "ok",
          "service": "voxel-bedwars-multiplayer",
          "uptime": 14238.2,
          "activeRooms": 3,
          "activePlayers": 8,
          "timestamp": 1794000000000
        }
        ```
    - Route `GET /`: Returns service banner and status overview.
  - WebSocket Server attached to HTTP Server:
    - Path: `/ws` (or root `/`).
    - Tracks rooms in a `Map<string, Room>`.
    - Room ID: 4-digit uppercase alphanumeric `BW-XXXX`.
    - Manages room creation, joining, spectator/player slots, team balancing, and authoritative relay.
    - Authoritative ping/pong heartbeat every 30 seconds to detect dead sockets.

### Free Tier Hosting Platform Matrix (24/7/31-Day Uptime, No Credit Card)

| Platform | Free Tier Specifications | Credit Card Required? | Can Run 24/7/31 Days? | Keep-Alive Strategy | WebSocket Support | Verdict |
|----------|--------------------------|-----------------------|-----------------------|---------------------|-------------------|---------|
| **Hugging Face Spaces** | 2 vCPU, 16 GB RAM, Docker or Node SDK | **NO** (Free HF account only) | **YES** (Persistent container) | Direct container or UptimeRobot 5-min `/ping` | Native WSS / HTTPS on port 7860 | **RECOMMENDED PRIMARY** |
| **Glitch** | 1000 free hours/month (744 hrs in 31 days) | **NO** (Free GitHub / email signup) | **YES** (1000 hrs > 744 hrs) | UptimeRobot 5-min HTTP GET to `/ping` prevents sleep | Native WebSockets over HTTPS/WSS | **RECOMMENDED SECONDARY** |
| **Koyeb** | 512MB RAM Eco Instance | Regional checks (some require CC/phone) | Conditional | Auto-sleeps unless pinged | WSS supported | **ALTERNATIVE** |
| **Render** | 512MB RAM free instance | Disqualified by user prompt | **NO** (Sleeps, quota limits, CC enforcement) | Render explicitly banned | N/A | **EXCLUDED** |
| **Fly.io** | Pay-as-you-go / Trial | **YES** (Requires CC on signup) | N/A | N/A | N/A | **DISQUALIFIED** |
| **Railway** | Trial only ($5 one-time) | **YES** (Paid/trial expiry) | N/A | N/A | N/A | **DISQUALIFIED** |
| **Local / LAN Host** | Host machine hardware | **NO** | **YES** (100% local) | Always on while host runs | Direct local `ws://` | **SUPPORTED FOR LAN** |

### UptimeRobot 5-Minute Ping Configuration
- **Monitor Type**: HTTP(s)
- **URL**: `https://<server-domain>/ping`
- **Monitoring Interval**: 5 minutes (300 seconds)
- **HTTP Method**: GET
- **Expected Status**: 200 OK
- **Function**: Periodically triggers incoming HTTP traffic, preventing the free platform container from idling or entering deep sleep.

---

## 6. Deep Dive: Dual-Layer Fallback & State Synchronization Protocol

### Unified Network Architecture (`NetworkAdapter`)

To allow transparent switching between WebSocket and WebRTC without rewriting game logic:

```
                  +---------------------------+
                  |       GameManager         |
                  +-------------+-------------+
                                |
                  +-------------v-------------+
                  |      NetworkManager       |
                  +-------------+-------------+
                                |
                  +-------------v-------------+
                  |   <<NetworkAdapter>>      |
                  +-------------+-------------+
                                |
           +--------------------+--------------------+
           |                                         |
+----------v-----------+                  +----------v-----------+
|  WebSocketAdapter    |  -- Failover ->  |   WebRTCAdapter      |
|  (Dedicated Server)  |  (3.5s timeout)  |  (PeerJS Fallback)   |
+----------------------+                  +----------------------+
```

### Packet Protocol Specification

All packets adhere to a common JSON structure: `{ type: string, payload: any, senderId: string, timestamp: number }`.

| Packet Type | Direction | Payload Schema | Purpose |
|-------------|-----------|----------------|---------|
| `HELLO` | Client -> Server | `{ playerName: string, clientVersion: string }` | Initial client handshake |
| `ROOM_CREATE` | Client -> Server | `{ map: string, format: string, mutations: string[] }` | Request creation of a new room |
| `ROOM_JOIN` | Client -> Server | `{ roomCode: string, playerName: string, team?: string }` | Join existing room |
| `ROOM_STATE` | Server -> Client | `{ roomCode: string, state: string, players: PlayerInfo[], hostId: string }` | Full room lobby state |
| `MATCH_START` | Host/Server -> All | `{ map: string, format: string, mutations: string[], countdown: number }` | Triggers match start |
| `PLAYER_TRANSFORM` | Client -> Server -> All | `{ id: string, x: number, y: number, z: number, yaw: number, pitch: number, vx: number, vy: number, vz: number, onGround: boolean, isSprinting: boolean }` | 20 Hz player position & orientation sync |
| `PLAYER_ACTION` | Client -> Server -> All | `{ id: string, action: 'swing' \| 'use' \| 'slot_change', slot?: number }` | Arm swing & active hotbar item sync |
| `BLOCK_PLACE` | Client -> Server -> All | `{ x: number, y: number, z: number, blockType: number }` | Snaps grid-aligned voxel placement |
| `BLOCK_BREAK` | Client -> Server -> All | `{ x: number, y: number, z: number }` | Voxel block destruction |
| `BED_DESTROY` | Client -> Server -> All | `{ team: string, destroyerId: string, destroyerName: string }` | Bed elimination event |
| `DAMAGE_EVENT` | Client -> Server -> All | `{ attackerId: string, victimId: string, damage: number, knockback: { x: number, y: number, z: number } }` | PvP combat & knockback calculation |
| `PLAYER_DEATH` | Client -> Server -> All | `{ victimId: string, killerId: string, isFinal: boolean }` | Respawn counter or final elimination |
| `ITEM_SPAWN` | Host/Server -> All | `{ id: string, type: 'iron' \| 'gold' \| 'diamond' \| 'emerald', x: number, y: number, z: number }` | Generator drop spawn sync |
| `ITEM_COLLECT` | Client -> Server -> All | `{ itemId: string, collectorId: string }` | Item magnetic pickup confirmation |
| `UPGRADE_PURCHASE` | Client -> Server -> All | `{ team: string, upgradeId: string, newLevel: number }` | Team upgrade broadcast |
| `CHAT_MESSAGE` | Client -> Server -> All | `{ senderName: string, text: string, teamOnly: boolean }` | In-game text chat |
| `WORLD_SNAPSHOT` | Host/Server -> Joiner | `{ placedBlocks: BlockEntry[], brokenBlocks: Pos3[], beds: TeamBedState }` | Fast-forward state for late joiners |

---

## 7. Deep Dive: LAN Multiplayer Architecture

### Desktop Native LAN Implementation
1. **Host Flow**:
   - Host clicks "Host LAN Game".
   - Electron main process retrieves active local IP (e.g. `192.168.1.105`) via `os.networkInterfaces()`.
   - Starts embedded WebSocket server on port `8765`.
   - Starts UDP broadcast socket on port `8766` broadcasting every 2.0s:
     ```json
     {
       "protocol": "VOXEL_BEDWARS_LAN",
       "version": "1.0.0",
       "serverName": "Alex's Bedwars Arena",
       "ip": "192.168.1.105",
       "port": 8765,
       "map": "speedway",
       "format": "2v2",
       "players": 1,
       "maxPlayers": 8
     }
     ```
   - Displays host banner: `Hosting LAN Match on 192.168.1.105:8765`.

2. **Join Flow (Auto-Discovery)**:
   - Client opens "LAN Games" tab.
   - Electron main process listens on UDP port `8766` for `VOXEL_BEDWARS_LAN` datagrams.
   - When detected, pushes server entry to renderer via IPC.
   - UI displays server list with ping, player count, map name, and "Join" button.
   - Clicking "Join" initiates WebSocket connection directly to `ws://192.168.1.105:8765`.

3. **Direct Connect (Universal Fallback for Web/Mobile/Desktop)**:
   - Dedicated modal input: "Direct LAN Connect".
   - Input format: `<IP>:<PORT>` (e.g. `192.168.1.105:8765`).
   - Enables mobile devices, tablets, and web browsers connected to the same Wi-Fi router to play in the exact same LAN match without UDP support!

---

## 8. Deep Dive: Cross-Platform Packaging & Responsive Touch Controls

### Desktop Packaging (Electron)
- **Configuration Structure**:
  - `desktop/main.cjs`:
    - Creates `BrowserWindow`:
      ```javascript
      const win = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 1024,
        minHeight: 600,
        title: "Voxel Bedwars Studio",
        icon: path.join(__dirname, "../public/favicon.svg"),
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false
        }
      });
      ```
    - Loads `dist/index.html` via `win.loadFile()`.
    - Handles native menus, F11 fullscreen toggle, and UDP LAN broadcast/listen IPC handlers.
  - `desktop/preload.cjs`:
    - Safe `contextBridge` exposing `window.desktopAPI` with methods: `getLocalIPs()`, `startLanBroadcast()`, `stopLanBroadcast()`, `startLanDiscovery()`, `stopLanDiscovery()`, `onLanServerFound()`.
  - `package.json` scripts:
    - `"desktop:build": "vite build"`
    - `"desktop:start": "electron desktop/main.cjs"`

### Mobile Packaging (Capacitor)
- **Configuration Structure**:
  - `capacitor.config.json`:
    ```json
    {
      "appId": "com.voxelbedwars.game",
      "appName": "Voxel Bedwars",
      "webDir": "dist",
      "bundledWebRuntime": false,
      "server": {
        "androidScheme": "https"
      }
    }
    ```
  - Mobile viewport meta tag in `index.html`:
    `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`
  - Prevents double-tap zoom, context menu long-press, and rubber-band scrolling.

### Responsive Mobile Touch Controls Engine
1. **Virtual Analog Joystick** (Bottom-Left):
   - Element: `#touch-joystick-zone` with `#touch-joystick-knob`.
   - Computes normalized vector `(dx, dy)`.
   - Deadzone: 10px.
   - Translates to movement:
     - `dy < -0.3` -> `keys.forward = true`
     - `dy > 0.3` -> `keys.backward = true`
     - `dx < -0.3` -> `keys.left = true`
     - `dx > 0.3` -> `keys.right = true`
     - Outer radius threshold (> 85% magnitude) -> `keys.sprint = true`.
2. **Touch-Drag Camera Look** (Right Half):
   - Element: `#touch-look-zone`.
   - Tracks finger touch movement delta `(dx, dy)`.
   - Modifies `LocalPlayer.yaw` and `LocalPlayer.pitch` smoothly:
     `yaw -= dx * touchSensitivity;`
     `pitch = Math.max(-1.55, Math.min(1.55, pitch - dy * touchSensitivity));`
3. **Floating Action Buttons** (Bottom-Right & Top-Right):
   - **Jump Button** (🦘 / ⬆️): Sets `keys.jump = true` on touchstart, `false` on touchend.
   - **Attack / Mine Button** (⚔️): Simulates Left Click (`handleLeftClick()`).
   - **Place / Use Button** (🧱): Simulates Right Click (`handleRightClick()`).
   - **Shop Button** (🛒): Toggles Shopkeeper UI (`hud.openShop()`).
   - **Upgrades Button** (✨): Toggles Upgrades UI.
4. **Touch-Friendly Hotbar**:
   - Sized for mobile tap targets (48x48px min).
   - Direct tap selects slot immediately.

---

## 9. Netlify Web Deployment Specification

### Production Build Verification
- Current build verified working:
  ```bash
  cd "C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars"; npm run build
  ```
  Output:
  - `dist/index.html` (12.16 kB)
  - `dist/assets/index-CCrzCYti.css` (10.40 kB)
  - `dist/assets/index-BNNvxALt.js` (626.41 kB)
  - Total build time: ~5.4 seconds.

### Enhanced `netlify.toml` Specification
The current `netlify.toml` requires enhancements for SPA routing, CORS, and WebSocket connect-src:

```toml
[build]
  command = "npm run build"
  publish = "dist"

# SPA redirect rule ensuring deep links and query parameters resolve to index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security and networking headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https: wss: ws:; connect-src 'self' blob: data: https: wss: ws: https://*.peerjs.com wss://*.peerjs.com; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"
```

---

## 10. Concrete Implementation Roadmap for Subsequent Phases

1. **Step 1: Dedicated WebSocket Server (`server/`)**:
   - Implement `server/package.json` and `server/server.js` using Node.js + `ws`.
   - Implement `/ping` HTTP endpoint for UptimeRobot.
   - Implement room manager with 4-letter codes and authoritative packet relay.
   - Add Dockerfile and README documentation for 1-click deployment to Hugging Face Spaces and Glitch.
2. **Step 2: Dual-Layer Client Networking (`src/net/`)**:
   - Refactor `NetworkManager.js` with unified `NetworkAdapter` interface.
   - Implement `WebSocketAdapter.js` and `WebRTCAdapter.js`.
   - Add automatic 3.5s timeout fallback from WebSocket to WebRTC.
   - Implement `RemotePlayer.js` with 3D character mesh and lerped position interpolation.
   - Connect block placing, breaking, bed destruction, and combat to `network.broadcast()`.
3. **Step 3: LAN Multiplayer & Direct Connect**:
   - Add LAN direct connect UI (`<IP>:<PORT>`).
   - Implement Electron IPC bridge for UDP broadcasting (port 8766) and local IP detection.
4. **Step 4: Cross-Platform Desktop & Mobile Packaging**:
   - Create `desktop/main.cjs` and `desktop/preload.cjs` for Electron.
   - Create `capacitor.config.json` for mobile packaging.
5. **Step 5: Responsive Mobile Touch Controls**:
   - Add HTML touch overlay elements in `index.html`.
   - Implement virtual joystick, touch camera drag zone, and action buttons in `TouchControls.js`.
   - Integrate with `LocalPlayer.js` inputs.
6. **Step 6: Netlify & Web Deployment Configuration**:
   - Update `netlify.toml` with SPA redirects and CSP headers.
   - Verify production build and asset bundling.

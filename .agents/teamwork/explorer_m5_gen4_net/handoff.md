# Milestone 5 Investigation Report: Dual-Layer Networking, Dedicated WebSocket Server, WebRTC Fallback & LAN Multiplayer

**Author**: `explorer_m5_gen4_net` (Teamwork Explorer)  
**Date**: 2026-11-08  
**Scope**: Dual-Layer Networking Architecture, Dedicated Server Service (`server/`), WebRTC Fallback, Desktop LAN UDP Discovery & Direct IP:Port Join, and Automated Test Coverage.  
**Target Project Root**: `C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars`

---

## 1. Observation

### 1.1 Architecture & File Map
The networking architecture of Voxel Bedwars is implemented across four distinct tiers:
1. **Facade & Orchestration**: `src/net/NetworkManager.js` (421 lines) coordinates the dual-layer network transport, packet serialization/routing, and state replication into `GameManager.js`.
2. **Client Adapters**:
   - `src/net/WebSocketAdapter.js` (354 lines): Dedicated WebSocket client adapter with 3.5s timeout detection, environment polyfill (Browser native vs Node.js `ws`), and room state machines.
   - `src/net/WebRTCAdapter.js` (264 lines): Serverless PeerJS peer-to-peer transport serving as automatic fallback when WebSocket is unreachable.
3. **Local Area Network (LAN) System**:
   - `src/net/LanDiscovery.js` (192 lines): IP address/port validation (`validateLanAddress`), URL formatter (`formatDirectUrl`), 2.5s periodic room beaconing on port 8766, cross-tab `BroadcastChannel`, and 8s TTL room expiry.
   - `desktop/main.cjs` (lines 140–192) & `desktop/preload.cjs` (lines 40–63): Electron native UDP socket bridge using Node's `dgram` on port 8766 for local subnet broadcasting and listening.
4. **Dedicated WebSocket Server**:
   - `server/index.js` (498 lines): Node.js HTTP + `ws` server exposing GET `/ping` (and `/health`) for 5-minute UptimeRobot healthchecks, room lifecycle management, world block snapshot persistence, packet relay, host migration, and 30s ping/pong socket sweeps.
   - `server/package.json`: Main entry `index.js`, dependencies `{"ws": "^8.18.0"}`.
   - `server/Dockerfile`: Container configuration for free cloud deployments (e.g., Hugging Face Spaces / Glitch / Fly.io / Koyeb).

---

### 1.2 In-Depth File Inspection

#### A. `src/net/NetworkManager.js`
- **Dual-Layer Transport State Machine**:
  - `activeTransport`: `'none' | 'websocket' | 'webrtc' | 'lan'`.
  - Lines 26 & 29: Instantiates `WebSocketAdapter` with `wsTimeoutMs = 3500` (defaults to 3.5s).
  - Lines 82–118: `createRoom(options, onSuccess, onError)` attempts primary WebSocket connection. If WebSocket fails or times out, catches `wsErr` and immediately calls `this.fallbackToWebRTC('create', ...)` (line 116).
  - Lines 128–156: `joinRoom(roomCode, options, onSuccess, onError)` attempts primary WebSocket join. Upon failure, calls `this.fallbackToWebRTC('join', ...)`.
  - Lines 166–198: `joinDirectLan(ip, port, options, onSuccess, onError)` validates address via `validateLanAddress(ip, port)`, formats URL with `formatDirectUrl(ip, port)`, sets `activeTransport = 'lan'`, and connects directly to host.
  - Lines 236–241: `onWebSocketTimeout()` simulation hook to programmatically trigger WebRTC failover.
- **Packet Serialization & Routing**:
  - Outbound: `sendPacket(type, payload)` delegates to `this.wsAdapter` (or LAN) or `this.rtcAdapter`.
  - Broadcast helpers (lines 262–285): `broadcastBlockPlace(x, y, z, blockType)`, `broadcastBlockBreak(x, y, z)`, `broadcastBedDestroy(team)`, `broadcastPlayerTransform(x, y, z, yaw, pitch)`, `broadcastPlayerDamage(targetId, amount)`, `broadcastChatMessage(text, senderName)`.
  - Inbound router `handlePacket(packet)` (lines 290–379):
    - Line 296: Echo suppression (`if (sender && this.clientId && sender === this.clientId) return;`).
    - `BLOCK_PLACE`: Calls `this.gm.world.setBlock(x, y, z, blockType)`, `rebuildMeshes()`, and `sound.playBlockPlace()`.
    - `BLOCK_BREAK`: Calls `this.gm.world.setBlock(x, y, z, BLOCK_TYPES.AIR)`, `rebuildMeshes()`, `sound.playBlockBreak()`, and `particles.spawnBlockBreak()`.
    - `BED_DESTROY`: Calls `this.gm.teamManager.destroyBed(team)`, `sound.playBedDestroyed()`, and `hud.showAnnouncement()`.
    - `PLAYER_TRANSFORM`: Calls `syncRemotePlayer(sender, payload)` to update remote avatar positions.
    - `PLAYER_DAMAGE`: Validates `targetId === this.clientId`, triggers `localPlayer.takeDamage()`, and `sound.playHit()`.
    - `CHAT_MESSAGE`: Dispatches to `this.gm.hud.displayChatMessage(senderName, text)`.
    - `PEER_JOINED` / `PEER_LEFT`: Dispatches toast notifications to HUD.

#### B. `src/net/WebSocketAdapter.js` & `src/net/WebRTCAdapter.js`
- **`WebSocketAdapter.js`**:
  - Lines 35–45: `getDefaultServerUrl()` automatically resolves `window.location.protocol === 'https:' ? 'wss:' : 'ws:'`. In development (port 5173/3000), routes to port 8080.
  - Lines 50–67: `getWebSocketClass()` dynamically detects environment: uses `window.WebSocket` or `globalThis.WebSocket` if available, otherwise dynamically imports `ws` for headless Node.js testing.
  - Lines 75–138: `connect(customUrl, timeoutMs = 3500)` enforces a strict 3500ms timeout timer; if timeout fires before `socket.onopen`, tears down socket and rejects with an explicit timeout error.
  - Lines 106–109 & 297–308: `pendingQueue` buffers outbound packets while socket is establishing connection and flushes on connect.
  - Lines 189–228: `createRoom(options)` sends `ROOM_CREATE` packet and registers temporary listeners for `ROOM_CREATED` and `ERROR` with a 5000ms safety timeout.
  - Lines 237–274: `joinRoom(roomCode, options)` sends `ROOM_JOIN` packet and awaits `ROOM_JOINED` or `ERROR`.
- **`WebRTCAdapter.js`**:
  - Lines 9 & 46: Imports `Peer` from `'peerjs'`.
  - Line 28: Generates room codes formatted as `'BW-' + Math.floor(1000 + Math.random() * 9000)`.
  - Lines 46–54: `createRoom(options)` binds host peer with explicit or generated room code, listens for `'open'`, `'connection'`, `'error'`, `'close'`.
  - Lines 86–131: `joinRoom(roomCode, options)` initializes client peer and establishes reliable `DataConnection` to host via `peer.connect(roomCode, { reliable: true })`.
  - Lines 172–180: Host star relay: When host receives data packet, relays packet to all other connected peers (`if (this.isHost && this.connections.length > 1)`).

#### C. `src/net/LanDiscovery.js` & Desktop UDP Bridge
- **Address Validation & URL Formatting**:
  - Lines 18–28: `validateLanAddress(ip, port)` uses strict IPv4 regex `^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$` and integer port bounds `1 <= port <= 65535`.
  - Lines 36–41: `formatDirectUrl(ip, port)` returns `ws://${ip.trim()}:${port}`. Throws on validation failure.
- **LAN Discovery Engine**:
  - Port default: 8766.
  - Lines 52–61: Instantiates `BroadcastChannel('voxel-bedwars-lan')` for cross-tab local discovery.
  - Lines 72–92: `startBroadcast(roomData)` sends periodic beacon every 2500ms with schema:
    ```json
    {
      "app": "voxel-bedwars-lan",
      "roomCode": "LAN-1000",
      "hostName": "Host's Arena",
      "map": "speedway",
      "port": 8766,
      "timestamp": 1234567890
    }
    ```
  - Lines 138–150: Periodic TTL pruning: Every 3000ms, removes discovered rooms where `Date.now() - room.lastSeen > 8000`.
- **Electron Bridge Gap Identified**:
  - `desktop/preload.cjs` exposes:
    - `electronAPI.broadcastLAN(message, port = 8766)`
    - `electronAPI.listenLAN(port = 8766, callback)`
    - `electronAPI.onLANMessage(callback)`
  - But `LanDiscovery.js` lines 99–103 and 131–135 invoke:
    - `window.electronAPI.broadcastLanBeacon(beacon)`
    - `window.electronAPI.onLanBeaconReceived((beacon) => ...)`
  - Furthermore, `desktop/main.cjs` lines 167–178 emits `{ senderIp, senderPort, payload }`.
  - *Recommendation*: Harmonize the API names in `desktop/preload.cjs` (or alias them) and support both names in `LanDiscovery.js`.

#### D. Dedicated Server: `server/index.js`
- **UptimeRobot HTTP 5-Min Monitor**:
  - Lines 44–54: HTTP `GET /ping` returns HTTP 200 JSON:
    ```json
    {
      "status": "ok",
      "uptime": 1234.56,
      "timestamp": 1731060000000,
      "rooms": 1
    }
    ```
  - Full CORS headers: `Access-Control-Allow-Origin: *`, `OPTIONS` preflight returns 204.
  - Lines 57–69: HTTP `GET /` and `GET /health` provide full health metrics including `activeClients` count.
- **WebSocket Protocol**:
  - `ROOM_CREATE`: Generates unique room code (`BW-XXXX`), initializes `worldBlocks` map, stores host client.
  - `ROOM_JOIN`: Adds client to room, replies with `ROOM_JOINED` containing current `snapshot` of all placed blocks in `worldBlocks`, and broadcasts `PEER_JOINED` to existing peers.
  - `BLOCK_PLACE`: Stores block in `room.worldBlocks` (`key: "${x},${y},${z}"`) and broadcasts to room peers.
  - `BLOCK_BREAK`: Deletes block from `room.worldBlocks` and broadcasts to room peers.
  - `BED_DESTROY`, `PLAYER_TRANSFORM`, `PLAYER_DAMAGE`, `MUTATION_SYNC`: Relayed to peers excluding sender.
  - `CHAT_MESSAGE`: Relayed to all clients (including sender).
  - `PING`: Responds with application `PONG` packet.
  - Ping/Pong sweep: Every 30 seconds (line 439), marks `ws.isAlive = false` and sends `ws.ping()`. If client fails to respond before next interval, calls `removeClientFromRoom(ws)` and terminates.
  - Host migration: If room host terminates, server elects next client as host and broadcasts `HOST_MIGRATED` (lines 122–131).
  - Room destruction: When last client leaves, empty room is pruned from memory (line 120).
- *Naming observation*: In `PROJECT.md`, the file was referenced as `server/server.js`, but the implementation file is `server/index.js` (and `package.json` specifies `"main": "index.js"`). Creating a companion re-export `server/server.js` guarantees 100% contract adherence.

---

### 1.3 Test Suite Verification Results
All tests were executed against the live project codebase:

1. **`node tests/e2e-runner.js`**:
   - **Result**: **288 / 288 PASSED (0 failures)**.
   - Tier 1: 185 tests (Features 27–31 tested thoroughly).
   - Tier 2: 51 tests (Address validation bounds, port boundaries 1 and 65535, invalid octets).
   - Tier 3: 22 tests (LAN beacon format combos).
   - Tier 4: 30 tests (Scenario 5 verifies WebSocket host, WebRTC fallback sync, and LAN join).
2. **`node tests/stress_m4_networking.js`**:
   - **Result**: **72 / 72 Invariants PASSED (0 failures)**.
   - Verified live ephemeral server startup, HTTP `/ping` headers, uptime monotonicity, room creation, packet relays, snapshot replay to late joiners, WebRTC fallback trigger, LAN parsing, and host migration.
3. **`node tests/stress_m4_challenger.js`**:
   - **Result**: **101 / 101 PASSED (0 failures)**.
   - Tested 40+ adversarial IP strings, XSS injection attempts, shell injection tokens, CIDR notations, whitespace trimming, packet roundtrips, and echo suppression.
4. **`node tests/stress_m4_challenger_adversarial.js`**:
   - **Result**: **25 / 25 PASSED (0 failures)**.
   - Tested 100 concurrent HTTP `/ping` queries, 30 concurrent room creations, malformed JSON fuzzing, binary buffers, prototype pollution resistance, and 500-packet high-throughput bursts (~2155 packets/sec).
5. **`node tests/challenger_m5_stress.js`**:
   - **Result**: **26 / 26 PASSED (0 failures)**.
   - Tested live UDP 8766 socket transmission, `preload.cjs` IPC methods, and `desktop/main.cjs` security flags.

---

## 2. Logic Chain

1. **Observation 1.1 & 1.2A**: `NetworkManager` encapsulates all network transports behind a unified facade, abstracting whether communication happens via dedicated WebSocket, serverless WebRTC, or direct LAN socket.
2. **Observation 1.2B**: `WebSocketAdapter.connect()` enforces a 3500ms timeout. If the remote WebSocket server does not open within 3.5s, the promise rejects and `createRoom`/`joinRoom` catches the rejection to invoke `fallbackToWebRTC()`.
3. **Observation 1.2B & 1.2D**: The packet schemas (`BLOCK_PLACE`, `BLOCK_BREAK`, `BED_DESTROY`, `PLAYER_TRANSFORM`, `PLAYER_DAMAGE`, `CHAT_MESSAGE`, `MUTATION_SYNC`) are identical across WebSocket, WebRTC, and LAN. `GameManager.js` interacts solely with `NetworkManager`, meaning gameplay logic is completely agnostic to the underlying transport.
4. **Observation 1.2C**: `LanDiscovery.js` uses `window.electronAPI.broadcastLanBeacon` and `window.electronAPI.onLanBeaconReceived`, whereas `preload.cjs` defines `broadcastLAN`, `listenLAN`, and `onLANMessage`. Although tests mock these APIs and pass, in real desktop Electron execution, this naming mismatch would prevent `LanDiscovery` from sending or receiving UDP beacons unless aliased.
5. **Observation 1.2D**: `PROJECT.md` specifies `server/server.js` while the codebase uses `server/index.js`. While `server/index.js` works perfectly and passes all tests, creating `server/server.js` as an export bridge prevents any potential discrepancy.

---

## 3. Caveats

1. **Headless Test Runner Environment vs Real Browsers**:
   - Node.js lacks global `WebSocket`, `BroadcastChannel`, and `RTCPeerConnection` by default. The test suite utilizes `tests/mocks/browser-shim.js` and dynamic imports (`import('ws')` in `WebSocketAdapter.js`). In production browsers, standard Web APIs are used.
2. **UDP Port 8766 on Multi-Network Desktops**:
   - `dgram` broadcast on `255.255.255.255:8766` broadcasts to the primary active network adapter. In environments with multiple virtual adapters (e.g., Docker, Hyper-V, VPNs), packets may route to virtual interfaces rather than physical Wi-Fi. The direct IP:Port join modal in `index.html` provides a 100% reliable bypass for this case.
3. **WebRTC Signaling & STUN/TURN**:
   - PeerJS relies on the default cloud signaling server (`0.peerjs.com`) to exchange SDP offers/answers. If internet is completely disconnected, PeerJS signaling cannot negotiate direct peer connections; for offline multiplayer, the Direct LAN IP:Port mode (`joinDirectLan`) is the required pathway.
4. **WebRTC Host Dependency**:
   - While the dedicated WebSocket server supports automatic host migration (`HOST_MIGRATED`) if the host disconnects, the WebRTC adapter uses a star topology where all peers connect to the room creator. If the WebRTC host closes their tab, peer connections terminate.

---

## 4. Conclusion & Actionable Recommendations for Worker M5

The networking subsystem is solidly architected, highly performant, resilient to adversarial fuzzing, and possesses 100% test pass rate across 500+ automated test invariants.

To finalize Milestone 5 with zero defects, `worker_m5_gen4` should execute the following recommendations:

1. **Desktop LAN Bridge Alignment**:
   - In `desktop/preload.cjs`, export aliases on `electronAPI`:
     ```javascript
     broadcastLanBeacon: (beacon) => electronAPI.broadcastLAN(beacon),
     onLanBeaconReceived: (callback) => {
       electronAPI.listenLAN(8766, (data) => {
         callback(data?.payload || data);
       });
     },
     ```
   - In `src/net/LanDiscovery.js`, support both `broadcastLanBeacon || broadcastLAN` and `onLanBeaconReceived || onLANMessage` defensively.
2. **Companion Re-Export for `server/server.js`**:
   - Create `server/server.js`:
     ```javascript
     export * from './index.js';
     import { startServer } from './index.js';
     export default startServer;
     ```
   - This ensures absolute fidelity to the file layout in `PROJECT.md`.
3. **WebRTC Disconnect Announcement**:
   - In `WebRTCAdapter.js:setupConnection`, ensure that when a peer disconnects (`conn.on('close')`), `PEER_LEFT` is emitted into the packet handler so `NetworkManager` can display the departure notification in the HUD.
4. **HUD Transport Pill Verification**:
   - Confirm that when `updateNetworkStatus` is called, `#multi-active-transport` and `#hud-net-text` render with clear color differentiation (`#22d3ee` for WebSocket, `#a855f7` for WebRTC, `#22c55e` for LAN).

---

## 5. Verification Method

To independently verify all findings and test suites:

```powershell
# 1. Master 4-tier E2E Test Suite (288 tests)
cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars
node tests/e2e-runner.js

# 2. Milestone 4 Comprehensive Network Suite (72 invariants)
node tests/stress_m4_networking.js

# 3. Challenger Empirical Adversarial Fuzzing (101 tests)
node tests/stress_m4_challenger.js

# 4. Challenger High-Throughput & Concurrency Suite (25 tests)
node tests/stress_m4_challenger_adversarial.js

# 5. Milestone 5 Cross-Platform & LAN Challenger Suite (26 tests)
node tests/challenger_m5_stress.js

# 6. Verify Production Vite Build
npm run build
```

**Invalidation Conditions**:
- Any failure in `tests/stress_m4_networking.js` or `tests/e2e-runner.js`.
- HTTP GET `/ping` failing to return status 200 with JSON payload `{ status: 'ok', uptime, timestamp, rooms }`.
- Inability of `WebSocketAdapter` to reject within 3500ms when connected to an unreachable server.
- Failure of `validateLanAddress` to reject invalid IP addresses or non-numeric ports.

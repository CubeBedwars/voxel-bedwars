## 2026-11-07T21:26:05Z
You are worker_m4, a teamwork_worker specializing in implementing Milestone 4: Dual-Layer Networking, Dedicated Server, Uptime Monitoring, and LAN Multiplayer for Voxel Bedwars.

Working directory: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\worker_m4\
Project root: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars
Orchestrator conversation ID: 8d1ff656-e586-4008-aecc-3bcfb63dc109

MANDATORY FIRST STEP:
Read these files before taking any action:
1. C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\ORIGINAL_REQUEST.md
2. C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\PROJECT.md
3. C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\src\net\NetworkManager.js

EXCLUSIVE FILE WRITE OWNERSHIP:
- server/ (all files: server/package.json, server/index.js, server/Dockerfile, server/README.md, server/.env.example)
- src/net/NetworkManager.js
- src/net/WebSocketAdapter.js
- src/net/WebRTCAdapter.js
- src/net/LanDiscovery.js
- src/game/GameManager.js (network state synchronization)
- src/ui/HUD.js (network status badge, LAN / Direct IP:Port join modal)
- index.html (join modal & network badge container)
- package.json (add root script if needed e.g. "server": "node server/index.js")
- tests/stress_m4_networking.js

OBJECTIVES & REQUIREMENTS (R4 & Features 27–31):
1. **Dedicated WebSocket Multiplayer Service (`server/` repository)**:
   - Create a clean, production-grade standalone service in `server/`.
   - Implement `server/package.json` with `ws` and basic dependencies.
   - Implement `server/index.js` featuring:
     - An HTTP server exposing `GET /ping` returning JSON `{ status: "ok", uptime: process.uptime(), timestamp: Date.now(), rooms: Object.keys(rooms).length }` specifically tailored for UptimeRobot monitoring every 5 minutes to prevent cold starts/idling.
     - WebSocket server attached to the HTTP server supporting:
       - Room creation (`ROOM_CREATE`), room joining (`ROOM_JOIN`), and room listing.
       - Low-latency state packet relay (`BLOCK_PLACE`, `BLOCK_BREAK`, `BED_DESTROY`, `PLAYER_TRANSFORM`, `PLAYER_DAMAGE`, `CHAT_MESSAGE`, `MUTATION_SYNC`).
       - Ping/pong heartbeats to detect stale connections and clean up rooms when host leaves.
     - `server/Dockerfile` for containerized hosting.
     - `server/README.md` documenting deployment steps for free tier platforms supporting 24/7/31-day continuous uptime without credit cards (excluding Render; e.g. Koyeb, HuggingFace Spaces Docker, Fly.io, Railway, or Glitch) and UptimeRobot 5-minute `/ping` monitoring setup.
2. **Dual-Layer Fallback Architecture in `src/net/`**:
   - `src/net/WebSocketAdapter.js`: Handles connection to the dedicated WebSocket server with room codes and state sync.
   - `src/net/WebRTCAdapter.js`: Encapsulates serverless browser peer-to-peer (PeerJS with room codes).
   - `src/net/NetworkManager.js`: Unified facade that:
     - Attempts primary connection via dedicated WebSocket server.
     - Automatically detects WebSocket connection failure/timeout and seamlessly falls back to serverless WebRTC PeerJS with room codes!
     - Exposes an active transport indicator (`getTransportName()`: "WebSocket" or "WebRTC (Fallback)").
     - Dispatches and receives all gameplay state packets: `BLOCK_PLACE`, `BLOCK_BREAK`, `BED_DESTROY`, `PLAYER_TRANSFORM`, `PLAYER_DAMAGE`, `CHAT_MESSAGE`.
3. **Local Area Network (LAN) Multiplayer & Direct Join (`src/net/LanDiscovery.js`)**:
   - For desktop and mobile builds:
     - Support local host match hosting.
     - Support LAN broadcasting and discovery (via local subnet beacon or UDP discovery in Electron/desktop).
     - Direct IP:Port Join Modal in HUD: allows players on the same Wi-Fi / local network to enter an IP and Port (e.g. `192.168.1.100:8080`) to connect directly without internet access.
4. **Game Integration & HUD**:
   - Integrate `NetworkManager` into `GameManager.js` so remote player transforms are rendered in the scene, blocks placed/broken by peers update the voxel world, bed destructions broadcast to all players, and damage syncs with health hearts.
   - Add a clean network status indicator to `HUD.js` / `index.html` showing connection status (Connected / Fallback / Disconnected) and room code.
5. **Milestone 4 Test Suite (`tests/stress_m4_networking.js`)**:
   - Create a comprehensive automated test script that:
     - Starts the server programmatically on an ephemeral port.
     - Tests the `/ping` HTTP endpoint (asserting HTTP 200, status "ok", uptime, timestamp).
     - Tests WebSocket room creation, client joining, and bidirectional packet relay (`BLOCK_PLACE`, `BLOCK_BREAK`, `BED_DESTROY`, `PLAYER_TRANSFORM`, `PLAYER_DAMAGE`).
     - Tests simulated WebSocket failure triggering automatic fallback to WebRTC.
     - Tests Direct IP:Port endpoint resolution and connection configuration.
     - Asserts at least 50+ rigorous network and packet invariants.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

BUILD & TEST VERIFICATION:
Run and verify:
1. `node tests/stress_m4_networking.js`
2. `npm test`
3. `npm run build`

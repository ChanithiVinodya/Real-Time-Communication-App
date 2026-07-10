<div align="center">

# 🎥 Symphony

### Real-Time Video Conferencing & Collaboration — Built From Scratch

*A peer-to-peer video calling app with multi-user WebRTC mesh, screen sharing, a live collaborative whiteboard, encrypted file sharing, and JWT authentication — built to actually understand the WebRTC internals, not just wire up an SDK.*

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=node.js&logoColor=white)](#)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)](#)
[![WebRTC](https://img.shields.io/badge/WebRTC-Mesh-EA4335?logo=webrtc&logoColor=white)](#)
[![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)](#)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)

 **[✨ Features](#-features)** · **[🚀 Quick start](#-quick-start)** · **[🔐 Security](#-security-highlights)**

</div>

<br/>

## 📸 Screenshots

<table>
  <tr>
    <td width="50%">
      <img width="598" height="457" alt="Screenshot 2026-07-09 190352" src="https://github.com/user-attachments/assets/a4f8dc30-2788-40a9-ba24-c0703daf974f" />
      <p align="center"><sub><b>Lobby</b> — sign in and join a room</sub></p>
    </td>
    <td width="50%">
      <img width="1857" height="992" alt="Screenshot 2026-07-08 231931" src="https://github.com/user-attachments/assets/cb8f9b27-2ebf-49ec-9e48-afad91ef210d" />
      <p align="center"><sub><b>Video call</b> — multi-user WebRTC mesh</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img width="1091" height="791" alt="Screenshot 2026-07-09 190722" src="https://github.com/user-attachments/assets/1e1fc758-0c93-42ed-adcb-bb11e256e4f6" />
      <p align="center"><sub><b>Whiteboard</b> — real-time collaborative drawing</sub></p>
    </td>
    <td width="50%">
      <img width="1847" height="993" alt="screenshare" src="https://github.com/user-attachments/assets/0ba41a9f-46dc-4ff4-9cd2-de1a98af8117" />
      <p align="center"><sub><b>Screen share</b> — swap tracks with no renegotiation</sub></p>
    </td>
  </tr>
</table>

## ✨ Features

| | |
|---|---|
| 🎥 **Multi-user video calling** | WebRTC mesh — every peer connects directly to every other peer, no media server in the middle |
| 🖥️ **Screen sharing** | Swaps the outgoing video track live via `RTCRtpSender.replaceTrack()`, no renegotiation |
| 🖊️ **Collaborative whiteboard** | Canvas drawing synced in real time over Socket.io, with state replay for late joiners |
| 📁 **Encrypted file sharing** | Files encrypted at rest (AES-256-GCM), served via signed, expiring download links |
| 🔐 **JWT authentication** | Signup/login with bcrypt, verified on both REST routes and the Socket.io handshake |
| 🎙️ **Camera / mic controls** | Instant toggle via `track.enabled`, with live "camera off" / muted indicators for peers |
| 🌐 **NAT traversal** | STUN + time-limited TURN credentials (HMAC-signed, 1-hour expiry — no static secrets) |
| 🛡️ **Rate limiting & validation** | Stricter limits on auth routes, input validation on signup/login |

<br/>

## 🏗️ Architecture

Media (video/audio/screen) flows **directly between browsers** in a peer-to-peer mesh — the server is never in the media path. Signaling (Socket.io) just helps peers find each other and exchange connection info; a TURN server is a fallback for the networks where direct P2P is blocked.

```
Clients (Browser, WebRTC peers)
   │  WebRTC media (P2P mesh)
   │
   ├── Signaling server (Socket.io, JWT-authenticated)
   │        │
   │        └── TURN / STUN — time-limited credentials
   │
   └── Auth API (JWT + bcrypt)
            │
            ├── MongoDB — users, rooms, file metadata
            └── Encrypted file storage (AES-256-GCM)
```

<sub>Deliberately mesh instead of an SFU: at a ~6-person cap, every peer only manages a handful of connections, and it means building the real WebRTC offer/answer/ICE mechanics instead of hiding behind a managed service. Documented tradeoff, not an oversight — see [`rtc-app-project-plan.md`](./rtc-app-project-plan.md).</sub>

<br/>

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-username/meshmeet.git
cd meshmeet/backend && npm install
cd ../frontend && npm install

# 2. Configure environment (see below for required secrets)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Run both
cd backend && npm run dev      # http://localhost:5000
cd frontend && npm run dev     # http://localhost:5173
```

<details>
<summary><b>📋 Full setup details — MongoDB, required secrets, and testing the mesh</b></summary>

<br/>

**MongoDB:** run locally (`mongod`) or use a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster, and paste the connection string into `MONGO_URI`.

**Required secrets** in `backend/.env` (the server validates these at startup and refuses to boot without them):

```bash
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → TURN_SECRET
openssl rand -hex 32   # → FILE_ENCRYPTION_KEY  (must be exactly 32 bytes / 64 hex chars)
```

**Testing multi-user video:** open the app in two separate browser profiles (not just two tabs of the same browser — they'd share `localStorage` and log in as the same account), sign up in each, and join the same room code from the lobby. To properly exercise NAT traversal/TURN, test across two *different* networks (e.g. wifi + a phone hotspot) rather than the same LAN.

</details>

<br/>

## 🔐 Security Highlights

Built with the assumption that a real video app has to take this seriously, not bolt it on at the end:

- **Encryption at rest** — uploaded files are AES-256-GCM encrypted before ever touching disk
- **Signed, expiring links** — file downloads require an HMAC-signed token that expires after an hour, not just a guessable id
- **No permanent secrets over the wire** — TURN credentials are time-limited (1 hour), generated server-side via HMAC per [coturn's REST API auth scheme](https://github.com/coturn/coturn/wiki/turnserver#turn-rest-api)
- **Verified identity everywhere** — the Socket.io handshake itself requires a valid JWT; display names are derived from the verified token, never trusted from client input
- **DTLS-SRTP** — WebRTC media is end-to-end encrypted by the protocol itself, on top of everything above
- **Fail-fast config** — the server refuses to start with missing or placeholder secrets

<br/>

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Real-time media | Native `RTCPeerConnection` (WebRTC), no wrapper library |
| Signaling | Node.js, Express, Socket.io |
| Auth | JWT, bcrypt |
| Database | MongoDB / Mongoose |
| File storage | AES-256-GCM at rest, local disk (swap-in ready for S3) |
| NAT traversal | STUN + coturn (TURN), HMAC time-limited credentials |

<br/>

## 📂 Project Structure

```
meshmeet/
├── backend/
│   └── src/
│       ├── config/       # DB connection, env validation
│       ├── controllers/  # auth, files, TURN credentials
│       ├── middleware/   # JWT auth, request validation
│       ├── models/       # User, Room, FileAsset
│       ├── routes/       # REST endpoints
│       └── socket/       # WebRTC signaling, whiteboard relay
└── frontend/
    └── src/
        ├── components/   # Whiteboard, FileShare, ProtectedRoute
        ├── context/       # AuthContext
        ├── hooks/         # useWebRTC (the mesh logic)
        ├── lib/           # API client, auth helpers, socket instance
        └── pages/         # Login, Lobby, Room
```

<br/>

## 🗺️ Roadmap

- [ ] Deploy a live demo (Vercel + Render/Railway + a small TURN VPS)
- [ ] Room ownership / host permissions (remove participant, lock room)
- [ ] Refresh token rotation (currently a 7-day JWT with no rotation)
- [ ] Move file storage from local disk to S3
- [ ] Migrate the mesh to an SFU (e.g. mediasoup/LiveKit) past ~8 participants

<br/>

## 🙋 About This Project

Built as a hands-on deep dive into real-time systems — WebRTC's offer/answer/ICE dance, NAT traversal, mesh topology tradeoffs, and the security considerations that come with handling live media and user files. The full phased build plan (and the reasoning behind each architectural decision) is documented in [`rtc-app-project-plan.md`](./rtc-app-project-plan.md).


<div>
Built by <a href="https://github.com/ChanithiVinodya">Chanithi Vinodya</a> 
</div>

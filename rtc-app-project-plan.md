# Real-Time Communication App — Project Plan

**Type:** Video conferencing + collaboration tool
**Goal:** Internship project / portfolio piece
**Scale target:** Small groups (2–6 users), peer-to-peer mesh

---

## 1. Architecture Overview

Media (video/audio) flows **directly between browsers** once a connection is established — the servers never touch the video stream itself. The signaling server is a matchmaker: it helps peers exchange connection info, then gets out of the way. A TURN server is a fallback for the ~10–15% of networks where direct peer-to-peer is blocked by strict NATs/firewalls.

```
Clients (Browser, WebRTC peers)
   │  WebRTC media (P2P mesh — direct audio/video/screen share)
   │
   ├── Signaling server (Socket.io) — exchanges offers/answers/ICE candidates
   │        │
   │        └── TURN / STUN server — relays media if P2P fails
   │
   └── Auth API — validates JWT, manages rooms
            │
            ├── Database — users, rooms, metadata
            └── File storage (S3) — encrypted file uploads
```

**Why mesh, not a media server (SFU):** At a max of 6 participants, each peer only manages 5 direct connections — well within what a browser can handle. This avoids the cost/complexity of running a media server (e.g. mediasoup, LiveKit) and means you build and understand the *actual* WebRTC internals — offer/answer negotiation, ICE candidate exchange, track handling — which is the most educational and portfolio-differentiating part of this project. It doesn't scale past ~6–8 people (bandwidth/CPU grow O(n²)); worth stating explicitly as a known, deliberate tradeoff.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript, Tailwind CSS | Industry standard, clean for a portfolio |
| Media | Native `RTCPeerConnection` API | Learn the real mechanics instead of hiding behind a wrapper library |
| Signaling | Node.js + Socket.io | Simple room/event model |
| Auth | JWT + bcrypt (self-built) or Firebase Auth | Self-built teaches more; Firebase saves time if you're short on it |
| Database | MongoDB (Mongoose) or PostgreSQL | Either works — Postgres if you want relational/SQL practice |
| File sharing | Upload to S3/Cloudinary via signed URLs, metadata in DB | Don't push large files over WebRTC data channels |
| Whiteboard | HTML5 Canvas (or Fabric.js), Socket.io broadcast; optionally Yjs (CRDT) | Yjs turns this into real collaborative editing — a strong standout feature |
| TURN/STUN | Self-hosted coturn on a small VPS, or free dev tier (Metered.ca / Twilio) | Needed even for testing — most home/corporate NATs require it |
| Deployment | Vercel/Netlify (frontend), Render/Railway (backend), small VPS (coturn) | Free/cheap tiers cover this whole project |

---

## 3. Phased Roadmap

### Phase 0 — Setup (2–3 days)
- Repo scaffolding (monorepo or separate frontend/backend)
- ESLint/Prettier, basic CI
- Confirm architecture decisions (this doc)

### Phase 1 — Auth & Rooms (1 week)
- Signup/login with JWT, password hashing (bcrypt)
- Protected routes
- Room creation/joining (room codes or shareable links)

### Phase 2 — 1:1 Video Call (1–1.5 weeks)
This is the conceptual core of the project. Focus areas:
- `getUserMedia()` to capture camera/mic
- Socket.io signaling events: `offer` → `answer` → `ice-candidate` between two peers
- `RTCPeerConnection` lifecycle: creation, adding tracks, `onicecandidate`, `ontrack`
- Test across different networks early (this is where you'll actually need TURN)

### Phase 3 — Multi-User Mesh (1 week)
- Extend to 3–6 peers: each new joiner opens a peer connection to every existing participant
- Manage per-peer connection state (joins, leaves, reconnects)
- Budget real debugging time here — this is where ICE failures and stale connections tend to surface

### Phase 4 — Screen Sharing (2–3 days)
- `getDisplayMedia()`
- Swap the video track on existing connections via `RTCRtpSender.replaceTrack` rather than renegotiating from scratch

### Phase 5 — Whiteboard (1–1.5 weeks)
- Canvas-based drawing, draw events broadcast via Socket.io
- Stretch goal: Yjs (CRDT) for real conflict-free collaborative sync — a genuinely impressive addition for an internship portfolio

### Phase 6 — File Sharing (3–4 days)
- Upload to S3-compatible storage
- Share links in-room, show upload progress/previews

### Phase 7 — Security Hardening (1 week — don't skip)
- HTTPS/WSS everywhere (WebRTC requires HTTPS in production)
- WebRTC media is already E2E encrypted via DTLS-SRTP — worth calling out explicitly as a talking point
- Encrypt files at rest; use signed/expiring download URLs
- Rate limiting, input validation (helmet.js, express-validator)
- TURN authentication via time-limited credentials, not a static shared secret
- Proper secrets management — environment variables, never commit keys

### Phase 8 — Polish & Deploy (1 week)
- Error states, reconnection handling, mobile responsiveness, loading states
- Demo video + README — matters as much as the code for an internship application

---

## 4. Known Gotchas

- **NAT traversal** is the #1 source of "works on my machine, fails everywhere else." Test on home wifi, mobile hotspot, and a university/corporate network early — not at the end.
- **Mesh scaling limit**: fine for 2–6 users, but grows O(n²) in bandwidth/CPU. State this limitation explicitly in your writeup, along with what you'd change for larger groups (e.g. moving to an SFU like mediasoup or LiveKit) — this shows you understand the tradeoff, not just the happy path.
- **Reconnection handling** (wifi drops, backgrounded tabs) is where most real-world WebRTC apps break. Budget explicit time for it — don't treat it as an afterthought.
- **Yjs for the whiteboard** is optional but disproportionately impressive relative to effort. CRDTs are considered a more advanced topic, and a live working demo stands out in interviews.

---

## 5. Portfolio/Presentation Tips

- Record a short demo video showing multi-user video, screen share, whiteboard, and file sharing in one flow.
- In your README, explicitly call out the architectural decisions (mesh vs SFU, why Socket.io, TURN necessity) — interviewers often care more about *why* than *what*.
- Mention the security measures taken (DTLS-SRTP, JWT, encrypted storage) — security awareness is a strong signal for internship roles.

import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "../lib/socket";
import { API_BASE_URL } from "../lib/api";

interface RemotePeer {
  socketId: string;
  displayName: string;
  stream?: MediaStream;
}

export function useWebRTC(roomCode: string, displayName: string) {
  // "localStream" is whatever should be shown in the user's own video tile —
  // the camera feed normally, or the screen share while one is active.
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Starts STUN-only; populated with a time-limited TURN credential once
  // fetched from the backend (see /api/turn/credentials). Falling back to
  // STUN-only if that fetch fails just means P2P won't succeed across
  // strict/symmetric NATs — everything else still works.
  const iceServersRef = useRef<RTCConfiguration>({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  const createPeerConnection = useCallback((remoteSocketId: string) => {
    const pc = new RTCPeerConnection(iceServersRef.current);

    // Attach our local (camera) tracks so the remote peer receives our audio/video.
    cameraStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, cameraStreamRef.current!);
    });

    // Fires when the remote peer's audio/video track arrives.
    pc.ontrack = (event) => {
      setPeers((prev) => ({
        ...prev,
        [remoteSocketId]: {
          ...(prev[remoteSocketId] || {
            socketId: remoteSocketId,
            displayName: "Peer",
          }),
          stream: event.streams[0],
        },
      }));
    };

    // Forward our ICE candidates to the remote peer via the signaling server.
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    peerConnections.current[remoteSocketId] = pc;
    return pc;
  }, []);

  // --- Screen sharing -------------------------------------------------

  const stopScreenShare = useCallback(() => {
    const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0];

    Object.values(peerConnections.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (cameraTrack) sender?.replaceTrack(cameraTrack);
    });

    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;

    setLocalStream(cameraStreamRef.current);
    setIsScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      screenStreamRef.current = screenStream;

      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender?.replaceTrack(screenTrack);
      });

      setLocalStream(screenStream);
      setIsScreenSharing(true);

      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.warn("Screen share cancelled or failed:", err);
    }
  }, [stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) stopScreenShare();
    else startScreenShare();
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // --- Signaling + mesh setup -----------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Fetch a time-limited TURN credential before doing anything else,
      // so it's available by the time the first peer connection is made.
      try {
        const res = await fetch(`${API_BASE_URL}/api/turn/credentials`);
        const creds = await res.json();
        iceServersRef.current = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            {
              urls: creds.urls,
              username: creds.username,
              credential: creds.credential,
            },
          ],
        };
      } catch (err) {
        console.warn(
          "Falling back to STUN-only — TURN credentials unavailable:",
          err,
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (cancelled) return;
      cameraStreamRef.current = stream;
      setLocalStream(stream);

      socket.connect();
      socket.emit("join-room", { roomCode, displayName });

      // We're the newcomer — initiate an offer to each peer already present.
      socket.on(
        "existing-peers",
        async (existingPeers: { socketId: string; displayName: string }[]) => {
          for (const peer of existingPeers) {
            setPeers((prev) => ({ ...prev, [peer.socketId]: { ...peer } }));
            const pc = createPeerConnection(peer.socketId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { to: peer.socketId, offer });
          }
        },
      );

      // Someone joined after us — just register them, we wait for their offer.
      socket.on(
        "peer-joined",
        ({
          socketId,
          displayName: name,
        }: {
          socketId: string;
          displayName: string;
        }) => {
          setPeers((prev) => ({
            ...prev,
            [socketId]: { socketId, displayName: name },
          }));
        },
      );

      socket.on(
        "offer",
        async ({
          from,
          offer,
        }: {
          from: string;
          offer: RTCSessionDescriptionInit;
        }) => {
          const pc = createPeerConnection(from);
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { to: from, answer });
        },
      );

      socket.on(
        "answer",
        async ({
          from,
          answer,
        }: {
          from: string;
          answer: RTCSessionDescriptionInit;
        }) => {
          await peerConnections.current[from]?.setRemoteDescription(answer);
        },
      );

      socket.on(
        "ice-candidate",
        async ({
          from,
          candidate,
        }: {
          from: string;
          candidate: RTCIceCandidateInit;
        }) => {
          await peerConnections.current[from]?.addIceCandidate(candidate);
        },
      );

      socket.on("peer-left", ({ socketId }: { socketId: string }) => {
        peerConnections.current[socketId]?.close();
        delete peerConnections.current[socketId];
        setPeers((prev) => {
          const next = { ...prev };
          delete next[socketId];
          return next;
        });
      });
    }

    start();

    return () => {
      cancelled = true;
      socket.off("existing-peers");
      socket.off("peer-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("peer-left");
      socket.disconnect();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomCode, displayName, createPeerConnection]);

  return { localStream, peers, isScreenSharing, toggleScreenShare };
}

import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "../lib/socket";
import { API_BASE_URL } from "../lib/api";
import { getToken } from "../lib/auth";

interface RemotePeer {
  socketId: string;
  displayName: string;
  stream?: MediaStream;
  cameraOn?: boolean;
  micOn?: boolean;
}

export function useWebRTC(roomCode: string) {
  // "localStream" is whatever should be shown in the user's own video tile —
  // the camera feed normally, or the screen share while one is active.
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Starts STUN-only; populated with a time-limited TURN credential once
  // fetched from the backend (see /api/turn/credentials).
  const iceServersRef = useRef<RTCConfiguration>({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  const createPeerConnection = useCallback((remoteSocketId: string) => {
    const pc = new RTCPeerConnection(iceServersRef.current);

    cameraStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, cameraStreamRef.current!);
    });

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

  // --- Camera / mic toggles --------------------------------------------
  //
  // We flip `track.enabled` rather than stopping the track or
  // renegotiating: the track keeps flowing to every peer connection, it
  // just stops carrying frames/audio. Cheaper and instant, and it's the
  // same mechanism every major video-call app uses for mute buttons.

  const toggleCamera = useCallback(() => {
    const track = cameraStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCameraOn(track.enabled);
    socket.emit("media-state", {
      camera: track.enabled,
      mic: cameraStreamRef.current?.getAudioTracks()[0]?.enabled ?? true,
    });
  }, []);

  const toggleMic = useCallback(() => {
    const track = cameraStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMicOn(track.enabled);
    socket.emit("media-state", {
      camera: cameraStreamRef.current?.getVideoTracks()[0]?.enabled ?? true,
      mic: track.enabled,
    });
  }, []);

  // --- Screen sharing ----------------------------------------------------

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

  // --- Signaling + mesh setup -------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function start() {
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

      // The server verifies this token before allowing the connection at
      // all (see the io.use() middleware in backend/src/index.js) and
      // derives the display name from it — the client never sends one.
      socket.auth = { token: getToken() };
      socket.connect();
      socket.emit("join-room", { roomCode });

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

      socket.on(
        "peer-joined",
        ({
          socketId,
          displayName,
        }: {
          socketId: string;
          displayName: string;
        }) => {
          setPeers((prev) => ({
            ...prev,
            [socketId]: { socketId, displayName },
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

      socket.on(
        "media-state",
        ({
          from,
          camera,
          mic,
        }: {
          from: string;
          camera: boolean;
          mic: boolean;
        }) => {
          setPeers((prev) => ({
            ...prev,
            [from]: {
              ...(prev[from] || { socketId: from, displayName: "Peer" }),
              cameraOn: camera,
              micOn: mic,
            },
          }));
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
      socket.off("media-state");
      socket.off("peer-left");
      socket.disconnect();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomCode, createPeerConnection]);

  return {
    localStream,
    peers,
    isScreenSharing,
    toggleScreenShare,
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
  };
}

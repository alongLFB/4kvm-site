"use client";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export class WebRTCVoiceManager {
  private roomId: string;
  private currentUserId: string;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudios: Map<string, HTMLAudioElement> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalysers: Map<string, AnalyserNode> = new Map();
  private analyserInterval: NodeJS.Timeout | null = null;

  public isMuted: boolean = true;
  public isDeafened: boolean = false;
  public onSpeakingChange?: (userId: string, isSpeaking: boolean) => void;
  public onMuteChange?: (isMuted: boolean) => void;
  public onError?: (err: string) => void;

  constructor(roomId: string, currentUserId: string) {
    this.roomId = roomId;
    this.currentUserId = currentUserId;

    if (typeof window !== "undefined") {
      const unlockAudio = () => {
        this.resumeAudio();
      };
      window.addEventListener("click", unlockAudio, { passive: true });
      window.addEventListener("touchstart", unlockAudio, { passive: true });
    }
  }

  public resumeAudio() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    this.remoteAudios.forEach((audio) => {
      if (audio.paused && !this.isDeafened) {
        audio.play().catch(() => {});
      }
    });
  }

  // 1. Initialize local microphone with multi-tier fallback and dynamic renegotiation
  public async initLocalAudio(): Promise<boolean> {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      this.onError?.("您的浏览器环境不支持 WebRTC 音频采集");
      return false;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (errTier1: any) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch (e: any) {
        console.error("Audio permission error:", e);
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          this.onError?.("麦克风权限被拒绝，请检查浏览器地址栏🔒图标或系统隐私设置");
        } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
          this.onError?.("未检测到可用的麦克风音频输入设备");
        } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
          this.onError?.("麦克风正被其他应用独占占用，请先关闭其他占用程序");
        } else {
          this.onError?.(`无法访问麦克风: ${e.message || e.name}`);
        }
        return false;
      }
    }

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });

      this.setupAudioAnalyser();

      // Dynamic Renegotiation: Attach new audio tracks to ALL existing PeerConnections
      this.peerConnections.forEach((pc, targetUserId) => {
        const senders = pc.getSenders();
        this.localStream!.getTracks().forEach((track) => {
          const existing = senders.find((s) => s.track?.kind === track.kind);
          if (existing) {
            existing.replaceTrack(track);
          } else {
            pc.addTrack(track, this.localStream!);
          }
        });

        // Trigger renegotiation offer
        pc.createOffer({ offerToReceiveAudio: true })
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            this.sendSignal(targetUserId, { sdp: pc.localDescription });
          })
          .catch((e) => console.warn("Renegotiation offer error:", e));
      });

      return true;
    }

    return false;
  }

  // 2. Setup AudioContext to detect speaking volume decibels
  private setupAudioAnalyser() {
    if (typeof window === "undefined") return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.localStream) {
        const source = this.audioContext.createMediaStreamSource(this.localStream);
        this.localAnalyser = this.audioContext.createAnalyser();
        this.localAnalyser.fftSize = 256;
        source.connect(this.localAnalyser);
      }

      if (this.analyserInterval) clearInterval(this.analyserInterval);

      // Decibel analysis loop every 120ms
      this.analyserInterval = setInterval(() => {
        // Check local speaking
        if (this.localAnalyser && !this.isMuted) {
          const data = new Uint8Array(this.localAnalyser.frequencyBinCount);
          this.localAnalyser.getByteFrequencyData(data);
          const avg = data.reduce((acc, val) => acc + val, 0) / data.length;
          const isSpeaking = avg > 12;
          this.onSpeakingChange?.(this.currentUserId, isSpeaking);
        } else {
          this.onSpeakingChange?.(this.currentUserId, false);
        }

        // Check remote speaking
        this.remoteAnalysers.forEach((analyser, userId) => {
          if (!this.isDeafened) {
            const data = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((acc, val) => acc + val, 0) / data.length;
            const isSpeaking = avg > 12;
            this.onSpeakingChange?.(userId, isSpeaking);
          } else {
            this.onSpeakingChange?.(userId, false);
          }
        });
      }, 120);
    } catch (e) {
      console.warn("AudioContext init warning:", e);
    }
  }

  // 3. Toggle Local Mic (Unmute / Mute)
  public async toggleMute(forceMute?: boolean): Promise<boolean> {
    this.resumeAudio();

    if (forceMute !== undefined) {
      this.isMuted = forceMute;
    } else {
      this.isMuted = !this.isMuted;
    }

    if (!this.localStream && !this.isMuted) {
      const ok = await this.initLocalAudio();
      if (!ok) {
        this.isMuted = true;
        this.onMuteChange?.(true);
        return false;
      }
    }

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }

    this.onMuteChange?.(this.isMuted);

    // Broadcast voice state
    fetch(`/api/room/${this.roomId}/webrtc/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.currentUserId, isMuted: this.isMuted }),
    }).catch(() => {});

    return !this.isMuted;
  }

  // 4. Toggle Speaker / Deafen
  public toggleDeafen(forceDeafen?: boolean): boolean {
    this.resumeAudio();

    if (forceDeafen !== undefined) {
      this.isDeafened = forceDeafen;
    } else {
      this.isDeafened = !this.isDeafened;
    }

    this.remoteAudios.forEach((audio) => {
      audio.muted = this.isDeafened;
    });

    return this.isDeafened;
  }

  // 5. Create PeerConnection for a specific remote peer
  private getOrCreatePeer(targetUserId: string, isInitiator: boolean): RTCPeerConnection {
    if (this.peerConnections.has(targetUserId)) {
      return this.peerConnections.get(targetUserId)!;
    }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    this.peerConnections.set(targetUserId, pc);

    // Add local audio track if exists
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote track
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      let audio = this.remoteAudios.get(targetUserId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = `remote_audio_${targetUserId}`;
        audio.autoplay = true;
        audio.setAttribute("playsinline", "true");
        audio.style.display = "none";
        document.body.appendChild(audio);
        this.remoteAudios.set(targetUserId, audio);
      }
      audio.srcObject = remoteStream;
      audio.muted = this.isDeafened;
      audio.play().catch(() => {});

      // Setup remote analyser
      if (this.audioContext) {
        try {
          const source = this.audioContext.createMediaStreamSource(remoteStream);
          const analyser = this.audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          this.remoteAnalysers.set(targetUserId, analyser);
        } catch (e) {}
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetUserId, { candidate: event.candidate });
      }
    };

    // If initiator, create and send Offer
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          this.sendSignal(targetUserId, { sdp: pc.localDescription });
        })
        .catch((e) => console.error("Create offer error:", e));
    }

    return pc;
  }

  // 6. Connect with all other members in the room
  public connectWithMembers(memberIds: string[]) {
    memberIds.forEach((targetId) => {
      if (targetId !== this.currentUserId && !this.peerConnections.has(targetId)) {
        const isInitiator = this.currentUserId > targetId;
        this.getOrCreatePeer(targetId, isInitiator);
      }
    });
  }

  // 7. Handle incoming WebRTC signaling from SSE with ICE queueing
  public async handleSignal(fromUserId: string, signal: any) {
    if (fromUserId === this.currentUserId) return;

    const pc = this.getOrCreatePeer(fromUserId, false);

    if (signal.sdp) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        // Flush pending ICE candidates
        const queued = this.pendingCandidates.get(fromUserId) || [];
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        }
        this.pendingCandidates.delete(fromUserId);

        if (signal.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendSignal(fromUserId, { sdp: pc.localDescription });
        }
      } catch (e) {
        console.error("Set remote description error:", e);
      }
    } else if (signal.candidate) {
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          const queued = this.pendingCandidates.get(fromUserId) || [];
          queued.push(signal.candidate);
          this.pendingCandidates.set(fromUserId, queued);
        }
      } catch (e) {
        console.error("Add ICE candidate error:", e);
      }
    }
  }

  // 8. Send signal over HTTP
  private sendSignal(toUserId: string, signal: any) {
    fetch(`/api/room/${this.roomId}/webrtc/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromUserId: this.currentUserId,
        toUserId,
        signal,
      }),
    }).catch(() => {});
  }

  // 9. Cleanup
  public destroy() {
    if (this.analyserInterval) clearInterval(this.analyserInterval);

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    this.remoteAudios.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    this.remoteAudios.clear();
    this.pendingCandidates.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

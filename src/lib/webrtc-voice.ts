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
  private remoteGains: Map<string, GainNode> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalysers: Map<string, AnalyserNode> = new Map();
  private analyserInterval: NodeJS.Timeout | null = null;
  private lastLocalSpeaking: boolean = false;
  private speakingDebounceTimeout: NodeJS.Timeout | null = null;

  public isMuted: boolean = true;
  public isDeafened: boolean = false;
  public userVolumes: Map<string, number> = new Map(); // userId -> 0 to 200%
  public onSpeakingChange?: (userId: string, isSpeaking: boolean, decibel: number) => void;
  public onLocalLevel?: (level: number) => void; // 0 to 100
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

      // Start audio analyzer loop immediately so remote streams are analyzed
      this.ensureAudioContext();
      this.startAnalyserLoop();
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
    } catch (e) {}
    return this.audioContext;
  }

  public resumeAudio() {
    const ctx = this.ensureAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    this.remoteAudios.forEach((audio) => {
      if (audio.paused && !this.isDeafened) {
        audio.play().catch(() => {});
      }
    });
  }

  // Play gentle synthesized chime (Mic toggle / Mute All)
  public playChime(type: "unmute" | "mute" | "alert") {
    if (typeof window === "undefined") return;
    try {
      const ctx = this.ensureAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === "unmute") {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      } else if (type === "mute") {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      } else {
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      }

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  // Set individual member volume (0% ~ 200%)
  public setUserVolume(userId: string, volume: number) {
    this.userVolumes.set(userId, volume);

    const gain = this.remoteGains.get(userId);
    if (gain && this.audioContext) {
      gain.gain.setValueAtTime(volume / 100, this.audioContext.currentTime);
    }

    const audio = this.remoteAudios.get(userId);
    if (audio) {
      audio.volume = Math.min(1.0, volume / 100);
    }
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

      this.setupLocalAudioAnalyser();

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

  // 2. Setup Local Audio Analyser
  private setupLocalAudioAnalyser() {
    const ctx = this.ensureAudioContext();
    if (!ctx || !this.localStream) return;

    try {
      const source = ctx.createMediaStreamSource(this.localStream);
      this.localAnalyser = ctx.createAnalyser();
      this.localAnalyser.fftSize = 256;
      source.connect(this.localAnalyser);
    } catch (e) {}
  }

  // 3. Start universal Audio Analyser Loop and broadcast speaking transitions
  private startAnalyserLoop() {
    if (this.analyserInterval) clearInterval(this.analyserInterval);

    this.analyserInterval = setInterval(() => {
      // Check local speaking & calculate real-time meter (0~100)
      if (this.localAnalyser && !this.isMuted) {
        const data = new Uint8Array(this.localAnalyser.frequencyBinCount);
        this.localAnalyser.getByteFrequencyData(data);
        const avg = data.reduce((acc, val) => acc + val, 0) / data.length;
        const isSpeaking = avg > 10;
        const level = Math.min(100, Math.round(avg * 2.2));

        this.onSpeakingChange?.(this.currentUserId, isSpeaking, avg);
        this.onLocalLevel?.(level);

        // Broadcast speaking state change across room via HTTP/SSE
        if (isSpeaking !== this.lastLocalSpeaking) {
          this.lastLocalSpeaking = isSpeaking;
          this.broadcastSpeakingState(isSpeaking);
        }
      } else {
        this.onSpeakingChange?.(this.currentUserId, false, 0);
        this.onLocalLevel?.(0);
        if (this.lastLocalSpeaking) {
          this.lastLocalSpeaking = false;
          this.broadcastSpeakingState(false);
        }
      }

      // Check remote speaking via AnalyserNodes
      this.remoteAnalysers.forEach((analyser, userId) => {
        if (!this.isDeafened) {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((acc, val) => acc + val, 0) / data.length;
          const isSpeaking = avg > 10;
          this.onSpeakingChange?.(userId, isSpeaking, avg);
        } else {
          this.onSpeakingChange?.(userId, false, 0);
        }
      });
    }, 100);
  }

  // Broadcast speaking transition to whole room
  private broadcastSpeakingState(isSpeaking: boolean) {
    if (this.speakingDebounceTimeout) clearTimeout(this.speakingDebounceTimeout);
    this.speakingDebounceTimeout = setTimeout(() => {
      fetch(`/api/room/${this.roomId}/webrtc/speaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.currentUserId,
          isSpeaking,
        }),
      }).catch(() => {});
    }, 80);
  }

  // 4. Toggle Local Mic (Unmute / Mute)
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

    this.playChime(!this.isMuted ? "unmute" : "mute");
    this.onMuteChange?.(this.isMuted);

    // Broadcast voice state
    fetch(`/api/room/${this.roomId}/webrtc/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.currentUserId, isMuted: this.isMuted }),
    }).catch(() => {});

    return !this.isMuted;
  }

  // 5. Toggle Speaker / Deafen
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

    this.playChime(!this.isDeafened ? "unmute" : "mute");
    return this.isDeafened;
  }

  // 6. Create PeerConnection for a specific remote peer with GainNode Boost
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

      const userVol = this.userVolumes.get(targetUserId) ?? 100;
      audio.volume = Math.min(1.0, userVol / 100);

      audio.play().catch(() => {});

      // Setup Web Audio GainNode & Analyser
      const ctx = this.ensureAudioContext();
      if (ctx) {
        try {
          const source = ctx.createMediaStreamSource(remoteStream);
          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(userVol / 100, ctx.currentTime);
          this.remoteGains.set(targetUserId, gainNode);

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(gainNode);
          gainNode.connect(analyser);

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

  // 7. Connect with all other members in the room
  public connectWithMembers(memberIds: string[]) {
    memberIds.forEach((targetId) => {
      if (targetId !== this.currentUserId && !this.peerConnections.has(targetId)) {
        const isInitiator = this.currentUserId > targetId;
        this.getOrCreatePeer(targetId, isInitiator);
      }
    });
  }

  // 8. Handle incoming WebRTC signaling from SSE with ICE queueing
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

  // 9. Send signal over HTTP
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

  // 10. Cleanup
  public destroy() {
    if (this.analyserInterval) clearInterval(this.analyserInterval);
    if (this.speakingDebounceTimeout) clearTimeout(this.speakingDebounceTimeout);

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    this.remoteAudios.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    this.remoteAudios.clear();
    this.remoteGains.clear();
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

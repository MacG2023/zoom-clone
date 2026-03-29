import { sendSignal } from './socket-client';

export interface PeerConnection {
  peerId: string;
  displayName: string;
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  stream: MediaStream | null;
}

type PeerEventCallback = {
  onStream: (peerId: string, stream: MediaStream) => void;
  onClose: (peerId: string) => void;
  onData: (peerId: string, data: unknown) => void;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Open Relay TURN servers (free, community-provided)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class PeerManager {
  private peers = new Map<string, PeerConnection>();
  private localStream: MediaStream | null = null;
  private callbacks: PeerEventCallback;
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

  constructor(callbacks: PeerEventCallback) {
    this.callbacks = callbacks;
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    this.peers.forEach((conn) => {
      const senders = conn.pc.getSenders();
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      senders.forEach((sender) => {
        if (sender.track?.kind === 'video' && videoTrack) {
          sender.replaceTrack(videoTrack);
        } else if (sender.track?.kind === 'audio' && audioTrack) {
          sender.replaceTrack(audioTrack);
        }
      });
    });
  }

  async createPeer(peerId: string, displayName: string, initiator: boolean): Promise<void> {
    if (this.peers.has(peerId)) return;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const connection: PeerConnection = {
      peerId,
      displayName,
      pc,
      dataChannel: null,
      stream: null,
    };

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerId, { type: 'ice-candidate', candidate: event.candidate });
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering state for ${peerId}:`, pc.iceGatheringState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state for ${peerId}:`, pc.iceConnectionState);
    };

    // Remote stream
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Got remote track from ${peerId}:`, event.track.kind, event.streams.length);
      if (event.streams[0]) {
        connection.stream = event.streams[0];
        this.callbacks.onStream(peerId, event.streams[0]);
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.peers.delete(peerId);
        this.callbacks.onClose(peerId);
      }
    };

    // Data channel
    if (initiator) {
      const dc = pc.createDataChannel('control');
      connection.dataChannel = dc;
      this.setupDataChannel(dc, peerId);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal(peerId, { type: 'offer', sdp: pc.localDescription });
    } else {
      pc.ondatachannel = (event) => {
        connection.dataChannel = event.channel;
        this.setupDataChannel(event.channel, peerId);
      };
    }

    this.peers.set(peerId, connection);
  }

  private async flushCandidates(peerId: string, pc: RTCPeerConnection): Promise<void> {
    const candidates = this.pendingCandidates.get(peerId);
    if (candidates && candidates.length > 0) {
      console.log(`[WebRTC] Flushing ${candidates.length} queued ICE candidates for ${peerId}`);
      for (const candidate of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Failed to add queued ICE candidate:', err);
        }
      }
      this.pendingCandidates.delete(peerId);
    }
  }

  private setupDataChannel(dc: RTCDataChannel, peerId: string): void {
    dc.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        this.callbacks.onData(peerId, parsed);
      } catch {
        // Ignore malformed data
      }
    };
  }

  async handleSignal(peerId: string, signalData: any): Promise<void> {
    let connection = this.peers.get(peerId);

    try {
      if (signalData.type === 'offer') {
        if (connection) {
          // If we already have a connection and it's not stable, close and recreate
          if (connection.pc.signalingState !== 'stable') {
            connection.pc.close();
            this.peers.delete(peerId);
            connection = undefined;
          } else {
            // We have a stable connection but received an offer — this is a glare situation
            // Close existing and accept the new offer
            connection.pc.close();
            this.peers.delete(peerId);
            connection = undefined;
          }
        }

        if (!connection) {
          await this.createPeer(peerId, 'Peer', false);
          connection = this.peers.get(peerId);
        }
        if (!connection) return;

        await connection.pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        // Flush any queued ICE candidates
        await this.flushCandidates(peerId, connection.pc);
        const answer = await connection.pc.createAnswer();
        await connection.pc.setLocalDescription(answer);
        sendSignal(peerId, { type: 'answer', sdp: connection.pc.localDescription });
      } else if (signalData.type === 'answer') {
        if (!connection) return;
        if (connection.pc.signalingState !== 'have-local-offer') return;
        await connection.pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        // Flush any queued ICE candidates
        await this.flushCandidates(peerId, connection.pc);
      } else if (signalData.type === 'ice-candidate') {
        if (!connection || !connection.pc.remoteDescription) {
          // Queue candidate — remote description not set yet
          const queue = this.pendingCandidates.get(peerId) || [];
          queue.push(signalData.candidate);
          this.pendingCandidates.set(peerId, queue);
          console.log(`[WebRTC] Queued ICE candidate for ${peerId} (${queue.length} pending)`);
        } else {
          await connection.pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      }
    } catch (err) {
      console.error(`Signal handling error for ${peerId}:`, err);
    }
  }

  sendData(peerId: string, data: unknown): void {
    const connection = this.peers.get(peerId);
    if (connection?.dataChannel?.readyState === 'open') {
      connection.dataChannel.send(JSON.stringify(data));
    }
  }

  broadcastData(data: unknown): void {
    this.peers.forEach((conn) => {
      if (conn.dataChannel?.readyState === 'open') {
        conn.dataChannel.send(JSON.stringify(data));
      }
    });
  }

  removePeer(peerId: string): void {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.pc.close();
      this.peers.delete(peerId);
    }
  }

  getConnections(): PeerConnection[] {
    return Array.from(this.peers.values());
  }

  replaceTrackOnAll(track: MediaStreamTrack): void {
    this.peers.forEach((conn) => {
      const senders = conn.pc.getSenders();
      // Find sender by matching track kind, or find a sender with no track (stopped video)
      let sender = senders.find((s) => s.track?.kind === track.kind);
      if (!sender && track.kind === 'video') {
        // If video track was stopped, find the video sender by checking transceiver
        const transceivers = conn.pc.getTransceivers();
        const videoTransceiver = transceivers.find((t) => t.sender.track?.kind === 'video' || t.receiver.track?.kind === 'video');
        if (videoTransceiver) {
          sender = videoTransceiver.sender;
        } else {
          // No video transceiver exists — add the track directly
          conn.pc.addTrack(track, this.localStream!);
          return;
        }
      }
      if (sender) {
        sender.replaceTrack(track);
      }
    });
  }

  destroyAll(): void {
    this.peers.forEach((conn) => conn.pc.close());
    this.peers.clear();
  }
}

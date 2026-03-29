import SimplePeer from 'simple-peer';
import { sendSignal } from './socket-client';

export interface PeerConnection {
  peerId: string;
  displayName: string;
  peer: SimplePeer.Instance;
  stream: MediaStream | null;
}

type PeerEventCallback = {
  onStream: (peerId: string, stream: MediaStream) => void;
  onClose: (peerId: string) => void;
  onData: (peerId: string, data: unknown) => void;
};

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class PeerManager {
  private peers = new Map<string, PeerConnection>();
  private localStream: MediaStream | null = null;
  private callbacks: PeerEventCallback;

  constructor(callbacks: PeerEventCallback) {
    this.callbacks = callbacks;
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    this.peers.forEach((conn) => {
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        const audioTrack = this.localStream.getAudioTracks()[0];
        const senders = (conn.peer as any)._pc?.getSenders?.();
        if (senders) {
          senders.forEach((sender: RTCRtpSender) => {
            if (sender.track?.kind === 'video' && videoTrack) {
              sender.replaceTrack(videoTrack);
            } else if (sender.track?.kind === 'audio' && audioTrack) {
              sender.replaceTrack(audioTrack);
            }
          });
        }
      }
    });
  }

  createPeer(peerId: string, displayName: string, initiator: boolean): void {
    if (this.peers.has(peerId)) return;

    const peer = new SimplePeer({
      initiator,
      stream: this.localStream || undefined,
      trickle: true,
      config: { iceServers: ICE_SERVERS },
    });

    const connection: PeerConnection = {
      peerId,
      displayName,
      peer,
      stream: null,
    };

    peer.on('signal', (signalData) => {
      sendSignal(peerId, signalData);
    });

    peer.on('stream', (remoteStream) => {
      connection.stream = remoteStream;
      this.callbacks.onStream(peerId, remoteStream);
    });

    peer.on('data', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        this.callbacks.onData(peerId, parsed);
      } catch {
        // Ignore malformed data
      }
    });

    peer.on('close', () => {
      this.peers.delete(peerId);
      this.callbacks.onClose(peerId);
    });

    peer.on('error', (err) => {
      console.error(`Peer ${peerId} error:`, err);
      this.peers.delete(peerId);
      this.callbacks.onClose(peerId);
    });

    this.peers.set(peerId, connection);
  }

  handleSignal(peerId: string, signalData: unknown): void {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.signal(signalData as SimplePeer.SignalData);
    }
  }

  sendData(peerId: string, data: unknown): void {
    const connection = this.peers.get(peerId);
    if (connection && connection.peer.connected) {
      connection.peer.send(JSON.stringify(data));
    }
  }

  broadcastData(data: unknown): void {
    this.peers.forEach((conn) => {
      if (conn.peer.connected) {
        conn.peer.send(JSON.stringify(data));
      }
    });
  }

  removePeer(peerId: string): void {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.destroy();
      this.peers.delete(peerId);
    }
  }

  getConnections(): PeerConnection[] {
    return Array.from(this.peers.values());
  }

  replaceTrackOnAll(track: MediaStreamTrack): void {
    this.peers.forEach((conn) => {
      const senders = (conn.peer as any)._pc?.getSenders?.();
      if (senders) {
        const sender = senders.find(
          (s: RTCRtpSender) => s.track?.kind === track.kind
        );
        if (sender) {
          sender.replaceTrack(track);
        }
      }
    });
  }

  destroyAll(): void {
    this.peers.forEach((conn) => conn.peer.destroy());
    this.peers.clear();
  }
}

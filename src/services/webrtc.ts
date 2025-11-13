import { socketService } from "./socket";
import { WEBRTC_CONFIG } from "@/config/env";

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private targetUserId: string | null = null;
  private isVideoCall: boolean = false;

  private readonly configuration: RTCConfiguration = WEBRTC_CONFIG;

  async initializePeerConnection(targetUserId: string) {
    this.targetUserId = targetUserId;
    this.peerConnection = new RTCPeerConnection(this.configuration);
    this.remoteStream = new MediaStream();

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.targetUserId) {
        socketService.sendIceCandidate(this.targetUserId, event.candidate);
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
    };

    return this.peerConnection;
  }

  async getUserMedia(audioOnly: boolean = true) {
    try {
      this.isVideoCall = !audioOnly;
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: !audioOnly
          ? false
          : {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 },
            },
      });
      return this.localStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }

  addLocalStreamToPeer() {
    if (this.localStream && this.peerConnection) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }
  }

  async createOffer() {
    if (!this.peerConnection)
      throw new Error("Peer connection not initialized");

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection)
      throw new Error("Peer connection not initialized");

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection)
      throw new Error("Peer connection not initialized");
    await this.peerConnection.setRemoteDescription(answer);
  }

  async handleIceCandidate(candidate: RTCIceCandidate) {
    if (!this.peerConnection)
      throw new Error("Peer connection not initialized");
    await this.peerConnection.addIceCandidate(candidate);
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  async switchCamera() {
    if (!this.isVideoCall || !this.localStream) return;

    try {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const constraints = videoTrack.getConstraints();
        // @ts-ignore - facingMode might not be in constraints type
        const currentFacingMode = constraints.facingMode || "user";
        const newFacingMode =
          currentFacingMode === "user" ? "environment" : "user";

        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            ...constraints,
            facingMode: newFacingMode,
          },
        });

        // Replace video track
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = this.peerConnection
          ?.getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (sender && newVideoTrack) {
          await sender.replaceTrack(newVideoTrack);
        }

        // Update local stream
        videoTrack.stop();
        this.localStream.removeTrack(videoTrack);
        this.localStream.addTrack(newVideoTrack);

        return this.localStream;
      }
    } catch (error) {
      console.error("Error switching camera:", error);
      throw error;
    }
  }

  isVideoCallActive() {
    return this.isVideoCall;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  getCurrentLocalStream() {
    return this.localStream;
  }

  endCall() {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;
    this.targetUserId = null;
  }
}

export const webrtcService = new WebRTCService();

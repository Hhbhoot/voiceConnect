// Environment configuration for VoiceConnect

// Auto-detect if we're running on localhost or network IP
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// Get the current host (IP or localhost)
const currentHost = window.location.hostname;

// Determine frontend protocol
const frontendProtocol = window.location.protocol;

// For development: Use HTTP for both frontend and backend
// This simplifies development setup - we can enable HTTPS later for network testing
const backendProtocol = "http:"; // Use HTTP for development simplicity

// Check for environment variable (for production/Vercel)
const envBackendUrl = import.meta.env.VITE_BACKEND_URL;

// Backend server configuration
export const API_CONFIG = {
  // Prioritize environment variable if it exists
  BASE_URL: envBackendUrl
    ? `${envBackendUrl}/api`
    : `${backendProtocol}//${currentHost}:3001/api`,

  SOCKET_URL: envBackendUrl
    ? envBackendUrl
    : `${backendProtocol}//${currentHost}:3001`,
};

// WebRTC configuration with better STUN/TURN servers
export const WEBRTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

// Development helpers
export const DEV_INFO = {
  isLocalhost,
  currentHost,
  protocol: frontendProtocol,
  frontendUrl: `${frontendProtocol}//${currentHost}:5174`,
  backendUrl: API_CONFIG.SOCKET_URL,
};

console.log("🔧 VoiceConnect Configuration:", DEV_INFO);

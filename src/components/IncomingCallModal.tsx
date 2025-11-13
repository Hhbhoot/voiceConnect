import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Volume2, Video } from "lucide-react";

interface IncomingCallModalProps {
  isOpen: boolean;
  caller: User | null;
  isVideoCall?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallModal = ({
  isOpen,
  caller,
  isVideoCall = false,
  onAccept,
  onDecline,
}: IncomingCallModalProps) => {
  const [isRinging, setIsRinging] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Ringtone using Web Audio API
  const playRingtone = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      setAudioContext(ctx);

      // Create a simple ringtone pattern
      const playTone = (
        frequency: number,
        duration: number,
        delay: number = 0,
      ) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
          oscillator.type = "sine";

          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
          gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + duration);
        }, delay);
      };

      // Play ringtone pattern (classic phone ring)
      const ringPattern = () => {
        playTone(800, 0.5, 0);
        playTone(600, 0.5, 600);
        playTone(800, 0.5, 1200);
        playTone(600, 0.5, 1800);
      };

      if (isOpen) {
        ringPattern();
        const interval = setInterval(ringPattern, 3000);
        return () => clearInterval(interval);
      }
    }
  };

  useEffect(() => {
    if (isOpen && caller) {
      setIsRinging(true);
      playRingtone();

      // Auto-decline after 30 seconds
      const timeout = setTimeout(() => {
        onDecline();
      }, 30000);

      return () => {
        clearTimeout(timeout);
        setIsRinging(false);
        if (audioContext) {
          audioContext.close();
        }
      };
    }
  }, [isOpen, caller, audioContext, onDecline]);

  if (!caller) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-2xl font-bold">
            Incoming Call
          </DialogTitle>
          <DialogDescription className="text-base">
            {caller.username} is calling you
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* Caller Avatar with Ring Animation */}
          <div className="relative">
            <div
              className={`absolute inset-0 rounded-full ${
                isRinging ? "animate-ping" : ""
              } bg-green-400 opacity-30`}
            />
            <div
              className={`absolute inset-2 rounded-full ${
                isRinging ? "animate-pulse" : ""
              } bg-green-300 opacity-50`}
            />
            <Avatar className="relative w-32 h-32 ring-4 ring-green-200">
              <AvatarImage src={caller.avatar} />
              <AvatarFallback className="text-4xl bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                {caller.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller Info */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900">
              {caller.username}
            </h3>
            <p className="text-gray-500 flex items-center justify-center mt-2">
              {isVideoCall ? (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Video Call
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Voice Call
                </>
              )}
            </p>
          </div>

          {/* Call Actions */}
          <div className="flex items-center space-x-8 pt-4">
            {/* Decline Button */}
            <Button
              onClick={onDecline}
              variant="destructive"
              size="lg"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-transform"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>

            {/* Accept Button */}
            <Button
              onClick={onAccept}
              size="lg"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 transition-transform animate-pulse"
            >
              <Phone className="w-8 h-8" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-500 pt-2">
            <p>Tap to answer or decline the call</p>
            <p className="text-xs mt-1">Call will auto-decline in 30 seconds</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;

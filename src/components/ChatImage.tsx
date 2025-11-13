import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ZoomIn, X, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ChatImageProps {
  imageUrl: string;
  caption?: string;
  timestamp: string;
  isOwn: boolean;
  onLoad?: () => void;
}

const ChatImage: React.FC<ChatImageProps> = ({
  imageUrl,
  caption,
  timestamp,
  isOwn,
  onLoad,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Image download has been initiated.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the image.",
        variant: "destructive",
      });
    }
  };

  const openFullscreen = () => {
    if (!hasError) {
      setIsFullscreen(true);
    }
  };

  if (hasError) {
    return (
      <div
        className={`max-w-xs lg:max-w-md rounded-lg border-2 border-dashed border-gray-300 p-4 ${
          isOwn ? "bg-red-50" : "bg-gray-50"
        }`}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">Failed to load image</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(imageUrl, "_blank")}
          >
            Open in new tab
          </Button>
        </div>
        {caption && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-700">{caption}</p>
          </div>
        )}
        <p
          className={`text-xs mt-2 ${isOwn ? "text-red-300" : "text-gray-500"}`}
        >
          {formatTime(timestamp)}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-xs lg:max-w-md">
        {/* Image Container */}
        <div className="relative group">
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          <img
            src={imageUrl}
            alt="Shared image"
            className="w-full h-auto rounded-lg cursor-pointer transition-transform hover:scale-[1.02] shadow-md"
            onClick={openFullscreen}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: isLoading ? "none" : "block" }}
          />

          {/* Hover Actions */}
          {!isLoading && !hasError && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openFullscreen}
                  className="bg-white/90 hover:bg-white text-gray-800"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                  className="bg-white/90 hover:bg-white text-gray-800"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Image Type Badge */}
          <Badge
            className="absolute top-2 left-2 bg-black/50 text-white border-0"
            variant="secondary"
          >
            📸 Image
          </Badge>
        </div>

        {/* Caption */}
        {caption && (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{caption}</p>
          </div>
        )}

        {/* Timestamp */}
        <p
          className={`text-xs mt-2 ${
            isOwn ? "text-indigo-100" : "text-gray-500"
          }`}
        >
          {formatTime(timestamp)}
        </p>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Image Preview</DialogTitle>
                <DialogDescription>
                  {caption || "Shared image"}
                </DialogDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6 pt-2">
            <img
              src={imageUrl}
              alt="Fullscreen image"
              className="w-full h-auto max-h-[60vh] object-contain mx-auto rounded-lg"
            />
            {caption && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{caption}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatImage;

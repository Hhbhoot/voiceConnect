import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Image as ImageIcon, Upload, X, AlertCircle, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ImageUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSend: (imageUrl: string, publicId: string, caption?: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  isOpen,
  onClose,
  onImageSend,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      resetState();
      onClose();
    }
  };

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const response = await fetch(`${API_URL}/api/upload/image`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      console.log("Upload result:", result);
      if (result.success) {
        // Send the image message
        onImageSend(
          result.imageUrl,
          result.publicId,
          caption.trim() || undefined,
        );

        toast({
          title: "Image uploaded",
          description: "Your image has been sent successfully.",
        });

        resetState();
        onClose();
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((file) => file.type.startsWith("image/"));

    if (imageFile) {
      processFile(imageFile);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ImageIcon className="w-5 h-5 mr-2" />
            Send Image
          </DialogTitle>
          <DialogDescription>
            Upload an image to share in your conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            // File selection area
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Choose an image or drag it here
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">
                Supports: JPG, PNG, GIF, WebP (max 5MB)
              </p>
              <Button variant="outline" type="button">
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            // Preview and send area
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative">
                <img
                  src={previewUrl || ""}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <Label htmlFor="caption">Caption (optional)</Label>
                <Textarea
                  id="caption"
                  placeholder="Add a caption to your image..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="resize-none"
                  rows={3}
                  maxLength={500}
                  disabled={isUploading}
                />
                <p className="text-xs text-gray-500 text-right">
                  {caption.length}/500
                </p>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* File Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  {isUploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Image
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUpload;

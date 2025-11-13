import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { API_CONFIG } from "@/config/env";

const BackendStatus = () => {
  const [status, setStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkBackendStatus = async () => {
    setStatus("checking");
    setLastCheck(new Date());

    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL.replace("/api", "")}`,
        {
          method: "GET",
          timeout: 5000,
        } as RequestInit,
      );

      if (response.ok) {
        setStatus("online");
      } else {
        setStatus("offline");
      }
    } catch (error) {
      setStatus("offline");
      console.error("Backend check failed:", error);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    // Check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-red-500";
      case "checking":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "online":
        return <CheckCircle className="w-3 h-3" />;
      case "offline":
        return <XCircle className="w-3 h-3" />;
      case "checking":
        return <RefreshCw className="w-3 h-3 animate-spin" />;
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "online":
        return "Backend Online";
      case "offline":
        return "Backend Offline";
      case "checking":
        return "Checking...";
      default:
        return "Unknown";
    }
  };

  if (status === "online") {
    return null; // Don't show when everything is working
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border p-4 max-w-sm">
        <div className="flex items-center space-x-3 mb-3">
          <Badge className={`${getStatusColor()} text-white`}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </div>

        {status === "offline" && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Cannot connect to backend server
            </p>
            <div className="text-xs text-gray-500">
              <p>Expected at: {API_CONFIG.SOCKET_URL}</p>
              <p>Last checked: {lastCheck.toLocaleTimeString()}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={checkBackendStatus}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
              <p className="font-medium">To start backend:</p>
              <code className="text-xs">cd server && npm run dev:simple</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackendStatus;

import { cn } from "@/lib/utils"; // Import cn from utils
import { useGlobalStore } from "@/store/global";
import { useEffect, useState } from "react";

export const SocketStatus = () => {
  const socket = useGlobalStore((state) => state.socket);
  const [isFlashing, setIsFlashing] = useState(false);

  // Get socket status
  const getStatus = () => {
    if (!socket) return "disconnected";

    // WebSocket readyState values:
    // 0 - Connecting
    // 1 - Open
    // 2 - Closing
    // 3 - Closed

    switch (socket.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      case WebSocket.CLOSING:
        return "closing";
      case WebSocket.CLOSED:
        return "disconnected";
      default:
        return "unknown";
    }
  };

  const status = getStatus();

  // Status color mapping
  const statusColors = {
    disconnected: "bg-red-500",
    connecting: "bg-yellow-500",
    connected: "bg-green-500",
    closing: "bg-orange-500",
    unknown: "bg-gray-500",
  };

  // Status text mapping
  const statusText = {
    disconnected: "Disconnected",
    connecting: "Connecting...",
    connected: "Connected",
    closing: "Closing...",
    unknown: "Unknown",
  };

  // Flash effect
  useEffect(() => {
    const flashInterval = setInterval(() => {
      setIsFlashing((prev) => !prev);
    }, 500);

    return () => clearInterval(flashInterval);
  }, []);

  return (
    <div className="flex items-center space-x-2">
      <div
        className={cn(
          statusColors[status],
          { "opacity-100": isFlashing, "opacity-50": !isFlashing },
          "h-4 w-4 rounded-full transition-opacity duration-300"
        )}
        aria-hidden="true"
      />
      <span className="text-sm font-medium">{statusText[status]}</span>
    </div>
  );
};

"use client";
import {
  createContext,
  ReactNode,
  RefObject,
  useContext,
  useRef,
  useState,
} from "react";

interface RoomContextType {
  socketRef: RefObject<WebSocket | null>;
  roomId: string;
  username: string;
  userId: string;
  setWebsocket: (websocket: WebSocket) => void;
  setRoomId: (roomId: string) => void;
  setUsername: (username: string) => void;
  setUserId: (userId: string) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function useRoom() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
}

interface RoomProviderProps {
  children: ReactNode;
}

export function RoomProvider({ children }: RoomProviderProps) {
  const socketRef = useRef<WebSocket>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const setWebsocket = (websocket: WebSocket) => {
    socketRef.current = websocket;
  };

  const value = {
    socketRef,
    roomId,
    username,
    userId,
    setWebsocket,
    setRoomId,
    setUsername,
    setUserId,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

"use client";
import { useGlobalStore } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { useEffect } from "react";
import { TrackSelector } from "./TrackSelector";
import { Player } from "./room/Player";
import { SocketStatus } from "./room/SocketStatus";

export const NewSyncer = () => {
  // Room
  const roomId = useRoomStore((state) => state.roomId);
  const username = useRoomStore((state) => state.username);
  const userId = useRoomStore((state) => state.userId);
  const isLoadingRoom = useRoomStore((state) => state.isLoadingRoom);

  // Audio
  const audioSources = useGlobalStore((state) => state.audioSources);
  const setSocket = useGlobalStore((state) => state.setSocket);
  const socket = useGlobalStore((state) => state.socket);
  const isLoadingAudio = useGlobalStore((state) => state.isLoadingAudio);

  // Once room has been loaded, connect to the websocket
  useEffect(() => {
    // Only run this effect once after room is loaded
    if (isLoadingRoom) return;

    // Don't create a new connection if we already have one
    if (socket) {
      return;
    }

    const SOCKET_URL = `${process.env.NEXT_PUBLIC_WS_URL}?roomId=${roomId}&userId=${userId}&username=${username}`;
    console.log("Creating new socket to", SOCKET_URL);
    const ws = new WebSocket(SOCKET_URL);
    setSocket(ws);

    ws.onopen = () => {
      console.log("Connected to WebSocket");
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.onmessage = (msg) => {
      const message = JSON.parse(msg.data);
      console.log(`Received message: ${JSON.stringify(message)}`);
    };

    return () => {
      // Runs on unmount and dependency change
      console.log("Running cleanup for WebSocket connection");
      ws.close();
    };
    // Not including socket in the dependency array because it will trigger the close
  }, [isLoadingRoom, roomId, userId, username, setSocket]);

  console.log("render", audioSources);

  if (isLoadingRoom || !socket || isLoadingAudio) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/90">
        <div className="w-6 h-6 border-1 border-t-gray-800 rounded-full animate-spin"></div>
        <span className="ml-3 text-base font-normal text-gray-500">
          {isLoadingRoom
            ? "Loading room"
            : !socket
            ? "Loading socket"
            : "Loading audio"}
          ...
        </span>
      </div>
    );
  }

  return (
    <div>
      <SocketStatus />
      <div>
        <div>Room: {roomId}</div>
        <div>Username: {username}</div>
        <div>User ID: {userId}</div>
      </div>
      NewSyncer
      <div>
        {isLoadingRoom && <div>Loading...</div>}
        <TrackSelector />
        <Player />
      </div>
    </div>
  );
};

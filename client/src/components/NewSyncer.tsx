"use client";
import { useGlobalStore } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { useEffect } from "react";
import { TrackSelector } from "./TrackSelector";

export const NewSyncer = () => {
  // Room
  const roomId = useRoomStore((state) => state.roomId);
  const username = useRoomStore((state) => state.username);
  const userId = useRoomStore((state) => state.userId);
  const isLoadingRoom = useRoomStore((state) => state.isLoadingRoom);

  // Audio
  const audioSources = useGlobalStore((state) => state.audioSources);
  const isLoadingAudioSources = useGlobalStore(
    (state) => state.isLoadingAudioSources
  );
  const setSocket = useGlobalStore((state) => state.setSocket);
  const socket = useGlobalStore((state) => state.socket);

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

    return () => {
      // Runs on unmount and dependency change
      console.log("Running cleanup for WebSocket connection");
      ws.close();
    };
    // Not including socket in the dependency array because it will trigger the close
  }, [isLoadingRoom, roomId, userId, username, setSocket]);

  // Unmount of page:

  console.log("render", audioSources);

  if (isLoadingRoom) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/90">
        <div className="w-6 h-6 border-1 border-t-gray-800 rounded-full animate-spin"></div>
        <span className="ml-3 text-base font-normal text-gray-500">
          Loading{" "}
          {isLoadingRoom ? "room" : isLoadingAudioSources ? "audio tracks" : ""}
          ...
        </span>
      </div>
    );
  }

  if (!socket) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/90">
        <div className="w-6 h-6 border-1 border-t-gray-800 rounded-full animate-spin"></div>
        <span className="ml-3 text-base font-normal text-gray-500">
          Loading socket...
        </span>
      </div>
    );
  }

  return (
    <div>
      <div>
        <div>Room: {roomId}</div>
        <div>Username: {username}</div>
        <div>User ID: {userId}</div>
      </div>
      NewSyncer
      <div>
        {isLoadingRoom && <div>Loading...</div>}
        <TrackSelector />
      </div>
    </div>
  );
};

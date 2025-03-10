"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RoomState {
  roomId: string;
  username: string;
  userId: string;
  isLoadingRoom: boolean;
  setRoomId: (roomId: string) => void;
  setUsername: (username: string) => void;
  setUserId: (userId: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  afterHydrate: () => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      roomId: "",
      username: "",
      userId: "",
      isLoadingRoom: true,
      setRoomId: (roomId) => set({ roomId }),
      setUsername: (username) => set({ username }),
      setUserId: (userId) => set({ userId }),
      setIsLoading: (isLoading) => set({ isLoadingRoom: isLoading }),
      afterHydrate: () => {
        set({ isLoadingRoom: false });
      },
    }),
    // Defaults to createJSONStorage(() => localStorage).
    {
      name: "room-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.afterHydrate();
        }
      },
    }
  )
);

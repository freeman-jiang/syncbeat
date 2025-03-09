import { LocalAudioSource } from "@/lib/localTypes";
import { create } from "zustand";

interface StaticAudioSource {
  name: string;
  url: string;
}

interface GlobalState {
  // Audio Sources
  audioSources: LocalAudioSource[];
  isLoadingAudioSources: boolean;
  selectedSourceIndex: number;
  setAudioSources: (sources: LocalAudioSource[]) => void;
  addAudioSource: (source: LocalAudioSource) => void;
  setIsLoadingAudioSources: (isLoading: boolean) => void;
  setSelectedSourceIndex: (index: number) => void;

  // Websocket
  socket: WebSocket | null; // Use WebSocket.readyState read-only property returns the current state of the WebSocket connection
  setSocket: (socket: WebSocket) => void;
}

const STATIC_AUDIO_SOURCES: StaticAudioSource[] = [
  { name: "Trndsttr (Lucian Remix)", url: "/trndsttr.mp3" },
  { name: "Wonder", url: "/wonder.mp3" },
  { name: "Chess", url: "/chess.mp3" },
];

export const getInitialAudioSources = async (): Promise<
  Array<LocalAudioSource>
> => {
  // Get the ArrayBuffers for each source
  return Promise.all(
    STATIC_AUDIO_SOURCES.map(async (source) => {
      const response = await fetch(source.url);
      return {
        name: source.name,
        buffer: await response.arrayBuffer(),
      };
    })
  );
};

export const useGlobalStore = create<GlobalState>((set) => {
  // Load audio sources if we're in the browser
  if (typeof window !== "undefined") {
    const loadAudioSources = async () => {
      const sources = await getInitialAudioSources();
      console.log(`Loaded initial audio sources ${sources.length}`);
      set({ audioSources: sources, isLoadingAudioSources: false });
    };

    loadAudioSources();
  }

  return {
    // Audio Sources
    audioSources: [],
    isLoadingAudioSources: true,
    selectedSourceIndex: 0,
    setAudioSources: (sources) => set({ audioSources: sources }),
    addAudioSource: (source: LocalAudioSource) =>
      set((state) => ({
        audioSources: [...state.audioSources, source],
      })),
    setIsLoadingAudioSources: (isLoading) =>
      set({ isLoadingAudioSources: isLoading }),
    setSelectedSourceIndex: (index) => set({ selectedSourceIndex: index }),

    // Websocket
    socket: null,
    setSocket: (socket) => set({ socket }),
  };
});

import { LocalAudioSource } from "@/lib/localTypes";
import { create } from "zustand";

// https://webaudioapi.com/book/Web_Audio_API_Boris_Smus_html/ch02.html

interface StaticAudioSource {
  name: string;
  url: string;
}

interface AudioPlayerState {
  audioContext: AudioContext;
  sourceNode: AudioBufferSourceNode;
  gainNode: GainNode;
}

enum AudioPlayerError {
  NotInitialized = "NOT_INITIALIZED",
}

interface GlobalState {
  // Audio Sources
  audioSources: LocalAudioSource[];
  isLoadingAudio: boolean;
  selectedSourceIndex: number;
  setAudioSources: (sources: LocalAudioSource[]) => void;
  addAudioSource: (source: LocalAudioSource) => void;
  setIsLoadingAudio: (isLoading: boolean) => void;
  setSelectedSourceIndex: (index: number) => void;

  // Websocket
  socket: WebSocket | null; // Use WebSocket.readyState read-only property returns the current state of the WebSocket connection
  setSocket: (socket: WebSocket) => void;
  // Commands to broadcast
  play: (data: { offset: number; time: number }) => void;
  pause: () => void;

  // Audio Player
  audioPlayer: AudioPlayerState | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playAudio: (data: { offset: number; time: number }) => void; // time in seconds
  pauseAudio: () => void;
  // reset: () => void;
  // seekTo: (time: number) => void;
  // setVolume: (volume: number) => void; // Set volume out of 1
}

// Audio sources
const STATIC_AUDIO_SOURCES: StaticAudioSource[] = [
  { name: "Trndsttr (Lucian Remix)", url: "/trndsttr.mp3" },
  { name: "Wonder", url: "/wonder.mp3" },
  { name: "Chess", url: "/chess.mp3" },
];

const getAudioPlayer = (state: GlobalState) => {
  if (!state.audioPlayer) {
    throw new Error(AudioPlayerError.NotInitialized);
  }
  return state.audioPlayer;
};

// const getSocket = (state: GlobalState) => {
//   if (!state.socket) {
//     throw new Error("Socket not initialized");
//   }
//   return {
//     socket: state.socket,
//   };
// };

export const initializeAudioSources = async (
  audioContext: AudioContext
): Promise<Array<LocalAudioSource>> => {
  // Get the ArrayBuffers for each source
  return Promise.all(
    STATIC_AUDIO_SOURCES.map(async (source) => {
      const response = await fetch(source.url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return {
        name: source.name,
        audioBuffer,
      };
    })
  );
};

// Web audio API
const initializeAudioContext = () => {
  const audioContext = new AudioContext();
  return audioContext;
};

export const useGlobalStore = create<GlobalState>((set, get) => {
  // Load audio sources if we're in the browser
  if (typeof window !== "undefined") {
    const initializeAudio = async () => {
      const audioContext = initializeAudioContext();
      const sources = await initializeAudioSources(audioContext);
      console.log(`Loaded initial audio sources ${sources.length}`);

      // Create master gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.5; // Default volume
      gainNode.connect(audioContext.destination);
      const sourceNode = audioContext.createBufferSource();

      // Decode initial first audio source
      sourceNode.buffer = sources[0].audioBuffer;
      sourceNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
      console.log("Initialized audio context in state:", audioContext.state);

      set({
        audioSources: sources,
        isLoadingAudio: false,
        audioPlayer: {
          audioContext,
          sourceNode,
          gainNode,
        },
      });
    };

    initializeAudio();
  }

  return {
    // Audio Sources
    audioSources: [],
    isLoadingAudio: true,
    selectedSourceIndex: 0,
    setAudioSources: (sources) => set({ audioSources: sources }),
    addAudioSource: (source: LocalAudioSource) =>
      set((state) => ({
        audioSources: [...state.audioSources, source],
      })),
    setIsLoadingAudio: (isLoading) => set({ isLoadingAudio: isLoading }),
    setSelectedSourceIndex: (index) => {
      set({ selectedSourceIndex: index });
    },

    // Websocket
    socket: null,
    setSocket: (socket) => set({ socket }),

    // Commands to broadcast
    play: () => {
      // const { socket } = getSocket(get());
    },

    pause: () => {},

    // Audio Player
    audioPlayer: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.5,

    // Play the current source
    playAudio: async ({ offset }: { offset: number; time: number }) => {
      const state = get();
      const { sourceNode, audioContext, gainNode } = getAudioPlayer(state);

      // Stop any existing source node before creating a new one
      try {
        sourceNode.stop();
        // If node hasn't been started stop will throw an error
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {}

      // Create a new source node
      const newSourceNode = audioContext.createBufferSource();
      newSourceNode.buffer =
        state.audioSources[state.selectedSourceIndex].audioBuffer;
      newSourceNode.connect(gainNode);
      newSourceNode.start(0, offset);
      console.log("Started playback");

      // Update the state with the new source node
      set((state) => ({
        ...state,
        audioPlayer: {
          ...state.audioPlayer!,
          sourceNode: newSourceNode,
        },
      }));
    },

    // Pause playback
    pauseAudio: () => {
      const state = get();
      const { sourceNode } = getAudioPlayer(state);

      sourceNode.stop();
    },
  };
});

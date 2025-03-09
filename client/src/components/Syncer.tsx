"use client";
import { Button } from "@/components/ui/button";
import { useRoom } from "@/context/room";
import { cn } from "@/lib/utils";
import {
  Action,
  ClientMessage,
  NewAudioSourceMessage,
  NTPRequestMessage,
  NTPResponseMessage,
  ServerMessage,
} from "@shared/types";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// add comment

// Add a helper function to format time with millisecond precision
const formatTimeMicro = (timeMs: number): string => {
  const milliseconds = Math.floor(timeMs) % 1000;
  const seconds = Math.floor(timeMs / 1000) % 60;
  const minutes = Math.floor(timeMs / 60000);

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
};

const deserializeMessage = (message: string): ServerMessage => {
  const parsedMessage = JSON.parse(message);
  return parsedMessage;
};

const serializeMessage = (message: ClientMessage): string => {
  return JSON.stringify(message);
};

interface NTPMeasurement {
  t0: number;
  t1: number;
  t2: number;
  t3: number;
  roundTripDelay: number;
  clockOffset: number;
}

// Helper function to calculate wait time for synchronized actions
const calculateWaitTime = (
  targetServerTime: number,
  clockOffset: number | null
): number => {
  // Calculate the current server time based on our local time and clock offset
  const estimatedCurrentServerTime = Date.now() + (clockOffset || 0);

  // Calculate how long to wait before executing the action
  // If waitTime is negative, we're already past the target time, so execute immediately
  return Math.max(0, targetServerTime - estimatedCurrentServerTime);
};

// Visual timing display component
interface TimingDisplayProps {
  currentTime: number; // in milliseconds
  isPlaying: boolean;
  totalNudge: number; // in milliseconds
  clockOffset: number | null; // in milliseconds
}

const TimingDisplay: React.FC<TimingDisplayProps> = ({
  currentTime,
  isPlaying,
  totalNudge,
  clockOffset,
}) => {
  // Calculate colors based on offset values
  const getOffsetColor = (offset: number) => {
    if (Math.abs(offset) < 1) return "bg-green-500"; // Very close - green
    if (offset > 0) return "bg-red-500"; // Ahead - red
    return "bg-blue-500"; // Behind - blue
  };

  // Get color based on 2-second cycle
  const getTimeCycleColor = (timeMs: number) => {
    // We don't need to apply nudge adjustment here since the audio playback
    // has already been nudged, and timeMs reflects the current actual position
    const cyclePosition = Math.floor((timeMs % 6000) / 2000);

    // Use very distinct colors for easy visual comparison
    switch (cyclePosition) {
      case 0:
        return "bg-red-500"; // 0-2 seconds: Red
      case 1:
        return "bg-green-500"; // 2-4 seconds: Green
      case 2:
        return "bg-blue-500"; // 4-6 seconds: Blue
      default:
        return "bg-gray-500";
    }
  };

  // Get text color based on 2-second cycle
  const getTimeCycleTextColor = (timeMs: number) => {
    // We don't need to apply nudge adjustment here since the audio playback
    // has already been nudged, and timeMs reflects the current actual position
    const cyclePosition = Math.floor((timeMs % 6000) / 2000);

    switch (cyclePosition) {
      case 0:
        return "text-red-500"; // 0-2 seconds: Red
      case 1:
        return "text-green-500"; // 2-4 seconds: Green
      case 2:
        return "text-blue-500"; // 4-6 seconds: Blue
      default:
        return "text-gray-500";
    }
  };

  // Calculate which 2-second block we're in (with nudge adjustment)
  // Since currentTime already includes the nudge effect, we don't need to add totalNudge here
  const currentCycleSeconds = Math.floor((currentTime % 6000) / 1000);
  const currentColorName = [
    "Red", // 0s
    "Red", // 1s
    "Green", // 2s
    "Green", // 3s
    "Blue", // 4s
    "Blue", // 5s
  ][currentCycleSeconds];

  return (
    <div className="w-full max-w-md p-4 border rounded bg-gray-50">
      <h3 className="font-bold mb-2">Precise Timing Display</h3>

      {/* Color cycle indicator */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span>Color Cycle (6s):</span>
          <span className={`font-bold ${getTimeCycleTextColor(currentTime)}`}>
            {currentColorName} ({currentCycleSeconds % 2}s)
          </span>
        </div>
        {/* <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getTimeCycleColor(
              currentTime
            )}`}
            style={{ width: `${(currentTime % 5000) / 50}%` }}
          ></div>
        </div> */}

        {/* Large color block for easy visual comparison between clients */}
        <div className="mt-2 flex justify-center">
          <div
            className={cn(
              "w-24 h-24 rounded-lg border-4 border-gray-300",
              getTimeCycleColor(currentTime)
            )}
          >
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
              {currentCycleSeconds % 2}
            </div>
          </div>
        </div>
      </div>

      {/* Current playback time with microsecond precision */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span>Playback Time:</span>
          <span
            className={
              isPlaying ? "text-green-600 font-mono" : "text-gray-600 font-mono"
            }
          >
            {formatTimeMicro(currentTime)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full"
            style={{ width: `${(currentTime % 2000) / 20}%` }} // 2-second loop for visualization
          ></div>
        </div>
      </div>

      {/* Nudge amount visualization */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span>Timing Adjustment:</span>
          <span className="font-mono">
            {totalNudge > 0 ? "+" : ""}
            {totalNudge} ms
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 flex items-center">
          <div className="w-1/2 h-full bg-gray-300 rounded-l-full"></div>
          <div
            className={`h-4 w-1 ${
              Math.abs(totalNudge) < 0.1
                ? "bg-green-600"
                : totalNudge > 0
                ? "bg-red-500"
                : "bg-blue-500"
            }`}
            style={{ marginLeft: `${50 + totalNudge * 10}%` }} // Scale for visibility
          ></div>
          <div className="w-1/2 h-full bg-gray-300 rounded-r-full"></div>
        </div>
      </div>

      {/* Clock offset visualization */}
      <div>
        <div className="flex justify-between mb-1">
          <span>Clock Offset:</span>
          <span className="font-mono">
            {clockOffset !== null
              ? `${clockOffset > 0 ? "+" : ""}${clockOffset.toFixed(3)} ms`
              : "Unknown"}
          </span>
        </div>
        {clockOffset !== null && (
          <div className="w-full bg-gray-200 rounded-full h-2 flex items-center">
            <div className="w-1/2 h-full bg-gray-300 rounded-l-full"></div>
            <div
              className={`h-4 w-1 ${getOffsetColor(clockOffset)}`}
              style={{
                marginLeft: `${
                  50 + Math.min(Math.max(clockOffset * 5, -49), 49)
                }%`,
              }} // Scale and clamp
            ></div>
            <div className="w-1/2 h-full bg-gray-300 rounded-r-full"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export const Syncer = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { socketRef, setWebsocket, roomId, username, userId, isLoading } =
    useRoom();
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const [ntpMeasurements, setNtpMeasurements] = useState<NTPMeasurement[]>([]);
  const [averageRoundTrip, setAverageRoundTrip] = useState<number | null>(null);
  const [averageOffset, setAverageOffset] = useState<number | null>(null);
  const averageOffsetRef = useRef<number | null>(null);
  const [scheduledAction, setScheduledAction] = useState<{
    type: Action;
    time: number;
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loadingState, setLoadingState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [selectedTrack, setSelectedTrack] = useState<string>("/trndsttr.mp3");

  // Setup form for nudge controls
  const { watch, setValue } = useForm({
    defaultValues: {
      nudgeAmount: 10,
    },
  });

  // Get nudge amount from form
  const nudgeAmount = watch("nudgeAmount");
  const [totalNudge, setTotalNudge] = useState<number>(0); // Track total accumulated nudge
  // Add state for mute functionality
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Add state for tracking current playback time with high precision
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const measurementCountRef = useRef(0);
  const isMeasuringRef = useRef(false);

  // References for the latest values to use in callbacks
  useEffect(() => {
    averageOffsetRef.current = averageOffset;
  }, [averageOffset]);

  // Initialize Audio Context and load audio
  useEffect(() => {
    // Create Audio Context
    const AudioContext = window.AudioContext;
    const context = new AudioContext();
    audioContextRef.current = context;

    // Create gain node for volume control
    const gainNode = context.createGain();
    gainNode.connect(context.destination);
    gainNodeRef.current = gainNode;

    // Set initial volume based on mute state
    gainNode.gain.value = isMuted ? 0 : 1;

    // Load and decode audio file
    const loadAudio = async () => {
      try {
        setLoadingState("loading");
        const response = await fetch(selectedTrack);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
        setLoadingState("ready");
        console.log("Audio decoded and ready for precise playback");
      } catch (error) {
        console.error("Failed to load audio:", error);
        setLoadingState("error");
      }
    };

    loadAudio();

    return () => {
      if (context && context.state !== "closed") {
        context.close();
      }
    };
  }, [selectedTrack, isMuted]);

  // Keep isMeasuring in a ref so the WebSocket callback always has the current value
  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
  }, [isMeasuring]);

  // Set up continuous NTP measurements to prevent clock drift
  useEffect(() => {
    if (isConnected) {
      // Initial measurement when connected
      handleSendNTPMessage();

      // Then schedule periodic remeasurements every 30 seconds
      const intervalId = setInterval(() => {
        handleSendNTPMessage();
      }, 30000);

      return () => clearInterval(intervalId);
    }
  }, [isConnected]);

  // Set up high precision playback time tracking using requestAnimationFrame
  useEffect(() => {
    const updatePlaybackTime = () => {
      const audioContext = audioContextRef.current;

      if (audioContext && startedAtRef.current !== null) {
        // We're playing - calculate precise position
        const currentPosition = audioContext.currentTime - startedAtRef.current;
        setCurrentPlaybackTime(currentPosition * 1000); // Convert to milliseconds
        setIsPlaying(true);
      } else if (pausedAtRef.current !== null) {
        // We're paused - show the paused position
        setCurrentPlaybackTime(pausedAtRef.current * 1000); // Convert to milliseconds
        setIsPlaying(false);
      } else {
        // Not playing or paused
        setIsPlaying(false);
      }

      // Continue the animation loop
      animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);

    // Clean up
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Set up WebSocket connection - only once
  useEffect(() => {
    if (isLoading) return;

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}?roomId=${roomId}&userId=${userId}&username=${username}`
    );
    setWebsocket(ws);

    ws.onopen = () => {
      console.log("Connected to WebSocket");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message = deserializeMessage(event.data);
      console.log("Message from server ", message);

      if (message.type === Action.NTPResponse) {
        const t3 = Date.now();
        const ntpResponse = message as NTPResponseMessage;
        const { t0, t1, t2 } = ntpResponse;

        // Calculate round-trip delay and clock offset
        const roundTripDelay = t3 - t0 - (t2 - t1);
        const clockOffset = (t1 - t0 + (t2 - t3)) / 2;

        const measurement: NTPMeasurement = {
          t0,
          t1,
          t2,
          t3,
          roundTripDelay,
          clockOffset,
        };

        console.log("Measurement ", measurement);

        setNtpMeasurements((prev) => [...prev, measurement]);

        // If we're in the middle of a measurement batch, continue
        if (isMeasuringRef.current && measurementCountRef.current < 20) {
          console.log("Sending NTP request ", measurementCountRef.current);
          measurementCountRef.current++;
          setTimeout(() => {
            sendNTPRequest();
          }, 30);
        }

        // If we've completed 20 measurements, set measuring to false
        if (measurementCountRef.current >= 20) {
          setIsMeasuring(false);
        }
      } else if (
        message.type === Action.Play ||
        message.type === Action.Pause
      ) {
        // Get the server's intended execution time
        const targetServerTime = message.timestamp;

        // Convert server time to audio context time for precise scheduling
        const audioContext = audioContextRef.current;
        if (!audioContext || !audioBufferRef.current) {
          console.error("Audio not ready yet");
          return;
        }

        // Calculate wait time using helper function
        const waitTime = calculateWaitTime(
          targetServerTime,
          averageOffsetRef.current
        );
        console.log(`Scheduling ${message.type} to happen in ${waitTime}ms`);

        // Calculate the exact audio context time to start/stop playback
        const audioContextTime = audioContext.currentTime + waitTime / 1000;

        // Update UI to show scheduled action
        setScheduledAction({
          type: message.type,
          time: Date.now() + waitTime,
        });

        if (message.type === Action.Play) {
          // Stop current source if any
          if (audioSourceRef.current) {
            audioSourceRef.current.stop();
          }

          // Create new audio source node
          const source = audioContext.createBufferSource();
          source.buffer = audioBufferRef.current;
          source.connect(gainNodeRef.current || audioContext.destination);
          audioSourceRef.current = source;

          // Calculate where to start playing from
          let offset = 0;
          if (pausedAtRef.current !== null) {
            offset = pausedAtRef.current;
            pausedAtRef.current = null;
          } else if (message.serverTime < targetServerTime) {
            // If we're joining late and the audio should already be playing,
            // calculate how far into the audio we should start
            const elapsedServerTime =
              (Date.now() +
                (averageOffsetRef.current || 0) -
                targetServerTime) /
              1000;
            offset = Math.max(0, elapsedServerTime);
            console.log(`Late join - starting ${offset}s into audio`);
          }

          // Schedule precise playback
          startedAtRef.current = audioContextTime - offset;
          console.log(
            `Starting playback at context time ${audioContextTime}, offset ${offset}`
          );
          source.start(audioContextTime, offset);

          // Log when playback actually starts
          setTimeout(() => {
            console.log("Play scheduled to start at:", audioContextTime);
            console.log("Actual context time now:", audioContext.currentTime);
          }, waitTime);
        } else if (message.type === Action.Pause) {
          if (audioSourceRef.current && startedAtRef.current !== null) {
            try {
              // Schedule the stop
              audioSourceRef.current.stop(audioContextTime);

              // Calculate where we'll be in the audio when we pause
              const pausePosition = audioContextTime - startedAtRef.current;
              pausedAtRef.current = pausePosition;
              startedAtRef.current = null;

              console.log(`Pausing at position ${pausePosition}s`);

              // Log when playback actually stops
              setTimeout(() => {
                console.log("Pause scheduled at:", audioContextTime);
                console.log(
                  "Actual context time now:",
                  audioContext.currentTime
                );
              }, waitTime);
            } catch (e) {
              console.error("Error pausing:", e);
            }
          }
        }

        // Clear scheduled action after a bit longer than the wait time
        setTimeout(() => {
          setScheduledAction(null);
        }, waitTime + 100);
      } else if (message.type === Action.NewAudioSource) {
        const msg = message as NewAudioSourceMessage;
        console.log("New audio source ", msg);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [isLoading]);

  const calculateAverages = useCallback(() => {
    // Sort measurements by round trip delay to find the best ones
    const sortedMeasurements = [...ntpMeasurements].sort(
      (a, b) => a.roundTripDelay - b.roundTripDelay
    );
    const bestMeasurements = sortedMeasurements.slice(
      0,
      Math.ceil(sortedMeasurements.length / 2)
    );

    // Calculate average round trip from all measurements
    const totalRoundTrip = ntpMeasurements.reduce(
      (sum, m) => sum + m.roundTripDelay,
      0
    );

    // But only use the best measurements for offset calculation
    const totalOffset = bestMeasurements.reduce(
      (sum, m) => sum + m.clockOffset,
      0
    );

    setAverageRoundTrip(totalRoundTrip / ntpMeasurements.length);
    setAverageOffset(totalOffset / bestMeasurements.length);

    console.log(
      "New clock offset calculated:",
      totalOffset / bestMeasurements.length
    );
  }, [ntpMeasurements]);

  // Calculate averages when measurements change
  useEffect(() => {
    if (ntpMeasurements.length === 0) return;

    // If we've completed all measurements, calculate the averages
    if (ntpMeasurements.length === 20) {
      calculateAverages();
    }
  }, [ntpMeasurements, calculateAverages]);

  const handlePlay = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(serializeMessage({ type: Action.Play }));
    }
  }, []);

  const handlePause = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(serializeMessage({ type: Action.Pause }));
    }
  }, []);

  // Function to nudge audio forward (speed up) by pausing and restarting with a tiny offset
  const handleNudgeForward = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (
      !audioContext ||
      !audioBufferRef.current ||
      !audioSourceRef.current ||
      startedAtRef.current === null
    ) {
      console.log("Cannot nudge: audio not playing");
      return;
    }

    try {
      // Calculate current position
      const currentPosition = audioContext.currentTime - startedAtRef.current;

      // Stop current playback
      audioSourceRef.current.stop();

      // Create new source and start slightly ahead (nudge forward)
      const source = audioContext.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(gainNodeRef.current || audioContext.destination);

      // Skip ahead by nudgeAmount milliseconds (convert to seconds)
      const skipAmount = nudgeAmount / 1000;
      const newPosition = currentPosition + skipAmount;

      // Start at the new position immediately
      source.start(0, newPosition);

      // Update refs
      audioSourceRef.current = source;
      startedAtRef.current = audioContext.currentTime - newPosition;

      // Update total nudge
      setTotalNudge((prev) => prev + nudgeAmount);

      console.log(
        `Nudged forward by ${nudgeAmount} ms, total nudge: ${
          totalNudge + nudgeAmount
        } ms`
      );
    } catch (e) {
      console.error("Error nudging forward:", e);
    }
  }, [nudgeAmount, totalNudge]);

  // Function to nudge audio backward (slow down) by pausing and restarting with a tiny offset
  const handleNudgeBackward = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (
      !audioContext ||
      !audioBufferRef.current ||
      !audioSourceRef.current ||
      startedAtRef.current === null
    ) {
      console.log("Cannot nudge: audio not playing");
      return;
    }

    try {
      // Calculate current position
      const currentPosition = audioContext.currentTime - startedAtRef.current;

      // Stop current playback
      audioSourceRef.current.stop();

      // Create new source and start slightly behind (nudge backward)
      const source = audioContext.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(gainNodeRef.current || audioContext.destination);

      // Go back by nudgeAmount milliseconds (convert to seconds)
      const backAmount = nudgeAmount / 1000;
      const newPosition = Math.max(0, currentPosition - backAmount);

      // Start at the new position immediately
      source.start(0, newPosition);

      // Update refs
      audioSourceRef.current = source;
      startedAtRef.current = audioContext.currentTime - newPosition;

      // Update total nudge
      setTotalNudge((prev) => prev - nudgeAmount);

      console.log(
        `Nudged backward by ${nudgeAmount} ms, total nudge: ${
          totalNudge - nudgeAmount
        } ms`
      );
    } catch (e) {
      console.error("Error nudging backward:", e);
    }
  }, [nudgeAmount, totalNudge]);

  // Function to adjust the nudge amount
  const handleNudgeAmountChange = useCallback(
    (newAmount: number) => {
      const validValues = [1, 5, 10, 20, 50, 100, 250, 500, 1000];

      // If the value is not in our predefined list, find the closest available option
      if (!validValues.includes(newAmount)) {
        const closest = validValues.reduce((prev, curr) => {
          return Math.abs(curr - newAmount) < Math.abs(prev - newAmount)
            ? curr
            : prev;
        });
        console.log(
          `Nudge amount ${newAmount} not in valid options, using closest value: ${closest}`
        );
        setValue("nudgeAmount", closest);
      } else {
        setValue("nudgeAmount", newAmount);
        console.log(`Nudge amount set to ${newAmount} ms`);
      }
    },
    [setValue]
  );

  const sendNTPRequest = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const t0 = Date.now();
      const ntpRequest: NTPRequestMessage = {
        type: Action.NTPRequest,
        t0,
      };
      socketRef.current.send(JSON.stringify(ntpRequest));
    }
  }, []);

  const handleSendNTPMessage = useCallback(() => {
    setIsMeasuring(true);
    // Reset measurements
    setNtpMeasurements([]);
    // Keep the existing offset until we have new measurements
    measurementCountRef.current = 1;

    // Start the measurement process
    sendNTPRequest();
  }, [sendNTPRequest]);

  // Update countdown timer for scheduled action
  useEffect(() => {
    if (!scheduledAction) {
      setCountdown(null);
      return;
    }

    // Initial countdown
    setCountdown(Math.max(0, scheduledAction.time - Date.now()));

    // Update countdown every 10ms
    const intervalId = setInterval(() => {
      const remaining = Math.max(0, scheduledAction.time - Date.now());
      setCountdown(remaining);

      // Clear interval if countdown reaches 0
      if (remaining === 0) {
        clearInterval(intervalId);
      }
    }, 10);

    return () => clearInterval(intervalId);
  }, [scheduledAction]);

  // Handle mute toggle
  const handleToggleMute = useCallback(() => {
    const audioContext = audioContextRef.current;
    const gainNode = gainNodeRef.current;

    if (!audioContext || !gainNode) {
      console.error("Audio context or gain node not available");
      return;
    }

    const newMuteState = !isMuted;
    setIsMuted(newMuteState);

    // Set gain to 0 when muted, 1 when unmuted
    gainNode.gain.setValueAtTime(
      newMuteState ? 0 : 1,
      audioContext.currentTime
    );

    console.log(`Audio ${newMuteState ? "muted" : "unmuted"}`);
  }, [isMuted]);

  // Handle track selection change
  const handleTrackChange = useCallback((track: string) => {
    // Stop current playback if any
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }

    // Reset playback state
    startedAtRef.current = null;
    pausedAtRef.current = null;
    setIsPlaying(false);

    // Set new track and reload audio
    setSelectedTrack(track);
  }, []);

  const router = useRouter();
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/90">
        <div className="w-6 h-6 border-1 border-t-gray-800 rounded-full animate-spin"></div>
        <span className="ml-3 text-base font-normal text-gray-500">
          Loading...
        </span>
      </div>
    );
  }

  if (!roomId || !username || !userId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div>
          Room configured incorrectly. Missing:
          {!roomId && <span className="font-semibold"> roomId</span>}
          {!username && (
            <span className="font-semibold">{!roomId ? "," : ""} username</span>
          )}
          {!userId && (
            <span className="font-semibold">
              {!roomId || !username ? "," : ""} userId
            </span>
          )}
        </div>
        <Button onClick={() => router.push("/")} className="mt-2">
          Return to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {/* Track selection */}
      <div className="mt-4 mb-4">
        <Select
          value={selectedTrack}
          onValueChange={handleTrackChange}
          defaultValue="/trndsttr.mp3"
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="/trndsttr.mp3">TRNDSTTR</SelectItem>
            <SelectItem value="/chess.mp3">Chess</SelectItem>
            <SelectItem value="/wonder.mp3">Wonder</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 mb-4">
        Status: {isConnected ? "Connected" : "Disconnected"}, Audio:{" "}
        {loadingState === "ready"
          ? "Ready"
          : loadingState === "loading"
          ? "Loading..."
          : "Error!"}
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handlePlay}
          variant="default"
          size="default"
          disabled={loadingState !== "ready"}
        >
          <Play className="mr-2 h-4 w-4" />
          Play
        </Button>
        <Button
          onClick={handlePause}
          variant="default"
          size="default"
          disabled={loadingState !== "ready"}
        >
          <Pause className="mr-2 h-4 w-4" />
          Pause
        </Button>
        <Button
          onClick={handleToggleMute}
          variant={isMuted ? "destructive" : "outline"}
          size="default"
          disabled={loadingState !== "ready"}
        >
          {isMuted ? (
            <Volume2 className="mr-2 h-4 w-4" />
          ) : (
            <VolumeX className="mr-2 h-4 w-4" />
          )}
          {isMuted ? "Unmute" : "Mute"}
        </Button>
      </div>

      {/* Add fine-grained nudge controls */}
      <div className="mt-4 p-4 border rounded max-w-md w-full">
        <h3 className="font-bold mb-2">Microscopic Timing Controls</h3>
        <div className="flex items-center justify-between mb-2">
          <span>Nudge Amount: {nudgeAmount} ms</span>
          <div className="flex gap-2">
            <Button
              onClick={() =>
                handleNudgeAmountChange(
                  Math.max(1, Math.floor(nudgeAmount / 2))
                )
              }
              variant="outline"
              size="sm"
            >
              ÷2
            </Button>
            <Button
              onClick={() =>
                handleNudgeAmountChange(
                  Math.min(1000, Math.floor(nudgeAmount * 2))
                )
              }
              variant="outline"
              size="sm"
            >
              ×2
            </Button>
            <Select
              value={String(nudgeAmount)}
              onValueChange={(value) => handleNudgeAmountChange(Number(value))}
              defaultValue="10"
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Nudge amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 ms</SelectItem>
                <SelectItem value="5">5 ms</SelectItem>
                <SelectItem value="10">10 ms</SelectItem>
                <SelectItem value="20">20 ms</SelectItem>
                <SelectItem value="50">50 ms</SelectItem>
                <SelectItem value="100">100 ms</SelectItem>
                <SelectItem value="250">250 ms</SelectItem>
                <SelectItem value="500">500 ms</SelectItem>
                <SelectItem value="1000">1000 ms (1s)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={handleNudgeBackward}
            variant="secondary"
            size="default"
            disabled={loadingState !== "ready" || startedAtRef.current === null}
          >
            ◀ Slow Down
          </Button>
          <Button
            onClick={handleNudgeForward}
            variant="secondary"
            size="default"
            disabled={loadingState !== "ready" || startedAtRef.current === null}
          >
            Speed Up ▶
          </Button>
        </div>
        <div className="mt-2 text-center">
          Total adjustment: {totalNudge > 0 ? "+" : ""}
          {totalNudge} ms ({(totalNudge / 1000).toFixed(3)} s)
        </div>
      </div>

      {/* Add the precise timing display */}
      <TimingDisplay
        currentTime={currentPlaybackTime}
        isPlaying={isPlaying}
        totalNudge={totalNudge}
        clockOffset={averageOffset}
      />

      <Button
        onClick={handleSendNTPMessage}
        className="mt-4"
        disabled={isMeasuring || !isConnected}
      >
        {isMeasuring ? "Measuring..." : "Run NTP Measurements (20x)"}
      </Button>

      {scheduledAction && (
        <div className="mt-4 p-4 border rounded max-w-md w-full bg-yellow-50">
          <h3 className="font-bold">Scheduled Action</h3>
          <p>Action: {scheduledAction.type}</p>
          <p>
            Scheduled at: {new Date(scheduledAction.time).toLocaleTimeString()}
          </p>
          {countdown !== null && (
            <p className="font-bold text-lg">
              Executing in: {(countdown / 1000).toFixed(2)}s
            </p>
          )}
        </div>
      )}

      {ntpMeasurements.length > 0 && (
        <div className="mt-4 p-4 border rounded max-w-md w-full">
          <h3 className="font-bold">NTP Measurements</h3>
          <p>Measurements: {ntpMeasurements.length}</p>
          {averageRoundTrip !== null && (
            <p>Average Round-trip Delay: {averageRoundTrip.toFixed(2)}ms</p>
          )}
          {averageOffset !== null && (
            <p>Average Clock Offset: {averageOffset.toFixed(2)}ms</p>
          )}
        </div>
      )}
    </div>
  );
};

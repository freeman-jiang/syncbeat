import { useGlobalStore } from "@/store/global";
import { Button } from "../ui/button";

export const Player = () => {
  const playAudio = useGlobalStore((state) => state.playAudio);
  const pauseAudio = useGlobalStore((state) => state.pauseAudio);

  return (
    <div>
      <Button onClick={() => playAudio({ offset: 0, time: 0 })}>Play</Button>
      <Button onClick={pauseAudio}>Pause</Button>
    </div>
  );
};

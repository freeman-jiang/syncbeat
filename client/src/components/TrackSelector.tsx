"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalStore } from "@/store/global";

export const TrackSelector = () => {
  const audioSources = useGlobalStore((state) => state.audioSources);
  const selectedSourceIndex = useGlobalStore(
    (state) => state.selectedSourceIndex
  );
  const setSelectedSourceIndex = useGlobalStore(
    (state) => state.setSelectedSourceIndex
  );
  const isLoadingAudioSources = useGlobalStore(
    (state) => state.isLoadingAudioSources
  );

  return (
    <div className="mt-4 mb-4">
      <Select
        value={selectedSourceIndex.toString()}
        onValueChange={(value) => setSelectedSourceIndex(parseInt(value))}
        disabled={isLoadingAudioSources}
      >
        <SelectTrigger className="w-sm">
          <SelectValue placeholder="Select track" />
        </SelectTrigger>
        <SelectContent>
          {audioSources.map((source, index) => (
            <SelectItem key={source.name} value={index.toString()}>
              {source.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export const loadAudio = async (url: string) => {
  const audioContext = new AudioContext();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer;
};

export async function playSound(url: string) {
  const audioContext = new AudioContext();

  // Fetch the audio file
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  // Decode the audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create a source node
  const sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;

  // Connect to destination and play
  sourceNode.connect(audioContext.destination);
  sourceNode.start();
}

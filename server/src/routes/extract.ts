// import * as ytdl from "@distube/ytdl-core";
import {
  ClientAction,
  ClientActionEnum,
  AudioSource,
  ServerMessage,
} from "@shared/types";
import { randomUUIDv7, Server } from "bun";
import { existsSync, mkdirSync } from "fs";
import * as path from "path";
import { errorResponse, jsonResponse } from "../utils/responses";

const ytdl = require("@distube/ytdl-core");

// Create audio directory if it doesn't exist
const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
console.log(`Audio directory path: ${AUDIO_DIR}`);
if (!existsSync(AUDIO_DIR)) {
  console.log(`Creating audio directory: ${AUDIO_DIR}`);
  mkdirSync(AUDIO_DIR, { recursive: true });
}

export const handleExtract = async (req: Request, server: Server) => {
  console.log(`Extract request received: ${req.method}`);
  // Only accept POST requests
  if (req.method !== "POST") {
    console.log(`Method not allowed: ${req.method}`);
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Parse the request body
    const body = await req.json();
    const { url, roomId } = body;
    console.log(`Request body parsed - URL: ${url}, Room ID: ${roomId}`);

    if (!url) {
      console.log("URL is missing in request");
      return errorResponse("URL is required");
    }

    if (!roomId) {
      console.log("Room ID is missing in request");
      return errorResponse("Room ID is required");
    }

    // Validate YouTube URL
    console.log(`Validating YouTube URL: ${url}`);
    if (!ytdl.validateURL(url)) {
      console.log(`Invalid YouTube URL: ${url}`);
      return errorResponse("Invalid YouTube URL");
    }

    // Generate a unique ID for the audio file
    const audioId = randomUUIDv7();
    const outputPath = path.join(AUDIO_DIR, `${audioId}.mp3`);
    console.log(`Generated audio ID: ${audioId}, Output path: ${outputPath}`);

    // Get video info
    console.log(`Getting info for ${url}`);
    const info = await ytdl.getInfo(url);
    console.log(`Video info retrieved, title: ${info.videoDetails.title}`);

    // Get audio-only format with highest quality
    console.log("Selecting highest quality audio format");
    const format = ytdl.chooseFormat(info.formats, { quality: "highestaudio" });

    if (!format) {
      console.log("No suitable audio format found");
      return errorResponse("No suitable audio format found", 400);
    }
    console.log(
      `Selected format: ${format.mimeType}, quality: ${format.quality}`
    );

    // Download the audio directly to file
    console.log(`Downloading audio from ${url} to ${outputPath}`);

    // Create a write stream to the output file
    const writeStream = require("fs").createWriteStream(outputPath);

    console.log("Downloading and piping directly to file");

    // Download and pipe directly to file
    ytdl.downloadFromInfo(info, { format }).pipe(writeStream);

    console.log("DONE");

    // Create audio source object
    console.log("Creating audio source object");
    const audioSource: AudioSource = {
      id: audioId,
      title: info.videoDetails.title || "Unknown Title",
      url: `/audio/${audioId}.mp3`,
      duration: parseInt(info.videoDetails.lengthSeconds) || 0,
      thumbnail:
        info.videoDetails.thumbnails.length > 0
          ? info.videoDetails.thumbnails[
              info.videoDetails.thumbnails.length - 1
            ].url
          : undefined,
      addedAt: Date.now(),
    };
    console.log(`Audio source created: ${JSON.stringify(audioSource)}`);

    // Notify all clients in the room about the new audio source
    console.log(`Notifying clients in room ${roomId} about new audio`);
    const message: ServerMessage = {
      type: "NEW_AUDIO_SOURCE",
      source: audioSource,
    };

    server.publish(roomId, JSON.stringify(message));
    console.log(`Notification sent to room ${roomId}`);

    // Return success response with the audio source info
    console.log("Returning success response");
    return jsonResponse({
      success: true,
      message: "Audio extracted successfully",
      source: audioSource,
    });
  } catch (error) {
    console.error("Error extracting audio:", error);
    return errorResponse(
      "Failed to extract audio: " + (error as Error).message,
      500
    );
  }
};

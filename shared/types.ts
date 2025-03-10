import { z } from "zod";

export const ClientActionEnum = z.enum([
  "PLAY",
  "PAUSE",
  "JOIN",
  "NTP_REQUEST",
  "NEW_AUDIO_SOURCE",
]);
export type ClientAction = z.infer<typeof ClientActionEnum>;

// Actions that are different from the echoing of client actions
export const ServerActionEnum = z.enum(["NTP_RESPONSE"]);

export const AudioSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  duration: z.number().positive(),
  thumbnail: z.string().url().optional(),
  addedAt: z.number(),
});

export type AudioSource = z.infer<typeof AudioSourceSchema>;

export const ClientMessageSchema = z.object({
  type: ClientActionEnum,
});

export const NTPRequestMessageSchema = ClientMessageSchema.extend({
  type: z.literal(ClientActionEnum.enum.NTP_REQUEST),
  t0: z.number(), // Client send timestamp
});

export const PlayActionSchema = z.object({
  type: z.literal(ClientActionEnum.enum.PLAY),
  time: z.number(),
  trackIndex: z.number(),
});

export const NTPResponseMessageSchema = z.object({
  type: z.literal(ServerActionEnum.enum.NTP_RESPONSE),
  t0: z.number(), // Client send timestamp (echoed back)
  t1: z.number(), // Server receive timestamp
  t2: z.number(), // Server send timestamp
});

export const NewAudioSourceMessageSchema = z.object({
  type: z.literal(ClientActionEnum.enum.NEW_AUDIO_SOURCE),
  source: AudioSourceSchema,
});

const JoinMessageSchema = z.object({
  type: z.literal(ClientActionEnum.enum.JOIN),
  username: z.string(),
  userId: z.string(),
});

export const ServerMessageSchema = z.discriminatedUnion("type", [
  PlayActionSchema,
  NTPResponseMessageSchema,
  NewAudioSourceMessageSchema,
  JoinMessageSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type NTPRequestMessage = z.infer<typeof NTPRequestMessageSchema>;
export type PlayActionMessage = z.infer<typeof PlayActionSchema>;
export type NTPResponseMessage = z.infer<typeof NTPResponseMessageSchema>;
export type NewAudioSourceMessage = z.infer<typeof NewAudioSourceMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

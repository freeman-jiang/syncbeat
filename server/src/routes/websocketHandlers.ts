import {
  ClientActionEnum,
  ClientMessage,
  NTPRequestMessage,
  ServerMessage,
} from "@shared/types";
import { deserializeMessage } from "../utils/websocket";

export const handleOpen = (ws: any, server: any) => {
  const { roomId } = ws.data;
  ws.subscribe(roomId);
  const message: ServerMessage = {
    type: ClientActionEnum.Enum.JOIN,
    username: ws.data.username,
    userId: ws.data.userId,
  };
  server.publish(roomId, JSON.stringify(message));
};

export const handleMessage = (ws: any, message: any, server: any) => {
  const { roomId, userId, username } = ws.data;
  const t1 = Date.now();
  const parsedMessage = deserializeMessage(message.toString());

  if (parsedMessage.type === ClientActionEnum.Enum.NTP_REQUEST) {
    // Handle NTP request
    const ntpRequest = parsedMessage as NTPRequestMessage;
    const ntpResponse: ServerMessage = {
      type: "NTP_RESPONSE",
      t0: ntpRequest.t0, // Echo back the client's t0
      t1, // Server receive time
      t2: Date.now(), // Server send time
    };

    ws.send(JSON.stringify(ntpResponse));
    return;
  }

  const clientMessage = parsedMessage as ClientMessage;
  const response = {
    type: clientMessage.type,
    timestamp: Date.now() + 500, // Schedule the action 500ms in the future
    serverTime: Date.now(),
  };

  console.log(
    `Room: ${roomId} | User: ${username} | Message: ${JSON.stringify(
      clientMessage
    )}`
  );
  server.publish(roomId, JSON.stringify(response));
};

export const handleClose = (ws: any) => {
  console.log(`Connection closed`);
  ws.unsubscribe(ws.data.roomId);
};

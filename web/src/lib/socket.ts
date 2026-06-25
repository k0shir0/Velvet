import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";

let socket: Socket | null = null;

/** Lazily create (and reuse) the authenticated Socket.IO connection. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io("/", {
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

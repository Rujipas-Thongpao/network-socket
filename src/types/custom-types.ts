import { Socket } from "socket.io";
import { Server } from 'socket.io';

export type SocketEventHandler = (socket: Socket, io: Server, mes: any) => Promise<void>;
export type SocketHandler = (socket: Socket, io: Server) => Promise<void>;
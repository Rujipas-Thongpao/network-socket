import { Server, Socket } from "socket.io";
import { prisma } from './prisma';
import * as http from "http";

// Extend the interface
declare module 'socket.io' {
	interface Socket {
		userId: number;
		username: string;
	}
}

export const io = async (server: http.Server) => {

	// create global room if there aren't one
	let globalRoom = await prisma.room.findFirst({
		where: {
			name: 'global room',
			type: 'public'
		}
	})

	if (!globalRoom) {
		globalRoom = await prisma.room.create({
			data: {
				name: 'global room',
				type: 'public'
			}
		})
	}

	const io: Server = new Server(server, {
		cors: {
			origin: "http://localhost:3000", // Explicitly allow requests from port 3000
			methods: ["GET", "POST"],
			allowedHeaders: ["*"],
			credentials: true
		}
	});

	io.use(async (socket: Socket, next) => {
		const { username, password } = socket.handshake.auth;
		if (!username || !password) {
			return next(new Error("invalid username"));
		}

		// find if username password
		const user = await prisma.user.findFirst({
			where: {
				name: username
			}
		});

		if (user) {
			if (user.password === password) {
				socket.userId = user.id;
				socket.username = user.name;
				return next();
			}
			return next(new Error("invalid username"));
		}

		// create
		const createdUser = await prisma.user.create({
			data: {
				name: username,
				password: password,
			}
		})

		socket.userId = createdUser.id;
		socket.username = createdUser.name;
		next();
	});

	io.on('connection', (socket: Socket) => {

		// log all user
		const users = [];
		for (let [id, s] of io.of("/").sockets) {
			users.push({
				socketId: id,
				userId: s.userId,
				username: s.username,
			});
		}
		console.log(users);

		// emit all user
		io.emit("new user connected", users);
		// socket.emit("users", users); // emit to just that client
		// socket.broadcast.emit("user connected", { // boardcast except this socket
		// 	userID: socket.userId,
		// 	username: socket.username,
		// });

		socket.join(globalRoom.id.toString());

		// private room (DM)
		socket.on("join private room", async ({ otherId }) => {
			const roomName = [socket.userId, otherId].sort().join('-');

			let privateRoom = await prisma.room.findFirst({
				where: {
					name: roomName,
					type: "private"
				}
			})
			if (!privateRoom) {
				privateRoom = await prisma.room.create({
					data: {
						name: roomName,
						type: "private"
					}
				})
			}

			socket.join(privateRoom.id.toString());
		})

		socket.on("private message", async ({ content, otherId }) => {
			const roomName = [socket.userId, otherId].sort().join('-');

			const room = await prisma.room.findFirst({
				where: {
					name: roomName,
					type: "private"
				}
			})

			if (!room) {
				return;
			}

			const message = await prisma.message.create({
				data: {
					content: content,
					roomId: room.id,
					senderId: socket.userId
				}
			})

			io.to(room.id.toString()).emit("private message", {
				content,
				from: socket.userId,
			});
		});

		// public room
		socket.on("join public room", async (roomName) => {

			// TODO : validate roomName first

			// create room dynamically
			let publicRoom = await prisma.room.findFirst({
				where: {
					name: roomName,
					type: "public"
				}
			})
			if (!publicRoom) {
				publicRoom = await prisma.room.create({
					data: {
						name: roomName,
						type: "public"
					}
				})
			}

			socket.join(publicRoom.id.toString());
		})

		socket.on("public message", async ({ content, roomName }) => {

			const room = await prisma.room.findFirst({
				where: {
					name: roomName,
					type: "public"
				}
			})

			if (!room) {
				return;
			}

			const message = await prisma.message.create({
				data: {
					content: content,
					roomId: room.id,
					senderId: socket.userId
				}
			})

			io.to(room.id.toString()).emit("public message", {
				content,
				from: socket.userId
			})
		})

		// Global
		socket.on("global message", async ({ content }) => {
			const message = await prisma.message.create({
				data: {
					content: content,
					roomId: globalRoom.id,
					senderId: socket.userId
				}
			})

			io.to(globalRoom.id.toString()).emit("global message", {
				content,
				from: socket.userId,
			})
		})

		// disconnect controller
		socket.on("disconnect", async () => {
			const users = [];
			for (let [id, s] of io.of("/").sockets) {
				if (id == socket.id) continue;
				users.push({
					socketId: id,
					userId: s.userId,
					username: s.username,
				});
			}
			socket.broadcast.emit("user disconnected", { // boardcast except this socket
				userID: socket.userId,
				username: socket.username,
			});
		});
	})
}


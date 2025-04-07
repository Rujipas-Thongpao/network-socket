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


		const username = socket.handshake.headers.username as string;
		const password = socket.handshake.headers.password as string;

		if (!username || !password) {
			return next(new Error('Authentication error: No token provided'));
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
		// io.emit("new user connected", users);
		io.emit("users", users); // emit to just that client
		socket.broadcast.emit("user connected", { // boardcast except this socket
			userID: socket.userId,
			username: socket.username,
		});



		// private room (DM)
		socket.on("join private room", async (mes) => {
			const { otherName } = JSON.parse(mes);

			// find other
			const other = await prisma.user.findFirst({
				where: {
					name: otherName
				}
			})

			if (!other) {
				return;
			}

			const roomName = [socket.userId, other.id].sort().join('-');

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

		socket.on("private message", async (mes) => {
			const { content, otherName } = JSON.parse(mes);

			// find other
			const other = await prisma.user.findFirst({
				where: {
					name: otherName
				}
			})

			if (!other) {
				return;
			}

			const roomName = [socket.userId, other.id].sort().join('-');

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
		socket.on("join public room", async (mes) => {
			const { roomName } = JSON.parse(mes);

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

		socket.on("public message", async (mes) => {
			const { content, roomName } = JSON.parse(mes);

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

		// join global room 
		socket.join(globalRoom.id.toString());

		// Global
		socket.on("global message", async (mes) => {
			const { content } = JSON.parse(mes);

			console.log("message from global");
			console.log(content);

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


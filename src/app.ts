import { createServer } from "http";
import { Server } from "socket.io";
import { RoomManager } from "./room-manager";
import { ThreeCardsGame } from "./three-cards/game";
import appConfig from "./app.config";
import { connect } from "mongoose";

const httpServer = createServer();
const roomManager = new RoomManager();
const socketMap = new Map();
const playerMap = new Map();
const game = new ThreeCardsGame();
export const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});
await connect("mongodb://root:example@localhost:27017/chinese-poker?authSource=admin");
io.on("connection", (socket) => {
    console.log("connected");
    socket.on("join", async (data) => {
        const result = roomManager.findPlayer(data.name);
        socket.join(`player-${data.name}`);
        if (result) {
            socket.send({
                type: "error",
                message: "player already exists",
            });
            roomManager.reJoinRoom(result.room, result.player);
            console.log(result.player.name, " rejoin in room ", result.room.id);
            const socketId = playerMap.get(result.player.name);
            if (socketId) {
                socketMap.delete(socketId);
                playerMap.delete(result.player.name);
                io.to(socketId).emit("AnotherDevice join in room");
                io.to(socketId).socketsLeave(`room-${result.room.id}`);
                io.to(socketId).socketsLeave(`player-${result.player.name}`);
            }
            socket.join(`room-${result.room.id}`);
            socket.join(`player-${result.player.name}`);
            socketMap.set(socket.id, {
                roomId: result.room.id,
                name: result.player.name,
            });
            playerMap.set(result.player.name, socket.id);
        } else {
            const room = await roomManager.getAvailableRoom(game, {
                id: data.id,
                name: data.name,
            });
            if (room) {
                socketMap.set(socket.id, {
                    roomId: room.id,
                    name: data.name,
                });
                playerMap.set(data.name, socket.id);
                socket.join(`room-${room.id}`);
                socket.join(`player-${data.name}`);
            } else {
                socket.emit("noRoom", {
                    time: new Date(),
                });
            }
        }
    });
    socket.on("finish", (data) => {
        const playerData = socketMap.get(socket.id);
        const room = roomManager.getRoomById(playerData.roomId);
        if (room) {
            room.alertFinish(playerData.playerName, data.output);
        } else {
            console.log("room ", playerData.roomId, " not found");
        }
    });
    socket.on("leave", () => {
        const playerData = socketMap.get(socket.id);
        const room = roomManager.getRoomById(playerData.roomId);
        if (room) {
            roomManager.leaveRoom(room, {
                id: playerData.id,
                name: playerData.name,
            });
            socket.leave(`room-${playerData.roomId}`);
            socket.leave(`player-${playerData.name}`);
        }
    });
    socket.on("disconnect", () => {
        if (socketMap.has(socket.id)) {
            const playerData = socketMap.get(socket.id);
            const room = roomManager.getRoomById(playerData.roomId);
            if (room) {
                roomManager.leaveRoom(room, {
                    id: playerData.id,
                    name: playerData.name,
                });
            }
        }
    });
});

httpServer.listen(appConfig.port);
console.log("server started on: http://localhost:", appConfig.port);

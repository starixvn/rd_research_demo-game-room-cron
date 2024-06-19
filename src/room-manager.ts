import { PLAYER_STATE } from "./consts";
import { IGame, Player } from "./interfaces";
import RoomModel from "./models/room-model";
import { Room } from "./room";

export class RoomManager<PlayerOutput, Result> {
    // public freeRooms: Set<Room<PlayerOutput, Result>> = new Set();
    // public fullRooms: Set<Room<PlayerOutput, Result>> = new Set();

    public roomMap: Map<string, Room<PlayerOutput, Result>> = new Map();
    public limitRoom = 1000;

    public async createRoom(game: IGame<PlayerOutput, Result>): Promise<Room<PlayerOutput, Result>> {
        const roomModel = new RoomModel({
            capacity: 4,
            currentPlayer: 1,
            gameState: 0,
        });
        console.log(roomModel._id.toString(), " created!");
        await roomModel.save();
        const room = new Room(roomModel._id.toString(), 4, game, roomModel, this.handleRemovePlayer.bind(this));
        this.roomMap.set(roomModel._id.toString(), room);
        console.log("We have ", roomModel._id.toString(), " rooms");
        return room;
    }

    public getRoomById(id: string): Room<PlayerOutput, Result> | undefined {
        return this.roomMap.get(id);
    }

    public joinRoom(room: Room<PlayerOutput, Result>, player: Player) {
        room.addPlayer(player);
        console.log(player.name, " join in room ", room.id);
    }

    reJoinRoom(room: Room<PlayerOutput, Result>, player: Player) {
        room.changePlayerState(player, PLAYER_STATE.IN_GAME);
    }

    handleRemovePlayer(room: Room<PlayerOutput, Result>) {
        if (room.players.length === 0) {
            this.roomMap.delete(room.id);
        }
        console.log(room.id, " deleted!");
        console.log("We remains ", this.roomMap.size, " rooms");
    }

    public leaveRoom(room: Room<PlayerOutput, Result>, player: Player) {
        room.deletePlayer(player);
        console.log(player.name, " leave room ", room.id);
        console.log(room.id, "remains: ", room.players);
    }

    public async getAvailableRoom(game: IGame<PlayerOutput, Result>, player: Player): Promise<Room<PlayerOutput, Result> | undefined> {
        const roomModel = await RoomModel.findOneAndUpdate({ currentPlayer: { $lt: 4 } }, { $inc: { currentPlayer: 1 } });
        if (roomModel != null) {
            const room = this.roomMap.get(roomModel._id.toString());
            room?.addPlayer(player);
            return room;
        }
        if (this.roomMap.size < this.limitRoom && roomModel == null) {
            const room = await this.createRoom(game);
            room.addPlayer(player);
            return room;
        } else {
            console.log("No available room. Please try again later.");
            return undefined;
        }
    }

    public findPlayer(playerName: string): { player: Player; room: Room<PlayerOutput, Result> } | undefined {
        return this.findPlayerInRooms(playerName, this.roomMap);
    }

    public findPlayerInRooms(
        playerName: string,
        rooms: Map<string, Room<PlayerOutput, Result>>
    ): { player: Player; room: Room<PlayerOutput, Result> } | undefined {
        for (const [_, room] of rooms.entries()) {
            for (const player of room.players) {
                if (player.name === playerName) {
                    return {
                        player,
                        room,
                    };
                }
            }
        }

        return undefined;
    }
}

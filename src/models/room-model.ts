import { Schema, model } from "mongoose";

export interface IRoom {
    capacity: number;
    currentPlayer: number;
    gameState: number;
}

const RoomSchema = new Schema<IRoom>({
    capacity: {
        type: Number,
        required: true,
    },
    currentPlayer: {
        type: Number,
        required: true,
    },
    gameState: {
        type: Number,
        required: true,
    },
});

const RoomModel = model<IRoom>("Room", RoomSchema);
export default RoomModel;

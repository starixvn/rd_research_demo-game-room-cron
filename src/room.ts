import mongoose, { Types } from "mongoose";
import { io } from "./app";
import { GAME_STATE, PLAYER_STATE } from "./consts";
import { CountDownTimer } from "./countdown-timer";
import { IGame, Player } from "./interfaces";
import RoomModel, { IRoom } from "./models/room-model";

export class Room<PlayerOutput, Result> {
    public id: string;
    private _capacity: number = 4;
    private _gameLoop: CountDownTimer;
    public roomInstance: mongoose.Document<unknown, {}, IRoom> &
        IRoom & {
            _id: Types.ObjectId;
        };
    private onRemovePlayer: (room: Room<PlayerOutput, Result>) => void;
    public players: Player[] = [];
    public playerState = new Map();
    public playerOutput = new Map();
    public playerInput = new Map();
    public gameState: number = GAME_STATE.WAITING;
    public game: IGame<PlayerOutput, Result>;
    private roomTime: number;

    public constructor(
        id: string,
        capacity: number,
        game: IGame<PlayerOutput, Result>,
        roomInstance: mongoose.Document<unknown, {}, IRoom> &
            IRoom & {
                _id: Types.ObjectId;
            },
        onDeleteRoom: (room: Room<PlayerOutput, Result>) => void
    ) {
        this.id = id;
        this.game = game;
        this.roomInstance = roomInstance;
        this.roomTime =
            this.game.gameConfig.waitPlayerArrangeDuration +
            this.game.gameConfig.waitRoomDuration +
            this.game.gameConfig.showSettleDuration;
        this._capacity = capacity;
        this._gameLoop = this.initGameLoop();
        this._gameLoop.start();
        this.onRemovePlayer = onDeleteRoom;
    }

    private initGameLoop() {
        const sumTime = this.roomTime;
        const startTime = sumTime - this.game.gameConfig.waitRoomDuration;
        const settleTime = sumTime - this.game.gameConfig.waitPlayerArrangeDuration - this.game.gameConfig.waitRoomDuration;

        const excutionByTime = new Map();
        excutionByTime.set(sumTime, () => {
            this.handleStart();
            this.gameState = GAME_STATE.WAITING;
        });
        excutionByTime.set(startTime - 1, () => {
            console.log("Add bots");
        });
        excutionByTime.set(startTime, () => {
            this.gameState = GAME_STATE.STARTED;
            this.handleDivideCards();
        });
        excutionByTime.set(settleTime, () => {
            this.gameState = GAME_STATE.SETTLE;
            this.handleSettle();
        });
        return new CountDownTimer(sumTime, excutionByTime);
    }

    handleStart() {
        this.resetPlayerState();
        this.publishMessageToRoom(
            {
                remaining: this._gameLoop.countDown,
                currentTime: new Date(),
                players: this.players.map((player) => player.name),
            },
            "newRound"
        );
    }

    handleDivideCards() {
        const input = this.game.divideCards(this.players.length);
        for (let i = 0; i < this.players.length; i++) {
            this.sendMessageToPlayer(this.players[i].name, { input: input[i] }, "input");
            this.playerInput.set(this.players[i].name, input[i]);
        }
    }

    handleSettle() {
        console.log("Input: ", this.playerInput);
        console.log("Output: ", this.playerOutput);
        for (const player of this.players) {
            if (!this.playerOutput.has(player.name)) {
                this.playerOutput.set(player.name, this.game.defaultHandle(this.playerInput.get(player.name)));
            }
        }
        const input: PlayerOutput[] = [];
        const mapInput = new Map();
        this.playerOutput.forEach((value, key) => {
            input.push(value);
            mapInput.set(input.length - 1, key);
        });
        const settlement = this.game.settle(input);
        const output = {};
        for (let i = 0; i < settlement.length; i++) {
            Object.assign(output, {
                [mapInput.get(i)]: settlement[i],
            });
        }
        console.log(output);
        this.publishMessageToRoom(settlement, "result");
    }

    public async resetPlayerState() {
        const availablePlayers = [];
        for (const player of this.players) {
            if (this.playerState.get(player.name) === PLAYER_STATE.NOT_AVAILABLE) {
                this.playerState.delete(player.name);
                await RoomModel.updateOne({ _id: this.roomInstance._id }, { $set: { currentPlayer: this.players.length - 1 } });
            } else {
                availablePlayers.push(player);
                this.playerState.set(player.name, PLAYER_STATE.IN_GAME);
            }
        }

        if (availablePlayers.length === 0) {
            await RoomModel.deleteOne({ _id: this.roomInstance._id }).exec();
            this.destroy();
        }
        const oldLength = this.players.length;
        this.players = availablePlayers;
        if (oldLength !== this.players.length) {
            this.onRemovePlayer(this);
        }
    }

    public publishResult() {
        this.publishMessageToRoom(
            {
                winner: "player A",
            },
            "result"
        );
    }

    public addPlayer(player: Player) {
        this.players.push(player);
        this.playerState.set(player.name, PLAYER_STATE.IN_GAME);
        this.sendMessageToPlayer(
            player.name,
            {
                room: this.id,
                remaining: this._gameLoop.countDown,
                currentTime: new Date(),
            },
            "gameState"
        );
    }

    public changePlayerState(player: Player, newState: number) {
        this.playerState.set(player.name, newState);
    }

    public deletePlayer(player: Player) {
        this.playerState.set(player.name, PLAYER_STATE.NOT_AVAILABLE);
    }

    public alertFinish(playerName: string, result: PlayerOutput) {
        this.playerState.set(playerName, PLAYER_STATE.FINISHED);
        this.playerOutput.set(playerName, result);

        this.checkAllFinish();
    }

    checkAllFinish() {
        const check = this.players.filter((player, _) => this.playerState.get(player.name) === PLAYER_STATE.FINISHED);

        if (check.length === this.players.length) {
            this.gameState = 1;
        }
    }

    public isFull() {
        return this.players.length >= this._capacity;
    }

    public destroy() {
        this._gameLoop.stop();
    }

    publishMessageToRoom(message: any, messageType = "message") {
        io.to(`room-${this.id}`).emit(messageType, message);
    }

    sendMessageToPlayer(playerName: string, message: any, messageType = "message") {
        io.to(`player-${playerName}`).emit(messageType, message);
    }
}

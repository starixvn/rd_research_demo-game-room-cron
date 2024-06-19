export interface Player {
    id: string;
    name: string;
}

export interface GameConfig {
    waitRoomDuration: number;
    waitPlayerArrangeDuration: number;
    showSettleDuration: number;
    numberOfCards: number;
}

export interface IGame<PlayerOutput, Result> {
    gameConfig: GameConfig;
    divideCards(numberOfPlayers: number): number[][];
    settle(players: PlayerOutput[]): Result[];
    defaultHandle(cards: number[]): PlayerOutput;
}

export interface SocketMap {
    [key: string]: string;
}

export interface GameData {
    [key: string]: {
        [key: string]: number;
    };
}

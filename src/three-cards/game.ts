import { calculatePoint, divideCards } from "../helper/divide";
import { GameConfig, IGame } from "../interfaces";
import { GAME_CONFIG } from "./game-config";
import { Hand } from "./result";

export class ThreeCardsGame implements IGame<Hand, Hand> {
    defaultHandle(cards: number[]): Hand {
        return { front: cards?.[0], middle: cards?.[1], back: cards?.[2] };
    }
    gameConfig: GameConfig = GAME_CONFIG;
    divideCards(numberOfPlayers: number): number[][] {
        return divideCards(numberOfPlayers, 3);
    }
    settle(players: Hand[]): Hand[] {
        let result: Hand[] = [];
        for (const _ of players) {
            result.push({ front: 0, middle: 0, back: 0 });
        }
        for (let i = 0; i < players.length - 1; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const front = calculatePoint(players[i].front, players[j].front);
                result[i].front += front;
                result[j].front -= front;
                const middle = calculatePoint(players[i].middle, players[j].middle);
                result[i].middle += middle;
                result[j].middle -= middle;
                const back = calculatePoint(players[i].back, players[j].back);
                result[i].back += back;
                result[j].back -= back;
            }
        }

        return result;
    }
}

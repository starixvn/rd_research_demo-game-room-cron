const shuffle = (arr: any[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const random = () => {
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0] / (0xffffffff + 1);
};

export const divideCards = (numberOfParts: number, numberEachPart: number) => {
    const deck = [];
    for (let i = 0; i < 52; i++) {
        deck.push(i);
    }
    shuffle(deck);
    const result = [];
    for (let i = 0; i < numberOfParts; i++) {
        const part = [];
        for (let j = 0; j < numberEachPart; j++) {
            part.push(deck[i * numberOfParts + j]);
        }
        result.push(part);
    }
    return result;
};

export const calculatePoint = (a: number, b: number) => {
    if (a > b) {
        return 1;
    }
    if (a < b) {
        return -1;
    }

    return 0;
};

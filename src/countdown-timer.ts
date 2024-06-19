import { CronJob } from "cron";

export class CountDownTimer {
    private gameLoop: CronJob;
    public countDown: number = 10;
    private time: number = 10;
    public methodMap: Map<number, () => void> = new Map();

    public constructor(time: number, methodMap: Map<number, () => void>) {
        this.gameLoop = new CronJob("* * * * * *", () => {
            this.gameRun();
        });
        this.time = time;
        this.countDown = time;
        this.methodMap = methodMap;
    }

    public start() {
        this.gameLoop.start();
    }

    public stop() {
        this.gameLoop.stop();
    }

    gameRun() {
        console.log(this.countDown, "s");
        this.methodMap.get(this.countDown)?.();
        if (this.countDown === 0) {
            this.countDown = this.time + 1;
        }
        this.countDown--;
    }
}

// ゲーム設定用の定数
const SATRT_BTN_ID = "start-btn";
const MAIN_CANVAS_ID = "main-canvas";
const NEXT_CANVAS_ID = "next-canvas";
const HOLD_CANVAS_ID = "hold-canvas";
const GAME_SPEED = 500;
const BLOCK_SIZE = 32;
const COLS_COUNT = 10;
const ROWS_COUNT = 20;
const SCREEN_WIDTH = COLS_COUNT * BLOCK_SIZE;
const SCREEN_HEIGHT = ROWS_COUNT * BLOCK_SIZE;
const NEXT_AREA_SIZE = 160;
const HOLD_AREA_SIZE = 160;
const NEXT_MINO_COUNT = 3;
const BLOCK_SOURCES = [
    "images/block-0.png",
    "images/block-1.png",
    "images/block-2.png",
    "images/block-3.png",
    "images/block-4.png",
    "images/block-5.png",
    "images/block-6.png"
];

// 新しい定数
const LEVEL_UP_SCORE = 100; // レベルアップに必要なスコア
const MAX_LEVEL = 10; // 最大レベル
const MIN_GAME_SPEED = 100; // 最高速度（ミリ秒）

// スコアの初期化
let score = 0;

// グローバル変数として game を定義
let game;

// 画像アセット管理クラス
class Asset {
    static blockImages = [];

    static init(callback) {
        let loadCnt = 0;
        for (let i = 0; i <= 6; i++) {
            let img = new Image();
            img.src = BLOCK_SOURCES[i];
            img.onload = function() {
                loadCnt++;
                Asset.blockImages.push(img);

                if (loadCnt >= BLOCK_SOURCES.length && callback) {
                    callback();
                }
            };
        }
    }
}

// ゲームクラス
class Game {
    constructor() {
        this.initMainCanvas();
        this.initNextCanvases();
        this.initHoldCanvas();
        this.field = new Field();
        this.level = 1;
        this.gameSpeed = GAME_SPEED;
    }

    initMainCanvas() {
        this.mainCanvas = document.getElementById(MAIN_CANVAS_ID);
        this.mainCtx = this.mainCanvas.getContext("2d");
        this.mainCanvas.width = SCREEN_WIDTH;
        this.mainCanvas.height = SCREEN_HEIGHT;
        this.mainCanvas.style.border = "4px solid #555";
    }

    initNextCanvases() {
        this.nextCanvases = [];
        this.nextCtxs = [];
        for (let i = 0; i < NEXT_MINO_COUNT; i++) {
            let canvas = document.createElement('canvas');
            canvas.width = NEXT_AREA_SIZE;
            canvas.height = NEXT_AREA_SIZE;
            canvas.style.border = "4px solid #555";
            document.body.insertBefore(canvas, this.holdCanvas);
            this.nextCanvases.push(canvas);
            this.nextCtxs.push(canvas.getContext("2d"));
        }
    }

    initHoldCanvas() {
        this.holdCanvas = document.getElementById(HOLD_CANVAS_ID);
        this.holdCtx = this.holdCanvas.getContext("2d");
        this.holdCanvas.width = HOLD_AREA_SIZE;
        this.holdCanvas.height = HOLD_AREA_SIZE;
    }

    start() {
        this.field = new Field();
        this.nextMinos = Array(NEXT_MINO_COUNT).fill().map(() => new Mino());
        this.popMino();
        this.holdMino = null;
        this.canHold = true;
        this.level = 1;
        this.gameSpeed = GAME_SPEED;
        score = 0;
        this.updateScore();
        this.updateLevel();
        this.drawAll();
        clearInterval(this.timer);
        this.timer = setInterval(() => this.update(), this.gameSpeed);
        this.setKeyEvent();
    }

    update() {
        if (this.valid(0, 1)) {
            this.mino.y++;
        } else {
            this.fixMino();
            this.field.checkLine();
            this.popMino();
            this.canHold = true;
        }
        this.drawAll();
    }

    fixMino() {
        this.mino.blocks.forEach(block => {
            block.x += this.mino.x;
            block.y += this.mino.y;
            this.field.blocks.push(block);
        });
    }

    popMino() {
        this.mino = this.nextMinos.shift();
        this.mino.spawn();
        this.nextMinos.push(new Mino());

        if (!this.valid(0, 0)) {
            this.drawAll();
            clearInterval(this.timer);
            alert("ゲームオーバー");
        }
    }

    drawAll() {
        this.mainCtx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        this.field.draw(this.mainCtx);
        this.mino.draw(this.mainCtx);
        
        this.nextCtxs.forEach((ctx, i) => {
            ctx.clearRect(0, 0, NEXT_AREA_SIZE, NEXT_AREA_SIZE);
            this.nextMinos[i].drawNext(ctx);
        });
        
        this.holdCtx.clearRect(0, 0, HOLD_AREA_SIZE, HOLD_AREA_SIZE);
        if (this.holdMino) {
            this.holdMino.drawNext(this.holdCtx);
        }
    }

    valid(moveX, moveY, rot = false) {
        let newBlocks = this.mino.getNewBlocks(moveX, moveY, rot);
        return newBlocks.every(block => 
            block.x >= 0 && block.x < COLS_COUNT &&
            block.y < ROWS_COUNT &&
            !this.field.has(block.x, block.y)
        );
    }

    moveLeft() {
        if (this.valid(-1, 0)) {
            this.mino.x--;
            this.drawAll();
        }
    }

    moveRight() {
        if (this.valid(1, 0)) {
            this.mino.x++;
            this.drawAll();
        }
    }

    moveDown() {
        if (this.valid(0, 1)) {
            this.mino.y++;
            this.drawAll();
        }
    }

    rotate() {
        if (this.valid(0, 0, true)) {
            this.mino.rotate();
            this.drawAll();
        }
    }

    hold() {
        if (!this.canHold) return;
        if (this.holdMino) {
            [this.mino, this.holdMino] = [this.holdMino, this.mino];
            this.mino.spawn();
        } else {
            this.holdMino = this.mino;
            this.popMino();
        }
        this.canHold = false;
        this.drawAll();
    }

    dropToBottom() {
        while (this.valid(0, 1)) {
            this.mino.y++;
        }
        this.update();
    }

    updateScore() {
        document.getElementById("score").innerText = `スコア: ${score}`;
        const newLevel = Math.min(Math.floor(score / LEVEL_UP_SCORE) + 1, MAX_LEVEL);
        if (newLevel > this.level) {
            this.levelUp(newLevel);
        }
    }

    levelUp(newLevel) {
        this.level = newLevel;
        this.updateLevel();
        this.gameSpeed = Math.max(GAME_SPEED - (this.level - 1) * 50, MIN_GAME_SPEED);
        clearInterval(this.timer);
        this.timer = setInterval(() => this.update(), this.gameSpeed);
    }

    updateLevel() {
        document.getElementById("level").innerText = `レベル: ${this.level}`;
    }

    setKeyEvent() {
        window.onkeydown = (e) => {
            switch (e.keyCode) {
                case 37: this.moveLeft(); break;
                case 38: this.rotate(); break;
                case 39: this.moveRight(); break;
                case 40: this.moveDown(); break;
                case 32: this.hold(); break;
                case 16: this.dropToBottom(); break;
            }
        };

        document.getElementById("left-btn").onclick = () => this.moveLeft();
        document.getElementById("right-btn").onclick = () => this.moveRight();
        document.getElementById("down-btn").onclick = () => this.moveDown();
        document.getElementById("rotate-btn").onclick = () => this.rotate();
        document.getElementById("hold-btn").onclick = () => this.hold();
        document.getElementById("drop-btn").onclick = () => this.dropToBottom();
    }
}

// フィールドクラス
class Field {
    constructor() {
        this.blocks = [];
    }

    draw(ctx) {
        this.blocks.forEach(block => block.draw(0, 0, ctx));
    }

    checkLine() {
        let linesCleared = 0;
        for (let y = ROWS_COUNT - 1; y >= 0; y--) {
            if (this.isLineFull(y)) {
                this.removeLine(y);
                y++;
                linesCleared++;
            }
        }
        if (linesCleared > 0) {
            score += linesCleared * linesCleared * 10;
            game.updateScore();
        }
    }

    isLineFull(y) {
        return this.blocks.filter(block => block.y === y).length === COLS_COUNT;
    }

    removeLine(y) {
        this.blocks = this.blocks.filter(block => block.y !== y);
        this.blocks.forEach(block => {
            if (block.y < y) {
                block.y++;
            }
        });
    }

    has(x, y) {
        return this.blocks.some(block => block.x === x && block.y === y);
    }
}

// ブロッククラス
class Block {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.image = Asset.blockImages[type];
    }

    draw(offsetX, offsetY, ctx) {
        ctx.drawImage(
            this.image,
            (this.x + offsetX) * BLOCK_SIZE,
            (this.y + offsetY) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
        );
    }

    drawNext(ctx) {
        let offsetX, offsetY;
        switch (this.type) {
            case 0: offsetX = 0.5; offsetY = 1; break;
            case 1: offsetX = 1; offsetY = 1; break;
            case 2: case 3: case 4: offsetX = 1; offsetY = 0.5; break;
            case 5: case 6: offsetX = 0.5; offsetY = 0.5; break;
        }

        ctx.drawImage(
            this.image,
            (this.x + offsetX) * BLOCK_SIZE,
            (this.y + offsetY) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
        );
    }
}

// ミノクラス
class Mino {
    constructor() {
        this.type = Math.floor(Math.random() * 7);
        this.initBlocks();
    }

    initBlocks() {
        let t = this.type;
        switch (t) {
            case 0:
                this.blocks = [new Block(0, 2, t), new Block(1, 2, t), new Block(2, 2, t), new Block(3, 2, t)];
                break;
            case 1:
                this.blocks = [new Block(1, 1, t), new Block(2, 1, t), new Block(1, 2, t), new Block(2, 2, t)];
                break;
            case 2:
                this.blocks = [new Block(1, 1, t), new Block(0, 2, t), new Block(1, 2, t), new Block(2, 2, t)];
                break;
            case 3:
                this.blocks = [new Block(1, 1, t), new Block(0, 2, t), new Block(1, 2, t), new Block(2, 2, t)];
                break;
            case 4:
                this.blocks = [new Block(2, 1, t), new Block(0, 2, t), new Block(1, 2, t), new Block(2, 2, t)];
                break;
            case 5:
                this.blocks = [new Block(1, 1, t), new Block(2, 1, t), new Block(0, 2, t), new Block(1, 2, t)];
                break;
            case 6:
                this.blocks = [new Block(0, 1, t), new Block(1, 1, t), new Block(1, 2, t), new Block(2, 2, t)];
                break;
        }
    }

    spawn() {
        this.x = Math.floor(COLS_COUNT / 2) - 2;
        this.y = 0;
    }

    draw(ctx) {
        this.blocks.forEach(block => block.draw(this.x, this.y, ctx));
    }

    drawNext(ctx) {
        this.blocks.forEach(block => block.drawNext(ctx));
    }

    rotate() {
        this.blocks.forEach(block => {
            let x = block.x;
            block.x = -block.y;
            block.y = x;
        });
    }

    getNewBlocks(moveX, moveY, rot = false) {
        let newBlocks = JSON.parse(JSON.stringify(this.blocks));
        if (rot) {
            newBlocks.forEach(block => {
                let x = block.x;
                block.x = -block.y;
                block.y = x;
            });
        }
        newBlocks.forEach(block => {
            block.x += this.x + moveX;
            block.y += this.y + moveY;
        });
        return newBlocks;
    }
}

window.onload = function(){
    Asset.init();
    game = new Game();
    document.getElementById(SATRT_BTN_ID).onclick = function(){
        game.start();
        this.blur();
    };
};
class OpenLevel extends BaseLevel {
    constructor() {
        let levelConfig = {
            mapKey: 'openLevel-map',
            width: 90,
            height: 140
        };
        let pickupConfig = {
            WallJumpPickup: {
                function: () => {this.my.sprite.player.hasWallJump = true;},
                displayText: "Wall Jump"
            },
            ColorSwapPickup: {
                function: () => {this.my.sprite.player.hasColorSwap = true;},
                displayText: "Color Swap"
            },
            DashPickup: {
                function: () => {this.my.sprite.player.hasDash = true;},
                displayText: "Dash"
            },
            Key1: {function: () => {this.my.sprite.player.keys++;}},
            Key2: {function: () => {this.my.sprite.player.keys++;}},
            Key3: {function: () => {this.my.sprite.player.keys++;}}
        }
        super('openLevel', levelConfig, pickupConfig);
    }

    create() {
        super.create();

        super.swapTerrainColor(false);

        // this.my.sprite.player.hasDash = true;
        // this.my.sprite.player.hasColorSwap = true;
        // this.my.sprite.player.hasWallJump = true;
        // this.my.sprite.player.keys = 3;

        // Remove camera follow, we control scroll in update
        this.cameras.main.stopFollow();

        // ----------------------------------------------
        // ---------------- Coin Door -------------------
        // ----------------------------------------------
        
        // get the coin door price
        let coinLockObject = this.my.map.findObject('Objects', (obj) => obj.name === 'CoinLock');
        let coinDoorPrice = null;
        for (let prop of coinLockObject.properties) {
            if (prop.name === 'coinPrice') {
                coinDoorPrice = prop.value;
            }
        }

        let coinUnlockCondition = () => {
            return this.my.sprite.player.coins >= coinDoorPrice;
        }
        this.coinDoor = new Door(this, 'Coin Door', 'CoinLock', coinUnlockCondition, coinDoorPrice);

        // ----------------------------------------------
        // ----------------- Key Door -------------------
        // ----------------------------------------------

        let keyUnlockCondition = () => {
            if (this.my.sprite.player.keys > 0) {
                this.my.sprite.player.keys--;
                return true;
            }
            return false;
        }
        this.keyDoor = new Door(this, 'Key Door', 'KeyLock', keyUnlockCondition);

        this.saveCheckpoint(this.saveState.checkpoint); // resave with doors

        // ----------------------------------------------
        // ------------------ Godrays -------------------
        // ----------------------------------------------

        this.godrays = this.my.map.filterObjects('Objects', (obj) => obj.name === 'Godray');
        let points = this.godrays[0].polygon;
        this.graphics = this.add.graphics({
            x: this.godrays[0].x,
            y: this.godrays[0].y,
            fillStyle: {
                color: 0xFFFFFF,
                alpha: 0.2
            }
        });
        this.graphics.fillPoints(points, true);
    }

    saveCheckpoint(checkpoint, makeSound = false) {
        super.saveCheckpoint(checkpoint, makeSound);
        if (this.coinDoor) {
            this.saveState.coinDoorState = this.coinDoor.doorState;
        }
        if (this.keyDoor) {
            this.saveState.keyDoorState = this.keyDoor.doorState;
        }
    }

    loadLastCheckpoint() {
        // if the player dies before reaching a checkpoint, reset firstColorSwap tracker
        // if (this.saveState.checkpoint.type !== "Sprite") {
        //     this.firstColorSwapDone = false;
        // }

        super.loadLastCheckpoint();
        if (this.saveState.coinDoorState) {
            this.coinDoor.doorState = this.saveState.coinDoorState;
        }
        if (this.saveState.keyDoorState) {
            this.keyDoor.doorState = this.saveState.keyDoorState;
        }
    }

    update(time, delta) {
        super.update(time, delta);

        // set camera scroll
        let screenWidth = game.config.width;
        let cameraX = screenWidth * Math.floor(this.my.sprite.player.x / screenWidth);
        let screenHeight = game.config.height;
        let cameraY = screenHeight * Math.floor(this.my.sprite.player.y / screenHeight);
        this.cameras.main.setScroll(cameraX, cameraY);
    }
}
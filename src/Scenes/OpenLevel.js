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

        this.my.sprite.player.hasWallJump = false;
        this.my.sprite.player.hasColorSwap = false;
        this.my.sprite.player.hasDash = false;

        // first color swap at the beginning of the game that removes the yellow platform and drops you down
        // after this first color swap, you can't swap colors until you unlock the ability
        this.firstColorSwapDone = false;
        this.input.keyboard.on('keydown', (event) => {
            if (this.my.sprite.player.hasColorSwap) {
                // this is only ever true while debugging
                this.firstColorSwapDone = true;
            }
            if (!this.firstColorSwapDone && (event.key == 'c')) {
                this.swapTerrainColor();
                this.firstColorSwapDone = true;
            }
        });

        // Remove camera follow, we control scroll in update
        this.cameras.main.stopFollow();

        // ----------------------------------------------
        // ---------------- Coin Door -------------------
        // ----------------------------------------------
        
        // create coin door
        let coinDoorLayer = this.my.map.createLayer('Coin Door', this.my.tileset, 0, 0);
        
        // coin door lock
        let coinLock = this.my.map.createFromObjects('Objects', {name: 'CoinLock'}, true)[0];
        let coinDoorPrice = coinLock.data.get('price');
        
        // coin door lock text
        let coinLockText = this.add.bitmapText(coinLock.x - 36, coinLock.y - 21, 'mini-square-mono', coinDoorPrice)
            .setFontSize(16)
            .setLetterSpacing(0);

        let coinLocks = [{
            lockSprite: coinLock,
            lockText: coinLockText,
            condition: () => {return this.my.sprite.player.coins >= coinDoorPrice;}
        }]
        this.coinDoor = new Door(this, this.my.sprite.player, coinDoorLayer, coinLocks);

        // ----------------------------------------------
        // ----------------- Key Door -------------------
        // ----------------------------------------------

        // key door
        let keyDoorLayer = this.my.map.createLayer('Key Door', this.my.tileset, 0, 0);

        // key locks
        let keyLockSprites = this.my.map.createFromObjects('Objects', {name: 'KeyLock'}, true);

        let keyLockCondition = () => {
            if (this.my.sprite.player.keys > 0) {
                this.my.sprite.player.keys--;
                return true;
            }
            return false;
        }
        let keyLocks = [
            {lockSprite: keyLockSprites[0], condition: keyLockCondition},
            {lockSprite: keyLockSprites[1], condition: keyLockCondition},
            {lockSprite: keyLockSprites[2], condition: keyLockCondition}
        ]

        this.keyDoor = new Door(this, this.my.sprite.player, keyDoorLayer, keyLocks);

        this.saveCheckpoint(this.saveState.checkpoint); // resave with doors
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
        if (this.saveState.checkpoint.type !== "Sprite") {
            this.firstColorSwapDone = false;
        }

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
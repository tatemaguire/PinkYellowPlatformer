class OpenLevel extends BaseLevel {
    constructor() {
        let levelConfig = {
            mapKey: 'openLevel-map',
            width: 90,
            height: 140
        };
        super('openLevel', levelConfig);
    }

    create() {
        super.create();

        PLAYER_ABILITIES.WALL_JUMP = false;
        PLAYER_ABILITIES.COLOR_SWAP = false;
        PLAYER_ABILITIES.DASH = false;

        // first color swap at the beginning of the game that removes the yellow platform and drops you down
        // after this first color swap, you can't swap colors until you unlock the ability
        this.firstColorSwapDone = false;
        this.input.keyboard.on('keydown', (event) => {
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
        this.my.coinDoorLayer = this.my.map.createLayer('Coin Door', this.my.tileset, 0, 0);
        this.my.coinDoorLayer.setCollisionByProperty({collides: true});
        this.my.collider.playerCoinDoor = this.physics.add.collider(this.my.sprite.player, this.my.coinDoorLayer);

        // coin door lock
        this.my.sprite.coinLock = this.my.map.createFromObjects('Objects', {name: 'CoinLock'}, true)[0];
        let coinDoorPrice = this.my.sprite.coinLock.data.get('price');

        // coin door trig
        let trigRect = this.my.map.findObject('Objects', (obj) => obj.name == 'CoinDoorTrig');
        this.my.coinDoorTrigBody = this.physics.add.staticBody(trigRect.x, trigRect.y, trigRect.width, trigRect.height);
        let coinDoorTrigOverlapProcess = () => {
            if (PLAYER_STATS.COINS >= coinDoorPrice) {
                this.my.sprite.coinLock.destroy();
                this.my.coinDoorLayer.setVisible(false);
                this.my.collider.playerCoinDoor.active = false;
                this.my.collider.coinDoorTrigOverlap.active = false;
            }
        }
        this.my.collider.coinDoorTrigOverlap = this.physics.add.overlap(this.my.sprite.player, this.my.coinDoorTrigBody, coinDoorTrigOverlapProcess);

        // ----------------------------------------------
        // ----------------- Key Door -------------------
        // ----------------------------------------------

        // key door
        this.my.keyDoorLayer = this.my.map.createLayer('Key Door', this.my.tileset, 0, 0);
        this.my.keyDoorLayer.setCollisionByProperty({collides: true});
        this.my.collider.playerKeyDoor = this.physics.add.collider(this.my.sprite.player, this.my.keyDoorLayer);

        // key locks
        this.my.sprite.keyLock1 = this.my.map.createFromObjects('Objects', {name: 'KeyLock1'}, true)[0];
        this.my.sprite.keyLock2 = this.my.map.createFromObjects('Objects', {name: 'KeyLock2'}, true)[0];
        this.my.sprite.keyLock3 = this.my.map.createFromObjects('Objects', {name: 'KeyLock3'}, true)[0];

        // key door trig
        trigRect = this.my.map.findObject('Objects', (obj) => obj.name == 'KeyDoorTrig');
        this.my.keyDoorTrigBody = this.physics.add.staticBody(trigRect.x, trigRect.y, trigRect.width, trigRect.height);
        let keyDoorTrigOverlapProcess = () => {
            if (PLAYER_STATS.KEYS >= 1) {
                this.my.sprite.keyLock1.destroy();
            }
            if (PLAYER_STATS.KEYS >= 2) {
                this.my.sprite.keyLock2.destroy();
            }
            if (PLAYER_STATS.KEYS >= 3) {
                this.my.sprite.keyLock3.destroy();
                this.my.keyDoorLayer.setVisible(false);
                this.my.collider.playerKeyDoor.active = false;
                this.my.collider.keyDoorTrigOverlap.active = false;
            }
        }
        this.my.collider.keyDoorTrigOverlap = this.physics.add.overlap(this.my.sprite.player, this.my.keyDoorTrigBody, keyDoorTrigOverlapProcess);

        // ----------------------------------------------
        // ------------------ Pickups -------------------
        // ----------------------------------------------

        let pickupFunctions = {
            WallJumpPickup: () => {PLAYER_ABILITIES.WALL_JUMP = true;},
            ColorSwapPickup: () => {PLAYER_ABILITIES.COLOR_SWAP = true;},
            DashPickup: () => {PLAYER_ABILITIES.DASH = true;},
            Key1: () => {PLAYER_STATS.KEYS++;},
            Key2: () => {PLAYER_STATS.KEYS++;},
            Key3: () => {PLAYER_STATS.KEYS++;}
        }

        this.my.pickups = [];
        for (let pickupName in pickupFunctions) {
            let pickup = this.my.map.createFromObjects('Objects', {name: pickupName}, true)[0];
            this.physics.add.existing(pickup, 1);
            let callback = () => {
                pickupFunctions[pickupName]();
                pickup.destroy();
            }
            this.physics.add.overlap(this.my.sprite.player, pickup, callback);
            this.my.pickups.push(pickup);
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
class BaseLevel extends Phaser.Scene {
    constructor(sceneName = 'BaseLevel', levelConfig = {}) {
        super(sceneName);
        this.levelConfig = levelConfig;
    }

    init() {
        this.my = {};
        this.my.sprite = {};
        this.my.collider = {};
        this.my.score = 0;

        this.sound.stopAll();
    }
    
    create() {
        // set up physics
        this.physics.world.gravity.y = 500;
        this.physics.world.TILE_BIAS = 8;
        this.physics.world.setBounds(0, 0, this.levelConfig.width*8, this.levelConfig.height*8);

        // create keybinds
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

        // make map layers
        this.my.map = this.add.tilemap(this.levelConfig.mapKey, 8, 8, this.levelConfig.width, this.levelConfig.height);
        this.my.tileset = this.my.map.addTilesetImage('Pico-8-Platformer', 'pico-8-platformer', 8, 8);
        this.my.skyLayer = this.my.map.createLayer('Sky', this.my.tileset, 0, 0)
            .setScrollFactor(0.8);
        this.my.wallLayer = this.my.map.createLayer('Wall', this.my.tileset, 0, 0);
        this.my.wallDetailsLayer = this.my.map.createLayer('Wall Details', this.my.tileset, 0, 0);
        this.my.terrainLayer = this.my.map.createLayer('Terrain', this.my.tileset, 0, 0);

        // ----------------------------------------------
        // ------------------ Player --------------------
        // ----------------------------------------------

        // create player
        this.my.playerSpawn = this.my.map.findObject('Objects', (obj) => obj.name == 'PlayerSpawn');
        this.my.sprite.player = new Player(this, this.my.playerSpawn.x+4, this.my.playerSpawn.y+4, this.leftKey, this.rightKey, this.zKey);
        
        // set up camera
        this.cameras.main.startFollow(this.my.sprite.player, true, 0.15, 0.10, 0, 16);
        this.cameras.main.setBounds(0, 0, this.levelConfig.width*8, this.levelConfig.height*8);
        this.cameras.main.setRoundPixels(true);

        // ----------------------------------------------
        // ------------- Terrain Collision --------------
        // ----------------------------------------------

        // set collision for terrain tiles
        this.my.terrainLayer.forEachTile((tile) => {
            if (tile.properties.collides || tile.properties.collidesYellowOnly) {
                tile.setCollision(true, true, true, true);
            }
            if (tile.properties.collidesPinkOnly) tile.setAlpha(0);
        });

        // create player/terrain collider
        let playerTileCollide = (player, tile) => {
            if (tile.properties.deadly) {
                this.my.sprite.player.kill();
            }
            this.my.sprite.player.floorSoundsGrassy = Boolean(tile.properties.soundsGrassy);
            this.my.sprite.player.floorEmitsStone = Boolean(tile.properties.emitsStoneParticles);
        }
        let playerTileProcessCollide = (player, tile) => {
            if (tile.properties.oneway) {
                let playerFeetY = player.y + player.displayWidth/2;
                return playerFeetY <= tile.pixelY;
            }
            return true;
        }
        this.my.collider.playerTerrain = this.physics.add.collider(this.my.sprite.player, this.my.terrainLayer, playerTileCollide, playerTileProcessCollide);

        // ----------------------------------------------
        // ------------------ Coins ---------------------
        // ----------------------------------------------

        // create coins
        this.my.coins = this.my.terrainLayer.createFromTiles(89, -1);
        for (let coin of this.my.coins) {
            coin.setTexture('pico-8-platformer', 88);
            coin.x += 4;
            coin.y += 4;
            this.physics.add.existing(coin, 1);
            coin.body.setSize(4, 4);
        }
        this.anims.play('coin', this.my.coins);

        console.log(this.my.coins.length);

        // create coin collision
        let playerCoinCollide = (player, coin) => {
            PLAYER_STATS.COINS++;
            this.my.coinText.setText(('00' + PLAYER_STATS.COINS).slice(-2));
            this.sound.play('get-coin');
            coin.destroy();
        }
        this.my.collider.playerCoin = this.physics.add.overlap(this.my.sprite.player, this.my.coins, playerCoinCollide);

        // ----------------------------------------------
        // ---------- Leaf Particle Emitters ------------
        // ----------------------------------------------

        // create leaf particles emit zone
        let leafParticleZone = this.cameras.main.getBounds();
        // adjust leaf particle zone so that leaves can spawn off screen to the left
        // this means that even though they can float down at up to a 45 degree angle,
        // they will still fill out the lower left corner of the map
        leafParticleZone.x -= leafParticleZone.height;
        leafParticleZone.width += leafParticleZone.height;

        // create leaf particles
        let leafCount = (leafParticleZone.width * leafParticleZone.height) / 1280; // 1 leaf per 1280 pixels
        let leafConfig = {
            frame: 'Yellow-Leaf0',
            speedX: {min: 0, max: 10},
            speedY: 10,
            lifespan: (leafParticleZone.height / 10) * 1000, //  height / speedY then convert to milliseconds
            rotate: [0, 0, 0, 0, 0, 0, 90],
            maxAliveParticles: leafCount,
            quantity: leafCount,
            emitZone: {
                type: 'random',
                source: leafParticleZone
            },
            deathZone: {
                type: 'onLeave',
                source: leafParticleZone
            }
        }
        this.yellowLeafEmitter = this.add.particles(0, 0, 'particles', leafConfig);
        this.pinkLeafEmitter = this.add.particles(0, 0, 'particles', leafConfig)
            .setEmitterFrame('Pink-Leaf0')
            .setVisible(false);

        // fill the screen with particles before changing emit zone
        this.yellowLeafEmitter.explode(leafCount)
        this.yellowLeafEmitter.setFrequency(100);
        this.pinkLeafEmitter.explode(leafCount)
        this.pinkLeafEmitter.setFrequency(100);

        // change emit zone to spawn just at the top of the screen
        let topEdgeZone = {
            type: 'random',
            source: leafParticleZone.getLineA()
        };
        this.yellowLeafEmitter.clearEmitZones().addEmitZone(topEdgeZone);
        this.pinkLeafEmitter.clearEmitZones().addEmitZone(topEdgeZone);

        // ----------------------------------------------
        // --------------- Text Objects -----------------
        // ----------------------------------------------
        
        // create coin count text
        this.my.coinText = this.add.bitmapText(4, -2, 'mini-square-mono', '00')
            .setFontSize(16)
            .setLetterSpacing(0)
            .setScrollFactor(0);
        
        // create game win text
        this.my.winText = this.add.bitmapText(game.config.width/2, game.config.height/2-8, 'mini-square-mono', 'LEVEL COMPLETE')
            .setFontSize(32)
            .setLetterSpacing(0)
            .setScrollFactor(0)
            .setMaxWidth(game.config.width)
            .setOrigin(0.5, 0.5)
            .setCenterAlign()
            .setVisible(false);
        
        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);
        this.physics.world.drawDebug = false;

        // ----------------------------------------------
        // ------------------ Pickups -------------------
        // ----------------------------------------------

        let pickupParticleConfig = {
            frame: 'Yellow-Leaf0',
            rotate: [0, 90],
            speed: {min: 20, max: 60},
            lifespan: {min: 200, max: 400},
            gravityY: 80,
            quantity: 15
        };
        this.my.pickupParticles = this.add.particles(0, 0, 'particles', pickupParticleConfig);
        this.my.pickupParticles.stop();

        let pickupFunctions = {
            WallJumpPickup: () => {PLAYER_ABILITIES.WALL_JUMP = true;},
            ColorSwapPickup: () => {PLAYER_ABILITIES.COLOR_SWAP = true;},
            DashPickup: () => {PLAYER_ABILITIES.DASH = true;},
            Key1: () => {PLAYER_ABILITIES.KEYS++;},
            Key2: () => {PLAYER_ABILITIES.KEYS++;},
            Key3: () => {PLAYER_ABILITIES.KEYS++;}
        }

        this.my.pickups = [];
        for (let pickupName in pickupFunctions) {
            let pickup = this.my.map.createFromObjects('Objects', {name: pickupName}, true)[0];
            this.physics.add.existing(pickup, 1);
            let callback = () => {
                if (!pickup.active) return;
                pickup.active = false;
                pickup.visible = false;

                pickupFunctions[pickupName]();
                this.my.pickupParticles.x = pickup.x;
                this.my.pickupParticles.y = pickup.y;
                this.my.pickupParticles.explode();
            }
            this.physics.add.overlap(this.my.sprite.player, pickup, callback);
            this.my.pickups.push(pickup);
        }

        // ----------------------------------------------
        // ---------------- Checkpoints -----------------
        // ----------------------------------------------

        this.my.checkpointAbilityProgress = {};
        this.saveCheckpoint(this.my.playerSpawn);

        this.my.checkpoints = this.my.terrainLayer.createFromTiles(74, -1);
        for (let flag of this.my.checkpoints) {
            flag.setTexture('pico-8-platformer', 74); // set to plain flagpole
            flag.setPosition(flag.x + 4, flag.y + 4);
            this.physics.add.existing(flag, 1);
            let callback = () => {
                this.saveCheckpoint(flag);
            }
            this.physics.add.overlap(this.my.sprite.player, flag, callback);
        }
    }

    saveCheckpoint(checkpoint) {
        if (this.my.currentCheckpoint && this.my.currentCheckpoint.type === "Sprite") {
            this.my.currentCheckpoint.setFrame(74); // set to plain flagpole
        }
        if (checkpoint.type === "Sprite") {
            checkpoint.setFrame(73);
        }
        this.my.currentCheckpoint = checkpoint;
        Object.assign(this.my.checkpointAbilityProgress, PLAYER_ABILITIES);
        this.my.checkpointPickupProgress = [];
        for (let pickup of this.my.pickups) {
            this.my.checkpointPickupProgress.push(pickup.active);
        }
    }

    // teleports player to last checkpoint, and resets ability and key pickup progress
    loadLastCheckpoint() {
        if (PLAYER_ABILITIES.WORLD_IS_YELLOW != this.my.checkpointAbilityProgress.WORLD_IS_YELLOW) {
            this.swapTerrainColor();
        }
        Object.assign(PLAYER_ABILITIES, this.my.checkpointAbilityProgress);
        // reactivate ability pickups
        let i = 0;
        for (let pickup of this.my.pickups) {
            pickup.active = this.my.checkpointPickupProgress[i];
            pickup.visible = this.my.checkpointPickupProgress[i];
            i++;
        }
        this.my.sprite.player.setPosition(this.my.currentCheckpoint.x, this.my.currentCheckpoint.y);
    }
    
    restartLevel() {
        this.scene.start(this.scene.key);
    }
    
    finishLevel() {
        this.my.winText.setVisible(true);
        this.physics.pause();
        this.input.keyboard.on('keydown', (event) => {
            if (event.key === 'z') this.restartLevel();
        });
    }
    
    _swapTileToYellow(tile) {
        if (tile.properties.yellowVisual) {
            tile.index -= Number(tile.properties.indexModifier);
        }
        if (tile.properties.collidesYellowOnly) {
            tile.setCollision(true, true, true, true);
            tile.setAlpha(1);
        }
        if (tile.properties.collidesPinkOnly) {
            tile.setCollision(false, false, false, false);
            tile.setAlpha(0);
        }
    }
    
    _swapTileToPink(tile) {
        // swap terrain visual
        if (tile.properties.yellowVisual) {
            tile.index += Number(tile.properties.indexModifier);
        }
        if (tile.properties.collidesYellowOnly) {
            tile.setCollision(false, false, false, false);
            tile.setAlpha(0);
        }
        if (tile.properties.collidesPinkOnly) {
            tile.setCollision(true, true, true, true);
            tile.setAlpha(1);
        }
    }
    
    swapTerrainColor() {
        let detune = Math.random()*200 - 100;
        this.sound.play('swap-color', {detune: detune});
        
        if (PLAYER_ABILITIES.WORLD_IS_YELLOW) {
            this.my.terrainLayer.forEachTile(this._swapTileToPink);
            this.yellowLeafEmitter.visible = false;
            this.pinkLeafEmitter.visible = true;
            PLAYER_ABILITIES.WORLD_IS_YELLOW = false;
        }
        else {
            this.my.terrainLayer.forEachTile(this._swapTileToYellow);
            this.yellowLeafEmitter.visible = true;
            this.pinkLeafEmitter.visible = false;
            PLAYER_ABILITIES.WORLD_IS_YELLOW = true;
        }
    }
    
    update(time, delta) {
        this.my.sprite.player.update(time, delta);

        // swap colors when player presses X/C
        if (PLAYER_ABILITIES.COLOR_SWAP && Phaser.Input.Keyboard.JustDown(this.cKey)) {
            this.swapTerrainColor();
        }
    }
}
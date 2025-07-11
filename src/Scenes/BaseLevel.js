class BaseLevel extends Phaser.Scene {
    constructor(sceneName = 'BaseLevel', levelConfig = {}, pickupConfig = {}) {
        super(sceneName);
        this.levelConfig = levelConfig;
        this.pickupConfig = pickupConfig;
    }

    init() {
        this.my = {};
        this.my.sprite = {};
        this.my.collider = {};
        this.saveState = {};

        this.sound.stopAll();
    }
    
    create() {
        // track world color
        this.worldIsYellow = true;

        // set up physics
        this.physics.world.gravity.y = 500;
        this.physics.world.TILE_BIAS = 8;
        this.physics.world.setBounds(0, 0, this.levelConfig.width*8, this.levelConfig.height*8);

        // create keybinds
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

        // create false unused keybinds to stop the page from scrolling unexpectedly
        this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // make map layers
        this.my.map = this.add.tilemap(this.levelConfig.mapKey, 8, 8, this.levelConfig.width, this.levelConfig.height);
        this.my.tileset = this.my.map.addTilesetImage('Pico-8-Platformer', 'pico-8-platformer', 8, 8);
        this.my.skyLayer = this.my.map.createLayer('Sky', this.my.tileset, 0, 0)
            .setScrollFactor(0.8);
        this.my.wallLayer = this.my.map.createLayer('Wall', this.my.tileset, 0, 0);
        this.my.wallDetailsLayer = this.my.map.createLayer('Wall Details', this.my.tileset, 0, 0);
        this.my.terrainLayer = this.my.map.createLayer('Terrain', this.my.tileset, 0, 0);

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);
        this.physics.world.drawDebug = false;

        // press R to restart
        this.input.keyboard.on('keydown-R', () => {
            this.restartLevel();
        }, this);

        // ----------------------------------------------
        // ------------------ Player --------------------
        // ----------------------------------------------

        // create player
        this.my.playerSpawn = this.my.map.findObject('Objects', (obj) => obj.name == 'PlayerSpawn');
        this.my.sprite.player = new Player(this, this.my.playerSpawn.x+4, this.my.playerSpawn.y+4, this.leftKey, this.rightKey, this.zKey, this.xKey);
        
        // set up camera
        this.cameras.main.startFollow(this.my.sprite.player, true, 0.15, 0.10, 0, 16);
        this.cameras.main.setBounds(0, 0, this.my.map.widthInPixels, this.my.map.heightInPixels);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor('#5F574F'); // stone color

        // ----------------------------------------------
        // ------------- Terrain Collision --------------
        // ----------------------------------------------

        // set collision for terrain tiles
        this.my.terrainLayer.setCollisionByProperty({collides: true});
        this.my.terrainLayer.setCollisionByProperty({collidesYellowOnly: true});
        this.my.terrainLayer.forEachTile((tile) => {
            if (tile.properties.collidesPinkOnly) tile.setAlpha(0);
            if (tile.properties.invisible) tile.setAlpha(0);
        });

        // create player/terrain collider
        let playerTileCollide = (player, tile) => {
            if (tile.properties.deadly) {
                let kill_player = true
                let dy = player.y + player.displayHeight/2 - tile.pixelY
                // console.log(dy)
                if (dy == 0) {
                    // the tile is directly under the player
                    // so lets check what the player is standing on
                    let Adjacent = this.my.terrainLayer.getTileAtWorldXY(player.x - player.displayWidth/2, player.y + player.displayHeight/2);
                    let Bdjacent = this.my.terrainLayer.getTileAtWorldXY(player.x + player.displayWidth/2, player.y + player.displayHeight/2);
                    // if either tile is not deadly, the player is safe
                    if ((Adjacent && !Adjacent.properties.deadly) || (Bdjacent && !Bdjacent.properties.deadly)) {
                        kill_player = false
                    }
                }

                if (kill_player) {
                    this.my.sprite.player.kill();
                }
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

        // create coin collision
        let playerCoinCollide = (player, coin) => {
            this.my.sprite.player.coins++;
            this.my.coinText.setText(('000' + this.my.sprite.player.coins).slice(-3));
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
        this.my.coinText = this.add.bitmapText(4, -2, 'mini-square-mono', '000')
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

        this.my.pickups = [];
        this.my.pickupTexts = [];
        for (let pickupName in this.pickupConfig) {
            let pickup = this.my.map.createFromObjects('Objects', {name: pickupName}, true)[0];
            this.physics.add.existing(pickup, 1);

            let text = null;
            if (this.pickupConfig[pickupName].displayText) {
                text = this.add.bitmapText(pickup.x, pickup.y-4, 'mini-square-mono', this.pickupConfig[pickupName].displayText)
                    .setFontSize(8)
                    .setLetterSpacing(0)
                    .setOrigin(0.5, 1);
            }
            this.my.pickupTexts.push(text);

            let callback = () => {
                if (!pickup.active) return;
                pickup.active = false;
                pickup.visible = false;
                if (text) text.visible = false;

                this.sound.play('pickup');
                this.pickupConfig[pickupName].function();
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
                this.saveCheckpoint(flag, true);
            }
            this.physics.add.overlap(this.my.sprite.player, flag, callback);
        }

        // ----------------------------------------------
        // --------------- Ambient Sound ----------------
        // ----------------------------------------------

        this.my.ambience = this.sound.add('summerBreezeAmbience', {volume: 0.5, loop: true});
        this.my.ambience.play();
    }

    saveCheckpoint(checkpoint, makeSound = false) {
        if (checkpoint === this.saveState.checkpoint) {
            makeSound = false;
        }
        if (makeSound) {
            this.sound.play('checkpoint', {volume: 0.5});
        }

        // change checkpoint sprites
        if (this.saveState.checkpoint && this.saveState.checkpoint.type === "Sprite") {
            this.saveState.checkpoint.setFrame(74); // set to plain flagpole
        }
        if (checkpoint.type === "Sprite") {
            checkpoint.setFrame(73); // raise flag on new checkpoint
        }

        // save new checkpoint
        this.saveState.checkpoint = checkpoint;
        this.saveState.worldIsYellow = this.worldIsYellow;
        this.saveState.playerState = this.my.sprite.player.playerState;

        this.my.checkpointPickupProgress = [];
        for (let pickup of this.my.pickups) {
            this.my.checkpointPickupProgress.push(pickup.active);
        }
    }

    // teleports player to last checkpoint, and resets ability and key pickup progress
    loadLastCheckpoint() {
        if (this.worldIsYellow != this.saveState.worldIsYellow) {
            this.swapTerrainColor(false);
        }

        // reactivate ability pickups
        let i = 0;
        for (let pickup of this.my.pickups) {
            let wasActive = this.my.checkpointPickupProgress[i];
            pickup.active = wasActive;
            pickup.visible = wasActive;
            if (this.my.pickupTexts[i]) {
                this.my.pickupTexts[i].visible = wasActive;
            }
            i++;
        }

        this.my.sprite.player.playerState = this.saveState.playerState;
        this.my.sprite.player.setPosition(this.saveState.checkpoint.x, this.saveState.checkpoint.y);
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
    
    swapTerrainColor(makeSound = true) {
        if (makeSound) {
            let detune = Math.random()*200 - 100;
            this.sound.play('swap-color', {detune: detune});
        }
        
        if (this.worldIsYellow) {
            this.my.terrainLayer.forEachTile(this._swapTileToPink);
            this.yellowLeafEmitter.visible = false;
            this.pinkLeafEmitter.visible = true;
            this.worldIsYellow = false;
        }
        else {
            this.my.terrainLayer.forEachTile(this._swapTileToYellow);
            this.yellowLeafEmitter.visible = true;
            this.pinkLeafEmitter.visible = false;
            this.worldIsYellow = true;
        }
    }
    
    update(time, delta) {
        this.my.sprite.player.update(time, delta);

        // swap colors when player presses X/C
        if (this.my.sprite.player.hasColorSwap && Phaser.Input.Keyboard.JustDown(this.cKey)) {
            this.swapTerrainColor();
        }
    }
}
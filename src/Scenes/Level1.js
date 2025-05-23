class Level1 extends Phaser.Scene {
    constructor() {
        super('level1');
    }

    init() {
        this.my = {};
        this.my.sprite = {};
        this.my.collider = {};
        this.my.score = 0;
        this.isYellow = true;

        this.sound.stopAll();
    }

    create() {
        this.physics.world.gravity.y = 500;
        this.physics.world.TIAL_BIAS = 32;

        // create keys
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

        // make map layers
        this.my.map = this.add.tilemap('level1-map', 8, 8, 90, 20);
        this.my.tileset = this.my.map.addTilesetImage('Pico-8-Platformer', 'pico-8-platformer', 8, 8, 2, 4);
        this.my.skyLayer = this.my.map.createLayer('Sky', this.my.tileset, 0, 0).setScrollFactor(0.8);
        this.my.wallLayer = this.my.map.createLayer('Wall', this.my.tileset, 0, 0);
        this.my.wallDetailsLayer = this.my.map.createLayer('Wall Details', this.my.tileset, 0, 0);
        this.my.terrainLayer = this.my.map.createLayer('Terrain', this.my.tileset, 0, 0);
        this.my.coinLayer = this.my.map.createLayer('Coins', this.my.tileset, 0, 0);

        // set up collision and platforms
        this.my.terrainLayer.forEachTile((tile) => {
            if (tile.properties.collides || tile.properties.collidesYellowOnly) {
                tile.setCollision(true, true, true, true);
            }
            if (tile.properties.collidesPinkOnly) tile.setAlpha(0);
        });

        // set bounds to level size
        this.physics.world.setBounds(0, 0, 90*8, 20*8);

        // create player
        let playerSpawn = this.my.map.findObject('Objects', (obj) => obj.name == 'PlayerSpawn');
        this.my.sprite.player = new Player(this, playerSpawn.x+4, playerSpawn.y+4, this.leftKey, this.rightKey, this.zKey);
        // create player/world colliders
        let playerTileCollide = (player, tile) => {
            if (tile.properties.deadly) {
                this.my.sprite.player.kill();
            }
            this.my.sprite.player.floorSoundsGrassy = Boolean(tile.properties.soundsGrassy);
            this.my.sprite.player.floorEmitsStone = Boolean(tile.properties.emitsStoneParticles);
        }
        this.my.collider.playerTerrain = this.physics.add.collider(this.my.sprite.player, this.my.terrainLayer, playerTileCollide);
        
        // set up camera
        this.cameras.main.startFollow(this.my.sprite.player, true, 0.15, 1);
        this.cameras.main.setBounds(0, 0, 90*8, 20*8);
        this.cameras.main.setRoundPixels(true);

        // create coins
        this.my.coins = this.my.coinLayer.createFromTiles(89, -1);
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
            this.my.score++;
            this.my.coinText.setText(('00' + this.my.score).slice(-2));
            this.sound.play('get-coin');
            coin.destroy();
        }
        this.my.collider.playerCoin = this.physics.add.overlap(this.my.sprite.player, this.my.coins, playerCoinCollide);

        // create leaf particles emit zone
        let leafParticleZone = this.cameras.main.getBounds();
        leafParticleZone.x -= 16;
        leafParticleZone.width += 32;
        // create leaf particles
        let leafCount = (leafParticleZone.width * leafParticleZone.height) / 1280; // 1 leaf per 320 pixels
        let leafConfig = {
            frame: 'Yellow-Leaf0',
            speedX: {min: 0, max: 10},
            speedY: 10,
            lifespan: 20000,
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
    }
    
    restartLevel() {
        this.scene.start('level1');
    }
    
    finishLevel() {
        this.my.winText.setVisible(true);
        this.physics.pause();
        this.input.keyboard.on('keydown', (event) => {
            // console.log(event);
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
        
        if (this.isYellow) {
            this.my.terrainLayer.forEachTile(this._swapTileToPink);
            this.yellowLeafEmitter.visible = false;
            this.pinkLeafEmitter.visible = true;
            this.isYellow = false;
        }
        else {
            this.my.terrainLayer.forEachTile(this._swapTileToYellow);
            this.yellowLeafEmitter.visible = true;
            this.pinkLeafEmitter.visible = false;
            this.isYellow = true;
        }
    }
    
    update(time, delta) {
        this.my.sprite.player.update(time, delta);

        // swap colors when player presses C
        if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
            this.swapTerrainColor();
        }
    }
}
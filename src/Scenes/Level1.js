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
        this.my.sprite.player = new Player(this, 16, 16, this.leftKey, this.rightKey, this.zKey);
        
        // create player/world colliders
        let playerTileCollide = (player, tile) => {
            if (tile.properties.deadly) {
                this.my.sprite.player.kill();
            }
            this.my.sprite.player.onGrass = Boolean(tile.properties.soundsGrassy);
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
        }

        // create coin collision
        let playerCoinCollide = (player, coin) => {
            this.my.score++;
            coin.destroy();
            this.sound.play('get-coin');
            this.my.coinText.setText(('00' + this.my.score).slice(-2));
        }
        this.my.collider.playerCoin = this.physics.add.overlap(this.my.sprite.player, this.my.coins, playerCoinCollide);
        
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
        if (this.isYellow) {
            this.my.terrainLayer.forEachTile(this._swapTileToPink);
            this.isYellow = false;
        }
        else {
            this.my.terrainLayer.forEachTile(this._swapTileToYellow);
            this.isYellow = true;
        }
        // if (this.isYellow) {
        //     // swap terrain visual
        //     for (let yellowIndex of YELLOW_INDICES) {
        //         this.my.terrainLayer.replaceByIndex(yellowIndex, yellowIndex+7);
        //     }
        //     // swap platform collision
        //     this.my.terrainLayer.setCollision(YELLOW_PLATFORM_INDEX, false);
        //     this.my.terrainLayer.setCollision(PINK_PLATFORM_INDEX, true);

        //     this.isYellow = false;
        // }
        // else {
        //     // swap terrain visual
        //     for (let yellowIndex of YELLOW_INDICES) {
        //         this.my.terrainLayer.replaceByIndex(yellowIndex+7, yellowIndex);
        //     }
        //     // swap platform collision
        //     this.my.terrainLayer.setCollision(YELLOW_PLATFORM_INDEX, true);
        //     this.my.terrainLayer.setCollision(PINK_PLATFORM_INDEX, false);

        //     this.isYellow = true;
        // }
    }
    
    update(time, delta) {
        this.my.sprite.player.update(time, delta);

        // swap colors when player presses C
        if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
            let detune = Math.random()*200 - 100;
            this.sound.play('swap-color', {detune: detune});
            this.swapTerrainColor();
            // this.my.map.replaceByIndex(35, 42, undefined, undefined, undefined, undefined, this.my.terrainLayer);
            // if (this.my.yellowLayer.visible) {
            //     this.my.yellowLayer.visible = false;
            //     this.my.pinkLayer.visible = true;
            //     this.my.collider.playerYellow.active = false;
            //     this.my.collider.playerPink.active = true;
            // }
            // else {
            //     this.my.yellowLayer.visible = true;
            //     this.my.pinkLayer.visible = false;
            //     this.my.collider.playerYellow.active = true;
            //     this.my.collider.playerPink.active = false;
            // }
        }
    }
}
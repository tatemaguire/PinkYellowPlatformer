class Door {
    constructor(scene, doorLayerName, lockName, unlockCondition, lockText = null) {
        this.scene = scene;
        this.playerSprite = this.scene.my.sprite.player;
        
        // Set up doorLayer and collider
        this.doorLayer = this.scene.my.map.createLayer(doorLayerName, this.scene.my.tileset, 0, 0);
        this.doorLayer.setCollisionByProperty({collides: true});
        this.playerDoorCollider = this.scene.physics.add.collider(this.playerSprite, this.doorLayer);

        // create lock objects
        let lockSprites = this.scene.my.map.createFromObjects('Objects', {name: lockName}, true);
        this.locks = [];
        for (let sprite of lockSprites) {
            let lock = {lockSprite: sprite, condition: unlockCondition};
            
            this.locks.push(lock);
        }

        // create text label if that parameter is given
        this.lockText = null;
        if (lockText) {
                let lockTextObject = this.scene.add.bitmapText(lockSprites[0].x - 36, lockSprites[0].y - 21, 'mini-square-mono', lockText)
                    .setFontSize(16)
                    .setLetterSpacing(0);
                this.lockText = lockTextObject;
            }

        // Set up lock overlap colliders and states
        this.lockOverlaps = [];
        this.lockStates = [];

        for (let lock of this.locks) {
            this.lockStates.push(lock.lockSprite.active);
            this.scene.physics.add.existing(lock.lockSprite, 1);
            let callback = () => {
                if (unlockCondition()) {
                    // If condition is met, change lock state and update
                    let index = this.locks.indexOf(lock);
                    this.lockStates[index] = false;
                    this._updateState();
                    this.scene.sound.play('unlock', {volume: 1});
                }
            }
            let overlap = this.scene.physics.add.overlap(this.playerSprite, lock.lockSprite, callback);
            this.lockOverlaps.push(overlap);
        }
    }

    get doorState() {
        return this.lockStates.slice(); // return a copy
    }

    set doorState(state) {
        this.lockStates = state.slice(); // store a copy
        this._updateState();
    }

    // updates lock and door visibilities based on this.lockStates
    _updateState() {
        let doorActive = false;

        let lockIndex = 0;
        for (let lock of this.locks) {
            let lockActive = this.lockStates[lockIndex];
            lock.lockSprite.visible = lockActive;
            lock.lockSprite.active = lockActive;
            if (lock.lockText) lock.lockText.visible = lockActive;
            this.lockOverlaps[lockIndex].active = lockActive;
            
            if (lockActive) doorActive = true;
            lockIndex++;
        }

        // If any locks are active, the door is active
        this.doorLayer.visible = doorActive;
        this.playerDoorCollider.active = doorActive;
        if (this.lockText) this.lockText.visible = doorActive;
    }
}
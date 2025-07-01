class Door {
    constructor(scene, playerSprite, doorLayer, locks) {
        this.scene = scene;
        this.playerSprite = playerSprite;
        this.doorLayer = doorLayer;
        this.locks = locks;

        // Set up doorLayer collider
        this.doorLayer.setCollisionByProperty({collides: true});
        this.playerDoorCollider = this.scene.physics.add.collider(this.playerSprite, this.doorLayer);

        // Set up lock overlap colliders and states
        this.lockOverlaps = [];
        this.lockStates = [];

        for (let lock of this.locks) {
            this.lockStates.push(lock.lockSprite.active);
            this.scene.physics.add.existing(lock.lockSprite, 1);
            let callback = () => {
                if (lock.condition()) {
                    // If condition is met, change lock state and update
                    let index = this.locks.indexOf(lock);
                    this.lockStates[index] = false;
                    this._updateState();
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
    }
}
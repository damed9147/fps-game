import * as THREE from 'three';

export class Player {
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private velocity: THREE.Vector3;
    private moveSpeed: number = 8;
    private jumpForce: number = 10; // Reduced jump height
    private gravity: number = 20; // Reduced gravity
    private moveDirection: THREE.Vector3 = new THREE.Vector3();
    private controls: { [key: string]: boolean } = {};
    private collider: THREE.Box3;
    private playerHeight: number = 2;
    private playerWidth: number = 0.5;
    private yaw: number = 0;
    private pitch: number = 0;
    private mouseSensitivity: number = 0.002;
    private hand: THREE.Group;
    private grounded: boolean = false;
    private initialPositionSet: boolean = false;
    private maxSpeed: number = 15; // Maximum movement speed
    private acceleration: number = 80; // Ground acceleration
    private airAcceleration: number = 20; // Air acceleration

    constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
        this.camera = camera;
        this.scene = scene;
        this.velocity = new THREE.Vector3();
        
        // Start position with a slight offset to prevent immediate ground collision
        this.camera.position.set(0, this.playerHeight + 0.5, 5);
        this.setupControls();
        this.createHand();

        // Create player collider starting exactly at ground level
        this.collider = new THREE.Box3(
            new THREE.Vector3(-this.playerWidth/2, 0, -this.playerWidth/2),
            new THREE.Vector3(this.playerWidth/2, this.playerHeight, this.playerWidth/2)
        );
        this.updateCollider();
    }

    private createHand() {
        this.hand = new THREE.Group();

        const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const armMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.set(0, -0.2, 0);
        
        const handGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);
        const hand = new THREE.Mesh(handGeometry, armMaterial);
        hand.position.set(0, -0.4, 0);

        const fingerGeometry = new THREE.BoxGeometry(0.03, 0.1, 0.03);
        const fingerMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
        
        const fingerPositions = [
            { x: -0.05, y: -0.08 },
            { x: -0.02, y: -0.1 },
            { x: 0.02, y: -0.1 },
            { x: 0.05, y: -0.08 }
        ];

        fingerPositions.forEach(pos => {
            const finger = new THREE.Mesh(fingerGeometry, fingerMaterial);
            finger.position.set(pos.x, pos.y, 0);
            hand.add(finger);
        });

        const thumb = new THREE.Mesh(fingerGeometry, fingerMaterial);
        thumb.position.set(0.08, -0.02, 0);
        thumb.rotation.z = Math.PI / 4;
        hand.add(thumb);

        this.hand.add(arm);
        this.hand.add(hand);

        this.hand.position.set(0.4, -0.3, -0.5);
        this.camera.add(this.hand);
        this.scene.add(this.camera);
    }

    private setupControls() {
        document.addEventListener('keydown', (event) => {
            this.controls[event.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', (event) => {
            this.controls[event.key.toLowerCase()] = false;
        });

        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement) {
                this.yaw -= event.movementX * this.mouseSensitivity;
                this.pitch -= event.movementY * this.mouseSensitivity;
                this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
                
                this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

                if (this.hand) {
                    this.hand.position.x = 0.4 + (event.movementX * 0.0002);
                    this.hand.position.y = -0.3 + (event.movementY * 0.0002);
                }
            }
        });

        document.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                document.body.requestPointerLock();
            }
        });
    }

    private updateCollider() {
        this.collider.setFromCenterAndSize(
            new THREE.Vector3(
                this.camera.position.x,
                this.camera.position.y - this.playerHeight/2,
                this.camera.position.z
            ),
            new THREE.Vector3(this.playerWidth, this.playerHeight + 0.2, this.playerWidth)
        );
    }

    private handleCollisions(newPos: THREE.Vector3, delta: number, worldObjects: THREE.Box3[]): void {
        // Vertical collision check
        const verticalCollider = this.collider.clone();
        verticalCollider.min.y += this.velocity.y * delta;
        verticalCollider.max.y += this.velocity.y * delta;

        let verticalCollision = false;
        for (const obj of worldObjects) {
            if (verticalCollider.intersectsBox(obj)) {
                verticalCollision = true;
                if (this.velocity.y < 0) {
                    this.grounded = true;
                    newPos.y = obj.max.y + this.playerHeight;
                } else {
                    newPos.y = obj.min.y - 0.1;
                }
                this.velocity.y = 0;
                break;
            }
        }

        // Horizontal collision check with sliding
        const horizontalCollider = this.collider.clone();
        horizontalCollider.min.x += this.velocity.x * delta;
        horizontalCollider.max.x += this.velocity.x * delta;
        horizontalCollider.min.z += this.velocity.z * delta;
        horizontalCollider.max.z += this.velocity.z * delta;

        let horizontalCollision = false;
        for (const obj of worldObjects) {
            if (horizontalCollider.intersectsBox(obj)) {
                horizontalCollision = true;
                break;
            }
        }

        if (!horizontalCollision) {
            this.camera.position.x = newPos.x;
            this.camera.position.z = newPos.z;
        } else {
            // Try to slide along walls
            const xCollider = this.collider.clone();
            xCollider.min.x += this.velocity.x * delta;
            xCollider.max.x += this.velocity.x * delta;

            const zCollider = this.collider.clone();
            zCollider.min.z += this.velocity.z * delta;
            zCollider.max.z += this.velocity.z * delta;

            let xCollision = false;
            let zCollision = false;

            for (const obj of worldObjects) {
                if (xCollider.intersectsBox(obj)) xCollision = true;
                if (zCollider.intersectsBox(obj)) zCollision = true;
            }

            if (!xCollision) this.camera.position.x = newPos.x;
            if (!zCollision) this.camera.position.z = newPos.z;

            if (xCollision) this.velocity.x *= 0.5; // Reduce bounce on wall collision
            if (zCollision) this.velocity.z *= 0.5;
        }

        if (!verticalCollision) {
            this.camera.position.y = newPos.y;
        }
    }

    public setInitialPosition(worldObjects: THREE.Box3[]) {
        if (worldObjects.length > 0) {
            let maxY = -Infinity;
            for (const obj of worldObjects) {
                if (obj.max.y > maxY) {
                    maxY = obj.max.y;
                }
            }
            this.camera.position.y = maxY + this.playerHeight;
            this.velocity.y = -0.1; // Start with a small downward velocity
            this.initialPositionSet = true;
        }
    }

    public update(delta: number, worldObjects: THREE.Box3[]) {
        if (!this.initialPositionSet && worldObjects.length > 0) {
            this.setInitialPosition(worldObjects);
        }

        // Get movement input
        const input = new THREE.Vector3(
            (this.controls['d'] ? 1 : 0) - (this.controls['a'] ? 1 : 0),
            0,
            (this.controls['s'] ? 1 : 0) - (this.controls['w'] ? 1 : 0)
        );

        // Convert input to world space
        if (input.lengthSq() > 0) {
            input.normalize();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            forward.y = 0;
            forward.normalize();
            
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            right.y = 0;
            right.normalize();

            const moveDir = right.multiplyScalar(input.x).add(forward.multiplyScalar(-input.z));
            moveDir.normalize();
            
            // Apply acceleration based on grounded state
            const currentAccel = this.grounded ? this.acceleration : this.airAcceleration;
            this.velocity.x += moveDir.x * currentAccel * delta;
            this.velocity.z += moveDir.z * currentAccel * delta;
        }

        // Cap horizontal speed
        const horizontalSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
        if (horizontalSpeed > this.maxSpeed) {
            const scale = this.maxSpeed / horizontalSpeed;
            this.velocity.x *= scale;
            this.velocity.z *= scale;
        }

        // Apply friction with better ground control
        const friction = this.grounded ? 0.98 : 0.85;
        if (!input.lengthSq() || !this.grounded) {
            this.velocity.x *= Math.pow(friction, delta * 60);
            this.velocity.z *= Math.pow(friction, delta * 60);
        }

        // Vertical movement
        if (!this.grounded) {
            this.velocity.y -= this.gravity * delta;
        } else {
            this.velocity.y = -0.1; // Small downward force when grounded
        }

        // Handle jumping with better control
        if (this.controls[' '] && this.grounded) {
            this.velocity.y = this.jumpForce;
            this.grounded = false;
            // Preserve some horizontal momentum when jumping
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
        }

        // Calculate new position
        const newPos = this.camera.position.clone();
        newPos.add(this.velocity.clone().multiplyScalar(delta));

        // Reset grounded state before collision checks
        this.grounded = false;

        // Handle collisions
        this.handleCollisions(newPos, delta, worldObjects);

        // Update collider
        this.updateCollider();

        // Smooth hand bobbing based on actual movement speed
        if (this.hand) {
            const horizontalSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
            const normalizedSpeed = Math.min(horizontalSpeed / this.maxSpeed, 1);
            if (this.grounded && normalizedSpeed > 0.1) {
                const bobFrequency = 8; // Adjust for faster/slower bobbing
                const bobAmount = Math.sin(Date.now() * 0.01 * bobFrequency) * 0.03 * normalizedSpeed;
                this.hand.position.y = -0.3 + bobAmount;
                // Add slight side-to-side movement
                this.hand.position.x = 0.4 + Math.cos(Date.now() * 0.005 * bobFrequency) * 0.01 * normalizedSpeed;
            } else {
                // Smoothly return to default position when not moving
                this.hand.position.y += (-0.3 - this.hand.position.y) * 0.1;
                this.hand.position.x += (0.4 - this.hand.position.x) * 0.1;
            }
        }
    }

    public getPosition(): THREE.Vector3 {
        return this.camera.position;
    }
}

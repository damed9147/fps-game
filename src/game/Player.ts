import * as THREE from 'three';

export class Player {
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private velocity: THREE.Vector3;
    private moveSpeed: number = 10;
    private jumpForce: number = 15;
    private gravity: number = 30;
    private friction: number = 0.8; // Added friction coefficient
    private canJump: boolean = true;
    private moveDirection: THREE.Vector3 = new THREE.Vector3();
    private horizontalVelocity: THREE.Vector2 = new THREE.Vector2(); // Added for momentum
    private controls: { [key: string]: boolean } = {};
    private collider: THREE.Box3;
    private playerHeight: number = 2;
    private playerWidth: number = 0.5;
    private yaw: number = 0;
    private pitch: number = 0;
    private mouseSensitivity: number = 0.002;
    private hand: THREE.Group;

    constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
        this.camera = camera;
        this.scene = scene;
        this.velocity = new THREE.Vector3();
        
        // Start at a safe height
        this.camera.position.set(0, this.playerHeight, 5);
        this.setupControls();
        this.createHand();

        // Create player collider with a small buffer at the bottom
        this.collider = new THREE.Box3(
            new THREE.Vector3(-this.playerWidth/2, -0.1, -this.playerWidth/2),
            new THREE.Vector3(this.playerWidth/2, this.playerHeight, this.playerWidth/2)
        );
        this.updateCollider();
    }

    private createHand() {
        this.hand = new THREE.Group();

        // Create arm
        const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const armMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac }); // Skin color
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.set(0, -0.2, 0);
        
        // Create hand
        const handGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);
        const hand = new THREE.Mesh(handGeometry, armMaterial);
        hand.position.set(0, -0.4, 0);

        // Create fingers
        const fingerGeometry = new THREE.BoxGeometry(0.03, 0.1, 0.03);
        const fingerMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
        
        // Add multiple fingers
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

        // Add thumb
        const thumb = new THREE.Mesh(fingerGeometry, fingerMaterial);
        thumb.position.set(0.08, -0.02, 0);
        thumb.rotation.z = Math.PI / 4;
        hand.add(thumb);

        this.hand.add(arm);
        this.hand.add(hand);

        // Position the hand in view
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
                // Update yaw (left/right rotation)
                this.yaw -= event.movementX * this.mouseSensitivity;
                
                // Update pitch (up/down rotation) with limits
                this.pitch -= event.movementY * this.mouseSensitivity;
                this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
                
                // Apply rotations to camera
                this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

                // Subtle hand movement based on mouse movement
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
        // Update collider with a small ground buffer
        this.collider.setFromCenterAndSize(
            new THREE.Vector3(
                this.camera.position.x,
                this.camera.position.y - this.playerHeight/2,
                this.camera.position.z
            ),
            new THREE.Vector3(this.playerWidth, this.playerHeight + 0.2, this.playerWidth)
        );
    }

    public update(delta: number, worldObjects: THREE.Box3[]) {
        // Apply gravity first
        this.velocity.y -= this.gravity * delta;

        // Check ground collision and position
        const groundCheck = this.collider.clone();
        groundCheck.min.y += this.velocity.y * delta;
        groundCheck.max.y += this.velocity.y * delta;

        let isOnGround = false;
        for (const object of worldObjects) {
            if (groundCheck.intersectsBox(object)) {
                isOnGround = true;
                this.velocity.y = 0;
                // Ensure we're exactly at the right height
                this.camera.position.y = object.max.y + this.playerHeight;
                break;
            }
        }

        // Update canJump based on ground contact
        this.canJump = isOnGround;

        // Handle jumping
        if (this.controls[' '] && this.canJump) {
            this.velocity.y = this.jumpForce;
            this.canJump = false;
        }

        // Movement direction in camera space
        this.moveDirection.set(0, 0, 0);
        if (this.controls['w']) this.moveDirection.z -= 1;
        if (this.controls['s']) this.moveDirection.z += 1;
        if (this.controls['a']) this.moveDirection.x -= 1;
        if (this.controls['d']) this.moveDirection.x += 1;

        // Only normalize if we're actually moving
        if (this.moveDirection.lengthSq() > 0) {
            this.moveDirection.normalize();
        }

        // Convert movement from camera space to world space
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

        // Calculate target velocity
        const targetVelocity = new THREE.Vector2();
        if (this.moveDirection.lengthSq() > 0) {
            const moveVector = new THREE.Vector3();
            moveVector.addScaledVector(forward, -this.moveDirection.z);
            moveVector.addScaledVector(right, this.moveDirection.x);
            moveVector.normalize();
            
            targetVelocity.set(
                moveVector.x * this.moveSpeed,
                moveVector.z * this.moveSpeed
            );
        }

        // Apply smooth acceleration/deceleration
        const acceleration = isOnGround ? 1 - this.friction : 0.98;
        this.horizontalVelocity.lerp(targetVelocity, 1 - Math.pow(acceleration, delta * 60));

        // Apply movement
        const newPosition = this.camera.position.clone();
        newPosition.x += this.horizontalVelocity.x * delta;
        newPosition.z += this.horizontalVelocity.y * delta;

        // Check horizontal collisions
        const horizontalCollider = this.collider.clone();
        horizontalCollider.min.set(
            newPosition.x - this.playerWidth/2,
            this.collider.min.y,
            newPosition.z - this.playerWidth/2
        );
        horizontalCollider.max.set(
            newPosition.x + this.playerWidth/2,
            this.collider.max.y,
            newPosition.z + this.playerWidth/2
        );

        let canMoveHorizontally = true;
        for (const object of worldObjects) {
            if (horizontalCollider.intersectsBox(object)) {
                canMoveHorizontally = false;
                break;
            }
        }

        // Apply horizontal movement if no collision
        if (canMoveHorizontally) {
            this.camera.position.x = newPosition.x;
            this.camera.position.z = newPosition.z;
        } else {
            // Reset velocity on collision
            this.horizontalVelocity.set(0, 0);
        }

        // Apply vertical movement if not on ground
        if (!isOnGround) {
            this.camera.position.y += this.velocity.y * delta;
        }

        // Update collider position
        this.updateCollider();

        // Add subtle hand bobbing when moving
        if (this.hand && (this.moveDirection.x !== 0 || this.moveDirection.z !== 0)) {
            const bobAmount = Math.sin(Date.now() * 0.01) * 0.02;
            this.hand.position.y = -0.3 + bobAmount;
        }
    }

    public getPosition(): THREE.Vector3 {
        return this.camera.position;
    }
}

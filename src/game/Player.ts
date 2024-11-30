import * as THREE from 'three';

export class Player {
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private velocity: THREE.Vector3;
    private moveSpeed: number = 8;
    private jumpForce: number = 12;
    private gravity: number = 25;
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

    public setInitialPosition(worldObjects: THREE.Box3[]) {
        // Find the highest ground point at current x,z position
        let highestY = -Infinity;
        const currentPos = this.camera.position;
        
        for (const obj of worldObjects) {
            if (currentPos.x >= obj.min.x && currentPos.x <= obj.max.x &&
                currentPos.z >= obj.min.z && currentPos.z <= obj.max.z) {
                highestY = Math.max(highestY, obj.max.y);
            }
        }

        // If we found ground beneath us, position player above it
        if (highestY !== -Infinity) {
            this.camera.position.y = highestY + this.playerHeight + 0.1;
            this.updateCollider();
        }
    }

    public update(delta: number, worldObjects: THREE.Box3[]) {
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
            
            // Apply movement force
            this.velocity.x += moveDir.x * this.moveSpeed * delta * 10;
            this.velocity.z += moveDir.z * this.moveSpeed * delta * 10;
        }

        // Apply friction
        const friction = this.grounded ? 0.9 : 0.98;
        this.velocity.x *= Math.pow(friction, delta * 60);
        this.velocity.z *= Math.pow(friction, delta * 60);

        // Apply gravity
        this.velocity.y -= this.gravity * delta;

        // Handle jumping
        if (this.controls[' '] && this.grounded) {
            this.velocity.y = this.jumpForce;
            this.grounded = false;
        }

        // Calculate new position
        const newPos = this.camera.position.clone();
        newPos.add(this.velocity.clone().multiplyScalar(delta));

        // Check collisions and update position
        this.grounded = false;

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

        // Horizontal collision check
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

        // Update position
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

            if (xCollision) this.velocity.x = 0;
            if (zCollision) this.velocity.z = 0;
        }

        if (!verticalCollision) {
            this.camera.position.y = newPos.y;
        }

        // Update collider
        this.updateCollider();

        // Update hand animation
        if (this.hand) {
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            if (speed > 0.1) {
                const bobAmount = Math.sin(Date.now() * 0.01) * 0.02 * (speed / this.moveSpeed);
                this.hand.position.y = -0.3 + bobAmount;
            }
        }
    }

    public getPosition(): THREE.Vector3 {
        return this.camera.position;
    }
}

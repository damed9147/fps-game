import * as THREE from 'three';
import { GameUI } from './UI';

export class Player {
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private velocity = new THREE.Vector3();
    private hand!: THREE.Group;
    private weapon!: THREE.Group;
    private weaponBarrel!: THREE.Mesh;
    private grounded: boolean = false;
    private canShoot: boolean = true;
    private shootCooldown: number = 100;
    private projectileSpeed: number = 50;
    private projectiles: Array<{
        mesh: THREE.Mesh;
        velocity: THREE.Vector3;
        timeAlive: number;
    }> = [];
    private health: number = 100;
    private maxAmmo: number = 30;
    private currentAmmo: number = 30;
    private ui: GameUI;
    private controls: { [key: string]: boolean } = {};
    private initialPositionSet: boolean = false;
    // @ts-ignore
    private moveSpeed: number = 12;
    // @ts-ignore
    private moveDirection: THREE.Vector3 = new THREE.Vector3();
    private collider: THREE.Box3;
    private playerHeight: number = 2;
    private playerWidth: number = 0.5;
    private rotationX = 0; // Pitch (up/down)
    private rotationY = 0; // Yaw (left/right)
    private readonly MAX_PITCH = Math.PI / 2 - 0.1; // Just under 90 degrees
    private mouseSensitivity = 0.002;
    private isWallRunning = false;
    private wallRunCooldown = false;
    private wallRunTimer = 0;
    private wallRunNormal = new THREE.Vector3();
    private wallRunDirection = new THREE.Vector3();
    private readonly WALL_RUN_MAX_TIME = 2.0; // Longer wall run time
    private readonly WALL_RUN_COOLDOWN = 0.5;
    private readonly WALL_RUN_SPEED = 15; // Faster speed
    private readonly WALL_RUN_MIN_SPEED = 5; // Lower min speed to make it easier to start wall running
    private readonly WALL_RUN_GRAVITY = 5; // Much less gravity while wall running
    private readonly WALL_JUMP_FORCE = 10;
    private readonly WALL_JUMP_HORIZONTAL_FORCE = 10;
    private readonly CAMERA_TILT_ANGLE = Math.PI / 8;
    private readonly CAMERA_TILT_SPEED = 8;
    private readonly WALL_CHECK_DISTANCE = 1.5; // Increased check distance
    private readonly WALL_MIN_HEIGHT = 3;
    private readonly WALL_RUN_MIN_HEIGHT = 1;
    private readonly WALL_STICK_FORCE = 30; // Much stronger stick force

    // Camera state
    private currentTilt = 0;
    private targetTilt = 0;

    constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
        this.camera = camera;
        this.scene = scene;
        this.setupControls();
        this.createHand();

        // Create player collider starting exactly at ground level
        this.collider = new THREE.Box3(
            new THREE.Vector3(-this.playerWidth/2, 0, -this.playerWidth/2),
            new THREE.Vector3(this.playerWidth/2, this.playerHeight, this.playerWidth/2)
        );
        this.updateCollider();

        this.ui = new GameUI();
        this.ui.updateHealth(this.health);
        this.ui.updateAmmo(this.currentAmmo, this.maxAmmo);
    }

    private createHand() {
        // Create main group for hand and weapon
        this.hand = new THREE.Group();

        // Create weapon first
        this.weapon = new THREE.Group();
        
        // Gun body - make it bright red for debugging
        const gunBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.15, 0.8),
            new THREE.MeshPhongMaterial({ color: 0xff0000 })
        );
        gunBody.position.set(0, 0, -0.4); // Move it forward

        // Gun barrel
        this.weaponBarrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8),
            new THREE.MeshPhongMaterial({ color: 0x222222 })
        );
        this.weaponBarrel.rotation.x = Math.PI / 2;
        this.weaponBarrel.position.set(0, 0, -0.8); // Position at end of gun body

        // Gun handle
        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.2, 0.1),
            new THREE.MeshPhongMaterial({ color: 0x444444 })
        );
        handle.position.set(0, -0.15, -0.4);

        this.weapon.add(gunBody);
        this.weapon.add(this.weaponBarrel);
        this.weapon.add(handle);

        // Create hand parts
        const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const armMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        
        const handGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);
        const handMesh = new THREE.Mesh(handGeometry, armMaterial);

        // Position hand parts
        arm.position.set(0, 0, 0);
        handMesh.position.set(0, -0.2, 0);

        // Add fingers to hand
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
            handMesh.add(finger);
        });

        // Add thumb
        const thumb = new THREE.Mesh(fingerGeometry, fingerMaterial);
        thumb.position.set(0.08, -0.02, 0);
        thumb.rotation.z = Math.PI / 4;
        handMesh.add(thumb);

        // Build hierarchy
        this.hand.add(arm);
        this.hand.add(handMesh);
        
        // Position weapon relative to hand
        this.weapon.position.set(0.2, -0.2, 0);
        this.weapon.rotation.set(0, 0, 0);
        
        // Add weapon to hand
        this.hand.add(this.weapon);

        // Position entire hand+weapon group in view
        this.hand.position.set(0.4, -0.5, -0.3);
        this.hand.rotation.set(0, 0, 0);

        // Add to camera
        this.camera.add(this.hand);

        // Debug helper - add axes to see orientation
        const axesHelper = new THREE.AxesHelper(0.5);
        this.weapon.add(axesHelper);

        // Ensure camera is in scene
        this.scene.add(this.camera);
    }

    private setupControls() {
        document.addEventListener('keydown', (event) => {
            this.controls[event.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', (event) => {
            this.controls[event.key.toLowerCase()] = false;
        });

        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });

        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement) {
                // Update rotations
                this.rotationY -= event.movementX * this.mouseSensitivity;
                this.rotationX -= event.movementY * this.mouseSensitivity;
                
                // Clamp the pitch rotation
                this.rotationX = Math.max(-this.MAX_PITCH, Math.min(this.MAX_PITCH, this.rotationX));
            }
        });

        document.addEventListener('mousedown', (event) => {
            if (document.pointerLockElement && event.button === 0) {
                this.shoot();
            }
        });
    }

    private shoot() {
        if (!this.canShoot || this.currentAmmo <= 0) return;
        this.canShoot = false;
        this.currentAmmo--;
        this.ui.updateAmmo(this.currentAmmo, this.maxAmmo);

        // Get weapon's world position
        const weaponWorldPos = new THREE.Vector3();
        this.weapon.getWorldPosition(weaponWorldPos);
        
        // Calculate barrel tip position (offset from weapon position)
        const barrelOffset = new THREE.Vector3(-0.1, -0.1, -0.8); 
        const barrelWorldPos = weaponWorldPos.clone().add(
            barrelOffset.applyQuaternion(this.weapon.getWorldQuaternion(new THREE.Quaternion()))
        );

        // Get direction to crosshair (center of screen)
        const crosshairPos = this.camera.position.clone();
        const crosshairDir = new THREE.Vector3(0, 0, -1);
        crosshairDir.applyQuaternion(this.camera.quaternion);
        crosshairPos.add(crosshairDir.multiplyScalar(100));

        // Calculate direction from gun tip to crosshair
        const bulletDir = new THREE.Vector3();
        bulletDir.subVectors(crosshairPos, barrelWorldPos).normalize();
        
        // Create projectile
        const projectileGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
        // Start projectile at gun tip
        projectile.position.copy(barrelWorldPos);
        
        // Set projectile velocity towards crosshair
        const bulletSpeed = 50;
        const bulletVelocity = bulletDir.multiplyScalar(bulletSpeed);
        
        // Add projectile to scene
        this.scene.add(projectile);
        
        // Store projectile data for update loop
        this.projectiles.push({
            mesh: projectile,
            velocity: bulletVelocity,
            timeAlive: 0
        });

        // Create muzzle flash
        const flashGeometry = new THREE.PlaneGeometry(0.15, 0.15);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        
        // Parent flash to weapon
        this.weapon.add(flash);
        
        // Position flash at barrel tip relative to weapon
        flash.position.copy(barrelOffset);
        
        // Orient flash to face outward from barrel
        flash.rotation.y = Math.PI / 2;
        
        // Remove flash after short duration
        setTimeout(() => {
            this.weapon.remove(flash);
            flashGeometry.dispose();
            flashMaterial.dispose();
        }, 50);

        // Reset shoot cooldown
        setTimeout(() => {
            this.canShoot = true;
        }, this.shootCooldown);
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

            if (xCollision) this.velocity.x *= 0.5; 
            if (zCollision) this.velocity.z *= 0.5;
        }

        if (!verticalCollision) {
            this.camera.position.y = newPos.y;
        }
    }

    private cleanupProjectile(projectile: { mesh: THREE.Mesh, velocity: THREE.Vector3, timeAlive: number }) {
        this.scene.remove(projectile.mesh);
        if (projectile.mesh.geometry) {
            projectile.mesh.geometry.dispose();
        }
        if (projectile.mesh.material) {
            if (Array.isArray(projectile.mesh.material)) {
                projectile.mesh.material.forEach(m => m.dispose());
            } else {
                projectile.mesh.material.dispose();
            }
        }
    }

    public initializePosition(worldObjects: THREE.Box3[]) {
        if (worldObjects.length > 0) {
            let maxY = -Infinity;
            for (const obj of worldObjects) {
                maxY = Math.max(maxY, obj.max.y);
            }
            this.camera.position.y = maxY + 2;
            this.initialPositionSet = true;
        }
    }

    private checkForWalls(colliders: THREE.Box3[]): { normal: THREE.Vector3 } | null {
        const position = this.camera.position;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        
        // Create multiple check angles for better diagonal detection
        const angles = [-Math.PI/4, -Math.PI/8, 0, Math.PI/8, Math.PI/4];  // 45 degree spread
        let closestIntersection: THREE.Intersection | null = null;
        let closestDistance = Infinity;
        
        for (const angle of angles) {
            // Rotate the right vector by the angle
            const checkDir = right.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            
            // Create raycasters for both this direction and its opposite
            const raycaster = new THREE.Raycaster();
            raycaster.set(position, checkDir);
            raycaster.far = this.WALL_CHECK_DISTANCE;
            
            const oppositeRaycaster = new THREE.Raycaster();
            oppositeRaycaster.set(position, checkDir.clone().multiplyScalar(-1));
            oppositeRaycaster.far = this.WALL_CHECK_DISTANCE;
            
            for (const collider of colliders) {
                // Create simple wall mesh for intersection test
                const size = new THREE.Vector3();
                collider.getSize(size);
                const center = new THREE.Vector3();
                collider.getCenter(center);
                
                const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                const material = new THREE.MeshBasicMaterial();
                const wallMesh = new THREE.Mesh(geometry, material);
                wallMesh.position.copy(center);
                wallMesh.updateMatrixWorld();
                
                // Check both directions
                const rightIntersects = raycaster.intersectObject(wallMesh);
                const leftIntersects = oppositeRaycaster.intersectObject(wallMesh);
                
                // Find closest intersection
                const intersections = [...rightIntersects, ...leftIntersects];
                for (const intersection of intersections) {
                    if (intersection.distance < closestDistance) {
                        // Check if we're moving somewhat along the wall
                        if (intersection.face) {
                            const wallNormal = intersection.face.normal.clone();
                            const movementDir = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize();
                            const dot = Math.abs(wallNormal.dot(movementDir));
                            
                            // Accept the wall if we're not moving directly into it or away from it
                            if (dot < 0.8) {  // More forgiving angle threshold
                                closestDistance = intersection.distance;
                                closestIntersection = intersection;
                            }
                        }
                    }
                }
                
                // Clean up
                geometry.dispose();
                material.dispose();
            }
        }
        
        if (closestIntersection && closestIntersection.face) {
            return {
                normal: closestIntersection.face.normal.clone()
            };
        }
        
        return null;
    }
    
    private updateWallRun(deltaTime: number, worldObjects: THREE.Box3[]) {
        const horizontalSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
        
        // Check for walls if we're moving fast enough
        if (!this.grounded && horizontalSpeed > this.WALL_RUN_MIN_SPEED) {
            const wallCheck = this.checkForWalls(worldObjects);
            
            if (wallCheck && !this.wallRunCooldown) {
                if (!this.isWallRunning) {
                    // Start wall running
                    this.isWallRunning = true;
                    this.wallRunTimer = 0;
                    this.wallRunNormal.copy(wallCheck.normal);
                    
                    // Set camera tilt based on which side the wall is on
                    const rightDot = this.wallRunNormal.dot(new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion));
                    this.targetTilt = -Math.sign(rightDot) * this.CAMERA_TILT_ANGLE;
                }
                
                // Update wall run timer
                this.wallRunTimer += deltaTime;
                
                if (this.wallRunTimer >= this.WALL_RUN_MAX_TIME) {
                    this.endWallRun();
                } else {
                    // Get forward direction from camera
                    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                    forward.y = 0;
                    forward.normalize();
                    
                    // Project onto wall plane
                    const normalCopy = this.wallRunNormal.clone();
                    const dot = forward.dot(normalCopy);
                    forward.sub(normalCopy.multiplyScalar(dot));
                    forward.normalize();
                    
                    // Apply wall run movement
                    this.velocity.copy(forward.multiplyScalar(this.WALL_RUN_SPEED));
                    
                    // Apply very slight downward force
                    this.velocity.y = -1;
                    
                    // Keep player close to wall
                    this.velocity.add(this.wallRunNormal.clone().multiplyScalar(-this.WALL_STICK_FORCE * deltaTime));
                }
            } else if (this.isWallRunning) {
                this.endWallRun();
            }
        }
    }
    
    private endWallRun() {
        if (this.isWallRunning) {
            this.isWallRunning = false;
            this.targetTilt = 0;
            
            // Add wall jump if space is pressed
            if (this.controls[' ']) {
                // Get jump direction from wall normal and forward direction
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                forward.y = 0;
                forward.normalize();
                
                const jumpDir = this.wallRunNormal.clone().add(forward).normalize();
                this.velocity.copy(jumpDir.multiplyScalar(this.WALL_JUMP_HORIZONTAL_FORCE));
                this.velocity.y = this.WALL_JUMP_FORCE;
                
                // Don't apply cooldown when wall jumping to allow chaining
                return;
            }
            
            // Only apply cooldown if we're not wall jumping
            this.wallRunCooldown = true;
            
            // Start cooldown timer
            setTimeout(() => {
                this.wallRunCooldown = false;
            }, this.WALL_RUN_COOLDOWN * 1000);
        }
    }

    public update(deltaTime: number, worldObjects: THREE.Box3[]) {
        if (!this.initialPositionSet && worldObjects.length > 0) {
            this.initializePosition(worldObjects);
        }

        // Update wall running first
        this.updateWallRun(deltaTime, worldObjects);
        
        // Update camera tilt and rotation
        this.currentTilt = THREE.MathUtils.lerp(
            this.currentTilt,
            this.targetTilt,
            deltaTime * this.CAMERA_TILT_SPEED
        );

        // Apply camera rotations in correct order
        const baseRotation = new THREE.Euler(this.rotationX, this.rotationY, 0, 'YXZ');
        const tiltRotation = new THREE.Euler(0, 0, this.currentTilt, 'YXZ');
        
        // Convert to quaternions and combine
        const baseQuaternion = new THREE.Quaternion().setFromEuler(baseRotation);
        const tiltQuaternion = new THREE.Quaternion().setFromEuler(tiltRotation);
        
        // Apply combined rotation
        this.camera.quaternion.copy(baseQuaternion.multiply(tiltQuaternion));

        // Update existing projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.timeAlive += deltaTime;
            
            // Move projectile
            projectile.mesh.position.add(
                projectile.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // Remove projectiles after 2 seconds
            if (projectile.timeAlive > 2) {
                this.cleanupProjectile(projectile);
                this.projectiles.splice(i, 1);
            }
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
            const currentAccel = this.grounded ? 40 : 40;
            this.velocity.x += moveDir.x * currentAccel * deltaTime;
            this.velocity.z += moveDir.z * currentAccel * deltaTime;
        } else if (this.grounded) {
            // Smoother stop when no input and on ground
            this.velocity.x *= Math.pow(0.7, deltaTime * 60); // Adjusted for smoother deceleration
            this.velocity.z *= Math.pow(0.7, deltaTime * 60);
        }

        // Cap horizontal speed
        const horizontalSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
        if (horizontalSpeed > 20) {
            const scale = 20 / horizontalSpeed;
            this.velocity.x *= scale;
            this.velocity.z *= scale;
        }

        // Apply normal friction
        const friction = this.grounded ? 0.92 : 0.95;
        if (horizontalSpeed > 0.01) { // Only apply friction if moving
            this.velocity.x *= Math.pow(friction, deltaTime * 60);
            this.velocity.z *= Math.pow(friction, deltaTime * 60);
        } else if (this.grounded) {
            // Stop completely if very slow
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // Vertical movement
        if (!this.grounded) {
            this.velocity.y -= 30 * deltaTime;
        } else {
            this.velocity.y = -0.1;
        }

        // Handle jumping with better control
        if (this.controls[' ']) {
            if (this.grounded) {
                this.velocity.y = 10;
                this.grounded = false;
                // Add a bit of extra forward momentum when jumping while moving
                if (horizontalSpeed > 0) {
                    const jumpBoost = 1.2;
                    this.velocity.x *= jumpBoost;
                    this.velocity.z *= jumpBoost;
                }
            } else if (this.isWallRunning) {
                // Wall jump
                const jumpDir = this.wallRunNormal.clone().multiplyScalar(this.WALL_JUMP_HORIZONTAL_FORCE);
                jumpDir.y = this.WALL_JUMP_FORCE;
                this.velocity.copy(jumpDir);
                this.endWallRun();
            }
        }

        // Calculate new position
        const newPos = this.camera.position.clone();
        newPos.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Reset grounded state before collision checks
        this.grounded = false;

        // Handle collisions
        this.handleCollisions(newPos, deltaTime, worldObjects);

        // Update collider
        this.updateCollider();

        // Smooth hand bobbing based on actual movement speed
        if (this.hand) {
            const horizontalSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
            const normalizedSpeed = Math.min(horizontalSpeed / 20, 1);
            if (this.grounded && normalizedSpeed > 0.1) {
                const bobFrequency = 4; 
                const bobAmount = Math.sin(Date.now() * 0.005 * bobFrequency) * 0.015 * normalizedSpeed; 
                this.hand.position.y = -0.3 + bobAmount;
                // Add slight side-to-side movement
                this.hand.position.x = 0.4 + Math.cos(Date.now() * 0.003 * bobFrequency) * 0.005 * normalizedSpeed;
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

    public takeDamage(amount: number) {
        this.health = Math.max(0, this.health - amount);
        this.ui.updateHealth(this.health);
        
        if (this.health <= 0) {
            this.die();
        }
    }

    private die() {
        // Reset player state
        this.health = 100;
        this.currentAmmo = this.maxAmmo;
        this.camera.position.set(0, 2, 0);
        this.velocity.set(0, 0, 0);
        
        // Update UI
        this.ui.updateHealth(this.health);
        this.ui.updateAmmo(this.currentAmmo, this.maxAmmo);
    }

    public reload() {
        if (this.currentAmmo === this.maxAmmo) return;
        
        this.currentAmmo = this.maxAmmo;
        this.ui.updateAmmo(this.currentAmmo, this.maxAmmo);
    }
}

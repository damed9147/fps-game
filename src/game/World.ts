import * as THREE from 'three';

export class World {
    private scene: THREE.Scene;
    private obstacles: THREE.Box3[] = [];
    private platforms: THREE.Box3[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.createWorld();
    }

    private createWorld() {
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x808080,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0; // Ensure ground is at y=0
        this.scene.add(ground);

        // Add ground collision box with more thickness
        const groundBox = new THREE.Box3(
            new THREE.Vector3(-25, -0.5, -25),
            new THREE.Vector3(25, 0, 25)
        );
        this.obstacles.push(groundBox);

        // Add some obstacles and platforms
        this.addObstacles();
        this.addPlatforms();

        // Add skybox
        this.createSkybox();
    }

    private addObstacles() {
        // Add some boxes as obstacles
        const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
        const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });

        const obstaclePositions = [
            { x: -8, z: -8 },
            { x: 8, z: 8 },
            { x: -8, z: 8 },
            { x: 8, z: -8 },
            { x: 0, z: -12 },
            { x: -12, z: 0 },
            { x: 12, z: 0 },
            { x: 0, z: 12 },
            { x: 4, z: -4 },
            { x: -4, z: 4 }
        ];

        obstaclePositions.forEach(pos => {
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.set(pos.x, 1, pos.z);
            this.scene.add(box);

            // Add collision box
            const collisionBox = new THREE.Box3(
                new THREE.Vector3(pos.x - 1, 0, pos.z - 1),
                new THREE.Vector3(pos.x + 1, 2, pos.z + 1)
            );
            this.obstacles.push(collisionBox);
        });
    }

    private addPlatforms() {
        // Add some elevated platforms
        const platformGeometry = new THREE.BoxGeometry(4, 0.5, 4);
        const platformMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });

        const platformPositions = [
            { x: -10, y: 3, z: 0 },
            { x: 10, y: 2, z: 0 },
            { x: 0, y: 4, z: -10 },
            { x: 0, y: 3, z: 10 },
            { x: 5, y: 5, z: 5 }
        ];

        platformPositions.forEach(pos => {
            const platform = new THREE.Mesh(platformGeometry, platformMaterial);
            platform.position.set(pos.x, pos.y, pos.z);
            this.scene.add(platform);

            // Add collision box
            const collisionBox = new THREE.Box3(
                new THREE.Vector3(pos.x - 2, pos.y - 0.25, pos.z - 2),
                new THREE.Vector3(pos.x + 2, pos.y + 0.25, pos.z + 2)
            );
            this.platforms.push(collisionBox);
        });
    }

    private createSkybox() {
        // Simple color background for now
        this.scene.background = new THREE.Color(0x87ceeb);
    }

    public getColliders(): THREE.Box3[] {
        return [...this.obstacles, ...this.platforms];
    }
}

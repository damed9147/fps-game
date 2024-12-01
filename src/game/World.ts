import * as THREE from 'three';

export class World {
    private scene: THREE.Scene;
    private objects: THREE.Mesh[] = [];
    private colliders: THREE.Box3[] = [];

    constructor(scene: THREE.Scene) {
        console.log('World: Initializing...');
        this.scene = scene;
        this.createWorld();
        console.log('World: Creation complete');
    }

    private createWorld() {
        console.log('World: Creating world elements...');
        // Floor
        const floorGeometry = new THREE.BoxGeometry(40, 1, 200); // Narrower but still long hallway
        const floorMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x808080,
            shininess: 30,
            specular: 0x404040
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.y = -0.5; // Half height down so top is at y=0
        this.scene.add(floor);
        this.objects.push(floor);

        // Add floor collider
        const floorCollider = new THREE.Box3().setFromObject(floor);
        this.colliders.push(floorCollider);

        // Create a long hallway with alternating wall sections
        const wallHeight = 12;
        const wallLength = 15; // Shorter wall sections
        const wallSpacing = 8; // Much tighter spacing between walls
        const numSections = 20; // More sections since they're shorter
        const hallwayWidth = 16; // Narrower hallway

        // Create walls on alternating sides
        for (let i = 0; i < numSections; i++) {
            const zPosition = -90 + (i * wallSpacing); // Start far back and go forward
            const xPosition = (i % 2 === 0) ? hallwayWidth/2 - 1 : -hallwayWidth/2 + 1; // Alternate between left and right
            
            this.createWall(
                new THREE.Vector3(xPosition, wallHeight/2, zPosition), 
                new THREE.Vector3(1, wallHeight, wallLength), 
                0x4a4a4a + (i * 0x0a0a0a) // Slightly different color for each wall
            );
        }

        // Add end platform as a goal
        this.createPlatform(new THREE.Vector3(0, 4, 60), new THREE.Vector3(10, 1, 10), 0x8a8a8a);

        // Add some lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Add multiple directional lights along the hallway
        for (let i = 0; i < 3; i++) {
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
            directionalLight.position.set(0, 20, -60 + i * 60);
            this.scene.add(directionalLight);
        }

        // Add point lights along the hallway
        for (let i = 0; i < 5; i++) {
            const pointLight = new THREE.PointLight(0xffffff, 0.4, 40);
            pointLight.position.set(0, 10, -80 + i * 40);
            this.scene.add(pointLight);
        }
    }

    private createWall(position: THREE.Vector3, size: THREE.Vector3, color: number, rotation: number = 0) {
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            shininess: 30,
            specular: 0x404040
        });
        const wall = new THREE.Mesh(geometry, material);
        wall.position.copy(position);
        wall.rotation.y = rotation;
        this.scene.add(wall);
        this.objects.push(wall);

        // Add collider
        const collider = new THREE.Box3().setFromObject(wall);
        this.colliders.push(collider);
    }

    private createPlatform(position: THREE.Vector3, size: THREE.Vector3, color: number) {
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            shininess: 50,
            specular: 0x505050
        });
        const platform = new THREE.Mesh(geometry, material);
        platform.position.copy(position);
        this.scene.add(platform);
        this.objects.push(platform);

        // Add collider
        const collider = new THREE.Box3().setFromObject(platform);
        this.colliders.push(collider);
    }

    public getColliders(): THREE.Box3[] {
        return this.colliders;
    }

    public update() {
        // Update colliders if objects move
        this.colliders.forEach((collider, index) => {
            collider.setFromObject(this.objects[index]);
        });
    }
}

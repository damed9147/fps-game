import * as THREE from 'three';

export class Enemy {
    private mesh: THREE.Mesh;
    private health: number = 100;
    private speed: number = 5;
    private detectionRange: number = 15;
    private attackRange: number = 2;
    private attackDamage: number = 10;
    private attackCooldown: number = 1;
    private lastAttackTime: number = 0;

    constructor(position: THREE.Vector3, scene: THREE.Scene) {
        // Create enemy mesh
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        scene.add(this.mesh);
    }

    public update(delta: number, playerPosition: THREE.Vector3) {
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);

        // Chase player if within detection range
        if (distanceToPlayer < this.detectionRange) {
            const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.mesh.position)
                .normalize();
            
            this.mesh.position.add(
                direction.multiplyScalar(this.speed * delta)
            );

            // Make enemy face player
            this.mesh.lookAt(playerPosition);
        }

        // Attack if in range and cooldown is over
        if (distanceToPlayer < this.attackRange && 
            Date.now() - this.lastAttackTime > this.attackCooldown * 1000) {
            this.attack();
            this.lastAttackTime = Date.now();
        }
    }

    private attack() {
        // Implement attack logic here
        console.log('Enemy attacks!');
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    private die() {
        // Remove enemy from scene
        this.mesh.parent?.remove(this.mesh);
    }

    public getPosition(): THREE.Vector3 {
        return this.mesh.position;
    }
}

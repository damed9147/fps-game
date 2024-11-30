import * as THREE from 'three';
import { Player } from './Player';
import { World } from './World';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private player: Player;
    private world: World;
    private clock: THREE.Clock;

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.setupLights();
        this.setupWorld();
        
        this.player = new Player(this.camera, this.scene);
        // Set initial position after world is created
        this.player.setInitialPosition(this.world.getColliders());

        // Event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private setupLights() {
        // Setup lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 50, 0);
        this.scene.add(directionalLight);
    }

    private setupWorld() {
        // Initialize game components
        this.world = new World(this.scene);
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public update() {
        const delta = this.clock.getDelta();
        
        // Update game components
        this.player.update(delta, this.world.getColliders());
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    public start() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.update();
        };
        animate();
    }
}

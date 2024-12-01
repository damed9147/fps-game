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
    private keys: { [key: string]: boolean } = {};

    constructor() {
        console.log('Game: Initializing...');
        // Initialize scene first
        this.scene = new THREE.Scene();
        console.log('Game: Scene created');
        
        // Then initialize world
        this.world = new World(this.scene);
        console.log('Game: World initialized');
        
        // Initialize other components
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 2; // Set initial camera height
        console.log('Game: Camera initialized');
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.player = new Player(this.camera, this.scene);

        // Set initial position
        this.player.initializePosition(this.world.getColliders());

        this.setupEventListeners();

        // Event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    public start() {
        // Start the game loop
        this.animate();
    }

    private setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'KeyW':
                case 'KeyS':
                case 'KeyA':
                case 'KeyD':
                case 'Space':
                    this.keys[event.code] = true;
                    break;
                case 'KeyR':
                    this.player.reload();
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            if (this.keys.hasOwnProperty(event.code)) {
                this.keys[event.code] = false;
            }
        });
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        const delta = this.clock.getDelta();

        this.player.update(delta, this.world.getColliders());
        this.world.update();

        this.renderer.render(this.scene, this.camera);
    }
}

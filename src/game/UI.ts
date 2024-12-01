import * as THREE from 'three';

export class GameUI {
    private container!: HTMLDivElement;
    private healthBar!: HTMLDivElement;
    private ammoCounter!: HTMLDivElement;
    private crosshair!: HTMLDivElement;
    private healthValue: number = 100;
    private maxAmmo: number = 30;
    private currentAmmo: number = 30;

    constructor() {
        this.createUI();
    }

    private createUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none';
        document.body.appendChild(this.container);

        // Create health bar
        this.healthBar = document.createElement('div');
        this.healthBar.style.position = 'absolute';
        this.healthBar.style.bottom = '30px';
        this.healthBar.style.left = '30px';
        this.healthBar.style.width = '200px';
        this.healthBar.style.height = '20px';
        this.healthBar.style.backgroundColor = '#333';
        this.healthBar.style.border = '2px solid #fff';
        this.healthBar.style.borderRadius = '10px';
        this.healthBar.style.overflow = 'hidden';

        const healthFill = document.createElement('div');
        healthFill.style.width = '100%';
        healthFill.style.height = '100%';
        healthFill.style.backgroundColor = '#00ff00';
        healthFill.style.transition = 'width 0.3s ease-in-out';
        this.healthBar.appendChild(healthFill);

        // Create ammo counter
        this.ammoCounter = document.createElement('div');
        this.ammoCounter.style.position = 'absolute';
        this.ammoCounter.style.bottom = '30px';
        this.ammoCounter.style.right = '30px';
        this.ammoCounter.style.color = '#fff';
        this.ammoCounter.style.fontSize = '24px';
        this.ammoCounter.style.fontFamily = 'Arial, sans-serif';
        this.ammoCounter.textContent = `${this.currentAmmo}/${this.maxAmmo}`;

        // Create crosshair
        this.crosshair = document.createElement('div');
        this.crosshair.style.position = 'absolute';
        this.crosshair.style.left = '50%';
        this.crosshair.style.top = '50%';
        this.crosshair.style.transform = 'translate(-50%, -50%)';
        this.crosshair.style.width = '16px';
        this.crosshair.style.height = '16px';
        
        const crosshairHTML = `
            <div style="position: relative; width: 100%; height: 100%;">
                <!-- Center dot -->
                <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
                           width: 2px; height: 2px; background-color: #fff;"></div>
                
                <!-- Vertical lines -->
                <div style="position: absolute; left: 50%; top: 0; transform: translateX(-50%);
                           width: 1px; height: 6px; background-color: #fff;"></div>
                <div style="position: absolute; left: 50%; bottom: 0; transform: translateX(-50%);
                           width: 1px; height: 6px; background-color: #fff;"></div>
                
                <!-- Horizontal lines -->
                <div style="position: absolute; top: 50%; left: 0; transform: translateY(-50%);
                           width: 6px; height: 1px; background-color: #fff;"></div>
                <div style="position: absolute; top: 50%; right: 0; transform: translateY(-50%);
                           width: 6px; height: 1px; background-color: #fff;"></div>
            </div>
        `;
        this.crosshair.innerHTML = crosshairHTML;

        // Add elements to container
        this.container.appendChild(this.healthBar);
        this.container.appendChild(this.ammoCounter);
        this.container.appendChild(this.crosshair);
    }

    public updateHealth(health: number) {
        this.healthValue = Math.max(0, Math.min(100, health));
        const healthFill = this.healthBar.firstChild as HTMLDivElement;
        healthFill.style.width = `${this.healthValue}%`;
        
        // Change color based on health
        if (this.healthValue > 60) {
            healthFill.style.backgroundColor = '#00ff00';
        } else if (this.healthValue > 30) {
            healthFill.style.backgroundColor = '#ffff00';
        } else {
            healthFill.style.backgroundColor = '#ff0000';
        }
    }

    public updateAmmo(current: number, max: number) {
        this.currentAmmo = current;
        this.maxAmmo = max;
        this.ammoCounter.textContent = `${this.currentAmmo}/${this.maxAmmo}`;
        
        // Change color based on ammo
        if (this.currentAmmo === 0) {
            this.ammoCounter.style.color = '#ff0000';
        } else if (this.currentAmmo <= 5) {
            this.ammoCounter.style.color = '#ffff00';
        } else {
            this.ammoCounter.style.color = '#fff';
        }
    }

    public showHitMarker() {
        const hitMarker = document.createElement('div');
        hitMarker.style.position = 'absolute';
        hitMarker.style.left = '50%';
        hitMarker.style.top = '50%';
        hitMarker.style.width = '20px';
        hitMarker.style.height = '20px';
        hitMarker.style.transform = 'translate(-50%, -50%)';
        hitMarker.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M10 0 L10 20 M0 10 L20 10" stroke="#fff" stroke-width="2"/>
            </svg>
        `;
        this.container.appendChild(hitMarker);

        // Remove hit marker after animation
        setTimeout(() => {
            hitMarker.remove();
        }, 100);
    }
}

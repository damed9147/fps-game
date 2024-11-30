import './style.css';
import { Game } from './game/Game';

// Clear default content
document.querySelector<HTMLDivElement>('#app')!.innerHTML = '';

// Create and start the game
const game = new Game();
game.start();

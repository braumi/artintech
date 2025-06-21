import './style.css';
import { Router } from './router';

// Main application logic
class App {
  private appElement: HTMLElement | null;
  private router: Router | null = null;

  constructor() {
    this.appElement = document.querySelector('#app');
    this.init();
  }

  private init(): void {
    if (!this.appElement) {
      console.error('App element not found');
      return;
    }

    // Initialize router
    this.router = new Router(this.appElement);
    
    console.log('Artintech website initialized!');
  }
}

// Initialize the app
new App(); 
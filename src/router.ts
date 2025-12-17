import type {
  DemoFurnitureId,
  FurnitureInteractionState,
  FurnitureSnapshot,
  ThreeApartmentViewer
} from './three-viewer';
import { supabase } from './supabaseClient';

export type PageName = 'main' | 'demo' | 'signin' | 'signup' | 'checkout' | 'profile';

type DemoPlanStats = {
  area: number;
  beds: number;
  baths: number;
  levels?: number;
};

type DemoPlanConfig = {
  id: string;
  name: string;
  description: string;
  stats: DemoPlanStats;
  highlights: string[];
  plan: any;
  staticModelBase?: string;
};

type DemoFurnitureOption = {
  id: DemoFurnitureId;
  name: string;
  price: string;
  icon: string; // filename in components/icons
};

export class Router {
  private currentPage: PageName = 'main';
  private appElement: HTMLElement;
  private roofActionListener: ((e: Event) => void) | null = null;
  private threeViewer: ThreeApartmentViewer | null = null;
  private currentPlan: any | null = null;
  private currentPlanId: string | null = null;
  private readonly demoPlans: DemoPlanConfig[] = this.createDemoPlans();
  private readonly demoFurnitureOptions: DemoFurnitureOption[] = this.createDemoFurnitureOptions();
  private activeFurniture: DemoFurnitureId | null = null;
  private furnitureSnapshots: FurnitureSnapshot[] = [];
  private selectedFurnitureInstanceId: string | null = null;
  private furnitureInteractionState: FurnitureInteractionState = 'idle';
  private furnitureColorByInstance: Map<string, string> = new Map();
  private heroGradientAnimationId: number | null = null;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;
  private removeAuthListener: (() => void) | null = null;
  private escKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  private logoutControllers: AbortController[] = [];
  private logoutDocHandler: ((event: Event) => void) | null = null;

  constructor(appElement: HTMLElement) {
    this.appElement = appElement;
    this.init();
  }

  private registerGlobalLogout(): void {
    if (this.logoutDocHandler) {
      document.removeEventListener('click', this.logoutDocHandler, true);
      this.logoutDocHandler = null;
    }
    this.logoutDocHandler = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const btn = target?.closest('.auth-logout-btn') as HTMLButtonElement | null;
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      void this.handleLogout(btn);
    };
    document.addEventListener('click', this.logoutDocHandler, true);
  }

  private createDemoPlans(): DemoPlanConfig[] {
    return [
      {
        id: 'great-room-loft',
        name: 'Great Room Loft',
        description: 'Sun-filled loft with a 30 m2 great room at the heart and private bedroom wing.',
        stats: { area: 90, beds: 2, baths: 2 },
        highlights: ['Split-bedroom layout', 'Dedicated study nook', 'Gallery-style entry'],
        staticModelBase: 'house',
        plan: {
          units: 'meters',
          ceilingHeightMeters: 3.0,
          defaultWallThicknessMeters: 0.18,
          rooms: [
            { name: 'Great Room', floorMaterial: 'wood', polygon: [[0, 0], [6, 0], [6, 5], [0, 5]] },
            { name: 'Kitchen', floorMaterial: 'tile', polygon: [[6, 0], [10, 0], [10, 3], [6, 3]] },
            { name: 'Owner Suite', floorMaterial: 'wood', polygon: [[6, 3], [10, 3], [10, 7], [6, 7]] },
            { name: 'Study Nook', polygon: [[0, 5], [6, 5], [6, 7.5], [0, 7.5]] },
            { name: 'Gallery', polygon: [[0, 7.5], [6, 7.5], [6, 9], [0, 9]] },
            { name: 'Bath', floorMaterial: 'tile', polygon: [[6, 7], [8, 7], [8, 9], [6, 9]] },
            { name: 'Laundry', floorMaterial: 'tile', polygon: [[8, 7], [10, 7], [10, 9], [8, 9]] }
          ]
        }
      },
      {
        id: 'courtyard-ranch',
        name: 'Courtyard Ranch',
        description: 'Single-story ranch anchored by an outdoor courtyard and studio wing.',
        stats: { area: 124, beds: 3, baths: 2 },
        highlights: ['Central courtyard retreat', 'Dedicated studio wing', 'Oversized kitchen island'],
        staticModelBase: 'house2',
        plan: {
          units: 'meters',
          ceilingHeightMeters: 2.8,
          defaultWallThicknessMeters: 0.18,
          rooms: [
            { name: 'Living Pavilion', floorMaterial: 'wood', polygon: [[0, 0], [7, 0], [7, 4], [0, 4]] },
            { name: 'Dining Hall', floorMaterial: 'wood', polygon: [[7, 0], [12, 0], [12, 4], [7, 4]] },
            { name: 'Kitchen', floorMaterial: 'tile', polygon: [[7, 4], [12, 4], [12, 6.5], [7, 6.5]] },
            { name: 'Courtyard', floorMaterial: 'tile', polygon: [[4, 4], [8, 4], [8, 7], [4, 7]] },
            { name: 'Bedroom Wing', floorMaterial: 'wood', polygon: [[0, 4], [4, 4], [4, 11], [0, 11]] },
            { name: 'Studio', floorMaterial: 'wood', polygon: [[4, 7], [8, 7], [8, 11], [4, 11]] },
            { name: 'Bath Suite', floorMaterial: 'tile', polygon: [[8, 7], [10.5, 7], [10.5, 9.5], [8, 9.5]] },
            { name: 'Garage', floorMaterial: 'concrete', polygon: [[10.5, 7], [12, 7], [12, 11], [10.5, 11]] }
          ]
        }
      },
      {
        id: 'urban-duplex',
        name: 'Urban Duplex',
        description: 'Compact urban plan with dual bedrooms and a flexible studio terrace.',
        stats: { area: 102, beds: 3, baths: 2 },
        highlights: ['Flexible studio space', 'Terrace spanning rear facade', 'Efficient galley kitchen'],
        staticModelBase: 'house3',
        plan: {
          units: 'meters',
          ceilingHeightMeters: 2.9,
          defaultWallThicknessMeters: 0.16,
          rooms: [
            { name: 'Living Lounge', floorMaterial: 'wood', polygon: [[0, 0], [6, 0], [6, 4], [0, 4]] },
            { name: 'Galley Kitchen', floorMaterial: 'tile', polygon: [[6, 0], [11, 0], [11, 3], [6, 3]] },
            { name: 'Flex Studio', floorMaterial: 'wood', polygon: [[0, 4], [4, 4], [4, 8], [0, 8]] },
            { name: 'Bedroom One', floorMaterial: 'wood', polygon: [[4, 4], [7.5, 4], [7.5, 8], [4, 8]] },
            { name: 'Bedroom Two', floorMaterial: 'wood', polygon: [[7.5, 4], [11, 4], [11, 7], [7.5, 7]] },
            { name: 'Bath Core', floorMaterial: 'tile', polygon: [[7.5, 7], [11, 7], [11, 8.5], [7.5, 8.5]] },
            { name: 'Terrace', polygon: [[0, 8], [11, 8], [11, 9.5], [0, 9.5]] }
          ]
        }
      }
    ];
  }

  private createDemoFurnitureOptions(): DemoFurnitureOption[] {
    return [
      {
        id: 'sofa',
        name: 'Modular Sofa',
        price: '₾1,200',
        icon: 'couch.png',
      },
      {
        id: 'dining',
        name: 'Dining Table',
        price: '₾950',
        icon: 'table.png',
      },
      {
        id: 'bed',
        name: 'Queen Bed',
        price: '₾1,050',
        icon: 'bed.png',
      },
      {
        id: 'chair',
        name: 'Accent Chair',
        price: '₾320',
        icon: 'chair.png',
      },
      {
        id: 'coffee-table',
        name: 'Coffee Table',
        price: '₾420',
        icon: 'coffee table.png',
      },
      {
        id: 'plant',
        name: 'Leaf Plant',
        price: '₾180',
        icon: 'plant.png',
      }
    ];
  }

  private formatPlanMeta(stats: DemoPlanStats): string {
    const parts = [`${stats.beds} bd`, `${stats.baths} ba`, `${stats.area} m2`];
    if (stats.levels) {
      parts.push(`${stats.levels} lvl`);
    }
    return parts.join(' | ');
  }

  private getFurnitureOption(id: DemoFurnitureId | null): DemoFurnitureOption | undefined {
    if (!id) return undefined;
    return this.demoFurnitureOptions.find(item => item.id === id);
  }

  private updateActivePlanSummary(plan: DemoPlanConfig | null): void {
    const nameEl = this.appElement.querySelector('#active-plan-name') as HTMLElement | null;
    const metaEl = this.appElement.querySelector('#active-plan-meta') as HTMLElement | null;
    const descEl = this.appElement.querySelector('#active-plan-description') as HTMLElement | null;
    if (!plan) {
      if (nameEl) nameEl.textContent = 'Select a plan';
      if (metaEl) metaEl.textContent = 'No plan selected';
      if (descEl) descEl.textContent = 'Pick a floor plan to generate the 3D model.';
      return;
    }
    if (nameEl) nameEl.textContent = plan.name;
    if (metaEl) metaEl.textContent = this.formatPlanMeta(plan.stats);
    if (descEl) descEl.textContent = plan.description;
  }

  private updateFurnitureStatus(option: DemoFurnitureOption | null): void {
    const label = this.appElement.querySelector('#selected-furniture-label') as HTMLElement | null;
    if (!label) return;
    label.textContent = option ? `${option.name}` : 'None';
  }

  private async ensureThreeViewer(container: HTMLElement): Promise<ThreeApartmentViewer | null> {
    if (this.threeViewer) {
      return this.threeViewer;
    }
    const module = await import('./three-viewer');
    const ViewerCtor = module.ThreeApartmentViewer;
    const host = document.createElement('div');
    host.className = 'three-host';
    host.style.position = 'absolute';
    host.style.inset = '0';
    container.appendChild(host);
    this.threeViewer = new ViewerCtor();
    this.threeViewer.mount(host);
    return this.threeViewer;
  }

  /**
   * If we just returned from an OAuth provider (e.g. Google), Supabase puts a
   * `code` query param in the URL. We must exchange that code for a session
   * before we can read the current user; otherwise the app will think we're
   * signed out and prompt again.
   */
  private async handleOAuthCallback(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError = params.get('error_description');

    if (oauthError) {
      // eslint-disable-next-line no-console
      console.warn('OAuth error from provider:', oauthError);
      return;
    }

    if (!code) return;

    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to exchange OAuth code for session', err);
      return;
    }

    // Clean the URL (remove ?code=...) but keep the current hash route
    const hash = window.location.hash || '#main';
    const cleanUrl = `${window.location.origin}${window.location.pathname}${hash}`;
    window.history.replaceState({}, '', cleanUrl);

    // Update auth state after exchanging the session
    await this.refreshAuthState();
  }

  private init(): void {
    // First, handle potential OAuth redirect responses (e.g., Google)
    void this.handleOAuthCallback();
    this.registerAuthListener();
    this.registerGlobalLogout();

    // Handle initial page load
    const hash = window.location.hash.slice(1) as PageName;
    if (hash === 'demo' || hash === 'signin' || hash === 'signup' || hash === 'checkout' || hash === 'profile') {
      this.currentPage = hash;
    }

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    this.render();
    void this.refreshAuthState();
  }

  /**
   * Keep UI in sync whenever Supabase auth changes (including Google OAuth).
   */
  private registerAuthListener(): void {
    // Clean up any previous listener to avoid duplicates during HMR or re-init
    if (this.removeAuthListener) {
      this.removeAuthListener();
      this.removeAuthListener = null;
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
      // Whenever session changes, refresh state and UI
      await this.refreshAuthState();

      // On successful sign-in, leave auth pages immediately
      if (event === 'SIGNED_IN' && (this.currentPage === 'signin' || this.currentPage === 'signup')) {
        this.currentPage = 'main';
        window.location.hash = 'main';
        this.render();
      }
    });

    if (listener && typeof listener.subscription?.unsubscribe === 'function') {
      this.removeAuthListener = () => listener.subscription.unsubscribe();
    }
  }

  private handleRouteChange(): void {
    const hash = (window.location.hash.slice(1) as PageName) || 'main';
    // Prevent navigation to signup page - redirect to signin instead
    if (hash === 'signup') {
      window.location.hash = 'signin';
      this.currentPage = 'signin';
      this.render();
      return;
    }
    // Avoid double-render when navigateTo already updated currentPage and hash
    if (hash === this.currentPage) {
      return;
    }
    this.currentPage = hash;
    this.render();
  }

  public navigateTo(page: PageName): void {
    // Disable navigation to signup page - keep the function but prevent navigation
    if (page === 'signup') {
      // If we're on the sign in page, show the modal
      if (this.currentPage === 'signin') {
        const signupModal = this.appElement.querySelector<HTMLElement>('#signup-modal');
        if (signupModal) {
          signupModal.setAttribute('aria-hidden', 'false');
          signupModal.style.display = 'block';
        }
      }
      return; // Don't navigate to signup page
    }
    this.currentPage = page;
    window.location.hash = page;
    this.render();
  }

  private render(): void {
    // Clean up previous event listeners
    this.cleanupEventListeners();
    
    this.appElement.innerHTML = this.getPageContent();
    this.attachEventListeners();
    this.initMouseFollower();
    
    // Remove all background classes first
    document.body.classList.remove('main-background', 'demo-background', 'auth-background');
    
    // Apply the appropriate background class
    if (this.currentPage === 'main') {
      document.body.classList.add('main-background');
      this.initHeroAnimation();
    } else if (this.currentPage === 'signin' || this.currentPage === 'signup') {
      document.body.classList.add('auth-background');
    } else {
      // demo, checkout, profile pages use demo-background
      document.body.classList.add('demo-background');
    }
  }

  private cleanupEventListeners(): void {
    // Remove the roof action listener if it exists
    if (this.roofActionListener) {
      document.removeEventListener('click', this.roofActionListener);
      this.roofActionListener = null;
    }
    if (this.threeViewer) {
      this.threeViewer.dispose();
      this.threeViewer = null;
    }
    if (this.heroGradientAnimationId !== null) {
      window.cancelAnimationFrame(this.heroGradientAnimationId);
      this.heroGradientAnimationId = null;
    }
    if (this.escKeyHandler) {
      window.removeEventListener('keydown', this.escKeyHandler);
      this.escKeyHandler = null;
    }
    if (this.logoutDocHandler) {
      document.removeEventListener('click', this.logoutDocHandler, true);
      this.logoutDocHandler = null;
    }
    // Abort any logout listeners registered with AbortController
    this.logoutControllers.forEach(c => c.abort());
    this.logoutControllers = [];
    this.activeFurniture = null;
  }

  private initMouseFollower(): void {
    // Stub method for mouse follower functionality
    // TODO: Implement mouse follower animation if needed
  }

  private typeWordByWord(texts: string[], elementIds: string[], container: HTMLElement): void {
    // Stub method for typing animation
    // For now, just set the text content directly
    texts.forEach((text, index) => {
      if (elementIds[index]) {
        const el = container.querySelector(`#${elementIds[index]}`) as HTMLElement | null;
        if (el) {
          el.textContent = text;
        }
      }
    });
  }

  private addAIMessage(message: string): void {
    // Stub method for adding AI messages to chat
    // Find the chatbox messages container and add a message
    const messagesContainer = this.appElement.querySelector('#chatbox-messages') as HTMLElement | null;
    if (messagesContainer) {
      const messageEl = document.createElement('div');
      messageEl.className = 'chat-message ai-message';
      messageEl.textContent = message;
      messagesContainer.appendChild(messageEl);
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private addAIMessageWithFormatting(message: string): void {
    // Stub method for adding formatted AI messages (with markdown-like formatting)
    // For now, do basic replacement of **text** to <strong>text</strong> and [link](url) to <a>
    const messagesContainer = this.appElement.querySelector('#chatbox-messages') as HTMLElement | null;
    if (messagesContainer) {
      const messageEl = document.createElement('div');
      messageEl.className = 'chat-message ai-message';
      
      // Basic markdown-like formatting
      let formattedMessage = message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      
      messageEl.innerHTML = formattedMessage;
      messagesContainer.appendChild(messageEl);
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private initHeroAnimation(): void {
    const hero = this.appElement.querySelector<HTMLElement>('.hero-animate');
    if (!hero) return;

    // Small delay before triggering the side-switch animation
    window.setTimeout(() => {
      hero.classList.add('hero-animate--swapped');
    }, 500);

    // Ensure any previous gradient animation is stopped
    if (this.heroGradientAnimationId !== null) {
      window.cancelAnimationFrame(this.heroGradientAnimationId);
      this.heroGradientAnimationId = null;
    }

    // Reset gradient angle to a static 10deg
    hero.style.setProperty('--hero-gradient-angle', '10deg');
  }

  private getPageContent(): string {
    const isSignedIn = !!this.currentUserId;
    const authLabel = isSignedIn && this.currentUserName
      ? `Hello, ${this.currentUserName}`
      : 'Sign in';
    const authTargetPage: PageName = isSignedIn ? 'profile' : 'signin';

    const navigation = `
      <nav class="navigation">
        <div class="navigation-tabs">
          <button class="nav-btn ${this.currentPage === 'main' ? 'active' : ''}" data-page="main">
            Main
          </button>
          <button class="nav-btn ${this.currentPage === 'demo' ? 'active' : ''}" data-page="demo">
            Demo
          </button>
        </div>
        <button class="nav-signin" data-page="${authTargetPage}">${authLabel}</button>
        <button class="nav-burger" aria-label="Open menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div class="nav-drawer" aria-hidden="true">
          <button class="nav-drawer__item" data-page="main">Main</button>
          <button class="nav-drawer__item" data-page="demo">Demo</button>
          <button class="nav-drawer__item" data-page="${authTargetPage}">${authLabel}</button>
        </div>
      </nav>
    `;

    const mouseFollower = `<div class="mouse-follower"></div>`;

    let pageContent: string;
    switch (this.currentPage) {
      case 'main':
        pageContent = this.getMainPageContent();
        break;
      case 'demo':
        pageContent = this.getDemoPageContent();
        break;
      case 'signin':
        pageContent = this.getSignInPageContent();
        break;
      case 'signup':
        pageContent = this.getSignUpPageContent();
        break;
      case 'checkout':
        pageContent = this.getCheckoutPageContent();
        break;
      case 'profile':
        pageContent = this.getProfilePageContent();
        break;
      default:
        pageContent = this.getMainPageContent();
    }

    return navigation + pageContent + mouseFollower;
  }

  private getMainPageContent(): string {
    return `
      <div class="page main-page">
        <main class="landing">
          <div class="landing-shell">
            <header class="landing-header">
              <div class="landing-kicker">
                <span class="landing-kicker__label">ARTINTECH GROUP</span>
                <span class="landing-kicker__meta">Spatial AI studio</span>
              </div>
              <h1 class="landing-title">
                Turn your blueprints<br />
                into 3D living Space
              </h1>
              <p class="landing-lead">
                Upload the quiet lines of your floor plan and watch them open into living space.
                ArtInTech lets you walk through tomorrow’s rooms today, rearrange walls with a click,
                and try on furniture, light, and layout until your house feels exactly like home.
              </p>
            </header>
          </div>

          <section class="landing-hero-fixed">
            <img
              src="./components/hero components/hero_background.png"
              alt="Modern custom home with pool"
            />
          </section>
        </main>
      </div>
    `;
  }

  private getSignInPageContent(): string {
    return `
      <div class="page auth-page">
        <section class="auth-hero-fixed">
          <img
            src="./components/hero components/signin_background.png"
            alt="Architectural sketch background"
          />
        </section>
        <main class="auth-shell">
          <section class="auth-card">
            <h1 class="auth-title">Sign in</h1>
            <p class="auth-subtitle">
              Pick up where you left off, and keep shaping the rooms you\u2019re dreaming of.
            </p>
            <form class="auth-form" novalidate>
              <label class="auth-field">
                <span>Email</span>
                <input type="email" placeholder="you@example.com" />
              </label>
              <label class="auth-field">
                <span>Password</span>
                <div class="auth-password">
                  <input type="password" placeholder="••••••••" />
                  <button
                    type="button"
                    class="auth-password-toggle"
                    aria-label="Show password"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M12 5C7 5 3.1 8.1 2 12c1.1 3.9 5 7 10 7s8.9-3.1 10-7c-1.1-3.9-5-7-10-7z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                      />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </label>
              <p class="auth-error" id="auth-error" aria-live="polite"></p>
              <button type="submit" class="auth-primary-btn">Continue</button>
              <button type="button" class="auth-secondary-btn" id="signup-disabled-btn">
                Create a new account
              </button>
            </form>
            <div class="auth-divider" style="display: none;">
              <span>or</span>
            </div>
            <button type="button" class="auth-google-btn" style="display: none;">
              <span class="auth-google-icon"></span>
              <span>Continue with Google</span>
            </button>
          </section>
        </main>
        <div class="signup-modal" id="signup-modal" aria-hidden="true">
          <div class="signup-modal__backdrop"></div>
          <div class="signup-modal__dialog" role="dialog" aria-modal="true">
            <header class="signup-modal__header">
              <h2>Contact Us to Sign Up</h2>
              <button class="signup-modal__close" id="close-signup-modal" aria-label="Close">&times;</button>
            </header>
            <div class="signup-modal__content">
              <p>If you want to sign up contact us:</p>
              <div class="signup-modal__contact">
                <div class="signup-modal__contact-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span>+995 555 42 29 77</span>
                </div>
                <div class="signup-modal__contact-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span>zarandiagiorgi54@gmail.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getSignUpPageContent(): string {
    return `
      <div class="page auth-page">
        <section class="auth-hero-fixed">
          <img
            src="./components/hero components/signin_background.png"
            alt="Architectural sketch background"
          />
        </section>
        <main class="auth-shell">
          <section class="auth-card">
            <h1 class="auth-title">Create your account</h1>
            <p class="auth-subtitle">
              Save floor plans, revisit layouts, and collect furniture ideas in one quiet place.
            </p>
            <form class="auth-form">
              <label class="auth-field">
                <span>Full name</span>
                <input type="text" placeholder="Name and surname" />
              </label>
              <label class="auth-field">
                <span>Email</span>
                <input type="email" placeholder="you@example.com" />
              </label>
              <label class="auth-field">
                <span>Password</span>
                <div class="auth-password">
                  <input type="password" placeholder="Create a password" />
                  <button
                    type="button"
                    class="auth-password-toggle"
                    aria-label="Show password"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M12 5C7 5 3.1 8.1 2 12c1.1 3.9 5 7 10 7s8.9-3.1 10-7c-1.1-3.9-5-7-10-7z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                      />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </label>
              <button type="submit" class="auth-primary-btn">Sign up</button>
              <button type="button" class="auth-secondary-btn" data-page="signin">
                Already have an account? Sign in
              </button>
            </form>
          </section>
        </main>
      </div>
    `;
  }

  private getCheckoutPageContent(): string {
    const hasItems = this.furnitureSnapshots.length > 0;

    const emptyState = `
      <div class="checkout-empty">
        <p>No furniture placed yet.</p>
        <button type="button" class="auth-secondary-btn" data-page="demo">Back to demo</button>
      </div>
    `;

    const listSkeleton = `
      <div class="checkout-items-list" id="checkout-items-list">
        ${hasItems ? '' : emptyState}
      </div>
    `;

    const summary = `
      <div class="checkout-totals">
        <div class="checkout-totals__row checkout-totals__row--subtotal">
          <span class="checkout-totals__op">&nbsp;</span>
          <span>Subtotal</span>
          <span id="checkout-subtotal">₾0</span>
        </div>
        <div class="checkout-totals__row checkout-totals__row--tax">
          <span class="checkout-totals__op">+</span>
          <span>Tax (18%)</span>
          <span id="checkout-tax">₾0</span>
        </div>
        <div class="checkout-totals__row checkout-totals__row--total">
          <span class="checkout-totals__op">=</span>
          <span>Total</span>
          <span id="checkout-total">₾0</span>
        </div>
        <div class="checkout-actions">
          <button type="button" class="auth-secondary-btn" data-page="demo">
            Back to demo
          </button>
          <button type="button" class="auth-primary-btn">
            Place order
          </button>
        </div>
      </div>
    `;

    return `
      <div class="page checkout-page">
        <section class="demo-hero-fixed">
          <img
            src="./components/hero components/demo_background.png"
            alt="Forest and mountains background"
          />
        </section>
        <main class="checkout-shell">
          <section class="checkout-layout">
            <div class="checkout-card checkout-panel">
              <h1 class="checkout-title">Checkout</h1>
              <p class="checkout-subtitle">
                Every piece you placed is listed here. Adjust in the demo anytime.
              </p>
              ${listSkeleton}
            </div>
            <div class="checkout-card checkout-panel checkout-summary-card">
              <h2 class="checkout-title">Summary</h2>
              <p class="checkout-subtitle">Totals based on your placed furniture.</p>
              ${summary}
            </div>
          </section>
        </main>
      </div>
    `;
  }

  private getProfilePageContent(): string {
    const name = this.currentUserName ?? 'there';
    return `
      <div class="page auth-page profile-page">
        <section class="demo-hero-fixed">
          <img
            src="./components/hero components/demo_background.png"
            alt="Forest and mountains background"
          />
        </section>
        <main class="profile-shell">
          <div class="profile-container">
            <header class="profile-header">
              <div class="profile-welcome">
                <h1 class="profile-title">Welcome back, ${name}</h1>
                <p class="profile-subtitle">Manage your account and subscription</p>
              </div>
              <div class="profile-header-actions">
                <button type="button" class="profile-action-btn" data-page="checkout">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 2H4a2 2 0 0 0-2 2v5m0 9v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3M3 10h18M7 15h3"/>
                  </svg>
                  Checkout
                </button>
                <button type="button" class="profile-action-btn auth-logout-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  Log out
                </button>
              </div>
            </header>

            <section class="profile-section profile-plans-section">
              <div class="profile-plans-header">
                <h2 class="profile-section-title">Choose Your Plan</h2>
                <p class="profile-plans-note">Upgrade to Premium to upload blueprints and generate AI house models</p>
              </div>
              <div class="profile-plans-grid">
                <div class="profile-plan-card">
                  <div class="profile-plan-badge">Current</div>
                  <h3 class="profile-plan-name">Free</h3>
                  <div class="profile-plan-price">₾0</div>
                  <p class="profile-plan-description">Explore the demo and basic furniture placement</p>
                  <ul class="profile-plan-features">
                    <li>3D demo viewer</li>
                    <li>Furniture placement</li>
                    <li>Sample floor plans</li>
                  </ul>
                </div>

                <div class="profile-plan-card profile-plan-card-premium">
                  <div class="profile-plan-badge profile-plan-badge-premium">Popular</div>
                  <h3 class="profile-plan-name">Premium</h3>
                  <div class="profile-plan-price">
                    ₾10
                    <span class="profile-plan-uses">5 uses</span>
                  </div>
                  <p class="profile-plan-description">Upload blueprints and generate AI models</p>
                  <ul class="profile-plan-features">
                    <li>Everything in Free</li>
                    <li>Blueprint uploads</li>
                    <li>5 AI generations</li>
                    <li>Priority support</li>
                  </ul>
                  <button class="profile-plan-btn">Upgrade to Premium</button>
                </div>

                <div class="profile-plan-card">
                  <div class="profile-plan-badge profile-plan-badge-plus">Best Value</div>
                  <h3 class="profile-plan-name">Premium Plus</h3>
                  <div class="profile-plan-price">
                    ₾20
                    <span class="profile-plan-uses">12 uses</span>
                  </div>
                  <p class="profile-plan-description">Maximum AI generations for power users</p>
                  <ul class="profile-plan-features">
                    <li>Everything in Premium</li>
                    <li>12 AI generations</li>
                    <li>Advanced customization</li>
                    <li>Dedicated support</li>
                  </ul>
                  <button class="profile-plan-btn">Upgrade to Plus</button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    `;
  }

  private getDemoPageContent(): string {
    const planCards = this.demoPlans.map(plan => {
      const detailParts = [
        `${plan.stats.area} m2`,
        `${plan.stats.beds} bd`,
        `${plan.stats.baths} ba`
      ];
      if (plan.stats.levels) {
        detailParts.push(`${plan.stats.levels} lvl`);
      }
      const highlights = plan.highlights.map(item => `<li>${item}</li>`).join('');
    return `
        <button class="plan-card" data-plan="${plan.id}">
          <div class="plan-card__header">
            <span class="plan-card__name">${plan.name}</span>
            <span class="plan-card__metric">${plan.stats.area} m2</span>
                </div>
          <p class="plan-card__description">${plan.description}</p>
          <div class="plan-card__details">
            ${detailParts.map(detail => `<span>${detail}</span>`).join('')}
              </div>
          <ul class="plan-card__highlights">
            ${highlights}
          </ul>
        </button>
      `;
    }).join('');

    const furnitureCards = this.demoFurnitureOptions.map(item => `
      <button class="furniture-card" data-furniture="${item.id}">
        <div class="furniture-card__icon">
          <img src="./components/icons/${item.icon}" alt="${item.name} icon" />
        </div>
        <div class="furniture-card__body">
          <div class="furniture-card__name">${item.name}</div>
          <div class="furniture-card__price">${item.price}</div>
        </div>
      </button>
    `).join('');

    return `
      <div class="page demo-page">
        <section class="demo-hero-fixed">
          <img
            src="./components/hero components/demo_background.png"
            alt="Forest and mountains background"
          />
        </section>
        <div class="demo-mobile-message">
          <div class="demo-mobile-card">
            <h2>Demo unavailable on mobile</h2>
            <p>Please use a desktop or larger screen to access the interactive demo.</p>
          </div>
        </div>
        <div class="demo-layout">
          <section class="demo-viewer">
            <div class="viewer-section" id="viewer-section">
              <div class="model-viewport">
                <div class="model-container" id="model-display">
                  <div class="selection-overlay">
                    <div class="viewer-summary viewer-summary--compact">
                      <div class="viewer-summary__name" id="active-plan-name">Select a plan</div>
                      <button class="viewer-summary__action" id="open-plan-modal">
                        Choose plan
                      </button>
                    </div>
                    <div class="selection-controls" id="selection-controls" hidden>
                      <button class="selection-btn" id="selection-move" aria-label="Move furniture">
                        <span class="icon icon-move"></span>
                      </button>
                      <button class="selection-btn" id="selection-rotate-left" aria-label="Rotate left">
                        <span class="icon icon-rotate-left"></span>
                      </button>
                      <button class="selection-btn" id="selection-rotate-right" aria-label="Rotate right">
                        <span class="icon icon-rotate-right"></span>
                      </button>
                      <button class="selection-btn" id="selection-delete" aria-label="Delete furniture">
                        <span class="icon icon-delete"></span>
                      </button>
                      <div class="selection-color">
                        <button class="selection-btn" id="selection-color" aria-label="Change color">
                          <span class="selection-color-dot" id="selection-color-dot"></span>
                        </button>
                        <div class="selection-color-palette" id="selection-color-palette" hidden>
                          <button class="selection-color-swatch selection-color-swatch-default" data-color="__default__" aria-label="Default"></button>
                          <button class="selection-color-swatch" data-color="#ffffff" aria-label="White"></button>
                          <button class="selection-color-swatch" data-color="#d0d0d0" aria-label="Light grey"></button>
                          <button class="selection-color-swatch" data-color="#888888" aria-label="Mid grey"></button>
                          <button class="selection-color-swatch" data-color="#333333" aria-label="Dark grey"></button>
                          <button class="selection-color-swatch" data-color="#c28b5c" aria-label="Warm wood"></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="viewer-overlay"></div>
              </div>
            </div>
          </section>
          <aside class="demo-panel furniture-panel">
            <header class="panel-header">
              <h2>Furniture Library</h2>
            </header>
            <div class="furniture-grid">
              ${furnitureCards}
            </div>
            <div class="furniture-footer">
              <div class="furniture-summary" id="furniture-summary">No items placed</div>
              <div class="furniture-total" id="furniture-total">Total: ₾0</div>
              <button class="furniture-checkout-btn" id="furniture-checkout" disabled>Checkout</button>
            </div>
          </aside>
        </div>
      </div>
      <div class="plan-modal" id="plan-modal" aria-hidden="true">
        <div class="plan-modal__backdrop"></div>
        <div class="plan-modal__dialog" role="dialog" aria-modal="true">
          ${!this.currentUserId ? `
            <div class="plan-gate" id="plan-gate">
              <div class="plan-gate__card">
                <h3>Please sign in</h3>
                <p>You need to sign in before choosing a floor plan.</p>
                <button class="auth-primary-btn" data-page="signin">Sign in</button>
              </div>
            </div>
          ` : ''}
          <header class="plan-modal__header">
            <div>
              <h2>Select a floor plan</h2>
              <p>Choose one of our sample layouts to explore in 3D.</p>
            </div>
            <button class="plan-modal__close" id="close-plan-modal" aria-label="Close plan selector">&times;</button>
          </header>
          <div class="plan-modal__content">
            <div class="plan-grid">
              ${planCards}
            </div>
            <div class="plan-modal__footer">
              <p class="plan-modal__upgrade-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <polyline points="13 2 13 9 20 9"/>
                </svg>
                To upload your blueprint, <button class="plan-modal__upgrade-link" data-page="profile">upgrade to Premium</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Any element with data-page acts as a router link (Main, Demo, Sign in, etc.)
    const routeLinks = this.appElement.querySelectorAll<HTMLElement>('[data-page]');
    routeLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        const page = target.getAttribute('data-page') as PageName | null;
        if (page) {
          this.navigateTo(page);
        }
      });
    });

    // Burger menu toggle (mobile)
    const burger = this.appElement.querySelector<HTMLElement>('.nav-burger');
    const drawer = this.appElement.querySelector<HTMLElement>('.nav-drawer');
    if (burger && drawer) {
      burger.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('open');
        burger.classList.toggle('open');
        drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      });
      drawer.querySelectorAll<HTMLElement>('[data-page]').forEach(item => {
        item.addEventListener('click', () => {
          drawer.classList.remove('open');
          burger.classList.remove('open');
          drawer.setAttribute('aria-hidden', 'true');
        });
      });
    }

    // Wire up password visibility toggles on auth pages
    this.attachPasswordVisibilityToggles();

    // Global logout buttons (e.g., in profile header)
    this.bindLogoutButtons();

    // Page-specific wiring
    if (this.currentPage === 'demo') {
      void this.attachDemoEventListeners();
    } else if (this.currentPage === 'signin') {
      this.attachSignInListeners();
    } else if (this.currentPage === 'signup') {
      this.attachSignUpListeners();
    } else if (this.currentPage === 'profile') {
      this.attachProfileListeners();
    } else if (this.currentPage === 'checkout') {
      this.renderCheckoutDetails();
    }
  }

  private bindLogoutButtons(): void {
    // Capture-phase listener on document ensures we catch buttons inside shadowed or re-rendered nodes
    if (this.logoutDocHandler) {
      document.removeEventListener('click', this.logoutDocHandler, true);
      this.logoutDocHandler = null;
    }
    this.logoutDocHandler = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const btn = target?.closest('.auth-logout-btn') as HTMLButtonElement | null;
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      void this.handleLogout(btn);
    };
    document.addEventListener('click', this.logoutDocHandler, true);
  }

  private async handleLogout(target?: HTMLButtonElement | null): Promise<void> {
    if (target) target.disabled = true;
    try {
      // Use global scope to ensure all sessions are cleared
      // (Supabase v2 signOut accepts an options object)
      await supabase.auth.signOut({ scope: 'global' } as any);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
    } finally {
      this.currentUserId = null;
      this.currentUserName = null;
      this.currentPage = 'signin';
      window.location.hash = 'signin';
      this.render();
      if (target) target.disabled = false;
    }
  }

  private renderCheckoutDetails(): void {
    const list = this.appElement.querySelector('#checkout-items-list') as HTMLElement | null;
    const subtotalEl = this.appElement.querySelector('#checkout-subtotal') as HTMLElement | null;
    const taxEl = this.appElement.querySelector('#checkout-tax') as HTMLElement | null;
    const totalEl = this.appElement.querySelector('#checkout-total') as HTMLElement | null;

    const formatMoney = (value: number) => `₾${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

    if (list) {
      list.innerHTML = '';
      if (!this.furnitureSnapshots.length) {
        const empty = document.createElement('div');
        empty.className = 'checkout-empty';
        empty.innerHTML = `
          <p>No furniture placed yet.</p>
          <button type="button" class="auth-secondary-btn" data-page="demo">Back to demo</button>
        `;
        list.appendChild(empty);
      } else {
        this.furnitureSnapshots.forEach(item => {
          const option = this.demoFurnitureOptions.find(o => o.id === item.type);
          if (!option) return;
          const row = document.createElement('div');
          row.className = 'checkout-item';
          row.innerHTML = `
            <div class="checkout-item__left">
              <div class="checkout-item__thumb">
                <img src="./components/icons/${option.icon}" alt="${option.name}" />
              </div>
              <div class="checkout-item__label">
                <span class="checkout-item__name">${option.name}</span>
                <span class="checkout-item__meta">Rotation ${Math.round(((item.rotation * 180) / Math.PI + 360) % 360)}&deg;</span>
              </div>
            </div>
            <div class="checkout-item__price">${option.price}</div>
          `;
          list.appendChild(row);
        });
      }
    }

    let subtotal = 0;
    for (const item of this.furnitureSnapshots) {
      const option = this.demoFurnitureOptions.find(o => o.id === item.type);
      if (!option) continue;
      const numeric = parseFloat(option.price.replace(/[^\d.]/g, ''));
      if (!Number.isNaN(numeric)) subtotal += numeric;
    }
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
    if (taxEl) taxEl.textContent = formatMoney(tax);
    if (totalEl) totalEl.textContent = formatMoney(total);
  }

  private attachPasswordVisibilityToggles(): void {
    const toggles = this.appElement.querySelectorAll<HTMLButtonElement>('.auth-password-toggle');
    toggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const wrapper = btn.closest('.auth-password');
        const input = wrapper?.querySelector<HTMLInputElement>('input');
        if (!input) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        btn.classList.toggle('auth-password-toggle--visible', isHidden);
      });
    });
  }

  private async refreshAuthState(): Promise<void> {
    try {
      // Ensure any pending OAuth redirect (e.g. Google) is exchanged for a session
      // before we ask for the current user. This is especially important right
      // after returning from the Google consent screen.
      try {
        await supabase.auth.getSession();
      } catch {
        // ignore session errors here; getUser below will reflect the real state
      }

      const { data, error } = await supabase.auth.getUser();
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to get Supabase user', error);
        this.currentUserId = null;
        this.currentUserName = null;
        return;
      }

      const user = data.user;
      if (!user) {
        this.currentUserId = null;
        this.currentUserName = null;
        return;
      }

      this.currentUserId = user.id;

      // Try to load profile.full_name first
      let fullName: string | null = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (profile && typeof profile.full_name === 'string' && profile.full_name.trim()) {
          fullName = profile.full_name.trim();
        }
      } catch {
        // ignore profile errors
      }

      if (!fullName) {
        const metaName = (user.user_metadata as any)?.full_name as string | undefined;
        if (metaName && metaName.trim()) {
          fullName = metaName.trim();
        } else if (user.email) {
          // Fallback: use the part of the email before @ so header still shows a greeting
          fullName = user.email.split('@')[0] ?? null;
        }
      }

      this.currentUserName = fullName;
    } finally {
      // If we already have a valid session, don't leave the user stranded
      // on auth-only pages – send them back to home.
      if (
        this.currentUserId &&
        (this.currentPage === 'signin' || this.currentPage === 'signup')
      ) {
        this.currentPage = 'main';
        window.location.hash = 'main';
      }
      // Re-render header/page with updated auth state
      this.render();
    }
  }

  private attachSignInListeners(): void {
    const form = this.appElement.querySelector<HTMLFormElement>('.auth-form');
    const googleBtn = this.appElement.querySelector<HTMLButtonElement>('.auth-google-btn');
    const errorEl = this.appElement.querySelector<HTMLElement>('#auth-error');
    const signupBtn = this.appElement.querySelector<HTMLButtonElement>('#signup-disabled-btn');
    const signupModal = this.appElement.querySelector<HTMLElement>('#signup-modal');
    const closeSignupModal = this.appElement.querySelector<HTMLButtonElement>('#close-signup-modal');
    const signupModalBackdrop = this.appElement.querySelector<HTMLElement>('.signup-modal__backdrop');
    if (!form) return;

    // Intercept signup button click to show modal instead of navigating
    if (signupBtn && signupModal) {
      signupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        signupModal.setAttribute('aria-hidden', 'false');
        signupModal.style.display = 'block';
      });
    }

    // Close modal handlers
    const closeModal = () => {
      if (signupModal) {
        signupModal.setAttribute('aria-hidden', 'true');
        signupModal.style.display = 'none';
      }
    };

    if (closeSignupModal) {
      closeSignupModal.addEventListener('click', closeModal);
    }

    if (signupModalBackdrop) {
      signupModalBackdrop.addEventListener('click', closeModal);
    }

    // Close on ESC key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && signupModal && signupModal.getAttribute('aria-hidden') === 'false') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEsc);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorEl) {
        errorEl.textContent = '';
      }
      const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]');
      const passwordInput = form.querySelector<HTMLInputElement>('input[type="password"]');
      if (!emailInput || !passwordInput) return;

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        if (errorEl) {
          errorEl.textContent = 'Please enter both email and password.';
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      // Always refresh auth state so we know for sure if there is a session
      await this.refreshAuthState();

      if (!this.currentUserId) {
        // No valid session after attempting sign-in → stay on page and show error
        if (errorEl) {
          errorEl.textContent =
            error?.message || 'Email or password is incorrect.';
        }
        return;
      }

      // If we do have a session (user is signed in), force navigation to home
      this.currentPage = 'main';
      window.location.hash = 'main';
      this.render();
    });

    // Google sign-in is disabled - keep the code but don't attach listener
    // if (googleBtn) {
    //   googleBtn.addEventListener('click', async () => {
    //     if (errorEl) {
    //       errorEl.textContent = '';
    //     }
    //     const { error } = await supabase.auth.signInWithOAuth({
    //       provider: 'google',
    //       options: {
    //         // Use origin+pathname so Supabase can append ?code=... and we still
    //         // land back on this SPA (hash routing continues to work afterward).
    //         redirectTo: `${window.location.origin}${window.location.pathname}`
    //       }
    //     });
    //     if (error) {
    //       if (errorEl) {
    //         errorEl.textContent = 'Google sign-in failed. Please try again.';
    //       }
    //     }
    //   });
    // }
  }

  private attachSignUpListeners(): void {
    const form = this.appElement.querySelector<HTMLFormElement>('.auth-form');
    if (!form) return;

    // Signup is disabled - prevent form submission and redirect to signin
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Redirect to signin page instead
      this.currentPage = 'signin';
      window.location.hash = 'signin';
      this.render();
    });

    // Original signup code kept but disabled:
    // form.addEventListener('submit', async (e) => {
    //   e.preventDefault();
    //   const fullNameInput = form.querySelector<HTMLInputElement>('input[type="text"]');
    //   const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]');
    //   const passwordInput = form.querySelector<HTMLInputElement>('input[type="password"]');
    //   if (!emailInput || !passwordInput) return;

    //   const email = emailInput.value.trim();
    //   const password = passwordInput.value;
    //   const fullName = fullNameInput?.value.trim() ?? '';
    //   if (!email || !password) return;

    //   const { data, error } = await supabase.auth.signUp({ email, password });
    //   if (error) {
    //     // eslint-disable-next-line no-alert
    //     alert(error.message);
    //     return;
    //   }
    //   // Store full name in profiles table if provided
    //   if (data.user && fullName) {
    //     try {
    //       await supabase
    //         .from('profiles')
    //         .upsert({ id: data.user.id, full_name: fullName }, { onConflict: 'id' });
    //     } catch {
    //       // ignore profile errors in UI
    //     }
    //   }
    //   await this.refreshAuthState();
    //   // After successful sign-up, force navigation to home (main page)
    //   this.currentPage = 'main';
    //   window.location.hash = 'main';
    //   this.render();
    // });
  }

  private attachProfileListeners(): void {
    // (Logout handled globally in attachEventListeners)
  }

  private async attachDemoEventListeners(): Promise<void> {
    const viewerSection = this.appElement.querySelector('#viewer-section') as HTMLElement | null;
    const container = this.appElement.querySelector('#model-display') as HTMLElement | null;
    if (!container) return;
    if (viewerSection) {
      viewerSection.style.display = 'block';
    }

    const viewer = await this.ensureThreeViewer(container);
    if (!viewer) return;

    const planModal = this.appElement.querySelector('#plan-modal') as HTMLElement | null;
    const modalBackdrop = planModal?.querySelector('.plan-modal__backdrop') as HTMLElement | null;
    const modalCloseBtn = this.appElement.querySelector('#close-plan-modal') as HTMLButtonElement | null;
    const modalOpenBtn = this.appElement.querySelector('#open-plan-modal') as HTMLButtonElement | null;
    const planButtons = Array.from(this.appElement.querySelectorAll<HTMLButtonElement>('#plan-modal .plan-card'));
    const furnitureButtons = Array.from(this.appElement.querySelectorAll<HTMLButtonElement>('.furniture-card'));
    const clearFurnitureBtn = this.appElement.querySelector('#clear-furniture') as HTMLButtonElement | null;
    const placedPanel = this.appElement.querySelector('#placed-furniture-panel') as HTMLElement | null;
    const placedList = this.appElement.querySelector('#placed-furniture-list') as HTMLElement | null;
    const placedCount = this.appElement.querySelector('#placed-furniture-count') as HTMLElement | null;
    const moveBtn = this.appElement.querySelector('#move-furniture-btn') as HTMLButtonElement | null;
    const rotateLeftBtn = this.appElement.querySelector('#rotate-left-btn') as HTMLButtonElement | null;
    const rotateRightBtn = this.appElement.querySelector('#rotate-right-btn') as HTMLButtonElement | null;
    const selectionControls = this.appElement.querySelector('#selection-controls') as HTMLElement | null;
    const selectionMoveBtn = this.appElement.querySelector('#selection-move') as HTMLButtonElement | null;
    const selectionRotateLeftBtn = this.appElement.querySelector('#selection-rotate-left') as HTMLButtonElement | null;
    const selectionRotateRightBtn = this.appElement.querySelector('#selection-rotate-right') as HTMLButtonElement | null;
    const selectionDeleteBtn = this.appElement.querySelector('#selection-delete') as HTMLButtonElement | null;
    const selectionColorBtn = this.appElement.querySelector('#selection-color') as HTMLButtonElement | null;
    const selectionColorPalette = this.appElement.querySelector('#selection-color-palette') as HTMLElement | null;
    const selectionColorDot = this.appElement.querySelector('#selection-color-dot') as HTMLElement | null;
    const planGate = this.appElement.querySelector('#plan-gate') as HTMLElement | null;

    // If not signed in, show gate and disable plan selection
    if (!this.currentUserId) {
      planButtons.forEach(btn => btn.setAttribute('disabled', 'true'));
      if (planGate) planGate.style.display = 'flex';
    } else {
      planButtons.forEach(btn => btn.removeAttribute('disabled'));
      if (planGate) planGate.style.display = 'none';
    }

    viewer.setFurnitureCallbacks({
      onUpdate: ({ items, selectedId, interaction }) => {
        this.updatePlacedFurnitureUI({
          items,
          selectedId,
          interaction,
          panel: placedPanel,
          list: placedList,
          countEl: placedCount,
          moveBtn,
          rotateLeftBtn,
          rotateRightBtn,
          selectionControls,
          selectionMoveBtn,
          selectionRotateLeftBtn,
          selectionRotateRightBtn,
          selectionDeleteBtn,
          selectionColorBtn,
          selectionColorPalette,
          selectionColorDot,
          viewer,
        });
      }
    });

    // When the user starts zooming (mouse wheel / trackpad) anywhere in the viewer
    // section, prevent the page from zooming/scrolling and clear any active
    // furniture selection so the overlay controls don't get in the way.
    if (viewerSection) {
      const wheelHandler = (event: WheelEvent) => {
        // Treat any wheel event here as an intent to zoom the 3D view.
        // Prevent default so the page itself doesn't zoom/scroll.
        event.preventDefault();
        if (this.selectedFurnitureInstanceId) {
          viewer.clearSelectedFurniture();
        }
      };
      viewerSection.addEventListener('wheel', wheelHandler, { passive: false });
    }

    this.currentPlan = null;
    this.currentPlanId = null;

    const syncPlanSelection = () => {
      const activeId = this.currentPlanId;
      planButtons.forEach(btn => {
        const matches = btn.getAttribute('data-plan') === activeId;
        btn.classList.toggle('selected', matches);
      });
    };

    const setModalState = (open: boolean) => {
      if (!planModal) return;
      planModal.classList.toggle('open', open);
      planModal.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        syncPlanSelection();
      }
    };

    const attemptCloseModal = () => {
      if (!this.currentPlanId) return;
      setModalState(false);
    };

    const applyFurnitureSelection = (id: DemoFurnitureId | null) => {
      this.activeFurniture = id;
      furnitureButtons.forEach(btn => {
        const matches = btn.getAttribute('data-furniture') === id;
        btn.classList.toggle('selected', matches);
      });
      viewer.setActiveFurniture(id);
      const option = this.getFurnitureOption(id) ?? null;
      this.updateFurnitureStatus(option);
    };

    const loadPlan = async (plan: DemoPlanConfig) => {
      if (this.currentPlanId === plan.id) {
        attemptCloseModal();
        return;
      }
      this.currentPlanId = plan.id;
      this.currentPlan = plan.plan;
      if (plan.staticModelBase) {
        await viewer.loadStaticHouseModel(plan.staticModelBase);
      } else {
        await viewer.loadPlan(plan.plan);
      }
      this.updateActivePlanSummary(plan);
      applyFurnitureSelection(null);
      syncPlanSelection();
      setModalState(false);
    };

    viewer.clearFurniture();
    applyFurnitureSelection(null);
    this.updateActivePlanSummary(null);
    setModalState(true);

    planButtons.forEach(button => {
      button.addEventListener('click', () => {
        const planId = button.getAttribute('data-plan');
        if (!planId) return;
        const plan = this.demoPlans.find(entry => entry.id === planId);
        if (!plan) return;
        void loadPlan(plan);
      });
    });

    furnitureButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (!this.currentPlanId) {
          setModalState(true);
          return;
        }
        const furnitureId = button.getAttribute('data-furniture') as DemoFurnitureId | null;
        if (!furnitureId) return;
        const isActive = button.classList.contains('selected');
        applyFurnitureSelection(isActive ? null : furnitureId);
      });
    });

    // Allow ESC key to clear active furniture / interaction while on the demo page
    if (this.escKeyHandler) {
      window.removeEventListener('keydown', this.escKeyHandler);
      this.escKeyHandler = null;
    }

    this.escKeyHandler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // If we're on a different page now, ignore
      if (this.currentPage !== 'demo') return;
      // Clear active furniture placement mode
      if (this.activeFurniture) {
        applyFurnitureSelection(null);
      }
      // Cancel any in-progress move or selection overlay
      viewer.cancelInteraction();
      if (this.selectedFurnitureInstanceId) {
        viewer.clearSelectedFurniture();
      }
    };
    window.addEventListener('keydown', this.escKeyHandler);

    placedList?.addEventListener('click', (event) => {
       const deleteTrigger = (event.target as HTMLElement).closest('.placed-furniture-delete') as HTMLElement | null;
       if (deleteTrigger) {
         const row = deleteTrigger.closest('.placed-furniture-item') as HTMLElement | null;
         const furnitureId = row?.getAttribute('data-id');
         if (!furnitureId) return;
         viewer.cancelInteraction();
         viewer.removeFurniture(furnitureId);
         applyFurnitureSelection(null);
         return;
       }
       const selectTrigger = (event.target as HTMLElement).closest('.placed-furniture-select') as HTMLElement | null;
       if (!selectTrigger) return;
       const row = selectTrigger.closest('.placed-furniture-item') as HTMLElement | null;
       const furnitureId = row?.getAttribute('data-id');
       if (!furnitureId) return;
       applyFurnitureSelection(null);
       viewer.cancelInteraction();
       viewer.selectFurniture(furnitureId);
     });

    moveBtn?.addEventListener('click', () => {
      if (!this.currentPlanId) return;
      if (this.furnitureInteractionState === 'moving') {
        viewer.cancelInteraction();
      } else {
        void viewer.beginMoveSelected();
      }
    });

    rotateLeftBtn?.addEventListener('click', () => {
      if (!this.currentPlanId || this.furnitureInteractionState === 'moving') return;
      viewer.rotateSelected(-15);
    });

    rotateRightBtn?.addEventListener('click', () => {
      if (!this.currentPlanId || this.furnitureInteractionState === 'moving') return;
      viewer.rotateSelected(15);
    });

    clearFurnitureBtn?.addEventListener('click', () => {
      if (!this.currentPlanId) return;
      viewer.clearFurniture();
      applyFurnitureSelection(null);
    });

    selectionMoveBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!this.currentPlanId || !this.selectedFurnitureInstanceId) return;
      if (this.furnitureInteractionState === 'moving') {
        viewer.cancelInteraction();
      } else {
        void viewer.beginMoveSelected();
      }
    });

    selectionRotateLeftBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!this.currentPlanId || !this.selectedFurnitureInstanceId || this.furnitureInteractionState === 'moving') return;
      viewer.rotateSelected(-15);
    });

    selectionRotateRightBtn?.addEventListener('click', (event) => {
       event.stopPropagation();
       if (!this.currentPlanId || !this.selectedFurnitureInstanceId || this.furnitureInteractionState === 'moving') return;
       viewer.rotateSelected(15);
     });

    selectionDeleteBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!this.currentPlanId || !this.selectedFurnitureInstanceId) return;
      viewer.cancelInteraction();
      viewer.removeFurniture(this.selectedFurnitureInstanceId);
      applyFurnitureSelection(null);
    });

    if (selectionColorBtn && selectionColorPalette) {
      selectionColorBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!this.currentPlanId || !this.selectedFurnitureInstanceId || this.furnitureInteractionState === 'moving') return;
        selectionColorPalette.hidden = !selectionColorPalette.hidden;
      });

      const swatches = Array.from(selectionColorPalette.querySelectorAll<HTMLButtonElement>('[data-color]'));
      swatches.forEach(swatch => {
        swatch.addEventListener('click', (event) => {
          event.stopPropagation();
          if (!this.currentPlanId || !this.selectedFurnitureInstanceId) return;
          const color = swatch.getAttribute('data-color');
          if (!color) return;
          if (color === '__default__') {
            viewer.resetSelectedColors();
          } else {
            viewer.setSelectedColor(color);
          }
          const key = color === '__default__' ? '__default__' : color;
          this.furnitureColorByInstance.set(this.selectedFurnitureInstanceId, key);
          this.applyColorKeyToDot(selectionColorDot, key);
          selectionColorPalette.hidden = true;
        });
      });
    }

    const maintainSelectionOverlay = () => {
      if (!selectionControls || !selectionControls.isConnected) return;
      if (!selectionControls.hidden && this.selectedFurnitureInstanceId && viewer) {
        const snapshot = this.furnitureSnapshots.find(item => item.id === this.selectedFurnitureInstanceId);
        if (snapshot) {
          const screenPosition = viewer.projectToScreen(snapshot.position);
          if (screenPosition) {
            selectionControls.style.left = `${screenPosition.x}px`;
            selectionControls.style.top = `${screenPosition.y}px`;
          }
        }
      }
      requestAnimationFrame(maintainSelectionOverlay);
    };
    requestAnimationFrame(maintainSelectionOverlay);

    modalOpenBtn?.addEventListener('click', () => setModalState(true));
    modalCloseBtn?.addEventListener('click', attemptCloseModal);
    modalBackdrop?.addEventListener('click', attemptCloseModal);

    this.appElement.addEventListener('click', (event) => {
       if (this.furnitureInteractionState === 'moving') return;
       const target = event.target as HTMLElement;
       const clickedFurnitureControl = target.closest('.placed-furniture-item, .furniture-card, .placed-control-btn, .selection-controls, .selection-btn');
       const clickedViewer = target.closest('.three-canvas');
       if (clickedFurnitureControl || clickedViewer) return;
       if (this.selectedFurnitureInstanceId) {
         viewer.clearSelectedFurniture();
       }
    });
  }

  private updatePlacedFurnitureUI(params: {
    items: FurnitureSnapshot[];
    selectedId: string | null;
    interaction: FurnitureInteractionState;
    panel: HTMLElement | null;
    list: HTMLElement | null;
    countEl: HTMLElement | null;
    moveBtn: HTMLButtonElement | null;
    rotateLeftBtn: HTMLButtonElement | null;
    rotateRightBtn: HTMLButtonElement | null;
    selectionControls: HTMLElement | null;
    selectionMoveBtn: HTMLButtonElement | null;
    selectionRotateLeftBtn: HTMLButtonElement | null;
    selectionRotateRightBtn: HTMLButtonElement | null;
    selectionDeleteBtn: HTMLButtonElement | null;
    selectionColorBtn: HTMLButtonElement | null;
    selectionColorPalette: HTMLElement | null;
    selectionColorDot: HTMLElement | null;
    viewer: ThreeApartmentViewer | null;
  }): void {
    const {
      items,
      selectedId,
      interaction,
      panel,
      list,
      countEl,
      moveBtn,
      rotateLeftBtn,
      rotateRightBtn,
      selectionControls,
      selectionMoveBtn,
      selectionRotateLeftBtn,
      selectionRotateRightBtn,
      selectionDeleteBtn,
      selectionColorBtn,
      selectionColorPalette,
      selectionColorDot,
      viewer,
    } = params;

    this.furnitureSnapshots = items;
    this.selectedFurnitureInstanceId = selectedId;
    this.furnitureInteractionState = interaction;

    // Ensure we have a color entry for each existing item; clear out removed ones.
    const existingIds = new Set(items.map(item => item.id));
    for (const id of Array.from(this.furnitureColorByInstance.keys())) {
      if (!existingIds.has(id)) {
        this.furnitureColorByInstance.delete(id);
      }
    }
    for (const item of items) {
      if (!this.furnitureColorByInstance.has(item.id)) {
        this.furnitureColorByInstance.set(item.id, '__default__');
      }
    }

    const hasItems = items.length > 0;
    const hasSelection = !!selectedId;

    // Update total furniture cost in the sidebar
    const totalEl = this.appElement.querySelector('#furniture-total') as HTMLElement | null;
    const summaryEl = this.appElement.querySelector('#furniture-summary') as HTMLElement | null;
    const checkoutBtn = this.appElement.querySelector('#furniture-checkout') as HTMLButtonElement | null;

    let total = 0;
    const counts = new Map<DemoFurnitureId, number>();
    for (const item of items) {
      const option = this.demoFurnitureOptions.find(o => o.id === item.type);
      if (!option) continue;
      // Prices are stored as strings like "₾1,200" – strip non-digits
      const numeric = parseFloat(option.price.replace(/[^\d.]/g, ''));
      if (!Number.isNaN(numeric)) {
        total += numeric;
      }
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    }

    if (totalEl) {
      const formatted = total ? `₾${total.toLocaleString('en-US')}` : '₾0';
      totalEl.textContent = `Total: ${formatted}`;
    }

    if (summaryEl) {
      if (!hasItems) {
        summaryEl.textContent = 'No items placed';
      } else {
        const parts: string[] = [];
        for (const [type, count] of counts.entries()) {
          const option = this.demoFurnitureOptions.find(o => o.id === type);
          if (!option) continue;
          parts.push(`${count} × ${option.name}`);
        }
        summaryEl.textContent = parts.join(', ');
      }
    }

    if (checkoutBtn) {
      checkoutBtn.disabled = !hasItems;
      checkoutBtn.onclick = hasItems ? () => this.navigateTo('checkout') : null;
    }

    if (countEl) {
      countEl.textContent = String(items.length);
    }

    if (panel) {
      if (!hasItems) {
        panel.setAttribute('data-state', 'empty');
      } else if (interaction === 'moving') {
        panel.setAttribute('data-state', 'moving');
      } else if (hasSelection) {
        panel.setAttribute('data-state', 'selected');
      } else {
        panel.setAttribute('data-state', 'populated');
      }
    }

    if (list) {
      list.innerHTML = '';
      if (!hasItems) {
        const empty = document.createElement('p');
        empty.className = 'placed-furniture-empty';
        empty.textContent = 'No furniture placed yet.';
        list.appendChild(empty);
      } else {
        items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'placed-furniture-item';
          row.setAttribute('data-id', item.id);
          if (item.id === selectedId) {
            row.classList.add('selected');
          }

          const selectButton = document.createElement('button');
          selectButton.type = 'button';
          selectButton.className = 'placed-furniture-select';
          const rotationDeg = Math.round(((item.rotation * 180) / Math.PI + 360) % 360);
          selectButton.innerHTML = `
            <span class="placed-furniture-label">${item.label}</span>
            <span class="placed-furniture-meta">${rotationDeg}&deg;</span>
          `;

          const deleteButton = document.createElement('button');
          deleteButton.type = 'button';
          deleteButton.className = 'placed-furniture-delete';
          deleteButton.setAttribute('aria-label', `Delete ${item.label}`);
          deleteButton.innerHTML = '&times;';

          row.appendChild(selectButton);
          row.appendChild(deleteButton);
          list.appendChild(row);
        });
      }
    }

    if (moveBtn) {
      const isMoving = interaction === 'moving';
      moveBtn.disabled = !hasSelection && !isMoving;
      moveBtn.textContent = isMoving ? 'Cancel move' : 'Move';
      moveBtn.setAttribute('aria-pressed', isMoving ? 'true' : 'false');
    }

    const rotateDisabled = !hasSelection || interaction === 'moving';
    if (rotateLeftBtn) rotateLeftBtn.disabled = rotateDisabled;
    if (rotateRightBtn) rotateRightBtn.disabled = rotateDisabled;

    if (selectionControls) {
      selectionControls.classList.toggle('moving', interaction === 'moving');
      if (!hasSelection || !viewer || interaction === 'moving') {
        selectionControls.hidden = true;
      } else {
        const snapshot = items.find(item => item.id === selectedId);
        if (!snapshot) {
          selectionControls.hidden = true;
        } else {
          const screenPosition = viewer.projectToScreen(snapshot.position);
          if (!screenPosition) {
            selectionControls.hidden = true;
          } else {
            selectionControls.hidden = false;
            selectionControls.style.left = `${screenPosition.x}px`;
            selectionControls.style.top = `${screenPosition.y}px`;
          }
        }
      }
    }

    if (selectionMoveBtn) {
      selectionMoveBtn.disabled = !hasSelection;
      selectionMoveBtn.classList.toggle('active', interaction === 'moving');
      selectionMoveBtn.setAttribute('aria-pressed', interaction === 'moving' ? 'true' : 'false');
    }

    if (selectionRotateLeftBtn) {
      selectionRotateLeftBtn.disabled = !hasSelection || interaction === 'moving';
    }

    if (selectionRotateRightBtn) {
      selectionRotateRightBtn.disabled = !hasSelection || interaction === 'moving';
    }

    if (selectionDeleteBtn) {
      selectionDeleteBtn.disabled = !hasSelection || interaction === 'moving';
    }

    if (selectionColorBtn) {
      selectionColorBtn.disabled = !hasSelection || interaction === 'moving';
    }

    if ((!hasSelection || interaction === 'moving') && selectionColorPalette) {
      selectionColorPalette.hidden = true;
    }

    if (selectionColorDot) {
      if (!hasSelection) {
        this.applyColorKeyToDot(selectionColorDot, '__default__');
      } else {
        const key = this.furnitureColorByInstance.get(selectedId!) ?? '__default__';
        this.applyColorKeyToDot(selectionColorDot, key);
      }
    }
  }

  private applyColorKeyToDot(dot: HTMLElement | null, key: string): void {
    if (!dot) return;
    const { background, boxShadow } = this.colorCssForKey(key);
    dot.style.background = background;
    dot.style.boxShadow = boxShadow ?? '';
    dot.title = this.describeColorKey(key);
  }

  private colorCssForKey(key: string): { background: string; boxShadow?: string } {
    switch (key) {
      case '__default__':
        return {
          background: 'linear-gradient(135deg, #c28b5c 0%, #f5f5f5 50%, #888888 100%)',
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.35) inset',
        };
      case '#ffffff':
        return { background: '#f5f5f5' };
      case '#d0d0d0':
        return { background: '#d0d0d0' };
      case '#888888':
        return { background: '#888888' };
      case '#333333':
        return { background: '#333333' };
      case '#c28b5c':
        return { background: '#c28b5c' };
      default:
        return { background: '#aaaaaa' };
    }
  }

  private describeColorKey(key: string): string {
    switch (key) {
      case '__default__':
        return 'Default';
      case '#ffffff':
        return 'White';
      case '#d0d0d0':
        return 'Light grey';
      case '#888888':
        return 'Mid grey';
      case '#333333':
        return 'Dark grey';
      case '#c28b5c':
        return 'Warm wood';
      default:
        return 'Custom';
    }
  }

  private attachRoofActionListeners(): void {
    console.log('Setting up roof action listeners with event delegation...');
    
    // Create the listener function and store it for cleanup
    this.roofActionListener = (e) => {
      const target = e.target as HTMLElement;
      
      // Only process if we're on the demo page and element exists in current DOM
      if (this.currentPage !== 'demo' || !this.appElement.contains(target)) {
        return;
      }
      
      if (target.id === 'quick-get-suggestion') {
        e.preventDefault();
        e.stopPropagation();
        console.log('Get Suggestion clicked via delegation!');
        
        // Send message to ArTinTech AI in chat
        const chatInput = this.appElement.querySelector('#chat-input') as HTMLInputElement;
        const messagesContainer = this.appElement.querySelector('#chatbox-messages') as HTMLElement;
        
        if (chatInput && messagesContainer) {
          // Add user message
          const userMessage = document.createElement('div');
          userMessage.className = 'message user-message';
          userMessage.innerHTML = `
            <div class="message-avatar">
              <span>You</span>
            </div>
            <div class="message-content">
              <p>I would like a suggestion about this roof where can i get one</p>
            </div>
          `;
          messagesContainer.appendChild(userMessage);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;

          // Add typing indicator
          const typingIndicator = document.createElement('div');
          typingIndicator.className = 'message ai-message';
          typingIndicator.id = 'typing-indicator';
          typingIndicator.innerHTML = `
            <div class="message-avatar">
              <span>AI</span>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <div class="typing-dots">
                  <div class="typing-dot"></div>
                  <div class="typing-dot"></div>
                  <div class="typing-dot"></div>
                </div>
              </div>
            </div>
          `;
          messagesContainer.appendChild(typingIndicator);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;

          // Remove typing and add AI response with word-by-word typing effect
          setTimeout(() => {
            const existingTyping = document.getElementById('typing-indicator') as HTMLElement;
            if (existingTyping) {
              existingTyping.remove();
            }

            // Create AI message container
            const aiMessage = document.createElement('div');
            aiMessage.className = 'message ai-message';
            aiMessage.innerHTML = `
              <div class="message-avatar">
                <span>AI</span>
              </div>
              <div class="message-content">
                <p id="typing-text-1"></p>
                <p id="typing-text-2"></p>
                <p id="typing-text-3"></p>
                <p id="typing-text-4"></p>
              </div>
            `;
            messagesContainer.appendChild(aiMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Word-by-word typing effect
            const texts = [
              "Based on your roof design, I recommend two excellent specialists:",
              "Gorgia - Expert in contemporary metal roofing systems with 15+ years experience in residential projects",
              "Mihouse - Specialized in sustainable roofing solutions and energy-efficient materials",
              "Both companies have the best options for modern architectural projects like yours."
            ];

            this.typeWordByWord(texts, ['typing-text-1', 'typing-text-2', 'typing-text-3', 'typing-text-4'], messagesContainer);
          }, 2500);
        }
      }
      
      if (target.id === 'quick-restyle') {
        e.preventDefault();
        e.stopPropagation();
        console.log('Restyle clicked via delegation!');
        
        // Send message to ArTinTech AI in chat
        const chatInput = this.appElement.querySelector('#chat-input') as HTMLInputElement;
        const messagesContainer = this.appElement.querySelector('#chatbox-messages') as HTMLElement;
        
        if (chatInput && messagesContainer) {
          // Add user message
          const userMessage = document.createElement('div');
          userMessage.className = 'message user-message';
          userMessage.innerHTML = `
            <div class="message-avatar">
              <span>You</span>
            </div>
            <div class="message-content">
              <p>Can you help me restyle this roof?</p>
            </div>
          `;
          messagesContainer.appendChild(userMessage);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;

          // Add typing indicator
          const typingIndicator = document.createElement('div');
          typingIndicator.className = 'message ai-message';
          typingIndicator.id = 'typing-indicator-2';
          typingIndicator.innerHTML = `
            <div class="message-avatar">
              <span>AI</span>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <div class="typing-dots">
                  <div class="typing-dot"></div>
                  <div class="typing-dot"></div>
                  <div class="typing-dot"></div>
                </div>
              </div>
            </div>
          `;
          messagesContainer.appendChild(typingIndicator);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;

          // Remove typing and add AI response with word-by-word typing effect
          setTimeout(() => {
            const existingTyping = document.getElementById('typing-indicator-2');
            if (existingTyping) {
              existingTyping.remove();
            }

            // Create AI message container
            const aiMessage = document.createElement('div');
            aiMessage.className = 'message ai-message';
            aiMessage.innerHTML = `
              <div class="message-avatar">
                <span>AI</span>
              </div>
              <div class="message-content">
                <p id="restyle-text-1"></p>
                <p id="restyle-text-2"></p>
              </div>
            `;
            messagesContainer.appendChild(aiMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Word-by-word typing effect
            const texts = [
              "I'd be happy to help you restyle your roof! I can suggest different materials, colors, and architectural styles.",
              "What kind of look are you going for? Modern, traditional, or something unique?"
            ];

            this.typeWordByWord(texts, ['restyle-text-1', 'restyle-text-2'], messagesContainer);
          }, 2500);
        }
      }
    };
    
    // Add the listener to the document
    document.addEventListener('click', this.roofActionListener);
    
    console.log('Event delegation set up for roof action buttons');
  }

  private setupRoofInteraction(): void {
    const roofHighlight = this.appElement.querySelector('#roof-highlight') as HTMLElement;
    const houseImage = this.appElement.querySelector('#house-view-image') as HTMLImageElement;
    
    if (roofHighlight && houseImage) {
      // Add click listener to the roof area
      const roofClickHandler = (e: MouseEvent) => {
        const rect = houseImage.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Check if click is within roof area (approximate polygon bounds)
        if (this.isPointInRoof(x, y)) {
          // Show the highlight overlay and toggle active state
          roofHighlight.style.display = 'block';
          roofHighlight.classList.toggle('active');
          
          // Add AI message about roof selection
          if (roofHighlight.classList.contains('active')) {
            this.addAIMessage("Great! You've selected the roof area. I can help you with roof modifications, material suggestions, or styling options. What would you like to explore?");
          } else {
            roofHighlight.style.display = 'none';
            roofHighlight.classList.remove('active');
          }
        } else {
          // Click outside roof area - hide highlight if visible
          if (roofHighlight.style.display === 'block') {
            roofHighlight.style.display = 'none';
            roofHighlight.classList.remove('active');
          }
        }
      };
      
      houseImage.addEventListener('click', roofClickHandler);
      houseImage.style.cursor = 'crosshair';
      
      // Store the handler for cleanup
      (houseImage as any)._roofClickHandler = roofClickHandler;
    }

    // Add click handler for the get suggestions button
    const getSuggestionsBtn = this.appElement.querySelector('#get-suggestions-btn');
    if (getSuggestionsBtn) {
      const suggestionsClickHandler = () => {
        // Show the material suggestions boxes
        const materialSuggestions = this.appElement.querySelector('#material-suggestions') as HTMLElement;
        if (materialSuggestions) {
          materialSuggestions.style.display = 'flex';
          setTimeout(() => {
            materialSuggestions.classList.add('visible');
          }, 10);
        }
        
        // Add AI message about showing suggestions
        this.addAIMessage("Perfect! I've displayed material options below the 3D viewer. Click on any material to apply it to your roof and see the transformation!");
      };
      
      getSuggestionsBtn.addEventListener('click', suggestionsClickHandler);
      (getSuggestionsBtn as any)._suggestionsClickHandler = suggestionsClickHandler;
    }
  }

  private removeRoofInteraction(): void {
    const houseImage = this.appElement.querySelector('#house-view-image') as HTMLImageElement;
    const roofHighlight = this.appElement.querySelector('#roof-highlight') as HTMLElement;
    const getSuggestionsBtn = this.appElement.querySelector('#get-suggestions-btn');
    
    if (houseImage && (houseImage as any)._roofClickHandler) {
      houseImage.removeEventListener('click', (houseImage as any)._roofClickHandler);
      houseImage.style.cursor = 'default';
      delete (houseImage as any)._roofClickHandler;
    }
    
    if (getSuggestionsBtn && (getSuggestionsBtn as any)._suggestionsClickHandler) {
      getSuggestionsBtn.removeEventListener('click', (getSuggestionsBtn as any)._suggestionsClickHandler);
      delete (getSuggestionsBtn as any)._suggestionsClickHandler;
    }
    
    if (roofHighlight) {
      roofHighlight.classList.remove('active');
    }
  }

  private isPointInRoof(x: number, y: number): boolean {
    // Define roof polygon bounds (approximate)
    // Points: "20,30 25,20 35,22 45,18 55,18 65,22 75,20 80,30 78,45 70,50 65,55 35,55 30,50 22,45"
    const roofPolygon = [
      [20, 30], [25, 20], [35, 22], [45, 18], [55, 18], 
      [65, 22], [75, 20], [80, 30], [78, 45], [70, 50], 
      [65, 55], [35, 55], [30, 50], [22, 45]
    ];
    
    // Point-in-polygon algorithm (ray casting)
    let inside = false;
    for (let i = 0, j = roofPolygon.length - 1; i < roofPolygon.length; j = i++) {
      if (((roofPolygon[i][1] > y) !== (roofPolygon[j][1] > y)) &&
          (x < (roofPolygon[j][0] - roofPolygon[i][0]) * (y - roofPolygon[i][1]) / (roofPolygon[j][1] - roofPolygon[i][1]) + roofPolygon[i][0])) {
        inside = !inside;
      }
    }
    return inside;
  }

  private attachSuggestionEventListeners(): void {
    const suggestionBoxes = this.appElement.querySelectorAll('.suggestion-box');
    
    suggestionBoxes.forEach(box => {
      box.addEventListener('click', (e) => {
        // Remove active class from all boxes
        suggestionBoxes.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked box
        box.classList.add('active');
        
        // Get suggestion type and name
        const suggestionType = box.getAttribute('data-suggestion');
        const suggestionName = box.getAttribute('title');
        
        // Apply materials: if Three viewer exists, change floor material; else fallback
        const floorMaterialKey = this.mapSuggestionToFloor(suggestionType);
        if (this.threeViewer && floorMaterialKey) {
          this.threeViewer.applyMaterialToFloors(floorMaterialKey);
        } else {
          this.applyMaterialToModel(suggestionType);
        }
        
        // Add message to chat indicating selection
        if (suggestionName) {
          this.addAIMessage(`Excellent choice! You've selected "${suggestionName}" material. I've updated the 3D model to show how your house will look with this premium roofing material.`);
        }
      });
    });
  }

  private mapSuggestionToFloor(suggestionType: string | null): 'wood' | 'tile' | 'concrete' | 'default' | null {
    if (!suggestionType) return null;
    switch (suggestionType) {
      case 'gorgia-green':
        return 'tile';
      case 'gorgia-red':
        return 'wood';
      case 'mihouse-orange':
        return 'concrete';
      default:
        return 'default';
    }
  }

  private applyMaterialToModel(suggestionType: string | null): void {
    if (!suggestionType) return;
    
    // Map suggestion types to house colors
    const colorMap: { [key: string]: string } = {
      'gorgia-green': 'Green',
      'gorgia-red': 'Blue',    // Using Blue for red since we don't have red images
      'mihouse-orange': 'Blue' // Using Blue for orange since we don't have orange images
    };
    
    const newColor = colorMap[suggestionType] || 'Blue';
    
    // Only show loading animation for green roof (since it actually changes the model)
    if (suggestionType === 'gorgia-green') {
      this.startMaterialRegenerationProcess(newColor, suggestionType);
    } else {
      // For other materials, just update instantly
      this.updateHouseColor(newColor);
    }
  }

  private updateHouseColor(newColor: string): void {
    // Find and update the currentColor variable in the 3D viewer
    const houseImage = this.appElement.querySelector('#house-view-image') as HTMLImageElement;
    const viewLabel = this.appElement.querySelector('#current-view-label');
    
    if (houseImage && viewLabel) {
      // Get current view from the image src
      const currentSrc = houseImage.src;
      const fileName = currentSrc.split('/').pop() || '';
      
      // Replace the color in the filename
      const newFileName = fileName.replace(/^(Blue|Green)/, newColor);
      houseImage.src = `./house views/${newFileName}`;
      
      // Store the new color for future view changes
      this.storeCurrentColor(newColor);
    }
  }

  private storeCurrentColor(color: string): void {
    // Store the color in a data attribute so other functions can access it
    const viewerSection = this.appElement.querySelector('#viewer-section');
    if (viewerSection) {
      viewerSection.setAttribute('data-current-color', color);
    }
  }

  private startRenderingProcess(uploadSection: HTMLElement | null, viewerSection: HTMLElement | null): void {
    const loadingSection = this.appElement.querySelector('#loading-section') as HTMLElement;
    
    // Hide upload section and show loading
    if (uploadSection) uploadSection.style.display = 'none';
    if (loadingSection) loadingSection.style.display = 'flex';
    
    // Add initial AI message
    this.addAIMessage("Perfect! I'm now processing your blueprint and generating a 3D model. This advanced AI rendering will take about 10 seconds to complete.");
    
    // Start the realistic rendering animation
    this.animateRenderingProgress(loadingSection, viewerSection);
  }

  private animateRenderingProgress(loadingSection: HTMLElement | null, viewerSection: HTMLElement | null): void {
    const progressFill = this.appElement.querySelector('#progress-fill') as HTMLElement;
    const steps = [
      { id: 'step-1', duration: 2500, title: 'Processing Blueprint...', subtitle: 'Analyzing architectural plans and extracting dimensions' },
      { id: 'step-2', duration: 2500, title: 'Building 3D Structure...', subtitle: 'Creating walls, floors, and structural elements' },
      { id: 'step-3', duration: 2500, title: 'Applying Materials...', subtitle: 'Adding textures, colors, and surface properties' },
      { id: 'step-4', duration: 2500, title: 'Rendering Final Model...', subtitle: 'Generating photorealistic visualization with lighting' }
    ];
    
    let currentStep = 0;
    let totalProgress = 0;
    
    const progressStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        
        // Update active step
        this.appElement.querySelectorAll('.step').forEach((el, index) => {
          el.classList.remove('active', 'completed');
          if (index < currentStep) {
            el.classList.add('completed');
          } else if (index === currentStep) {
            el.classList.add('active');
          }
        });
        
        // Update title and subtitle
        const titleEl = this.appElement.querySelector('#loading-title');
        const subtitleEl = this.appElement.querySelector('#loading-subtitle');
        if (titleEl) titleEl.textContent = step.title;
        if (subtitleEl) subtitleEl.textContent = step.subtitle;
        
        // Animate progress bar
        const startProgress = totalProgress;
        const endProgress = ((currentStep + 1) / steps.length) * 100;
        const progressDuration = step.duration;
        const progressStartTime = Date.now();
        
        const animateProgress = () => {
          const elapsed = Date.now() - progressStartTime;
          const progress = Math.min(elapsed / progressDuration, 1);
          const currentProgress = startProgress + (endProgress - startProgress) * progress;
          
          if (progressFill) {
            progressFill.style.width = `${currentProgress}%`;
          }
          
          if (progress < 1) {
            requestAnimationFrame(animateProgress);
          } else {
            totalProgress = endProgress;
            currentStep++;
            
            if (currentStep < steps.length) {
              setTimeout(progressStep, 100);
            } else {
              // Rendering complete
              setTimeout(() => {
                this.completeRendering(loadingSection, viewerSection);
              }, 500);
            }
          }
        };
        
        animateProgress();
      }
    };
    
    // Start the first step
    progressStep();
  }

  private completeRendering(loadingSection: HTMLElement | null, viewerSection: HTMLElement | null): void {
    // Hide loading and show viewer
    if (loadingSection) loadingSection.style.display = 'none';
    if (viewerSection) viewerSection.style.display = 'block';
    
    // Add completion message
    this.addAIMessage("Incredible! I've successfully generated your 3D architectural visualization. The model shows excellent proportions and realistic materials. You can now explore different views using the navigation arrows, and even select the roof to customize materials!");
  }

  private startMaterialRegenerationProcess(newColor: string, suggestionType: string): void {
    const loadingSection = this.appElement.querySelector('#loading-section') as HTMLElement;
    const viewerSection = this.appElement.querySelector('#viewer-section') as HTMLElement;
    
    // Show loading section
    if (viewerSection) viewerSection.style.display = 'none';
    if (loadingSection) loadingSection.style.display = 'flex';
    
    // Add AI message about regeneration
    this.addAIMessage("Excellent choice! I'm now regenerating the 3D model with your selected material. This will show how the green roof transforms the entire appearance of your house.");
    
    // Start the material regeneration animation
    this.animateMaterialRegeneration(loadingSection, viewerSection, newColor);
  }

  private animateMaterialRegeneration(loadingSection: HTMLElement | null, viewerSection: HTMLElement | null, newColor: string): void {
    const progressFill = this.appElement.querySelector('#progress-fill') as HTMLElement;
    const steps = [
      { id: 'step-1', duration: 2500, title: 'Analyzing Material Choice...', subtitle: 'Processing selected roofing material properties' },
      { id: 'step-2', duration: 2500, title: 'Updating 3D Model...', subtitle: 'Applying new material to house structure' },
      { id: 'step-3', duration: 2500, title: 'Adjusting Colors...', subtitle: 'Harmonizing house colors with new roof material' },
      { id: 'step-4', duration: 2500, title: 'Finalizing Render...', subtitle: 'Generating updated visualization with new materials' }
    ];
    
    let currentStep = 0;
    let totalProgress = 0;
    
    // Reset progress bar
    if (progressFill) progressFill.style.width = '0%';
    
    const progressStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        
        // Update active step
        this.appElement.querySelectorAll('.step').forEach((el, index) => {
          el.classList.remove('active', 'completed');
          if (index < currentStep) {
            el.classList.add('completed');
          } else if (index === currentStep) {
            el.classList.add('active');
          }
        });
        
        // Update title and subtitle
        const titleEl = this.appElement.querySelector('#loading-title');
        const subtitleEl = this.appElement.querySelector('#loading-subtitle');
        if (titleEl) titleEl.textContent = step.title;
        if (subtitleEl) subtitleEl.textContent = step.subtitle;
        
        // Animate progress bar
        const startProgress = totalProgress;
        const endProgress = ((currentStep + 1) / steps.length) * 100;
        const progressDuration = step.duration;
        const progressStartTime = Date.now();
        
        const animateProgress = () => {
          const elapsed = Date.now() - progressStartTime;
          const progress = Math.min(elapsed / progressDuration, 1);
          const currentProgress = startProgress + (endProgress - startProgress) * progress;
          
          if (progressFill) {
            progressFill.style.width = `${currentProgress}%`;
          }
          
          if (progress < 1) {
            requestAnimationFrame(animateProgress);
          } else {
            totalProgress = endProgress;
            currentStep++;
            
            if (currentStep < steps.length) {
              setTimeout(progressStep, 100);
            } else {
              // Material regeneration complete
              setTimeout(() => {
                this.completeMaterialRegeneration(loadingSection, viewerSection, newColor);
              }, 500);
            }
          }
        };
        
        animateProgress();
      }
    };
    
    // Start the first step
    progressStep();
  }

  private completeMaterialRegeneration(loadingSection: HTMLElement | null, viewerSection: HTMLElement | null, newColor: string): void {
    // Update the house color
    this.updateHouseColor(newColor);
    
    // Hide loading and show viewer
    if (loadingSection) loadingSection.style.display = 'none';
    if (viewerSection) viewerSection.style.display = 'block';
    
    // Reset to first view (North View)
    this.resetToFirstView(newColor);
    
    // Hide roof selection panel
    this.hideRoofSelection();
    
    // Hide material suggestions
    this.hideMaterialSuggestions();
    
    // Add completion message with pricing and purchase info
    this.addAIMessageWithFormatting("Perfect! I've successfully updated your house with the green roofing material. Notice how the green roof complements the overall design and gives your home a fresh, modern appearance. Based on your roof area of 60 square meters, the total cost would be **60 × 34.50₾ = 2,070₾**. You can purchase this premium **Gorgia** green roofing material directly from: [https://gorgia.ge/ka/mshenebloba/saxuravebi-da-fasadis-sistemebi/evroshiferi/evroshiferi-mwvane-cali-20097-sm-sisqe-3-mm-onduline/](https://gorgia.ge/ka/mshenebloba/saxuravebi-da-fasadis-sistemebi/evroshiferi/evroshiferi-mwvane-cali-20097-sm-sisqe-3-mm-onduline/)");
  }

  private resetToFirstView(currentColor: string): void {
    const houseImage = this.appElement.querySelector('#house-view-image') as HTMLImageElement;
    const viewLabel = this.appElement.querySelector('#current-view-label');
    const viewDots = this.appElement.querySelectorAll('.view-dot');
    
    if (houseImage && viewLabel) {
      // Set to first view (North View)
      houseImage.src = `./house views/${currentColor}-North.png`;
      viewLabel.textContent = 'North View';
      
      // Update view indicators to show first view as active
      viewDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === 0);
      });
    }
  }

  private hideRoofSelection(): void {
    const roofHighlight = this.appElement.querySelector('#roof-highlight') as HTMLElement;
    if (roofHighlight) {
      roofHighlight.style.display = 'none';
      roofHighlight.classList.remove('active');
    }
  }

  private hideMaterialSuggestions(): void {
    const materialSuggestions = this.appElement.querySelector('#material-suggestions') as HTMLElement;
    if (materialSuggestions) {
      materialSuggestions.style.display = 'none';
      materialSuggestions.classList.remove('visible');
    }
    
    // Also remove active state from suggestion boxes
    const suggestionBoxes = this.appElement.querySelectorAll('.suggestion-box');
    suggestionBoxes.forEach(box => {
      box.classList.remove('active');
    });
  }
} 
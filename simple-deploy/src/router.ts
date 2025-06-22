export type PageName = 'main' | 'demo';

export class Router {
  private currentPage: PageName = 'main';
  private appElement: HTMLElement;
  private roofActionListener: ((e: Event) => void) | null = null;

  constructor(appElement: HTMLElement) {
    this.appElement = appElement;
    this.init();
  }

  private init(): void {
    // Handle initial page load
    const hash = window.location.hash.slice(1) as PageName;
    if (hash === 'demo') {
      this.currentPage = 'demo';
    }

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    this.render();
  }

  private handleRouteChange(): void {
    const hash = window.location.hash.slice(1) as PageName;
    this.navigateTo(hash || 'main');
  }

  public navigateTo(page: PageName): void {
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
  }

  private cleanupEventListeners(): void {
    // Remove the roof action listener if it exists
    if (this.roofActionListener) {
      document.removeEventListener('click', this.roofActionListener);
      this.roofActionListener = null;
    }
  }

  private getPageContent(): string {
    const navigation = `
      <nav class="navigation">
        <button class="nav-btn ${this.currentPage === 'main' ? 'active' : ''}" data-page="main">
          Main
        </button>
        <button class="nav-btn ${this.currentPage === 'demo' ? 'active' : ''}" data-page="demo">
          Demo
        </button>
      </nav>
    `;

    const mouseFollower = `<div class="mouse-follower"></div>`;

    const pageContent = this.currentPage === 'main' ? this.getMainPageContent() : this.getDemoPageContent();

    return navigation + pageContent + mouseFollower;
  }

  private getMainPageContent(): string {
    return `
      <div class="page main-page">
        <!-- Hero Section -->
        <div class="hero-section">
          <div class="hero-container">
            <div class="hero-content">
              <div class="hero-badge">
                <span class="badge-text">AI-Powered Architecture</span>
              </div>
              <h1 class="main-title">
                Transform Words Into 
                <span class="gradient-text">Living Spaces</span>
              </h1>
              <p class="hero-description">
                Experience the future of home design where natural language becomes breathtaking 3D visualizations. 
                Simply describe your dream home and watch it come to life in photorealistic detail.
              </p>
              <div class="hero-actions">
                <button class="cta-primary" data-page="demo">
                  <span>Try AI Visualization</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
                <button class="cta-secondary">
                  <span>Try Demo</span>
                </button>
              </div>
            </div>
            <div class="hero-visual">
              <div class="visual-container">
                <div class="visual-card">
                  <div class="card-header">
                    <div class="status-dot"></div>
                    <span>AI Rendering</span>
                  </div>
                  <div class="card-content">
                    <img src="./components/thumbnail_6950664e-aee0-43b5-87f4-069639245d54.png.2048x2048_q85.png.webp" alt="AI Generated House" class="preview-image" />
                    <div class="generation-info">
                      <span>Generated in 2.1s</span>
                    </div>
                  </div>
                </div>
                <div class="floating-prompts">
                  <div class="prompt-bubble">
                    <span>"Modern home with glass walls"</span>
                  </div>
                  <div class="prompt-bubble">
                    <span>"Minimalist design with clean lines"</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Features Section -->
        <div class="features-section">
          <div class="section-header">
            <h2 class="section-title">How It Works</h2>
            <p class="section-subtitle">Three simple steps to visualize your dream home</p>
          </div>
          
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3 class="feature-title">Describe Your Vision</h3>
              <p class="feature-description">
                Use natural language to describe your ideal home. Our AI understands architectural concepts, 
                materials, and design preferences.
              </p>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3 class="feature-title">AI Generation</h3>
              <p class="feature-description">
                Advanced neural networks process your description and generate photorealistic 
                3D models in seconds, not hours.
              </p>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h3 class="feature-title">Interactive Exploration</h3>
              <p class="feature-description">
                Explore your generated home from every angle. Select elements for detailed 
                analysis and collaborate with professionals.
              </p>
            </div>
          </div>
        </div>

        <!-- Benefits Section -->
        <div class="benefits-section">
          <div class="benefits-container">
            <div class="benefits-content">
              <h2 class="benefits-title">Why Choose AI Visualization?</h2>
              <div class="benefits-list">
                <div class="benefit-item">
                  <div class="benefit-icon">⚫</div>
                  <div class="benefit-text">
                    <h4>Instant Results</h4>
                    <p>Get photorealistic visualizations in seconds, not weeks</p>
                  </div>
                </div>
                <div class="benefit-item">
                  <div class="benefit-icon">⚪</div>
                  <div class="benefit-text">
                    <h4>Cost Effective</h4>
                    <p>Save thousands on traditional architectural renderings</p>
                  </div>
                </div>
                <div class="benefit-item">
                  <div class="benefit-icon">⚫</div>
                  <div class="benefit-text">
                    <h4>Precise Communication</h4>
                    <p>Share exact visions with contractors and stakeholders</p>
                  </div>
                </div>
                <div class="benefit-item">
                  <div class="benefit-icon">⚪</div>
                  <div class="benefit-text">
                    <h4>Unlimited Iterations</h4>
                    <p>Explore countless design variations effortlessly</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="benefits-visual">
              <div class="stats-grid">
                <div class="stat-card">
                  <span class="stat-number">10k+</span>
                  <span class="stat-label">Homes Visualized</span>
                </div>
                <div class="stat-card">
                  <span class="stat-number">2.1s</span>
                  <span class="stat-label">Average Generation</span>
                </div>
                <div class="stat-card">
                  <span class="stat-number">95%</span>
                  <span class="stat-label">Client Satisfaction</span>
                </div>
                <div class="stat-card">
                  <span class="stat-number">24/7</span>
                  <span class="stat-label">AI Availability</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA Section -->
        <div class="cta-section">
          <div class="cta-container">
            <div class="cta-content">
              <h2 class="cta-title">Ready to See Your Dream Home?</h2>
              <p class="cta-description">
                Join thousands of homeowners and architects who've transformed their visions into reality
              </p>
              <button class="cta-button" data-page="demo">
                <span>Start Visualizing Now</span>
                <div class="button-shine"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getDemoPageContent(): string {
    return `
      <div class="page demo-page">
        <div class="content">
          <div class="chat-left-layout">
            <div class="ai-chatbox">
              <div class="chatbox-header">
                <div class="chatbox-title">
                  <div class="ai-indicator"></div>
                  <span>AI Assistant</span>
                </div>
                <div class="chatbox-status">Online</div>
              </div>
              
              <div class="chatbox-messages" id="chatbox-messages">
                <!-- Initial messages will be added by JavaScript -->
              </div>
              
              <div class="chatbox-input">
                <div class="input-container">
                  <input type="text" id="chat-input" placeholder="Describe your architectural vision..." />
                  <button id="send-message" class="send-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m22 2-7 20-4-9-9-4z"/>
                      <path d="m22 2-10 10"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="right-content">
              <div class="visualization-area">
                <!-- Upload State -->
                <div class="upload-section" id="upload-section">
                  <div class="upload-container">
                    <div class="upload-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17,8 12,3 7,8"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </div>
                    <h3>Upload Blueprint or Describe Your Vision</h3>
                    <p>Upload a blueprint photo or describe your dream home in the chat to get started</p>
                    <input type="file" id="blueprint-upload" accept="image/*" style="display: none;" />
                    <button class="upload-btn" id="upload-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17,8 12,3 7,8"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Upload Blueprint
                    </button>
                  </div>
                </div>

                <!-- Loading State -->
                <div class="loading-section" id="loading-section" style="display: none;">
                  <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-content">
                      <h3 id="loading-title">Processing Blueprint...</h3>
                      <p id="loading-subtitle">Analyzing architectural plans and generating 3D model</p>
                      <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                      </div>
                      <div class="loading-steps">
                        <div class="step active" id="step-1">
                          <span class="step-icon">📋</span>
                          <span class="step-text">Analyzing blueprint</span>
                        </div>
                        <div class="step" id="step-2">
                          <span class="step-icon">🏗️</span>
                          <span class="step-text">Building 3D structure</span>
                        </div>
                        <div class="step" id="step-3">
                          <span class="step-icon">🎨</span>
                          <span class="step-text">Applying materials</span>
                        </div>
                        <div class="step" id="step-4">
                          <span class="step-icon">💡</span>
                          <span class="step-text">Rendering final model</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 3D Viewer State -->
                <div class="viewer-section" id="viewer-section" style="display: none;">
                  <div class="viz-header">
                    <div class="viz-status">
                      <div class="status-indicator active"></div>
                      <span>3D Model Generated</span>
                    </div>
                    <div class="viz-actions">
                      <button class="viz-btn" id="regenerate-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                          <path d="M21 3v5h-5"/>
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                          <path d="M3 21v-5h5"/>
                        </svg>
                        Regenerate
                      </button>
                    </div>
                  </div>
                  
                  <div class="model-viewport">
                    <div class="model-container" id="model-display">
                      <!-- Navigation Controls -->
                      <div class="view-navigation">
                        <button class="nav-arrow nav-left" id="nav-left" title="Previous View">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15,18 9,12 15,6"/>
                          </svg>
                        </button>
                        <button class="nav-arrow nav-right" id="nav-right" title="Next View">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9,18 15,12 9,6"/>
                          </svg>
                        </button>
                        <button class="nav-arrow nav-up" id="nav-up" title="Top View">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="18,15 12,9 6,15"/>
                          </svg>
                        </button>
                      </div>

                      <!-- House Image Display -->
                      <img src="./house views/Blue-North.png" 
                           alt="3D House View" 
                           class="house-model" 
                           id="house-view-image" />
                      
                      <!-- Roof Highlight Overlay (only visible on top view when clicked) -->
                      <div class="roof-highlight-overlay" id="roof-highlight" style="display: none;">
                        <svg class="roof-outline" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polygon points="38.6,16.8 49.8,15 61,16.8 61,86.2 49.8,88 38.6,86.2" 
                                   class="roof-highlight"
                                   fill="rgba(0, 255, 136, 0.2)" 
                                   stroke="rgba(0, 255, 136, 0.8)" 
                                   stroke-width=".1"/>
                        </svg>
                        <div class="roof-selection-panel">
                          <div class="roof-panel-header">
                            <span class="roof-status-dot"></span>
                            <span>Roof Selected</span>
                          </div>
                          <button class="get-suggestions-btn" id="get-suggestions-btn">
                            <span>Get Suggestions</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="m9 18 6-6-6-6"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <!-- View Info -->
                      <div class="view-info">
                        <span id="current-view-label">North View</span>
                        <div class="view-indicators">
                          <div class="view-dot active" data-view="0"></div>
                          <div class="view-dot" data-view="1"></div>
                          <div class="view-dot" data-view="2"></div>
                          <div class="view-dot" data-view="3"></div>
                          <div class="view-dot" data-view="4"></div>
                          <div class="view-dot" data-view="5"></div>
                          <div class="view-dot" data-view="6"></div>
                          <div class="view-dot" data-view="7"></div>
                          <div class="view-dot" data-view="8"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="model-controls">
                      <button class="control-btn-small" title="Reset View" id="reset-view">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                          <path d="M21 3v5h-5"/>
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                          <path d="M3 21v-5h5"/>
                        </svg>
                      </button>
                      <button class="control-btn-small" title="Change Color" id="change-color">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <circle cx="12" cy="12" r="4"/>
                          <path d="M12 2v4"/>
                          <path d="M12 18v4"/>
                          <path d="m4.93 4.93 2.83 2.83"/>
                          <path d="m16.24 16.24 2.83 2.83"/>
                          <path d="M2 12h4"/>
                          <path d="M18 12h4"/>
                          <path d="m4.93 19.07 2.83-2.83"/>
                          <path d="m16.24 7.76 2.83-2.83"/>
                        </svg>
                      </button>
                      <button class="control-btn-small" title="Download" id="download-view">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Material Suggestions (appears at bottom when clicked) -->
                  <div class="material-suggestions" id="material-suggestions" style="display: none;">
                    <div class="suggestion-box" data-suggestion="gorgia-green" title="Gorgia - Green" data-tooltip="Gorgia - Green • 34.50₾">
                      <img src="./suggestions/03915_-_roof_jpg.webp" alt="Gorgia Green" />
                      <div class="popup-element">
                        <div>Gorgia - Green</div>
                        <div>34.50₾</div>
                      </div>
                    </div>
                    <div class="suggestion-box" data-suggestion="gorgia-red" title="Gorgia - Red" data-tooltip="Gorgia - Red • 31.50₾">
                      <img src="./suggestions/03914_-_roof_jpg.webp" alt="Gorgia Red" />
                      <div class="popup-element">
                        <div>Gorgia - Red</div>
                        <div>31.50₾</div>
                      </div>
                    </div>
                    <div class="suggestion-box" data-suggestion="mihouse-orange" title="MiHouse - Orange" data-tooltip="MiHouse - Orange • 37.95₾">
                      <img src="./suggestions/BM-00038609_-_roof_jpg.webp" alt="MiHouse Orange" />
                      <div class="popup-element">
                        <div>MiHouse - Orange</div>
                        <div>37.95₾</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Navigation buttons
    const navButtons = this.appElement.querySelectorAll('.nav-btn, .cta-button');
    navButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        let page = target.getAttribute('data-page') as PageName;
        
        // Check if it's a nested element inside the button
        if (!page) {
          const buttonParent = target.closest('[data-page]') as HTMLElement;
          if (buttonParent) {
            page = buttonParent.getAttribute('data-page') as PageName;
          }
        }
        
        if (page) {
          this.navigateTo(page);
        }
      });
    });

    // Demo page interactions
    if (this.currentPage === 'demo') {
      this.attachDemoEventListeners();
      this.attachChatEventListeners();
      this.initializeVisualization();
    }
  }

  private attachDemoEventListeners(): void {
    this.setupUploadFunctionality();
    this.setup3DViewer();
    this.attachChatEventListeners();
    this.attachSuggestionEventListeners();
  }

  private setupUploadFunctionality(): void {
    const uploadBtn = this.appElement.querySelector('#upload-btn');
    const blueprintUpload = this.appElement.querySelector('#blueprint-upload') as HTMLInputElement;
    const uploadSection = this.appElement.querySelector('#upload-section') as HTMLElement;
    const viewerSection = this.appElement.querySelector('#viewer-section') as HTMLElement;

    // Upload button click handler
    uploadBtn?.addEventListener('click', () => {
      blueprintUpload?.click();
    });

    // File upload handler
    blueprintUpload?.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.startRenderingProcess(uploadSection, viewerSection);
      }
    });
  }

  private setup3DViewer(): void {
    const views = [
      { name: 'North View', file: 'Blue-North.png' },
      { name: 'North-East View', file: 'Blue-North-east.png' },
      { name: 'East View', file: 'Blue-East.png' },
      { name: 'South-East View', file: 'Blue-South-East.png' },
      { name: 'South View', file: 'Blue-South.png' },
      { name: 'South-West View', file: 'Blue-South-West.png' },
      { name: 'West View', file: 'Blue-West.png' },
      { name: 'North-West View', file: 'Blue-North-West.png' },
      { name: 'Top View', file: 'Blue-Top.png' }
    ];

    let currentViewIndex = 0;
    let currentColor = 'Blue';

    const updateView = (index: number) => {
      const houseImage = this.appElement.querySelector('#house-view-image') as HTMLImageElement;
      const viewLabel = this.appElement.querySelector('#current-view-label');
      const viewDots = this.appElement.querySelectorAll('.view-dot');
      const roofHighlight = this.appElement.querySelector('#roof-highlight') as HTMLElement;
      const viewerSection = this.appElement.querySelector('#viewer-section');

      if (houseImage && viewLabel) {
        // Check if there's a stored color from material selection
        const storedColor = viewerSection?.getAttribute('data-current-color') || currentColor;
        currentColor = storedColor; // Update the local variable
        
        const view = views[index];
        const fileName = view.file.replace('Blue', currentColor);
        houseImage.src = `./house views/${fileName}`;
        viewLabel.textContent = view.name;

        // Update view indicators
        viewDots.forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });

        // Show/hide roof interaction based on view
        if (roofHighlight) {
          if (index === 8) { // Top view
            this.setupRoofInteraction();
          } else {
            roofHighlight.style.display = 'none';
            roofHighlight.classList.remove('active');
            this.removeRoofInteraction();
          }
        }
      }
    };

    // Navigation controls
    const navLeft = this.appElement.querySelector('#nav-left');
    const navRight = this.appElement.querySelector('#nav-right');
    const navUp = this.appElement.querySelector('#nav-up');

    navLeft?.addEventListener('click', () => {
      currentViewIndex = (currentViewIndex - 1 + views.length) % views.length;
      updateView(currentViewIndex);
    });

    navRight?.addEventListener('click', () => {
      currentViewIndex = (currentViewIndex + 1) % views.length;
      updateView(currentViewIndex);
    });

    navUp?.addEventListener('click', () => {
      currentViewIndex = 8; // Top view
      updateView(currentViewIndex);
    });

    // Color change functionality
    const changeColorBtn = this.appElement.querySelector('#change-color');
    changeColorBtn?.addEventListener('click', () => {
      currentColor = currentColor === 'Blue' ? 'Green' : 'Blue';
      this.storeCurrentColor(currentColor); // Store the new color
      updateView(currentViewIndex);
      
      this.addAIMessage(`I've changed the house color to ${currentColor.toLowerCase()}! You can see how different color schemes affect the overall appearance of your design.`);
    });

    // Reset view
    const resetViewBtn = this.appElement.querySelector('#reset-view');
    resetViewBtn?.addEventListener('click', () => {
      currentViewIndex = 0;
      updateView(currentViewIndex);
    });

    // Download functionality
    const downloadBtn = this.appElement.querySelector('#download-view');
    downloadBtn?.addEventListener('click', () => {
      this.addAIMessage("Download functionality would save the current view in high resolution. In a real implementation, this would generate and download the current 3D render.");
    });

    // View dot navigation
    const viewDots = this.appElement.querySelectorAll('.view-dot');
    viewDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        currentViewIndex = index;
        updateView(currentViewIndex);
      });
    });

    // Regenerate button
    const regenerateBtn = this.appElement.querySelector('#regenerate-btn');
    regenerateBtn?.addEventListener('click', () => {
      this.addAIMessage("Regenerating the 3D model with enhanced details and improved lighting. This might take a moment...");
      
      setTimeout(() => {
        updateView(currentViewIndex);
        this.addAIMessage("Perfect! I've regenerated the model with improved lighting and more realistic materials. The new version shows enhanced shadows and better texture details.");
      }, 2000);
    });
  }

  private initMouseFollower(): void {
    const mouseFollower = this.appElement.querySelector('.mouse-follower') as HTMLElement;
    if (!mouseFollower) return;

    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;

    // Check if element has dark background
    const isDarkElement = (element: Element): boolean => {
      // Check for dark background classes/sections
      const darkSelectors = [
        '.hero-section',
        '.hero-container',
        '.hero-content',
        '.hero-visual',
        '.visual-container',
        '.visual-card',
        '.immersive-hero',
        '.demo-hero', 
        '.testimonial-section',
        '.command-display',
        '.primary-action',
        '.experience-button',
        '.demo-action-btn:hover',
        '.control-btn:hover',
        '.back-to-main:hover'
      ];
      
      // Check if element or any parent matches dark selectors
      let currentElement: Element | null = element;
      while (currentElement) {
        for (const selector of darkSelectors) {
          if (currentElement.matches && currentElement.matches(selector)) {
            return true;
          }
        }
        
        // Check computed background color
        if (currentElement instanceof HTMLElement) {
          const style = window.getComputedStyle(currentElement);
          const bgColor = style.backgroundColor;
          
          // Check if background is dark (rough heuristic)
          if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const r = parseInt(rgb[0]);
              const g = parseInt(rgb[1]);
              const b = parseInt(rgb[2]);
              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
              if (brightness < 128) {
                return true;
              }
            }
          }
        }
        
        currentElement = currentElement.parentElement;
      }
      
      return false;
    };

    // Track mouse movement and update color based on element
    const updateMousePosition = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Get element under mouse
      const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      if (elementUnderMouse) {
        const isOnDark = isDarkElement(elementUnderMouse);
        
        // Update color classes
        mouseFollower.classList.remove('on-dark', 'on-light');
        if (isOnDark) {
          mouseFollower.classList.add('on-dark');
        } else {
          mouseFollower.classList.add('on-light');
        }
      }
    };

    // Smooth animation loop
    const animateFollower = () => {
      const dx = mouseX - followerX;
      const dy = mouseY - followerY;
      
      followerX += dx * 0.1;
      followerY += dy * 0.1;
      
      mouseFollower.style.left = followerX + 'px';
      mouseFollower.style.top = followerY + 'px';
      
      requestAnimationFrame(animateFollower);
    };

    // Start animation
    animateFollower();

    // Mouse events
    document.addEventListener('mousemove', updateMousePosition);
    
    document.addEventListener('mouseenter', () => {
      mouseFollower.classList.add('active');
    });
    
    document.addEventListener('mouseleave', () => {
      mouseFollower.classList.remove('active');
    });

    // Hover effects for interactive elements
    const interactiveElements = this.appElement.querySelectorAll('button, a, .nav-btn, .demo-action-btn, .control-btn, .action-btn');
    
    interactiveElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        mouseFollower.classList.add('hover');
      });
      
      element.addEventListener('mouseleave', () => {
        mouseFollower.classList.remove('hover');
      });
      
      element.addEventListener('mousedown', () => {
        mouseFollower.classList.add('click');
      });
      
      element.addEventListener('mouseup', () => {
        mouseFollower.classList.remove('click');
      });
    });
  }

  private attachChatEventListeners(): void {
    const chatInput = this.appElement.querySelector('#chat-input') as HTMLInputElement;
    const sendButton = this.appElement.querySelector('#send-message') as HTMLButtonElement;
    const messagesContainer = this.appElement.querySelector('#chatbox-messages') as HTMLElement;

    if (!chatInput || !sendButton || !messagesContainer) return;

    const aiResponses = [
      "I can visualize a stunning modern home with floor-to-ceiling windows and clean lines. The natural light would create beautiful shadows throughout the day.",
      "That sounds like a perfect blend of contemporary and traditional elements. I'm imagining warm wood accents against sleek metal fixtures.",
      "Excellent choice! A minimalist approach with carefully selected materials can create a timeless and serene living space.",
      "I love the sustainable approach! Green roofs and solar integration can make your home both beautiful and environmentally conscious.",
      "That design would create wonderful indoor-outdoor flow. Large sliding doors opening to a deck or patio would be perfect.",
      "Industrial elements like exposed steel beams can add character while maintaining that clean architectural aesthetic.",
      "The use of natural stone would ground the design beautifully and create a strong connection to the landscape."
    ];

    const sendMessage = () => {
      const message = chatInput.value.trim();
      if (!message) return;

      // Check if this is a roof suggestion message - don't trigger random response
      const isRoofSuggestionMessage = message.includes('suggestion about this roof') || 
                                      message.includes('roof where can i get one');

      // Add user message
      const userMessage = document.createElement('div');
      userMessage.className = 'message user-message';
      userMessage.innerHTML = `
        <div class="message-avatar">
          <span>You</span>
        </div>
        <div class="message-content">
          <p>${message}</p>
        </div>
      `;
      messagesContainer.appendChild(userMessage);

      // Clear input
      chatInput.value = '';

      // Only respond with random AI response if it's not a special roof suggestion message
      if (!isRoofSuggestionMessage) {
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message ai-message typing-message';
        typingIndicator.innerHTML = `
          <div class="message-avatar">
            <span>AI</span>
          </div>
          <div class="typing-indicator">
            <span>AI is thinking</span>
            <div class="typing-dots">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>
        `;
        messagesContainer.appendChild(typingIndicator);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Simulate AI response
        setTimeout(() => {
                  // Remove typing indicator
        const typingElement = messagesContainer.querySelector('.typing-message') as HTMLElement;
        if (typingElement) {
          typingElement.remove();
        }

          // Add AI response
          const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
          const aiMessage = document.createElement('div');
          aiMessage.className = 'message ai-message';
          aiMessage.innerHTML = `
            <div class="message-avatar">
              <span>AI</span>
            </div>
            <div class="message-content">
              <p>${randomResponse}</p>
            </div>
          `;
          messagesContainer.appendChild(aiMessage);

          // Scroll to bottom
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 1500 + Math.random() * 1000); // Random delay between 1.5-2.5 seconds
      }
    };

    // Send message on button click
    sendButton.addEventListener('click', sendMessage);

    // Send message on Enter key
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  private initializeVisualization(): void {
    // Simulate loading the house image
    const houseImage = this.appElement.querySelector('#house-image') as HTMLImageElement;
    const loadingOverlay = this.appElement.querySelector('#loading-state')?.parentElement as HTMLElement;
    const regenerateBtn = this.appElement.querySelector('#regenerate-btn') as HTMLButtonElement;
    const roofOverlay = this.appElement.querySelector('#roof-overlay') as HTMLElement;
    // const getSuggestionBtn = this.appElement.querySelector('#get-suggestion-btn') as HTMLButtonElement;
    // const restyleBtn = this.appElement.querySelector('#restyle-btn') as HTMLButtonElement;

    if (!houseImage || !loadingOverlay || !regenerateBtn || !roofOverlay) return;

    // Initially show loading
    loadingOverlay.classList.add('active');

    // Load the actual house image after a delay
    setTimeout(() => {
      // Use the actual house image from components folder
      houseImage.src = './components/Screenshot 2025-06-21 021123.png';
      
      houseImage.style.width = '100%';
      houseImage.style.height = '100%';
      houseImage.style.objectFit = 'contain';
      
      // Hide loading overlay
      loadingOverlay.classList.remove('active');
    }, 2000);

    // Handle regenerate button
    regenerateBtn.addEventListener('click', () => {
      loadingOverlay.classList.add('active');
      
      setTimeout(() => {
        // Add slight random rotation or position change to simulate regeneration
        const randomRotation = Math.random() * 4 - 2; // -2 to 2 degrees
        houseImage.style.transform = `rotate(${randomRotation}deg)`;
        loadingOverlay.classList.remove('active');
      }, 1500);
    });

    // Add roof selection functionality back
    houseImage.addEventListener('click', () => {
      roofOverlay.classList.toggle('active');
      
      // Show/hide quick actions in chat
      const quickActions = this.appElement.querySelector('#roof-quick-actions') as HTMLElement;
      if (quickActions) {
        if (roofOverlay.classList.contains('active')) {
          quickActions.style.display = 'block';
        } else {
          quickActions.style.display = 'none';
        }
      }
    });

    // Roof action buttons are now handled in attachRoofActionListeners()

    // Add hover effects to model controls
    const controlBtns = this.appElement.querySelectorAll('.control-btn-small');
    controlBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Add visual feedback
        (btn as HTMLElement).style.transform = 'scale(0.95)';
        setTimeout(() => {
          (btn as HTMLElement).style.transform = '';
        }, 150);
      });
    });

    // Initialize chat with AI greeting
    this.initializeChat();
  }

  private initializeChat(): void {
    const messagesContainer = this.appElement.querySelector('#chatbox-messages');
    if (!messagesContainer) return;

    // Clear any existing messages
    messagesContainer.innerHTML = '';

    // Add initial AI greeting with typing simulation
    this.addTypingIndicator();
    setTimeout(() => {
      this.removeTypingIndicator();
      this.addAIMessage("Hello! I'm ArTinTech AI, your architectural assistant. I can help you visualize and improve your home designs. Feel free to ask me anything!");
    }, 1000);
  }

  /*
  private addUserMessage(message: string): void {
    const messagesContainer = this.appElement.querySelector('#chatbox-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
      <div class="message-avatar">
        <span>You</span>
      </div>
      <div class="message-content">
        <p>${message}</p>
      </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  */

  private addAIMessage(message: string): void {
    const messagesContainer = this.appElement.querySelector('#chatbox-messages');
    if (!messagesContainer) return;

    // Add typing indicator first
    this.addTypingIndicator();

    // Wait a moment, then remove typing and start word-by-word typing
    setTimeout(() => {
      this.removeTypingIndicator();
      
      // Create AI message container with empty content
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ai-message';
      const messageId = `ai-message-${Date.now()}`;
      messageDiv.innerHTML = `
        <div class="message-avatar">
          <span>AI</span>
        </div>
        <div class="message-content">
          <p id="${messageId}"></p>
        </div>
      `;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Start word-by-word typing
      this.typeMessageWordByWord(message, messageId, messagesContainer as HTMLElement);
    }, 800);
  }

  private addAIMessageWithFormatting(message: string): void {
    const messagesContainer = this.appElement.querySelector('#chatbox-messages');
    if (!messagesContainer) return;

    // Add typing indicator first
    this.addTypingIndicator();

    // Wait a moment, then remove typing and add formatted message
    setTimeout(() => {
      this.removeTypingIndicator();
      
      // Process the message to handle markdown-style formatting
      let formattedMessage = message
        // Handle bold text **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Handle markdown links [text](url)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">$1</a>');
      
      // Create AI message container with formatted content
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ai-message';
      messageDiv.innerHTML = `
        <div class="message-avatar">
          <span>AI</span>
        </div>
        <div class="message-content">
          <p>${formattedMessage}</p>
        </div>
      `;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 800);
  }

  private typeMessageWordByWord(message: string, elementId: string, messagesContainer: HTMLElement): void {
    const element = document.getElementById(elementId) as HTMLElement;
    if (!element) return;
    
    const words = message.split(' ');
    let currentWordIndex = 0;
    
    const typeNextWord = () => {
      if (currentWordIndex >= words.length) return;
      
      const currentContent = element.innerHTML;
      const newWord = words[currentWordIndex];
      
      // Add formatting for company names and special terms
      const formattedWord = this.formatSpecialWords(newWord);
      
      element.innerHTML = currentContent + (currentContent ? ' ' : '') + formattedWord;
      currentWordIndex++;
      
      // Scroll to keep message visible
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Random delay between words (80-200ms) to simulate natural typing
      const delay = Math.random() * 120 + 80;
      setTimeout(typeNextWord, delay);
    };
    
    // Start typing after a brief pause
    setTimeout(typeNextWord, 200);
  }

  private formatSpecialWords(word: string): string {
    // Check for URLs
    if (word.includes('http')) {
      // Extract just the URL part if it has punctuation at the end
      const urlMatch = word.match(/(https?:\/\/[^\s,.!?;]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const remaining = word.replace(url, '');
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">${url}</a>${remaining}`;
      }
    }

    // Check for prices (₾ symbol)
    if (word.includes('₾')) {
      // Bold any word containing Georgian Lari symbol
      return `<strong>${word}</strong>`;
    }

    // Check for specific mathematical expressions like "60 × 34.50₾"
    if (word.includes('×') && word.includes('₾')) {
      return `<strong>${word}</strong>`;
    }

    // Format company names and special terms
    const cleanWord = word.replace(/[.,!?:;]/g, '');
    const specialWords = ['Gorgia', 'MiHouse', 'ArTinTech', 'AI', '3D'];
    if (specialWords.includes(cleanWord)) {
      return word.replace(cleanWord, `<strong>${cleanWord}</strong>`);
    }
    
    return word;
  }

  private addTypingIndicator(): void {
    const messagesContainer = this.appElement.querySelector('#chatbox-messages');
    if (!messagesContainer) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message typing-message';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
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
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  private removeTypingIndicator(): void {
    const typingIndicator = this.appElement.querySelector('#typing-indicator') as HTMLElement;
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  private typeWordByWord(texts: string[], elementIds: string[], messagesContainer: HTMLElement): void {
    let currentTextIndex = 0;
    let currentWordIndex = 0;
    
    const typeNextWord = () => {
      if (currentTextIndex >= texts.length) return;
      
      const currentText = texts[currentTextIndex];
      const words = currentText.split(' ');
      const element = document.getElementById(elementIds[currentTextIndex]);
      
      if (!element) {
        currentTextIndex++;
        currentWordIndex = 0;
        setTimeout(typeNextWord, 100);
        return;
      }
      
      if (currentWordIndex < words.length) {
        // Add the next word
        const currentContent = element.innerHTML;
        const newWord = words[currentWordIndex];
        
        // Add formatting for company names
        const formattedWord = (newWord === 'Gorgia' || newWord === 'Mihouse') 
          ? `<strong>${newWord}</strong>` 
          : newWord;
        
        element.innerHTML = currentContent + (currentContent ? ' ' : '') + formattedWord;
        currentWordIndex++;
        
        // Scroll to keep message visible
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Random delay between words (100-300ms) to simulate human typing
        const delay = Math.random() * 200 + 100;
        setTimeout(typeNextWord, delay);
      } else {
        // Move to next paragraph
        currentTextIndex++;
        currentWordIndex = 0;
        
        // Longer pause between paragraphs
        setTimeout(typeNextWord, 500);
      }
    };
    
    // Start typing after a brief pause
    setTimeout(typeNextWord, 300);
  }

  /*
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
        this.addAIMessage("Perfect! I've displayed material options at the bottom. Click on any material to apply it to your roof.");
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
      box.addEventListener('click', () => {
        // Remove active class from all boxes
        suggestionBoxes.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked box
        box.classList.add('active');
        
        // Get suggestion type and name
        const suggestionType = box.getAttribute('data-suggestion');
        const suggestionName = box.getAttribute('title');
        
        // Change house color based on suggestion
        this.applyMaterialToModel(suggestionType);
        
        // Add message to chat indicating selection
        if (suggestionName) {
          this.addAIMessage(`Excellent choice! You've selected "${suggestionName}" material. I've updated the 3D model to show how your house will look with this premium roofing material.`);
        }
      });
    });
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

  private startMaterialRegenerationProcess(newColor: string, _suggestionType: string): void {
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
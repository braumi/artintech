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
                  <span>Watch Demo</span>
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
              
              <div class="roof-quick-actions" id="roof-quick-actions" style="display: none;">
                <div class="quick-actions-header">
                  <span>Roof Selected</span>
                </div>
                <div class="quick-actions-buttons">
                  <button class="quick-action-btn" id="quick-get-suggestion">Get Suggestion</button>
                  <button class="quick-action-btn" id="quick-restyle">Restyle</button>
                </div>
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
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" 
                         alt="AI Generated House Visualization" 
                         class="house-model" 
                         id="house-image" />
                    
                                        <!-- Roof Selection Overlay -->
                    <div class="roof-selection-overlay" id="roof-overlay">
                      <svg class="roof-outline" viewBox="0 0 100 100" preserveAspectRatio="none">
                         <polygon points="25,49 33,35.1 37.6,36.4 38.8,34.8  68,42.5 73.5,51.5 67.5,45 60,62 32.6,50.8 32,52" 
                                 class="roof-trace"
                                 fill="rgba(0, 255, 136, 0.15)" 
                                 stroke="rgba(0, 255, 136, 0.7)" 
                                 stroke-width=".4"/>
                      </svg>
                      <div class="selection-label">Roof Selected</div>
                    </div>
                    
                    <div class="model-overlay">
                      <div class="loading-placeholder" id="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Generating 3D model...</p>
                      </div>
                    </div>
                  </div>
                  
                  <div class="model-controls">
                    <button class="control-btn-small" title="Rotate View">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.87 0 5.42 1.35 7.07 3.45"/>
                        <path d="m15 3 3 3-3 3"/>
                      </svg>
                    </button>
                    <button class="control-btn-small" title="Zoom">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                        <line x1="11" y1="8" x2="11" y2="14"/>
                        <line x1="8" y1="11" x2="14" y2="11"/>
                      </svg>
                    </button>
                    <button class="control-btn-small" title="Download">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
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
    const colorGenerator = this.appElement.querySelector('#color-generator');
    const colorDisplay = this.appElement.querySelector('#color-display');
    
    const counterDecrease = this.appElement.querySelector('#counter-decrease');
    const counterIncrease = this.appElement.querySelector('#counter-increase');
    const counterValue = this.appElement.querySelector('#counter-value');
    
    const textAnimate = this.appElement.querySelector('#text-animate');
    const animatedText = this.appElement.querySelector('#animated-text');

    let counter = 0;

    // Color generator
    colorGenerator?.addEventListener('click', () => {
      const randomColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
      if (colorDisplay) {
        (colorDisplay as HTMLElement).style.backgroundColor = randomColor;
        (colorDisplay as HTMLElement).textContent = randomColor;
      }
    });

    // Counter
    counterDecrease?.addEventListener('click', () => {
      counter--;
      if (counterValue) counterValue.textContent = counter.toString();
    });

    counterIncrease?.addEventListener('click', () => {
      counter++;
      if (counterValue) counterValue.textContent = counter.toString();
    });

    // Text animation
    textAnimate?.addEventListener('click', () => {
      if (animatedText) {
        animatedText.classList.remove('animate');
        setTimeout(() => {
          animatedText.classList.add('animate');
        }, 10);
      }
    });

    // Attach roof action buttons (with delay to ensure DOM is ready)
    setTimeout(() => {
      this.attachRoofActionListeners();
    }, 500);
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
            const existingTyping = document.getElementById('typing-indicator');
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
        const typingElement = messagesContainer.querySelector('.typing-message');
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
    const getSuggestionBtn = this.appElement.querySelector('#get-suggestion-btn') as HTMLButtonElement;
    const restyleBtn = this.appElement.querySelector('#restyle-btn') as HTMLButtonElement;

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

  private addAIMessage(message: string): void {
    const messagesContainer = this.appElement.querySelector('#chatbox-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.innerHTML = `
      <div class="message-avatar">
        <span>AI</span>
      </div>
      <div class="message-content">
        <p>${message}</p>
      </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
    const typingIndicator = this.appElement.querySelector('#typing-indicator');
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
} 
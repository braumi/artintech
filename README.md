# ArTinTech - AI House Visualization

This is an AI-powered architectural visualization web application that transforms text descriptions into 3D building visualizations.

## Features

- **AI-Powered Visualization**: Transform text descriptions into 3D house models
- **Interactive 3D Viewer**: Explore houses from multiple angles
- **Material Customization**: Select different roofing materials and see real-time changes
- **Responsive Design**: Works on desktop and mobile devices
- **Client-Side Routing**: Navigate between main page and demo seamlessly

## Netlify Deployment

This project has been configured for Netlify deployment with the following optimizations:

### Build Configuration

- Build command: `npm run build`
- Publish directory: `dist`
- Node.js version: 18

### Key Netlify Features

- **Client-Side Routing**: Automatic redirects configured for SPA routing
- **Asset Optimization**: All images and assets are properly bundled
- **Production Build**: Optimized TypeScript and CSS bundles

### Deploy to Netlify

1. **Using Netlify CLI (Recommended)**:
   ```bash
   npm install
   npm run build
   npm run deploy
   ```

2. **Using Netlify Dashboard**:
   - Connect your Git repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Deploy!

3. **Drag & Drop Deploy**:
   - Run `npm run build` locally
   - Drag the `dist` folder to Netlify's deploy area

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check
```

### Project Structure

```
artintech/
├── src/
│   ├── index.ts          # Main application entry
│   ├── router.ts         # Client-side routing logic
│   └── style.css         # Application styles
├── house views/          # 3D house view images
├── suggestions/          # Material suggestion images  
├── components/           # UI component images
├── dist/                 # Build output (auto-generated)
├── netlify.toml         # Netlify configuration
└── package.json         # Dependencies and scripts
```

## Technologies Used

- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **Vanilla JS**: No framework dependencies for maximum performance
- **CSS3**: Modern styling with animations and responsive design

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This project is private and proprietary. 
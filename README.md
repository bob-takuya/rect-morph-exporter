# Morpho Text Exporter

A powerful text morphing animation tool that decomposes characters into capsule-shaped segments and creates smooth frame-by-frame animations with SVG export capabilities.

## ✨ Features

- **Advanced Text Morphing**: Convert text into capsule-shaped segments with smooth interpolation
- **Frame-by-Frame Export**: Generate complete animation sequences as SVG files
- **Independent Size Control**: Separate vertical scaling for start and end points
- **Font Weight Selection**: Choose from normal, bold, and extra-bold weights
- **Print Grid Layout**: Export animations in A3 print-ready grid format
- **ZIP Download**: Batch export all frames with metadata
- **Live Preview**: Real-time preview with vertical split-pane layout
- **Keyboard Controls**: Navigate frames with arrow keys and spacebar animation

## 🎮 How to Use

1. **Set Text**: Enter start text (optional) and end text
2. **Adjust Settings**: Configure size scaling, font weight, and frame count
3. **Generate Frames**: Click "フレーム生成" to create animation sequence  
4. **Preview**: Use controls to navigate through frames
5. **Export**: Download individual frames, ZIP archives, or print layouts

## 🚀 Demo

Visit the live demo: [https://bob-takuya.github.io/rect-morph-exporter/](https://bob-takuya.github.io/rect-morph-exporter/)

## 🛠️ Development

### Prerequisites
- Node.js 20+
- npm

### Installation
```bash
git clone https://github.com/bob-takuya/rect-morph-exporter.git
cd rect-morph-exporter
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Type Check
```bash
npm run type-check
```

## 🏗️ Tech Stack

- **Vue.js 3**: Reactive frontend framework with Composition API
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Canvas API**: Text rendering and image processing
- **SVG**: Vector graphics generation and morphing animations
- **JSZip**: ZIP file generation for batch exports

## 📁 Project Structure

```
morpho-text-vue-exporter/
├── src/
│   ├── App.vue                    # Main application component
│   ├── main.ts                    # Application entry point
│   ├── components/
│   │   ├── MorphoTextNew.vue      # Main morphing component with export
│   │   ├── MorphoText.vue         # Original component
│   │   ├── MorphoText-simple.vue  # Simplified version
│   │   └── FrameExporter.vue      # Frame export utilities
│   ├── types/
│   │   └── slice.ts               # Type definitions for SliceMap
│   └── utils/
│       └── sliceProcessor.ts      # Text processing and morphing utilities
├── public/                        # Static assets
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions deployment
├── dist/                          # Built files (generated)
└── package.json                   # Dependencies and scripts
```

## 🎨 Features Details

### Advanced Morphing Algorithm
- Capsule-shaped segments (pill-like forms)
- Smooth interpolation between keyframes
- Proper spacing and proportions
- Optimized path generation

### Export System
- Individual SVG frame downloads
- ZIP archives with metadata
- A3 print-ready grid layouts
- HTML print preview

### User Interface
- Split-pane layout (vertical orientation)
- Independent size controls
- Font weight selection
- Real-time thumbnails
- Keyboard shortcuts

### Animation Controls
- Frame-by-frame navigation
- Auto-play functionality
- Progress tracking
- Thumbnail grid preview

## 🔧 Build & Deployment

The project uses GitHub Actions for automated testing and deployment:

1. **Test Phase**: Type checking and build verification
2. **Deploy Phase**: Automatic deployment to GitHub Pages
3. **Triggers**: Push to main branch and pull requests

## 📄 License

MIT License - feel free to use this project for educational or personal purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

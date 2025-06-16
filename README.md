# Rect Morph

An interactive text morphing application that transforms text into rectangles with smooth animations.

## ✨ Features

- **Dynamic Text Morphing**: Convert any text into animated rectangular shapes
- **Interactive Controls**: Unified input system with text entry and slider controls
- **Smooth Animations**: 1-second morphing transitions with cubic-bezier easing
- **Responsive Design**: Auto-adjusting font sizes and layouts
- **Modern UI**: Clean black background with white rounded rectangles

## 🎮 How to Use

1. **Enter Text**: Type your text in the input field and press Enter
2. **Adjust Slices**: Hold the input field for 300ms to activate slider mode
3. **Watch the Magic**: See your text morph into rectangles with smooth animations

## 🚀 Demo

Visit the live demo: [https://bob-takuya.github.io/rect-morph/](https://bob-takuya.github.io/rect-morph/)

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
git clone https://github.com/bob-takuya/rect-morph.git
cd rect-morph
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

### Deploy to GitHub Pages
```bash
npm run deploy
```

## 🏗️ Tech Stack

- **Vue.js 3**: Reactive frontend framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Canvas API**: Text rendering and image processing
- **SVG**: Morphing animations

## 📁 Project Structure

```
morpho-text-vue/
├── src/
│   ├── App.vue                 # Main application component
│   ├── main.ts                 # Application entry point
│   ├── components/
│   │   └── MorphoText.vue     # Core morphing component
│   ├── types/
│   │   └── slice.ts           # Type definitions
│   └── utils/
│       └── sliceProcessor.ts  # Text processing utilities
├── public/                     # Static assets
├── dist/                      # Built files (generated)
└── package.json               # Dependencies and scripts
```

## 🎨 Features Details

### Text Input System
- Clean input field for text entry
- Auto-clear after submission
- Text preservation during slice count changes

### Slider Control
- Long-press activation (300ms hold)
- Range: 1-100 slices
- Instant visual updates
- Smooth state transitions

### Animation System
- 1-second morphing duration
- Cubic-bezier easing for natural motion
- Seamless transitions between states
- Optimized performance

### Responsive Design
- Dynamic font sizing (90% of canvas width)
- Adaptive layouts
- Mobile-friendly controls

## 📄 License

MIT License - feel free to use this project for educational or personal purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

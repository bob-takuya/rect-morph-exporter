console.log('main-simple.ts: 開始')

import { createApp } from 'vue'
import App from './App.vue'

// Simple版専用のスタイル
const simpleStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  #app {
    margin: 0;
    padding: 0;
    max-width: none;
    height: 100vh;
    width: 100vw;
  }
`

// スタイルを動的に追加
const styleSheet = document.createElement('style')
styleSheet.textContent = simpleStyles
document.head.appendChild(styleSheet)

console.log('main-simple.ts: Vue createApp実行前')

try {
  const app = createApp(App)
  console.log('main-simple.ts: アプリ作成成功', app)
  
  app.mount('#app')
  console.log('main-simple.ts: マウント成功')
} catch (error) {
  console.error('main-simple.ts: エラー発生', error)
}

console.log('main-simple.ts: 完了')

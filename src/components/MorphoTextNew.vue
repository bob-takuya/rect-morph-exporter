<template>
  <div class="morpho-text-app">
    <!-- Left Panel: Controls -->
    <div class="left-panel">
      <div class="controls-section">
        <h2>Morpho Text Exporter</h2>
        
        <!-- Text Input -->
        <div class="input-group">
          <label>開始テキスト (空 = デフォルト状態)</label>
          <input
            v-model="startText"
            placeholder="例: A"
            class="text-input"
            @keydown.enter="updateStartText"
            @blur="updateStartText"
          />
          <div class="size-control">
            <label class="size-label">
              <span class="size-point-label">開始点 縦サイズ</span>
              <span class="size-value">{{ startSizeScale.toFixed(1) }}倍</span>
            </label>
            <input
              v-model.number="startSizeScale"
              type="range"
              min="0.3"
              max="3.0"
              step="0.1"
              class="size-slider"
              @input="handleStartSizeChange"
            />
          </div>
        </div>

        <div class="input-group">
          <label>終了テキスト</label>
          <input
            v-model="endText"
            placeholder="例: Hello"
            class="text-input"
            @keydown.enter="updateEndText"
            @blur="updateEndText"
          />
          <div class="size-control">
            <label class="size-label">
              <span class="size-point-label">終了点 縦サイズ</span>
              <span class="size-value">{{ endSizeScale.toFixed(1) }}倍</span>
            </label>
            <input
              v-model.number="endSizeScale"
              type="range"
              min="0.3"
              max="3.0"
              step="0.1"
              class="size-slider"
              @input="handleEndSizeChange"
            />
          </div>
        </div>

        <!-- Quick Start Buttons -->
        <div class="quick-start">
          <p class="quick-start-label">クイックスタート:</p>
          <div class="quick-buttons">
            <button @click="loadSample('A', 'B')" class="quick-btn">A → B</button>
            <button @click="loadSample('', 'Hello')" class="quick-btn">● → Hello</button>
            <button @click="loadSample('1', '2024')" class="quick-btn">1 → 2024</button>
          </div>
          
          <p class="quick-start-label">サイズプリセット:</p>
          <div class="size-controls-row">
            <div class="size-presets">
              <button @click="setSizePreset('small')" class="size-preset-btn">全体 小 (0.6倍)</button>
              <button @click="setSizePreset('medium')" class="size-preset-btn">全体 中 (1.0倍)</button>
              <button @click="setSizePreset('large')" class="size-preset-btn">全体 大 (1.5倍)</button>
              <button @click="setSizePreset('huge')" class="size-preset-btn">全体 特大 (2.2倍)</button>
            </div>
            <div class="size-pattern-presets">
              <button @click="setSizePattern('grow')" class="size-pattern-btn">小→大</button>
              <button @click="setSizePattern('shrink')" class="size-pattern-btn">大→小</button>
              <button @click="setSizePattern('extreme')" class="size-pattern-btn">極小→極大</button>
            </div>
            <div class="size-mode-toggle">
              <button @click="toggleSizeMode" class="mode-toggle-btn" :class="{ active: !independentSizeMode }">
                {{ independentSizeMode ? '🔓 個別調整' : '🔒 同期調整' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Font Weight Selection -->
        <div class="font-weight-section">
          <p class="quick-start-label">フォントの太さ:</p>
          <div class="font-weight-controls">
            <button 
              @click="setFontWeight('normal')" 
              :class="['font-weight-btn', { active: fontWeight === 'normal' }]"
            >
              標準
            </button>
            <button 
              @click="setFontWeight('bold')" 
              :class="['font-weight-btn', { active: fontWeight === 'bold' }]"
            >
              太字
            </button>
            <button 
              @click="setFontWeight('900')" 
              :class="['font-weight-btn', { active: fontWeight === '900' }]"
            >
              極太
            </button>
          </div>
        </div>

        <!-- Slice Count -->
        <div class="input-group">
          <label>分割数: {{ config.sliceCount }}</label>
          <input
            v-model.number="config.sliceCount"
            type="range"
            min="5"
            max="50"
            class="slider"
            @input="handleSliceCountChange"
          />
        </div>

        <!-- Frame Count -->
        <div class="input-group">
          <label>フレーム数: {{ frameCount }}</label>
          <input
            v-model.number="frameCount"
            type="range"
            min="2"
            max="50"
            class="slider"
          />
        </div>

        <!-- Generate Button -->
        <button 
          @click="generateFrames" 
          :disabled="isGenerating || !endText" 
          class="generate-btn"
        >
          {{ isGenerating ? '生成中...' : 'フレーム生成' }}
        </button>

        <!-- Progress -->
        <div v-if="isGenerating" class="progress-section">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>
          <p class="progress-text">{{ progressText }}</p>
        </div>

        <!-- Export Section -->
        <div v-if="frames.length > 0" class="export-section">
          <h3>エクスポート ({{ frames.length }}フレーム)</h3>
          <div class="export-buttons">
            <button @click="downloadAllFrames" class="export-btn">
              📦 ZIP一括ダウンロード
            </button>
            <button @click="downloadGridLayout" class="export-btn grid-export-btn">
              🖨️ グリッド印刷用
            </button>
            <button @click="openPrintPreview" class="export-btn">
              👁️ 印刷プレビュー
            </button>
            <button @click="playAnimation" class="export-btn">
              ▶️ アニメーション再生
            </button>
          </div>
        </div>

        <!-- Keyboard Shortcuts -->
        <div class="shortcuts-info">
          <h4>ショートカット</h4>
          <div class="shortcuts-list">
            <span>← →</span><span>フレーム移動</span>
            <span>Space</span><span>アニメーション</span>
            <span>Ctrl+G</span><span>生成</span>
            <span>Ctrl+D</span><span>ダウンロード</span>
          </div>
        </div>

        <!-- Usage Instructions -->
        <div class="usage-steps">
          <p>1. 開始・終了テキストを入力</p>
          <p>2. サイズとフォントを調整</p>
          <p>3. フレーム生成をクリック</p>
          <p>4. プレビューで確認</p>
          <p>5. エクスポートでダウンロード</p>
        </div>
      </div>
    </div>

    <!-- Right Panel: Preview -->
    <div class="right-panel">
      <div class="preview-section">
        <div class="preview-controls">
          <h3>プレビュー</h3>
          <div class="frame-controls" v-if="frames.length > 0">
            <button @click="previousFrame" :disabled="currentFrameIndex <= 0">◀</button>
            <span>{{ currentFrameIndex + 1 }} / {{ frames.length }}</span>
            <button @click="nextFrame" :disabled="currentFrameIndex >= frames.length - 1">▶</button>
          </div>
        </div>

        <div class="preview-container">
          <!-- Main Preview -->
          <div class="main-preview">
            <svg
              class="preview-svg"
              :width="config.svgWidth"
              :height="config.svgHeight"
              :viewBox="`0 0 ${config.svgWidth} ${config.svgHeight}`"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g v-for="(slice, sliceIndex) in currentSliceMap" :key="`slice-${sliceIndex}`">
                <path
                  v-for="(segment, segmentIndex) in slice"
                  :key="`segment-${sliceIndex}-${segmentIndex}`"
                  :d="generateSegmentPath(segment, sliceIndex, currentSliceMap.length)"
                  class="slice-segment"
                />
              </g>
            </svg>
          </div>

          <!-- Frame Preview -->
          <div v-if="frames.length > 0 && currentFrame" class="frame-preview">
            <div class="frame-preview-header">
              <h4>フレーム {{ currentFrameIndex + 1 }}</h4>
              <button @click="downloadSingleFrame(currentFrameIndex)" class="download-frame-btn">
                💾 ダウンロード
              </button>
            </div>
            <svg
              class="preview-svg"
              :width="config.svgWidth"
              :height="config.svgHeight"
              :viewBox="`0 0 ${config.svgWidth} ${config.svgHeight}`"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g v-for="(slice, sliceIndex) in currentFrame?.sliceMap || []" :key="`frame-slice-${sliceIndex}`">
                <path
                  v-for="(segment, segmentIndex) in slice"
                  :key="`frame-segment-${sliceIndex}-${segmentIndex}`"
                  :d="generateSegmentPath(segment, sliceIndex, (currentFrame?.sliceMap || []).length)"
                  class="slice-segment"
                />
              </g>
            </svg>
          </div>
        </div>

        <!-- Thumbnails -->
        <div v-if="frames.length > 0" class="thumbnails-section">
          <h4>全フレーム ({{ frames.length }})</h4>
          <div class="thumbnails-grid">
            <div
              v-for="(frame, index) in frames"
              :key="index"
              class="thumbnail"
              :class="{ active: index === currentFrameIndex }"
              @click="currentFrameIndex = index"
            >
              <svg
                class="thumbnail-svg"
                :width="60"
                :height="30"
                :viewBox="`0 0 ${config.svgWidth} ${config.svgHeight}`"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g v-for="(slice, sliceIndex) in frame.sliceMap" :key="`thumb-slice-${sliceIndex}`">
                  <path
                    v-for="(segment, segmentIndex) in slice"
                    :key="`thumb-segment-${sliceIndex}-${segmentIndex}`"
                    :d="generateSegmentPath(segment, sliceIndex, frame.sliceMap.length)"
                    class="slice-segment"
                  />
                </g>
              </svg>
              <div class="thumbnail-index">{{ index + 1 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import type { SliceMap } from '../types/slice'
import { 
  textToSliceMapWithSize, 
  createDefaultSliceMap, 
  interpolateSliceMaps, 
  scaleSliceMapVertically, 
  svgPathFromSliceMap 
} from '../utils/sliceProcessor'
import JSZip from 'jszip'

// Types
interface AnimationFrame {
  sliceMap: SliceMap
  svgData: string
  index: number
}

// Reactive data
const startText = ref<string>('')
const endText = ref<string>('Hello')
const startSizeScale = ref<number>(1.0)
const endSizeScale = ref<number>(1.0)
const independentSizeMode = ref<boolean>(true)
const fontWeight = ref<'normal' | 'bold' | '900'>('bold')

const frameCount = ref<number>(10)
const currentFrameIndex = ref<number>(0)

const isGenerating = ref<boolean>(false)
const progressPercentage = ref<number>(0)
const progressText = ref<string>('')

const frames = ref<AnimationFrame[]>([])
const currentSliceMap = ref<SliceMap>([])

// Configuration
const config = reactive({
  svgWidth: 600,
  svgHeight: 300,
  sliceCount: 20,
  fontSize: 90
})

// Computed properties
const currentFrame = computed(() => {
  return frames.value[currentFrameIndex.value] || null
})

// Path generation helper
function generateSegmentPath(segment: { top: number; bottom: number }, sliceIndex: number, totalSlices: number): string {
  const sliceWidth = config.svgWidth / totalSlices
  const spacing = Math.max(1, sliceWidth * 0.05)
  const x = sliceIndex * sliceWidth + spacing / 2
  const y = segment.top * config.svgHeight
  const width = sliceWidth - spacing
  const height = (segment.bottom - segment.top) * config.svgHeight

  if (width <= 0 || height <= 0) return ''

  const radius = Math.min(width / 2, height / 2)
  const effectiveRadius = Math.min(radius, height / 2)

  if (height <= width) {
    // 短い場合は完全な楕円形
    const centerX = x + width / 2
    const centerY = y + height / 2
    return `M ${centerX - effectiveRadius} ${centerY} A ${effectiveRadius} ${height/2} 0 1 1 ${centerX + effectiveRadius} ${centerY} A ${effectiveRadius} ${height/2} 0 1 1 ${centerX - effectiveRadius} ${centerY} Z`
  } else {
    // 長い場合はカプセル形状（上下が半円、中央が四角形）
    const left = x
    const right = x + width
    const top = y + effectiveRadius
    const bottom = y + height - effectiveRadius

    return `M ${left} ${top} A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${right} ${top} L ${right} ${bottom} A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${left} ${bottom} L ${left} ${top} Z`
  }
}

// Font weight functions
function setFontWeight(weight: 'normal' | 'bold' | '900') {
  fontWeight.value = weight
  updateCurrentDisplay()
}

// Size control functions
function handleStartSizeChange() {
  if (!independentSizeMode.value) {
    endSizeScale.value = startSizeScale.value
  }
  updateCurrentDisplay()
}

function handleEndSizeChange() {
  if (!independentSizeMode.value) {
    startSizeScale.value = endSizeScale.value
  }
  updateCurrentDisplay()
}

function toggleSizeMode() {
  independentSizeMode.value = !independentSizeMode.value
  if (!independentSizeMode.value) {
    endSizeScale.value = startSizeScale.value
    updateCurrentDisplay()
  }
}

function setSizePreset(preset: 'small' | 'medium' | 'large' | 'huge') {
  const scales = {
    small: 0.6,
    medium: 1.0,
    large: 1.5,
    huge: 2.2
  }
  const scale = scales[preset]
  startSizeScale.value = scale
  endSizeScale.value = scale
  updateCurrentDisplay()
}

function setSizePattern(pattern: 'grow' | 'shrink' | 'extreme') {
  const patterns = {
    grow: { start: 0.5, end: 1.5 },
    shrink: { start: 1.5, end: 0.5 },
    extreme: { start: 0.3, end: 2.5 }
  }
  const p = patterns[pattern]
  startSizeScale.value = p.start
  endSizeScale.value = p.end
  updateCurrentDisplay()
}

// Text input handlers
function updateStartText() {
  updateCurrentDisplay()
}

function updateEndText() {
  updateCurrentDisplay()
}

function loadSample(start: string, end: string) {
  startText.value = start
  endText.value = end
  updateCurrentDisplay()
}

// Display update
async function updateCurrentDisplay() {
  try {
    let displaySliceMap: SliceMap
    
    if (startText.value.trim()) {
      // 開始テキストがある場合
      const startSliceMap = await textToSliceMapWithSize(
        startText.value,
        config.sliceCount,
        config.fontSize,
        fontWeight.value
      )
      displaySliceMap = scaleSliceMapVertically(startSliceMap, startSizeScale.value)
    } else {
      // 開始テキストが空の場合はデフォルト状態
      displaySliceMap = createDefaultSliceMap(config.sliceCount)
    }
    
    currentSliceMap.value = displaySliceMap
  } catch (error) {
    console.error('表示更新エラー:', error)
    currentSliceMap.value = createDefaultSliceMap(config.sliceCount)
  }
}

// Slice count handler
function handleSliceCountChange() {
  updateCurrentDisplay()
}

// Frame generation
async function generateFrames() {
  if (!endText.value.trim()) return
  
  isGenerating.value = true
  progressPercentage.value = 0
  progressText.value = '準備中...'
  
  try {
    // 開始と終了のSliceMapを生成
    let startSliceMap: SliceMap
    if (startText.value.trim()) {
      const rawStartSliceMap = await textToSliceMapWithSize(
        startText.value,
        config.sliceCount,
        config.fontSize,
        fontWeight.value
      )
      startSliceMap = scaleSliceMapVertically(rawStartSliceMap, startSizeScale.value)
    } else {
      startSliceMap = createDefaultSliceMap(config.sliceCount)
    }
    
    const rawEndSliceMap = await textToSliceMapWithSize(
      endText.value,
      config.sliceCount,
      config.fontSize,
      fontWeight.value
    )
    const endSliceMap = scaleSliceMapVertically(rawEndSliceMap, endSizeScale.value)
    
    // フレーム生成
    const newFrames: AnimationFrame[] = []
    
    for (let i = 0; i < frameCount.value; i++) {
      const progress = i / (frameCount.value - 1)
      progressPercentage.value = (progress * 100)
      progressText.value = `フレーム ${i + 1}/${frameCount.value} 生成中...`
      
      const interpolatedSliceMap = interpolateSliceMaps(startSliceMap, endSliceMap, progress)
      const svgData = svgPathFromSliceMap(interpolatedSliceMap, config.svgWidth, config.svgHeight)
      
      newFrames.push({
        sliceMap: interpolatedSliceMap,
        svgData,
        index: i
      })
      
      // UIの更新を待つ
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    frames.value = newFrames
    currentFrameIndex.value = 0
    progressText.value = '完了!'
    
  } catch (error) {
    console.error('フレーム生成エラー:', error)
    progressText.value = 'エラーが発生しました'
  } finally {
    isGenerating.value = false
    setTimeout(() => {
      progressPercentage.value = 0
      progressText.value = ''
    }, 2000)
  }
}

// Navigation
function previousFrame() {
  if (currentFrameIndex.value > 0) {
    currentFrameIndex.value--
  }
}

function nextFrame() {
  if (currentFrameIndex.value < frames.value.length - 1) {
    currentFrameIndex.value++
  }
}

// Animation playback
async function playAnimation() {
  if (frames.value.length === 0) return
  
  for (let i = 0; i < frames.value.length; i++) {
    currentFrameIndex.value = i
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

// Export functions
async function downloadAllFrames() {
  if (frames.value.length === 0) return
  
  try {
    const zip = new JSZip()
    
    // Add all frame SVGs
    for (const frame of frames.value) {
      const fileName = `frame-${String(frame.index + 1).padStart(3, '0')}.svg`
      zip.file(fileName, frame.svgData)
    }
    
    // Add metadata
    const metadata = {
      startText: startText.value,
      endText: endText.value,
      startSizeScale: startSizeScale.value,
      endSizeScale: endSizeScale.value,
      fontWeight: fontWeight.value,
      frameCount: frames.value.length,
      svgWidth: config.svgWidth,
      svgHeight: config.svgHeight,
      sliceCount: config.sliceCount,
      exportDate: new Date().toISOString()
    }
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))
    
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const textName = endText.value.replace(/[^a-zA-Z0-9]/g, '_') || 'morpho_text'
    link.download = `${textName}_frames.zip`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('エクスポートエラー:', error)
  }
}

async function downloadSingleFrame(index: number) {
  const frame = frames.value[index]
  if (!frame) return
  
  const blob = new Blob([frame.svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const textName = endText.value.replace(/[^a-zA-Z0-9]/g, '_') || 'morpho_text'
  link.download = `${textName}_frame_${String(index + 1).padStart(3, '0')}.svg`
  link.click()
  URL.revokeObjectURL(url)
}

// Grid export functions
async function downloadGridLayout() {
  if (frames.value.length === 0) return
  
  try {
    const zip = new JSZip()
    
    // フレーム付きSVGファイルを生成
    for (let i = 0; i < frames.value.length; i++) {
      const frame = frames.value[i]
      const framedSvg = addFrameToSvg(frame.svgData)
      const fileName = `framed-${String(i + 1).padStart(3, '0')}.svg`
      zip.file(`framed_svgs/${fileName}`, framedSvg)
    }
    
    // HTML印刷レイアウトを生成
    const htmlContent = createHtmlPrintLayout()
    zip.file('print_layout.html', htmlContent)
    
    // 使用説明書を追加
    const readme = createPrintReadme()
    zip.file('README_PRINT.txt', readme)
    
    // メタデータも含める
    const metadata = {
      startText: startText.value,
      endText: endText.value,
      startSizeScale: startSizeScale.value,
      endSizeScale: endSizeScale.value,
      fontWeight: fontWeight.value,
      frameCount: frames.value.length,
      svgWidth: config.svgWidth,
      svgHeight: config.svgHeight,
      sliceCount: config.sliceCount,
      exportDate: new Date().toISOString(),
      printLayout: {
        framesPerPage: 30,
        gridSize: '5x6',
        paperSize: 'A3'
      }
    }
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))
    
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const textName = endText.value.replace(/[^a-zA-Z0-9]/g, '_') || 'morpho_text'
    link.download = `${textName}_print_grid.zip`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('グリッドエクスポートエラー:', error)
  }
}

// 印刷プレビューを新しいタブで開く
function openPrintPreview() {
  if (frames.value.length === 0) return
  
  const htmlContent = createHtmlPrintLayoutInline()
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(htmlContent)
    newWindow.document.close()
  }
}

// インライン版のHTML生成（新しいタブ用）
function createHtmlPrintLayoutInline(): string {
  const frameCount = frames.value.length
  const framesPerPage = 30 // 5x6 grid
  
  let htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Animation Frames for Print - ${startText.value} → ${endText.value}</title>
    <style>
        @page {
            size: A3;
            margin: 3mm;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            height: 100vh;
        }
        
        .grid-container {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            grid-template-rows: repeat(6, 1fr);
            gap: 0.05pt;
            height: calc(100vh - 6mm);
            width: calc(100vw - 6mm);
            margin: 3mm 3mm 0 3mm;
            page-break-after: always;
            border: 0.05pt solid #000;
            background: #000;
        }
        
        .grid-container:last-child {
            page-break-after: avoid;
        }
        
        .frame-item {
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            box-sizing: border-box;
        }
        
        .frame-svg {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            body {
                height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .grid-container {
                height: calc(297mm - 6mm) !important;
                width: calc(420mm - 6mm) !important;
                margin: 3mm 3mm 0 3mm !important;
                page-break-after: avoid !important;
                border: 0.05pt solid #000 !important;
                background: #000 !important;
                gap: 0.05pt !important;
            }
            
            .frame-item {
                background: white !important;
                padding: 0 !important;
            }
            
            .frame-svg {
                max-width: 100% !important;
                max-height: 100% !important;
            }
        }
    </style>
</head>
<body>
`
  
  let currentFrame = 1
  
  while (currentFrame <= frameCount) {
    htmlContent += '    <div class="grid-container">\n'
    
    for (let i = 0; i < framesPerPage; i++) {
      if (currentFrame > frameCount) {
        htmlContent += '        <div class="frame-item"></div>\n'
      } else {
        const frame = frames.value[currentFrame - 1]
        const framedSvg = addFrameToSvg(frame.svgData)
        const encodedSvg = encodeURIComponent(framedSvg)
        htmlContent += '        <div class="frame-item">\n'
        htmlContent += `            <img class="frame-svg" src="data:image/svg+xml,${encodedSvg}" />\n`
        htmlContent += '        </div>\n'
        currentFrame++
      }
    }
    
    htmlContent += '    </div>\n'
  }
  
  htmlContent += `</body>
</html>`
  
  return htmlContent
}

// SVGにフレームを追加
function addFrameToSvg(svgString: string, margin: number = 20, frameWidth: number = 2): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    const svgElement = doc.documentElement
    
    // 元のサイズを取得
    const width = parseFloat(svgElement.getAttribute('width') || '600')
    const height = parseFloat(svgElement.getAttribute('height') || '300')
    
    // 新しいサイズ（マージン分を追加）
    const newWidth = width + (margin * 2)
    const newHeight = height + (margin * 2)
    
    // 新しいSVG要素を作成
    const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    newSvg.setAttribute('width', newWidth.toString())
    newSvg.setAttribute('height', newHeight.toString())
    newSvg.setAttribute('viewBox', `0 0 ${newWidth} ${newHeight}`)
    newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    
    // フレームを追加
    const frame = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    frame.setAttribute('x', (frameWidth / 2).toString())
    frame.setAttribute('y', (frameWidth / 2).toString())
    frame.setAttribute('width', (newWidth - frameWidth).toString())
    frame.setAttribute('height', (newHeight - frameWidth).toString())
    frame.setAttribute('fill', 'none')
    frame.setAttribute('stroke', 'black')
    frame.setAttribute('stroke-width', frameWidth.toString())
    newSvg.appendChild(frame)
    
    // 元のコンテンツを新しい位置に配置するグループ
    const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    contentGroup.setAttribute('transform', `translate(${margin}, ${margin})`)
    
    // 元のSVGの全ての子要素をコピー
    for (const child of Array.from(svgElement.children)) {
      contentGroup.appendChild(child.cloneNode(true))
    }
    newSvg.appendChild(contentGroup)
    
    return new XMLSerializer().serializeToString(newSvg)
  } catch (error) {
    console.error('SVGフレーム追加エラー:', error)
    return svgString
  }
}

// HTML印刷レイアウトを作成
function createHtmlPrintLayout(): string {
  const frameCount = frames.value.length
  const framesPerPage = 30 // 5x6 grid
  
  let htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Animation Frames for Print - ${startText.value} → ${endText.value}</title>
    <style>
        @page {
            size: A3;
            margin: 3mm;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            height: 100vh;
        }
        
        .grid-container {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            grid-template-rows: repeat(6, 1fr);
            gap: 0.05pt;
            height: calc(100vh - 6mm);
            width: calc(100vw - 6mm);
            margin: 3mm 3mm 0 3mm;
            page-break-after: always;
            border: 0.05pt solid #000;
            background: #000;
        }
        
        .grid-container:last-child {
            page-break-after: avoid;
        }
        
        .frame-item {
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            box-sizing: border-box;
        }
        
        .frame-svg {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            body {
                height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .grid-container {
                height: calc(297mm - 6mm) !important;
                width: calc(420mm - 6mm) !important;
                margin: 3mm 3mm 0 3mm !important;
                page-break-after: avoid !important;
                border: 0.05pt solid #000 !important;
                background: #000 !important;
                gap: 0.05pt !important;
            }
            
            .frame-item {
                background: white !important;
                padding: 0 !important;
            }
            
            .frame-svg {
                max-width: 100% !important;
                max-height: 100% !important;
            }
        }
    </style>
</head>
<body>
`
  
  let currentFrame = 1
  
  while (currentFrame <= frameCount) {
    htmlContent += '    <div class="grid-container">\n'
    
    for (let i = 0; i < framesPerPage; i++) {
      if (currentFrame > frameCount) {
        htmlContent += '        <div class="frame-item"></div>\n'
      } else {
        const frameFilename = `framed_svgs/framed-${String(currentFrame).padStart(3, '0')}.svg`
        htmlContent += '        <div class="frame-item">\n'
        htmlContent += `            <object class="frame-svg" data="${frameFilename}" type="image/svg+xml"></object>\n`
        htmlContent += '        </div>\n'
        currentFrame++
      }
    }
    
    htmlContent += '    </div>\n'
  }
  
  htmlContent += `</body>
</html>`
  
  return htmlContent
}

// 印刷用説明書を作成
function createPrintReadme(): string {
  return `アニメーションフレーム印刷用ファイル
=====================================

生成日時: ${new Date().toLocaleString('ja-JP')}
アニメーション: ${startText.value} → ${endText.value}
総フレーム数: ${frames.value.length}

ファイル構成:
- print_layout.html: 印刷用HTMLファイル
- framed_svgs/: フレーム付きSVGファイル群
- metadata.json: 生成時の設定情報
- README_PRINT.txt: この説明書

印刷方法:
1. print_layout.html をWebブラウザで開く
2. Ctrl+P (Mac: Cmd+P) で印刷ダイアログを開く
3. 用紙サイズをA3に設定
4. 「背景のグラフィック」または「背景色とイメージ」を有効にする
5. 印刷実行

プレビュー方法:
1. 「👁️ 印刷プレビュー」ボタンをクリック
2. 新しいタブでプレビューが開きます
3. そのままブラウザの印刷機能を使用できます
`
}

// Keyboard event handler
function handleKeydown(event: KeyboardEvent) {
  if (frames.value.length === 0) return
  
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      previousFrame()
      break
    case 'ArrowRight':
      event.preventDefault()
      nextFrame()
      break
    case ' ':
      event.preventDefault()
      playAnimation()
      break
    case 'g':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        generateFrames()
      }
      break
    case 'd':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        downloadAllFrames()
      }
      break
  }
}

// Lifecycle
onMounted(() => {
  updateCurrentDisplay()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Watchers
watch([startText, endText, startSizeScale, endSizeScale, fontWeight], () => {
  updateCurrentDisplay()
}, { deep: true })
</script>

<style scoped>
.morpho-text-app {
  display: flex;
  height: 100vh;
  background: #f8f9fa;
}

.left-panel {
  width: 300px;
  background: white;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  flex-shrink: 0;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.controls-section {
  padding: 20px;
}

.controls-section h2 {
  margin: 0 0 20px 0;
  color: #495057;
  font-size: 18px;
  font-weight: 600;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.text-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.text-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.size-control {
  margin-top: 10px;
}

.size-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 12px;
}

.size-point-label {
  color: #6c757d;
}

.size-value {
  font-weight: bold;
  color: #007bff;
}

.size-slider {
  width: 100%;
  margin: 5px 0;
}

.quick-start {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.quick-start-label {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #495057;
}

.quick-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.quick-btn {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.quick-btn:hover {
  background: #0056b3;
}

.size-controls-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.size-presets, .size-pattern-presets {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.size-preset-btn, .size-pattern-btn {
  padding: 4px 8px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}

.size-preset-btn:hover, .size-pattern-btn:hover {
  background: #545b62;
}

.size-mode-toggle {
  text-align: center;
}

.mode-toggle-btn {
  padding: 8px 16px;
  background: #ffc107;
  color: #212529;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.mode-toggle-btn.active {
  background: #28a745;
  color: white;
}

.font-weight-section {
  margin-bottom: 20px;
  padding: 15px;
  background: #e9ecef;
  border-radius: 6px;
}

.font-weight-controls {
  display: flex;
  gap: 8px;
}

.font-weight-btn {
  padding: 8px 12px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.font-weight-btn.active {
  background: #007bff;
}

.font-weight-btn:hover {
  opacity: 0.8;
}

.slider {
  width: 100%;
  margin: 10px 0;
}

.generate-btn {
  width: 100%;
  padding: 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 20px;
}

.generate-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.generate-btn:hover:not(:disabled) {
  background: #218838;
}

.progress-section {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
}

.progress-text {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
  text-align: center;
}

.export-section {
  margin-bottom: 20px;
  padding: 15px;
  background: #e9ecef;
  border-radius: 6px;
}

.export-section h3 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 16px;
}

.export-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.export-btn {
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.export-btn:first-child {
  background: #28a745;
  color: white;
}

.export-btn.grid-export-btn {
  background: #6f42c1;
  color: white;
}

.export-btn:nth-child(3) {
  background: #17a2b8;
  color: white;
}

.export-btn:last-child {
  background: #ffc107;
  color: black;
}

.shortcuts-info {
  margin-top: 30px;
  padding: 15px;
  background: #e9ecef;
  border-radius: 6px;
}

.shortcuts-info h4 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 14px;
}

.shortcuts-list {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 5px;
  font-size: 12px;
}

.shortcuts-list span:nth-child(odd) {
  font-weight: bold;
  color: #007bff;
}

.usage-steps {
  margin-bottom: 15px;
}

.usage-steps p {
  margin: 5px 0;
  font-size: 12px;
  color: #666;
  padding-left: 10px;
  border-left: 2px solid #28a745;
}

.preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

.preview-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.preview-controls h3 {
  margin: 0;
  color: #495057;
  font-size: 18px;
}

.frame-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.frame-controls button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.frame-controls button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.frame-controls span {
  font-size: 14px;
  color: #495057;
  min-width: 80px;
  text-align: center;
}

.preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
}

.main-preview, .frame-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 15px;
}

.frame-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.frame-preview-header h4 {
  margin: 0;
  color: #495057;
  font-size: 14px;
}

.download-frame-btn {
  padding: 6px 12px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.preview-svg {
  width: 100%;
  height: 200px;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  background: white;
}

.thumbnails-section {
  margin-top: 20px;
}

.thumbnails-section h4 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 14px;
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
}

.thumbnail {
  position: relative;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s;
  background: white;
  aspect-ratio: 1;
}

.thumbnail.active {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.thumbnail:hover {
  border-color: #007bff;
}

.thumbnail-svg {
  width: 100%;
  height: 50px;
  display: block;
  padding: 2px;
}

.thumbnail-index {
  position: absolute;
  bottom: 1px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 9px;
  padding: 1px 3px;
  border-radius: 2px;
  line-height: 1;
}

.slice-segment {
  fill: #333;
  stroke: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .morpho-text-app {
    flex-direction: column;
    height: auto;
  }
  
  .left-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e9ecef;
  }
  
  .right-panel {
    height: auto;
  }
  
  .preview-svg {
    height: 150px;
  }
}

@media (max-width: 480px) {
  .controls-section {
    padding: 15px;
  }
  
  .left-panel {
    width: 100%;
  }
  
  .thumbnails-grid {
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
    gap: 6px;
    max-height: 200px;
  }
  
  .thumbnail-svg {
    height: 40px;
  }
}

/* Custom scrollbar */
.thumbnails-grid::-webkit-scrollbar {
  width: 8px;
}

.thumbnails-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.thumbnails-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.thumbnails-grid::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.left-panel::-webkit-scrollbar {
  width: 8px;
}

.left-panel::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.left-panel::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.left-panel::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

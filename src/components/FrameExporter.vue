<template>
  <div class="frame-exporter">
    <!-- Header -->
    <div class="exporter-header">
      <h2>フレームエクスポーター</h2>
      <p v-if="textInfo" class="text-info">テキスト: "{{ textInfo }}"</p>
    </div>

    <!-- フレーム数設定 -->
    <div class="frame-controls">
      <label for="frameCount">フレーム数:</label>
      <input 
        id="frameCount"
        v-model.number="frameCount" 
        type="number" 
        min="2" 
        max="100"
        class="frame-input"
      />
      <button @click="generateFrames" :disabled="isGenerating" class="generate-btn">
        {{ isGenerating ? '生成中...' : 'フレーム生成' }}
      </button>
    </div>

    <!-- Progress Bar -->
    <div v-if="isGenerating" class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: generationProgress + '%' }"></div>
      </div>
      <p class="progress-text">{{ generationStatus }}</p>
    </div>

    <!-- フレームプレビュー -->
    <div v-if="frames.length > 0" class="frame-preview-section">
      <h3>フレームプレビュー</h3>
      
      <!-- 全体操作ボタン -->
      <div class="batch-controls">
        <button @click="downloadAllFrames" class="download-all-btn">
          📦 全フレームをZIPでダウンロード
        </button>
        <button @click="playAnimation" class="play-btn">
          ▶️ アニメーションプレビュー
        </button>
        <div class="frame-info">
          {{ frames.length }}フレーム生成済み
        </div>
      </div>

      <!-- フレーム一覧 -->
      <div class="frames-grid">
        <div 
          v-for="(frame, index) in frames" 
          :key="index"
          class="frame-item"
          :class="{ active: currentPreviewFrame === index }"
        >
          <div class="frame-header">
            <span>Frame {{ index + 1 }}</span>
            <span class="progress-indicator">{{ (frame.progress * 100).toFixed(1) }}%</span>
          </div>
          
          <div class="frame-svg-container" @click="setPreviewFrame(index)">
            <svg
              :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
              preserveAspectRatio="xMidYMid meet"
              class="frame-svg"
            >
              <g
                v-for="(slice, sliceIndex) in frame.sliceMap"
                :key="`frame-${index}-slice-${sliceIndex}`"
              >
                <path
                  v-for="(segment, segmentIndex) in slice"
                  :key="`frame-${index}-segment-${sliceIndex}-${segmentIndex}`"
                  :d="createCapsulePath(sliceIndex, segment)"
                  class="frame-segment"
                />
              </g>
            </svg>
          </div>
          
          <button @click="downloadFrame(index)" class="download-frame-btn">
            ダウンロード
          </button>
        </div>
      </div>
    </div>

    <!-- 大きなプレビュー -->
    <div v-if="frames.length > 0" class="large-preview">
      <h3>詳細プレビュー - Frame {{ currentPreviewFrame + 1 }}</h3>
      <div class="large-preview-container">
        <svg
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
          preserveAspectRatio="xMidYMid meet"
          class="large-preview-svg"
        >
          <g
            v-for="(slice, sliceIndex) in currentFrame?.sliceMap || []"
            :key="`preview-slice-${sliceIndex}`"
          >
            <path
              v-for="(segment, segmentIndex) in slice"
              :key="`preview-segment-${sliceIndex}-${segmentIndex}`"
              :d="createCapsulePath(sliceIndex, segment)"
              class="preview-segment"
            />
          </g>
        </svg>
      </div>
      
      <div class="preview-controls">
        <button @click="previousFrame" :disabled="currentPreviewFrame === 0">
          前のフレーム
        </button>
        <span>{{ currentPreviewFrame + 1 }} / {{ frames.length }}</span>
        <button @click="nextFrame" :disabled="currentPreviewFrame === frames.length - 1">
          次のフレーム
        </button>
      </div>
      
      <div class="keyboard-shortcuts">
        <h4>キーボードショートカット</h4>
        <div class="shortcuts-grid">
          <span>← →</span><span>フレーム移動</span>
          <span>Space</span><span>アニメーション再生</span>
          <span>Ctrl/Cmd + G</span><span>フレーム生成</span>
          <span>Ctrl/Cmd + D</span><span>全フレームダウンロード</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import JSZip from 'jszip'
import type { SliceMap, SliceSegment } from '../types/slice'
import { matchSegments, interpolateFromMorphPairs } from '../utils/sliceProcessor'

interface FrameData {
  progress: number
  sliceMap: SliceMap
  svgData: string
}

const props = defineProps<{
  startSliceMap: SliceMap
  endSliceMap: SliceMap
  sliceCount: number
  svgWidth: number
  svgHeight: number
  textInfo?: string
}>()

// リアクティブな状態
const frameCount = ref(10)
const frames = ref<FrameData[]>([])
const isGenerating = ref(false)
const currentPreviewFrame = ref(0)
const generationProgress = ref(0)
const generationStatus = ref('')

// 計算されたプロパティ
const currentFrame = computed(() => frames.value[currentPreviewFrame.value])
const svgWidth = computed(() => props.svgWidth)
const svgHeight = computed(() => props.svgHeight)

// プロパティが変更されたときにフレームをリセット
watch(() => [props.startSliceMap, props.endSliceMap], () => {
  frames.value = []
  currentPreviewFrame.value = 0
}, { deep: true })

// キーボードショートカット
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

// ライフサイクル
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// フレーム生成
async function generateFrames() {
  if (frameCount.value < 2) return
  
  isGenerating.value = true
  frames.value = []
  generationProgress.value = 0
  generationStatus.value = 'セグメントマッチングを実行中...'
  
  try {
    // マッチングペアを生成
    const morphPairs = matchSegments(props.startSliceMap, props.endSliceMap, props.sliceCount)
    generationProgress.value = 10
    generationStatus.value = 'フレーム生成中...'
    
    // 各フレームを生成
    for (let i = 0; i < frameCount.value; i++) {
      const progress = i / (frameCount.value - 1) // 0から1まで
      const easeProgress = 1 - Math.pow(1 - progress, 3) // ease-out
      
      // スライスマップを補間
      const interpolatedSliceMap = interpolateFromMorphPairs(morphPairs, easeProgress)
      
      // SVGデータを生成
      const svgData = generateSVGData(interpolatedSliceMap)
      
      frames.value.push({
        progress: easeProgress,
        sliceMap: interpolatedSliceMap,
        svgData
      })
      
      // プログレス更新
      const frameProgress = 10 + ((i + 1) / frameCount.value) * 90
      generationProgress.value = frameProgress
      generationStatus.value = `フレーム ${i + 1}/${frameCount.value} を生成中...`
      
      // UIを更新するために少し待機
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
    
    currentPreviewFrame.value = 0
    generationStatus.value = `完了！${frameCount.value}フレームが生成されました。`
  } catch (error) {
    console.error('フレーム生成エラー:', error)
    generationStatus.value = 'エラーが発生しました。'
  } finally {
    setTimeout(() => {
      isGenerating.value = false
      generationProgress.value = 0
      generationStatus.value = ''
    }, 2000) // 2秒後にプログレスバーを隠す
  }
}

// SVGデータ生成
function generateSVGData(sliceMap: SliceMap): string {
  const paths = []
  
  for (let sliceIndex = 0; sliceIndex < sliceMap.length; sliceIndex++) {
    const slice = sliceMap[sliceIndex]
    for (let segmentIndex = 0; segmentIndex < slice.length; segmentIndex++) {
      const segment = slice[segmentIndex]
      const pathData = createCapsulePath(sliceIndex, segment)
      if (pathData) {
        paths.push(`<path d="${pathData}" fill="black" />`)
      }
    }
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth.value}" height="${svgHeight.value}" viewBox="0 0 ${svgWidth.value} ${svgHeight.value}" xmlns="http://www.w3.org/2000/svg">
  ${paths.join('\n  ')}
</svg>`
}

// カプセル形状のSVGパスを生成（元のコンポーネントと同じロジック）
function createCapsulePath(sliceIndex: number, segment: SliceSegment): string {
  const sliceWidth = svgWidth.value / props.sliceCount
  const spacing = Math.max(1, sliceWidth * 0.05)
  const x = sliceIndex * sliceWidth + spacing / 2
  const y = segment.top * svgHeight.value
  const width = sliceWidth - spacing
  const height = (segment.bottom - segment.top) * svgHeight.value

  if (width <= 0 || height <= 0) return ''

  const radius = Math.min(width / 2, height / 2)
  const effectiveRadius = Math.min(radius, height / 2)

  if (height <= width) {
    const centerX = x + width / 2
    const centerY = y + height / 2
    return `M ${centerX - effectiveRadius} ${centerY} A ${effectiveRadius} ${height/2} 0 1 1 ${centerX + effectiveRadius} ${centerY} A ${effectiveRadius} ${height/2} 0 1 1 ${centerX - effectiveRadius} ${centerY} Z`
  } else {
    const left = x
    const right = x + width
    const top = y + effectiveRadius
    const bottom = y + height - effectiveRadius

    return `M ${left} ${top} A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${right} ${top} L ${right} ${bottom} A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${left} ${bottom} L ${left} ${top} Z`
  }
}

// フレームダウンロード
function downloadFrame(frameIndex: number) {
  const frame = frames.value[frameIndex]
  if (!frame) return
  
  const blob = new Blob([frame.svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `frame-${frameIndex + 1}.svg`
  link.click()
  URL.revokeObjectURL(url)
}

// 全フレームダウンロード
async function downloadAllFrames() {
  if (frames.value.length === 0) return
  
  try {
    const zip = new JSZip()
    
    // 各フレームをZIPに追加
    for (let i = 0; i < frames.value.length; i++) {
      const frame = frames.value[i]
      const fileName = `frame-${String(i + 1).padStart(3, '0')}.svg`
      zip.file(fileName, frame.svgData)
    }
    
    // メタデータファイルを追加
    const metadata = {
      textInfo: props.textInfo || '',
      frameCount: frames.value.length,
      svgWidth: svgWidth.value,
      svgHeight: svgHeight.value,
      sliceCount: props.sliceCount,
      exportDate: new Date().toISOString(),
      frames: frames.value.map((frame, index) => ({
        frameNumber: index + 1,
        progress: frame.progress,
        fileName: `frame-${String(index + 1).padStart(3, '0')}.svg`
      }))
    }
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))
    
    // READMEファイルを追加
    const readme = `# Morpho Text Animation Frames

Text: "${props.textInfo || 'Unknown'}"
Export Date: ${new Date().toLocaleString()}
Frame Count: ${frames.value.length}
SVG Size: ${svgWidth.value}x${svgHeight.value}
Slice Count: ${props.sliceCount}

## Files
- frame-001.svg to frame-${String(frames.value.length).padStart(3, '0')}.svg: Individual animation frames
- metadata.json: Technical information about the export
- README.md: This file

## Usage
These SVG files can be used in various applications:
- Web animations (CSS, JavaScript)
- Video editing software
- Print media
- Interactive presentations

Each frame represents a step in the morphing animation from the default state to the target text shape.
`
    zip.file('README.md', readme)
    
    // ZIP生成とダウンロード
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    const textName = props.textInfo?.replace(/[^a-zA-Z0-9]/g, '_') || 'morpho_text'
    link.download = `${textName}_frames.zip`
    link.click()
    URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error('ZIP生成エラー:', error)
    // フォールバック：個別ダウンロード
    for (let i = 0; i < frames.value.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      downloadFrame(i)
    }
  }
}

// プレビューフレーム操作
function setPreviewFrame(index: number) {
  currentPreviewFrame.value = index
}

function nextFrame() {
  if (currentPreviewFrame.value < frames.value.length - 1) {
    currentPreviewFrame.value++
  }
}

function previousFrame() {
  if (currentPreviewFrame.value > 0) {
    currentPreviewFrame.value--
  }
}

// アニメーションプレビュー
function playAnimation() {
  if (frames.value.length === 0) return
  
  let frameIndex = 0
  const interval = setInterval(() => {
    currentPreviewFrame.value = frameIndex
    frameIndex++
    
    if (frameIndex >= frames.value.length) {
      clearInterval(interval)
    }
  }, 100) // 100ms間隔
}
</script>

<style scoped>
.frame-exporter {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-top: 20px;
}

.exporter-header {
  margin-bottom: 20px;
  text-align: center;
}

.exporter-header h2 {
  margin: 0 0 10px 0;
  color: #333;
}

.text-info {
  margin: 0;
  color: #666;
  font-style: italic;
}

.frame-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.frame-input {
  width: 80px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.generate-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.generate-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.progress-section {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  margin: 0;
  color: #666;
  font-size: 14px;
}

.frame-preview-section {
  margin-bottom: 30px;
}

.batch-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.download-all-btn, .play-btn {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.play-btn {
  background: #ffc107;
  color: black;
}

.frame-info {
  margin-left: auto;
  color: #666;
  font-size: 14px;
  font-weight: bold;
}

.frames-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.frame-item {
  border: 2px solid #eee;
  border-radius: 8px;
  padding: 10px;
  transition: border-color 0.2s;
}

.frame-item.active {
  border-color: #007bff;
}

.frame-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: bold;
}

.progress-indicator {
  color: #666;
}

.frame-svg-container {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  cursor: pointer;
}

.frame-svg {
  width: 100%;
  height: 120px;
}

.frame-segment {
  fill: black;
}

.download-frame-btn {
  width: 100%;
  padding: 6px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.large-preview {
  border-top: 1px solid #ddd;
  padding-top: 20px;
}

.large-preview-container {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
}

.large-preview-svg {
  width: 100%;
  height: 300px;
}

.preview-segment {
  fill: black;
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.preview-controls button {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.preview-controls button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.keyboard-shortcuts {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.keyboard-shortcuts h4 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 14px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 15px;
  font-size: 12px;
}

.shortcuts-grid span:nth-child(odd) {
  font-family: 'Courier New', monospace;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}

.shortcuts-grid span:nth-child(even) {
  color: #666;
}
</style>

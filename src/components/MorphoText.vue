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
            placeholder="開始テキスト (空欄可)"
            class="text-input"
            @keydown.enter="updateStartText"
          />
        </div>

        <div class="input-group">
          <label>終了テキスト</label>
          <input
            v-model="endText"
            placeholder="終了テキスト"
            class="text-input"
            @keydown.enter="updateEndText"
          />
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
            <div class="progress-fill" :style="{ width: generationProgress + '%' }"></div>
          </div>
          <p class="progress-text">{{ generationStatus }}</p>
        </div>

        <!-- Export Controls -->
        <div v-if="frames.length > 0" class="export-section">
          <h3>エクスポート ({{ frames.length }}フレーム)</h3>
          <div class="export-buttons">
            <button @click="downloadAllFrames" class="export-btn">
              📦 ZIP一括ダウンロード
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
      </div>
    </div>

    <!-- Right Panel: Preview -->
    <div class="right-panel">
      <!-- Current SVG Preview -->
      <div class="preview-section">
        <h3>現在の状態</h3>
        <div class="svg-container">
          <svg
            :viewBox="`0 0 ${config.svgWidth} ${config.svgHeight}`"
            class="preview-svg"
          >
            <g v-for="(slice, sliceIndex) in currentSliceMap" :key="`slice-${sliceIndex}`">
              <path
                v-for="(segment, segmentIndex) in slice"
                :key="`segment-${sliceIndex}-${segmentIndex}`"
                :d="createCapsulePath(sliceIndex, segment)"
                class="segment-path"
              />
            </g>
          </svg>
        </div>
      </div>

      <!-- Frame Preview -->
      <div v-if="frames.length > 0" class="frames-section">
        <div class="frames-header">
          <h3>フレームプレビュー</h3>
          <div class="frame-nav">
            <button @click="previousFrame" :disabled="currentFrameIndex === 0">◀</button>
            <span>{{ currentFrameIndex + 1 }} / {{ frames.length }}</span>
            <button @click="nextFrame" :disabled="currentFrameIndex === frames.length - 1">▶</button>
          </div>
        </div>

        <!-- Large Frame Preview -->
        <div class="frame-preview">
          <div class="svg-container">
            <svg
              :viewBox="`0 0 ${config.svgWidth} ${config.svgHeight}`"
              class="preview-svg"
            >
              <g v-for="(slice, sliceIndex) in currentFrame?.sliceMap || []" :key="`frame-slice-${sliceIndex}`">
                <path
                  v-for="(segment, segmentIndex) in slice"
                  :key="`frame-segment-${sliceIndex}-${segmentIndex}`"
                  :d="createCapsulePath(sliceIndex, segment)"
                  class="segment-path"
                />
              </g>
            </svg>
          </div>
          <div class="frame-info">
            <span>Progress: {{ ((currentFrame?.progress || 0) * 100).toFixed(1) }}%</span>
            <button @click="downloadCurrentFrame" class="download-frame-btn">
              💾 このフレームをダウンロード
            </button>
          </div>
        </div>

        <!-- Thumbnail Grid -->
        <div class="thumbnails-grid">
          <div
            v-for="(frame, index) in frames"
            :key="index"
            class="thumbnail"
            :class="{ active: currentFrameIndex === index }"
            @click="currentFrameIndex = index"
          >
            <svg
              :viewBox="`0 0 ${config.svgWidth} ${config.svgHeight}`"
              class="thumbnail-svg"
            >
              <g v-for="(slice, sliceIndex) in frame.sliceMap" :key="`thumb-slice-${sliceIndex}`">
                <path
                  v-for="(segment, segmentIndex) in slice"
                  :key="`thumb-segment-${sliceIndex}-${segmentIndex}`"
                  :d="createCapsulePath(sliceIndex, segment)"
                  class="segment-path"
                />
              </g>
            </svg>
            <span class="thumbnail-index">{{ index + 1 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import JSZip from 'jszip'
import { createDefaultSliceMap, textToSliceMap, matchSegments, interpolateFromMorphPairs } from '../utils/sliceProcessor'
import type { SliceMap, SliceSegment } from '../types/slice'

// FrameData型定義
interface FrameData {
  progress: number
  sliceMap: SliceMap
  svgData: string
}

// リアクティブな状態
const startText = ref('')
const endText = ref('')
const frameCount = ref(10)
const currentSliceMap = ref<SliceMap>([])
const startSliceMap = ref<SliceMap>([])
const endSliceMap = ref<SliceMap>([])
const frames = ref<FrameData[]>([])
const currentFrameIndex = ref(0)
const isGenerating = ref(false)
const generationProgress = ref(0)
const generationStatus = ref('')

// 設定
const config = reactive({
  sliceCount: 20,
  svgWidth: 600,
  svgHeight: 300
})

// 計算されたプロパティ
const currentFrame = computed(() => frames.value[currentFrameIndex.value])

// コンポーネントマウント時の初期化
onMounted(() => {
  initializeDefaultState()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// デフォルト状態の初期化
function initializeDefaultState() {
  const defaultMap = createDefaultSliceMap(config.sliceCount)
  currentSliceMap.value = defaultMap
  startSliceMap.value = JSON.parse(JSON.stringify(defaultMap))
}

// テキスト更新処理
async function updateStartText() {
  if (startText.value.trim()) {
    startSliceMap.value = await textToSliceMap(startText.value.trim(), config.sliceCount)
  } else {
    startSliceMap.value = createDefaultSliceMap(config.sliceCount)
  }
  updateCurrentDisplay()
}

async function updateEndText() {
  if (endText.value.trim()) {
    endSliceMap.value = await textToSliceMap(endText.value.trim(), config.sliceCount)
    updateCurrentDisplay()
  }
}

function updateCurrentDisplay() {
  if (frames.value.length > 0 && currentFrame.value) {
    currentSliceMap.value = currentFrame.value.sliceMap
  } else if (endSliceMap.value.length > 0) {
    currentSliceMap.value = endSliceMap.value
  } else {
    currentSliceMap.value = startSliceMap.value
  }
}

// スライス数変更の処理
async function handleSliceCountChange() {
  initializeDefaultState()
  if (startText.value.trim()) {
    await updateStartText()
  }
  if (endText.value.trim()) {
    await updateEndText()
  }
  frames.value = [] // フレームをリセット
}

// フレーム生成
async function generateFrames() {
  if (frameCount.value < 2 || !endText.value.trim()) return
  
  isGenerating.value = true
  frames.value = []
  generationProgress.value = 0
  generationStatus.value = 'セグメントマッチングを実行中...'
  
  try {
    // 開始と終了のスライスマップを確保
    const startMap = startText.value.trim() 
      ? await textToSliceMap(startText.value.trim(), config.sliceCount)
      : createDefaultSliceMap(config.sliceCount)
    
    const endMap = await textToSliceMap(endText.value.trim(), config.sliceCount)
    
    // マッチングペアを生成
    const morphPairs = matchSegments(startMap, endMap, config.sliceCount)
    generationProgress.value = 10
    generationStatus.value = 'フレーム生成中...'
    
    // 各フレームを生成
    for (let i = 0; i < frameCount.value; i++) {
      const progress = i / (frameCount.value - 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      const interpolatedSliceMap = interpolateFromMorphPairs(morphPairs, easeProgress)
      const svgData = generateSVGData(interpolatedSliceMap)
      
      frames.value.push({
        progress: easeProgress,
        sliceMap: interpolatedSliceMap,
        svgData
      })
      
      const frameProgress = 10 + ((i + 1) / frameCount.value) * 90
      generationProgress.value = frameProgress
      generationStatus.value = `フレーム ${i + 1}/${frameCount.value} を生成中...`
      
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
    
    currentFrameIndex.value = 0
    updateCurrentDisplay()
    generationStatus.value = `完了！${frameCount.value}フレームが生成されました。`
  } catch (error) {
    console.error('フレーム生成エラー:', error)
    generationStatus.value = 'エラーが発生しました。'
  } finally {
    setTimeout(() => {
      isGenerating.value = false
      generationProgress.value = 0
      generationStatus.value = ''
    }, 2000)
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
<svg width="${config.svgWidth}" height="${config.svgHeight}" viewBox="0 0 ${config.svgWidth} ${config.svgHeight}" xmlns="http://www.w3.org/2000/svg">
  ${paths.join('\n  ')}
</svg>`
}

// カプセル形状のSVGパスを生成
function createCapsulePath(sliceIndex: number, segment: SliceSegment): string {
  const sliceWidth = config.svgWidth / config.sliceCount
  const spacing = Math.max(1, sliceWidth * 0.05)
  const x = sliceIndex * sliceWidth + spacing / 2
  const y = segment.top * config.svgHeight
  const width = sliceWidth - spacing
  const height = (segment.bottom - segment.top) * config.svgHeight

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

// フレーム操作
function nextFrame() {
  if (currentFrameIndex.value < frames.value.length - 1) {
    currentFrameIndex.value++
    updateCurrentDisplay()
  }
}

function previousFrame() {
  if (currentFrameIndex.value > 0) {
    currentFrameIndex.value--
    updateCurrentDisplay()
  }
}

// アニメーション再生
function playAnimation() {
  if (frames.value.length === 0) return
  
  let frameIndex = 0
  const interval = setInterval(() => {
    currentFrameIndex.value = frameIndex
    updateCurrentDisplay()
    frameIndex++
    
    if (frameIndex >= frames.value.length) {
      clearInterval(interval)
    }
  }, 100)
}

// ダウンロード機能
function downloadCurrentFrame() {
  if (currentFrame.value) {
    const blob = new Blob([currentFrame.value.svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `frame-${currentFrameIndex.value + 1}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }
}

// 全フレームダウンロード
async function downloadAllFrames() {
  if (frames.value.length === 0) return
  
  try {
    const zip = new JSZip()
    
    for (let i = 0; i < frames.value.length; i++) {
      const frame = frames.value[i]
      const fileName = `frame-${String(i + 1).padStart(3, '0')}.svg`
      zip.file(fileName, frame.svgData)
    }
    
    const metadata = {
      startText: startText.value,
      endText: endText.value,
      frameCount: frames.value.length,
      svgWidth: config.svgWidth,
      svgHeight: config.svgHeight,
      sliceCount: config.sliceCount,
      exportDate: new Date().toISOString(),
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
    console.error('ZIP生成エラー:', error)
  }
}

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
</script>

// テキスト入力の処理
async function handleTextSubmit() {
  const text = inputText.value.trim()
  console.log('テキスト送信:', text)
  
  if (!text || isAnimating.value) {
    console.log('テキスト送信スキップ - 空またはアニメーション中')
    return
  }
  
  isAnimating.value = true
  
  // 最後に送信されたテキストを記録
  lastSubmittedText.value = text
  
  // 入力欄をクリア
  inputText.value = ''
  
  try {
    console.log('テキストをスライスマップに変換開始')
    const startTime = performance.now()
    targetSliceMap.value = await textToSliceMap(text, config.sliceCount)
    const conversionTime = performance.now() - startTime
    console.log(`テキスト変換完了 (${conversionTime.toFixed(2)}ms)`, targetSliceMap.value)
    
    // セグメント数の統計を表示
    const segmentCounts = targetSliceMap.value.map(slice => slice.length)
    const totalSegments = segmentCounts.reduce((sum, count) => sum + count, 0)
    console.log(`セグメント統計: 総数=${totalSegments}, 平均=${(totalSegments / config.sliceCount).toFixed(1)}, 範囲=[${Math.min(...segmentCounts)}-${Math.max(...segmentCounts)}]`)
    
    // ゆっくりとしたアニメーションでモーフィング
    const animationStartTime = performance.now()
    await animateToTarget(targetSliceMap.value)
    const animationTime = performance.now() - animationStartTime
    console.log(`アニメーション完了 (${animationTime.toFixed(2)}ms)`)
    
  } catch (error) {
    console.error('モーフィングエラー:', error)
    console.error('エラー詳細:', {
      text,
      sliceCount: config.sliceCount,
      currentSliceMapLength: currentSliceMap.value.length,
      targetSliceMapLength: targetSliceMap.value.length
    })
  } finally {
    isAnimating.value = false
  }
}

// アニメーション付きでターゲットスライスマップに変化
function animateToTarget(target: SliceMap): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const duration = 1000 // 1秒間のアニメーション
    const startSliceMap = JSON.parse(JSON.stringify(currentSliceMap.value))
    
    // 新しいマッチングアルゴリズムを使用してセグメントペアを作成
    const morphPairs = matchSegments(startSliceMap, target, config.sliceCount)
    console.log('モーフィングペア生成完了:', {
      pairCount: morphPairs.length,
      totalCurrentSegments: morphPairs.reduce((sum, pair) => sum + pair.currentSegments.length, 0),
      totalTargetSegments: morphPairs.reduce((sum, pair) => sum + pair.targetSegments.length, 0)
    })
    
    // 初期検証
    const initialValidation = validateMorphingSegments(morphPairs, 0)
    if (!initialValidation) {
      console.warn('⚠️ 初期状態で問題が検出されました')
    }
    
    let frameCount = 0
    let lastValidationTime = 0
    
    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // イージング関数（ease-out）
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      // 定期的にリアルタイム検証を実行（パフォーマンスのため5フレームごと）
      frameCount++
      if (frameCount % 5 === 0 && Date.now() - lastValidationTime > 100) {
        const isValid = validateMorphingSegments(morphPairs, easeProgress)
        if (!isValid) {
          console.warn(`⚠️ フレーム${frameCount}でアニメーション問題検出 (progress: ${easeProgress.toFixed(3)})`)
        }
        lastValidationTime = Date.now()
      }
      
      // マッチングペアに基づいて補間されたスライスマップを計算
      const interpolatedSliceMap = interpolateFromMorphPairs(morphPairs, easeProgress)
      currentSliceMap.value = interpolatedSliceMap
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // 最終検証
        const finalValidation = validateMorphingSegments(morphPairs, 1)
        if (!finalValidation) {
          console.warn('⚠️ 最終状態で問題が検出されました')
        } else {
          console.log('✅ アニメーション完了 - 全検証通過')
        }
        
        currentSliceMap.value = JSON.parse(JSON.stringify(target))
        resolve()
      }
    }
    
    requestAnimationFrame(animate)
  })
}

// 2つのスライスマップを補間（後方互換性のため保持）
function interpolateSliceMaps(start: SliceMap, end: SliceMap, progress: number): SliceMap {
  const result: SliceMap = []
  const maxSlices = Math.max(start.length, end.length)
  
  for (let i = 0; i < maxSlices; i++) {
    const startSlice = start[i] || [{ top: 0.485, bottom: 0.515 }] // 小さな円
    const endSlice = end[i] || [{ top: 0.485, bottom: 0.515 }]     // 小さな円
    
    const interpolatedSlice: SliceSegment[] = []
    const maxSegments = Math.max(startSlice.length, endSlice.length)
    
    for (let j = 0; j < maxSegments; j++) {
      const startSegment = startSlice[j] || { top: 0.485, bottom: 0.515 } // 小さな円
      const endSegment = endSlice[j] || { top: 0.485, bottom: 0.515 }     // 小さな円
      
      interpolatedSlice.push({
        top: startSegment.top + (endSegment.top - startSegment.top) * progress,
        bottom: startSegment.bottom + (endSegment.bottom - startSegment.bottom) * progress
      })
    }
    
    result.push(interpolatedSlice)
  }
  
  return result
}

// スライス数変更の処理（即座に実行）
function handleSliceCountChange() {
  console.log('スライス数変更:', config.sliceCount)
  
  // 即座に実際の処理を実行
  executeSliceCountChange()
}

// 実際のスライス数変更処理
async function executeSliceCountChange() {
  if (isProcessingSliceChange.value) {
    console.log('スライス数変更処理中のためスキップ')
    return
  }
  
  isProcessingSliceChange.value = true
  
  try {
    // 最後に送信されたテキストがある場合はそれを保持
    if (lastSubmittedText.value) {
      // テキストがある場合は瞬時に再描画
      const newSliceMap = await textToSliceMap(lastSubmittedText.value, config.sliceCount)
      currentSliceMap.value = newSliceMap
    } else {
      // テキストがない場合のみデフォルト状態に
      initializeDefaultState()
    }
  } catch (error) {
    console.error('スライス数変更エラー:', error)
    // エラー時はデフォルト状態に戻す
    initializeDefaultState()
  } finally {
    isProcessingSliceChange.value = false
  }
}

// 統合入力コントロールの処理
function handleMouseDown(event: MouseEvent) {
  if (isAnimating.value) return
  
  dragStartX.value = event.clientX
  dragStartValue.value = config.sliceCount
  
  // 長押し検出用タイマー
  holdTimer.value = window.setTimeout(() => {
    enterSliderMode()
  }, 500) // 500ms後にスライダーモードに切り替え
  
  // マウスアップ・マウスムーブイベントを監視
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleTouchStart(event: TouchEvent) {
  if (isAnimating.value) return
  
  const touch = event.touches[0]
  dragStartX.value = touch.clientX
  dragStartValue.value = config.sliceCount
  
  holdTimer.value = window.setTimeout(() => {
    enterSliderMode()
  }, 500)
  
  document.addEventListener('touchmove', handleTouchMove)
  document.addEventListener('touchend', handleTouchEnd)
}

function handleMouseMove(event: MouseEvent) {
  // 移動が検出されたら長押しタイマーをキャンセルしてスライダーモードに
  if (!isSliderMode.value && holdTimer.value) {
    clearTimeout(holdTimer.value)
    holdTimer.value = null
    enterSliderMode()
  }
  
  if (!isSliderMode.value) return
  
  const deltaX = event.clientX - dragStartX.value
  const sensitivity = 0.3 // 感度を調整して100まで操作しやすく
  const newValue = Math.max(1, Math.min(100, Math.round(dragStartValue.value + deltaX * sensitivity)))
  
  // 値が変更された場合のみ処理を実行
  if (newValue !== config.sliceCount) {
    config.sliceCount = newValue
    handleSliceCountChange()
  }
}

function handleTouchMove(event: TouchEvent) {
  // 移動が検出されたら長押しタイマーをキャンセルしてスライダーモードに
  if (!isSliderMode.value && holdTimer.value) {
    clearTimeout(holdTimer.value)
    holdTimer.value = null
    enterSliderMode()
  }
  
  if (!isSliderMode.value) return
  
  const touch = event.touches[0]
  const deltaX = touch.clientX - dragStartX.value
  const sensitivity = 0.3
  const newValue = Math.max(1, Math.min(100, Math.round(dragStartValue.value + deltaX * sensitivity)))
  
  // 値が変更された場合のみ処理を実行
  if (newValue !== config.sliceCount) {
    config.sliceCount = newValue
    handleSliceCountChange()
  }
}

function handleMouseUp() {
  cleanupDrag()
}

function handleTouchEnd() {
  cleanupDrag()
}

function enterSliderMode() {
  isSliderMode.value = true
  isDragging.value = true
}

function cleanupDrag() {
  if (holdTimer.value) {
    clearTimeout(holdTimer.value)
    holdTimer.value = null
  }
  
  // スライダーモードを即座に終了
  isSliderMode.value = false
  isDragging.value = false
  
  // イベントリスナーを削除
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
}

// デバッグ用のビジュアルテスト関数
function runVisualTest() {
  console.log('🎯 ビジュアルテストを開始します（小さな円の仕様テスト含む）')
  
  // テスト1: 複数のセグメントから1つのセグメントへの変化
  testTransition('複数→単一', 'ABC', 'I')
  
  // テスト2: 単一のセグメントから複数のセグメントへの変化
  setTimeout(() => testTransition('単一→複数', 'I', 'WMW'), 3000)
  
  // テスト3: 複雑な変化
  setTimeout(() => testTransition('複雑変化', 'HELLO', 'WORLD'), 6000)
  
  // テスト4: 空の状態への変化（小さな円に収束）
  setTimeout(() => testTransition('→小さな円', 'TEXT', ''), 9000)
  
  // テスト5: 空から文字への変化（小さな円から出現）
  setTimeout(() => testTransition('小さな円→文字', '', 'NEW'), 12000)
  
  // テスト6: 極端なスライス数での変化
  setTimeout(() => {
    console.log('🔄 スライス数変更テスト')
    config.sliceCount = 5
    testTransition('少ないスライス', '', 'HI')
  }, 15000)
  
  setTimeout(() => {
    config.sliceCount = 50
    testTransition('多いスライス', 'HI', 'HELLO')
  }, 18000)
  
  // 元のスライス数に戻す
  setTimeout(() => {
    config.sliceCount = 20
    console.log('✅ ビジュアルテスト完了 - スライス数を20に戻しました')
  }, 21000)
}

async function testTransition(testName: string, fromText: string, toText: string) {
  console.log(`🔄 ${testName}テスト: "${fromText}" → "${toText}"`)
  
  try {
    if (fromText) {
      const fromSliceMap = await textToSliceMap(fromText, config.sliceCount)
      currentSliceMap.value = fromSliceMap
      await new Promise(resolve => setTimeout(resolve, 500)) // 少し待機
    }
    
    if (toText) {
      const toSliceMap = await textToSliceMap(toText, config.sliceCount)
      await animateToTarget(toSliceMap)
    } else {
      // 空の状態への変化 - 小さな円に収束
      console.log('空の状態への変化：すべてのセグメントが中央の小さな円に収束します')
      const smallCircleSliceMap = Array(config.sliceCount).fill(0).map(() => [
        { top: 0.485, bottom: 0.515 } // 中央の小さな円
      ])
      await animateToTarget(smallCircleSliceMap)
    }
    
    console.log(`✅ ${testName}テスト完了`)
  } catch (error) {
    console.error(`❌ ${testName}テストエラー:`, error)
  }
}

console.log('MorphoText-simple.vue: スクリプト実行完了')
</script>

<style scoped>
.morpho-text-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #000;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px;
  height: calc(100vh - 200px);
  background: #000;
}

.morph-canvas {
  width: 100%;
  height: 100%;
  max-width: 800px;
  max-height: 400px;
  background: transparent;
}

.slice-segment {
  fill: #fff;
  stroke: none;
  transition: none; /* JavaScriptアニメーションを使用するためCSSトランジションを無効化 */
}

.slice-segment:hover {
  fill: #f0f0f0;
}

.bottom-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 40px;
  gap: 24px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
}

.unified-input-container {
  width: 100%;
  max-width: 300px;
}

.unified-input {
  position: relative;
  width: 100%;
  height: 48px;
  background: #fff;
  border-radius: 50px;
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: text;
  user-select: none;
}

.unified-input:hover {
  box-shadow: 0 6px 24px rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.unified-input.slider-mode {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  cursor: ew-resize;
}

.text-input-field {
  width: 100%;
  height: 100%;
  padding: 12px 24px;
  font-size: 14px;
  background: transparent;
  border: none;
  border-radius: 50px;
  outline: none;
  text-align: center;
  color: #000;
  font-weight: 300;
  letter-spacing: 0.5px;
}

.text-input-field::placeholder {
  color: #666;
}

.text-input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slider-mode-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 24px;
}

.slider-bar {
  width: 2px;
  height: 24px;
  background: #333;
  border-radius: 1px;
}

.slider-value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  letter-spacing: 0.5px;
  min-width: 24px;
  text-align: center;
}
</style>

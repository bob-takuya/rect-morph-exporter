<template>
  <div class="morpho-text-container">
    <!-- Main Canvas Area -->
    <div class="canvas-area">
      <svg
        ref="svgCanvasRef"
        :viewBox="`0 0 ${config.svgWidth} ${config.svgHeight}`"
        preserveAspectRatio="xMidYMid meet"
        class="morph-canvas"
      >
        <g
          v-for="(slice, sliceIndex) in currentSliceMap"
          :key="`slice-${sliceIndex}`"
          class="slice-group"
          :data-slice="sliceIndex"
        >
          <path
            v-for="(segment, segmentIndex) in slice"
            :key="`segment-${sliceIndex}-${segmentIndex}`"
            :d="createCapsulePath(sliceIndex, segment)"
            class="slice-segment"
            :data-segment="segmentIndex"
          />
        </g>
      </svg>
    </div>

    <!-- Bottom Controls -->
    <div class="bottom-controls">
      <div class="unified-input-container">
        <div 
          class="unified-input"
          :class="{ 'slider-mode': isSliderMode }"
          @mousedown="handleMouseDown"
          @touchstart="handleTouchStart"
        >
          <!-- Text Input Mode -->
          <input
            v-if="!isSliderMode"
            ref="textInputRef"
            v-model="inputText"
            placeholder="Enter text and press Enter"
            :disabled="isAnimating"
            @keydown.enter="handleTextSubmit"
            class="text-input-field"
          />
          
          <!-- Slider Mode -->
          <div v-if="isSliderMode" class="slider-mode-content">
            <div class="slider-bar"></div>
            <div class="slider-value">{{ config.sliceCount }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { createDefaultSliceMap, textToSliceMap } from '../utils/sliceProcessor'
import type { SliceMap, SliceSegment } from '../types/slice'

console.log('MorphoText-simple.vue: スクリプト実行開始')

// リアクティブな状態
const svgCanvasRef = ref<SVGElement>()
const textInputRef = ref<HTMLInputElement>()
const inputText = ref('')
const currentSliceMap = ref<SliceMap>([])
const targetSliceMap = ref<SliceMap>([])
const isAnimating = ref(false)
const lastSubmittedText = ref('') // 最後に送信されたテキストを保持

// 統合入力コントロール用の状態
const isSliderMode = ref(false)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartValue = ref(0)
const holdTimer = ref<number | null>(null)
const isProcessingSliceChange = ref(false) // 処理中フラグ

// 設定
const config = reactive({
  sliceCount: 20,
  svgWidth: 600,
  svgHeight: 300
})

console.log('MorphoText-simple.vue: 変数定義完了')

// コンポーネントマウント時の初期化
onMounted(() => {
  console.log('MorphoText-simple.vue: onMounted実行')
  initializeDefaultState()
})

// デフォルト状態の初期化
function initializeDefaultState() {
  console.log('デフォルト状態初期化開始')
  try {
    currentSliceMap.value = createDefaultSliceMap(config.sliceCount)
    console.log('デフォルト状態初期化完了', currentSliceMap.value)
  } catch (error) {
    console.error('デフォルト状態初期化エラー', error)
  }
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
    targetSliceMap.value = await textToSliceMap(text, config.sliceCount)
    console.log('テキストをスライスマップに変換完了', targetSliceMap.value)
    
    // ゆっくりとしたアニメーションでモーフィング
    await animateToTarget(targetSliceMap.value)
    console.log('アニメーション完了')
    
  } catch (error) {
    console.error('モーフィングエラー:', error)
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
    
    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // イージング関数（ease-out）
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      // 補間されたスライスマップを計算
      const interpolatedSliceMap = interpolateSliceMaps(startSliceMap, target, easeProgress)
      currentSliceMap.value = interpolatedSliceMap
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        currentSliceMap.value = JSON.parse(JSON.stringify(target))
        resolve()
      }
    }
    
    requestAnimationFrame(animate)
  })
}

// 2つのスライスマップを補間
function interpolateSliceMaps(start: SliceMap, end: SliceMap, progress: number): SliceMap {
  const result: SliceMap = []
  const maxSlices = Math.max(start.length, end.length)
  
  for (let i = 0; i < maxSlices; i++) {
    const startSlice = start[i] || [{ top: 0.49, bottom: 0.51 }]
    const endSlice = end[i] || [{ top: 0.49, bottom: 0.51 }]
    
    const interpolatedSlice: SliceSegment[] = []
    const maxSegments = Math.max(startSlice.length, endSlice.length)
    
    for (let j = 0; j < maxSegments; j++) {
      const startSegment = startSlice[j] || { top: 0.49, bottom: 0.51 }
      const endSegment = endSlice[j] || { top: 0.49, bottom: 0.51 }
      
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
  }, 300) // 300ms後にスライダーモードに切り替え
  
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
  }, 300)
  
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

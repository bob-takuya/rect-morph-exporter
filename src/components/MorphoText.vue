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
import { createDefaultSliceMap, textToSliceMap, testSegmentMatching, matchSegments, validateMorphingSegments } from '../utils/sliceProcessor'
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
  
  // セグメントマッチングのテストを実行
  console.log('セグメントマッチングテストを実行中...')
  testSegmentMatching()
  
  // デバッグ用のグローバル関数を設定
  ;(window as any).runSegmentTest = testSegmentMatching
  ;(window as any).runVisualTest = runVisualTest
  console.log('🔧 デバッグ用コマンド:')
  console.log('- window.runSegmentTest() でセグメントテストを再実行')
  console.log('- window.runVisualTest() でビジュアルテストを実行（小さな円の動作確認）')
  console.log('')
  console.log('📋 新機能: セグメントが存在しない場所では中央に小さな円(高さ0.03)が表示されます')
  console.log('💡 テストのヒント: 空の文字列を入力すると全てのセグメントが小さな円に収束します')
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

// マッチングペアに基づいてスライスマップを補間
function interpolateFromMorphPairs(morphPairs: any[], progress: number): SliceMap {
  const result: SliceMap = []
  
  for (const pair of morphPairs) {
    const interpolatedSlice: SliceSegment[] = []
    
    // currentSegmentsとtargetSegmentsは同じ長さであることが保証されている
    for (let i = 0; i < pair.currentSegments.length; i++) {
      const currentSeg = pair.currentSegments[i]
      const targetSeg = pair.targetSegments[i]
      
      interpolatedSlice.push({
        top: currentSeg.top + (targetSeg.top - currentSeg.top) * progress,
        bottom: currentSeg.bottom + (targetSeg.bottom - currentSeg.bottom) * progress
      })
    }
    
    result.push(interpolatedSlice)
  }
  
  return result
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

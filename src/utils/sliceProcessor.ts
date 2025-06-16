import type { SliceMap, SliceSegment } from '../types/slice'

/**
 * セグメントマッチングのテスト関数
 * より包括的なテストケースを追加
 */
export function testSegmentMatching() {
  console.log('=== セグメントマッチングテスト ===')
  
  // 中央消滅を検出するヘルパー関数
  function checkForCenterDisappearance(segments: SliceSegment[], testName: string): boolean {
    const problemSegments = segments.filter(seg => {
      const center = (seg.top + seg.bottom) / 2
      const height = seg.bottom - seg.top
      // 中心が0.5付近で、高さが極端に小さい場合を検出（意図的な小さな円は除外）
      const isIntentionalSmallCircle = Math.abs(center - 0.5) < 0.001 && 
                                       Math.abs(height - 0.03) < 0.005
      return Math.abs(center - 0.5) < 0.01 && height < 0.02 && !isIntentionalSmallCircle
    })
    
    if (problemSegments.length > 0) {
      console.error(`❌ ${testName}: 意図しない中央消滅が検出されました！`, problemSegments)
      return true
    } else {
      console.log(`✅ ${testName}: 中央消滅なし（意図的な小さな円は正常）`)
      return false
    }
  }
  
  let totalTests = 0
  let failedTests = 0
  
  // テストケース1: 3個→1個のセグメント変化
  totalTests++
  const current3 = [
    { top: 0.2, bottom: 0.4 },
    { top: 0.5, bottom: 0.7 },
    { top: 0.8, bottom: 0.9 }
  ]
  const target1 = [
    { top: 0.4, bottom: 0.6 }
  ]
  
  console.log('テスト1: 3個→1個')
  console.log('Current:', current3)
  console.log('Target:', target1)
  
  const result1 = matchSegmentsOptimal(current3, target1)
  console.log('Result Current:', result1.currentSegments)
  console.log('Result Target:', result1.targetSegments)
  
  if (checkForCenterDisappearance(result1.targetSegments, 'テスト1')) {
    failedTests++
  }
  
  // テストケース2: 1個→3個のセグメント変化
  totalTests++
  const current1 = [{ top: 0.4, bottom: 0.6 }]
  const target3 = [
    { top: 0.1, bottom: 0.3 },
    { top: 0.45, bottom: 0.55 },
    { top: 0.7, bottom: 0.9 }
  ]
  
  console.log('\nテスト2: 1個→3個')
  console.log('Current:', current1)
  console.log('Target:', target3)
  
  const result2 = matchSegmentsOptimal(current1, target3)
  console.log('Result Current:', result2.currentSegments)
  console.log('Result Target:', result2.targetSegments)
  
  if (checkForCenterDisappearance(result2.currentSegments, 'テスト2(current)') ||
      checkForCenterDisappearance(result2.targetSegments, 'テスト2(target)')) {
    failedTests++
  }
  
  // テストケース3: 空→セグメントの変化
  totalTests++
  console.log('\nテスト3: 空→セグメント')
  const currentEmpty: SliceSegment[] = []
  const targetNormal = [{ top: 0.3, bottom: 0.7 }]
  
  const result3 = matchSegmentsOptimal(currentEmpty, targetNormal)
  console.log('Result Current:', result3.currentSegments)
  console.log('Result Target:', result3.targetSegments)
  
  if (checkForCenterDisappearance(result3.currentSegments, 'テスト3(current)') ||
      checkForCenterDisappearance(result3.targetSegments, 'テスト3(target)')) {
    failedTests++
  }
  
  // テストケース4: セグメント→空の変化
  totalTests++
  console.log('\nテスト4: セグメント→空')
  const currentNormal = [{ top: 0.3, bottom: 0.7 }]
  const targetEmpty: SliceSegment[] = []
  
  const result4 = matchSegmentsOptimal(currentNormal, targetEmpty)
  console.log('Result Current:', result4.currentSegments)
  console.log('Result Target:', result4.targetSegments)
  
  if (checkForCenterDisappearance(result4.currentSegments, 'テスト4(current)') ||
      checkForCenterDisappearance(result4.targetSegments, 'テスト4(target)')) {
    failedTests++
  }
  
  // テストケース5: 複雑なケース（5個→2個）
  totalTests++
  console.log('\nテスト5: 5個→2個（複雑なケース）')
  const current5 = [
    { top: 0.1, bottom: 0.2 },
    { top: 0.25, bottom: 0.35 },
    { top: 0.4, bottom: 0.6 },
    { top: 0.65, bottom: 0.75 },
    { top: 0.8, bottom: 0.9 }
  ]
  const target2 = [
    { top: 0.2, bottom: 0.4 },
    { top: 0.6, bottom: 0.8 }
  ]
  
  const result5 = matchSegmentsOptimal(current5, target2)
  console.log('Result Current:', result5.currentSegments)
  console.log('Result Target:', result5.targetSegments)
  
  if (checkForCenterDisappearance(result5.targetSegments, 'テスト5')) {
    failedTests++
  }
  
  // テストケース6: エッジケース（極小セグメント）
  totalTests++
  console.log('\nテスト6: エッジケース（極小セグメント）')
  const currentTiny = [{ top: 0.495, bottom: 0.505 }]
  const targetLarge = [{ top: 0.2, bottom: 0.8 }]
  
  const result6 = matchSegmentsOptimal(currentTiny, targetLarge)
  console.log('Result Current:', result6.currentSegments)
  console.log('Result Target:', result6.targetSegments)
  
  if (checkForCenterDisappearance(result6.currentSegments, 'テスト6(current)') ||
      checkForCenterDisappearance(result6.targetSegments, 'テスト6(target)')) {
    failedTests++
  }
  
  // テストケース7: 小さな円の仕様確認
  totalTests++
  console.log('\nテスト7: 小さな円の仕様確認')
  const currentEmpty2: SliceSegment[] = []
  const targetSmallCircle = [{ top: 0.485, bottom: 0.515 }] // 意図的な小さな円
  
  const result7 = matchSegmentsOptimal(currentEmpty2, targetSmallCircle)
  console.log('Result Current:', result7.currentSegments)
  console.log('Result Target:', result7.targetSegments)
  
  // 小さな円は正常として扱われるべき
  const hasSmallCircles = result7.currentSegments.some(seg => {
    const center = (seg.top + seg.bottom) / 2
    const height = seg.bottom - seg.top
    return Math.abs(center - 0.5) < 0.001 && Math.abs(height - 0.03) < 0.005
  })
  
  if (hasSmallCircles) {
    console.log('✅ テスト7: 意図的な小さな円が正しく生成されました')
  } else {
    console.warn('⚠️ テスト7: 小さな円が生成されませんでした')
    failedTests++
  }
  
  // 結果サマリー
  console.log(`\n=== テスト結果サマリー ===`)
  console.log(`総テスト数: ${totalTests}`)
  console.log(`成功: ${totalTests - failedTests}`)
  console.log(`失敗: ${failedTests}`)
  
  if (failedTests === 0) {
    console.log('🎉 全テストが成功しました！中央消滅問題は修正されています。')
  } else {
    console.warn(`⚠️  ${failedTests}個のテストで問題が検出されました。`)
  }
  
  console.log('=== テスト完了 ===\n')
}

/**
 * デフォルトのスライスマップを作成
 * 各スライスに中央に配置された小さな円形状のセグメントを含む
 */
export function createDefaultSliceMap(sliceCount: number): SliceMap {
  const sliceMap: SliceMap = []
  
  for (let i = 0; i < sliceCount; i++) {
    sliceMap.push([{
      top: 0.485,    // 中央より少し上
      bottom: 0.515  // 中央より少し下（高さ0.03の小さな円）
    }])
  }
  
  return sliceMap
}

/**
 * テキストをスライスマップに変換
 */
export async function textToSliceMap(text: string, sliceCount: number): Promise<SliceMap> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      resolve(createDefaultSliceMap(sliceCount))
      return
    }

    canvas.width = sliceCount * 4
    canvas.height = 200

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'black'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 文字サイズを動的に調整
    const targetWidth = canvas.width * 0.9 // キャンバス幅の90%を目標
    let fontSize = 120
    let textWidth = 0
    
    // 最適なフォントサイズを見つける
    do {
      ctx.font = `${fontSize}px Helvetica, Hiragino Kaku Gothic, sans-serif`
      textWidth = ctx.measureText(text).width
      
      if (textWidth > targetWidth) {
        fontSize -= 5
      } else if (textWidth < targetWidth * 0.8 && fontSize < 200) {
        fontSize += 5
      } else {
        break
      }
    } while (fontSize > 10 && fontSize < 300)

    // 最終的な文字を描画
    ctx.font = `${fontSize}px Helvetica, Hiragino Kaku Gothic, sans-serif`
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const sliceMap = extractSliceMap(imageData, canvas.width, canvas.height, sliceCount)

    resolve(sliceMap)
  })
}

/**
 * 画像データからスライスマップを抽出
 */
function extractSliceMap(imageData: ImageData, canvasWidth: number, canvasHeight: number, sliceCount: number): SliceMap {
  const sliceMap: SliceMap = []
  const sliceWidth = canvasWidth / sliceCount

  for (let sliceIndex = 0; sliceIndex < sliceCount; sliceIndex++) {
    const segments: SliceSegment[] = []
    const startX = Math.floor(sliceIndex * sliceWidth)
    const endX = Math.floor((sliceIndex + 1) * sliceWidth)

    let inSegment = false
    let segmentStart = 0

    for (let y = 0; y < canvasHeight; y++) {
      let hasPixel = false

      for (let x = startX; x < endX; x++) {
        const pixelIndex = (y * canvasWidth + x) * 4
        const r = imageData.data[pixelIndex]
        const g = imageData.data[pixelIndex + 1]
        const b = imageData.data[pixelIndex + 2]

        if (r < 128 || g < 128 || b < 128) {
          hasPixel = true
          break
        }
      }

      if (hasPixel && !inSegment) {
        inSegment = true
        segmentStart = y
      } else if (!hasPixel && inSegment) {
        inSegment = false
        segments.push({
          top: segmentStart / canvasHeight,
          bottom: y / canvasHeight
        })
      }
    }

    if (inSegment) {
      segments.push({
        top: segmentStart / canvasHeight,
        bottom: 1.0
      })
    }

    if (segments.length === 0) {
      // セグメントがない場合は、中央の小さな円を作成
      segments.push({
        top: 0.485,    // 中央より少し上
        bottom: 0.515  // 中央より少し下（高さ0.03の小さな円）
      })
    }

    sliceMap.push(segments)
  }

  return sliceMap
}

/**
 * セグメントをマッチング（改良版）
 * 全てのセグメントが最も近いセグメントにモーフするように改良
 */
export function matchSegments(currentSliceMap: SliceMap, targetSliceMap: SliceMap, sliceCount: number) {
  const morphPairs = []

  for (let i = 0; i < sliceCount; i++) {
    const currentSegments = currentSliceMap[i] || []
    const targetSegments = targetSliceMap[i] || []

    // 改良されたマッチングロジック
    const matched = matchSegmentsOptimal(currentSegments, targetSegments)

    morphPairs.push({
      currentSegments: matched.currentSegments,
      targetSegments: matched.targetSegments,
      sliceIndex: i
    })
  }

  return morphPairs
}

/**
 * セグメント間の最適なマッチングを計算
 * 改良版：中央消滅を防ぎ、全てのセグメントが意味のあるターゲットを持つように改良
 */
function matchSegmentsOptimal(currentSegments: SliceSegment[], targetSegments: SliceSegment[]) {
  if (currentSegments.length === 0 && targetSegments.length === 0) {
    return { currentSegments: [], targetSegments: [] }
  }

  if (currentSegments.length === 0) {
    // currentが空の場合、中央から小さな円として出現させる
    const matchedCurrent: SliceSegment[] = []
    for (const targetSeg of targetSegments) {
      // 中央（0.5）に小さな円状のセグメントから開始
      matchedCurrent.push({
        top: 0.485,    // 中央より少し上
        bottom: 0.515  // 中央より少し下（高さ0.03の小さな円）
      })
    }
    return {
      currentSegments: matchedCurrent,
      targetSegments: targetSegments
    }
  }

  if (targetSegments.length === 0) {
    // targetが空の場合、中央の小さな円に収束させる
    const matchedTarget: SliceSegment[] = []
    for (const currentSeg of currentSegments) {
      // 中央（0.5）の小さな円状のセグメントに収束
      matchedTarget.push({
        top: 0.485,    // 中央より少し上  
        bottom: 0.515  // 中央より少し下（高さ0.03の小さな円）
      })
    }
    return {
      currentSegments: currentSegments,
      targetSegments: matchedTarget
    }
  }

  // セグメント数に応じた処理
  if (currentSegments.length >= targetSegments.length) {
    // セグメント数が減る場合：複数のcurrentセグメントが同じtargetに収束
    return matchSegmentsConverging(currentSegments, targetSegments)
  } else {
    // セグメント数が増える場合：1つのcurrentから複数のtargetに分散
    return matchSegmentsDivergeing(currentSegments, targetSegments)
  }
}

/**
 * セグメント数が減る場合のマッチング（収束パターン）改良版
 * 重み付きマッチングで最適な組み合わせを計算
 */
function matchSegmentsConverging(currentSegments: SliceSegment[], targetSegments: SliceSegment[]) {
  const matchedCurrent: SliceSegment[] = []
  const matchedTarget: SliceSegment[] = []

  // 各currentセグメントに最も適切なtargetセグメントを割り当て
  for (const currentSeg of currentSegments) {
    const currentCenter = (currentSeg.top + currentSeg.bottom) / 2
    let bestTarget = targetSegments[0]
    let bestScore = Number.POSITIVE_INFINITY

    // 距離とサイズの類似性を組み合わせたスコアで最適なターゲットを選択
    for (const targetSeg of targetSegments) {
      const targetCenter = (targetSeg.top + targetSeg.bottom) / 2
      const targetHeight = targetSeg.bottom - targetSeg.top
      const currentHeight = currentSeg.bottom - currentSeg.top
      
      // 距離スコア（重み0.7）+ サイズ差スコア（重み0.3）
      const distanceScore = Math.abs(targetCenter - currentCenter) * 0.7
      const sizeScore = Math.abs(targetHeight - currentHeight) * 0.3
      const totalScore = distanceScore + sizeScore

      if (totalScore < bestScore) {
        bestScore = totalScore
        bestTarget = targetSeg
      }
    }

    matchedCurrent.push(currentSeg)
    matchedTarget.push(bestTarget)
  }

  return {
    currentSegments: matchedCurrent,
    targetSegments: matchedTarget
  }
}

/**
 * セグメント数が増える場合のマッチング（分散パターン）改良版
 * より自然な分散アニメーションのための重み付きマッチング
 */
function matchSegmentsDivergeing(currentSegments: SliceSegment[], targetSegments: SliceSegment[]) {
  const matchedCurrent: SliceSegment[] = []
  const matchedTarget: SliceSegment[] = []

  // 使用済みのcurrentセグメントを追跡（より均等な分散のため）
  const currentUsageCount = new Array(currentSegments.length).fill(0)

  // 各targetセグメントに最適なcurrentセグメントを割り当て
  for (const targetSeg of targetSegments) {
    const targetCenter = (targetSeg.top + targetSeg.bottom) / 2
    let bestCurrentIndex = 0
    let bestScore = Number.POSITIVE_INFINITY

    // 距離、サイズ、使用頻度を組み合わせたスコアで最適なカレントを選択
    for (let i = 0; i < currentSegments.length; i++) {
      const currentSeg = currentSegments[i]
      const currentCenter = (currentSeg.top + currentSeg.bottom) / 2
      const currentHeight = currentSeg.bottom - currentSeg.top
      const targetHeight = targetSeg.bottom - targetSeg.top
      
      // 距離スコア（重み0.5）+ サイズ差スコア（重み0.3）+ 使用頻度ペナルティ（重み0.2）
      const distanceScore = Math.abs(currentCenter - targetCenter) * 0.5
      const sizeScore = Math.abs(currentHeight - targetHeight) * 0.3
      const usageScore = currentUsageCount[i] * 0.2 // 使用回数が多いほどペナルティ
      const totalScore = distanceScore + sizeScore + usageScore

      if (totalScore < bestScore) {
        bestScore = totalScore
        bestCurrentIndex = i
      }
    }

    matchedCurrent.push(currentSegments[bestCurrentIndex])
    matchedTarget.push(targetSeg)
    currentUsageCount[bestCurrentIndex]++
  }

  return {
    currentSegments: matchedCurrent,
    targetSegments: matchedTarget
  }
}

/**
 * スライスマップの妥当性を検証
 * 各セグメントが有効な座標範囲内にあることを確認
 */
export function validateSliceMap(sliceMap: SliceMap): boolean {
  if (!Array.isArray(sliceMap)) {
    return false
  }

  for (const slice of sliceMap) {
    if (!Array.isArray(slice)) {
      return false
    }

    for (const segment of slice) {
      // セグメントが有効なオブジェクトかチェック
      if (!segment || typeof segment !== 'object') {
        return false
      }

      // top と bottom が数値かチェック
      if (typeof segment.top !== 'number' || typeof segment.bottom !== 'number') {
        return false
      }

      // 座標が 0-1 の範囲内かチェック
      if (segment.top < 0 || segment.top > 1 || segment.bottom < 0 || segment.bottom > 1) {
        return false
      }

      // top < bottom かチェック
      if (segment.top >= segment.bottom) {
        return false
      }
    }
  }

  return true
}

/**
 * リアルタイムでセグメントの妥当性を検証する関数
 * アニメーション中の中央消滅を検出
 */
export function validateMorphingSegments(morphPairs: any[], progress: number): boolean {
  let hasIssues = false
  
  for (let i = 0; i < morphPairs.length; i++) {
    const pair = morphPairs[i]
    
    // 現在の進行状況でのセグメント位置を計算
    for (let j = 0; j < pair.currentSegments.length; j++) {
      const current = pair.currentSegments[j]
      const target = pair.targetSegments[j]
      
      // 線形補間で現在の位置を計算
      const currentTop = current.top + (target.top - current.top) * progress
      const currentBottom = current.bottom + (target.bottom - current.bottom) * progress
      
      const center = (currentTop + currentBottom) / 2
      const height = currentBottom - currentTop
      
      // 中央消滅チェック（意図的な小さな円は除外）
      const isIntentionalSmallCircle = Math.abs(center - 0.5) < 0.001 && 
                                       Math.abs(height - 0.03) < 0.005
      if (Math.abs(center - 0.5) < 0.01 && height < 0.02 && !isIntentionalSmallCircle) {
        console.warn(`⚠️  スライス${i}、セグメント${j}で意図しない中央消滅検出 (progress: ${progress.toFixed(3)})`, {
          current: { top: currentTop, bottom: currentBottom },
          original: { current, target }
        })
        hasIssues = true
      }
      
      // 無効な座標チェック
      if (currentTop < 0 || currentTop > 1 || currentBottom < 0 || currentBottom > 1) {
        console.warn(`⚠️  スライス${i}、セグメント${j}で無効な座標検出`, {
          top: currentTop,
          bottom: currentBottom
        })
        hasIssues = true
      }
      
      // 逆転チェック
      if (currentTop >= currentBottom) {
        console.warn(`⚠️  スライス${i}、セグメント${j}で座標逆転検出`, {
          top: currentTop,
          bottom: currentBottom
        })
        hasIssues = true
      }
    }
  }
  
  return !hasIssues
}

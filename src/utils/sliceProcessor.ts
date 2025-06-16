import type { SliceMap, SliceSegment } from '../types/slice'

/**
 * デフォルトのスライスマップを作成
 * 各スライスに中央に配置されたカプセル形状のセグメントを含む
 */
export function createDefaultSliceMap(sliceCount: number): SliceMap {
  const sliceMap: SliceMap = []
  
  for (let i = 0; i < sliceCount; i++) {
    sliceMap.push([{
      top: 0.35,
      bottom: 0.65
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
      segments.push({
        top: 0.49,
        bottom: 0.51
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
 * セグメント数が減る場合は複数のセグメントが同じターゲットに収束するように改良
 */
function matchSegmentsOptimal(currentSegments: SliceSegment[], targetSegments: SliceSegment[]) {
  if (currentSegments.length === 0 && targetSegments.length === 0) {
    return { currentSegments: [], targetSegments: [] }
  }

  if (currentSegments.length === 0) {
    // currentが空の場合、targetの各セグメントに対して中心線から開始
    const centerSegment = { top: 0.49, bottom: 0.51 }
    return {
      currentSegments: targetSegments.map(() => centerSegment),
      targetSegments: targetSegments
    }
  }

  if (targetSegments.length === 0) {
    // targetが空の場合、currentの各セグメントを中心線に収束
    const centerSegment = { top: 0.49, bottom: 0.51 }
    return {
      currentSegments: currentSegments,
      targetSegments: currentSegments.map(() => centerSegment)
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
 * セグメント数が減る場合のマッチング（収束パターン）
 * 例：3個→1個の場合、3つ全てが1つのターゲットに向かう
 */
function matchSegmentsConverging(currentSegments: SliceSegment[], targetSegments: SliceSegment[]) {
  const matchedCurrent: SliceSegment[] = []
  const matchedTarget: SliceSegment[] = []

  // 各currentセグメントに最も近いtargetセグメントを割り当て（重複OK）
  for (const currentSeg of currentSegments) {
    const currentCenter = (currentSeg.top + currentSeg.bottom) / 2
    let nearestTarget = targetSegments[0]
    let minDistance = Math.abs((targetSegments[0].top + targetSegments[0].bottom) / 2 - currentCenter)

    // 最も近いターゲットセグメントを探す
    for (const targetSeg of targetSegments) {
      const targetCenter = (targetSeg.top + targetSeg.bottom) / 2
      const distance = Math.abs(targetCenter - currentCenter)
      
      if (distance < minDistance) {
        minDistance = distance
        nearestTarget = targetSeg
      }
    }

    matchedCurrent.push(currentSeg)
    matchedTarget.push(nearestTarget) // 同じターゲットが複数回使用される可能性
  }

  return {
    currentSegments: matchedCurrent,
    targetSegments: matchedTarget
  }
}

/**
 * セグメント数が増える場合のマッチング（分散パターン）
 * 例：1個→3個の場合、1つのセグメントから3つに分かれる
 */
function matchSegmentsDivergeing(currentSegments: SliceSegment[], targetSegments: SliceSegment[]) {
  const matchedCurrent: SliceSegment[] = []
  const matchedTarget: SliceSegment[] = []

  // 各targetセグメントに最も近いcurrentセグメントを割り当て（重複OK）
  for (const targetSeg of targetSegments) {
    const targetCenter = (targetSeg.top + targetSeg.bottom) / 2
    let nearestCurrent = currentSegments[0]
    let minDistance = Math.abs((currentSegments[0].top + currentSegments[0].bottom) / 2 - targetCenter)

    // 最も近いカレントセグメントを探す
    for (const currentSeg of currentSegments) {
      const currentCenter = (currentSeg.top + currentSeg.bottom) / 2
      const distance = Math.abs(currentCenter - targetCenter)
      
      if (distance < minDistance) {
        minDistance = distance
        nearestCurrent = currentSeg
      }
    }

    matchedCurrent.push(nearestCurrent) // 同じカレントが複数回使用される可能性
    matchedTarget.push(targetSeg)
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

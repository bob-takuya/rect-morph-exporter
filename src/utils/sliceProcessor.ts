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
 * すべてのセグメントが無駄にならないよう、最も近いセグメントとペアリング
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

  // 両方にセグメントがある場合の最適マッチング
  const matchedCurrent: SliceSegment[] = []
  const matchedTarget: SliceSegment[] = []

  const maxCount = Math.max(currentSegments.length, targetSegments.length)

  for (let i = 0; i < maxCount; i++) {
    if (i < currentSegments.length && i < targetSegments.length) {
      // 両方にセグメントがある場合：そのままペアリング
      matchedCurrent.push(currentSegments[i])
      matchedTarget.push(targetSegments[i])
    } else if (i < currentSegments.length) {
      // currentにのみセグメントがある場合：最も近いtargetを探す
      const currentSeg = currentSegments[i]
      const nearestTarget = findNearestSegment(currentSeg, targetSegments)
      matchedCurrent.push(currentSeg)
      matchedTarget.push(nearestTarget)
    } else {
      // targetにのみセグメントがある場合：最も近いcurrentを探す
      const targetSeg = targetSegments[i]
      const nearestCurrent = findNearestSegment(targetSeg, currentSegments)
      matchedCurrent.push(nearestCurrent)
      matchedTarget.push(targetSeg)
    }
  }

  return {
    currentSegments: matchedCurrent,
    targetSegments: matchedTarget
  }
}

/**
 * 指定されたセグメントに最も近いセグメントを見つける
 */
function findNearestSegment(targetSegment: SliceSegment, segments: SliceSegment[]): SliceSegment {
  if (segments.length === 0) {
    return { top: 0.49, bottom: 0.51 } // デフォルトの中心セグメント
  }

  const targetCenter = (targetSegment.top + targetSegment.bottom) / 2
  let nearestSegment = segments[0]
  let minDistance = Math.abs((segments[0].top + segments[0].bottom) / 2 - targetCenter)

  for (let i = 1; i < segments.length; i++) {
    const segmentCenter = (segments[i].top + segments[i].bottom) / 2
    const distance = Math.abs(segmentCenter - targetCenter)
    
    if (distance < minDistance) {
      minDistance = distance
      nearestSegment = segments[i]
    }
  }

  return nearestSegment
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

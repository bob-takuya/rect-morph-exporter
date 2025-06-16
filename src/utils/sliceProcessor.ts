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
 * 全セグメントの中央Y値を計算し、最も近いセグメント同士をマッチング
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

  // 全セグメントの中央Y値を計算
  const currentCenters = currentSegments.map(seg => ({
    segment: seg,
    center: (seg.top + seg.bottom) / 2,
    used: false
  }))

  const targetCenters = targetSegments.map(seg => ({
    segment: seg,
    center: (seg.top + seg.bottom) / 2,
    used: false
  }))

  // セグメント数の多い方を基準にマッチング
  const maxCount = Math.max(currentSegments.length, targetSegments.length)
  const matchedCurrent: SliceSegment[] = []
  const matchedTarget: SliceSegment[] = []

  // 最適マッチングアルゴリズム
  for (let i = 0; i < maxCount; i++) {
    if (i < currentSegments.length && i < targetSegments.length) {
      // 現在使用可能なセグメントから最も近いペアを見つける
      const { currentMatch, targetMatch } = findBestMatch(currentCenters, targetCenters)
      
      if (currentMatch && targetMatch) {
        matchedCurrent.push(currentMatch.segment)
        matchedTarget.push(targetMatch.segment)
        currentMatch.used = true
        targetMatch.used = true
      }
    } else if (i < currentSegments.length) {
      // currentにセグメントが余っている場合
      const unusedCurrent = currentCenters.find(c => !c.used)
      if (unusedCurrent) {
        const nearestTarget = findNearestUnusedTarget(unusedCurrent, targetCenters)
        matchedCurrent.push(unusedCurrent.segment)
        matchedTarget.push(nearestTarget)
        unusedCurrent.used = true
      }
    } else {
      // targetにセグメントが余っている場合
      const unusedTarget = targetCenters.find(t => !t.used)
      if (unusedTarget) {
        const nearestCurrent = findNearestUnusedCurrent(unusedTarget, currentCenters)
        matchedCurrent.push(nearestCurrent)
        matchedTarget.push(unusedTarget.segment)
        unusedTarget.used = true
      }
    }
  }

  return {
    currentSegments: matchedCurrent,
    targetSegments: matchedTarget
  }
}

/**
 * 使用可能なセグメントから最も近いペアを見つける
 */
function findBestMatch(currentCenters: Array<{segment: SliceSegment, center: number, used: boolean}>, 
                      targetCenters: Array<{segment: SliceSegment, center: number, used: boolean}>) {
  let bestDistance = Infinity
  let bestCurrentMatch = null
  let bestTargetMatch = null

  for (const current of currentCenters) {
    if (current.used) continue
    
    for (const target of targetCenters) {
      if (target.used) continue
      
      const distance = Math.abs(current.center - target.center)
      if (distance < bestDistance) {
        bestDistance = distance
        bestCurrentMatch = current
        bestTargetMatch = target
      }
    }
  }

  return { currentMatch: bestCurrentMatch, targetMatch: bestTargetMatch }
}

/**
 * 使用されていないターゲットセグメントから最も近いものを見つける
 */
function findNearestUnusedTarget(currentSeg: {segment: SliceSegment, center: number, used: boolean}, 
                                targetCenters: Array<{segment: SliceSegment, center: number, used: boolean}>): SliceSegment {
  const unusedTargets = targetCenters.filter(t => !t.used)
  
  if (unusedTargets.length === 0) {
    // 使用可能なターゲットがない場合は最も近いものを複製
    let nearestTarget = targetCenters[0]
    let minDistance = Math.abs(currentSeg.center - targetCenters[0].center)
    
    for (const target of targetCenters) {
      const distance = Math.abs(currentSeg.center - target.center)
      if (distance < minDistance) {
        minDistance = distance
        nearestTarget = target
      }
    }
    return nearestTarget.segment
  }

  let nearestTarget = unusedTargets[0]
  let minDistance = Math.abs(currentSeg.center - unusedTargets[0].center)

  for (const target of unusedTargets) {
    const distance = Math.abs(currentSeg.center - target.center)
    if (distance < minDistance) {
      minDistance = distance
      nearestTarget = target
    }
  }

  return nearestTarget.segment
}

/**
 * 使用されていないカレントセグメントから最も近いものを見つける
 */
function findNearestUnusedCurrent(targetSeg: {segment: SliceSegment, center: number, used: boolean}, 
                                 currentCenters: Array<{segment: SliceSegment, center: number, used: boolean}>): SliceSegment {
  const unusedCurrents = currentCenters.filter(c => !c.used)
  
  if (unusedCurrents.length === 0) {
    // 使用可能なカレントがない場合は最も近いものを複製
    let nearestCurrent = currentCenters[0]
    let minDistance = Math.abs(targetSeg.center - currentCenters[0].center)
    
    for (const current of currentCenters) {
      const distance = Math.abs(targetSeg.center - current.center)
      if (distance < minDistance) {
        minDistance = distance
        nearestCurrent = current
      }
    }
    return nearestCurrent.segment
  }

  let nearestCurrent = unusedCurrents[0]
  let minDistance = Math.abs(targetSeg.center - unusedCurrents[0].center)

  for (const current of unusedCurrents) {
    const distance = Math.abs(targetSeg.center - current.center)
    if (distance < minDistance) {
      minDistance = distance
      nearestCurrent = current
    }
  }

  return nearestCurrent.segment
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

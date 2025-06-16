/**
 * スライスセグメントの定義
 * 正規化された Y 座標 (0.0 - 1.0) で上端と下端を表す
 */
export interface SliceSegment {
  /** セグメントの上端位置 (0.0 - 1.0) */
  top: number
  /** セグメントの下端位置 (0.0 - 1.0) */
  bottom: number
}

/**
 * スライスマップの定義
 * 各スライス列のセグメント配列を含む
 */
export type SliceMap = SliceSegment[][]

/**
 * アニメーション設定
 */
export interface AnimationConfig {
  /** アニメーション時間 (ms) */
  duration: number
  /** イージング関数 */
  easing: string
}

/**
 * モーフィング設定
 */
export interface MorphConfig {
  /** スライス数 */
  sliceCount: number
  /** SVG キャンバスの幅 */
  svgWidth: number
  /** SVG キャンバスの高さ */
  svgHeight: number
  /** アニメーション設定 */
  animation: AnimationConfig
}

/**
 * セグメントマッチングペア
 */
export interface SegmentMatchPair {
  /** 現在のセグメント配列 */
  currentSegments: SliceSegment[]
  /** ターゲットセグメント配列 */
  targetSegments: SliceSegment[]
  /** スライスインデックス */
  sliceIndex: number
}

import { useRef, useState, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CropState {
  /** CSS object-position X, 0–100 %. */
  x: number;
  /** CSS object-position Y, 0–100 %. */
  y: number;
  /**
   * CSS `transform: scale()` factor applied on top of `object-fit: cover`.
   * 1 = no extra zoom (image just covers the card). Must be ≥ 1.
   */
  zoom: number;
}

interface DualCropEditorProps {
  src: string;
  wideCrop: CropState;
  squareCrop: CropState;
  onWideChange: (crop: CropState) => void;
  onSquareChange: (crop: CropState) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Fixed display width of the editor image in px. */
const DISPLAY_WIDTH = 480;

/**
 * Aspect ratios that match the actual card slot dimensions used on the homepage.
 *
 *  Wide   → featured full-width card at max desktop: 1200 px × 500 px = 12 : 5 = 2.4
 *  Narrow → small paired column card: ~480 px × 360 px = 4 : 3 ≈ 1.333
 *
 * These ratios drive the crop-box shape in the editor so the preview matches
 * what the visitor sees on the public site.
 */
const WIDE_CARD_RATIO   = 12 / 5; // 2.4
const NARROW_CARD_RATIO = 4 / 3;  // ≈ 1.333

const MIN_CSS_ZOOM = 1;
const MAX_CSS_ZOOM = 3;

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/**
 * The "natural cover region" in display-space pixels:
 * what portion of the displayed image would be visible after object-fit:cover
 * at cssZoom=1 for a card of the given aspect ratio.
 *
 * Derivation:
 *   displayR = DISPLAY_WIDTH / imgH
 *   If displayR > cardR → cover scales by height:
 *     visH = imgH (full height shown), visW = imgH × cardR
 *   If displayR ≤ cardR → cover scales by width:
 *     visW = DISPLAY_WIDTH (full width shown), visH = DISPLAY_WIDTH / cardR
 *
 * With additional CSS zoom (cssZoom ≥ 1), the visible region shrinks
 * proportionally: boxW = visW / cssZoom, boxH = visH / cssZoom.
 */
function visibleRegionAtZoom1(imgH: number, cardR: number): { visW: number; visH: number } {
  const displayR = DISPLAY_WIDTH / imgH;
  if (displayR > cardR) {
    return { visW: imgH * cardR, visH: imgH };
  }
  return { visW: DISPLAY_WIDTH, visH: DISPLAY_WIDTH / cardR };
}

/** Box pixel dimensions in display space for a given CSS zoom level. */
function boxDims(imgH: number, cardR: number, cssZoom: number): { bw: number; bh: number } {
  const { visW, visH } = visibleRegionAtZoom1(imgH, cardR);
  return { bw: visW / cssZoom, bh: visH / cssZoom };
}

/**
 * Clamp x/y so the crop box stays entirely within the displayed image.
 * Returns a new CropState with x/y adjusted; zoom is unchanged.
 */
function clampXY(crop: CropState, imgH: number, cardR: number): CropState {
  const { bw, bh } = boxDims(imgH, cardR, crop.zoom);
  const minX = (bw / 2 / DISPLAY_WIDTH) * 100;
  const maxX = ((DISPLAY_WIDTH - bw / 2) / DISPLAY_WIDTH) * 100;
  const minY = (bh / 2 / imgH) * 100;
  const maxY = ((imgH - bh / 2) / imgH) * 100;
  return {
    x: Math.max(minX, Math.min(maxX, crop.x)),
    y: Math.max(minY, Math.min(maxY, crop.y)),
    zoom: crop.zoom,
  };
}

// ─── Drag types ───────────────────────────────────────────────────────────────

type DragKind =
  | "wide-move"
  | "narrow-move"
  | "wide-corner"
  | "narrow-corner";

interface DragState {
  kind: DragKind;
  startClientX: number;
  startClientY: number;
  startCrop: CropState;
  /** Natural cover region at drag start (for corner drags). */
  visW: number;
  visH: number;
}

// ─── Box overlay ──────────────────────────────────────────────────────────────

function CropBox({
  label,
  borderColor,
  bgColor,
  boxW,
  boxH,
  centerX,
  centerY,
  onBodyMouseDown,
  onCornerMouseDown,
}: {
  label: string;
  borderColor: string;
  bgColor: string;
  boxW: number;
  boxH: number;
  centerX: number;
  centerY: number;
  onBodyMouseDown: (e: React.MouseEvent) => void;
  onCornerMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="absolute select-none"
      style={{
        left: centerX - boxW / 2,
        top:  centerY - boxH / 2,
        width: boxW,
        height: boxH,
        border: `2px solid ${borderColor}`,
        background: bgColor,
        cursor: "move",
        boxSizing: "border-box",
      }}
      onMouseDown={onBodyMouseDown}
    >
      {/* Label badge */}
      <span
        className="absolute top-1 left-1 text-[10px] font-semibold leading-none px-1 py-0.5 rounded pointer-events-none"
        style={{ background: borderColor, color: "#fff" }}
      >
        {label}
      </span>

      {/* Bottom-right corner resize handle */}
      <div
        className="absolute"
        style={{
          bottom: -5,
          right: -5,
          width: 12,
          height: 12,
          background: borderColor,
          border: "2px solid #fff",
          borderRadius: 2,
          cursor: "se-resize",
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onCornerMouseDown(e);
        }}
      />
    </div>
  );
}

// ─── Crop preview thumbnail ───────────────────────────────────────────────────

function CropPreview({
  src,
  label,
  containerW,
  containerH,
  crop,
  imgW,
  imgH,
  cardR,
}: {
  src: string;
  label: string;
  containerW: number;
  containerH: number;
  crop: CropState;
  /** Full display width of the editor image (= DISPLAY_WIDTH constant). */
  imgW: number;
  /** Measured display height of the editor image in px. */
  imgH: number;
  /** Card aspect ratio for this slot (e.g. WIDE_CARD_RATIO or NARROW_CARD_RATIO). */
  cardR: number;
}) {
  // Crop-box size in display space (same geometry as the overlay box).
  const { bw, bh } = boxDims(imgH, cardR, crop.zoom);

  // Top-left corner of the crop box in display space.
  const left = (crop.x / 100) * imgW - bw / 2;
  const top  = (crop.y / 100) * imgH - bh / 2;

  // Scale so the crop box fills the preview container exactly.
  const sx = containerW / bw;
  const sy = containerH / bh;

  // Full image size in preview space.
  const previewW = imgW * sx;
  const previewH = imgH * sy;

  // Offset so the crop origin aligns with the container's top-left corner.
  const imgLeft = -left * sx;
  const imgTop  = -top  * sy;

  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-gray-500">{label}</p>
      <div
        className="relative overflow-hidden rounded border border-gray-200 bg-gray-100"
        style={{ width: containerW, height: containerH }}
      >
        <img
          src={src}
          alt=""
          style={{
            position: "absolute",
            top: imgTop,
            left: imgLeft,
            width: previewW,
            height: previewH,
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DualCropEditor({
  src,
  wideCrop,
  squareCrop,
  onWideChange,
  onSquareChange,
}: DualCropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** Display height in px — known only after image loads. */
  const [imgH, setImgH] = useState(0);

  const dragRef = useRef<DragState | null>(null);

  // ── Mouse event handlers ──────────────────────────────────────────────────

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || imgH === 0) return;

      if (d.kind === "wide-move" || d.kind === "narrow-move") {
        const cardR = d.kind === "wide-move" ? WIDE_CARD_RATIO : NARROW_CARD_RATIO;
        const dx = ((e.clientX - d.startClientX) / DISPLAY_WIDTH) * 100;
        const dy = ((e.clientY - d.startClientY) / imgH) * 100;
        const newCrop: CropState = {
          ...d.startCrop,
          x: d.startCrop.x + dx,
          y: d.startCrop.y + dy,
        };
        const clamped = clampXY(newCrop, imgH, cardR);
        d.kind === "wide-move" ? onWideChange(clamped) : onSquareChange(clamped);

      } else {
        // Corner drag — change zoom.
        // Dragging bottom-right corner: right/down → bigger box → smaller cssZoom.
        const delta = (e.clientX - d.startClientX) + (e.clientY - d.startClientY);
        // Map delta pixels to a change in box width (same sign: right = bigger)
        const newBoxW = Math.max(
          d.visW / MAX_CSS_ZOOM,
          Math.min(d.visW / MIN_CSS_ZOOM, d.visW / d.startCrop.zoom + delta * 0.5)
        );
        const newZoom = Math.max(MIN_CSS_ZOOM, Math.min(MAX_CSS_ZOOM, d.visW / newBoxW));
        const cardR = d.kind === "wide-corner" ? WIDE_CARD_RATIO : NARROW_CARD_RATIO;
        const clamped = clampXY({ ...d.startCrop, zoom: newZoom }, imgH, cardR);
        d.kind === "wide-corner" ? onWideChange(clamped) : onSquareChange(clamped);
      }
    },
    [imgH, onWideChange, onSquareChange]
  );

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const startDrag = (kind: DragKind, crop: CropState, e: React.MouseEvent) => {
    e.preventDefault();
    const cardR = kind === "wide-move" || kind === "wide-corner"
      ? WIDE_CARD_RATIO
      : NARROW_CARD_RATIO;
    const { visW, visH } = visibleRegionAtZoom1(imgH || DISPLAY_WIDTH, cardR);
    dragRef.current = {
      kind,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCrop: { ...crop },
      visW,
      visH,
    };
  };

  // ── Derived display values ────────────────────────────────────────────────

  const wCenterX  = (wideCrop.x / 100) * DISPLAY_WIDTH;
  const wCenterY  = (wideCrop.y / 100) * (imgH || DISPLAY_WIDTH);
  const { bw: wBW, bh: wBH } = boxDims(imgH || DISPLAY_WIDTH, WIDE_CARD_RATIO, wideCrop.zoom);

  const nCenterX  = (squareCrop.x / 100) * DISPLAY_WIDTH;
  const nCenterY  = (squareCrop.y / 100) * (imgH || DISPLAY_WIDTH);
  const { bw: nBW, bh: nBH } = boxDims(imgH || DISPLAY_WIDTH, NARROW_CARD_RATIO, squareCrop.zoom);

  const ready = imgH > 0;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Drag a box to reposition · Drag the corner handle to zoom (larger box = less zoom)
      </p>

      {/* ── Image + overlay container ────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative rounded border border-gray-200 overflow-hidden bg-gray-100 select-none"
        style={{ width: DISPLAY_WIDTH }}
      >
        <img
          src={src}
          alt=""
          style={{ width: "100%", display: "block", pointerEvents: "none" }}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            setImgH(Math.round(DISPLAY_WIDTH * img.naturalHeight / img.naturalWidth));
          }}
        />

        {ready && (
          <>
            {/* Wide crop — blue */}
            <CropBox
              label="Wide"
              borderColor="#2563eb"
              bgColor="rgba(37,99,235,0.12)"
              boxW={wBW}
              boxH={wBH}
              centerX={wCenterX}
              centerY={wCenterY}
              onBodyMouseDown={(e) => startDrag("wide-move", wideCrop, e)}
              onCornerMouseDown={(e) => startDrag("wide-corner", wideCrop, e)}
            />

            {/* Narrow crop — amber */}
            <CropBox
              label="Narrow"
              borderColor="#d97706"
              bgColor="rgba(217,119,6,0.12)"
              boxW={nBW}
              boxH={nBH}
              centerX={nCenterX}
              centerY={nCenterY}
              onBodyMouseDown={(e) => startDrag("narrow-move", squareCrop, e)}
              onCornerMouseDown={(e) => startDrag("narrow-corner", squareCrop, e)}
            />
          </>
        )}
      </div>

      {/* ── Zoom readouts ─────────────────────────────────────────────────── */}
      {ready && (
        <div className="flex gap-6 text-xs text-gray-500">
          <span>
            <span
              className="inline-block w-2 h-2 rounded-sm mr-1"
              style={{ background: "#2563eb" }}
            />
            Wide zoom: <strong>{wideCrop.zoom.toFixed(2)}×</strong>
          </span>
          <span>
            <span
              className="inline-block w-2 h-2 rounded-sm mr-1"
              style={{ background: "#d97706" }}
            />
            Narrow zoom: <strong>{squareCrop.zoom.toFixed(2)}×</strong>
          </span>
        </div>
      )}

      {/* ── Live preview thumbnails ──────────────────────────────────────── */}
      {ready && (
        <div className="flex gap-4 flex-wrap">
          <CropPreview
            src={src}
            label="Wide preview (~2.4:1 card)"
            containerW={216}
            containerH={90}
            crop={wideCrop}
            imgW={DISPLAY_WIDTH}
            imgH={imgH}
            cardR={WIDE_CARD_RATIO}
          />
          <CropPreview
            src={src}
            label="Narrow preview (4:3 card)"
            containerW={120}
            containerH={90}
            crop={squareCrop}
            imgW={DISPLAY_WIDTH}
            imgH={imgH}
            cardR={NARROW_CARD_RATIO}
          />
        </div>
      )}
    </div>
  );
}

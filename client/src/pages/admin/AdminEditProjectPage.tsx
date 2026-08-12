import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminGuard } from "./AdminGuard";
import { AdminLayout } from "./AdminLayout";
import { ImagePicker } from "./ImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Upload,
  Library,
} from "lucide-react";
import { MediaLibrary } from "./MediaLibrary";
import { DualCropEditor } from "./DualCropEditor";
import type { CropState } from "./DualCropEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = "text" | "full-image" | "split-image" | "video";

interface ImageSlot {
  src: string;
  alt: string;
  caption: string;
  captionVisible: boolean;
  /** CSS object-position value, e.g. "40.0% 30.0%". Defaults to "50% 50%". */
  objectPosition?: string;
  /** CSS transform scale applied on top of object-fit: cover. Range 1–3, default 1. */
  zoom?: number;
}

interface TextBlockPayload {
  paragraphs: string[];
}

interface FullImagePayload extends ImageSlot {}

interface SplitImagePayload {
  left: ImageSlot;
  right: ImageSlot;
  wide: "left" | "right";
}

interface VideoBlockPayload {
  src: string;
  alt: string;
  caption: string;
  captionVisible: boolean;
}

type BlockPayload = TextBlockPayload | FullImagePayload | SplitImagePayload | VideoBlockPayload;

interface EditorBlock {
  /** Stable client-side ID for React keys and DnD */
  _key: string;
  type: BlockType;
  payload: BlockPayload;
}

interface ProjectMeta {
  client: string;
  year: string;
  scope: string;
  role: string;
}

interface EditorState {
  title: string;
  slug: string;
  caseStudyLabel: string;
  heroImageUrl: string;
  heroImageId: string;
  heroImageAlt: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  /** Wide-crop anchor — repurposes the existing featuredImageObjectPosition column. */
  featuredImageObjectPosition: string;
  /** Wide-crop zoom — repurposes the existing featuredImageZoom column. */
  featuredImageZoom: number;
  /** Square-crop center X (0–100 %). */
  featuredSquareCropX: number;
  /** Square-crop center Y (0–100 %). */
  featuredSquareCropY: number;
  /** Square-crop zoom multiplier. */
  featuredSquareCropZoom: number;
  metadata: ProjectMeta;
  description: string[];
  quote: string;
  metaDescription: string;
  showOnHomepage: boolean;
  cardOverlay: 'in_progress' | 'confidential' | null;
  nextProjectSlug: string;
  nextProjectImageUrl: string;
  blocks: EditorBlock[];
}

function emptySlot(): ImageSlot {
  return { src: "", alt: "", caption: "", captionVisible: false, objectPosition: "50.0% 50.0%", zoom: 1 };
}

// ─── Focal-point crop picker ──────────────────────────────────────────────────

/**
 * Converts a legacy CSS objectPosition keyword string (e.g. "top left",
 * "center center") into { x, y } percentage numbers, or parses an already-
 * percentage string like "40.0% 30.0%".  Falls back to 50 / 50.
 */
function parseFocalPoint(objectPosition?: string): { x: number; y: number } {
  const pos = (objectPosition ?? "").trim().toLowerCase();

  const keyMap: Record<string, [number, number]> = {
    "top":             [50,  0], "bottom":          [50, 100],
    "left":            [ 0, 50], "right":           [100, 50],
    "center":          [50, 50],
    "top left":        [ 0,  0], "top center":      [50,  0], "top right":      [100,  0],
    "left top":        [ 0,  0], "center top":      [50,  0], "right top":      [100,  0],
    "center left":     [ 0, 50], "center center":   [50, 50], "center right":   [100, 50],
    "left center":     [ 0, 50], "right center":    [100, 50],
    "bottom left":     [ 0, 100], "bottom center":  [50, 100], "bottom right":  [100, 100],
    "left bottom":     [ 0, 100], "center bottom":  [50, 100], "right bottom":  [100, 100],
  };

  if (pos in keyMap) {
    const [x, y] = keyMap[pos];
    return { x, y };
  }

  // Try "X% Y%" format
  const parts = pos.split(/\s+/);
  const x = parseFloat(parts[0]);
  const y = parseFloat(parts[1]);
  if (!isNaN(x) && !isNaN(y)) return { x, y };

  return { x: 50, y: 50 };
}

/**
 * Interactive focal-point picker. Renders the source image (280 px wide) with
 * a draggable crosshair and a zoom slider below.
 */
function FocalPointCropper({
  src,
  objectPosition,
  zoom,
  onChange,
}: {
  src: string;
  objectPosition?: string;
  zoom: number;
  onChange: (objectPosition: string, zoom: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const { x, y } = parseFocalPoint(objectPosition);

  const readPosition = (e: React.MouseEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: px, y: py };
  };

  const applyPosition = (e: React.MouseEvent) => {
    const pos = readPosition(e);
    if (!pos) return;
    onChange(`${pos.x.toFixed(1)}% ${pos.y.toFixed(1)}%`, zoom);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Focal point — click or drag to position</p>
      {/* Image with draggable crosshair */}
      <div
        ref={wrapperRef}
        className="relative rounded border border-gray-200 overflow-hidden select-none bg-gray-100"
        style={{ width: 280, cursor: "crosshair" }}
        onMouseDown={(e) => {
          e.preventDefault();
          isDragging.current = true;
          applyPosition(e);
        }}
        onMouseMove={(e) => { if (isDragging.current) applyPosition(e); }}
        onMouseUp={() => { isDragging.current = false; }}
        onMouseLeave={() => { isDragging.current = false; }}
      >
        <img src={src} alt="" style={{ width: "100%", display: "block", pointerEvents: "none" }} draggable={false} />
        {/* Crosshair guide lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(to right,
                transparent calc(${x}% - 0.5px),
                rgba(255,255,255,0.65) calc(${x}% - 0.5px),
                rgba(255,255,255,0.65) calc(${x}% + 0.5px),
                transparent calc(${x}% + 0.5px)),
              linear-gradient(to bottom,
                transparent calc(${y}% - 0.5px),
                rgba(255,255,255,0.65) calc(${y}% - 0.5px),
                rgba(255,255,255,0.65) calc(${y}% + 0.5px),
                transparent calc(${y}% + 0.5px))
            `,
          }}
        />
        {/* Focal point dot */}
        <div
          className="absolute pointer-events-none rounded-full border-2 border-white bg-blue-500/40"
          style={{
            width: 18,
            height: 18,
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3)",
          }}
        />
      </div>
      {/* Zoom slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0 w-8">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          className="flex-1 h-1.5 accent-blue-600"
          onChange={(e) => onChange(`${x.toFixed(1)}% ${y.toFixed(1)}%`, parseFloat(e.target.value))}
        />
        <span className="text-xs text-gray-400 w-10 text-right shrink-0">{zoom.toFixed(2)}×</span>
      </div>
    </div>
  );
}

function newBlock(type: BlockType): EditorBlock {
  const _key = crypto.randomUUID();
  if (type === "text") return { _key, type, payload: { paragraphs: [""] } };
  if (type === "full-image") return { _key, type, payload: emptySlot() };
  if (type === "video") return { _key, type, payload: { src: "", alt: "", caption: "", captionVisible: false } };
  return {
    _key,
    type: "split-image",
    payload: { left: emptySlot(), right: emptySlot(), wide: "left" },
  };
}

function blockLabel(type: BlockType) {
  if (type === "text") return "Text";
  if (type === "full-image") return "Full image";
  if (type === "video") return "Video";
  return "Split image pair";
}

function blockBadgeColor(type: BlockType) {
  if (type === "text") return "secondary";
  if (type === "full-image") return "outline";
  if (type === "video") return "outline";
  return "outline";
}

// Coerce server data into EditorState
function serverToEditor(project: any, blocks: any[]): EditorState {
  const meta = (project.metadata as any) ?? {};
  return {
    title: project.title ?? "",
    slug: project.slug ?? "",
    caseStudyLabel: project.caseStudyLabel ?? "",
    heroImageUrl: project.heroImageUrl ?? "",
    heroImageId: project.heroImageId ?? "",
    heroImageAlt: project.heroImageAlt ?? "",
    featuredImageUrl: project.featuredImageUrl ?? "",
    featuredImageAlt: project.featuredImageAlt ?? "",
    featuredImageObjectPosition: project.featuredImageObjectPosition ?? "50.0% 50.0%",
    featuredImageZoom: project.featuredImageZoom ?? 1,
    featuredSquareCropX: project.featuredSquareCropX ?? 50,
    featuredSquareCropY: project.featuredSquareCropY ?? 50,
    featuredSquareCropZoom: project.featuredSquareCropZoom ?? 1,
    metadata: {
      client: meta.client ?? "",
      year: meta.year ?? "",
      scope: meta.scope ?? "",
      role: meta.role ?? "",
    },
    description: Array.isArray(project.description) ? project.description : [""],
    quote: project.quote ?? "",
    metaDescription: project.metaDescription ?? "",
    showOnHomepage: project.showOnHomepage ?? false,
    cardOverlay: (project.cardOverlay as 'in_progress' | 'confidential' | null) ?? null,
    nextProjectSlug: project.nextProjectSlug ?? "",
    nextProjectImageUrl: project.nextProjectImageUrl ?? "",
    blocks: blocks.map((b: any) => ({
      _key: crypto.randomUUID(),
      type: b.type as BlockType,
      payload: (b.payload ?? {}) as BlockPayload,
    })),
  };
}

function editorToPayload(state: EditorState, status?: "draft" | "published") {
  return {
    title: state.title,
    slug: state.slug,
    caseStudyLabel: state.caseStudyLabel || null,
    heroImageId: state.heroImageId || null,
    heroImageUrl: state.heroImageUrl || null,
    heroImageAlt: state.heroImageAlt || null,
    featuredImageUrl: state.featuredImageUrl || null,
    featuredImageAlt: state.featuredImageAlt || null,
    featuredImageObjectPosition: state.featuredImageUrl ? (state.featuredImageObjectPosition || null) : null,
    featuredImageZoom: state.featuredImageUrl ? (state.featuredImageZoom ?? null) : null,
    featuredSquareCropX: state.featuredImageUrl ? (state.featuredSquareCropX ?? null) : null,
    featuredSquareCropY: state.featuredImageUrl ? (state.featuredSquareCropY ?? null) : null,
    featuredSquareCropZoom: state.featuredImageUrl ? (state.featuredSquareCropZoom ?? null) : null,
    metadata: {
      client: state.metadata.client,
      year: state.metadata.year,
      scope: state.metadata.scope || undefined,
      role: state.metadata.role || undefined,
    },
    description: state.description,
    quote: state.quote || null,
    metaDescription: state.metaDescription || null,
    showOnHomepage: state.showOnHomepage,
    cardOverlay: state.cardOverlay,
    nextProjectSlug: state.nextProjectSlug || null,
    nextProjectImageUrl: state.nextProjectImageUrl || null,
    ...(status ? { status } : {}),
    blocks: state.blocks.map((b) => ({
      type: b.type,
      payload: b.payload,
    })),
  };
}

// ─── Image slot editor ────────────────────────────────────────────────────────

function ImageSlotEditor({
  label,
  value,
  onChange,
  aspectRatio = 1.5,
  cropPreviewLabel,
}: {
  label: string;
  value: ImageSlot;
  onChange: (v: ImageSlot) => void;
  /** width ÷ height ratio for the crop preview thumbnail (default 1.5 = 3:2) */
  aspectRatio?: number;
  /** Optional suffix appended to "Crop preview" label, e.g. "(full-width)" */
  cropPreviewLabel?: string;
}) {
  const previewWidth = 180;
  const previewHeight = Math.round(previewWidth / aspectRatio);
  return (
    <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <ImagePicker
        value={value.src || null}
        onChange={(url) => onChange({ ...value, src: url })}
        hidePreview
      />
      {value.src && (
        <>
          <FocalPointCropper
            src={value.src}
            objectPosition={value.objectPosition}
            zoom={value.zoom ?? 1}
            onChange={(pos, z) => onChange({ ...value, objectPosition: pos, zoom: z })}
          />
          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              Crop preview{cropPreviewLabel ? ` ${cropPreviewLabel}` : ""}
            </p>
            <div
              className="overflow-hidden rounded border border-gray-200 bg-gray-100"
              style={{ width: previewWidth, height: previewHeight }}
            >
              <img
                src={value.src}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: value.objectPosition || "50% 50%",
                  display: "block",
                  transform: (value.zoom ?? 1) !== 1 ? `scale(${value.zoom})` : undefined,
                  transformOrigin: value.objectPosition || "50% 50%",
                }}
              />
            </div>
          </div>
        </>
      )}
      <div>
        <Label className="text-xs">Alt text</Label>
        <Input
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
          placeholder="Describe the image for screen readers"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Caption</Label>
        <Input
          value={value.caption}
          onChange={(e) => onChange({ ...value, caption: e.target.value })}
          placeholder="Optional caption text"
          className="mt-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={`cap-vis-${label}`}
          checked={value.captionVisible}
          onCheckedChange={(checked) => onChange({ ...value, captionVisible: checked })}
        />
        <Label htmlFor={`cap-vis-${label}`} className="text-xs cursor-pointer">
          Show caption on page
        </Label>
      </div>
    </div>
  );
}

// ─── Block editors ────────────────────────────────────────────────────────────

function TextBlockEditor({
  payload,
  onChange,
}: {
  payload: TextBlockPayload;
  onChange: (p: TextBlockPayload) => void;
}) {
  return (
    <div className="space-y-2">
      {payload.paragraphs.map((para, i) => (
        <div key={i} className="flex gap-2">
          <Textarea
            value={para}
            rows={3}
            onChange={(e) => {
              const next = [...payload.paragraphs];
              next[i] = e.target.value;
              onChange({ paragraphs: next });
            }}
            placeholder={`Paragraph ${i + 1}`}
            className="flex-1 resize-none"
          />
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                const next = payload.paragraphs.filter((_, idx) => idx !== i);
                onChange({ paragraphs: next.length ? next : [""] });
              }}
              title="Remove paragraph"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange({ paragraphs: [...payload.paragraphs, ""] })}
      >
        <Plus className="w-3 h-3 mr-1" /> Add paragraph
      </Button>
    </div>
  );
}

function FullImageBlockEditor({
  payload,
  onChange,
}: {
  payload: FullImagePayload;
  onChange: (p: FullImagePayload) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Layout: Full width</p>
      <ImageSlotEditor
        label="Image"
        value={payload}
        onChange={onChange}
        aspectRatio={2.3}
        cropPreviewLabel="(full-width)"
      />
    </div>
  );
}

function SplitImageBlockEditor({
  payload,
  onChange,
}: {
  payload: SplitImagePayload;
  onChange: (p: SplitImagePayload) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Wide side</Label>
        <div className="flex gap-3 mt-2">
          {(["left", "right"] as const).map((side) => (
            <label key={side} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="wide"
                value={side}
                checked={payload.wide === side}
                onChange={() => onChange({ ...payload, wide: side })}
                className="accent-blue-600"
              />
              <span className="text-sm capitalize">Wide {side}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ImageSlotEditor
          label="Left image"
          value={payload.left}
          onChange={(v) => onChange({ ...payload, left: v })}
          aspectRatio={payload.wide === "left" ? 1.52 : 0.96}
          cropPreviewLabel={payload.wide === "left" ? "(wide)" : "(narrow)"}
        />
        <ImageSlotEditor
          label="Right image"
          value={payload.right}
          onChange={(v) => onChange({ ...payload, right: v })}
          aspectRatio={payload.wide === "right" ? 1.52 : 0.96}
          cropPreviewLabel={payload.wide === "right" ? "(wide)" : "(narrow)"}
        />
      </div>
    </div>
  );
}

// ─── Video block editor ───────────────────────────────────────────────────────

function VideoBlockEditor({
  payload,
  onChange,
}: {
  payload: VideoBlockPayload;
  onChange: (p: VideoBlockPayload) => void;
}) {
  const queryClient = useQueryClient();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadError(null);
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/media/upload", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Upload failed");
        }
        const media = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
        onChange({ ...payload, src: media.url });
      } catch (err: any) {
        setUploadError(err.message ?? "Upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [queryClient, payload, onChange]
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Layout: Video</p>
      <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
        {/* Current video preview */}
        {payload.src ? (
          <div className="relative w-full max-w-sm rounded-lg overflow-hidden border bg-black">
            <video
              src={payload.src}
              controls
              muted
              className="w-full max-h-48"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full max-w-sm h-32 rounded-lg border-2 border-dashed bg-muted text-muted-foreground">
            <div className="flex flex-col items-center gap-1 text-sm">
              <span className="text-2xl opacity-40">▶</span>
              <span>No video selected</span>
            </div>
          </div>
        )}

        {uploadError && (
          <p className="text-xs text-red-500">{uploadError}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading…" : "Upload video"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLibraryOpen(true)}
          >
            <Library className="w-4 h-4 mr-2" />
            Choose from library
          </Button>
        </div>

        {/* Hidden file input — video only */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Media library (filtered selection — user should only pick videos) */}
        <MediaLibrary
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          onSelect={(media) => {
            onChange({ ...payload, src: media.url });
            setLibraryOpen(false);
          }}
          selectedUrl={payload.src || undefined}
        />

        {/* Optional alt/caption fields */}
        <div>
          <Label className="text-xs">Alt text</Label>
          <Input
            value={payload.alt}
            onChange={(e) => onChange({ ...payload, alt: e.target.value })}
            placeholder="Describe the video for screen readers"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Caption</Label>
          <Input
            value={payload.caption}
            onChange={(e) => onChange({ ...payload, caption: e.target.value })}
            placeholder="Optional caption text"
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="video-caption-visible"
            checked={payload.captionVisible}
            onCheckedChange={(checked) => onChange({ ...payload, captionVisible: checked })}
          />
          <Label htmlFor="video-caption-visible" className="text-xs cursor-pointer">
            Show caption on page
          </Label>
        </div>
      </div>
    </div>
  );
}

// ─── Block row ────────────────────────────────────────────────────────────────

function BlockRow({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isDragOver,
  dragHandleProps,
  canSplitWithNext,
  onSplitWithNext,
  onUnsplit,
}: {
  block: EditorBlock;
  index: number;
  total: number;
  onUpdate: (payload: BlockPayload) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isDragOver: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
  canSplitWithNext?: boolean;
  onSplitWithNext?: () => void;
  onUnsplit?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const previewText = (() => {
    if (block.type === "text") {
      const p = (block.payload as TextBlockPayload).paragraphs[0] ?? "";
      return p.length > 80 ? p.slice(0, 80) + "…" : p || "(empty paragraph)";
    }
    if (block.type === "full-image") {
      const src = (block.payload as FullImagePayload).src;
      return src ? src.split("/").pop() : "(no image)";
    }
    if (block.type === "video") {
      const src = (block.payload as VideoBlockPayload).src;
      return src ? src.split("/").pop() : "(no video)";
    }
    const sp = block.payload as SplitImagePayload;
    const l = sp.left?.src?.split("/").pop() ?? "(none)";
    const r = sp.right?.src?.split("/").pop() ?? "(none)";
    return `Left: ${l} · Right: ${r}`;
  })();

  return (
    <>
      <div
        className={`border rounded-lg bg-white transition-colors ${
          isDragOver ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200"
        }`}
      >
        {/* Block header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <Badge variant={blockBadgeColor(block.type) as any} className="text-xs shrink-0">
            {blockLabel(block.type)}
          </Badge>

          <p className="text-xs text-gray-500 truncate flex-1 min-w-0">{previewText}</p>

          {/* Move up/down (keyboard-accessible alternative to DnD) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            disabled={index === 0}
            onClick={onMoveUp}
            title="Move up"
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            disabled={index === total - 1}
            onClick={onMoveDown}
            title="Move down"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-red-400 hover:text-red-600"
            onClick={() => setConfirmRemove(true)}
            title="Remove block"
          >
            <Trash2 className="w-3 h-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {/* Block editor body */}
        {expanded && (
          <div className="p-4 space-y-4">
            {block.type === "text" && (
              <TextBlockEditor
                payload={block.payload as TextBlockPayload}
                onChange={onUpdate}
              />
            )}
            {block.type === "full-image" && (
              <FullImageBlockEditor
                payload={block.payload as FullImagePayload}
                onChange={onUpdate}
              />
            )}
            {block.type === "split-image" && (
              <SplitImageBlockEditor
                payload={block.payload as SplitImagePayload}
                onChange={onUpdate}
              />
            )}
            {block.type === "video" && (
              <VideoBlockEditor
                payload={block.payload as VideoBlockPayload}
                onChange={onUpdate}
              />
            )}
            {/* Layout action row */}
            {block.type === "full-image" && canSplitWithNext && onSplitWithNext && (
              <div className="pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onSplitWithNext}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ⟶ Pair with next image as a split row
                </button>
              </div>
            )}
            {block.type === "split-image" && onUnsplit && (
              <div className="pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onUnsplit}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ⟵ Separate into two full-width images
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove block?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the "{blockLabel(block.type)}" block. The change won't be saved
              until you click Save draft or Publish.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRemove(false);
                onRemove();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Add block button ─────────────────────────────────────────────────────────

function AddBlockRow({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Primary: add a full-width image block immediately, no modal */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1 border-dashed"
        onClick={() => onAdd("full-image")}
      >
        <Plus className="w-4 h-4 mr-2" /> Add image
      </Button>

      {/* Secondary: split pair or text block */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-gray-500 text-xs"
          onClick={() => setMoreOpen((v) => !v)}
        >
          More ▾
        </Button>
        {moreOpen && (
          <div className="absolute right-0 mt-1 w-56 z-10 bg-white border border-gray-200 rounded-lg shadow-lg divide-y">
            <button
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => { onAdd("split-image"); setMoreOpen(false); }}
            >
              <p className="text-sm font-medium text-gray-900">Split image pair</p>
              <p className="text-xs text-gray-500 mt-0.5">Two images side by side</p>
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => { onAdd("text"); setMoreOpen(false); }}
            >
              <p className="text-sm font-medium text-gray-900">Text block</p>
              <p className="text-xs text-gray-500 mt-0.5">Narrative paragraphs between images</p>
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => { onAdd("video"); setMoreOpen(false); }}
            >
              <p className="text-sm font-medium text-gray-900">Video</p>
              <p className="text-xs text-gray-500 mt-0.5">Embed an MP4 or WebM video inline</p>
            </button>
          </div>
        )}
        {moreOpen && (
          <div className="fixed inset-0 z-[9]" onClick={() => setMoreOpen(false)} />
        )}
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export function AdminEditProjectPage() {
  return (
    <AdminGuard>
      {(user) => <AdminEditProjectContent user={user} />}
    </AdminGuard>
  );
}

function AdminEditProjectContent({ user }: { user: string }) {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Fetch project + blocks ─────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/admin/projects/${id}/full`],
    queryFn: async () => {
      const res = await fetch(`/api/admin/projects/${id}/full`);
      if (!res.ok) throw new Error("Failed to load project");
      return res.json() as Promise<{ project: any; blocks: any[] }>;
    },
    staleTime: 0,
  });

  // ── Fetch project list (for next-project dropdown) ─────────────────────────
  const { data: allProjects } = useQuery<any[]>({
    queryKey: ["/api/admin/projects"],
    queryFn: async () => {
      const res = await fetch("/api/admin/projects");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // ── Local editor state ─────────────────────────────────────────────────────
  const [state, setState] = useState<EditorState | null>(null);
  const [initialized, setInitialized] = useState(false);

  // ── Auto-save state ────────────────────────────────────────────────────────
  // `hydrating` is set to true whenever state is replaced from server data so
  // the debounce watcher doesn't treat those programmatic updates as user edits.
  const hydrating = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Monotonic counter incremented for every genuine user edit.
  const userRevRef = useRef(0);
  // The revision that was successfully persisted by the most-recent save.
  const savedRevRef = useRef(0);
  // Always holds the latest editor state so mutation callbacks can read it without
  // closing over a stale render.
  const latestStateRef = useRef<EditorState | null>(null);
  // Serialization: both auto-save and manual saves await this before sending,
  // guaranteeing requests reach the server in chronological order.
  const lastSavePromiseRef = useRef<Promise<unknown>>(Promise.resolve());
  // True while an auto-save fetch is actually in flight (not just debounce-pending).
  const isAutoSaveInFlightRef = useRef(false);

  useEffect(() => {
    if (data && !initialized) {
      hydrating.current = true;
      setState(serverToEditor(data.project, data.blocks));
      setInitialized(true);
    }
  }, [data, initialized]);

  // ── DnD state ──────────────────────────────────────────────────────────────
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const setMeta = useCallback((patch: Partial<ProjectMeta>) => {
    setState((prev) =>
      prev ? { ...prev, metadata: { ...prev.metadata, ...patch } } : prev
    );
  }, []);

  const updateBlock = useCallback((index: number, payload: BlockPayload) => {
    setState((prev) => {
      if (!prev) return prev;
      const blocks = [...prev.blocks];
      blocks[index] = { ...blocks[index], payload };
      return { ...prev, blocks };
    });
  }, []);

  const removeBlock = useCallback((index: number) => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, blocks: prev.blocks.filter((_, i) => i !== index) };
    });
  }, []);

  const addBlock = useCallback((type: BlockType, afterIndex?: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const block = newBlock(type);
      const blocks = [...prev.blocks];
      const insertAt = afterIndex !== undefined ? afterIndex + 1 : blocks.length;
      blocks.splice(insertAt, 0, block);
      return { ...prev, blocks };
    });
  }, []);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const blocks = [...prev.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      return { ...prev, blocks };
    });
  }, []);

  /** Merge two adjacent full-image blocks into one split-image block. */
  const splitBlockWithNext = useCallback((index: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const blocks = [...prev.blocks];
      const a = blocks[index];
      const b = blocks[index + 1];
      if (!a || !b || a.type !== "full-image" || b.type !== "full-image") return prev;
      const merged: EditorBlock = {
        _key: crypto.randomUUID(),
        type: "split-image",
        payload: {
          left: a.payload as FullImagePayload,
          right: b.payload as FullImagePayload,
          wide: "left",
        },
      };
      blocks.splice(index, 2, merged);
      return { ...prev, blocks };
    });
  }, []);

  /** Break a split-image block into two separate full-image blocks. */
  const unsplitBlock = useCallback((index: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const blocks = [...prev.blocks];
      const block = blocks[index];
      if (!block || block.type !== "split-image") return prev;
      const sp = block.payload as SplitImagePayload;
      const leftBlock: EditorBlock = { _key: crypto.randomUUID(), type: "full-image", payload: sp.left };
      const rightBlock: EditorBlock = { _key: crypto.randomUUID(), type: "full-image", payload: sp.right };
      blocks.splice(index, 1, leftBlock, rightBlock);
      return { ...prev, blocks };
    });
  }, []);

  // ── DnD handlers ───────────────────────────────────────────────────────────
  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex.current !== null && dragIndex.current !== index) {
      moveBlock(dragIndex.current, index);
    }
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  // ── Keep latestStateRef always current so mutation callbacks read fresh state ─
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  // ── Shared: schedule a follow-up auto-save after a settled save ────────────
  // Called from both mutation onSuccess callbacks when there are newer user edits.
  const scheduleFollowUpAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setAutoSaveStatus("saving");
      isAutoSaveInFlightRef.current = true;
      autoSaveMutationRef.current?.();
    }, 2000);
  }, []);

  // ── Helper: cancel any pending debounce (but let in-flight save complete) ─
  // Called before manual saves so we don't start a fresh auto-save after the
  // manual save has already taken ownership of the latest revision.
  const cancelAutoSaveDebounce = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    // If the debounce timer had fired and set status to "saving" but the fetch
    // hasn't started yet (it's still awaiting the serialisation promise), reset
    // the indicator so it doesn't stay stuck on "Saving…".
    if (!isAutoSaveInFlightRef.current) {
      setAutoSaveStatus("idle");
    }
  }, []);

  // Forward ref so scheduleFollowUpAutoSave can call autoSaveMutation.mutate
  // without a circular dependency at declaration time.
  const autoSaveMutationRef = useRef<(() => void) | null>(null);

  // ── Auto-save mutation (draft only, no toast) ──────────────────────────────
  const autoSaveMutation = useMutation({
    mutationFn: async () => {
      // Serialise: wait for any in-flight save (auto or manual) to settle first.
      // This guarantees our request reaches the server after the previous one,
      // so a delayed response can never overwrite a newer payload.
      await lastSavePromiseRef.current.catch(() => {});

      const snap = latestStateRef.current;
      if (!snap) throw new Error("No state");
      const revAtSend = userRevRef.current;

      const fetchPromise = fetch(`/api/admin/projects/${id}/full`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editorToPayload(snap)),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Auto-save failed");
        }
        return { revAtSend };
      });

      // Update the serialisation promise so the next save awaits this one.
      lastSavePromiseRef.current = fetchPromise.catch(() => {});
      return fetchPromise;
    },
    onSuccess: ({ revAtSend }) => {
      isAutoSaveInFlightRef.current = false;
      savedRevRef.current = revAtSend;
      setAutoSaveStatus("saved");
      if (autoSaveClearTimer.current) clearTimeout(autoSaveClearTimer.current);
      autoSaveClearTimer.current = setTimeout(() => setAutoSaveStatus("idle"), 3000);
      // If the user made more edits while this request was in flight, save them.
      if (userRevRef.current > revAtSend) {
        scheduleFollowUpAutoSave();
      }
    },
    onError: () => {
      isAutoSaveInFlightRef.current = false;
      setAutoSaveStatus("error");
      // Even on failure, if the user made edits while this request was in flight,
      // those revisions are unsaved — schedule a follow-up auto-save for them.
      if (userRevRef.current > savedRevRef.current) {
        scheduleFollowUpAutoSave();
      }
    },
  });

  // Wire up the forward ref once the mutation is defined.
  autoSaveMutationRef.current = () => autoSaveMutation.mutate();

  // ── Save / Publish mutations ───────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      // Serialise: wait for any in-flight auto-save to settle before sending.
      await lastSavePromiseRef.current.catch(() => {});

      // Capture the very latest state and revision at the moment we actually send.
      const snap = latestStateRef.current;
      if (!snap) throw new Error("No state");
      const revAtSend = userRevRef.current;

      const url = publish
        ? `/api/admin/projects/${id}/publish`
        : `/api/admin/projects/${id}/full`;
      const method = publish ? "POST" : "PUT";

      const fetchPromise = fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editorToPayload(snap)),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Save failed");
        }
        return { data: await res.json(), publish, revAtSend };
      });

      lastSavePromiseRef.current = fetchPromise.catch(() => {});
      return fetchPromise;
    },
    onSuccess: ({ data: _data, publish, revAtSend }) => {
      savedRevRef.current = revAtSend;
      // We deliberately do NOT replace local editor state with the server response
      // for either draft saves or publish. EditorState has no status field, so
      // there are no server-derived fields worth syncing back. More importantly,
      // the user may have made edits while the request was in flight; overwriting
      // state with the older server snapshot would discard those newer edits.
      // The follow-up auto-save below captures latestStateRef, which always holds
      // the newest content.
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      toast({
        title: publish ? "Published!" : "Draft saved",
        description: publish
          ? "The project is now live on the site."
          : "Your changes have been saved as a draft.",
      });
      // If the user edited while the manual save was in flight, auto-save those
      // newer edits now that the manual save has settled.
      if (userRevRef.current > revAtSend) {
        scheduleFollowUpAutoSave();
      }
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: err.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
      // If the user made edits while this manual save was in flight, those
      // revisions are still unsaved — schedule an auto-save for them now.
      if (userRevRef.current > savedRevRef.current) {
        scheduleFollowUpAutoSave();
      }
    },
  });

  // ── Auto-save debounce effect ──────────────────────────────────────────────
  // Deps: [state, initialized] only. Mutation isPending is intentionally excluded
  // so save lifecycle renders never look like user edits to this watcher.
  useEffect(() => {
    // Hydration: state was replaced programmatically (initial load or post-publish
    // sync). Clear the flag and bail — this is not a user edit.
    if (hydrating.current) {
      hydrating.current = false;
      return;
    }
    // Not yet initialized or no state — nothing to do.
    if (!initialized || !state) return;

    // This is a genuine user edit — bump the revision counter.
    userRevRef.current += 1;

    // If a manual save/publish is in flight, cancel the pending debounce timer.
    // Manual save uses latestStateRef so it captures this edit; its onSuccess
    // will schedule a follow-up auto-save if needed.
    if (saveMutation.isPending) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
      return;
    }

    // If an auto-save fetch is already in flight, don't start a new debounce.
    // The in-flight save's onSuccess will compare userRevRef with savedRevRef
    // and schedule a follow-up if this edit remains unsaved.
    if (isAutoSaveInFlightRef.current) return;

    // Start (or restart) the 2-second debounce timer.
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      isAutoSaveInFlightRef.current = true;
      setAutoSaveStatus("saving");
      autoSaveMutation.mutate();
    }, 2000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, initialized]);

  // ── Render states ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AdminLayout user={user}>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          Loading project…
        </div>
      </AdminLayout>
    );
  }

  if (isError || !state) {
    return (
      <AdminLayout user={user}>
        <div className="flex items-center justify-center h-64 text-red-500 text-sm">
          Failed to load project.{" "}
          <button className="underline ml-2" onClick={() => navigate("/admin/projects")}>
            Back to projects
          </button>
        </div>
      </AdminLayout>
    );
  }

  const isSaving = saveMutation.isPending;
  const projectSlug = state.slug;

  return (
    <AdminLayout user={user}>
      <Toaster />

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 -mx-6 px-6 py-3 mb-8 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/projects")}
          className="shrink-0"
        >
          ← Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 truncate">
            {state.title || "(Untitled project)"}
          </h1>
          <p className="text-xs text-gray-400 font-mono truncate">/work/{state.slug}</p>
        </div>
        <a
          href={`/work/${projectSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-1"
        >
          Preview <ExternalLink className="w-3 h-3" />
        </a>
        {/* Auto-save status indicator */}
        {autoSaveStatus !== "idle" && (
          <span
            className={`shrink-0 text-xs transition-opacity ${
              autoSaveStatus === "saving"
                ? "text-gray-400"
                : autoSaveStatus === "saved"
                ? "text-green-600"
                : "text-amber-600"
            }`}
          >
            {autoSaveStatus === "saving" && "Saving…"}
            {autoSaveStatus === "saved" && "Saved ✓"}
            {autoSaveStatus === "error" && "Auto-save failed"}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={isSaving}
          onClick={() => { cancelAutoSaveDebounce(); saveMutation.mutate(false); }}
          className="shrink-0"
        >
          {isSaving ? "Saving…" : "Save draft"}
        </Button>
        <Button
          size="sm"
          disabled={isSaving}
          onClick={() => { cancelAutoSaveDebounce(); saveMutation.mutate(true); }}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? "Publishing…" : "Publish"}
        </Button>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* ── Section: Basic metadata ────────────────────────────────────── */}
        <Section title="Project info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title">
              <Input
                value={state.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Project title"
              />
            </Field>
            <Field label="Slug" hint="URL: /work/{slug}">
              <Input
                value={state.slug}
                onChange={(e) =>
                  set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                }
                placeholder="my-project"
              />
            </Field>
            <Field label="Case study label">
              <Input
                value={state.caseStudyLabel}
                onChange={(e) => set({ caseStudyLabel: e.target.value })}
                placeholder="CASE STUDY"
              />
            </Field>
            <Field label="Client">
              <Input
                value={state.metadata.client}
                onChange={(e) => setMeta({ client: e.target.value })}
                placeholder="Client name"
              />
            </Field>
            <Field label="Year">
              <Input
                value={state.metadata.year}
                onChange={(e) => setMeta({ year: e.target.value })}
                placeholder="2024"
              />
            </Field>
            <Field label="Scope (optional)">
              <Input
                value={state.metadata.scope}
                onChange={(e) => setMeta({ scope: e.target.value })}
                placeholder="UX Design, Research…"
              />
            </Field>
            <Field label="Role (optional)">
              <Input
                value={state.metadata.role}
                onChange={(e) => setMeta({ role: e.target.value })}
                placeholder="Lead Designer…"
              />
            </Field>
          </div>

          <Field label="Pull quote">
            <Textarea
              value={state.quote}
              onChange={(e) => set({ quote: e.target.value })}
              rows={3}
              placeholder="A key insight or headline quote shown in the narrative section"
              className="resize-none"
            />
          </Field>

          <Field label="Meta description" hint="Used as the HTML <meta> description for SEO (max 160 chars)">
            <Textarea
              value={state.metaDescription}
              onChange={(e) => set({ metaDescription: e.target.value })}
              rows={2}
              maxLength={160}
              placeholder="Brief summary of the project…"
              className="resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {state.metaDescription.length}/160
            </p>
          </Field>

          <div className="flex items-center gap-3">
            <Switch
              id="show-homepage"
              checked={state.showOnHomepage}
              onCheckedChange={(v) => set({ showOnHomepage: v })}
            />
            <Label htmlFor="show-homepage" className="cursor-pointer">
              Show on homepage
            </Label>
          </div>

          <Field label="Homepage card overlay" hint="Controls what visitors see on the homepage card">
            <Select
              value={state.cardOverlay ?? "__none__"}
              onValueChange={(v) =>
                set({ cardOverlay: v === "__none__" ? null : (v as 'in_progress' | 'confidential') })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="confidential">Confidential</SelectItem>
              </SelectContent>
            </Select>
            {state.cardOverlay === 'in_progress' && (
              <p className="text-xs text-gray-500 mt-1">
                Shows a blue overlay on hover: "Case study in progress — reach out for information." Card is not clickable.
              </p>
            )}
            {state.cardOverlay === 'confidential' && (
              <p className="text-xs text-gray-500 mt-1">
                Shows a blue overlay always visible: "Confidential project — reach out for information." Card is not clickable.
              </p>
            )}
          </Field>
        </Section>

        {/* ── Section: Featured image ────────────────────────────────────── */}
        <Section title="Featured image">
          <p className="text-xs text-gray-500 -mt-1 mb-1">
            Shown on homepage cards and at the top of the case study page.
            Falls back to the hero image if not set.
          </p>
          <ImagePicker
            value={state.featuredImageUrl || null}
            onChange={(url) => set({ featuredImageUrl: url })}
            label="Featured image"
            hidePreview={!!state.featuredImageUrl}
          />
          {state.featuredImageUrl && (
            <DualCropEditor
              src={state.featuredImageUrl}
              wideCrop={{
                x: parseFocalPoint(state.featuredImageObjectPosition).x,
                y: parseFocalPoint(state.featuredImageObjectPosition).y,
                zoom: state.featuredImageZoom,
              }}
              squareCrop={{
                x: state.featuredSquareCropX,
                y: state.featuredSquareCropY,
                zoom: state.featuredSquareCropZoom,
              }}
              onWideChange={(crop: CropState) =>
                set({
                  featuredImageObjectPosition: `${crop.x.toFixed(1)}% ${crop.y.toFixed(1)}%`,
                  featuredImageZoom: crop.zoom,
                })
              }
              onSquareChange={(crop: CropState) =>
                set({
                  featuredSquareCropX: crop.x,
                  featuredSquareCropY: crop.y,
                  featuredSquareCropZoom: crop.zoom,
                })
              }
            />
          )}
          <Field label="Alt text">
            <Input
              value={state.featuredImageAlt}
              onChange={(e) => set({ featuredImageAlt: e.target.value })}
              placeholder="Describe the featured image for screen readers"
              className="mt-1"
            />
          </Field>
        </Section>

        {/* ── Section: Hero image ────────────────────────────────────────── */}
        <Section title="Hero image">
          <ImagePicker
            value={state.heroImageUrl || null}
            onChange={(url) => set({ heroImageUrl: url })}
            label="Hero image"
          />
          <Field label="Alt text">
            <Input
              value={state.heroImageAlt}
              onChange={(e) => set({ heroImageAlt: e.target.value })}
              placeholder="Describe the hero image for screen readers"
            />
          </Field>
        </Section>

        {/* ── Section: Description paragraphs ───────────────────────────── */}
        <Section title="Body description">
          <p className="text-xs text-gray-500 mb-3">
            Each row is a separate paragraph displayed beneath the pull quote.
          </p>
          {state.description.map((para, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Textarea
                value={para}
                rows={3}
                onChange={(e) => {
                  const next = [...state.description];
                  next[i] = e.target.value;
                  set({ description: next });
                }}
                placeholder={`Paragraph ${i + 1}`}
                className="flex-1 resize-none"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 mt-1 shrink-0 text-red-400 hover:text-red-600"
                onClick={() => {
                  const next = state.description.filter((_, idx) => idx !== i);
                  set({ description: next.length ? next : [""] });
                }}
                title="Remove paragraph"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set({ description: [...state.description, ""] })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add paragraph
          </Button>
        </Section>

        {/* ── Section: Content blocks ────────────────────────────────────── */}
        <Section title="Content blocks">
          <p className="text-xs text-gray-500 mb-3">
            Drag blocks to reorder them. Changes take effect when you save.
          </p>

          {state.blocks.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-sm text-gray-400 mb-3">
              No content blocks yet. Add one below.
            </div>
          )}

          <div className="space-y-2">
            {state.blocks.map((block, index) => (
              <div
                key={block._key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <BlockRow
                  block={block}
                  index={index}
                  total={state.blocks.length}
                  onUpdate={(payload) => updateBlock(index, payload)}
                  onRemove={() => removeBlock(index)}
                  onMoveUp={() => moveBlock(index, index - 1)}
                  onMoveDown={() => moveBlock(index, index + 1)}
                  isDragOver={dragOverIndex === index && dragIndex.current !== index}
                  dragHandleProps={{}}
                  canSplitWithNext={
                    block.type === "full-image" &&
                    index < state.blocks.length - 1 &&
                    state.blocks[index + 1].type === "full-image"
                  }
                  onSplitWithNext={() => splitBlockWithNext(index)}
                  onUnsplit={() => unsplitBlock(index)}
                />
              </div>
            ))}
          </div>

          <div className="mt-3">
            <AddBlockRow onAdd={(type) => addBlock(type)} />
          </div>
        </Section>

        {/* ── Section: Next project ──────────────────────────────────────── */}
        <Section title="Next project">
          <p className="text-xs text-gray-500 mb-3">
            Shown as a teaser strip at the bottom of this case study.
          </p>
          <Field label="Next project">
            <Select
              value={state.nextProjectSlug || "__none__"}
              onValueChange={(v) => set({ nextProjectSlug: v === "__none__" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a project…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {(allProjects ?? [])
                  .filter((p: any) => p.id !== id)
                  .map((p: any) => (
                    <SelectItem key={p.id} value={p.slug}>
                      {p.title || p.slug}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          {state.nextProjectSlug && (
            <p className="mt-3 text-xs text-gray-500">
              The hero image from the selected project will be used automatically.
            </p>
          )}
        </Section>

        {/* ── Bottom save bar ────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-4 pb-8 border-t border-gray-100">
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => { cancelAutoSaveDebounce(); saveMutation.mutate(false); }}
          >
            {isSaving ? "Saving…" : "Save draft"}
          </Button>
          <Button
            disabled={isSaving}
            onClick={() => { cancelAutoSaveDebounce(); saveMutation.mutate(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {hint && <span className="ml-1 font-normal text-gray-400 text-xs">— {hint}</span>}
      </Label>
      {children}
    </div>
  );
}

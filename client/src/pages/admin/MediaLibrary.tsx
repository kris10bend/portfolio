import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Check, X } from "lucide-react";

interface CmsMedia {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface MediaLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user selects an image from the library. */
  onSelect?: (media: CmsMedia) => void;
  /** If provided, this ID will show a checkmark as already-selected. */
  selectedUrl?: string;
}

async function fetchMedia(): Promise<CmsMedia[]> {
  const res = await fetch("/api/admin/media");
  if (!res.ok) throw new Error("Failed to load media");
  return res.json();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary({ open, onOpenChange, onSelect, selectedUrl }: MediaLibraryProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["/api/admin/media"],
    queryFn: fetchMedia,
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Delete failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      setDeleteError(null);
    },
    onError: (err: Error) => {
      setDeleteError(err.message);
    },
  });

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
        queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      } catch (err: any) {
        setUploadError(err.message ?? "Upload failed");
      } finally {
        setUploading(false);
        // Reset input so the same file can be re-uploaded
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [queryClient]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>

        {/* Upload bar */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading…" : "Upload media"}
          </Button>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, GIF · MP4, WebM · max 200 MB
          </span>
          {uploadError && (
            <span className="text-xs text-red-500 ml-auto flex items-center gap-1">
              <X className="w-3 h-3" /> {uploadError}
            </span>
          )}
          {deleteError && (
            <span className="text-xs text-red-500 ml-auto flex items-center gap-1">
              <X className="w-3 h-3" /> {deleteError}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <Upload className="w-8 h-8 opacity-30" />
              No media yet. Upload one above.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-1">
              {media.map((item) => {
                const isSelected = selectedUrl === item.url;
                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/40"
                    }`}
                    onClick={() => onSelect?.(item)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square bg-muted">
                      {item.mimeType.startsWith("video/") ? (
                        <video
                          src={item.url}
                          muted
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.originalName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>

                    {/* Selected badge */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded p-1 hover:bg-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(item.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {/* Filename tooltip */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.originalName} · {formatBytes(item.size)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

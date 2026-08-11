import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MediaLibrary } from "./MediaLibrary";
import { ImageIcon, Upload, Library } from "lucide-react";

interface CmsMedia {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface ImagePickerProps {
  /** Current image URL (e.g. "/uploads/uuid.jpg") */
  value?: string | null;
  /** Called when the user picks a new image from the library or uploads one. */
  onChange: (url: string) => void;
  label?: string;
}

/**
 * ImagePicker — shows the current image thumbnail (if any) plus two buttons:
 * - "Upload new": opens the file picker directly; on success selects the new image
 * - "Choose from library": opens the MediaLibrary dialog to browse existing images
 *
 * Used wherever an image URL is needed in the case study editor.
 */
export function ImagePicker({ value, onChange, label }: ImagePickerProps) {
  const queryClient = useQueryClient();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (media: CmsMedia) => {
    onChange(media.url);
    setLibraryOpen(false);
  };

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
        const media: CmsMedia = await res.json();
        // Refresh the media library cache and select the new image immediately
        queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
        onChange(media.url);
      } catch (err: any) {
        setUploadError(err.message ?? "Upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [queryClient, onChange]
  );

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}

      {/* Current image preview */}
      {value ? (
        <div className="relative w-full max-w-sm rounded-lg overflow-hidden border bg-muted">
          <img
            src={value}
            alt="Selected image"
            className="w-full object-cover max-h-48"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center w-full max-w-sm h-32 rounded-lg border-2 border-dashed bg-muted text-muted-foreground">
          <div className="flex flex-col items-center gap-1 text-sm">
            <ImageIcon className="w-6 h-6 opacity-40" />
            <span>No image selected</span>
          </div>
        </div>
      )}

      {/* Upload error */}
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
          {uploading ? "Uploading…" : "Upload new"}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <MediaLibrary
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleSelect}
        selectedUrl={value ?? undefined}
      />
    </div>
  );
}

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminGuard } from "./AdminGuard";
import { AdminLayout } from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, X } from "lucide-react";

interface CmsMedia {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchMedia(): Promise<CmsMedia[]> {
  const res = await fetch("/api/admin/media");
  if (!res.ok) throw new Error("Failed to load media");
  return res.json();
}

export function AdminMediaPage() {
  return (
    <AdminGuard>
      {(user) => <AdminMediaContent user={user} />}
    </AdminGuard>
  );
}

function AdminMediaContent({ user }: { user: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["/api/admin/media"],
    queryFn: fetchMedia,
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
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setUploadError(null);
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
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
        }
        queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      } catch (err: any) {
        setUploadError(err.message ?? "Upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [queryClient]
  );

  return (
    <AdminLayout user={user}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Media Library</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            JPEG, PNG, WebP, GIF · max 20 MB
          </span>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading…" : "Upload images"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Error banners */}
      {uploadError && (
        <div className="flex items-center gap-2 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          <X className="w-4 h-4 shrink-0" />
          {uploadError}
          <button
            className="ml-auto text-red-400 hover:text-red-600"
            onClick={() => setUploadError(null)}
          >
            ×
          </button>
        </div>
      )}
      {deleteError && (
        <div className="flex items-center gap-2 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          <X className="w-4 h-4 shrink-0" />
          {deleteError}
          <button
            className="ml-auto text-red-400 hover:text-red-600"
            onClick={() => setDeleteError(null)}
          >
            ×
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center text-sm text-gray-400">
          Loading…
        </div>
      ) : media.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-16 flex flex-col items-center gap-3 text-gray-400">
          <Upload className="w-10 h-10 opacity-30" />
          <p className="text-sm">No images yet. Click "Upload images" to add your first image.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((item) => (
            <div key={item.id} className="group relative rounded-lg overflow-hidden border border-gray-200 bg-white">
              {/* Thumbnail */}
              <div className="aspect-square bg-gray-50">
                <img
                  src={item.url}
                  alt={item.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Delete button */}
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded p-1.5 hover:bg-red-600"
                onClick={() => deleteMutation.mutate(item.id)}
                title="Delete image"
              >
                <Trash2 className="w-3 h-3" />
              </button>

              {/* Meta */}
              <div className="p-2 border-t border-gray-100">
                <p className="text-xs text-gray-700 truncate" title={item.originalName}>
                  {item.originalName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{formatBytes(item.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

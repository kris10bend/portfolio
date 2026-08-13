import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "./AdminLayout";
import { AdminGuard } from "./AdminGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { adminApiRequest, adminQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CmsProject } from "@shared/schema";

// ─── Drag handle icon ─────────────────────────────────────────────────────────

function DragHandle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0">
      <circle cx="5" cy="4" r="1.2" fill="currentColor" />
      <circle cx="11" cy="4" r="1.2" fill="currentColor" />
      <circle cx="5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="11" cy="8" r="1.2" fill="currentColor" />
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="11" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

// ─── Project row ──────────────────────────────────────────────────────────────

interface ProjectRowProps {
  project: CmsProject;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: () => void;
  onToggleStatus: (project: CmsProject) => void;
  onDuplicate: (id: string) => void;
  onArchive: (project: CmsProject) => void;
  isDragging: boolean;
  isDragTarget: boolean;
}

function ProjectRow({
  project,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleStatus,
  onDuplicate,
  onArchive,
  isDragging,
  isDragTarget,
}: ProjectRowProps) {
  const [, navigate] = useLocation();

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={onDrop}
      className={[
        "flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg transition-all",
        isDragging ? "opacity-40" : "",
        isDragTarget ? "border-blue-400 bg-blue-50" : "",
      ].join(" ")}
    >
      {/* Drag handle */}
      <span className="cursor-grab active:cursor-grabbing">
        <DragHandle />
      </span>

      {/* Project info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{project.title || "(Untitled)"}</p>
        <p className="text-xs text-gray-400 truncate">
          {[project.caseStudyLabel, project.slug].filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* Status badge */}
      <Badge
        variant={project.status === "published" ? "default" : "secondary"}
        className="flex-shrink-0 text-xs"
      >
        {project.status === "published" ? "Published" : "Draft"}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => navigate(`/admin/projects/${project.id}/edit`)}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onToggleStatus(project)}
        >
          {project.status === "published" ? "Unpublish" : "Publish"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onDuplicate(project.id)}
        >
          Duplicate
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onArchive(project)}
        >
          Archive
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminProjectsPage() {
  return (
    <AdminGuard>
      {(user) => <AdminProjectsContent user={user} />}
    </AdminGuard>
  );
}

function AdminProjectsContent({ user }: { user: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch projects — uses adminQueryFn so any 401 redirects to login immediately
  const { data: projects = [], isLoading } = useQuery<CmsProject[]>({
    queryKey: ["/api/admin/projects"],
    queryFn: adminQueryFn as () => Promise<CmsProject[]>,
    staleTime: 0,
  });

  // Local ordered list for drag & drop
  const [orderedProjects, setOrderedProjects] = useState<CmsProject[] | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CmsProject | null>(null);

  const displayProjects = orderedProjects ?? projects;

  // Reset local order when server data changes
  useEffect(() => {
    if (!orderDirty) {
      setOrderedProjects(null);
    }
  }, [projects]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(() => {
    const from = dragIndexRef.current;
    const to = dragOverIndex;
    if (from === null || to === null || from === to) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }
    setOrderedProjects(prev => {
      const list = [...(prev ?? projects)];
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return list;
    });
    setOrderDirty(true);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, [dragOverIndex, projects]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const saveOrderMutation = useMutation({
    mutationFn: async (list: CmsProject[]) => {
      const payload = list.map((p, i) => ({ id: p.id, homepageOrder: i + 1 }));
      await adminApiRequest("PUT", "/api/admin/projects/order", payload);
    },
    onSuccess: () => {
      toast({ title: "Order saved" });
      setOrderDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    },
    onError: () => {
      toast({ title: "Failed to save order", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApiRequest("POST", "/api/admin/projects");
      return res.json() as Promise<CmsProject>;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      navigate(`/admin/projects/${project.id}/edit`);
    },
    onError: () => {
      toast({ title: "Failed to create project", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (project: CmsProject) => {
      const newStatus = project.status === "published" ? "draft" : "published";
      await adminApiRequest("PUT", `/api/admin/projects/${project.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminApiRequest("POST", `/api/admin/projects/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      toast({ title: "Project duplicated" });
    },
    onError: () => {
      toast({ title: "Failed to duplicate project", variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminApiRequest("DELETE", `/api/admin/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      toast({ title: "Project archived" });
      setArchiveTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to archive project", variant: "destructive" });
    },
  });

  return (
    <AdminLayout user={user}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">Drag to reorder homepage display</p>
        </div>
        <div className="flex items-center gap-2">
          {orderDirty && (
            <Button
              size="sm"
              onClick={() => saveOrderMutation.mutate(displayProjects)}
              disabled={saveOrderMutation.isPending}
            >
              {saveOrderMutation.isPending ? "Saving…" : "Save order"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "+ New project"}
          </Button>
        </div>
      </div>

      {/* Project list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white border border-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : displayProjects.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">
          No projects yet. Create one to get started.
        </div>
      ) : (
        <div
          className="space-y-2"
          onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null); }}
        >
          {displayProjects.map((project, index) => (
            <ProjectRow
              key={project.id}
              project={project}
              index={index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onToggleStatus={(p) => toggleStatusMutation.mutate(p)}
              onDuplicate={(id) => duplicateMutation.mutate(id)}
              onArchive={(p) => setArchiveTarget(p)}
              isDragging={dragIndexRef.current === index}
              isDragTarget={dragOverIndex === index && dragIndexRef.current !== index}
            />
          ))}
        </div>
      )}

      {/* Archive confirmation dialog */}
      <AlertDialog open={!!archiveTarget} onOpenChange={open => { if (!open) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{archiveTarget?.title || "This project"}" will be hidden from the public site and
              removed from this list. It is not deleted — you can restore it via the API at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

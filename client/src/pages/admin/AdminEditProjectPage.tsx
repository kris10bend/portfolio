import { AdminGuard } from "./AdminGuard";
import { AdminLayout } from "./AdminLayout";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";

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

  return (
    <AdminLayout user={user}>
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/projects")}>
          ← Back
        </Button>
        <h1 className="text-xl font-semibold text-gray-900">Edit Project</h1>
        <code className="text-xs text-gray-400 font-mono">{id}</code>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
        Content editor coming soon (Task: CMS case study editor)
      </div>
    </AdminLayout>
  );
}

import { ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { adminApiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminLayoutProps {
  children: ReactNode;
  user?: string;
}

export function AdminLayout({ children, user }: AdminLayoutProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  async function handleLogout() {
    try {
      await adminApiRequest("POST", "/api/admin/logout");
      queryClient.clear();
      navigate("/admin");
    } catch {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tracking-wide text-gray-900">KB Admin</span>
          {user && (
            <span className="text-xs text-gray-400 font-mono">{user}</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
          Logout
        </Button>
      </header>

      {/* Main content */}
      <main className="px-6 py-8 max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  );
}

import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface AdminGuardProps {
  children: (user: string) => ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery<{ authenticated: boolean; username?: string } | null>({
    queryKey: ["/api/admin/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 30_000,
  });

  const shouldRedirect = !isLoading && (isError || !data?.authenticated);

  useEffect(() => {
    if (shouldRedirect) {
      navigate("/admin");
    }
  }, [shouldRedirect, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading…</span>
      </div>
    );
  }

  if (shouldRedirect) {
    return null;
  }

  return <>{children(data?.username ?? "admin")}</>;
}

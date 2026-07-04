"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/Sidebar";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { setAuthToken } from "@/lib/api/client";
import { Suspense } from "react";
import { LoginPage } from "@/components/layout/LoginPage";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";

function PageLoader() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

function AuthenticatedShell({ children, onLogout, currentUser }: {
  children: ReactNode;
  onLogout: () => void;
  currentUser: { username: string; role: string } | null;
}) {
  useWebSocket();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header onLogout={onLogout} currentUser={currentUser} />
        <div className="flex-1 overflow-x-hidden p-4 md:p-6">
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </div>
        <Footer />
      </SidebarInset>
      <Toaster richColors position="bottom-right" />
    </SidebarProvider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("nimbus_token");
    const savedUser = sessionStorage.getItem("nimbus_user");
    if (saved) setAuthToken(saved);
    if (savedUser) {
      try { setCurrentUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }

    fetch("/api/providers", {
      headers: saved ? { Authorization: `Bearer ${saved}` } : {},
    }).then((r) => {
      if (r.status === 401) setNeedsAuth(true);
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  const handleLogin = useCallback((token: string, user: { username: string; role: string }) => {
    sessionStorage.setItem("nimbus_token", token);
    sessionStorage.setItem("nimbus_user", JSON.stringify(user));
    setAuthToken(token);
    setCurrentUser(user);
    setNeedsAuth(false);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem("nimbus_token");
    sessionStorage.removeItem("nimbus_user");
    setAuthToken(null);
    setCurrentUser(null);
    setNeedsAuth(true);
  }, []);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
          <div className="text-4xl mb-4">&#9729;</div>
          <p className="text-muted-foreground">Loading Nimbus...</p>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster richColors position="bottom-right" />
      </>
    );
  }

  return (
    <AuthenticatedShell onLogout={handleLogout} currentUser={currentUser}>
      {children}
    </AuthenticatedShell>
  );
}

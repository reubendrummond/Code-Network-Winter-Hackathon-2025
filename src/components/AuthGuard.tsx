import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = false, 
  redirectTo 
}: AuthGuardProps) {
  const user = useQuery(api.auth.loggedInUser);
  const router = useRouter();

  useEffect(() => {
    if (user === undefined) return; // Still loading

    const isAuthenticated = !!user;

    if (requireAuth && !isAuthenticated) {
      // User should be authenticated but isn't - redirect to login
      router.navigate({ to: redirectTo || "/login" });
    } else if (!requireAuth && isAuthenticated && redirectTo) {
      // User is authenticated but shouldn't be on this page - redirect
      router.navigate({ to: redirectTo });
    }
  }, [user, requireAuth, redirectTo, router]);

  // Show loading while checking auth status
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show children if auth requirements are met
  const isAuthenticated = !!user;
  if ((requireAuth && isAuthenticated) || (!requireAuth && !isAuthenticated)) {
    return <>{children}</>;
  }

  // Don't render anything while redirecting
  return null;
}
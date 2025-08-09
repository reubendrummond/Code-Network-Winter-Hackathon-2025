import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useRouter, useLocation } from "@tanstack/react-router";
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
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (user === undefined) return; // Still loading
    if (hasRedirected.current) return; // Prevent multiple redirects

    const isAuthenticated = !!user;

    if (requireAuth && !isAuthenticated) {
      // User should be authenticated but isn't - redirect to login with return URL
      const searchString = typeof location.search === 'string' ? location.search : 
                          Object.keys(location.search || {}).length > 0 ? 
                          '?' + new URLSearchParams(location.search as Record<string, string>).toString() : '';
      const currentUrl = location.pathname + searchString;
      
      // Prevent redirect loops - don't redirect if already on login with redirect param
      if (location.pathname === '/login') return;
      
      hasRedirected.current = true;
      router.navigate({ 
        to: "/login", 
        search: { redirect: currentUrl }
      });
    } else if (!requireAuth && isAuthenticated && redirectTo) {
      // User is authenticated but shouldn't be on this page - redirect
      hasRedirected.current = true;
      router.navigate({ to: redirectTo });
    }
  }, [user, requireAuth, redirectTo, router, location.pathname, location.search]);

  // Reset redirect flag when location changes
  useEffect(() => {
    hasRedirected.current = false;
  }, [location.pathname]);

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
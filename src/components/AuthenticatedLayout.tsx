import { AuthGuard } from "./AuthGuard";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <AuthGuard requireAuth={true} redirectTo="/login">
      {children}
    </AuthGuard>
  );
}
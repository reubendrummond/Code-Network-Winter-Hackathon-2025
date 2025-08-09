import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "../components/LoginForm";
import { AuthGuard } from "../components/AuthGuard";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthGuard requireAuth={false} redirectTo="/dashboard">
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or create a new account to get started
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </AuthGuard>
  );
}

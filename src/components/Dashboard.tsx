import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

import { LogOut, User } from "lucide-react";
import { CreateMem } from "./CreateMem";

interface DashboardProps {
  user: {
    _id: string;
    name?: string;
    email?: string;
  } | null;
}

export function Dashboard({ user }: DashboardProps) {
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Welcome back!
              </CardTitle>
              <CardDescription>
                You're successfully signed in to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {user?.name && (
                  <p>
                    <strong>Name:</strong> {user.name}
                  </p>
                )}
                {user?.email && (
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                )}
                <p>
                  <strong>User ID:</strong> {user?._id}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Protected Content</CardTitle>
                <CardDescription>
                  This content is only visible to authenticated users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  You can now access all the protected features of the
                  application.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                  Manage your account settings and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    View Settings
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Help & Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create Mem section (added, non-destructive) */}
          <div className="mt-6">
            <CreateMem />
          </div>
        </div>
      </main>
    </div>
  );
}

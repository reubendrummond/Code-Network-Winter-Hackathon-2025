import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import {
  LogOut,
  Users,
  Image,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { useRef } from "react";

interface DashboardProps {
  user: {
    _id: string;
    name?: string;
    email?: string;
  } | null;
}
export function Dashboard({ user }: DashboardProps) {
  const { signOut } = useAuthActions();
  const userMems = useQuery(api.mems.getUserTopMems, { limit: 6 });

  const handleSignOut = async () => {
    await signOut();
  };

  const isNewUser = !userMems || userMems.length === 0;

  const MemCreateButton = () => {
    return (
      <div>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            to="/mems/create"
            className="px-7 py-4 text-base sm:text-lg font-semibold rounded-xl text-white transition will-change-transform active:scale-[0.98] shadow-md hover:shadow-lg"
            style={{
              background: "linear-gradient(90deg, #B470F5 0%, #F93138 100%)",
              color: "#fff",
              boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
            }}
          >
            Make {isNewUser ? "a" : "another"} mem
          </Link>
        </div>

        {isNewUser && (
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Start capturing moments and invite friends to join.
          </p>
        )}
      </div>
    );
  };

  const MemsCarousel = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (!userMems || userMems.length === 0) return null;

    const scrollLeft = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: -320, behavior: "smooth" });
      }
    };

    const scrollRight = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: 320, behavior: "smooth" });
      }
    };

    return (
      <div className="w-full mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Your mems</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollLeft}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollRight}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-4 pb-4 -mb-4 [&::-webkit-scrollbar]:hidden"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {userMems.map((mem) => (
              <Link
                key={mem._id}
                to="/mems/$memId"
                params={{ memId: mem._id }}
                className="block group flex-shrink-0"
              >
                <Card className="w-80 h-full transition-all duration-200 hover:shadow-lg group-hover:scale-[1.02] border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold truncate pr-2">
                        {mem.name}
                      </CardTitle>
                      {mem.isCreator && (
                        <Badge
                          variant="secondary"
                          className="flex-shrink-0 text-xs"
                        >
                          Owner
                        </Badge>
                      )}
                    </div>
                    {mem.description && (
                      <CardDescription className="text-sm text-slate-600 line-clamp-2">
                        {mem.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {mem.place && (
                        <div className="flex items-center text-sm text-slate-500">
                          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{mem.place}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{mem.participantCount}</span>
                        </div>
                        <div className="flex items-center">
                          <Image className="w-4 h-4 mr-1" />
                          <span>{mem.mediaCount}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-screen overflow-hidden bg-white text-slate-900 font-sans flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-end px-6 py-4 flex-shrink-0">
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Main content */}
      <main className="relative container z-0 mx-auto max-w-full px-6 pt-4 pb-10 flex-1 overflow-y-auto">
        {/* Hero section */}
        <div className={`text-center ${!isNewUser ? "mb-8" : ""}`}>
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
            <h1
              className={`${isNewUser ? "text-5xl sm:text-7xl md:text-8xl" : "text-3xl sm:text-4xl md:text-5xl"} font-extrabold tracking-tight leading-[0.95]`}
            >
              Welcome to{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #06b6d4 0%, #3b82f6 25%, #a855f7 55%, #f472b6 80%, #fef08a 100%)",
                }}
              >
                mems
              </span>
            </h1>

            <p className="mt-5 text-lg sm:text-2xl text-slate-600 min-h-[1.75rem]">
              {user?.name ?? ""}
            </p>

            {isNewUser && <MemCreateButton />}
          </div>
        </div>

        {/* Mems section */}
        {!isNewUser && <MemsCarousel />}

        {/* Create button for existing users */}
        {!isNewUser && (
          <div className="text-center mt-8">
            <MemCreateButton />
          </div>
        )}
      </main>
    </div>
  );
}

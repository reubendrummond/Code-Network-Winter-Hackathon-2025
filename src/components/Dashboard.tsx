import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { LogOut, Users, Image, Calendar, Plus } from "lucide-react";
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
import { useEffect, useRef, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "./ui/carousel";

export function Dashboard() {
  const { signOut } = useAuthActions();
  const userMems = useQuery(api.mems.getUserTopMems, { limit: 6 });
  const topImages = useQuery(api.mems.getUserTopImages, { limit: 5 });

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

  // Smaller component for a mem card link
  const MemCardLink = ({
    mem,
  }: {
    mem: NonNullable<ReturnType<typeof useQuery<typeof api.mems.getUserTopMems>>>[number];
  }) => (
    <Link key={mem._id} to="/mems/$memId" params={{ memId: mem._id }} className="block group flex-shrink-0">
      <Card className="w-80 h-full transition-all duration-200 hover:shadow-lg group-hover:scale-[1.02] border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold truncate pr-2">{mem.name}</CardTitle>
            {mem.isCreator && (
              <Badge variant="secondary" className="flex-shrink-0 text-xs">
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
  );

  const MemsCarousel = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (!userMems || userMems.length === 0) return null;

    return (
      <div className="w-full mt-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Your mems</h2>

        {/* Mobile: horizontal scroll list */}
        <div className="md:hidden overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-4 pb-4 -mb-4 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {userMems.map((mem) => (
              <MemCardLink key={mem._id} mem={mem} />
            ))}
          </div>
        </div>

        {/* Desktop: wide grid using most of the screen width */}
        <div className="hidden md:block">
          <div className="w-full max-w-none">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {userMems.map((mem) => (
                <MemCardLink key={mem._id} mem={mem} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TopImagesSlideshow = () => {
    const items = topImages || [];
    const [api, setApi] = useState<CarouselApi | null>(null);

    useEffect(() => {
      if (!api || items.length <= 1) return;
      const id = setInterval(() => {
        api.scrollNext();
      }, 3500);
      return () => clearInterval(id);
    }, [api, items.length]);

    if (items.length === 0) return null;
    return (
      <div className="mt-8 w-full md:max-w-3xl xl:max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Your top shots</h3>
        <div className="relative w-full overflow-hidden rounded-2xl md:rounded-xl border border-slate-200 bg-white shadow-sm">
          <Carousel className="w-full" opts={{ loop: true }} setApi={setApi}>
            <CarouselContent>
              {items.map((img, i) => (
                <CarouselItem key={img.id} className="basis-full">
                  <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url || ""}
                      alt={img.fileName}
                      className="h-full w-full object-cover"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
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
                    "linear-gradient(90deg, #B470F5 0%, #F93138 100%)",
                }}
              >
                mems
              </span>
            </h1>

            {/* Username intentionally hidden on the home page */}

            {isNewUser && <MemCreateButton />}
          </div>
        </div>

        {/* Mems first, then slideshow */}
        {!isNewUser && (
          <>
            <MemsCarousel />
            <TopImagesSlideshow />
          </>
        )}

        {/* Floating create button (FAB) for existing users */}
        {!isNewUser && (
          <div className="fixed right-5 bottom-16 sm:right-6 sm:bottom-20 z-50">
            <Button asChild size="icon" className="h-14 w-14 rounded-full shadow-lg" aria-label="Create new mem">
              <Link to="/mems/create">
                <Plus className="h-6 w-6" />
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

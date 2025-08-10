import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { LogOut, Users, Image, Calendar } from "lucide-react";
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

  // MemCreateButton removed (hero section removed)

  // Smaller component for a mem card link
  const MemCardLink = ({
    mem,
  }: {
    mem: NonNullable<ReturnType<typeof useQuery<typeof api.mems.getUserTopMems>>>[number];
  }) => (
    <Link key={mem._id} to="/mems/$memId" params={{ memId: mem._id }} className="block group flex-shrink-0">
      <Card className="w-80 md:w-full h-full transition-all duration-200 hover:shadow-lg group-hover:scale-[1.02] border-slate-200">
        <CardHeader className="p-2 pb-1 sm:p-3 sm:pb-1">
          <div className="flex items-start justify-between">
    <CardTitle className="text-base sm:text-xl font-semibold truncate pr-2">{mem.name}</CardTitle>
            {mem.isCreator && (
              <Badge variant="secondary" className="flex-shrink-0 text-xs">
                Owner
              </Badge>
            )}
          </div>
          {mem.description && (
            <CardDescription className="text-xs sm:text-sm text-slate-600 line-clamp-2">
              {mem.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0 px-2 pb-2 sm:px-3">
          <div className="space-y-1.5">
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
      <div className="w-full mt-2">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Your mems</h2>

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
  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-7">
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
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Your top shots</h3>
        {/* Full-bleed slideshow: spans entire viewport width */}
        <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
          <Carousel className="w-full" opts={{ loop: true }} setApi={setApi}>
            <CarouselContent>
              {items.map((img, i) => (
                <CarouselItem key={img.id} className="basis-full">
                  <div className="w-full aspect-[16/9] bg-slate-100">
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
      {/* Top bar with brand and sign out */}
  <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
        <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg, #B470F5 0%, #F93138 100%)" }}
          >
            mems
          </span>
        </div>
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
  <main className="relative container z-0 mx-auto max-w-full px-6 pt-0 pb-2 flex-1 overflow-y-hidden md:overflow-y-auto">

        {/* Mems first, then slideshow */}
        {!isNewUser && (
          <>
            <MemsCarousel />
            <TopImagesSlideshow />
          </>
        )}

        {/* Floating create button (FAB) for existing users */}
        {!isNewUser && (
          <div className="fixed right-5 bottom-8 sm:right-6 sm:bottom-12 z-50">
            <Button
              asChild
                className="h-12 rounded-full px-6 shadow-lg text-white bg-gradient-to-r from-[#B470F5] to-[#F93138] hover:opacity-90 font-bold italic"
              aria-label="Create new mem"
            >
              <Link to="/mems/create">make a mem ✨</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

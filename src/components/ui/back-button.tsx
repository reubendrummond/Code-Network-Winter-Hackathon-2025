import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  to: string;
  params?: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
}

export function BackButton({ 
  to, 
  params, 
  className,
  children = "← Back" 
}: BackButtonProps) {
  return (
    <Link
      to={to}
      params={params}
      className={cn(
        "text-sm px-4 py-2 rounded-full font-semibold text-black bg-white hover:bg-white/90 shadow-lg transition-all",
        className
      )}
    >
      {children}
    </Link>
  );
}
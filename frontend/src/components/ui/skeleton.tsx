import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

function Skeleton({ className, variant = "rectangular", width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton animate-skeleton",
        variant === "circular" && "rounded-full",
        variant === "text" && "rounded-sm h-4",
        variant === "rectangular" && "rounded-md",
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass-card p-5 space-y-4", className)} {...props}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-5/6" />
        <Skeleton variant="text" className="w-2/3" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="h-8 w-24" />
        <Skeleton variant="rectangular" className="h-8 w-24" />
      </div>
    </div>
  );
}

function SkeletonStatCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass-card p-5 space-y-3", className)} {...props}>
      <Skeleton variant="text" className="w-1/2 h-3" />
      <Skeleton variant="text" className="w-1/3 h-8" />
      <Skeleton variant="text" className="w-2/3 h-3" />
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonStatCard };

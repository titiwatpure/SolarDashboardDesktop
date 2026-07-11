import { cn } from "../../utils/cn";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-100", className)}
      {...props}
    />
  );
}

export { Skeleton };

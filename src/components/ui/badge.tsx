import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-sky-200 bg-sky-50 text-sky-700",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-700",
        industrial:
          "border-sky-300 bg-sky-100 text-sky-800 font-bold",
        gradient:
          "border-transparent bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 text-white shadow-sm",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        destructive:
          "border-red-200 bg-red-50 text-red-700",
        outline: "text-slate-700 border-slate-200 bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

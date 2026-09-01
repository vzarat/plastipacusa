import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 text-white shadow-md shadow-sky-500/15 hover:shadow-lg hover:shadow-sky-500/25 hover:opacity-95 focus-visible:ring-sky-500",
        gradient:
          "bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 text-white shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 hover:opacity-95 focus-visible:ring-sky-500",
        industrial:
          "bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 text-white font-bold shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 hover:opacity-95 focus-visible:ring-sky-500",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500",
        outline:
          "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-400",
        ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-600",
        link: "text-sky-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base font-semibold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(buttonVariants({ variant, size, className }), child.props?.className),
        ...props,
      });
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

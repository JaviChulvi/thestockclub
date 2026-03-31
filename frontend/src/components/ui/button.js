import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wide rounded-none";
    
    const variants = {
      default: "bg-black hover:bg-gray-800 text-white border-2 border-black shadow-md",
      destructive: "bg-red-600 hover:bg-red-700 text-white border-2 border-red-800 shadow-md",
      outline: "border-2 border-gray-800 bg-white hover:bg-gray-100 text-black shadow-sm",
      secondary: "bg-gray-200 hover:bg-gray-300 text-black border-2 border-gray-400 shadow-sm",
      ghost: "hover:bg-gray-100 text-black border-0",
      link: "text-black underline-offset-4 hover:underline border-0",
    };
    
    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-9 px-3 text-xs",
      lg: "h-11 px-8 text-base",
      icon: "h-10 w-10",
    };
    
    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };


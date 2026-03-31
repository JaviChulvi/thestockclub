import * as React from "react"
import { cn } from "@/lib/utils"

function Badge({
  className,
  variant = "default",
  ...props
}) {
  const variants = {
    default: "border-2 border-gray-800 bg-gray-900 text-white shadow-sm",
    secondary: "border-2 border-gray-400 bg-gray-200 text-gray-900 shadow-sm",
    destructive: "border-2 border-red-800 bg-red-600 text-white shadow-sm",
    outline: "border-2 border-gray-800 text-gray-900 bg-white shadow-sm",
    success: "border-2 border-green-800 bg-green-600 text-white shadow-sm",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-none",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }


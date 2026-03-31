"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "light" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-4 group-[.toaster]:border-gray-800 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-none",
          description: "group-[.toast]:text-gray-600",
          actionButton:
            "group-[.toast]:bg-black group-[.toast]:text-white group-[.toast]:border-2 group-[.toast]:border-black group-[.toast]:uppercase group-[.toast]:tracking-wide group-[.toast]:font-semibold group-[.toast]:rounded-none",
          cancelButton:
            "group-[.toast]:bg-gray-200 group-[.toast]:text-gray-900 group-[.toast]:border-2 group-[.toast]:border-gray-400 group-[.toast]:uppercase group-[.toast]:tracking-wide group-[.toast]:font-semibold group-[.toast]:rounded-none",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }


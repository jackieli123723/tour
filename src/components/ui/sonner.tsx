"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"
import { useTheme } from "@/components/mct/ThemeProvider"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  const isLight = theme === "light"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={3000}
      toastOptions={{
        style: {
          background: isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(13, 25, 48, 0.95)",
          border: isLight
            ? "1px solid rgba(59, 130, 246, 0.28)"
            : "1px solid rgba(56, 189, 248, 0.3)",
          color: isLight ? "#0f172a" : "#e2e8f0",
          backdropFilter: "blur(12px)",
          boxShadow: isLight
            ? "0 8px 32px rgba(8, 47, 73, 0.12)"
            : "0 0 24px rgba(56, 189, 248, 0.18)",
        },
        descriptionClassName: "mct-toast-list",
        classNames: {
          description: "mct-toast-list",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
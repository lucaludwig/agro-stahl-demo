"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "#0d2d50",
          color: "#ffffff",
          border: "none",
          fontSize: "14px",
          fontWeight: 500,
          borderRadius: "10px",
          padding: "14px 28px",
          boxShadow: "0 8px 32px rgba(0,0,0,.2)",
        },
      }}
    />
  );
}

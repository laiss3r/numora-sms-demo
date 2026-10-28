import type { Metadata } from "next";
import "./globals.css";
import { validateEnvironment } from "@/lib/config";
export const dynamic = "force-dynamic";
import { StoreProvider } from "@/components/store";
export const metadata: Metadata = {
  title: "Numora SMS — Virtual numbers, made simple",
  description:
    "A transparent, zero-cost virtual SMS rental simulator. No real numbers, messages or payments.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <StoreProvider mode={validateEnvironment(process.env).mode}>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { UiProvider } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <UiProvider>{children}</UiProvider>
      </body>
    </html>
  );
}

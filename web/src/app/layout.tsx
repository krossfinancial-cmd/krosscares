import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kross Concepts | ZIP Territory Marketplace",
  description: "Exclusive ZIP territory sales for realtor lead pipelines.",
  icons: {
    apple: "/kc-mark.png",
    icon: "/kc-mark.png",
    shortcut: "/kc-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">{children}</main>
          <footer className="border-t border-blue-100 bg-white/70">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-5 text-sm text-blue-900/75">
              <a
                href="/terms-and-conditions.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
              >
                Terms and Conditions
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

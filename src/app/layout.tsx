import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VIVA-LDA | Minimalist Revision",
  description: "Focused MCQ revision for MPSC LDA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

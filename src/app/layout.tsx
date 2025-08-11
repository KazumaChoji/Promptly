import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Promptly",
  description:
    "A sophisticated platform for creating, testing, and evaluating prompts for large language models with an intuitive interface for prompt engineering workflows.",
  icons: {
    icon: [
      {
        url: "/promptly_icon_only_white.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/promptly_icon_only_white.svg",
    apple: "/promptly_icon_only_white.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground font-['Inter','Noto_Sans',sans-serif]">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

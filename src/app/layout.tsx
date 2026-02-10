import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentMonitor — AI Agent Dashboard",
  description: "Real-time AI agent visualization and monitoring dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" data-theme="default">
        {children}
      </body>
    </html>
  );
}

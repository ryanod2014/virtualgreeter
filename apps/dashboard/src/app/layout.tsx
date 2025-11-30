import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "GreetNow | Turn Visitors Into Live Conversations",
  description: "GreetNow creates the illusion of a live video presence for every visitor. When they engage, you connect instantly via WebRTC. Respond in seconds, not hours.",
  openGraph: {
    title: "GreetNow | Turn Visitors Into Live Conversations",
    description: "Respond to leads 21x more effectively. Create live video presence and connect instantly via WebRTC.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { JetBrains_Mono, Outfit, Source_Serif_4, Montserrat, DM_Sans, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Main font
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Brand fonts for platform logos (loaded with swap for performance)
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["600"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["600"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["500"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["600"],
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["600"],
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
        className={`${jetbrainsMono.variable} ${outfit.variable} ${sourceSerif.variable} ${montserrat.variable} ${dmSans.variable} ${plusJakarta.variable} ${poppins.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

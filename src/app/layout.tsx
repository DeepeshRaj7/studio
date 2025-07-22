import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import InstallPWAButton from '../components/InstallPWAButton';

export const metadata: Metadata = {
  title: 'What Can I Cook',
  description: 'Generate recipes from ingredients you have.',
  manifest: "/manifest.json", // Link to your manifest file
  appleWebApp: { // Optional: for iOS specific PWA behavior
    capable: true,
    statusBarStyle: 'default',
    title: 'My Next.js PWA',
    // startupImage: ['/path/to/apple_splash_screen.png'],
  },
  themeColor: '#000000', // Matches background_color or theme_color in manifest
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
        <InstallPWAButton /> {/* Add your button here */}
      </body>
    </html>
  );
}

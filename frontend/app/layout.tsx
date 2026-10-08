import "./globals.css";

export const metadata = {
  title: "Fireflies Clone",
  description: "A meeting workspace and transcript intelligence app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

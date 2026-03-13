import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Is This Clause Normal? — Contract Red Flag Scanner",
  description:
    "Scan your freelance or service contract for unusual clauses. Pattern matching against industry norms — not legal advice.",
  openGraph: {
    title: "Is This Clause Normal?",
    description: "Contract red flag scanner for freelancers and solo founders.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

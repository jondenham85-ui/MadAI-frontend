import "./globals.css";

export const metadata = {
  title: "MADSI",
  description: "Madison Synthetic Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

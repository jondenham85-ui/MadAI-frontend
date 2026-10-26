import "./globals.css";
import { UserProvider } from "@/context/UserContext";

export const metadata = {
  title: "MADSI",
  description:
    "Madison Synthetic Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="
        bg-black
        text-cyan-300
        antialiased
        "
      >
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}

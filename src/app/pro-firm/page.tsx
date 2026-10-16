import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlatformListings from "@/components/PlatformListings";

export const metadata: Metadata = {
  title: "Pro Firm | LOGICTRADERSLTD",
  description: "Explore prop-trading firm profiles, offer details, videos, and firm-specific links.",
};

export default function ProFirmPage() {
  return (
    <main className="min-h-screen bg-dark-950">
      <Navbar />
      <PlatformListings
        contentKey="pro_firm_listings"
        title="Pro Firm"
        description="Explore prop-trading firms, their profiles, offer details, videos, and firm-specific affiliate links."
        emptyMessage="Firm listings will appear here when published."
      />
      <Footer />
    </main>
  );
}

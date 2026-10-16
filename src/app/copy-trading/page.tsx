import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PlatformListings from "@/components/PlatformListings";

export default function CopyTradingPage() {
  return (
    <>
      <Navbar />
      <PlatformListings
        contentKey="copy_trading_content"
        title="Copy Trading"
        description="Explore copy-trading providers, strategies, and educational resources."
        emptyMessage="Copy-trading listings will appear here when published."
      />
      <Footer />
    </>
  );
}

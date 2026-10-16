import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PlatformListings from "@/components/PlatformListings";

export default function CfdBlockerPage() {
  return (
    <>
      <Navbar />
      <PlatformListings
        contentKey="cfd_blocker_content"
        title="CFD Blocker"
        description="Explore the CFD Blocker providers and resources selected by our team."
        emptyMessage="CFD Blocker listings will appear here when published."
      />
      <Footer />
    </>
  );
}

import { Navigate } from "react-router-dom";
import { useAuth } from "../../../shared/hooks/useAuth";
import { Footer } from "../components/layout/Footer";
import { Navbar } from "../components/layout/Navbar";
import { HeroSection } from "../components/sections/HeroSection";
import { PortalAccessSection } from "../components/sections/PortalAccessSection";
import { ServicesSection } from "../components/sections/ServicesSection";
import { StatsSection } from "../components/sections/StatsSection";

/**
 * Public marketing page served at "/".
 * Signed-in users skip it and go straight to their role's dashboard.
 */
export function LandingPage() {
  const { user, landingPath } = useAuth();
  if (user) {
    return <Navigate to={landingPath(user.roles)} replace />;
  }

  return (
    <div className="scroll-smooth bg-white text-primary-dark">
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <PortalAccessSection />
        <StatsSection />
      </main>
      <div id="footer">
        <Footer />
      </div>
    </div>
  );
}

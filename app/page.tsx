import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import WhatIsArivo from "@/components/landing/WhatIsArivo";
import HowArivoWorks from "@/components/landing/HowArivoWorks";
import ArivoPaySection from "@/components/landing/ArivoPaySection";
import FAQSection from "@/components/landing/FAQSection";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#111111]">
      <LandingNavbar />
      <LandingHero />
      <WhatIsArivo />
      <HowArivoWorks />
      <ArivoPaySection />
      <FAQSection />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}
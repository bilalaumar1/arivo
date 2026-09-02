import LoginCard from "./LoginCard";
import HeroSection from "./HeroSection";

export default function LoginLayout() {
  return (
    <main className="grid min-h-screen grid-cols-1 overflow-x-hidden bg-[#111111] lg:grid-cols-2">
      
      {/* Login */}
      <section className="flex items-start justify-center border-b border-[#2b2b2b] pt-2 lg:border-b-0 lg:border-r lg:pt-16">
        <LoginCard />
      </section>

      {/* Hero */}
      <section className="min-w-0">
        <HeroSection />
      </section>

    </main>
  );
}
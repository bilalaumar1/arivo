import LoginCard from "./LoginCard";
import HeroSection from "./HeroSection";

export default function LoginLayout() {
  return (
    <main className="grid min-h-screen grid-cols-2 bg-[#111111]">
      <section className="flex items-start pt-16 justify-center border-r border-[#2b2b2b]">
        <LoginCard />
      </section>

      <section>
        <HeroSection />
      </section>
    </main>
  );
}
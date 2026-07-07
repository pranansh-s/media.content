import { Header } from '@/components/landing/header';
import { Audience, Channels, Footer, Hero, Voice, WireLog } from '@/components/landing/sections';
import { Wire } from '@/components/ui/wire';

export default function LandingPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Wire className="mx-auto max-w-6xl" />
        <WireLog />
        <Channels />
        <Audience />
        <Wire className="mx-auto max-w-6xl" />
        <Voice />
      </main>
      <Footer />
    </>
  );
}

import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import Layers from '@/components/Layers';
import Nav from '@/components/Nav';
import PageReady from '@/components/PageReady';
import Process from '@/components/Process';
import StackCanvas from '@/components/stack/StackCanvas';
import Topology from '@/components/Topology';

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">İçeriğe geç</a>
      <StackCanvas />
      <Nav />
      <main id="main">
        <Hero />
        <Layers />
        <Topology />
        <Process />
        <Contact />
      </main>
      <Footer />
      <PageReady />
    </>
  );
}

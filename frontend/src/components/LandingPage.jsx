import React, { useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Navbar from "./landing/Navbar";
import Hero from "./landing/Hero";
import Problem from "./landing/Problem";
import Features from "./landing/Features";
import HowItWorks from "./landing/HowItWorks";
import CampusMap from "./landing/CampusMap";
import Students from "./landing/Students";
import VoiceAgent from "./landing/VoiceAgent";
import NMIMS from "./landing/NMIMS";
import Impact from "./landing/Impact";
import CTA from "./landing/CTA";
import Footer from "./landing/Footer";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage({ onEnterDashboard }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    // Smooth scroll
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="landing-root">
      <Navbar onEnterDashboard={onEnterDashboard} />
      <main>
        <Hero onEnterDashboard={onEnterDashboard} />
        <Problem />
        <Features />
        <HowItWorks />
        <CampusMap />
        <Students />
        <VoiceAgent />
        <NMIMS />
        <Impact />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

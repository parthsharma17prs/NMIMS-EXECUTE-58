import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function NMIMS() {
    const ref = useRef(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.nmims-hero', {
                y: 60, opacity: 0, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: ref.current, start: 'top 80%' }
            })

            gsap.from('.nmims-data > *', {
                x: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out',
                scrollTrigger: { trigger: '.nmims-data', start: 'top 80%' }
            })

            gsap.from('.css-g-ring', {
                scale: 0.8, opacity: 0, duration: 1.5, ease: 'expo.out', stagger: 0.2,
                scrollTrigger: { trigger: '.nmims-globe', start: 'top 80%' }
            })
        }, ref)
        return () => ctx.revert()
    }, [])

    return (
        <section ref={ref} id="nmims" style={{ padding: '120px 80px', position: 'relative', maxWidth: 1440, margin: '0 auto' }}>
            <div className="sec-rule" />
            <span className="sec-num" aria-hidden>08</span>
            <span className="sec-cat" aria-hidden>NMIMS POWERED</span>

            <div className="nmims-hero" style={{ textAlign: 'center', marginBottom: 120, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(100px, 12vw, 180px)', lineHeight: .9, color: '#c8deca', letterSpacing: -4, marginBottom: 24 }}>12.5 <span style={{ color: '#00ff88' }}>MWp</span></span>
                <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: '#4d6652', letterSpacing: '.15em' }}>SOLAR CAPACITY. SIX CAMPUSES. ONE BRAIN MISSING.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, alignItems: 'center' }}>

                {/* Lightweight Pure CSS Globe */}
                <div className="nmims-globe" style={{ position: 'relative', width: 360, height: 360, margin: '0 auto' }}>
                    <div className="css-g-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid #00ff8830', animation: 'gSpin1 12s linear infinite' }} />
                    <div className="css-g-ring" style={{ position: 'absolute', inset: '4%', borderRadius: '50%', border: '1.5px solid #00eeff20', animation: 'gSpin1 16s linear infinite reverse', transform: 'rotateX(60deg)' }} />
                    <div className="css-g-ring" style={{ position: 'absolute', inset: '8%', borderRadius: '50%', border: '1px dashed #00ff8828', animation: 'gSpin1 20s linear infinite', transform: 'rotateX(120deg)' }} />

                    <div className="css-g-ring" style={{ position: 'absolute', inset: '20%', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #00ff8820, #0a1a0c 60%, transparent)', animation: 'gBreathe 6s ease-in-out infinite' }} />

                    {/* Mumbai Dot */}
                    <div style={{ position: 'absolute', width: 12, height: 12, background: '#00ff88', borderRadius: '50%', top: '42%', left: '55%', animation: 'gPulse 2s ease-in-out infinite' }} />
                    <span style={{ position: 'absolute', top: '44%', left: '62%', fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#00ff88', letterSpacing: 1 }}>MUMBAI CORE</span>
                </div>

                <div className="nmims-data" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 72, color: '#00ff88', lineHeight: 1 }}>1.75 Cr</span>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', letterSpacing: 1 }}>kWh ANNUAL SOLAR OUTPUT</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 72, color: '#c8deca', lineHeight: 1 }}>6</span>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', letterSpacing: 1 }}>CAMPUSES CONNECTED</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 72, color: '#c8deca', lineHeight: 1 }}>70%</span>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', letterSpacing: 1 }}>ENERGY SELF-SUFFICIENCY</span>
                    </div>

                    <blockquote style={{ borderLeft: '2px solid #00ff88', paddingLeft: 24, marginTop: 40 }}>
                        <p style={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontSize: 28, color: '#c8deca', lineHeight: 1.4 }}>"NMIMS built the power plant.<br />We built the brain."</p>
                    </blockquote>
                </div>
            </div>

            <style>{`
        @keyframes gSpin1 { to { transform: rotateY(360deg) } }
        @keyframes gBreathe { 0%,100%{opacity:.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.03)} }
        @keyframes gPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.6)} }
      `}</style>
        </section>
    )
}

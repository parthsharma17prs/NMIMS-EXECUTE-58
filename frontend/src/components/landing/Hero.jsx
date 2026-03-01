import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Manual char splitter (no paid SplitText needed)
function splitChars(el) {
    const text = el.textContent
    el.innerHTML = ''
    return text.split('').map(ch => {
        const span = document.createElement('span')
        span.className = 'char'
        span.textContent = ch === ' ' ? '\u00A0' : ch
        el.appendChild(span)
        return span
    })
}

const TICKERS = [
    '● SYSTEM ACTIVE', '▲ SOLAR: 98.4%', '▼ CHEM LAB ANOMALY', '✓ 6 AGENTS RUNNING',
    '▲ 124 kWh SURPLUS', '▼ PHANTOM LOAD: BLOCK–C', '✓ GREENCOIN REWARDS ISSUED', '● NET-ZERO MODE: ON',
    '● SYSTEM ACTIVE', '▲ SOLAR: 98.4%', '▼ CHEM LAB ANOMALY', '✓ 6 AGENTS RUNNING',
    '▲ 124 kWh SURPLUS', '▼ PHANTOM LOAD: BLOCK–C', '✓ GREENCOIN REWARDS ISSUED', '● NET-ZERO MODE: ON',
]

export default function Hero({ onEnterDashboard }) {
    const section = useRef(null)
    const w1 = useRef(null)
    const w2 = useRef(null)
    const w3 = useRef(null)
    const sub = useRef(null)
    const ctas = useRef(null)
    const orbRef = useRef(null)
    const mouseRef = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Letter-by-letter drop
            const words = [w1.current, w2.current, w3.current]
            words.forEach((el, wi) => {
                const chars = splitChars(el)
                gsap.from(chars, {
                    y: 80,
                    opacity: 0,
                    skewX: -6,
                    stagger: 0.03,
                    duration: 0.7,
                    ease: 'expo.out',
                    delay: 0.3 + wi * 0.15,
                })
            })

            // Sub + CTAs
            gsap.from([sub.current, ctas.current], {
                y: 28,
                opacity: 0,
                duration: 0.8,
                ease: 'expo.out',
                stagger: 0.12,
                delay: 0.95,
            })

            // Hero fade on scroll
            ScrollTrigger.create({
                trigger: section.current,
                start: 'top top',
                end: 'bottom top',
                scrub: true,
                onUpdate: self => {
                    gsap.set(section.current.querySelector('.hero-content'), {
                        opacity: 1 - self.progress * 1.4,
                        y: self.progress * -60,
                    })
                },
            })

        }, section)

        return () => ctx.revert()
    }, [])

    return (
        <section ref={section} id="hero" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', position: 'relative', overflow: 'hidden' }}>
            {/* Scanline grid */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(30,46,33,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(30,46,33,.15) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none', zIndex: 0 }} />

            {/* CSS ORB */}
            <div ref={orbRef} aria-hidden style={{ position: 'absolute', right: -60, top: '50%', transform: 'translateY(-50%)', width: 560, height: 560, pointerEvents: 'none', zIndex: 1 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid #00ff8825', animation: 'spin1 24s linear infinite', willChange: 'transform' }} />
                <div style={{ position: 'absolute', inset: '8%', borderRadius: '50%', border: '1px solid #00eeff20', animation: 'spin2 30s linear infinite reverse', willChange: 'transform' }} />
                <div style={{ position: 'absolute', inset: '20%', borderRadius: '50%', border: '1px dashed #00ff8828', animation: 'spin1 40s linear infinite', willChange: 'transform' }} />
                <style>{`
          @keyframes spin1  { to { transform: rotate(360deg) } }
          @keyframes spin2  { to { transform: rotate(360deg) scaleX(.75) } }
        `}</style>
            </div>

            {/* Content */}
            <div className="hero-content" style={{ position: 'relative', zIndex: 3, width: '100%', paddingTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', letterSpacing: '.1em', marginBottom: 28 }}>// NET-ZERO CAMPUS INTELLIGENCE PLATFORM</p>

                <h1 style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: .9, marginBottom: 32, overflow: 'visible' }}>
                    <span ref={w1} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(88px,11vw,168px)', letterSpacing: -3, color: '#c8deca', display: 'block' }}>CAMPUS</span>
                    <span ref={w2} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(88px,11vw,168px)', letterSpacing: -3, color: '#00ff88', display: 'block' }}>ZERO</span>
                    <span ref={w3} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(88px,11vw,168px)', letterSpacing: -3, WebkitTextStroke: '1.5px #00ff88', color: 'transparent', display: 'block' }}>AI</span>
                </h1>

                <p ref={sub} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: '#4d6652', maxWidth: 480, lineHeight: 1.8, marginBottom: 40 }}>
                    The autonomous AI agent system that turns 1.75 crore kWh of NMIMS solar power into zero-waste campus intelligence.
                </p>

                <div ref={ctas} style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={onEnterDashboard}
                        style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 1, background: '#00ff88', color: '#030804', padding: '0 36px', height: 54, display: 'flex', alignItems: 'center', border: '1px solid #00ff88', transition: 'background .15s,transform .15s', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#00cc6e'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#00ff88'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >GET STARTED</button>
                    <a href="#how"
                        style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 1, background: 'transparent', color: '#00ff88', padding: '0 36px', height: 54, display: 'flex', alignItems: 'center', border: '1px solid #00ff88', borderLeft: 'none', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#00ff8812'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >HOW IT WORKS →</a>
                </div>
            </div>

            {/* Ticker */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: '#060e08', borderTop: '1px solid #1e2e21', overflow: 'hidden', display: 'flex', alignItems: 'center', zIndex: 4 }}>
                <div style={{ display: 'flex', gap: 64, whiteSpace: 'nowrap', animation: 'tickScroll 35s linear infinite', willChange: 'transform' }}>
                    {TICKERS.map((t, i) => <span key={i} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', flexShrink: 0 }}>{t}</span>)}
                </div>
                <style>{`@keyframes tickScroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }`}</style>
            </div>
        </section>
    )
}

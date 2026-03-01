import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const BentoCard = ({ title, category, tag, children, wide, tall, className = '' }) => {
    return (
        <div className={`bento-card ${wide ? 'wide' : ''} ${tall ? 'tall' : ''} ${className}`}
            style={{
                background: '#060e08', padding: 40, position: 'relative', transition: 'background 0.3s, border-color 0.3s',
                display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid transparent', overflow: 'hidden',
                gridColumn: wide ? 'span 2' : 'span 1',
                gridRow: tall ? 'span 2' : 'span 1'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.background = '#00ff8808' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#060e08' }}
        >
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4d6652', letterSpacing: '.2em', textTransform: 'uppercase' }}>{category}</span>
            <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, color: '#c8deca', lineHeight: .95, letterSpacing: -1 }}>{title}</h3>
            {children}
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4d6652', border: '1px solid #1e2e21', padding: '4px 10px', alignSelf: 'flex-start', marginTop: 'auto', letterSpacing: '.05em' }}>
                [ {tag} ]
            </span>
        </div>
    )
}

export default function Features() {
    const ref = useRef(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Title
            gsap.from('.feat-title span', {
                y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: '.features-header', start: 'top 85%' }
            })

            // Cards stagger
            gsap.from('.bento-card', {
                y: 60, opacity: 0, stagger: 0.15, duration: 1, ease: 'power3.out',
                scrollTrigger: { trigger: '.bento-grid', start: 'top 85%' }
            })

        }, ref)
        return () => ctx.revert()
    }, [])

    return (
        <section ref={ref} id="platform" style={{ padding: '120px 80px', position: 'relative', maxWidth: 1440, margin: '0 auto' }}>
            <div className="sec-rule" />
            <span className="sec-num" aria-hidden>03</span>
            <span className="sec-cat" aria-hidden>FEATURES</span>

            <div className="features-header" style={{ marginBottom: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <h2 className="feat-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(64px, 7vw, 100px)', lineHeight: .9, letterSpacing: -2, color: '#c8deca' }}>
                    <span style={{ display: 'block' }}>EVERY WATT.</span>
                    <span style={{ display: 'block', color: '#00ff88' }}>ACCOUNTED FOR.</span>
                </h2>
            </div>

            <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: '#1e2e21' }}>

                {/* Core Intelligence */}
                <BentoCard category="CORE INTELLIGENCE" title="MULTI-AGENT AI" tag="POWERED BY GROQ LLM" wide>
                    <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#4d6652', maxWidth: 480, lineHeight: 1.8 }}>Six specialized autonomous agents monitor, diagnose, and act across your entire campus 24/7. No human in the loop required.</p>
                    <div style={{ background: '#000', border: '1px solid #1e2e21', padding: 20, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, lineHeight: 2, marginTop: 20 }}>
                        <div><span style={{ color: '#00ff88' }}>&gt;</span> <span style={{ color: '#4d6652' }}>[02:14:31]</span> AGENT_PHANTOM scanning Block-C...</div>
                        <div><span style={{ color: '#00ff88' }}>&gt;</span> <span style={{ color: '#4d6652' }}>[02:14:32]</span> Anomaly <span style={{ color: '#ff4400' }}>DETECTED</span>: Lab-204 idle 3h</div>
                        <div><span style={{ color: '#00ff88' }}>&gt;</span> <span style={{ color: '#4d6652' }}>[02:14:35]</span> Resolution <span style={{ color: '#00ff88' }}>CONFIRMED</span> ✓</div>
                    </div>
                </BentoCard>

                {/* AI Camera */}
                <BentoCard category="DETECTION" title="AI CAMERA SCAN" tag="POWERED BY YOLO v8">
                    <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#4d6652', lineHeight: 1.8 }}>CV models count occupants, detect equipment state, and verify waste in real-time.</p>
                    <div style={{ height: 160, border: '1px solid #1e2e21', marginTop: 24, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
                        {/* Scan beam */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #00ff88, transparent)', animation: 'scan 2.5s ease-in-out infinite' }} />
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#00ff88' }}>SCAN ACTIVE — 0 OCCUPANTS</span>
                        <style>{`@keyframes scan { 0%{transform:translateY(0)} 100%{transform:translateY(158px)} }`}</style>
                    </div>
                </BentoCard>

                {/* Energy Redirect */}
                <BentoCard category="OPTIMIZATION" title="ENERGY REDIRECT" tag="MICROGRID PROTOCOL">
                    <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#4d6652', lineHeight: 1.8 }}>Surplus energy is rerouted in milliseconds across the microgrid.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
                        <div style={{ border: '1px solid #ffe14d', color: '#ffe14d', padding: '8px 12px' }}>SOLAR 98kW</div>
                        <div style={{ flex: 1, height: 1, background: '#00ff8840', position: 'relative' }}>
                            <div style={{ position: 'absolute', width: 6, height: 6, background: '#00ff88', top: -2.5, right: 0, borderRadius: '50%' }} />
                        </div>
                        <div style={{ border: '1px solid #00ff88', color: '#00ff88', padding: '8px 12px' }}>AI ROUTER</div>
                    </div>
                </BentoCard>

            </div>
        </section>
    )
}

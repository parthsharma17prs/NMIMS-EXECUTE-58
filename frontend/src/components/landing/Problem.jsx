import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const FACTS = [
    { num: '₹14B', label: 'WASTED ANNUALLY', desc: 'Lights, AC, projectors — running for no one. Every hour. Every campus across India.' },
    { num: '18%', label: 'IS PHANTOM LOAD', desc: 'Devices on standby. Servers idling. The invisible drain nobody measures or acts on.' },
    { num: 'ZERO', label: 'REAL-TIME VISIBILITY', desc: 'No facility manager knows right now what is consuming energy right now. Only monthly bills.' },
    { num: '75%', label: 'STUDENTS CARE — 0 PLATFORMS LET THEM ACT', desc: 'Gen-Z wants to participate. The infrastructure ignores them completely.' },
]

export default function Problem() {
    const sec = useRef(null)
    const opener = useRef(null)
    const cards = useRef([])

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(opener.current, {
                y: 50, opacity: 0, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: opener.current, start: 'top 80%' },
            })

            cards.current.forEach((el, i) => {
                if (!el) return
                gsap.from(el, {
                    y: 60, opacity: 0, duration: 0.8, ease: 'expo.out',
                    delay: (i % 2) * 0.15,
                    scrollTrigger: { trigger: el, start: 'top 82%' },
                })
            })

            // Bar chart animation
            const bars = sec.current.querySelectorAll('.prob-bar-fill')
            gsap.from(bars, {
                scaleX: 0, transformOrigin: 'left center', duration: 1.2, ease: 'expo.out', stagger: .1,
                scrollTrigger: { trigger: sec.current.querySelector('.prob-bars'), start: 'top 80%' },
            })
        }, sec)
        return () => ctx.revert()
    }, [])

    return (
        <section ref={sec} id="problem" style={{ padding: '140px 80px 100px', position: 'relative', maxWidth: 1440, margin: '0 auto' }}>
            <div className="sec-rule" />
            <span className="sec-num" aria-hidden>02</span>
            <span className="sec-cat" aria-hidden>PROBLEM</span>

            <p ref={opener} style={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontSize: 'clamp(32px,3.5vw,56px)', color: '#c8deca', marginBottom: 72, maxWidth: 760, textAlign: 'center', margin: '0 auto 72px' }}>
                Right now, somewhere on your campus —
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderLeft: '1px solid #1e2e21' }}>
                {FACTS.map((f, i) => (
                    <div key={i} ref={el => cards.current[i] = el}
                        style={{ padding: '48px 48px 48px 48px', borderRight: '1px solid #1e2e21', borderBottom: '1px solid #1e2e21', position: 'relative' }}>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(52px,5.5vw,80px)', color: '#ff4400', lineHeight: .95, letterSpacing: -2, marginBottom: 16 }}>{f.num}</div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(18px,1.8vw,26px)', color: '#c8deca', letterSpacing: 1, marginBottom: 16 }}>{f.label}</div>
                        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#4d6652', lineHeight: 1.8 }}>{f.desc}</p>
                    </div>
                ))}
            </div>

            {/* Bar chart */}
            <div className="prob-bars" style={{ marginTop: 80, display: 'flex', gap: 0, alignItems: 'flex-end', height: 100, borderLeft: '1px solid #1e2e21', borderBottom: '1px solid #1e2e21', padding: '0 0 0 24px' }}>
                {[
                    { label: 'BLOCK A', h: '90%', c: '#ff4400' },
                    { label: 'BLOCK B', h: '65%', c: '#ffe14d' },
                    { label: 'BLOCK C', h: '42%', c: '#00ff88' },
                    { label: 'LIBRARY', h: '78%', c: '#ff4400' },
                    { label: 'LABS', h: '55%', c: '#ffe14d' },
                    { label: 'HOSTEL', h: '38%', c: '#00ff88' },
                ].map((b, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 56, height: '100%', justifyContent: 'flex-end' }}>
                        <div className="prob-bar-fill" style={{ width: 32, height: b.h, background: b.c, transformOrigin: 'bottom' }} />
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#4d6652', whiteSpace: 'nowrap' }}>{b.label}</span>
                    </div>
                ))}
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4d6652', marginLeft: 32, marginBottom: 16 }}>ENERGY LOAD / BLOCK</span>
            </div>
        </section>
    )
}

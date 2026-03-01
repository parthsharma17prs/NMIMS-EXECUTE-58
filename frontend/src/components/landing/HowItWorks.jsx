import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const STEPS = [
    { num: '01', name: 'SENSE', desc: 'IoT sensors + CV cameras detect empty rooms and phantom loads in real-time.', code: ['// sensor_network.js', 'const reading = await sensor.poll()', '→ occupancy: 0, load: 2.4kW'] },
    { num: '02', name: 'THINK', desc: 'LLM agent processes the data against usage patterns and campus schedules.', code: ['// agent_core.py', 'WASTE confirmed: Lab-204', '→ idle for 3h12m → ₹840 loss'] },
    { num: '03', name: 'ACT', desc: 'Voice agent calls facility staff. Energy redirect issued. Alert logged.', code: ['// voice_agent.js', 'CALLING facility_mgr_B...', '→ call_duration: 0:32s'] },
    { num: '04', name: 'LEARN', desc: 'Resolution logged. Model retrained. Pattern never repeats at this node.', code: ['// learning_loop.py', 'MODEL updated: pattern_#4829', '→ accuracy: +0.3% → ✓'] },
]

export default function HowItWorks() {
    const ref = useRef(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Title
            gsap.from('h2 span', {
                y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: 'h2', start: 'top 85%' }
            })

            // Timeline tracker dot
            gsap.to('.dot-travel', {
                y: '100%',
                ease: 'none',
                scrollTrigger: {
                    trigger: '.timeline-path',
                    start: 'top 50%',
                    end: 'bottom 50%',
                    scrub: true,
                }
            })

            // Step reveals
            gsap.utils.toArray('.t-step').forEach(step => {
                gsap.from(step, {
                    x: 40, opacity: 0, duration: 1, ease: 'expo.out',
                    scrollTrigger: { trigger: step, start: 'top 70%' }
                })
            })

        }, ref)
        return () => ctx.revert()
    }, [])

    return (
        <section ref={ref} id="how" style={{ padding: '120px 80px', position: 'relative', maxWidth: 1000, margin: '0 auto' }}>
            <div className="sec-rule" />
            <span className="sec-num" aria-hidden>04</span>
            <span className="sec-cat" aria-hidden>PROCESS</span>

            <h2 style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(56px, 6vw, 88px)', lineHeight: .9, letterSpacing: -2, color: '#c8deca', marginBottom: 80 }}>
                <span style={{ display: 'block' }}>FROM EMPTY ROOM</span>
                <span style={{ display: 'block', color: '#00ff88' }}>TO ZERO WASTE</span>
                <span style={{ display: 'block', WebkitTextStroke: '1.5px #c8deca', color: 'transparent' }}>IN 3 SECONDS.</span>
            </h2>

            <div style={{ display: 'flex', gap: 64, position: 'relative' }}>
                {/* Timeline Line */}
                <div className="timeline-path" style={{ width: 1, background: '#1e2e21', position: 'relative' }}>
                    <div className="dot-travel" style={{ width: 7, height: 7, background: '#00ff88', borderRadius: '50%', position: 'absolute', left: -3, top: 0 }} />
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 80, flex: 1 }}>
                    {STEPS.map((s, i) => (
                        <div key={i} className="t-step" style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: -88, top: 0, width: 16, height: 1, background: '#1e2e21' }} />

                            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: '#00ff88', display: 'block', marginBottom: 8 }}>{s.num}</span>
                            <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, color: '#c8deca', letterSpacing: -1, marginBottom: 16 }}>{s.name}</h3>
                            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: '#4d6652', lineHeight: 1.8, marginBottom: 24, maxWidth: 500 }}>{s.desc}</p>

                            <div style={{ background: '#060e08', border: '1px solid #1e2e21', padding: 16, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, lineHeight: 1.8, maxWidth: 500 }}>
                                {s.code.map((line, j) => (
                                    <div key={j} style={{ color: j === 0 ? '#4d6652' : '#c8deca' }}>
                                        {j > 0 && <span style={{ color: '#00ff88', marginRight: 8 }}>&gt;</span>}
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

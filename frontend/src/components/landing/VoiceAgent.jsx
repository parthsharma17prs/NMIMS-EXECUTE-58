import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const SCRIPTS = {
    phantom: ['> Dialing facility manager...', '> AI: "Phantom load in Lab-204."', '> AI: "2.4kW idle 3hrs. ₹840 loss."', '> AI: "Please confirm shutdown."', '> ✓ Resolution confirmed.'],
    empty: ['> Dialing Block-C supervisor...', '> AI: "Room C-301: 0 occupants."', '> AI: "AC + projector running."', '> AI: "Remote shutdown initiated."', '> ✓ Energy saved: 1.8kW.'],
    solar: ['> Broadcasting to grid coordinator...', '> AI: "Solar surplus: +42kW."', '> AI: "Redirecting to battery B-7."', '> AI: "EV charging enabled."', '> ✓ 42kW redirected. Zero waste.'],
    night: ['> Night audit sweep...', '> AI: "17 lights in empty zones."', '> AI: "Auto-shutdown engaging."', '> AI: "Facility manager notified."', '> ✓ Night waste: 0. Secured.']
}

export default function VoiceAgent() {
    const ref = useRef(null)
    const txRef = useRef(null)
    const [active, setActive] = useState('phantom')
    const [timer, setTimer] = useState(0)

    useEffect(() => {
        const int = setInterval(() => setTimer(t => t + 1), 1000)
        return () => clearInterval(int)
    }, [])

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.v-left > *', {
                x: -40, opacity: 0, stagger: 0.15, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: '.section-voice', start: 'top 80%' }
            })

            gsap.from('.v-right', {
                x: 40, opacity: 0, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: '.section-voice', start: 'top 80%' }
            })

        }, ref)
        return () => ctx.revert()
    }, [])

    useEffect(() => {
        if (!txRef.current) return
        txRef.current.innerHTML = ''
        SCRIPTS[active].forEach((line, i) => {
            setTimeout(() => {
                if (!txRef.current) return
                const p = document.createElement('p')
                p.style.fontFamily = "'IBM Plex Mono',monospace"
                p.style.fontSize = '12px'
                p.style.lineHeight = '1.8'
                p.style.marginBottom = '8px'
                p.style.color = i === SCRIPTS[active].length - 1 ? '#00ff88' : '#c8deca'
                p.textContent = line
                txRef.current.appendChild(p)
                txRef.current.scrollTop = txRef.current.scrollHeight
            }, i * 400 + 400)
        })
    }, [active])

    return (
        <section ref={ref} id="agents" className="section-voice" style={{ padding: '120px 80px', position: 'relative', maxWidth: 1440, margin: '0 auto' }}>
            <div className="sec-rule" />
            <span className="sec-num" aria-hidden>07</span>
            <div className="sec-cat" aria-hidden>AI CALLING AGENT</div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 80 }}>
                <h2 style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(56px, 6vw, 88px)', lineHeight: .9, letterSpacing: -2, color: '#c8deca', marginBottom: 24 }}>
                    <span style={{ display: 'block' }}>THE AI THAT</span>
                    <span style={{ display: 'block' }}>PICKS UP</span>
                    <span style={{ display: 'block', color: '#00ff88' }}>THE PHONE.</span>
                </h2>
                <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: '#4d6652', lineHeight: 1.8, maxWidth: 600 }}>When waste is detected, our AI voice agent autonomously calls facility staff, explains the issue in natural language, and confirms resolution — all without a single human dispatcher.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 100, alignItems: 'center' }}>

                <div className="v-left">

                    <div style={{ display: 'flex', gap: 40, borderTop: '1px solid #1e2e21', paddingTop: 32 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: '#00ff88', lineHeight: 1, marginBottom: 4 }}>0:32</span><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652' }}>AVG DURATION</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: '#00ff88', lineHeight: 1, marginBottom: 4 }}>94%</span><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652' }}>RESOLUTION</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: '#00ff88', lineHeight: 1, marginBottom: 4 }}>24/7</span><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652' }}>ALWAYS ON</span></div>
                    </div>
                </div>

                <div className="v-right" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                    <div style={{ background: '#060e08', border: '1px solid #1e2e21', width: 340, height: 580, borderRadius: '40px 40px', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ width: 80, height: 6, background: '#1e2e21', borderRadius: 3, marginBottom: 40 }} />

                        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: '#c8deca', marginBottom: 8 }}>CampusZero AI <span style={{ color: '#00ff88', animation: 'blink 2s infinite' }}>●</span></p>
                        <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, color: '#00ff88', marginBottom: 40, letterSpacing: 2 }}>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</p>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 40, marginBottom: 40 }}>
                            {[...Array(10)].map((_, i) => (
                                <div key={i} style={{ width: 4, background: '#00ff88', borderRadius: 2, height: i % 2 === 0 ? '60%' : '100%', animation: `wave ${1 + i * 0.1}s ease-in-out infinite alternate`, transformOrigin: 'bottom', willChange: 'transform' }} />
                            ))}
                        </div>

                        <div ref={txRef} style={{ flex: 1, width: '100%', background: '#030804', border: '1px solid #1e2e21', borderRadius: 8, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }} />
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 400, margin: '0 auto' }}>
                        {Object.keys(SCRIPTS).map(sc => (
                            <button key={sc} onClick={() => setActive(sc)}
                                style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: `1px solid ${active === sc ? '#00ff88' : '#1e2e21'}`, background: active === sc ? '#00ff8812' : '#060e08', color: active === sc ? '#00ff88' : '#4d6652', padding: '8px 16px', borderRadius: 20, letterSpacing: '.05em', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.color = '#00ff88' }}
                                onMouseLeave={e => { if (active !== sc) { e.currentTarget.style.borderColor = '#1e2e21'; e.currentTarget.style.color = '#4d6652'; e.currentTarget.style.background = '#060e08' } }}
                            >
                                {sc.toUpperCase()}
                            </button>
                        ))}
                    </div>

                </div>
            </div>
            <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes wave { 0% { transform: scaleY(0.4) } 100% { transform: scaleY(1) } }
      `}</style>
        </section>
    )
}

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function CTA() {
    const ref = useRef(null)
    const [email, setEmail] = useState('')
    const [state, setState] = useState('idle')

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.cta-title span', {
                y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: ref.current, start: 'top 80%' }
            })

            gsap.from('.cta-form', {
                y: 20, opacity: 0, duration: 1, delay: 0.3, ease: 'expo.out',
                scrollTrigger: { trigger: ref.current, start: 'top 80%' }
            })

            gsap.from('.ghost-list', {
                y: 40, opacity: 0, stagger: 0.2, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: '.cta-ghosts', start: 'top 80%' }
            })
        }, ref)
        return () => ctx.revert()
    }, [])

    const submit = e => {
        e.preventDefault()
        if (!email.includes('@')) {
            gsap.fromTo('.cta-input', { x: -4 }, { x: 4, duration: 0.1, yoyo: true, repeat: 3, clearProps: 'all' })
            return
        }
        setState('done')
        gsap.to('.cta-btn', { background: '#00cc6e', duration: 0.2 })
        setTimeout(() => { setState('idle'); setEmail(''); gsap.to('.cta-btn', { background: 'transparent', duration: 0.4 }) }, 4000)
    }

    return (
        <section ref={ref} id="cta" style={{ padding: '160px 80px', position: 'relative', maxWidth: 1440, margin: '0 auto', textAlign: 'center' }}>
            <div className="sec-rule" />
            <span className="sec-num" aria-hidden>10</span>
            <span className="sec-cat" aria-hidden>JOIN US</span>

            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', letterSpacing: 1, marginBottom: 24 }}>// JOIN THE REVOLUTION</p>

            <h2 className="cta-title" style={{ display: 'flex', flexDirection: 'column', fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(88px, 10vw, 150px)', lineHeight: .9, letterSpacing: -3, color: '#c8deca', marginBottom: 80 }}>
                <span style={{ display: 'block' }}>YOUR CAMPUS.</span>
                <span style={{ display: 'block', color: '#00ff88' }}>NET-ZERO.</span>
                <span style={{ display: 'block', WebkitTextStroke: '1.5px #c8deca', color: 'transparent' }}>STARTING NOW.</span>
            </h2>

            <form className="cta-form" onSubmit={submit} style={{ display: 'flex', maxWidth: 600, margin: '0 auto 40px', border: '1px solid #1e2e21' }}>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={state === 'done' ? "We'll be in touch." : "your@college.edu"}
                    disabled={state === 'done'}
                    className="cta-input"
                    style={{ flex: 1, height: 60, background: '#060e08', border: 'none', padding: '0 24px', color: '#c8deca', fontFamily: "'IBM Plex Mono',monospace", fontSize: 14 }}
                />
                <button type="submit" className="cta-btn" style={{ height: 60, padding: '0 40px', borderLeft: '1px solid #1e2e21', background: state === 'done' ? '#00cc6e' : 'transparent', color: state === 'done' ? '#030804' : '#00ff88', fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, transition: 'all .2s' }}
                    onMouseEnter={e => { if (state !== 'done') { e.currentTarget.style.background = '#00ff88'; e.currentTarget.style.color = '#030804' } }}
                    onMouseLeave={e => { if (state !== 'done') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#00ff88' } }}
                >
                    {state === 'done' ? "✓ YOU'RE IN" : "REQUEST ACCESS"}
                </button>
            </form>

            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4d6652', letterSpacing: 1, marginBottom: 100 }}>NO HARDWARE. LIVE IN 48 HOURS. FREE FOR BETA PARTNERS.</p>

            <div className="cta-ghosts" style={{ display: 'flex', justifyContent: 'center', gap: 160, textAlign: 'left' }}>
                <div className="ghost-list">
                    <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#4d6652', marginBottom: 16 }}>FOR COLLEGES</p>
                    <ul style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: '#c8deca', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <li>Energy Dashboard</li><li>AI Agent Suite</li><li>IoT Integration</li><li>Analytics Reports</li>
                    </ul>
                </div>
                <div className="ghost-list">
                    <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#4d6652', marginBottom: 16 }}>FOR STUDENTS</p>
                    <ul style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: '#c8deca', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <li>GreenCoin Wallet</li><li>Campus Map</li><li>Pledge System</li><li>Leaderboard</li>
                    </ul>
                </div>
            </div>
        </section>
    )
}

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const REWARDS = [
    { em: '☕', name: 'FREE COFFEE', cost: '50 🪙' },
    { em: '📚', name: 'LIBRARY CREDIT', cost: '120 🪙' },
    { em: '🎽', name: 'MERCH VOUCHER', cost: '300 🪙' },
    { em: '🍕', name: 'FOOD COURT', cost: '80 🪙' },
    { em: '🎟️', name: 'EVENT PASS', cost: '200 🪙' },
    { em: '🌱', name: 'TREE PLANTED', cost: '500 🪙' },
]

export default function Students() {
    const ref = useRef(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Numbers animation
            gsap.utils.toArray('.em-num').forEach(el => {
                const val = +el.getAttribute('data-target')
                gsap.to(el, {
                    textContent: val, duration: 2, ease: 'expo.out', snap: { textContent: 1 },
                    scrollTrigger: { trigger: el, start: 'top 85%' }
                })
            })

            // Grid stagger
            gsap.from('.s-reward', {
                y: 40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'back.out(1.4)',
                scrollTrigger: { trigger: '.s-grid', start: 'top 80%' }
            })

            // Leaderboard
            gsap.from('.lb-row', {
                x: -40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out',
                scrollTrigger: { trigger: '.leaderboard', start: 'top 80%' }
            })

        }, ref)
        return () => ctx.revert()
    }, [])

    return (
        <section ref={ref} id="students" style={{ padding: '120px 80px', position: 'relative', maxWidth: 1440, margin: '0 auto' }}>
            <div className="sec-rule" />
            <span className="sec-num" aria-hidden>06</span>
            <span className="sec-cat" aria-hidden>FOR STUDENTS</span>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 80 }}>
                <h2 style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(56px, 6vw, 88px)', lineHeight: .9, letterSpacing: -2, color: '#c8deca', marginBottom: 24 }}>
                    <span style={{ display: 'block' }}>SUSTAINABILITY</span>
                    <span style={{ display: 'block', color: '#00ff88' }}>THAT PAYS YOU</span>
                    <span style={{ display: 'block', WebkitTextStroke: '1.5px #c8deca', color: 'transparent' }}>BACK.</span>
                </h2>
                <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: '#4d6652', lineHeight: 1.8, maxWidth: 700 }}>Every report, every pledge, every sustainable action earns you GreenCoins. Real rewards. Real impact. Real data that actually changes policy.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

                <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                        <div><span className="em-num" data-target="4820" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 56, color: '#00ff88', lineHeight: 1 }}>0</span><span style={{ display: 'block', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652' }}>AVG COINS / SEMESTER</span></div>
                        <div><span className="em-num" data-target="12" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 56, color: '#c8deca', lineHeight: 1 }}>0</span><span style={{ display: 'block', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652' }}>AVG STREAK (DAYS)</span></div>
                        <div><span className="em-num prefix-plus" data-target="340" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 56, color: '#c8deca', lineHeight: 1 }}>0</span><span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 56, color: '#c8deca' }}>%</span><span style={{ display: 'block', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652' }}>RETURN RATE VS APPS</span></div>
                    </div>
                </div>

                <div>
                    <div className="s-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 40 }}>
                        {REWARDS.map((r, i) => (
                            <div key={i} className="s-reward" style={{ background: '#060e08', border: '1px solid #1e2e21', padding: '24px 16px', textAlign: 'center', transition: 'transform 0.2s', cursor: 'none' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{ fontSize: 32, marginBottom: 12 }}>{r.em}</div>
                                <h4 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: '#c8deca', marginBottom: 4 }}>{r.name}</h4>
                                <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#00ff88' }}>{r.cost}</p>
                            </div>
                        ))}
                    </div>

                    <div className="leaderboard" style={{ background: '#060e08', border: '1px solid #1e2e21', padding: 32 }}>
                        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', marginBottom: 24 }}>// LIVE LEADERBOARD</p>
                        {['PRIYA RATHOD', 'ARJUN SHAH', 'MAYA PATEL', 'ROHAN DESAI', 'SNEHA KULKARNI'].map((name, i) => (
                            <div key={i} className="lb-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i !== 4 ? '1px solid #1e2e21' : 'none', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>
                                <span style={{ color: '#4d6652', width: 80 }}>&gt; RANK 0{i + 1}</span>
                                <span style={{ color: i === 0 ? '#00ff88' : '#c8deca', flex: 1, letterSpacing: 1 }}>{name}</span>
                                <span style={{ color: '#c8deca', fontWeight: '500' }}>{4820 - i * 300} 🪙</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    )
}

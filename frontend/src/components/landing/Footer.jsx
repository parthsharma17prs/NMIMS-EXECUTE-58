import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function Footer() {
    const ref = useRef(null)

    useEffect(() => {
        gsap.from(ref.current, {
            y: 40, opacity: 0, duration: 1, ease: 'expo.out',
            scrollTrigger: { trigger: ref.current, start: 'top 90%' }
        })
    }, [])

    return (
        <footer ref={ref} style={{ borderTop: '1px solid #1e2e21', padding: '80px 80px 40px', maxWidth: 1440, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 80 }}>

                <div style={{ maxWidth: 400 }}>
                    <a href="#" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: -1, color: '#c8deca', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L21.196 7V17L12 22L2.804 17V7L12 2Z" stroke="#00ff88" strokeWidth="1.5" fill="none" />
                            <path d="M12 7L17 9.9V15.9L12 18.8L7 15.9V9.9L12 7Z" fill="#00ff8818" />
                        </svg>
                        CAMPUSZERO<span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4d6652', marginLeft: 2, marginTop: 2 }}>AI</span>
                    </a>
                    <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#4d6652', lineHeight: 1.8 }}>Smart Campus Net-Zero Energy Platform. Building the intelligence layer that higher education's green infrastructure has been missing.</p>
                </div>

                <div style={{ display: 'flex', gap: 100 }}>
                    <div>
                        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', letterSpacing: 1, marginBottom: 16 }}>PLATFORM</p>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <li><a href="#platform" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#c8deca', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#00ff88'} onMouseLeave={e => e.target.style.color = '#c8deca'}>AI Agents</a></li>
                            <li><a href="#map" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#c8deca', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#00ff88'} onMouseLeave={e => e.target.style.color = '#c8deca'}>Energy Map</a></li>
                            <li><a href="#how" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#c8deca', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#00ff88'} onMouseLeave={e => e.target.style.color = '#c8deca'}>How It Works</a></li>
                            <li><a href="#students" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#c8deca', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#00ff88'} onMouseLeave={e => e.target.style.color = '#c8deca'}>GreenCoins</a></li>
                        </ul>
                    </div>
                    <div>
                        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', letterSpacing: 1, marginBottom: 16 }}>COLLEGES</p>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <li><a href="#nmims" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#c8deca', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#00ff88'} onMouseLeave={e => e.target.style.color = '#c8deca'}>NMIMS</a></li>
                            <li><a href="#cta" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#c8deca', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#00ff88'} onMouseLeave={e => e.target.style.color = '#c8deca'}>Apply Now</a></li>
                            <li><a href="#impact" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#c8deca', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#00ff88'} onMouseLeave={e => e.target.style.color = '#c8deca'}>Case Studies</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e2e21', paddingTop: 32 }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#4d6652' }}>© 2026 CAMPUSZERO AI</span>
                <div style={{ display: 'flex', gap: 16 }}>
                    <a href="#" style={{ width: 32, height: 32, border: '1px solid #1e2e21', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#c8deca', transition: 'all .2s' }} onMouseEnter={e => { e.target.style.borderColor = '#00ff88'; e.target.style.color = '#00ff88' }} onMouseLeave={e => { e.target.style.borderColor = '#1e2e21'; e.target.style.color = '#c8deca' }}>X</a>
                    <a href="#" style={{ width: 32, height: 32, border: '1px solid #1e2e21', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#c8deca', transition: 'all .2s' }} onMouseEnter={e => { e.target.style.borderColor = '#00ff88'; e.target.style.color = '#00ff88' }} onMouseLeave={e => { e.target.style.borderColor = '#1e2e21'; e.target.style.color = '#c8deca' }}>LI</a>
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#00ff88' }}>BUILT AT NMIMS HACKATHON</span>
            </div>
        </footer>
    )
}

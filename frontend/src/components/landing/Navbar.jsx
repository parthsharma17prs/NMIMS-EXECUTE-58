import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const links = [
    { href: '#platform', label: 'PLATFORM' },
    { href: '#map', label: 'MAP' },
    { href: '#students', label: 'STUDENTS' },
    { href: '#agents', label: 'AGENTS' },
    { href: '#nmims', label: 'NMIMS' },
]

export default function Navbar({ onEnterDashboard }) {
    const nav = useRef(null)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        ScrollTrigger.create({
            start: 'top -60',
            onEnter: () => gsap.to(nav.current, { backgroundColor: 'rgba(3,8,4,.98)', borderBottomColor: '#1e2e21', duration: .2 }),
            onLeaveBack: () => gsap.to(nav.current, { backgroundColor: 'transparent', borderBottomColor: 'transparent', duration: .2 }),
        })
    }, [])

    const s = {
        nav: { position: 'fixed', top: 0, left: 0, right: 0, height: 64, zIndex: 1000, borderBottom: '1px solid transparent', transition: 'none', display: 'flex', alignItems: 'center', padding: '0 48px' },
        logo: { fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: -1, color: '#c8deca', display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' },
        hex: { flexShrink: 0 },
        sub: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4d6652', marginLeft: 2, marginTop: 2 },
        links: { display: 'flex', gap: 36, listStyle: 'none', marginRight: 40 },
        link: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: '.18em', color: '#4d6652', textTransform: 'uppercase', transition: 'color .12s' },
        cta: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: '.05em', color: '#00ff88', border: '1px solid #00ff88', padding: '9px 20px', textTransform: 'uppercase', transition: 'background .15s,color .15s', flexShrink: 0 },
        ham: { display: 'none', flexDirection: 'column', gap: 6, marginLeft: 24 },
    }

    return (
        <>
            <nav ref={nav} style={s.nav}>
                <a href="#" style={s.logo}>
                    <svg style={s.hex} width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L21.196 7V17L12 22L2.804 17V7L12 2Z" stroke="#00ff88" strokeWidth="1.5" fill="none" />
                        <path d="M12 7L17 9.9V15.9L12 18.8L7 15.9V9.9L12 7Z" fill="#00ff8818" />
                    </svg>
                    CAMPUSZERO<span style={s.sub}>AI</span>
                </a>
                <ul style={s.links}>
                    {links.map(l => (
                        <li key={l.href}>
                            <a href={l.href} style={s.link}
                                onMouseEnter={e => e.target.style.color = '#c8deca'}
                                onMouseLeave={e => e.target.style.color = '#4d6652'}
                            >{l.label}</a>
                        </li>
                    ))}
                </ul>
                <button style={s.cta}
                    onClick={onEnterDashboard}
                    onMouseEnter={e => { e.currentTarget.style.background = '#00ff88'; e.currentTarget.style.color = '#030804' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#00ff88' }}
                >LOGIN</button>
            </nav>

            {/* Mobile overlay */}
            <div style={{ position: 'fixed', inset: 0, background: '#030804', zIndex: 2000, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 40px', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .4s cubic-bezier(0.16,1,0.3,1)' }}>
                <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 20, right: 28, fontSize: 24, color: '#c8deca' }}>✕</button>
                {links.map(l => (
                    <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                        style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, color: '#4d6652', marginBottom: 4, display: 'block' }}
                        onMouseEnter={e => e.target.style.color = '#00ff88'}
                        onMouseLeave={e => e.target.style.color = '#4d6652'}
                    >{l.label}</a>
                ))}
            </div>
        </>
    )
}

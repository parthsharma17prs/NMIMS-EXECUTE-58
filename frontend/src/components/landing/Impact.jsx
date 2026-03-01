import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const IMPACTS = [
    { val: 840000, pre: '₹', sfx: 'L', label: 'ANNUAL SAVINGS / CAMPUS' },
    { val: 30, pre: '', sfx: '%', label: 'ENERGY WASTE REDUCTION' },
    { val: 50000, pre: '', sfx: '+', label: 'STUDENTS ENGAGED' },
    { val: 2400, pre: '', sfx: 'T', label: 'CO₂ AVOIDED ANNUALLY' },
]

export default function Impact() {
    const ref = useRef(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.imp-card', {
                y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: '.imp-grid', start: 'top 85%' }
            })

            gsap.utils.toArray('.imp-num').forEach(el => {
                const val = +el.getAttribute('data-val')
                gsap.to(el, {
                    textContent: val, duration: 2, ease: 'expo.out', snap: { textContent: 1 },
                    scrollTrigger: { trigger: el, start: 'top 85%' }
                })
            })

        }, ref)
        return () => ctx.revert()
    }, [])

    const fmt = (v) => {
        if (v === 840000) return '8.4'
        if (v > 1000) return (v / 1000).toFixed(0) + 'k'
        return v
    }

    return (
        <section ref={ref} id="impact" style={{ padding: '120px 80px', position: 'relative', maxWidth: 1440, margin: '0 auto' }}>
            <div className="sec-rule" />
            <span className="sec-num" aria-hidden>09</span>
            <span className="sec-cat" aria-hidden>IMPACT</span>

            <div className="imp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 80 }}>
                {IMPACTS.map((imp, i) => (
                    <div key={i} className="imp-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 88, color: i === 0 ? '#00ff88' : '#c8deca', lineHeight: .9, marginBottom: 16 }}>
                            {imp.pre}<span className="imp-num" data-val={imp.val}>{imp.val === 840000 ? 0 : 0}</span>{imp.sfx}
                        </div>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4d6652', letterSpacing: 1 }}>{imp.label}</span>
                    </div>
                ))}
            </div>
        </section>
    )
}

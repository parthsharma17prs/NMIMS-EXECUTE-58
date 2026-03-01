import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const BUILDINGS = [
    { id: 'b-eng', name: 'ENGINEERING', val: '48.2', status: 'OPTIMAL', color: '#00ff88', pct: '48%', path: 'M100,150 L250,150 L280,250 L130,280 Z', cx: 190, cy: 210 },
    { id: 'b-chem', name: 'CHEMISTRY LAB', val: '91.7', status: 'WASTE DETECTED', color: '#ff4400', pct: '92%', path: 'M320,80 L480,80 L500,200 L340,220 Z', cx: 410, cy: 150 },
    { id: 'b-lib', name: 'LIBRARY', val: '22.1', status: 'NET POSITIVE', color: '#00ff88', pct: '22%', path: 'M550,100 L700,120 L680,260 L530,230 Z', cx: 615, cy: 180 },
    { id: 'b-admin', name: 'ADMIN BLOCK', val: '61.4', status: 'MODERATE', color: '#ffe14d', pct: '61%', path: 'M180,320 L350,300 L380,450 L200,480 Z', cx: 280, cy: 390 },
    { id: 'b-hostel', name: 'HOSTEL A', val: '38.5', status: 'OPTIMAL', color: '#00ff88', pct: '38%', path: 'M450,280 L620,310 L600,460 L430,440 Z', cx: 525, cy: 370 },
]

export default function CampusMap() {
    const ref = useRef(null)
    const [activeRegion, setActiveRegion] = useState(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Title
            gsap.from('.map-title span', {
                y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out',
                scrollTrigger: { trigger: '.map-title', start: 'top 85%' }
            })

            // Cards
            gsap.from('.bs-card', {
                x: 40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out',
                scrollTrigger: { trigger: '.bs-card', start: 'top 85%' }
            })

            // Fills
            gsap.from('.bs-fill', {
                scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out', stagger: 0.1,
                scrollTrigger: { trigger: '.bs-card', start: 'top 85%' }
            })

            // Building paths
            gsap.from('.b-path', {
                scale: 0.9, opacity: 0, transformOrigin: 'center', stagger: 0.1, duration: 1, ease: 'back.out(1.2)',
                scrollTrigger: { trigger: '.svg-map', start: 'top 85%' }
            })

        }, ref)
        return () => ctx.revert()
    }, [])

    return (
        <section ref={ref} id="map" style={{ padding: '120px 80px', position: 'relative', maxWidth: 1440, margin: '0 auto' }}>
            <div className="sec-rule" />
            <span className="sec-num" aria-hidden>05</span>

            <h2 className="map-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(56px, 6vw, 88px)', lineHeight: .9, letterSpacing: -2, color: '#c8deca', marginBottom: 80 }}>
                <span style={{ display: 'block' }}>YOUR CAMPUS.</span>
                <span style={{ display: 'block', color: '#00ff88' }}>IN REAL TIME.</span>
            </h2>

            <div style={{ display: 'flex', gap: 60, alignItems: 'center' }}>

                {/* Advanced Top-Down GUI Map */}
                <div className="svg-map" style={{ flex: 1, height: 560, background: '#030804', border: '1px solid #1e2e21', position: 'relative', overflow: 'hidden', borderRadius: 20, boxShadow: '0 0 60px rgba(0,255,136,0.02) inset' }}>

                    {/* Grid Background */}
                    <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(30,46,33,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(30,46,33,.2) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

                    <svg style={{ width: '100%', height: '100%', position: 'relative', zIndex: 2 }} viewBox="0 0 800 560">
                        <defs>
                            <filter id="glow-green"><feGaussianBlur stdDeviation="6" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                            <filter id="glow-red"><feGaussianBlur stdDeviation="8" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                            <filter id="glow-yellow"><feGaussianBlur stdDeviation="6" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>

                            <linearGradient id="gridGrad" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#1e2e21" stopOpacity="0" />
                                <stop offset="100%" stopColor="#00ff88" stopOpacity="0.2" />
                            </linearGradient>
                        </defs>

                        {/* Microgrid Connections */}
                        <g stroke="#1e2e21" strokeWidth="2" strokeDasharray="4,6">
                            <path d="M190,210 L410,150 L615,180 L525,370 L280,390 Z" />
                            <path d="M410,150 L280,390" />
                        </g>

                        {/* Data particles moving along microgrid */}
                        <circle r={3} fill="#00ff88" filter="url(#glow-green)"><animateMotion dur="4s" repeatCount="indefinite" path="M190,210 L410,150 L615,180 L525,370 L280,390 Z" /></circle>
                        <circle r={3} fill="#00ff88" filter="url(#glow-green)"><animateMotion dur="4s" begin="2s" repeatCount="indefinite" path="M190,210 L410,150 L615,180 L525,370 L280,390 Z" /></circle>
                        <circle r={4} fill="#ffe14d" filter="url(#glow-yellow)"><animateMotion dur="3s" repeatCount="indefinite" path="M410,150 L280,390" /></circle>

                        {/* Buildings Polygons */}
                        {BUILDINGS.map(b => (
                            <g key={b.id}
                                className="b-path"
                                onMouseEnter={() => setActiveRegion(b.id)}
                                onMouseLeave={() => setActiveRegion(null)}
                                style={{ cursor: 'crosshair', transition: 'opacity 0.3s' }}
                                opacity={activeRegion && activeRegion !== b.id ? 0.3 : 1}
                            >
                                {/* Ping animation for Red blocks */}
                                {b.color === '#ff4400' && (
                                    <path d={b.path} fill="none" stroke="#ff4400" strokeWidth="2" opacity="0.5">
                                        <animate attributeName="stroke-width" values="2; 12; 2" dur="1.5s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.5; 0; 0.5" dur="1.5s" repeatCount="indefinite" />
                                    </path>
                                )}

                                <path
                                    d={b.path}
                                    fill={`${b.color}15`}
                                    stroke={b.color}
                                    strokeWidth={activeRegion === b.id ? 3 : 1}
                                    filter={`url(#glow-${b.color === '#00ff88' ? 'green' : b.color === '#ff4400' ? 'red' : 'yellow'})`}
                                    style={{ transition: 'stroke-width 0.2s' }}
                                />

                                {/* Data node */}
                                <circle cx={b.cx} cy={b.cy} r={6} fill={b.color} stroke="#030804" strokeWidth="2" />

                                {/* Floating label */}
                                <g transform={`translate(${b.cx - 40}, ${b.cy - 20})`} style={{ pointerEvents: 'none' }}>
                                    <rect x={-5} y={-14} width={b.name.length * 7 + 10} height={18} fill="#030804" opacity="0.8" />
                                    <text x="0" y="0" fill={b.color} fontSize="11" fontFamily="'IBM Plex Mono',monospace" fontWeight="500">{b.name}</text>
                                </g>
                                <text x={b.cx - 40} y={b.cy + 15} fill="#c8deca" fontSize="10" fontFamily="'IBM Plex Mono',monospace" opacity="0.8" pointerEvents="none">{b.val} kW</text>
                            </g>
                        ))}
                    </svg>

                    {/* Overlay GUI Elements */}
                    <div style={{ position: 'absolute', top: 24, left: 24, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#c8deca' }}>
                        <p style={{ color: '#00ff88', marginBottom: 4 }}>▶ MICROGRID SCADA ACTIVE</p>
                        <p>LAT: 19.1030° N | LNG: 72.8358° E</p>
                    </div>

                    <div style={{ position: 'absolute', bottom: 24, right: 24, display: 'flex', gap: 16, fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, background: '#00ff88', borderRadius: '50%' }} /> OPTIMAL</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, background: '#ffe14d', borderRadius: '50%' }} /> MODERATE</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, background: '#ff4400', borderRadius: '50%', animation: 'b-pulse 1s infinite' }} /> ANOMALY</div>
                    </div>
                </div>

                {/* Live Status Cards */}
                <div style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {BUILDINGS.map((b, i) => (
                        <div
                            key={i}
                            className="bs-card"
                            onMouseEnter={() => setActiveRegion(b.id)}
                            onMouseLeave={() => setActiveRegion(null)}
                            style={{
                                background: '#060e08',
                                border: activeRegion === b.id ? `1px solid ${b.color}` : '1px solid #1e2e21',
                                padding: '20px 24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                                cursor: 'pointer',
                                transition: 'border-color 0.2s, transform 0.2s',
                                transform: activeRegion === b.id ? 'translateX(-8px)' : 'translateX(0)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: '#c8deca', letterSpacing: 1 }}>{b.name}</span>
                                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: b.color }}>{b.val} <span style={{ fontSize: 14, color: '#4d6652' }}>kW</span></span>
                            </div>
                            <div style={{ height: 4, background: '#1e2e21', width: '100%', borderRadius: 2, overflow: 'hidden' }}>
                                <div className="bs-fill" style={{ width: b.pct, height: '100%', background: b.color }} />
                            </div>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: b.color, letterSpacing: 1 }}>[ {b.status} ]</span>
                        </div>
                    ))}
                </div>
            </div>
            <style>{`@keyframes b-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </section>
    )
}

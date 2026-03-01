import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function Cursor() {
    const cross = useRef(null)
    const ring = useRef(null)

    useEffect(() => {
        const isMobile = () => window.innerWidth <= 768 || 'ontouchstart' in window
        if (isMobile()) return

        let rx = 0, ry = 0, mx = window.innerWidth / 2, my = window.innerHeight / 2

        const onMove = e => { mx = e.clientX; my = e.clientY }
        window.addEventListener('mousemove', onMove, { passive: true })

        gsap.set(cross.current, { xPercent: -50, yPercent: -50 })
        gsap.set(ring.current, { xPercent: -50, yPercent: -50 })

        const tick = () => {
            gsap.set(cross.current, { x: mx, y: my })
            rx += (mx - rx) * 0.1
            ry += (my - ry) * 0.1
            gsap.set(ring.current, { x: rx, y: ry })
        }
        gsap.ticker.add(tick)

        const onEnter = e => {
            if (e.target.closest('a,button,input,[data-cursor]')) {
                gsap.to(ring.current, { scale: 2.2, borderColor: '#00ff88cc', duration: .2 })
            }
        }
        const onLeave = () => gsap.to(ring.current, { scale: 1, borderColor: '#00ff8844', duration: .2 })

        document.addEventListener('mouseover', onEnter)
        document.addEventListener('mouseout', onLeave)

        return () => {
            window.removeEventListener('mousemove', onMove)
            gsap.ticker.remove(tick)
            document.removeEventListener('mouseover', onEnter)
            document.removeEventListener('mouseout', onLeave)
        }
    }, [])

    return (
        <>
            <div ref={cross} style={{
                position: 'fixed', top: 0, left: 0, width: 12, height: 12, pointerEvents: 'none', zIndex: 9999,
            }}>
                <div style={{ position: 'absolute', width: 12, height: 1, background: '#00ff88', top: '50%', left: 0 }} />
                <div style={{ position: 'absolute', width: 1, height: 12, background: '#00ff88', left: '50%', top: 0 }} />
            </div>
            <div ref={ring} style={{
                position: 'fixed', top: 0, left: 0, width: 28, height: 28,
                border: '1px solid #00ff8844', pointerEvents: 'none', zIndex: 9998,
            }} />
        </>
    )
}

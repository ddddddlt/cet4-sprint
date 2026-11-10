import { useEffect, useRef } from 'react'
import { cn } from '../lib/utils'

const FINE = '(hover: hover) and (pointer: fine)'

function allowed() {
  if (document.documentElement.classList.contains('reduce-motion')) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return window.matchMedia(FINE).matches
}

export function Magnetic({ children, className, strength = 4 }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !allowed()) return undefined
    let raf = 0
    let last = null
    function move(e) {
      last = e
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (!last) return
        const r = el.getBoundingClientRect()
        const x = ((last.clientX - r.left) / r.width - 0.5) * strength * 2
        const y = ((last.clientY - r.top) / r.height - 0.5) * strength
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
        last = null
      })
    }
    function leave() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      last = null
      el.style.transform = 'translate3d(0,0,0)'
    }
    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerleave', leave)
    el.addEventListener('blur', leave)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('blur', leave)
    }
  }, [strength])

  return (
    <div ref={ref} className={cn('magnetic inline-block', className)}>
      {children}
    </div>
  )
}

export function Tilt({ children, className, max = 3 }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !allowed()) return undefined
    let raf = 0
    let last = null
    function move(e) {
      last = e
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (!last) return
        const r = el.getBoundingClientRect()
        const px = (last.clientX - r.left) / r.width - 0.5
        const py = (last.clientY - r.top) / r.height - 0.5
        el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translate3d(0,-2px,0)`
        last = null
      })
    }
    function leave() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      last = null
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)'
    }
    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerleave', leave)
    el.addEventListener('blur', leave)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('blur', leave)
    }
  }, [max])

  return (
    <div className={cn('tilt h-full min-w-0', className)}>
      <div ref={ref} className="tilt-inner h-full">
        {children}
      </div>
    </div>
  )
}

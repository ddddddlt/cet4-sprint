import { useEffect, useRef } from 'react'

const VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_t, u_int, u_grain, u_fade;
uniform vec3  u_bg, u_c1, u_c2, u_c3;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0,0.0));
  float c = hash(i + vec2(0.0,1.0));
  float d = hash(i + vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p  = vec2(uv.x * u_res.x / u_res.y, uv.y);
  float t = u_t * 0.05;

  float w    = fbm(vec2(p.x * 1.4 + t, t * 0.6));
  float band = smoothstep(0.0, 0.55, uv.y - 0.18 + w * 0.35)
             * smoothstep(1.05, 0.45, uv.y + w * 0.25);
  float rays = 0.55 + 0.45 * sin(p.x * 9.0 + w * 6.0 + u_t * 0.15);

  vec3 col = mix(u_c1, u_c2, smoothstep(0.2, 0.8, w));
  col = mix(col, u_c3, smoothstep(0.55, 1.0, uv.y + w * 0.3));
  vec3 c = mix(u_bg, col, band * rays * u_int * 1.6);

  c = mix(u_bg, c, mix(1.0, smoothstep(0.0, 1.0, uv.y), u_fade));

  float vd = length(uv - 0.5) * 1.41421356;
  c *= 1.0 - 0.45 * smoothstep(0.45, 1.15, vd);

  c += (hash(gl_FragCoord.xy + u_t) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [0, 0, 0]
}

export default function AuroraBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const coarse = window.matchMedia('(pointer:coarse)').matches
    const scale = coarse ? 0.55 : 0.78
    const maxPx = 4.2e6
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let motionOff = false
    try { motionOff = localStorage.getItem('cet4-sprint/motion') === 'reduce' } catch (e) { /* ignore */ }

    let gl = null
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' })
    } catch (e) { gl = null }
    if (!gl) {
      canvas.remove()
      document.documentElement.classList.add('no-bg')
      return undefined
    }

    function makeShader(type, src) {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s)
        return null
      }
      return s
    }

    const vs = makeShader(gl.VERTEX_SHADER, VERT)
    const fs = makeShader(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      canvas.remove()
      document.documentElement.classList.add('no-bg')
      return undefined
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.remove()
      document.documentElement.classList.add('no-bg')
      return undefined
    }
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'a')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const U = {
      res: gl.getUniformLocation(program, 'u_res'),
      t: gl.getUniformLocation(program, 'u_t'),
      int: gl.getUniformLocation(program, 'u_int'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      fade: gl.getUniformLocation(program, 'u_fade'),
      bg: gl.getUniformLocation(program, 'u_bg'),
      c1: gl.getUniformLocation(program, 'u_c1'),
      c2: gl.getUniformLocation(program, 'u_c2'),
      c3: gl.getUniformLocation(program, 'u_c3'),
    }
    gl.uniform3fv(U.bg, hexToRgb('#05060a'))
    gl.uniform3fv(U.c1, hexToRgb('#0b1c4a'))
    gl.uniform3fv(U.c2, hexToRgb('#2b46c8'))
    gl.uniform3fv(U.c3, hexToRgb('#6f5cff'))
    gl.uniform1f(U.int, 0.85)
    gl.uniform1f(U.grain, 0)
    gl.uniform1f(U.fade, 0.46)

    let tAcc = 0
    let last = 0
    let raf = 0
    let running = false

    function resize() {
      let dpr = Math.min(window.devicePixelRatio || 1, 2) * scale
      let w = window.innerWidth * dpr
      let h = window.innerHeight * dpr
      if (w * h > maxPx) {
        const k = Math.sqrt(maxPx / (w * h))
        dpr *= k
        w *= k
        h *= k
      }
      w = Math.max(1, Math.round(w))
      h = Math.max(1, Math.round(h))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
        gl.uniform2f(U.res, w, h)
      }
      draw()
    }

    function draw() {
      gl.uniform1f(U.t, tAcc)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    function frame(now) {
      raf = requestAnimationFrame(frame)
      if (now - last < 1000 / 30) return
      const dt = Math.min(now - (last || now), 100) / 1000
      last = now
      tAcc += dt * 1.08
      draw()
    }

    function stop() {
      cancelAnimationFrame(raf)
      raf = 0
      running = false
    }

    function start() {
      if (running) return
      if (reducedQuery.matches || motionOff) {
        draw()
        return
      }
      running = true
      last = 0
      raf = requestAnimationFrame(frame)
    }

    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    function onMotion() {
      stop()
      start()
    }

    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('orientationchange', resize, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('motionchange', onMotion)
    reducedQuery.addEventListener && reducedQuery.addEventListener('change', onMotion)

    resize()
    start()

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      window.removeEventListener('orientationchange', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('motionchange', onMotion)
      if (reducedQuery.removeEventListener) reducedQuery.removeEventListener('change', onMotion)
      gl.deleteBuffer(buf)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return (
    <>
      <canvas id="bg" ref={canvasRef} aria-hidden="true" />
      <div className="bg-veil" aria-hidden="true" />
    </>
  )
}

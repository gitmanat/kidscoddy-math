'use client'

import { shade, type ItemDesign } from '@/lib/avatar'

// =====================================================================
// 🐉 มังกรจีนน้อย — รูปทรงต่างกันจริง ไม่ใช่แค่เปลี่ยนสี
//   head    : eastern (หลงตะวันออก เขากวาง หนวดยาว) · lion (สิงห์มังกร แผงคอ เขี้ยว) · fish (ยฺหวีหลง ครีบหู หนวดปลา)
//   body    : serpent (เลื้อยตัว S) · coil (ขดตัวแล้วชูคอ)
//   element : none · fire · water · thunder · ice · jade   (เอฟเฟกต์รอบตัว)
//   → 3 × 2 × 6 = 36 แบบ  สี (c1 ตัว, c2 ครีบ/เขา, c3 หนวด/จุดเน้น) ปรับได้อิสระ
// =====================================================================
export type DragonHead = 'eastern' | 'lion' | 'fish'
export type DragonBody = 'serpent' | 'coil'
export type DragonElement = 'none' | 'fire' | 'water' | 'thunder' | 'ice' | 'jade'

export const DRAGON_HEADS: DragonHead[] = ['eastern', 'lion', 'fish']
export const DRAGON_BODIES: DragonBody[] = ['serpent', 'coil']
export const DRAGON_ELEMENTS: DragonElement[] = ['none', 'fire', 'water', 'thunder', 'ice', 'jade']

type Seg = [number, number, number, number, number, number]
const SPINES: Record<DragonBody, { segs: Seg[]; head: [number, number] }> = {
  serpent: {
    segs: [
      [16, 294, 50, 302, 48, 280],
      [48, 280, 46, 262, 54, 252],
    ],
    head: [54, 240],
  },
  coil: {
    // ขดเป็นก้นหอย 1 รอบครึ่ง แล้วชูคอขึ้น
    segs: [
      [34, 288, 50, 288, 52, 298],
      [52, 298, 54, 308, 34, 306],
      [34, 306, 14, 304, 16, 288],
      [16, 288, 18, 272, 36, 274],
      [36, 274, 52, 276, 44, 262],
      [44, 262, 38, 254, 46, 250],
    ],
    head: [46, 238],
  },
}

const INK = '#1f2937'

function quad(s: Seg, t: number) {
  const [x0, y0, cx, cy, x1, y1] = s
  const u = 1 - t
  return {
    x: u * u * x0 + 2 * u * t * cx + t * t * x1,
    y: u * u * y0 + 2 * u * t * cy + t * t * y1,
    tx: 2 * u * (cx - x0) + 2 * t * (x1 - cx),
    ty: 2 * u * (cy - y0) + 2 * t * (y1 - cy),
  }
}

function Head({ kind, hx, hy, c1, c2, c3 }: { kind: DragonHead; hx: number; hy: number; c1: string; c2: string; c3: string }) {
  const edge = shade(c1, -28)
  const light = shade(c1, 30)
  const eye = (x: number, y: number, r = 3) => (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fff" />
      <circle cx={x + 0.5} cy={y + 0.3} r={r * 0.5} fill={INK} />
    </g>
  )

  if (kind === 'lion') {
    return (
      <g>
        {Array.from({ length: 9 }).map((_, i) => {
          const a = (i / 9) * Math.PI * 2
          return <circle key={i} cx={hx + 13.5 * Math.cos(a)} cy={hy + 13.5 * Math.sin(a)} r="5.4" fill={c2} stroke={shade(c2, -22)} strokeWidth=".8" />
        })}
        <path d={`M${hx - 6} ${hy - 10} L${hx - 10} ${hy - 20} L${hx - 2} ${hy - 11} Z M${hx + 6} ${hy - 10} L${hx + 10} ${hy - 20} L${hx + 2} ${hy - 11} Z`} fill={c3} stroke={shade(c3, -25)} strokeWidth=".8" />
        <circle cx={hx} cy={hy} r="11" fill={c1} stroke={edge} strokeWidth="1" />
        {eye(hx - 5.5, hy - 3, 3.2)}
        {eye(hx + 5.5, hy - 3, 3.2)}
        <path d={`M${hx - 9} ${hy - 8} l6 2 M${hx + 9} ${hy - 8} l-6 2`} stroke={c2} strokeWidth="2.4" strokeLinecap="round" />
        <path d={`M${hx - 5} ${hy + 1} Q${hx} ${hy - 2} ${hx + 5} ${hy + 1} Q${hx + 6} ${hy + 5} ${hx} ${hy + 6} Q${hx - 6} ${hy + 5} ${hx - 5} ${hy + 1} Z`} fill={shade(c1, -38)} />
        <path d={`M${hx - 6} ${hy + 7} Q${hx} ${hy + 14} ${hx + 6} ${hy + 7} Z`} fill="#7f1d1d" />
        <path d={`M${hx - 4} ${hy + 7} l1.5 3.4 l1.5 -3.4 M${hx + 1} ${hy + 7} l1.5 3.4 l1.5 -3.4`} fill="#fff" stroke="#fff" strokeWidth=".6" />
      </g>
    )
  }

  if (kind === 'fish') {
    return (
      <g>
        {/* ครีบหู */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <path d={`M${hx + s * 10} ${hy - 2} L${hx + s * 25} ${hy - 11} L${hx + s * 22} ${hy + 1} L${hx + s * 25} ${hy + 12} Z`} fill={c2} stroke={shade(c2, -25)} strokeWidth="1" strokeLinejoin="round" />
            <path d={`M${hx + s * 12} ${hy - 1} L${hx + s * 23} ${hy - 7} M${hx + s * 12} ${hy} L${hx + s * 22} ${hy + 1} M${hx + s * 12} ${hy + 1} L${hx + s * 23} ${hy + 8}`} stroke={shade(c2, -30)} strokeWidth=".8" />
          </g>
        ))}
        <ellipse cx={hx} cy={hy} rx="12.5" ry="11" fill={c1} stroke={edge} strokeWidth="1" />
        <path d={`M${hx - 6} ${hy - 7} q3 -3 6 0 q3 -3 6 0 M${hx - 3} ${hy - 11} q3 -2 6 0`} fill="none" stroke={c2} strokeWidth="1.2" opacity=".8" />
        {eye(hx - 7, hy - 1.5, 4)}
        {eye(hx + 7, hy - 1.5, 4)}
        <ellipse cx={hx} cy={hy + 6.5} rx="3.6" ry="2.4" fill="#7f1d1d" />
        <path d={`M${hx - 4} ${hy + 8} Q${hx - 15} ${hy + 14} ${hx - 11} ${hy + 22} M${hx + 4} ${hy + 8} Q${hx + 15} ${hy + 14} ${hx + 11} ${hy + 22}`} fill="none" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
        <path d={`M${hx - 10} ${hy + 2} q-2 4 0 7 M${hx + 10} ${hy + 2} q2 4 0 7`} fill="none" stroke={edge} strokeWidth="1" />
      </g>
    )
  }

  /* eastern */
  return (
    <g>
      {[-1, 1].map((s) => (
        <g key={s}>
          <path d={`M${hx + s * 8} ${hy - 8} Q${hx + s * 12} ${hy - 20} ${hx + s * 22} ${hy - 22} M${hx + s * 14} ${hy - 15} q${s * -2} -6 ${s * 2} -9`} fill="none" stroke={c2} strokeWidth="3" strokeLinecap="round" />
          <path d={`M${hx + s * 9} ${hy + 4} Q${hx + s * 24} ${hy + 12} ${hx + s * 31} ${hy + 3}`} fill="none" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ))}
      <ellipse cx={hx} cy={hy} rx="13" ry="10.5" fill={c1} stroke={edge} strokeWidth="1" />
      <path d={`M${hx - 10} ${hy - 6} l5 -2 M${hx + 10} ${hy - 6} l-5 -2`} stroke={c2} strokeWidth="2" strokeLinecap="round" />
      {eye(hx - 6, hy - 2.5, 3)}
      {eye(hx + 6, hy - 2.5, 3)}
      <ellipse cx={hx} cy={hy + 5} rx="7.5" ry="4.6" fill={light} />
      <circle cx={hx - 2.6} cy={hy + 4.4} r="1" fill={INK} />
      <circle cx={hx + 2.6} cy={hy + 4.4} r="1" fill={INK} />
      <path d={`M${hx - 3} ${hy + 8} Q${hx} ${hy + 10} ${hx + 3} ${hy + 8}`} fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      <path d={`M${hx - 3} ${hy + 9} Q${hx} ${hy + 18} ${hx + 3} ${hy + 9} Z`} fill={c3} />
    </g>
  )
}

function Effects({ el, hx, hy, tail, phase }: { el: DragonElement; hx: number; hy: number; tail: [number, number]; phase: 'back' | 'front' }) {
  const flame = (x: number, y: number, s = 1) => (
    <g key={`${x}-${y}`}>
      <path d={`M${x - 4 * s} ${y} Q${x - 7 * s} ${y - 10 * s} ${x} ${y - 18 * s} Q${x + 7 * s} ${y - 10 * s} ${x + 4 * s} ${y} Z`} fill="#f97316" />
      <path d={`M${x - 2 * s} ${y} Q${x - 3.5 * s} ${y - 6 * s} ${x} ${y - 11 * s} Q${x + 3.5 * s} ${y - 6 * s} ${x + 2 * s} ${y} Z`} fill="#fde047" />
    </g>
  )
  const crystal = (x: number, y: number, s = 1) => (
    <path key={`${x}-${y}`} d={`M${x} ${y - 6 * s} L${x + 3.4 * s} ${y} L${x} ${y + 6 * s} L${x - 3.4 * s} ${y} Z`} fill="#bae6fd" stroke="#38bdf8" strokeWidth=".8" />
  )

  if (el === 'fire')
    return phase === 'back' ? (
      <g>
        {flame(hx - 11, hy - 8, 0.9)}
        {flame(hx, hy - 10, 1.15)}
        {flame(hx + 11, hy - 8, 0.9)}
        {flame(tail[0] - 2, tail[1] + 2, 0.9)}
        {flame(tail[0] + 7, tail[1] + 4, 0.7)}
      </g>
    ) : null

  if (el === 'water')
    return phase === 'back' ? (
      <g fill="none" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" opacity=".9">
        <ellipse cx="32" cy="304" rx="30" ry="5" />
        <ellipse cx="32" cy="304" rx="19" ry="3" />
      </g>
    ) : (
      <g fill="#7dd3fc" stroke="#0ea5e9" strokeWidth=".7">
        {[[hx + 18, hy - 16], [hx - 22, hy - 12], [hx + 24, hy + 6]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 6} Q${x + 4.5} ${y} ${x} ${y + 3} Q${x - 4.5} ${y} ${x} ${y - 6} Z`} />
        ))}
      </g>
    )

  if (el === 'thunder')
    return phase === 'front' ? (
      <g fill="none" stroke="#facc15" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${hx + 18} ${hy - 26} l-6 9 l6 1.5 l-6 10`} />
        <path d={`M${hx - 24} ${hy - 22} l5 8 l-5 1.5 l5 8`} />
        <path d={`M${tail[0] + 4} ${tail[1] - 14} l-5 8 l5 1 l-4 8`} />
      </g>
    ) : null

  if (el === 'ice')
    return phase === 'front' ? (
      <g>
        {crystal(hx + 20, hy - 16, 1.1)}
        {crystal(hx - 22, hy - 14, 0.9)}
        {crystal(hx + 24, hy + 8, 0.8)}
        {crystal(tail[0] + 8, tail[1] - 12, 0.9)}
        <g fill="#fff" opacity=".9">
          <circle cx={hx + 8} cy={hy - 26} r="1.4" />
          <circle cx={hx - 10} cy={hy - 30} r="1.1" />
          <circle cx={hx + 30} cy={hy - 4} r="1.2" />
        </g>
      </g>
    ) : null

  if (el === 'jade')
    return phase === 'front' ? (
      <g>
        <circle cx={hx + 18} cy={hy + 16} r="9" fill="#34d399" opacity=".25" />
        <circle cx={hx + 18} cy={hy + 16} r="5.4" fill="#34d399" stroke="#059669" strokeWidth="1" />
        <circle cx={hx + 16.4} cy={hy + 14.4} r="1.6" fill="#fff" opacity=".85" />
        <path d={`M${hx - 24} ${hy - 12} q4 -5 8 -1 q4 -4 6 1 q-3 3 -7 1 q-3 3 -7 -1 Z`} fill="none" stroke="#34d399" strokeWidth="1.3" />
      </g>
    ) : null

  return null
}

export function DragonPet({ d }: { d?: ItemDesign }) {
  const v = (d?.variant || {}) as Record<string, string>
  const head: DragonHead = (DRAGON_HEADS as string[]).includes(v.head) ? (v.head as DragonHead) : 'eastern'
  const body: DragonBody = (DRAGON_BODIES as string[]).includes(v.body) ? (v.body as DragonBody) : 'serpent'
  const el: DragonElement = (DRAGON_ELEMENTS as string[]).includes(v.element) ? (v.element as DragonElement) : 'none'
  const c1 = d?.colors?.[0] || '#facc15'
  const c2 = d?.colors?.[1] || '#f59e0b'
  const c3 = d?.colors?.[2] || '#dc2626'

  const sp = SPINES[body]
  const [hx, hy] = sp.head
  const pathD = `M${sp.segs[0][0]} ${sp.segs[0][1]} ` + sp.segs.map((s) => `Q${s[2]} ${s[3]} ${s[4]} ${s[5]}`).join(' ')
  const tail: [number, number] = [sp.segs[0][0], sp.segs[0][1]]

  // ครีบสันหลังเรียงตามเส้นลำตัว (ตัวหลังเล็กลง)
  const fins: { x: number; y: number; nx: number; ny: number; tx: number; ty: number; h: number }[] = []
  sp.segs.forEach((s, si) => {
    ;[0.3, 0.7].forEach((t, ti) => {
      const q = quad(s, t)
      const len = Math.hypot(q.tx, q.ty) || 1
      let nx = -q.ty / len
      let ny = q.tx / len
      if (ny > 0 || (Math.abs(ny) < 0.2 && nx > 0)) {
        nx = -nx
        ny = -ny
      }
      const k = si * 2 + ti
      fins.push({ x: q.x, y: q.y, nx, ny, tx: q.tx / len, ty: q.ty / len, h: Math.max(4, 8 - k * 0.8) })
    })
  })

  return (
    <g transform="translate(-2 58) scale(0.78)">
      <Effects el={el} hx={hx} hy={hy} tail={tail} phase="back" />

      {/* หาง */}
      {head === 'fish' ? (
        <g>
          <path d={`M${tail[0]} ${tail[1]} L${tail[0] - 13} ${tail[1] - 11} Q${tail[0] - 8} ${tail[1]} ${tail[0] - 13} ${tail[1] + 11} Z`} fill={c2} stroke={shade(c2, -25)} strokeWidth="1" strokeLinejoin="round" />
          <path d={`M${tail[0] - 2} ${tail[1]} L${tail[0] - 11} ${tail[1] - 7} M${tail[0] - 2} ${tail[1]} L${tail[0] - 11} ${tail[1] + 7}`} stroke={shade(c2, -30)} strokeWidth=".8" />
        </g>
      ) : (
        <path d={`M${tail[0]} ${tail[1]} Q${tail[0] - 9} ${tail[1] - 7} ${tail[0] - 13} ${tail[1] - 3} Q${tail[0] - 8} ${tail[1] + 1} ${tail[0] - 10} ${tail[1] + 8} Q${tail[0] - 3} ${tail[1] + 5} ${tail[0]} ${tail[1]} Z`} fill={c2} stroke={shade(c2, -25)} strokeWidth="1" />
      )}

      {/* ลำตัว */}
      <path d={pathD} fill="none" stroke={shade(c1, -30)} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathD} fill="none" stroke={c1} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathD} fill="none" stroke={shade(c1, 38)} strokeWidth="3.6" strokeLinecap="round" strokeDasharray="1 7" opacity=".85" />

      {/* ครีบสันหลัง */}
      {fins.map((f, i) => (
        <path
          key={i}
          d={`M${f.x - f.tx * 3.4} ${f.y - f.ty * 3.4} L${f.x + f.nx * (5 + f.h)} ${f.y + f.ny * (5 + f.h)} L${f.x + f.tx * 3.4} ${f.y + f.ty * 3.4} Z`}
          fill={c2}
          stroke={shade(c2, -25)}
          strokeWidth=".8"
          strokeLinejoin="round"
        />
      ))}

      {/* กรงเล็บ */}
      <g stroke={c3} strokeWidth="2" strokeLinecap="round" fill="none">
        <path d={`M${sp.segs[0][4] - 6} ${sp.segs[0][5] + 6} l-4 6 M${sp.segs[0][4] - 6} ${sp.segs[0][5] + 6} l0 7 M${sp.segs[0][4] - 6} ${sp.segs[0][5] + 6} l4 6`} />
      </g>

      <Head kind={head} hx={hx} hy={hy} c1={c1} c2={c2} c3={c3} />
      <Effects el={el} hx={hx} hy={hy} tail={tail} phase="front" />
    </g>
  )
}
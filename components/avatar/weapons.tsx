'use client'

import type React from 'react'
import { shade, type ItemDesign } from '@/lib/avatar'

// =====================================================================
// ⚔️ อาวุธและของถือแบบใหม่ — แต่ละชนิดรูปทรงต่างกัน
//   ชนิดใหม่   : spear (หอก) · guandao (กวนตาว) · twin_blades (ดาบคู่) · whip (แส้) · bow (ธนู)
//                pipa (ผีผา) · meteor (ตุ้มดาวตก) · brush (พู่กันยักษ์) · abacus (ลูกคิดวิเศษ)
//   ประกอบชิ้นส่วน: sword_chinese + variant { blade: straight|flame|leaf|crystal, hilt: wing|disc, aura }
//                   saber         + variant { blade: curved|broad|ringed, aura }
//   aura           : none · fire · ice · thunder · jade
// =====================================================================
export const NEW_WEAPON_SHAPES = ['spear', 'guandao', 'twin_blades', 'whip', 'bow', 'pipa', 'meteor', 'brush', 'abacus']

export const isNewWeapon = (shape: string, d?: ItemDesign) =>
  NEW_WEAPON_SHAPES.includes(shape) || ((shape === 'sword_chinese' || shape === 'saber') && !!d?.variant)

const pal = (d: ItemDesign | undefined, fb: [string, string, string]) => ({
  c1: d?.colors?.[0] || fb[0],
  c2: d?.colors?.[1] || fb[1],
  c3: d?.colors?.[2] || fb[2],
})

const STEEL = '#e2e8f0'
const STEEL_D = '#64748b'

/* ---------- ออร่ารอบใบอาวุธ (แกนอาวุธอยู่ที่ x=0 ปลายขึ้นด้านบน) ---------- */
function Aura({ kind, len, w = 6 }: { kind?: string; len: number; w?: number }) {
  if (!kind || kind === 'none') return null
  const top = -len - 8
  if (kind === 'fire')
    return (
      <g>
        {[0, 1, 2, 3].map((i) => {
          const s = i % 2 ? 1 : -1
          const y = -18 - i * (len / 4.4)
          return (
            <g key={i}>
              <path d={`M${s * 3} ${y} Q${s * (w + 7)} ${y - 4} ${s * (w + 2)} ${y - 15} Q${s * (w - 1)} ${y - 7} ${s * 3} ${y - 6} Z`} fill="#f97316" />
              <path d={`M${s * 3} ${y - 1} Q${s * (w + 3)} ${y - 4} ${s * (w + 1)} ${y - 9} Q${s * (w - 1)} ${y - 5} ${s * 3} ${y - 4} Z`} fill="#fde047" />
            </g>
          )
        })}
      </g>
    )
  if (kind === 'ice')
    return (
      <g>
        {[0, 1, 2, 3].map((i) => {
          const s = i % 2 ? 1 : -1
          const y = -22 - i * (len / 4.6)
          return <path key={i} d={`M${s * (w + 3)} ${y - 5} L${s * (w + 6.4)} ${y} L${s * (w + 3)} ${y + 5} L${s * (w - 0.4)} ${y} Z`} fill="#bae6fd" stroke="#38bdf8" strokeWidth=".8" />
        })}
        <circle cx={-w - 9} cy={top + 14} r="1.4" fill="#fff" />
        <circle cx={w + 10} cy={top + 30} r="1.2" fill="#fff" />
      </g>
    )
  if (kind === 'thunder') {
    const pts: string[] = []
    for (let i = 0; i <= 8; i++) pts.push(`${i % 2 ? w + 4 : -w - 4},${-10 - i * (len / 8.4)}`)
    return (
      <g fill="none" stroke="#facc15" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={pts.join(' ')} strokeWidth="1.8" />
        <path d={`M${w + 8} ${top + 8} l-4 6 l4 1 l-3 6`} strokeWidth="1.6" />
      </g>
    )
  }
  /* jade */
  return (
    <g>
      <path d={`M0 -10 V${top}`} stroke="#34d399" strokeWidth={w + 6} strokeLinecap="round" opacity=".22" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={(i % 2 ? 1 : -1) * (w + 6)} cy={-24 - i * (len / 3.2)} r="2.4" fill="#34d399" stroke="#059669" strokeWidth=".7" />
      ))}
    </g>
  )
}

/* ---------- กระบี่ (jian) ประกอบชิ้นส่วน ---------- */
function Jian({ d }: { d?: ItemDesign }) {
  const v = (d?.variant || {}) as Record<string, string>
  const blade = v.blade || 'straight'
  const hilt = v.hilt || 'wing'
  const { c1, c2, c3 } = pal(d, ['#7c2d12', '#fbbf24', '#dc2626'])
  const L = 82

  let bladeEl: React.ReactElement
  if (blade === 'flame') {
    const pts = (sign: number) =>
      Array.from({ length: 14 }, (_, i) => {
        const y = -8 - i * 6.3
        const w = i <= 10 ? 4.4 + 1.9 * Math.sin(i * 1.5) : 4.4 * (1 - (i - 10) / 3.4)
        return `${(sign * w).toFixed(2)} ${y.toFixed(1)}`
      })
    const left = pts(-1)
    const right = pts(1).reverse()
    bladeEl = <path d={`M${left.join(' L')} L${right.join(' L')} Z`} fill="#fecaca" stroke="#dc2626" strokeWidth="1.1" strokeLinejoin="round" />
  } else if (blade === 'leaf') {
    bladeEl = (
      <g>
        <path d="M0 -92 Q15 -58 5 -8 H-5 Q-15 -58 0 -92 Z" fill="#d9f99d" stroke="#4d7c0f" strokeWidth="1.1" />
        <path d="M0 -86 V-12" stroke="#a3e635" strokeWidth="1.4" />
      </g>
    )
  } else if (blade === 'crystal') {
    bladeEl = (
      <g>
        <path d="M0 -92 L6 -74 L4 -58 L7 -42 L4.5 -8 H-4.5 L-7 -42 L-4 -58 L-6 -74 Z" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M0 -92 V-8 M-6 -74 L6 -74 M-4 -58 L4 -58 M-7 -42 L7 -42" stroke="#93c5fd" strokeWidth=".9" />
      </g>
    )
  } else {
    bladeEl = (
      <g>
        <path d="M-4 -78 L0 -90 L4 -78 L4.5 -8 H-4.5 Z" fill="#f1f5f9" stroke={STEEL_D} strokeWidth="1.1" />
        <path d="M0 -84 V-10" stroke="#cbd5e1" strokeWidth="1.4" />
      </g>
    )
  }

  return (
    <g transform="translate(140 216) rotate(18)">
      <Aura kind={v.aura} len={L} />
      {bladeEl}
      {hilt === 'disc' ? (
        <g>
          <ellipse cx="0" cy="-6" rx="12" ry="4.2" fill={c2} stroke={shade(c2, -28)} strokeWidth="1" />
          <circle cx="0" cy="-6" r="2.2" fill={c3} />
        </g>
      ) : (
        <path d="M-16 -7 Q0 -13 16 -7 L13 -2 Q0 -7 -13 -2 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1" />
      )}
      <rect x="-3.2" y="-3" width="6.4" height="16" rx="3" fill={c1} />
      <path d="M-3 1 H3 M-3 5 H3 M-3 9 H3" stroke={shade(c1, -30)} strokeWidth=".8" />
      <circle cx="0" cy="15" r="4" fill={c2} />
      <path d="M0 18 Q-8 32 -4 44 M0 18 Q2 34 6 44" fill="none" stroke={c3} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  )
}

/* ---------- ดาบใบกว้าง (dao) ประกอบชิ้นส่วน ---------- */
function Saber({ d }: { d?: ItemDesign }) {
  const v = (d?.variant || {}) as Record<string, string>
  const blade = v.blade || 'curved'
  const { c1, c2, c3 } = pal(d, ['#7c2d12', '#fbbf24', '#dc2626'])
  const L = blade === 'broad' ? 66 : 82

  return (
    <g transform="translate(140 216) rotate(14)">
      <Aura kind={v.aura} len={L} w={blade === 'broad' ? 9 : 6} />
      {blade === 'broad' ? (
        <g>
          <path d="M-6 -8 L-6 -52 Q-6 -70 12 -78 L15 -58 Q17 -30 10 -8 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M-2 -12 V-56 Q-1 -66 8 -72" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".8" />
          <path d="M-6 -30 l-4 3 l4 3 M-6 -44 l-4 3 l4 3" fill={c2} stroke={c2} strokeWidth="1" />
        </g>
      ) : (
        <g>
          <path d="M-5 -8 L-5 -64 Q-5 -86 13 -94 Q8 -74 10 -58 L10 -8 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M-1 -12 V-64 Q-1 -78 8 -88" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".8" />
          {blade === 'ringed' &&
            [-22, -36, -50, -64].map((y) => <circle key={y} cx="-7.6" cy={y} r="3" fill="none" stroke={c2} strokeWidth="1.6" />)}
        </g>
      )}
      <ellipse cx="2.5" cy="-6" rx="10" ry="3.6" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
      <rect x="-1" y="-3" width="7" height="17" rx="3" fill={c1} />
      <circle cx="2.5" cy="16" r="3.8" fill={c2} />
      <path d="M2.5 19 Q-6 30 -2 44 M2.5 19 Q8 32 12 44" fill="none" stroke={c3} strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

export function NewWeapon({ shape, d }: { shape: string; d?: ItemDesign }) {
  switch (shape) {
    case 'sword_chinese':
      return <Jian d={d} />
    case 'saber':
      return <Saber d={d} />

    /* หอกพู่แดง */
    case 'spear': {
      const { c1, c2, c3 } = pal(d, ['#92400e', '#9ca3af', '#dc2626'])
      return (
        <g transform="translate(140 216) rotate(10)">
          <rect x="-2.2" y="-116" width="4.4" height="138" rx="2.2" fill={c1} stroke={shade(c1, -30)} strokeWidth=".8" />
          <path d="M0 -142 Q8 -130 4.4 -112 H-4.4 Q-8 -130 0 -142 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="1.1" />
          <path d="M0 -138 V-114" stroke="#fff" strokeWidth="1.2" opacity=".8" />
          <rect x="-3.6" y="-114" width="7.2" height="5" rx="1.5" fill={c2} />
          <path d="M0 -109 Q-9 -100 -7 -88 M0 -109 Q-4 -98 -2 -86 M0 -109 Q4 -98 2 -86 M0 -109 Q9 -100 7 -88" fill="none" stroke={c3} strokeWidth="3" strokeLinecap="round" />
          <rect x="-3" y="18" width="6" height="6" rx="2" fill={c2} />
        </g>
      )
    }

    /* กวนตาว (ง้าวมังกรเขียว) */
    case 'guandao': {
      const { c1, c2, c3 } = pal(d, ['#65a30d', '#fbbf24', '#dc2626'])
      return (
        <g transform="translate(140 216) rotate(10)">
          <rect x="-2.4" y="-82" width="4.8" height="106" rx="2.4" fill={c1} stroke={shade(c1, -30)} strokeWidth=".8" />
          <path d="M-2 -76 L-2 -124 Q28 -126 23 -98 Q20 -84 7 -76 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M2 -82 Q16 -96 16 -114" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".8" />
          <path d="M-2 -116 l-6 3 l6 3 M-2 -104 l-6 3 l6 3 M-2 -92 l-6 3 l6 3" fill={c2} stroke={shade(c2, -25)} strokeWidth=".8" />
          <rect x="-4.2" y="-82" width="8.4" height="6" rx="2" fill={c2} />
          <path d="M0 -70 Q-9 -60 -7 -48 M0 -70 Q-3 -58 -1 -46 M0 -70 Q4 -58 2 -46" fill="none" stroke={c3} strokeWidth="3" strokeLinecap="round" />
          <path d="M-3 24 L0 34 L3 24 Z" fill={c2} />
        </g>
      )
    }

    /* ดาบคู่ไขว้ */
    case 'twin_blades': {
      const { c1, c2, c3 } = pal(d, ['#7c2d12', '#fbbf24', '#dc2626'])
      const one = (deg: number, key: string) => (
        <g key={key} transform={`rotate(${deg})`}>
          <path d="M-4 -8 L-4 -44 Q-4 -58 9 -64 Q6 -50 8 -40 L8 -8 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="1" strokeLinejoin="round" />
          <path d="M0 -12 V-44" stroke="#fff" strokeWidth="1.1" opacity=".8" />
          <ellipse cx="2" cy="-6" rx="8" ry="3" fill={c2} stroke={shade(c2, -28)} strokeWidth=".8" />
          <rect x="-1" y="-3" width="6" height="13" rx="2.5" fill={c1} />
          <path d="M2 11 Q-3 20 0 28" fill="none" stroke={c3} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )
      return <g transform="translate(140 214)">{one(-36, 'a')}{one(34, 'b')}</g>
    }

    /* แส้เก้าท่อน */
    case 'whip': {
      const { c1, c2, c3 } = pal(d, ['#7c2d12', '#fbbf24', '#dc2626'])
      return (
        <g transform="translate(140 216) rotate(6)">
          <path d="M0 -8 C-34 -14 -34 -56 -8 -58 C14 -60 16 -36 -2 -36 C-12 -36 -10 -46 -4 -46" fill="none" stroke={shade(c3, -35)} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M0 -8 C-34 -14 -34 -56 -8 -58 C14 -60 16 -36 -2 -36 C-12 -36 -10 -46 -4 -46" fill="none" stroke={c3} strokeWidth="2" strokeLinecap="round" strokeDasharray="6 2.4" />
          <path d="M-4 -46 l-4 -4 l8 0 Z" fill={c2} stroke={shade(c2, -25)} strokeWidth=".8" />
          <rect x="-3" y="-8" width="6" height="22" rx="3" fill={c1} stroke={shade(c1, -30)} strokeWidth=".8" />
          <rect x="-3.6" y="-10" width="7.2" height="4" rx="2" fill={c2} />
          <circle cx="0" cy="16" r="3.4" fill={c2} />
        </g>
      )
    }

    /* ธนูพร้อมลูกธนู */
    case 'bow': {
      const { c1, c2, c3 } = pal(d, ['#92400e', '#fbbf24', '#dc2626'])
      return (
        <g transform="translate(140 214) rotate(-6)">
          <path d="M-2 -76 Q-38 -14 -2 48" fill="none" stroke={shade(c1, -35)} strokeWidth="5.6" strokeLinecap="round" />
          <path d="M-2 -76 Q-38 -14 -2 48" fill="none" stroke={c1} strokeWidth="3.6" strokeLinecap="round" />
          <path d="M-2 -76 L-2 48" stroke="#e5e7eb" strokeWidth="1" />
          <rect x="-22.6" y="-20" width="5.6" height="16" rx="2.4" fill={c2} transform="rotate(4 -20 -12)" />
          <path d="M-2 -12 L44 -12" stroke="#a16207" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M44 -12 L36 -16 L36 -8 Z" fill={STEEL} stroke={STEEL_D} strokeWidth=".8" />
          <path d="M-2 -12 l6 -4 M-2 -12 l6 4 M2 -12 l6 -4 M2 -12 l6 4" stroke={c3} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="-2" cy="-77" r="2.4" fill={c2} />
          <circle cx="-2" cy="49" r="2.4" fill={c2} />
        </g>
      )
    }

    /* ผีผา */
    case 'pipa': {
      const { c1, c2, c3 } = pal(d, ['#b45309', '#fde68a', '#dc2626'])
      return (
        <g transform="translate(140 218) rotate(26)">
          <rect x="-3.6" y="-70" width="7.2" height="62" rx="2" fill={shade(c1, -15)} stroke={shade(c1, -40)} strokeWidth=".8" />
          {[-60, -48, -38, -28, -18].map((y) => <path key={y} d={`M-4 ${y} H4`} stroke={c2} strokeWidth="1.3" />)}
          <path d="M-3.6 -70 L-3.6 -78 Q0 -84 7 -80 L3.6 -70 Z" fill={c3} stroke={shade(c3, -30)} strokeWidth=".8" />
          <path d="M0 -10 Q-23 -2 -19 22 Q-15 42 0 42 Q15 42 19 22 Q23 -2 0 -10 Z" fill={c1} stroke={shade(c1, -40)} strokeWidth="1.3" />
          <path d="M0 -4 Q-15 2 -12 22 Q-9 36 0 36 Q9 36 12 22 Q15 2 0 -4 Z" fill={shade(c1, 22)} />
          <path d="M-1.2 -70 V30 M1.2 -70 V30" stroke="#f1f5f9" strokeWidth=".7" />
          <circle cx="0" cy="24" r="2.6" fill={shade(c1, -45)} />
          <rect x="-6" y="30" width="12" height="2.6" rx="1" fill={shade(c1, -45)} />
        </g>
      )
    }

    /* ตุ้มดาวตก (หลิวซิงฉุย) */
    case 'meteor': {
      const { c1, c2, c3 } = pal(d, ['#7c2d12', '#64748b', '#dc2626'])
      return (
        <g transform="translate(140 216) rotate(8)">
          <path d="M0 -6 Q-36 -26 -10 -62" fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="3 2" />
          <rect x="-3" y="-8" width="6" height="22" rx="3" fill={c1} stroke={shade(c1, -30)} strokeWidth=".8" />
          <circle cx="0" cy="17" r="3.4" fill={c3} />
          <g transform="translate(-10 -68)">
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2
              const x = 10 * Math.cos(a)
              const y = 10 * Math.sin(a)
              return <path key={i} d={`M${(x * 0.8).toFixed(1)} ${(y * 0.8).toFixed(1)} L${(x * 1.55).toFixed(1)} ${(y * 1.55).toFixed(1)} L${(10 * Math.cos(a + 0.5) * 0.8).toFixed(1)} ${(10 * Math.sin(a + 0.5) * 0.8).toFixed(1)} Z`} fill={shade(c2, 15)} stroke={shade(c2, -30)} strokeWidth=".7" />
            })}
            <circle cx="0" cy="0" r="9.4" fill={c2} stroke={shade(c2, -35)} strokeWidth="1.2" />
            <circle cx="-3" cy="-3" r="2.6" fill="#fff" opacity=".5" />
          </g>
        </g>
      )
    }

    /* พู่กันยักษ์ของบัณฑิต */
    case 'brush': {
      const { c1, c2, c3 } = pal(d, ['#65a30d', '#1f2937', '#dc2626'])
      return (
        <g transform="translate(140 218) rotate(12)">
          <rect x="-2.6" y="-84" width="5.2" height="96" rx="2.6" fill={c1} stroke={shade(c1, -30)} strokeWidth=".8" />
          <path d="M-2.6 -50 H2.6 M-2.6 -24 H2.6" stroke={shade(c1, -35)} strokeWidth="1" />
          <rect x="-4.4" y="-88" width="8.8" height="5" rx="2" fill={c3} />
          <path d="M-5 -88 Q-6 -112 0 -122 Q6 -112 5 -88 Z" fill={c2} stroke={shade(c2, 30)} strokeWidth=".8" />
          <path d="M-1.4 -92 Q-2.4 -108 0 -116" fill="none" stroke="#fff" strokeWidth="1" opacity=".35" />
          <circle cx="9" cy="-112" r="2" fill={c2} />
          <circle cx="-10" cy="-100" r="1.5" fill={c2} />
          <rect x="-3" y="12" width="6" height="4" rx="2" fill={c3} />
        </g>
      )
    }

    /* ลูกคิดวิเศษ (เข้ากับนักคำนวณ KidsCoddy) */
    case 'abacus': {
      const { c1, c2, c3 } = pal(d, ['#92400e', '#dc2626', '#fbbf24'])
      return (
        <g transform="translate(140 214) rotate(-10)">
          <rect x="-20" y="-40" width="40" height="38" rx="3" fill={shade(c1, 35)} stroke={shade(c1, -30)} strokeWidth="2.2" />
          <path d="M-20 -29 H20" stroke={shade(c1, -30)} strokeWidth="2" />
          {[-14, -7, 0, 7, 14].map((x, i) => (
            <g key={x}>
              <path d={`M${x} -40 V-2`} stroke={shade(c1, -45)} strokeWidth="1.1" />
              <ellipse cx={x} cy={i % 2 ? -33 : -35} rx="3.2" ry="2.4" fill={c2} stroke={shade(c2, -30)} strokeWidth=".7" />
              {[0, 1, 2, 3].map((k) => (
                <ellipse key={k} cx={x} cy={i % 2 ? -25 + k * 4.6 : -5.5 - k * 4.6} rx="3.2" ry="2.3" fill={k % 2 ? c3 : c2} stroke={shade(c3, -35)} strokeWidth=".6" />
              ))}
            </g>
          ))}
          <path d="M-20 -2 Q0 8 20 -2" fill="none" stroke={shade(c1, -30)} strokeWidth="2" />
        </g>
      )
    }
    default:
      return null
  }
}
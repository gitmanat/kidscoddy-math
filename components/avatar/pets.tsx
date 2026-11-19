'use client'

import { shade, type ItemDesign } from '@/lib/avatar'

// =====================================================================
// 🐯 สัตว์เลี้ยงนักษัตรจีนและสัตว์มงคล — รูปทรง/ท่านั่งต่างกันจริง
//   tiger (ปีขาล) · horse (ปีมะเมีย) · monkey (ปีวอก ลิงคาดผมทอง) · ox (ปีฉลู วัวเขียว)
//   rooster (ปีระกา) · pig (ปีกุน ถือก้อนทอง) · koi (ปลาคราฟกระโดดน้ำ) · turtle (เต่าดำพันงู)
//   fox (จิ้งจอก เลือกจำนวนหางได้: variant.tails = 1 | 3 | 5 | 9)
//   สี: c1 ตัว · c2 จุดอ่อน/ท้อง · c3 ลาย/จุดเน้น
// =====================================================================
export const NEW_PET_SHAPES = ['tiger', 'horse', 'monkey', 'ox', 'rooster', 'pig', 'koi', 'turtle', 'fox']
export const isNewPet = (shape: string) => NEW_PET_SHAPES.includes(shape)

const INK = '#1f2937'
const GOLD = '#fbbf24'

const pal = (d: ItemDesign | undefined, fb: [string, string, string]) => ({
  c1: d?.colors?.[0] || fb[0],
  c2: d?.colors?.[1] || fb[1],
  c3: d?.colors?.[2] || fb[2],
})

const Eye = ({ x, y, r = 2.2 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={INK} />
    <circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.36} fill="#fff" />
  </g>
)

export function NewPet({ shape, d }: { shape: string; d?: ItemDesign }) {
  switch (shape) {
    /* ---------- เสือ ---------- */
    case 'tiger': {
      const { c1, c2, c3 } = pal(d, ['#f59e0b', '#fff7ed', '#1f2937'])
      const edge = shade(c1, -25)
      return (
        <g>
          <path d="M44 288 Q60 286 56 266" fill="none" stroke={edge} strokeWidth="7" strokeLinecap="round" />
          <path d="M44 288 Q60 286 56 266" fill="none" stroke={c1} strokeWidth="5" strokeLinecap="round" />
          <path d="M52 284 l4 -1 M56 276 l4 -1 M57 269 l3 -1" stroke={c3} strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="30" cy="280" rx="16" ry="13" fill={c1} stroke={edge} strokeWidth="1" />
          <ellipse cx="30" cy="285" rx="9" ry="8" fill={c2} />
          <path d="M16 274 q5 2 7 7 M44 274 q-5 2 -7 7 M17 286 q5 -2 8 2 M43 286 q-5 -2 -8 2" fill="none" stroke={c3} strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="22" cy="294" rx="6" ry="3.2" fill={c1} stroke={edge} strokeWidth="1" />
          <ellipse cx="38" cy="294" rx="6" ry="3.2" fill={c1} stroke={edge} strokeWidth="1" />
          <circle cx="19" cy="247" r="5" fill={c1} stroke={edge} strokeWidth="1" />
          <circle cx="41" cy="247" r="5" fill={c1} stroke={edge} strokeWidth="1" />
          <circle cx="19" cy="247" r="2.4" fill="#fda4af" />
          <circle cx="41" cy="247" r="2.4" fill="#fda4af" />
          <circle cx="30" cy="258" r="14" fill={c1} stroke={edge} strokeWidth="1" />
          <ellipse cx="30" cy="263" rx="9.5" ry="7" fill={c2} />
          <path d="M25 249 h10 M30 249 v7 M26 252.6 h8" fill="none" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 257 h5 M16.5 261 h4 M44 257 h-5 M43.5 261 h-4" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
          <Eye x={24} y={257} />
          <Eye x={36} y={257} />
          <path d="M27.5 262 h5 l-2.5 3 Z" fill="#be123c" />
          <path d="M26 267 Q30 271 30 265.5 Q30 271 34 267" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )
    }

    /* ---------- ม้า (มองด้านข้าง) ---------- */
    case 'horse': {
      const { c1, c2, c3 } = pal(d, ['#a16207', '#1f2937', '#3f3f46'])
      const edge = shade(c1, -28)
      return (
        <g transform="translate(-9 0) scale(0.92) translate(2 22)">
          <path d="M13 272 Q0 278 4 294" fill="none" stroke={c2} strokeWidth="6" strokeLinecap="round" />
          {[16, 22, 35, 41].map((x, i) => (
            <g key={x}>
              <rect x={x - 2} y="282" width="4.4" height="13" rx="2" fill={i < 2 ? shade(c1, -12) : c1} stroke={edge} strokeWidth=".8" />
              <rect x={x - 2.2} y="293" width="4.8" height="4" rx="1.5" fill={c3} />
            </g>
          ))}
          <ellipse cx="28" cy="276" rx="17" ry="9.5" fill={c1} stroke={edge} strokeWidth="1" />
          <path d="M32 274 Q44 270 41 250 L57 250 Q60 268 46 284 Z" fill={c1} stroke={edge} strokeWidth="1" strokeLinejoin="round" />
          <path d="M42 244 Q32 256 33 273" fill="none" stroke={c2} strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="52" cy="250" rx="11.5" ry="7.4" fill={c1} stroke={edge} strokeWidth="1" transform="rotate(26 52 250)" />
          <ellipse cx="59" cy="255.5" rx="5" ry="3.8" fill={shade(c1, 22)} transform="rotate(26 59 255.5)" />
          <circle cx="60" cy="256" r="1.1" fill={INK} />
          <path d="M45 243 L47 234 L52 244 Z" fill={c1} stroke={edge} strokeWidth=".8" />
          <Eye x={52} y={248.5} r={2} />
          <path d="M36 282 q4 4 0 8" fill="none" stroke={edge} strokeWidth=".8" opacity=".5" />
        </g>
      )
    }

    /* ---------- ลิง (คาดผมทองแบบซุนหงอคง ถือลูกท้อ) ---------- */
    case 'monkey': {
      const { c1, c2, c3 } = pal(d, ['#a16207', '#fde68a', '#fbbf24'])
      const edge = shade(c1, -28)
      return (
        <g>
          <path d="M44 290 Q64 292 58 272 Q56 262 48 266" fill="none" stroke={edge} strokeWidth="6" strokeLinecap="round" />
          <path d="M44 290 Q64 292 58 272 Q56 262 48 266" fill="none" stroke={c1} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="30" cy="282" rx="13" ry="11" fill={c1} stroke={edge} strokeWidth="1" />
          <ellipse cx="30" cy="285" rx="8" ry="7" fill={c2} />
          <circle cx="19" cy="293" r="4.6" fill={c1} stroke={edge} strokeWidth="1" />
          <circle cx="41" cy="293" r="4.6" fill={c1} stroke={edge} strokeWidth="1" />
          <circle cx="42" cy="281" r="6" fill="#fda4af" stroke="#e11d48" strokeWidth=".8" />
          <path d="M42 275 q3 -4 6 -2 q-2 4 -6 2 Z" fill="#65a30d" />
          <circle cx="17" cy="261" r="5.5" fill={c1} stroke={edge} strokeWidth="1" />
          <circle cx="43" cy="261" r="5.5" fill={c1} stroke={edge} strokeWidth="1" />
          <circle cx="17" cy="261" r="3" fill={c2} />
          <circle cx="43" cy="261" r="3" fill={c2} />
          <circle cx="30" cy="260" r="12.5" fill={c1} stroke={edge} strokeWidth="1" />
          <circle cx="25.5" cy="258" r="4.6" fill={c2} />
          <circle cx="34.5" cy="258" r="4.6" fill={c2} />
          <ellipse cx="30" cy="264" rx="8.5" ry="6.4" fill={c2} />
          <Eye x={26} y={259.5} r={1.8} />
          <Eye x={34} y={259.5} r={1.8} />
          <circle cx="28.4" cy="264" r=".9" fill={INK} />
          <circle cx="31.6" cy="264" r=".9" fill={INK} />
          <path d="M26.5 267.6 Q30 270.4 33.5 267.6" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M18 253.6 Q30 246 42 253.6" fill="none" stroke={c3} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="42" cy="253.6" r="2" fill={c3} stroke={shade(c3, -30)} strokeWidth=".8" />
        </g>
      )
    }

    /* ---------- วัวเขียว (ปีฉลู) ---------- */
    case 'ox': {
      const { c1, c2, c3 } = pal(d, ['#6b8fb5', '#fde68a', '#1f2937'])
      const edge = shade(c1, -28)
      return (
        <g>
          <path d="M46 290 Q58 292 55 277" fill="none" stroke={c1} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M55 279 q-3 4 -1 8 q3 -2 3 -8 Z" fill={c3} />
          <ellipse cx="30" cy="282" rx="18" ry="12.5" fill={c1} stroke={edge} strokeWidth="1" />
          {[19, 41].map((x) => (
            <ellipse key={x} cx={x} cy="294" rx="5.4" ry="3.6" fill={c1} stroke={edge} strokeWidth="1" />
          ))}
          <path d="M19 254 Q8 252 8 240 Q10 246 17 247 Z M41 254 Q52 252 52 240 Q50 246 43 247 Z" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" strokeLinejoin="round" />
          <ellipse cx="15" cy="259" rx="6.4" ry="3.4" fill={c1} stroke={edge} strokeWidth="1" transform="rotate(-24 15 259)" />
          <ellipse cx="45" cy="259" rx="6.4" ry="3.4" fill={c1} stroke={edge} strokeWidth="1" transform="rotate(24 45 259)" />
          <ellipse cx="30" cy="260" rx="13" ry="11.5" fill={c1} stroke={edge} strokeWidth="1" />
          <ellipse cx="30" cy="267" rx="9" ry="6" fill="#fecdd3" stroke="#fda4af" strokeWidth=".8" />
          <circle cx="27" cy="267" r="1.2" fill={INK} />
          <circle cx="33" cy="267" r="1.2" fill={INK} />
          <circle cx="30" cy="271.4" r="3.2" fill="none" stroke={GOLD} strokeWidth="1.6" />
          <Eye x={23.5} y={259} r={2} />
          <Eye x={36.5} y={259} r={2} />
          <path d="M26 252 Q30 249 34 252" fill="none" stroke={c3} strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    }

    /* ---------- ไก่ (ปีระกา) ---------- */
    case 'rooster': {
      const { c1, c2, c3 } = pal(d, ['#f97316', '#fde047', '#dc2626'])
      const edge = shade(c1, -28)
      return (
        <g>
          <path d="M18 280 Q2 276 4 258 Q12 268 20 270 Z" fill={c3} stroke={shade(c3, -25)} strokeWidth=".8" />
          <path d="M18 284 Q-2 288 0 268 Q10 280 20 278 Z" fill={c2} stroke={shade(c2, -30)} strokeWidth=".8" />
          <path d="M20 288 Q2 300 -2 280 Q8 292 22 284 Z" fill={c1} stroke={edge} strokeWidth=".8" />
          <ellipse cx="32" cy="280" rx="16" ry="14" fill={c1} stroke={edge} strokeWidth="1" />
          <path d="M26 280 Q40 270 50 284 Q40 292 26 286 Z" fill={c3} stroke={shade(c3, -25)} strokeWidth=".8" />
          <path d="M26 282 q6 -3 10 0 M28 286 q6 -3 10 0" fill="none" stroke={c2} strokeWidth="1.2" />
          <path d="M28 294 V298 M38 294 V298 M24 298 h8 M34 298 h8" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="42" cy="258" r="11" fill={c1} stroke={edge} strokeWidth="1" />
          <path d="M36 249 Q38 240 42 246 Q44 238 48 246 Q52 241 50 252 Z" fill={c3} stroke={shade(c3, -25)} strokeWidth=".8" strokeLinejoin="round" />
          <path d="M46 264 Q50 276 44 270 Z" fill={c3} />
          <path d="M51 257 L60 260 L51 263 Z" fill="#f59e0b" stroke="#b45309" strokeWidth=".6" />
          <Eye x={45} y={256} r={1.9} />
        </g>
      )
    }

    /* ---------- หมู (ปีกุน ถือก้อนทอง) ---------- */
    case 'pig': {
      const { c1, c2, c3 } = pal(d, ['#fbcfe8', '#f472b6', '#fbbf24'])
      const edge = shade(c1, -28)
      return (
        <g>
          <path d="M46 284 q8 -4 6 -9 q-4 -2 -5 3 q-1 4 4 3" fill="none" stroke={c2} strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="30" cy="281" rx="18" ry="13" fill={c1} stroke={edge} strokeWidth="1" />
          {[19, 41].map((x) => (
            <ellipse key={x} cx={x} cy="294" rx="5" ry="3.4" fill={c1} stroke={edge} strokeWidth="1" />
          ))}
          <path d="M18 250 L14 240 L26 248 Z M42 250 L46 240 L34 248 Z" fill={c1} stroke={edge} strokeWidth="1" strokeLinejoin="round" />
          <path d="M18 249 L16 244 L22 248 Z M42 249 L44 244 L38 248 Z" fill={c2} opacity=".6" />
          <circle cx="30" cy="259" r="14" fill={c1} stroke={edge} strokeWidth="1" />
          <ellipse cx="30" cy="264" rx="7.4" ry="5.4" fill={c2} stroke={shade(c2, -22)} strokeWidth=".8" />
          <circle cx="27.6" cy="264" r="1.4" fill={shade(c2, -45)} />
          <circle cx="32.4" cy="264" r="1.4" fill={shade(c2, -45)} />
          <Eye x={23} y={257} r={2} />
          <Eye x={37} y={257} r={2} />
          <ellipse cx="17" cy="262" rx="3.4" ry="2.4" fill={c2} opacity=".5" />
          <ellipse cx="43" cy="262" rx="3.4" ry="2.4" fill={c2} opacity=".5" />
          {/* ก้อนเงินก้อนทอง (หยวนเป่า) */}
          <path d="M44 290 Q50 282 58 290 Q58 296 44 296 Z" fill={c3} stroke={shade(c3, -30)} strokeWidth="1" />
          <path d="M48 288 Q51 284 54 288" fill="none" stroke={shade(c3, -30)} strokeWidth="1" />
        </g>
      )
    }

    /* ---------- ปลาคราฟกระโดดน้ำ ---------- */
    case 'koi': {
      const { c1, c2, c3 } = pal(d, ['#fb923c', '#ffffff', '#dc2626'])
      const edge = shade(c1, -28)
      return (
        <g transform="translate(8 0)">
          <g fill="none" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round">
            <ellipse cx="32" cy="296" rx="26" ry="4.6" />
            <ellipse cx="32" cy="296" rx="15" ry="2.6" />
          </g>
          <g transform="rotate(-48 30 272)">
            {/* หาง */}
            <path d="M6 272 Q-6 258 -4 252 Q4 258 10 266 Q4 272 10 278 Q4 286 -4 292 Q-6 286 6 272 Z" fill={c2} stroke={edge} strokeWidth="1" strokeLinejoin="round" opacity=".95" />
            {/* ลำตัว */}
            <path d="M8 272 Q22 258 42 262 Q54 266 54 272 Q54 278 42 282 Q22 286 8 272 Z" fill={c1} stroke={edge} strokeWidth="1.2" />
            <path d="M16 268 Q26 262 38 264 Q26 268 16 268 Z" fill={c2} opacity=".9" />
            <ellipse cx="30" cy="276" rx="7" ry="3.4" fill={c3} opacity=".95" />
            <path d="M18 274 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 M20 278 q3 -3 6 0 q3 -3 6 0" fill="none" stroke={shade(c1, -22)} strokeWidth=".9" />
            {/* ครีบ */}
            <path d="M24 262 Q30 252 38 262 Z" fill={c3} stroke={shade(c3, -25)} strokeWidth=".8" />
            <path d="M36 279 Q40 288 46 282 Z" fill={c2} stroke={edge} strokeWidth=".8" />
            {/* หัว */}
            <circle cx="49" cy="270" r="1.8" fill={INK} />
            <circle cx="49.6" cy="269.4" r=".6" fill="#fff" />
            <path d="M53 275 Q60 278 58 286 M53 274 Q62 272 64 278" fill="none" stroke={c3} strokeWidth="1.2" strokeLinecap="round" />
          </g>
          <g fill="#bae6fd" stroke="#38bdf8" strokeWidth=".6">
            <circle cx="12" cy="262" r="2.2" />
            <circle cx="6" cy="272" r="1.6" />
            <circle cx="54" cy="244" r="1.8" />
          </g>
        </g>
      )
    }

    /* ---------- เต่าดำพันงู (เสวียนอู่) ---------- */
    case 'turtle': {
      const { c1, c2, c3 } = pal(d, ['#334155', '#94a3b8', '#16a34a'])
      const edge = shade(c1, -30)
      return (
        <g transform="translate(0 44) scale(0.85)">
          {/* งูพันหาง */}
          <path d="M16 290 Q-2 284 6 270 Q14 262 8 254" fill="none" stroke={shade(c3, -25)} strokeWidth="6" strokeLinecap="round" />
          <path d="M16 290 Q-2 284 6 270 Q14 262 8 254" fill="none" stroke={c3} strokeWidth="4" strokeLinecap="round" />
          <path d="M16 290 Q-2 284 6 270 Q14 262 8 254" fill="none" stroke={shade(c3, 35)} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 4" />
          <ellipse cx="9" cy="252" rx="4.6" ry="3.6" fill={c3} stroke={shade(c3, -25)} strokeWidth=".8" />
          <circle cx="7.6" cy="251" r="1" fill={INK} />
          <path d="M13 252 l5 -2 M13 253 l5 1" stroke="#dc2626" strokeWidth="1" strokeLinecap="round" />
          {/* ขา */}
          {[16, 28, 40].map((x) => (
            <ellipse key={x} cx={x + 2} cy="294" rx="5" ry="3.4" fill={shade(c1, 12)} stroke={edge} strokeWidth="1" />
          ))}
          {/* หัว */}
          <ellipse cx="56" cy="280" rx="8.5" ry="7.4" fill="#94a3b8" stroke={edge} strokeWidth="1" />
          <Eye x={59} y={278} r={1.8} />
          <path d="M58 283.6 Q61 285 63 282.6" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
          {/* กระดอง */}
          <path d="M10 290 Q10 262 31 262 Q52 262 52 290 Z" fill={c1} stroke={edge} strokeWidth="1.4" />
          <g fill="none" stroke={c2} strokeWidth="1.3" strokeLinejoin="round" opacity=".9">
            <path d="M26 266 l12 0 l5 9 l-5 9 l-12 0 l-5 -9 Z" />
            <path d="M21 275 L12 280 M43 275 L52 280 M26 266 L22 262 M38 266 L42 262 M26 284 L22 290 M38 284 L42 290" />
          </g>
          <circle cx="32" cy="275" r="2.4" fill={c2} opacity=".9" />
        </g>
      )
    }

    /* ---------- จิ้งจอก (เลือกจำนวนหางได้) ---------- */
    case 'fox': {
      const { c1, c2, c3 } = pal(d, ['#f97316', '#ffffff', '#1f2937'])
      const edge = shade(c1, -28)
      const n = Math.max(1, Math.min(9, Number(d?.variant?.tails) || 1))
      const tails = Array.from({ length: n }, (_, i) => {
        const a = n === 1 ? -35 : -105 + (i * 140) / (n - 1)
        return a
      })
      return (
        <g>
          {tails.map((a, i) => (
            <g key={i} transform={`rotate(${a} 40 288)`}>
              <path d="M40 288 Q60 282 56 262 Q46 272 38 280 Z" fill={c1} stroke={edge} strokeWidth="1" strokeLinejoin="round" />
              <path d="M56 262 Q52 268 47 271 Q55 272 56 262 Z" fill={c2} />
            </g>
          ))}
          <ellipse cx="28" cy="282" rx="12.5" ry="12" fill={c1} stroke={edge} strokeWidth="1" />
          <ellipse cx="28" cy="285" rx="7" ry="8.4" fill={c2} />
          <ellipse cx="20" cy="294" rx="4.6" ry="3" fill={c3} />
          <ellipse cx="36" cy="294" rx="4.6" ry="3" fill={c3} />
          <path d="M16 252 L13 234 L25 246 Z M40 252 L43 234 L31 246 Z" fill={c1} stroke={edge} strokeWidth="1" strokeLinejoin="round" />
          <path d="M15.6 247 L14 238 L21 245 Z M40.4 247 L42 238 L35 245 Z" fill={c3} />
          <path d="M14 262 Q14 248 28 248 Q42 248 42 262 Q42 270 28 272 Q14 270 14 262 Z" fill={c1} stroke={edge} strokeWidth="1" />
          <path d="M14 263 Q20 262 28 270 Q36 262 42 263 Q42 270 28 273 Q14 270 14 263 Z" fill={c2} />
          <path d="M22 258 q2.4 -2 4.8 0 M30 258 q2.4 -2 4.8 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="28" cy="268" rx="2.2" ry="1.7" fill={INK} />
          <path d="M28 270 Q28 272 25.6 272.6 M28 270 Q28 272 30.4 272.6" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
          {n >= 9 && <circle cx="28" cy="251" r="1.8" fill="#ef4444" />}
        </g>
      )
    }
    default:
      return null
  }
}

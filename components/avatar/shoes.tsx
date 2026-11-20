'use client'

import { shade, type ItemDesign } from '@/lib/avatar'

// =====================================================================
// 👟 รองเท้าทรงใหม่ (วาดเป็นข้างซ้าย แล้ว mirror ให้ข้างขวา)
//   straw (รองเท้าฟาง เห็นเท้า) · wooden (รองเท้าไม้ฟันคู่) · platform (รองเท้าฐานสูงราชสำนัก 花盆底)
//   riding (บู๊ตขี่ม้ายาวขอบขน) · tiger (รองเท้าหัวเสือ 虎头鞋)
// =====================================================================
export const NEW_SHOE_SHAPES = ['straw', 'wooden', 'platform', 'riding', 'tiger']
export const isNewShoe = (shape: string) => NEW_SHOE_SHAPES.includes(shape)

const pal = (d: ItemDesign | undefined, fb: [string, string, string]) => ({
  c1: d?.colors?.[0] || fb[0],
  c2: d?.colors?.[1] || fb[1],
  c3: d?.colors?.[2] || fb[2],
})

export function NewShoe({ shape, d, skin }: { shape: string; d?: ItemDesign; skin: string }) {
  switch (shape) {
    /* รองเท้าฟางสาน: เห็นเท้าเปล่า มีสายเชือกไขว้ */
    case 'straw': {
      const { c1, c2, c3 } = pal(d, ['#92400e', '#d6b76a', '#a16207'])
      return (
        <g>
          <path d="M74 264 H99 L100 288 H67 Q62 284 68 278 L74 270 Z" fill={skin} stroke={shade(skin, -22)} strokeWidth="1" />
          <path d="M64 290 H101 V296 Q101 298 98 298 H68 Q62 298 64 292 Z" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <path d="M68 294 H98" stroke={c3} strokeWidth="1.2" strokeDasharray="2 2" />
          {/* สายเชือก */}
          <path d="M74 272 L98 286 M98 272 L74 286" stroke={c1} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="86" cy="279" r="2.6" fill={c1} stroke={shade(c1, -30)} strokeWidth=".8" />
          {/* นิ้วเท้า */}
          <path d="M68 284 q2 3 5 1 M72 286 q2 3 5 1" fill="none" stroke={shade(skin, -30)} strokeWidth=".9" strokeLinecap="round" />
        </g>
      )
    }

    /* รองเท้าไม้ฟันคู่ */
    case 'wooden': {
      const { c1, c2, c3 } = pal(d, ['#78350f', '#dc2626', '#d6b76a'])
      return (
        <g>
          <path d="M74 266 H99 L100 284 H68 Q64 280 70 276 L74 270 Z" fill={skin} stroke={shade(skin, -22)} strokeWidth="1" />
          <rect x="62" y="283" width="41" height="7" rx="3" fill={c1} stroke={shade(c1, -30)} strokeWidth="1" />
          <path d="M66 286 H99" stroke={c3} strokeWidth="1" opacity=".6" />
          <rect x="69" y="289" width="7" height="8" rx="1.5" fill={shade(c1, -12)} stroke={shade(c1, -35)} strokeWidth="1" />
          <rect x="91" y="289" width="7" height="8" rx="1.5" fill={shade(c1, -12)} stroke={shade(c1, -35)} strokeWidth="1" />
          {/* สายผ้าคล้องหลังเท้า */}
          <path d="M72 284 Q84 266 98 284" fill="none" stroke={c2} strokeWidth="4.4" strokeLinecap="round" />
          <path d="M72 284 Q84 266 98 284" fill="none" stroke={shade(c2, 30)} strokeWidth="1" strokeDasharray="2 3" />
        </g>
      )
    }

    /* รองเท้าฐานสูงแบบราชสำนัก (ฮวาเผินตี่) */
    case 'platform': {
      const { c1, c2, c3 } = pal(d, ['#be185d', '#f8fafc', '#fbbf24'])
      return (
        <g>
          <path d="M66 268 H100 L101 284 H64 Q60 278 66 268 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.1" />
          <path d="M74 289 H94 L92 298 H76 Z" fill={c2} stroke={shade(c2, -32)} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M63 284 H102 V289 H63 Z" fill={c2} stroke={shade(c2, -32)} strokeWidth="1" />
          {/* ปักดอกไม้ */}
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={82 + 3.6 * Math.cos((a * Math.PI) / 180)} cy={276 + 3.6 * Math.sin((a * Math.PI) / 180)} r="2.3" fill={c3} />
          ))}
          <circle cx="82" cy="276" r="1.6" fill="#fff" />
          <path d="M92 270 q4 4 6 12" fill="none" stroke={c3} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )
    }

    /* บู๊ตขี่ม้ายาว ขอบขนสัตว์ */
    case 'riding': {
      const { c1, c2, c3 } = pal(d, ['#78350f', '#f1f5f9', '#fbbf24'])
      return (
        <g>
          <path d="M72 228 H101 L101 288 H64 Q60 284 66 278 L72 270 Z" fill={c1} stroke={shade(c1, -32)} strokeWidth="1.2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={i} cx={74 + i * 5.2} cy="229" r="4.6" fill={c2} stroke={shade(c2, -22)} strokeWidth=".8" />
          ))}
          <path d="M72 252 H101 M72 262 H101" stroke={c3} strokeWidth="2" />
          <rect x="82" y="249" width="7" height="16" rx="1.5" fill={c3} stroke={shade(c3, -30)} strokeWidth=".8" />
          <path d="M63 286 H102 V294 Q102 298 98 298 H68 Q61 298 63 290 Z" fill={shade(c1, -28)} stroke={shade(c1, -45)} strokeWidth="1" />
          <path d="M76 236 Q78 270 76 286" fill="none" stroke={shade(c1, 25)} strokeWidth="1.2" opacity=".5" />
        </g>
      )
    }

    /* รองเท้าหัวเสือ (สำหรับเด็ก) — หน้าเสือที่ปลายเท้า */
    case 'tiger': {
      const { c1, c2, c3 } = pal(d, ['#f59e0b', '#fff7ed', '#1f2937'])
      return (
        <g>
          <path d="M74 266 H100 L101 288 H70 L74 270 Z" fill={c1} stroke={shade(c1, -28)} strokeWidth="1.1" />
          <path d="M80 270 q3 4 0 8 M88 268 q3 4 0 8 M95 270 q3 4 0 8" fill="none" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M62 290 H102 V295 Q102 298 98 298 H66 Q61 298 62 292 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1" />
          {/* หน้าเสือ */}
          <circle cx="58" cy="266" r="4.6" fill={c1} stroke={shade(c1, -28)} strokeWidth="1" />
          <circle cx="72" cy="266" r="4.6" fill={c1} stroke={shade(c1, -28)} strokeWidth="1" />
          <circle cx="58" cy="266" r="2.2" fill="#fda4af" />
          <circle cx="72" cy="266" r="2.2" fill="#fda4af" />
          <circle cx="65" cy="280" r="12.4" fill={c1} stroke={shade(c1, -28)} strokeWidth="1.2" />
          <ellipse cx="65" cy="284" rx="8" ry="6" fill={c2} />
          <path d="M60 271 h10 M65 271 v6 M61 274 h8" fill="none" stroke={c3} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="60.4" cy="279" r="2" fill="#fff" stroke={c3} strokeWidth=".8" />
          <circle cx="69.6" cy="279" r="2" fill="#fff" stroke={c3} strokeWidth=".8" />
          <circle cx="60.6" cy="279.2" r="1" fill={c3} />
          <circle cx="69.4" cy="279.2" r="1" fill={c3} />
          <path d="M62.6 284 h4.8 l-2.4 3 Z" fill="#be123c" />
          <path d="M60 289 Q65 292 70 289" fill="none" stroke={c3} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )
    }
    default:
      return null
  }
}

'use client'

import type React from 'react'
import { shade } from '@/lib/avatar'

// =====================================================================
// 👘 ชุดตามอาชีพ + ลายปัก
//   ชุดใหม่ 10 แบบ: eunuch (ขันที) · jinyiwei (องครักษ์จิ่นอีเว่ย) · judge (ผู้พิพากษา) · physician (หมอยา)
//                    merchant (พ่อค้า) · dancer (นางรำ) · assassin (นักฆ่า) · beggar (ขอทานเก้าชั้น)
//                    farmer (ชาวนา) · swordswoman (นักดาบหญิง)
//   ลายปัก (variant.pattern): none · cloud · wave · bamboo · plum · coin · dragon — ใส่กับชุดไหนก็ได้
//   แขนเสื้อชนิดใหม่: tight · bare · ragged · water
// =====================================================================
export const OUTFIT_PATTERNS = ['none', 'cloud', 'wave', 'bamboo', 'plum', 'coin', 'dragon'] as const

type Zone = 'skirt' | 'chest' | 'none'

/** ชุดเดิม + ชุดใหม่: ลายปักไปวางตรงบริเวณไหนของชุด */
export const OUTFIT_ZONE: Record<string, Zone> = {
  imperial: 'skirt', empress: 'skirt', concubine: 'skirt', wuxia: 'skirt', scholar: 'skirt', taoist: 'skirt',
  official: 'skirt', monk: 'skirt', general: 'none', commoner: 'chest',
  eunuch: 'skirt', jinyiwei: 'chest', judge: 'skirt', physician: 'skirt', merchant: 'skirt',
  dancer: 'skirt', assassin: 'chest', beggar: 'none', farmer: 'none', swordswoman: 'skirt',
}

interface Cols {
  c1: string
  c2: string
  c3: string
  neck: string
  edge: string
}

export interface NewOutfit {
  label: string
  defaults: [string, string, string]
  sleeve: 'wide' | 'flow' | 'tight' | 'bare' | 'ragged' | 'water'
  render: (c: Cols) => React.ReactElement
}

const Lapel = ({ c, w = 4, y2 = 196 }: { c: string; w?: number; y2?: number }) => (
  <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d="M84 143 L102 171" />
    <path d={`M116 143 Q108 162 86 ${y2}`} />
  </g>
)

export const NEW_OUTFITS: Record<string, NewOutfit> = {
  /* ---------- ขันที: เสื้อคลุมยาวสีเขียวหยก คอตั้งขาว สายคาดเฉียงอก ---------- */
  eunuch: {
    label: 'ชุดขันที',
    defaults: ['#0f766e', '#e2e8f0', '#fbbf24'],
    sleeve: 'wide',
    render: ({ c1, c2, c3, neck, edge }) => (
      <g>
        <path d="M73 147 Q100 139 127 147 L143 267 Q100 277 57 267 Z" fill={c1} stroke={edge} strokeWidth="1.4" />
        <path d="M88 146 Q100 160 112 146 Z" fill={neck} />
        <path d="M82 143 Q100 162 118 143" fill="none" stroke={c2} strokeWidth="7" strokeLinecap="round" />
        <path d="M80 150 Q100 170 120 150" fill="none" stroke={c3} strokeWidth="1.4" />
        {/* ลายริ้วตั้ง */}
        <path d="M84 176 V262 M92 178 V264 M108 178 V264 M116 176 V262" stroke={shade(c1, -16)} strokeWidth="1.1" opacity=".55" />
        {/* สายคาดเฉียง + ปมใหญ่ */}
        <path d="M78 150 L124 214" stroke={c3} strokeWidth="5.5" strokeLinecap="round" />
        <path d="M78 150 L124 214" stroke={shade(c3, -30)} strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 5" />
        <circle cx="106" cy="182" r="5.4" fill={c2} stroke={shade(c3, -30)} strokeWidth="1.2" />
        <rect x="70" y="204" width="60" height="8" rx="3.5" fill={c2} stroke={shade(c2, -25)} strokeWidth="1" />
        <path d="M118 212 Q122 230 116 246" fill="none" stroke={c3} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M57 262 Q100 276 143 262 L143 268 Q100 282 57 268 Z" fill={c2} />
      </g>
    ),
  },

  /* ---------- จิ่นอีเว่ย: ชุดดำสั้นถึงเข่า ปักปลาบิน ชายบาน ---------- */
  jinyiwei: {
    label: 'ชุดองครักษ์จิ่นอีเว่ย',
    defaults: ['#111827', '#b91c1c', '#fbbf24'],
    sleeve: 'tight',
    render: ({ c1, c2, c3, neck, edge }) => (
      <g>
        <path d="M70 148 Q100 138 130 148 L140 240 Q100 252 60 240 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1.2" />
        <path d="M86 145 L102 171 L115 145 Z" fill={neck} />
        <Lapel c={c2} w={4.4} y2={198} />
        {/* ปลาบิน (เฟยอวี๋) */}
        <path d="M84 170 Q96 158 112 164 Q122 169 118 178 Q106 186 92 181 Q86 178 84 170 Z" fill={c2} stroke={c3} strokeWidth="1.4" />
        <path d="M84 170 l-8 -5 l1 11 Z" fill={c2} stroke={c3} strokeWidth="1" strokeLinejoin="round" />
        <path d="M96 160 q4 -8 10 -3 M92 181 q4 5 10 2" fill="none" stroke={c3} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="110" cy="168" r="1.7" fill={c3} />
        <path d="M92 172 q4 3 8 0 q4 3 8 0" fill="none" stroke={c3} strokeWidth=".9" />
        {/* สายคาดเอวหนัง + หัวเข็มขัดทอง + ที่แขวนกระบี่ */}
        <rect x="64" y="200" width="72" height="10" rx="3" fill="#1f2937" stroke={c3} strokeWidth="1.2" />
        <rect x="93" y="197" width="14" height="16" rx="3" fill={c3} stroke={shade(c3, -30)} strokeWidth="1" />
        <circle cx="100" cy="205" r="3" fill={c2} />
        <path d="M122 210 V224" stroke={c3} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M58 236 Q100 250 142 236 L141 242 Q100 256 59 242 Z" fill={c2} />
      </g>
    ),
  },

  /* ---------- ผู้พิพากษา (สไตล์เปาบุ้นจิ้น): เสื้อคลุมกรมท่า คอซ้อนขาวกว้าง ---------- */
  judge: {
    label: 'ชุดผู้พิพากษา',
    defaults: ['#1e293b', '#f8fafc', '#facc15'],
    sleeve: 'wide',
    render: ({ c1, c2, c3, neck, edge }) => (
      <g>
        <path d="M70 147 Q100 138 130 147 L150 268 Q100 281 50 268 Z" fill={c1} stroke={edge} strokeWidth="1.4" />
        <path d="M86 146 L100 176 L114 146 Z" fill={neck} />
        <path d="M80 143 L100 188 M120 143 L100 188" fill="none" stroke={c2} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M80 143 L100 188 M120 143 L100 188" fill="none" stroke={c1} strokeWidth="1.2" strokeLinecap="round" />
        {/* ตราตุลาการ */}
        <circle cx="100" cy="208" r="12" fill={c3} stroke={shade(c3, -35)} strokeWidth="1.6" />
        <path d="M100 199 V217 M92 202 H108 M94 217 H106" stroke={shade(c3, -45)} strokeWidth="2" strokeLinecap="round" />
        <rect x="69" y="226" width="62" height="8" rx="3.5" fill={shade(c1, 22)} stroke={c3} strokeWidth="1" />
        <path d="M60 252 Q100 266 140 252" fill="none" stroke={c3} strokeWidth="1.6" opacity=".8" />
        <path d="M51 262 Q100 277 149 262 L149 269 Q100 284 51 269 Z" fill="#b91c1c" />
      </g>
    ),
  },

  /* ---------- หมอยา: เสื้อเขียวใบไม้ ผ้ากันเปื้อนขาว น้ำเต้ายา ---------- */
  physician: {
    label: 'ชุดหมอยา',
    defaults: ['#4d7c0f', '#f8fafc', '#f97316'],
    sleeve: 'flow',
    render: ({ c1, c2, c3, neck, edge }) => (
      <g>
        <path d="M72 147 Q100 138 128 147 L146 264 Q100 276 54 264 Z" fill={c1} stroke={edge} strokeWidth="1.3" />
        <path d="M86 145 L102 172 L114 145 Z" fill={neck} />
        <Lapel c={c2} w={4.6} y2={200} />
        {/* ผ้ากันเปื้อนขาวกลางตัว + ลายใบสมุนไพร */}
        <path d="M84 196 H116 L121 268 Q100 273 79 268 Z" fill={c2} stroke={shade(c2, -22)} strokeWidth="1" />
        <path d="M100 214 V252 M100 224 q-8 -2 -10 -8 M100 224 q8 -2 10 -8 M100 238 q-8 -2 -10 -8 M100 238 q8 -2 10 -8" fill="none" stroke={c1} strokeWidth="1.6" strokeLinecap="round" />
        <rect x="70" y="194" width="60" height="9" rx="3.5" fill={shade(c1, -22)} stroke={shade(c1, -40)} strokeWidth="1" />
        {/* น้ำเต้ายา */}
        <path d="M122 203 Q124 210 124 214" stroke="#92400e" strokeWidth="1.8" fill="none" />
        <circle cx="124" cy="218" r="5.4" fill={c3} stroke={shade(c3, -30)} strokeWidth="1" />
        <circle cx="124" cy="229" r="7.6" fill={c3} stroke={shade(c3, -30)} strokeWidth="1" />
        <path d="M121 226 q3 -3 6 0" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".6" />
      </g>
    ),
  },

  /* ---------- พ่อค้า: เสื้อไหมทอง คอกลมกระดุมปม ถุงเงิน ---------- */
  merchant: {
    label: 'ชุดพ่อค้า',
    defaults: ['#b45309', '#dc2626', '#fbbf24'],
    sleeve: 'wide',
    render: ({ c1, c2, c3, neck, edge }) => (
      <g>
        <path d="M68 148 Q100 138 132 148 L152 266 Q100 280 48 266 Z" fill={c1} stroke={edge} strokeWidth="1.4" />
        <path d="M86 146 Q100 164 114 146 Z" fill={neck} />
        <path d="M80 144 Q100 170 120 144" fill="none" stroke={c3} strokeWidth="5" strokeLinecap="round" />
        {/* ลายเหรียญทั้งตัว */}
        <g fill="none" stroke={shade(c1, 30)} strokeWidth="1" opacity=".65">
          {[[80, 176], [120, 176], [80, 232], [120, 232], [100, 246], [76, 254], [124, 254]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4.6" />
              <rect x={x - 1.6} y={y - 1.6} width="3.2" height="3.2" />
            </g>
          ))}
        </g>
        {/* กระดุมปม */}
        {[158, 170, 182].map((y) => (
          <g key={y}>
            <circle cx="100" cy={y} r="2.8" fill={c3} stroke={shade(c3, -30)} strokeWidth=".8" />
            <path d={`M96 ${y} q-5 -4 -7 0 q2 4 7 0 M104 ${y} q5 -4 7 0 q-2 4 -7 0`} fill="none" stroke={c3} strokeWidth="1.2" />
          </g>
        ))}
        <rect x="66" y="198" width="68" height="11" rx="4" fill={c2} stroke={shade(c2, -28)} strokeWidth="1.2" />
        {/* ถุงเงิน */}
        <path d="M76 209 Q64 214 66 226 Q74 232 84 226 Q86 214 76 209 Z" fill={c3} stroke={shade(c3, -30)} strokeWidth="1.2" />
        <path d="M71 211 H81" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="75" cy="221" r="3" fill="none" stroke={shade(c3, -35)} strokeWidth="1.2" />
        <path d="M50 262 Q100 278 150 262 L150 269 Q100 285 50 269 Z" fill={c2} />
      </g>
    ),
  },

  /* ---------- นางรำ: เสื้อสั้น + กระโปรงหลายชั้น แขนน้ำ ---------- */
  dancer: {
    label: 'ชุดนางรำ',
    defaults: ['#f472b6', '#fde68a', '#a78bfa'],
    sleeve: 'water',
    render: ({ c1, c2, c3, neck, edge }) => (
      <g>
        <path d="M68 196 Q100 204 132 196 L156 270 Q100 286 44 270 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1.2" />
        <path d="M62 236 Q100 248 138 236 L148 262 Q100 276 52 262 Z" fill={c3} opacity=".55" />
        <path d="M54 258 Q64 266 74 258 Q84 268 94 260 Q104 270 114 260 Q124 268 134 258 Q142 264 148 258 L152 270 Q100 286 48 270 Z" fill={c1} stroke={shade(c1, -25)} strokeWidth="1" />
        <path d="M72 147 Q100 138 128 147 L130 198 Q100 206 70 198 Z" fill={c1} stroke={edge} strokeWidth="1.3" />
        <path d="M86 145 L101 170 L114 145 Z" fill={neck} />
        <path d="M84 143 L102 174 M116 143 Q108 158 88 190" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M68 196 Q100 206 132 196 L132 206 Q100 216 68 206 Z" fill={c3} stroke={shade(c3, -28)} strokeWidth="1" />
        <path d="M100 208 Q86 224 70 222 M100 208 Q114 224 130 222" fill="none" stroke={c3} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M100 210 Q108 236 128 250" fill="none" stroke={c1} strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  },

  /* ---------- นักฆ่า: ชุดดำรัดรูป ผ้าพันคอ สายไขว้ ---------- */
  assassin: {
    label: 'ชุดนักฆ่า',
    defaults: ['#111827', '#b91c1c', '#7f1d1d'],
    sleeve: 'tight',
    render: ({ c1, c2, c3, edge }) => (
      <g>
        <path d="M72 149 Q72 143 82 143 H118 Q128 143 128 149 L129 216 Q100 225 71 216 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1.1" />
        {/* ผ้าพันคอสูง */}
        <path d="M80 138 Q100 160 120 138 L121 152 Q100 172 79 152 Z" fill={c3} stroke={shade(c3, -30)} strokeWidth="1" />
        <path d="M86 148 Q100 160 114 148 M88 154 Q100 166 112 154" fill="none" stroke={shade(c3, 25)} strokeWidth="1" />
        {/* สายไขว้ */}
        <path d="M76 154 L124 212 M124 154 L76 212" stroke={c2} strokeWidth="4.2" strokeLinecap="round" />
        <circle cx="100" cy="183" r="5" fill={shade(c2, -10)} stroke="#fbbf24" strokeWidth="1.4" />
        <rect x="70" y="204" width="60" height="9" rx="3" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
        {[78, 90, 110, 122].map((x) => (
          <rect key={x} x={x - 3} y="206" width="6" height="5" rx="1.5" fill="#1f2937" />
        ))}
        <path d="M100 213 L96 226 M100 213 L104 224" stroke={c2} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    ),
  },

  /* ---------- ขอทานเก้าชั้น: เสื้อปะผ้า ชายขาด เชือกคาดเอว ---------- */
  beggar: {
    label: 'ชุดขอทานเก้าชั้น',
    defaults: ['#a8a29e', '#3b82f6', '#dc2626'],
    sleeve: 'ragged',
    render: ({ c1, c2, c3, neck }) => (
      <g>
        <path d="M71 147 Q100 138 129 147 L147 256 L139 262 L133 254 L125 264 L117 255 L108 266 L100 256 L92 266 L83 255 L75 264 L67 254 L61 262 L53 256 Z" fill={c1} stroke={shade(c1, -28)} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M86 146 L101 172 L114 146 Z" fill={neck} />
        <Lapel c={shade(c1, -24)} w={4} y2={200} />
        {/* แผ่นปะหลากสี + รอยเย็บ */}
        {[
          { x: 76, y: 172, w: 14, h: 14, c: c2 },
          { x: 108, y: 214, w: 16, h: 13, c: c3 },
          { x: 70, y: 232, w: 15, h: 15, c: '#65a30d' },
          { x: 94, y: 236, w: 13, h: 12, c: '#fbbf24' },
        ].map((p, i) => (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={p.c} stroke={shade(p.c, -30)} strokeWidth=".9" />
            <rect x={p.x + 1.8} y={p.y + 1.8} width={p.w - 3.6} height={p.h - 3.6} fill="none" stroke="#fff" strokeWidth=".7" strokeDasharray="1.6 1.6" opacity=".8" />
          </g>
        ))}
        {/* เชือกคาดเอว */}
        <path d="M68 202 Q100 212 132 202" fill="none" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
        <path d="M68 202 Q100 212 132 202" fill="none" stroke="#d6b76a" strokeWidth="1.2" strokeDasharray="2 3" />
        <path d="M100 210 L94 228 M100 210 L106 230" stroke="#92400e" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    ),
  },

  /* ---------- ชาวนา: เสื้อกั๊กขาว + เสื้อคลุมฟาง (ซัวอี) ---------- */
  farmer: {
    label: 'ชุดชาวนา',
    defaults: ['#a16207', '#e7e5e4', '#78350f'],
    sleeve: 'bare',
    render: ({ c1, c2, c3, neck }) => (
      <g>
        <path d="M72 149 Q72 143 82 143 H118 Q128 143 128 149 L130 206 Q100 215 70 206 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1.2" />
        <path d="M86 144 L102 170 L114 144 Z" fill={neck} />
        <Lapel c={shade(c2, -26)} w={3.4} y2={198} />
        {/* เสื้อคลุมฟางคลุมไหล่ ชายเป็นชั้นๆ */}
        <path d="M60 154 Q100 134 140 154 L146 196 L138 192 L134 204 L126 196 L120 210 L112 198 L106 212 L100 200 L94 212 L88 198 L80 210 L74 196 L66 204 L62 192 L54 196 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.3" strokeLinejoin="round" />
        <g stroke={shade(c1, -38)} strokeWidth="1.2" strokeLinecap="round" opacity=".8">
          <path d="M70 160 L66 190 M80 156 L76 196 M90 153 L88 198 M100 152 V200 M110 153 L112 198 M120 156 L124 196 M130 160 L134 190" />
        </g>
        <g stroke={shade(c1, 32)} strokeWidth="1" strokeLinecap="round" opacity=".8">
          <path d="M74 162 L70 186 M95 154 L94 192 M105 154 L106 192 M126 162 L130 186" />
        </g>
        <path d="M70 206 Q100 215 130 206" fill="none" stroke={c3} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M100 212 L96 228 M100 212 L105 226" stroke={c3} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    ),
  },

  /* ---------- นักดาบหญิง: เสื้อสั้นไขว้ กระโปรงผ่าหน้า ริบบิ้นปลิว ---------- */
  swordswoman: {
    label: 'ชุดนักดาบหญิง',
    defaults: ['#0e7490', '#e0f2fe', '#f97316'],
    sleeve: 'flow',
    render: ({ c1, c2, c3, neck, edge }) => (
      <g>
        <path d="M68 202 H132 L152 268 Q100 281 48 268 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1.2" />
        <path d="M100 210 L88 272 L112 272 Z" fill={shade(c2, -30)} opacity=".7" />
        <path d="M100 210 L88 272 M100 210 L112 272" stroke={shade(c2, -40)} strokeWidth="1.1" fill="none" />
        <path d="M72 147 Q100 138 128 147 L131 206 Q100 214 69 206 Z" fill={c1} stroke={edge} strokeWidth="1.3" />
        <path d="M86 145 L102 172 L114 145 Z" fill={neck} />
        <Lapel c={c2} w={4.6} y2={198} />
        <path d="M69 196 Q100 206 131 196 L131 208 Q100 218 69 208 Z" fill={c3} stroke={shade(c3, -28)} strokeWidth="1" />
        <circle cx="100" cy="204" r="4.4" fill={c2} stroke={shade(c3, -30)} strokeWidth="1" />
        {/* ริบบิ้นปลิว */}
        <path d="M120 208 Q146 214 150 238 Q142 224 120 216 Z" fill={c3} opacity=".95" />
        <path d="M120 212 Q140 226 138 250 Q134 232 118 218 Z" fill={shade(c3, -14)} opacity=".9" />
        <path d="M50 262 Q100 277 150 262 L150 269 Q100 284 50 269 Z" fill={c1} />
      </g>
    ),
  },
}

/* ============================ แขนเสื้อชนิดใหม่ (วาดเป็นแขนซ้าย) ============================ */
export function ExtraSleeve({
  kind, c1, c2, c3, edge,
}: { kind: string; c1: string; c2: string; c3: string; edge: string }) {
  if (kind === 'tight')
    return (
      <g>
        <path d="M53 149 L73 149 L72 206 L53 206 Z" fill={c1} stroke={edge} strokeWidth="1" />
        <rect x="51" y="190" width="24" height="16" rx="4" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
        <path d="M52 195 H74 M52 201 H74" stroke={c3} strokeWidth="1.4" />
        <rect x="53" y="150" width="20" height="5" rx="2" fill={c3} opacity=".85" />
      </g>
    )
  if (kind === 'bare')
    return (
      <g>
        <path d="M52 149 L74 149 L73 176 L52 176 Z" fill={c1} stroke={edge} strokeWidth="1" />
        <rect x="50.5" y="169" width="25" height="8" rx="3.4" fill={c2} stroke={shade(c2, -28)} strokeWidth="1" />
        <rect x="54" y="203" width="18" height="5" rx="2.4" fill={c3} />
      </g>
    )
  if (kind === 'ragged')
    return (
      <g>
        <path d="M52 149 L74 149 L74 196 Q75 212 78 226 L72 222 L68 232 L62 224 L56 234 L50 224 L44 230 L47 214 Q51 206 52 196 Z" fill={c1} stroke={edge} strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="56" y="170" width="13" height="12" fill={c2} stroke={shade(c2, -30)} strokeWidth=".9" />
        <rect x="58" y="172" width="9" height="8" fill="none" stroke="#fff" strokeWidth=".7" strokeDasharray="1.5 1.5" opacity=".8" />
      </g>
    )
  if (kind === 'water')
    return (
      <g>
        {/* แขนน้ำ: แขนเสื้อยาวพลิ้วลงถึงพื้น */}
        <path d="M52 149 L74 149 L74 196 Q76 218 72 232 Q60 252 38 268 Q46 240 51 214 Z" fill={c1} stroke={edge} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M50 226 Q30 252 18 292 Q40 274 66 238 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1" opacity=".92" />
        <path d="M60 240 Q42 262 30 286" fill="none" stroke={c3} strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
      </g>
    )
  return null
}

/* ============================ ลายปัก ============================ */
const MOTIFS: Record<string, (c: string) => React.ReactElement> = {
  cloud: (c) => (
    <g fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round">
      <path d="M-6 3 Q-7 -3 -1 -4 Q4 -7 7 -2 Q10 3 5 4 Z" />
      <path d="M-1 -1 Q1 -3 3 -1 Q3 1 0 1" />
    </g>
  ),
  wave: (c) => (
    <g fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round">
      <path d="M-7 -1 q3.5 -6 7 0 t7 0" />
      <path d="M-7 4 q3.5 -6 7 0 t7 0" />
    </g>
  ),
  bamboo: (c) => (
    <g fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round">
      <path d="M0 -8 V8 M-2 -2 H2 M-2 4 H2" />
      <path d="M0 -3 q5 -1 7 -5 M0 2 q-5 -1 -7 -5" />
    </g>
  ),
  plum: (c) => (
    <g fill={c} stroke="none">
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={4.2 * Math.cos((a * Math.PI) / 180)} cy={4.2 * Math.sin((a * Math.PI) / 180)} r="2.8" />
      ))}
      <circle r="1.6" fill="#fff" opacity=".8" />
    </g>
  ),
  coin: (c) => (
    <g fill="none" stroke={c} strokeWidth="1.4">
      <circle r="6" />
      <rect x="-2" y="-2" width="4" height="4" />
    </g>
  ),
  dragon: (c) => (
    <g fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round">
      <path d="M-7 4 Q-6 -4 0 -2 Q6 0 3 5 Q0 8 -3 5" />
      <circle cx="-7" cy="5" r="1.4" fill={c} />
      <path d="M-8 3 l-2 -2 M-8 5 l-3 1" />
    </g>
  ),
}

export function PatternOverlay({ kind, zone, color }: { kind: string; zone: Zone; color: string }) {
  const motif = MOTIFS[kind]
  if (!motif || zone === 'none') return null
  const spots: [number, number][] =
    zone === 'skirt' ? [[80, 238], [120, 240], [100, 254], [76, 256], [124, 257]] : [[82, 176], [118, 176], [100, 190]]
  return (
    <g opacity=".9">
      {spots.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {motif(color)}
        </g>
      ))}
    </g>
  )
}

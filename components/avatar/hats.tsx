'use client'

import { shade, type ItemDesign } from '@/lib/avatar'

// =====================================================================
// 🎩 หมวก/เครื่องประดับศีรษะตามอาชีพ (เข้าชุดกับชุดเฟส 3)
//   physician (หมวกหมอยา) · merchant (หมวกเปลือกแตงโม 瓜皮帽) · guard (หมวกองครักษ์) · princess (มงกุฎองค์หญิง)
//   eunuch (หมวกทรงสูงขันที) · judge (หมวกตุลาการพระจันทร์เสี้ยว) · beggar (หมวกฟางขาด)
//   farmer (หมวกฟางปีกกว้าง) · dancer (มงกุฎดอกไม้ริบบิ้น) · bandana (ผ้าโพกหัวนักฆ่า)
// =====================================================================
export const NEW_HAT_SHAPES = ['physician', 'merchant', 'guard', 'princess', 'eunuch', 'judge', 'beggar', 'farmer', 'dancer', 'bandana']
export const isNewHat = (shape: string) => NEW_HAT_SHAPES.includes(shape)

const GOLD = '#fbbf24'
const JADE = '#34d399'

const pal = (d: ItemDesign | undefined, fb: [string, string, string]) => ({
  c1: d?.colors?.[0] || fb[0],
  c2: d?.colors?.[1] || fb[1],
  c3: d?.colors?.[2] || fb[2],
})

export function NewHat({ shape, d }: { shape: string; d?: ItemDesign }) {
  switch (shape) {
    /* หมวกหมอยา: หมวกผ้านิ่ม ปักสมุนไพร */
    case 'physician': {
      const { c1, c2, c3 } = pal(d, ['#4d7c0f', '#f8fafc', '#f97316'])
      return (
        <g>
          <path d="M60 72 Q58 38 100 36 Q142 38 140 72 Q100 64 60 72 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.4" />
          <path d="M60 70 Q100 62 140 70 L140 79 Q100 71 60 79 Z" fill={c2} stroke={shade(c2, -25)} strokeWidth="1" />
          <path d="M100 58 V44 M100 54 q-8 -2 -9 -9 M100 54 q8 -2 9 -9 M100 47 q-5 -3 -4 -9 M100 47 q5 -3 4 -9" fill="none" stroke={c3} strokeWidth="2" strokeLinecap="round" />
          <path d="M62 78 Q54 98 58 116 M138 78 Q146 98 142 116" fill="none" stroke={c2} strokeWidth="4" strokeLinecap="round" />
        </g>
      )
    }

    /* หมวกพ่อค้า (กวาผีเมา): โดมหกซีก ปุ่มแดง */
    case 'merchant': {
      const { c1, c2, c3 } = pal(d, ['#111827', '#fbbf24', '#dc2626'])
      return (
        <g>
          <path d="M62 74 Q58 40 100 36 Q142 40 138 74 Q100 66 62 74 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1.2" />
          <path d="M100 36 Q84 50 82 72 M100 36 Q92 52 91 70 M100 36 Q108 52 109 70 M100 36 Q116 50 118 72" fill="none" stroke={shade(c1, 45)} strokeWidth="1" opacity=".7" />
          <path d="M62 72 Q100 64 138 72 L138 79 Q100 71 62 79 Z" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <circle cx="100" cy="35" r="6.4" fill={c3} stroke={shade(c3, -30)} strokeWidth="1.2" />
          <circle cx="98" cy="33" r="2" fill="#fff" opacity=".6" />
          <path d="M100 41 V44" stroke={c2} strokeWidth="2" />
        </g>
      )
    }

    /* หมวกองครักษ์ (จิ่นอีเว่ย): หมวกดำปักเงิน พู่แดง หางผ้ายาว */
    case 'guard': {
      const { c1, c2, c3 } = pal(d, ['#111827', '#fbbf24', '#dc2626'])
      return (
        <g>
          <path d="M136 66 Q158 68 166 98 Q150 84 134 78 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1" />
          <path d="M64 72 Q60 42 100 40 Q140 42 136 72 Q100 64 64 72 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1.3" />
          <path d="M64 68 Q100 60 136 68" fill="none" stroke={c2} strokeWidth="3" />
          <ellipse cx="100" cy="54" rx="9" ry="4.6" fill={c3} stroke={c2} strokeWidth="1.3" />
          <path d="M91 54 l-6 -3 l1 6 Z" fill={c3} stroke={c2} strokeWidth="1" strokeLinejoin="round" />
          <path d="M66 70 Q55 86 57 104 M72 71 Q62 86 63 100" fill="none" stroke={c3} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )
    }

    /* มงกุฎองค์หญิง: ทองประดับผีเสื้อ ไข่มุกห้อย */
    case 'princess': {
      const { c1, c2, c3 } = pal(d, ['#fbbf24', '#f472b6', '#ffffff'])
      return (
        <g>
          <path d="M60 70 Q100 40 140 70 L140 77 Q100 48 60 77 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.3" />
          {[78, 90, 110, 122].map((x) => (
            <circle key={x} cx={x} cy={64 - Math.abs(x - 100) * 0.16} r="2.5" fill={c2} stroke={shade(c1, -25)} strokeWidth=".7" />
          ))}
          <g transform="translate(100 54)">
            <path d="M0 0 Q-13 -13 -15 -1 Q-13 9 0 3 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1" />
            <path d="M0 0 Q13 -13 15 -1 Q13 9 0 3 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1" />
            <path d="M0 -4 V6" stroke={shade(c1, -35)} strokeWidth="2" strokeLinecap="round" />
            <circle cx="-7" cy="-2" r="1.6" fill={c3} />
            <circle cx="7" cy="-2" r="1.6" fill={c3} />
          </g>
          {[62, 70, 130, 138].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 74 V${100 + (i % 2) * 8}`} stroke={c1} strokeWidth="1" />
              {[82, 92].map((y) => (
                <circle key={y} cx={x} cy={y} r="2.2" fill={c3} stroke="#cbd5e1" strokeWidth=".6" />
              ))}
            </g>
          ))}
        </g>
      )
    }

    /* หมวกขันที: ทรงกระบอกสูง คาดแดง */
    case 'eunuch': {
      const { c1, c2, c3 } = pal(d, ['#111827', '#dc2626', '#fbbf24'])
      return (
        <g>
          <path d="M70 70 L72 28 Q100 20 128 28 L130 70 Q100 62 70 70 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M72 38 Q100 30 128 38" fill="none" stroke={shade(c1, 45)} strokeWidth="1" opacity=".6" />
          <path d="M70 64 Q100 56 130 64 L130 71 Q100 63 70 71 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1" />
          <circle cx="100" cy="26" r="4.6" fill={c3} stroke={shade(c3, -30)} strokeWidth="1" />
          <path d="M70 70 L64 106 L74 104 L76 76 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1" strokeLinejoin="round" />
          <path d="M130 70 L136 106 L126 104 L124 76 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1" strokeLinejoin="round" />
        </g>
      )
    }

    /* หมวกผู้พิพากษา: ปีกโค้งสองข้าง ตราพระจันทร์เสี้ยวทอง */
    case 'judge': {
      const { c1, c2, c3 } = pal(d, ['#111827', '#fbbf24', '#34d399'])
      return (
        <g>
          <path d="M60 60 Q38 40 26 54 Q38 68 60 68 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M140 60 Q162 40 174 54 Q162 68 140 68 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M60 72 Q56 36 100 34 Q144 36 140 72 Q100 64 60 72 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1.3" />
          <path d="M60 68 Q100 60 140 68" fill="none" stroke={c2} strokeWidth="3" />
          <path d="M86 56 Q100 76 114 56 Q100 66 86 56 Z" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <circle cx="100" cy="42" r="3.6" fill={c3} stroke={c2} strokeWidth="1" />
        </g>
      )
    }

    /* หมวกฟางขาด ปะผ้า ปักขนไก่ */
    case 'beggar': {
      const { c1, c2, c3 } = pal(d, ['#d6b76a', '#3b82f6', '#dc2626'])
      return (
        <g>
          <path d="M44 74 L36 70 L46 66 L44 60 L58 66 Q100 56 142 66 L156 60 L154 66 L164 70 L156 74 Q100 88 44 74 Z" fill={c1} stroke={shade(c1, -32)} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M64 68 Q62 40 100 38 Q138 40 136 68 Q100 62 64 68 Z" fill={c1} stroke={shade(c1, -32)} strokeWidth="1.3" />
          <path d="M72 58 Q100 52 128 58 M70 64 Q100 58 130 64" fill="none" stroke={shade(c1, -28)} strokeWidth="1" />
          <rect x="108" y="46" width="12" height="11" fill={c2} stroke={shade(c2, -30)} strokeWidth=".9" />
          <rect x="110" y="48" width="8" height="7" fill="none" stroke="#fff" strokeWidth=".7" strokeDasharray="1.4 1.4" />
          <ellipse cx="82" cy="52" rx="4" ry="3" fill="#78350f" opacity=".5" />
          <path d="M132 50 Q148 36 152 22 Q144 36 128 46 Z" fill={c3} stroke={shade(c3, -30)} strokeWidth=".8" />
        </g>
      )
    }

    /* หมวกฟางปีกกว้างแบน ผูกคางด้วยผ้าแดง */
    case 'farmer': {
      const { c1, c2, c3 } = pal(d, ['#d6b76a', '#a16207', '#dc2626'])
      return (
        <g>
          <ellipse cx="100" cy="64" rx="60" ry="11" fill={c1} stroke={shade(c1, -32)} strokeWidth="1.3" />
          <path d="M66 62 Q64 38 100 36 Q136 38 134 62 Q100 70 66 62 Z" fill={c1} stroke={shade(c1, -32)} strokeWidth="1.3" />
          <path d="M70 58 Q100 66 130 58 M74 48 Q100 54 126 48" fill="none" stroke={shade(c1, -28)} strokeWidth="1" opacity=".7" />
          <path d="M66 60 Q100 70 134 60 L134 66 Q100 76 66 66 Z" fill={c3} />
          <path d="M64 66 Q50 92 60 116 M136 66 Q150 92 140 116" fill="none" stroke={c3} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="100" cy="35" r="3.6" fill={c2} />
        </g>
      )
    }

    /* มงกุฎดอกไม้ริบบิ้นนางรำ */
    case 'dancer': {
      const { c1, c2, c3 } = pal(d, ['#f472b6', '#a78bfa', '#fde68a'])
      return (
        <g>
          {/* ริบบิ้นพลิ้ว */}
          <path d="M60 66 Q40 92 52 128 Q54 100 68 80 Z" fill={c2} opacity=".9" stroke={shade(c2, -25)} strokeWidth=".8" />
          <path d="M140 66 Q160 92 148 128 Q146 100 132 80 Z" fill={c2} opacity=".9" stroke={shade(c2, -25)} strokeWidth=".8" />
          {/* ขนนก */}
          <path d="M100 60 Q96 34 112 18 Q108 38 108 58 Z" fill={c3} stroke={shade(c3, -30)} strokeWidth=".9" />
          <path d="M104 54 Q108 38 120 28 Q114 42 110 56 Z" fill="#fff" opacity=".7" />
          {[[66, 68], [80, 60], [100, 56], [120, 60], [134, 68]].map(([x, y], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={x + 5 * Math.cos((a * Math.PI) / 180)} cy={y + 5 * Math.sin((a * Math.PI) / 180)} r="3.6" fill={c1} stroke={shade(c1, -22)} strokeWidth=".7" />
              ))}
              <circle cx={x} cy={y} r="2.6" fill={c3} />
            </g>
          ))}
        </g>
      )
    }

    /* ผ้าโพกหัวนักฆ่า: คลุมครึ่งศีรษะ ปมหางยาวด้านข้าง */
    case 'bandana': {
      const { c1, c2, c3 } = pal(d, ['#111827', '#b91c1c', '#7f1d1d'])
      return (
        <g>
          <path d="M146 74 Q164 68 174 86 Q162 80 150 84 Z" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" strokeLinejoin="round" />
          <path d="M146 80 Q160 90 162 108 Q150 96 144 86 Z" fill={c3} stroke={shade(c3, -30)} strokeWidth="1" strokeLinejoin="round" />
          <path d="M52 92 Q46 44 100 42 Q154 44 148 92 Q140 70 100 70 Q60 70 52 92 Z" fill={c1} stroke={shade(c1, 40)} strokeWidth="1.3" />
          <path d="M54 82 Q100 64 146 82" fill="none" stroke={c2} strokeWidth="5" strokeLinecap="round" />
          <circle cx="146" cy="80" r="5" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <path d="M78 54 Q100 48 122 54" fill="none" stroke={shade(c1, 45)} strokeWidth="1" opacity=".5" />
        </g>
      )
    }
    default:
      return null
  }
}

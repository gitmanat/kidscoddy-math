'use client'

import { shade } from '@/lib/avatar'

// =====================================================================
// 💇 ทรงผมตามวัยและบทบาท
//   เด็ก      : tuft (จุกหัวใจ) · bowl (หัวกะลา) · pigtails (เปียคู่ผูกโบว์)
//   วัยกลางคน : lowbun (เกล้าต่ำ+ผ้าคาดผม) · braid (เปียยาวพาดไหล่) · halfup (มัดครึ่งปล่อยครึ่ง)
//   ผู้เฒ่า   : elder (ผมบางสองข้าง+มวยจิ๋ว)
//   บทบาท     : wild (ผมยุ่งขอทาน/นักเลง) · princess (องค์หญิง) · sidebun (มวยเอียงข้าง)
// =====================================================================
export const NEW_HAIR_KEYS = ['tuft', 'bowl', 'pigtails', 'lowbun', 'braid', 'halfup', 'elder', 'wild', 'princess', 'sidebun']

const GOLD = '#fbbf24'
const JADE = '#34d399'
const CAP = 'M53 94 Q48 48 100 46 Q152 48 147 94 Q140 70 120 68 Q100 80 80 68 Q60 70 53 94 Z'

const flower = (cx: number, cy: number, r = 5.5, fill = '#f9a8d4', stroke = '#ec4899') => (
  <g>
    {[0, 72, 144, 216, 288].map((a) => (
      <circle key={a} cx={cx + r * Math.cos((a * Math.PI) / 180)} cy={cy + r * Math.sin((a * Math.PI) / 180)} r={r * 0.75} fill={fill} stroke={stroke} strokeWidth=".8" />
    ))}
    <circle cx={cx} cy={cy} r={r * 0.55} fill={GOLD} />
  </g>
)

export function NewHairBack({ style, color }: { style: string; color: string }) {
  const dk = shade(color, -18)
  const c = { fill: color, stroke: dk, strokeWidth: 1.5, strokeLinejoin: 'round' as const }
  switch (style) {
    case 'bowl':
      return <ellipse cx="100" cy="88" rx="53" ry="47" {...c} />
    case 'pigtails':
      return (
        <g>
          {[-1, 1].map((s) => {
            const x = 100 + s * 52
            return (
              <g key={s}>
                <path d={`M${x} 98 Q${100 + s * 62} 124 ${100 + s * 58} 152 Q${100 + s * 56} 172 ${100 + s * 60} 184`} fill="none" stroke={dk} strokeWidth="13" strokeLinecap="round" />
                <path d={`M${x} 98 Q${100 + s * 62} 124 ${100 + s * 58} 152 Q${100 + s * 56} 172 ${100 + s * 60} 184`} fill="none" stroke={color} strokeWidth="10.5" strokeLinecap="round" />
                <path d={`M${100 + s * 57} 112 l${s * 8} 4 M${100 + s * 58} 126 l${s * 8} 4 M${100 + s * 57} 140 l${s * 8} 4 M${100 + s * 56} 154 l${s * 8} 4 M${100 + s * 57} 168 l${s * 8} 4`} stroke={dk} strokeWidth="1.2" opacity=".6" />
                <path d={`M${100 + s * 52} 118 l${s * 10} -6 l${-s * 2} 12 l${s * 10} 4 l${-s * 11} 2 Z`} fill="#ef4444" stroke="#991b1b" strokeWidth=".8" />
              </g>
            )
          })}
        </g>
      )
    case 'lowbun':
      return (
        <g {...c}>
          <circle cx="138" cy="126" r="13" />
          <path d="M132 118 Q138 112 144 118" fill="none" stroke={dk} strokeWidth="1.1" />
          <rect x="130" y="124" width="16" height="3.4" rx="1.7" fill={GOLD} stroke="none" transform="rotate(-20 138 126)" />
        </g>
      )
    case 'halfup':
      return (
        <g>
          <path d="M47 96 Q38 172 60 198 L140 198 Q162 172 153 96 Q153 44 100 44 Q47 44 47 96 Z" {...c} />
          <circle cx="100" cy="36" r="10" {...c} />
          <path d="M80 34 H120" stroke={JADE} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="120" cy="34" r="3" fill={JADE} stroke="#059669" strokeWidth=".8" />
        </g>
      )
    case 'elder':
      return (
        <g {...c}>
          <path d="M54 88 Q42 108 52 130 L64 112 Z" />
          <path d="M146 88 Q158 108 148 130 L136 112 Z" />
          <circle cx="100" cy="40" r="8.5" />
          <path d="M86 40 H114" stroke="#a16207" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'wild':
      return (
        <path
          d="M46 92 L28 72 L44 78 L32 54 L50 64 L46 40 L62 54 L64 30 L78 46 L88 26 L98 44 L112 24 L118 46 L134 30 L134 54 L152 42 L146 66 L168 62 L152 80 L172 94 Z"
          {...c}
        />
      )
    case 'princess':
      return (
        <g {...c}>
          <path d="M48 96 Q38 196 60 218 L140 218 Q162 196 152 96 Z" />
          <ellipse cx="66" cy="46" rx="19" ry="15" transform="rotate(-18 66 46)" />
          <ellipse cx="134" cy="46" rx="19" ry="15" transform="rotate(18 134 46)" />
        </g>
      )
    case 'sidebun':
      return (
        <g {...c}>
          <path d="M50 96 Q44 150 66 168 L134 168 Q156 150 150 96 Z" />
          <ellipse cx="138" cy="72" rx="19" ry="13" transform="rotate(34 138 72)" />
          <path d="M126 80 Q132 90 140 88" fill="none" stroke={dk} strokeWidth="1.1" />
        </g>
      )
    default:
      return null
  }
}

export function NewHairFront({ style, color }: { style: string; color: string }) {
  const dk = shade(color, -18)
  const c = { fill: color, stroke: dk, strokeWidth: 1.5, strokeLinejoin: 'round' as const }
  switch (style) {
    /* จุกหัวใจเด็ก (เถาซินฟา) */
    case 'tuft':
      return (
        <g>
          <path d={CAP} fill={color} opacity=".15" />
          <path d="M100 66 Q80 56 85 44 Q93 36 100 46 Q107 36 115 44 Q120 56 100 66 Z" {...c} />
          <path d="M92 54 Q100 60 108 54" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="57" r="2.6" fill="#ef4444" stroke="#991b1b" strokeWidth=".7" />
        </g>
      )
    /* หัวกะลา หน้าม้าตรง */
    case 'bowl':
      return <path d="M52 102 Q46 46 100 44 Q154 46 148 102 L141 98 L141 74 Q100 66 59 74 L59 98 Z" {...c} />
    case 'pigtails':
      return (
        <g>
          <path d="M53 94 Q48 48 100 46 Q152 48 147 94 Q138 72 118 68 Q108 72 100 80 Q92 72 82 68 Q62 72 53 94 Z" {...c} />
          <path d="M100 48 V76" stroke={dk} strokeWidth="1.2" opacity=".7" />
          <circle cx="52" cy="98" r="4.6" fill="#ef4444" stroke="#991b1b" strokeWidth=".8" />
          <circle cx="148" cy="98" r="4.6" fill="#ef4444" stroke="#991b1b" strokeWidth=".8" />
        </g>
      )
    case 'lowbun':
      return (
        <g>
          <path d="M52 96 Q48 48 100 46 Q152 48 148 96 Q146 74 126 68 Q100 62 74 68 Q54 74 52 96 Z" {...c} />
          <path d="M54 78 Q100 62 146 78" fill="none" stroke="#7f1d1d" strokeWidth="4.4" strokeLinecap="round" />
          <circle cx="100" cy="70" r="2.6" fill={GOLD} stroke="#b45309" strokeWidth=".8" />
        </g>
      )
    /* เปียยาวพาดไหล่ขวา */
    case 'braid':
      return (
        <g>
          <path d="M52 94 Q48 48 100 46 Q152 48 148 94 Q146 76 124 70 Q100 64 76 70 Q54 76 52 94 Z" {...c} />
          {Array.from({ length: 9 }).map((_, i) => (
            <ellipse key={i} cx={134 + i * 1.5 + (i % 2 ? 2 : -2)} cy={118 + i * 10.5} rx="6.4" ry="6" fill={i % 2 ? color : shade(color, 10)} stroke={dk} strokeWidth="1.1" />
          ))}
          <path d="M136 116 Q128 104 124 92" fill="none" stroke={dk} strokeWidth="5" strokeLinecap="round" />
          <path d="M148 212 l-4 10 l5 -2 l4 2 Z" fill="#dc2626" stroke="#991b1b" strokeWidth=".8" />
          <circle cx="147" cy="212" r="3.4" fill="#dc2626" stroke="#991b1b" strokeWidth=".8" />
        </g>
      )
    case 'halfup':
      return (
        <g>
          <path d="M52 100 Q48 48 100 46 Q152 48 148 100 Q142 72 112 66 Q100 78 88 66 Q58 72 52 100 Z" {...c} />
          <path d="M56 96 Q52 124 62 150" fill="none" stroke={dk} strokeWidth="5" strokeLinecap="round" />
          <path d="M144 96 Q148 124 138 150" fill="none" stroke={dk} strokeWidth="5" strokeLinecap="round" />
          <path d="M94 44 l6 -4 l6 4 l-6 4 Z" fill="#ef4444" stroke="#991b1b" strokeWidth=".8" />
        </g>
      )
    /* ผู้เฒ่า: ศีรษะล้านด้านบน มีเส้นผมบางๆ */
    case 'elder':
      return (
        <g>
          <path d={CAP} fill={color} opacity=".1" />
          <ellipse cx="88" cy="66" rx="14" ry="7" fill="#fff" opacity=".28" />
          <path d="M52 94 Q46 82 54 68 Q50 84 56 100 Z" {...c} />
          <path d="M148 94 Q154 82 146 68 Q150 84 144 100 Z" {...c} />
          <path d="M86 58 q6 -4 12 0 M102 56 q6 -4 12 0 M94 64 q5 -3 10 0" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity=".75" />
        </g>
      )
    /* ผมยุ่งเหยิง */
    case 'wild':
      return (
        <path
          d="M53 94 Q48 52 100 48 Q152 52 147 94 L140 78 L132 90 L124 72 L114 86 L104 70 L96 84 L86 70 L76 88 L68 74 L60 90 Z"
          {...c}
        />
      )
    case 'princess':
      return (
        <g>
          <path d="M52 98 Q48 46 100 44 Q152 46 148 98 Q146 82 140 74 Q100 66 60 74 Q54 82 52 98 Z" {...c} />
          {[66, 134].map((x) => (
            <g key={x}>
              <circle cx={x} cy="48" r="7.4" fill="none" stroke={GOLD} strokeWidth="2.4" />
              <circle cx={x} cy="48" r="2.6" fill="#ef4444" />
              <path d={`M${x} 56 V68`} stroke={GOLD} strokeWidth="1.4" />
              <circle cx={x} cy="70" r="2.2" fill="#fff" stroke="#cbd5e1" strokeWidth=".6" />
            </g>
          ))}
          {/* เปียข้างแก้มประดับไข่มุก */}
          {[56, 144].map((x) => (
            <g key={x}>
              <path d={`M${x} 98 Q${x + (x < 100 ? -4 : 4)} 124 ${x + (x < 100 ? 2 : -2)} 152`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
              {[110, 126, 142].map((y) => (
                <circle key={y} cx={x + (x < 100 ? -2 : 2)} cy={y} r="2.2" fill="#fff" stroke="#cbd5e1" strokeWidth=".6" />
              ))}
            </g>
          ))}
        </g>
      )
    /* มวยเอียงข้าง (ถั่วหม่าจี้) */
    case 'sidebun':
      return (
        <g>
          <path d="M52 100 Q48 48 100 46 Q152 48 148 94 Q144 72 122 68 Q100 62 76 70 Q56 78 52 100 Z" {...c} />
          {flower(142, 66, 5.4)}
          <path d="M128 60 L112 44" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="111" cy="43" r="2.8" fill="#ef4444" stroke={GOLD} strokeWidth="1" />
        </g>
      )
    default:
      return null
  }
}

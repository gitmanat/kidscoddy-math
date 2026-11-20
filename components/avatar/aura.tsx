'use client'

import type React from 'react'
import type { AuraTheme } from '@/lib/avatarSets'

// =====================================================================
// ✨ ออร่าชุดเซ็ต 12 ธีม × 3 ระดับ (วาดด้านหลังตัวละคร)
//   ระดับ 1 = เรืองแสง + อนุภาคเล็กน้อย · ระดับ 2 = + ลวดลายประจำธีม · ระดับ 3 (ชุดเต็ม) = + สัญลักษณ์ใหญ่ล้อมตัว
//   ตำแหน่งทั้งหมดคงที่ (ไม่สุ่ม) เพื่อให้ภาพเหมือนกันทุกหน้า · animate=true จะมีอนุภาคลอย/วงหมุน
// =====================================================================
const GLOW: Record<AuraTheme, [string, string]> = {
  gold: ['#fde047', '#f59e0b'],
  phoenix: ['#fda4af', '#f97316'],
  sword: ['#bae6fd', '#60a5fa'],
  ink: ['#c7d2fe', '#6366f1'],
  flame: ['#fdba74', '#ef4444'],
  lotus: ['#fde68a', '#f472b6'],
  bagua: ['#a5f3fc', '#22d3ee'],
  mist: ['#c4b5fd', '#7c3aed'],
  petals: ['#fbcfe8', '#ec4899'],
  leaves: ['#bbf7d0', '#22c55e'],
  beams: ['#fef9c3', '#fbbf24'],
  slash: ['#fecdd3', '#e11d48'],
}

interface Ctx {
  tier: number
  uid: string
  animate: boolean
  c1: string
  c2: string
}

const CX = 100
const CY = 172
const rad = (a: number) => (a * Math.PI) / 180

function mk(ctx: Ctx) {
  const { uid, animate } = ctx
  const spin = (dur = 28, rev = false): React.CSSProperties | undefined =>
    animate ? { transformOrigin: `${CX}px ${CY}px`, animation: `${uid}-spin ${dur}s linear infinite ${rev ? 'reverse' : ''}` } : undefined
  const rise = (i: number, dur = 4): React.CSSProperties | undefined =>
    animate ? { animation: `${uid}-rise ${dur + (i % 3)}s ease-in-out ${(i * 0.7) % 4}s infinite` } : undefined
  const pulse = (dur = 3): React.CSSProperties | undefined =>
    animate ? { transformOrigin: `${CX}px ${CY}px`, animation: `${uid}-pulse ${dur}s ease-in-out infinite` } : undefined
  return { spin, rise, pulse }
}

/** อนุภาคประกายลอยรอบตัว */
function Sparks({ ctx, color }: { ctx: Ctx; color: string }) {
  const { rise } = mk(ctx)
  const n = ctx.tier * 5
  return (
    <g fill={color}>
      {Array.from({ length: n }).map((_, i) => {
        const a = i * 137.5
        const r = 62 + ((i * 37) % 50)
        const x = CX + r * Math.cos(rad(a))
        const y = CY + r * 1.15 * Math.sin(rad(a))
        const s = 1.6 + (i % 3) * 0.7
        return (
          <g key={i} style={rise(i)}>
            {i % 2 ? (
              <circle cx={x} cy={y} r={s} opacity=".85" />
            ) : (
              <path d={`M${x} ${y - s * 2.4} L${x + s * 0.8} ${y - s * 0.8} L${x + s * 2.4} ${y} L${x + s * 0.8} ${y + s * 0.8} L${x} ${y + s * 2.4} L${x - s * 0.8} ${y + s * 0.8} L${x - s * 2.4} ${y} L${x - s * 0.8} ${y - s * 0.8} Z`} opacity=".9" />
            )}
          </g>
        )
      })}
    </g>
  )
}

const flame = (x: number, y: number, s: number, key: string | number, outer = '#f97316', inner = '#fde047') => (
  <g key={key}>
    <path d={`M${x - 6 * s} ${y} Q${x - 10 * s} ${y - 14 * s} ${x} ${y - 28 * s} Q${x + 10 * s} ${y - 14 * s} ${x + 6 * s} ${y} Z`} fill={outer} opacity=".9" />
    <path d={`M${x - 3 * s} ${y} Q${x - 5 * s} ${y - 8 * s} ${x} ${y - 17 * s} Q${x + 5 * s} ${y - 8 * s} ${x + 3 * s} ${y} Z`} fill={inner} />
  </g>
)

const petal = (x: number, y: number, a: number, s: number, fill: string, key: string | number) => (
  <path key={key} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`} d="M0 0 Q7 -8 0 -18 Q-7 -8 0 0 Z" fill={fill} opacity=".85" />
)

const BAGUA = [[1, 1, 1], [0, 1, 1], [1, 0, 1], [0, 0, 1], [1, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 0]] // ☰☱☲☳☴☵☶☷

function Deco({ theme, ctx }: { theme: AuraTheme; ctx: Ctx }) {
  const { tier, c1, c2 } = ctx
  const { spin, rise, pulse } = mk(ctx)

  switch (theme) {
    /* ---------- จักรพรรดิมังกร: รัศมีแสงทอง ---------- */
    case 'gold':
      return (
        <g>
          <circle cx={CX} cy={CY} r="92" fill="none" stroke={c1} strokeWidth="1.5" strokeDasharray="4 6" opacity=".8" style={spin(40)} />
          {tier >= 2 && (
            <g style={spin(70)} opacity=".32" fill={c1}>
              {Array.from({ length: 14 }).map((_, i) => {
                const a = (i * 360) / 14
                return <path key={i} d={`M${CX} ${CY} L${CX + 150 * Math.cos(rad(a - 3.2))} ${CY + 150 * Math.sin(rad(a - 3.2))} L${CX + 150 * Math.cos(rad(a + 3.2))} ${CY + 150 * Math.sin(rad(a + 3.2))} Z`} />
              })}
            </g>
          )}
          {tier >= 3 && (
            <g>
              <circle cx={CX} cy={CY} r="102" fill="none" stroke={c2} strokeWidth="2.6" opacity=".9" />
              <g style={spin(50, true)} fill={c1}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <circle key={i} cx={CX + 102 * Math.cos(rad(i * 30))} cy={CY + 102 * Math.sin(rad(i * 30))} r="3.2" />
                ))}
              </g>
            </g>
          )}
        </g>
      )

    /* ---------- ฮองเฮาหงส์ฟ้า: ขนหงส์ลอย ปีกหงส์ ---------- */
    case 'phoenix':
      return (
        <g>
          {tier >= 3 && (
            <g opacity=".5">
              <path d="M70 176 Q8 130 14 52 Q44 96 76 134 Z" fill={c2} stroke={c1} strokeWidth="1.4" />
              <path d="M130 176 Q192 130 186 52 Q156 96 124 134 Z" fill={c2} stroke={c1} strokeWidth="1.4" />
              <path d="M64 190 Q14 190 4 120 Q40 150 70 160 Z" fill={c1} />
              <path d="M136 190 Q186 190 196 120 Q160 150 130 160 Z" fill={c1} />
            </g>
          )}
          {Array.from({ length: tier * 3 }).map((_, i) => {
            const a = i * 52
            const r = 78 + (i % 3) * 14
            return (
              <g key={i} style={rise(i, 5)}>
                <g transform={`translate(${CX + r * Math.cos(rad(a))} ${CY + r * 1.1 * Math.sin(rad(a))}) rotate(${a + 90})`}>
                  <path d="M0 0 Q7 -12 0 -26 Q-7 -12 0 0 Z" fill={i % 2 ? c1 : c2} opacity=".85" />
                  <path d="M0 0 V-22" stroke="#fff" strokeWidth=".8" opacity=".7" />
                </g>
              </g>
            )
          })}
        </g>
      )

    /* ---------- จอมยุทธ์สายลม: พลังกระบี่โค้ง ---------- */
    case 'sword':
      return (
        <g>
          <g style={spin(18)} fill="none" stroke="#fff" strokeLinecap="round" opacity=".75">
            {Array.from({ length: tier * 2 }).map((_, i) => (
              <path key={i} transform={`rotate(${(i * 360) / (tier * 2)} ${CX} ${CY})`} d={`M${CX - 34} ${CY - 100} A104 104 0 0 1 ${CX + 52} ${CY - 90}`} strokeWidth={2.6 - (i % 2) * 0.8} stroke={i % 2 ? c1 : '#fff'} />
            ))}
          </g>
          {tier >= 3 && (
            <g style={spin(30, true)}>
              {[0, 90, 180, 270].map((a) => (
                <g key={a} transform={`rotate(${a} ${CX} ${CY}) translate(${CX} ${CY - 108})`}>
                  <path d="M0 -14 L3.4 4 H-3.4 Z" fill="#e2e8f0" stroke={c2} strokeWidth="1" />
                  <rect x="-5" y="4" width="10" height="2.6" rx="1" fill={c2} />
                </g>
              ))}
            </g>
          )}
        </g>
      )

    /* ---------- บัณฑิตจอหงวน: อักษรลอย + พู่กันหมึก ---------- */
    case 'ink': {
      const glyphs: [string, number, number][] = [['文', 28, 70], ['學', 168, 96], ['墨', 34, 190], ['書', 166, 214], ['智', 100, 26], ['道', 44, 268], ['禮', 160, 278]]
      return (
        <g>
          {tier >= 2 && (
            <path d="M20 250 Q50 200 30 150 Q10 100 50 70 M180 250 Q150 200 170 150 Q190 100 150 70" fill="none" stroke={c2} strokeWidth="5" strokeLinecap="round" opacity=".28" />
          )}
          <g fontFamily="'Noto Serif SC','Songti SC','STKaiti','KaiTi',serif" fontWeight="900" fontSize="22" textAnchor="middle" fill={c1} opacity=".6">
            {glyphs.slice(0, 2 + tier * 2).map(([g, x, y], i) => (
              <text key={g} x={x} y={y} style={rise(i, 6)}>{g}</text>
            ))}
          </g>
          {tier >= 3 && <circle cx={CX} cy={CY} r="102" fill="none" stroke={c2} strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" opacity=".85" style={spin(40)} />}
        </g>
      )
    }

    /* ---------- แม่ทัพศึก: เปลวเพลิงรอบเท้า ---------- */
    case 'flame':
      return (
        <g>
          {Array.from({ length: tier * 2 + 1 }).map((_, i, arr) => {
            const t = arr.length === 1 ? 0.5 : i / (arr.length - 1)
            const x = 28 + t * 144
            return <g key={i} style={pulse(1.6 + (i % 3) * 0.4)}>{flame(x, 306, 1 + 0.5 * Math.sin(i * 1.7) + (tier >= 3 ? 0.3 : 0), i)}</g>
          })}
          {tier >= 3 && (
            <g opacity=".85">
              {flame(18, 230, 1.3, 'l')}
              {flame(182, 230, 1.3, 'r')}
              {flame(24, 150, 1, 'l2')}
              {flame(176, 150, 1, 'r2')}
            </g>
          )}
        </g>
      )

    /* ---------- ศิษย์เส้าหลิน: บัวทองรองเท้า + รัศมีเหนือศีรษะ ---------- */
    case 'lotus':
      return (
        <g>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].slice(0, 3 + tier * 2).map((i, _, arr) => {
            const a = -72 + (i * 144) / (arr.length - 1)
            return (
              <g key={i} transform={`translate(${CX} 298) rotate(${a})`}>
                <path d="M0 0 Q14 -22 0 -52 Q-14 -22 0 0 Z" fill={i % 2 ? c2 : c1} opacity=".72" stroke="#fff" strokeWidth="1" />
              </g>
            )
          })}
          {tier >= 2 && (
            <g fill="none" stroke={c1} strokeWidth="1.6" opacity=".8">
              <ellipse cx={CX} cy="300" rx="64" ry="9" style={pulse(3)} />
              <ellipse cx={CX} cy="300" rx="84" ry="13" opacity=".6" />
            </g>
          )}
          {tier >= 3 && (
            <g>
              <circle cx={CX} cy="100" r="62" fill={c1} opacity=".16" />
              <circle cx={CX} cy="100" r="62" fill="none" stroke={c1} strokeWidth="3" />
              <circle cx={CX} cy="100" r="70" fill="none" stroke={c2} strokeWidth="1.6" strokeDasharray="2 5" style={spin(36)} />
            </g>
          )}
        </g>
      )

    /* ---------- นักพรตเซียน: วงปากั้วหมุน ---------- */
    case 'bagua':
      return (
        <g>
          <circle cx={CX} cy={CY} r="96" fill="none" stroke={c1} strokeWidth="1.4" opacity=".7" />
          <g style={tier >= 2 ? spin(48) : undefined}>
            {BAGUA.map((bits, i) => {
              const a = i * 45 - 90
              return (
                <g key={i} transform={`translate(${CX + 108 * Math.cos(rad(a))} ${CY + 108 * Math.sin(rad(a))}) rotate(${a + 90})`} stroke={c1} strokeWidth="2.6" strokeLinecap="round">
                  {bits.map((b, k) => (
                    <g key={k}>
                      {b ? <path d={`M-8 ${k * 5 - 5} H8`} /> : <path d={`M-8 ${k * 5 - 5} H-2 M2 ${k * 5 - 5} H8`} />}
                    </g>
                  ))}
                </g>
              )
            })}
          </g>
          {tier >= 3 && (
            <g opacity=".22" style={spin(60, true)}>
              <circle cx={CX} cy={CY} r="60" fill="#fff" stroke={c2} strokeWidth="2" />
              <path d={`M${CX} ${CY - 60} A60 60 0 0 1 ${CX} ${CY + 60} A30 30 0 0 1 ${CX} ${CY} A30 30 0 0 0 ${CX} ${CY - 60} Z`} fill={c2} />
            </g>
          )}
        </g>
      )

    /* ---------- เงามืด: หมอกม่วงดำ + ดวงตาแดง ---------- */
    case 'mist':
      return (
        <g>
          <g fill={c2} opacity=".32">
            {[[34, 298, 22], [76, 306, 20], [124, 304, 22], [168, 296, 20], [100, 292, 18], [18, 244, 16], [184, 250, 16], [22, 190, 14], [180, 196, 14]].slice(0, 3 + tier * 2).map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} style={pulse(2.4 + (i % 3) * 0.6)} />
            ))}
          </g>
          {tier >= 3 && (
            <g>
              {[[34, 84], [166, 84]].map(([x, y]) => (
                <path key={x} d={`M${x - 10} ${y} Q${x} ${y - 6} ${x + 10} ${y} Q${x} ${y + 3} ${x - 10} ${y} Z`} fill="#ef4444" style={pulse(2)} />
              ))}
            </g>
          )}
        </g>
      )

    /* ---------- นางรำบุปผา: กลีบดอกไม้ปลิว ---------- */
    case 'petals':
      return (
        <g>
          {Array.from({ length: 4 + tier * 4 }).map((_, i) => {
            const a = i * 137.5
            const r = 60 + ((i * 29) % 56)
            return <g key={i} style={rise(i, 5)}>{petal(CX + r * Math.cos(rad(a)), CY + r * 1.15 * Math.sin(rad(a)), a, 0.8 + (i % 3) * 0.25, i % 2 ? c1 : c2, i)}</g>
          })}
          {tier >= 3 && (
            <g style={spin(45)}>
              {Array.from({ length: 10 }).map((_, i) => (
                <g key={i} transform={`translate(${CX + 104 * Math.cos(rad(i * 36))} ${CY + 104 * Math.sin(rad(i * 36))})`}>
                  {[0, 72, 144, 216, 288].map((a) => (
                    <circle key={a} cx={4 * Math.cos(rad(a))} cy={4 * Math.sin(rad(a))} r="2.6" fill={c1} />
                  ))}
                  <circle r="1.6" fill="#fde047" />
                </g>
              ))}
            </g>
          )}
        </g>
      )

    /* ---------- หมอเทวดา: ใบไม้ + ดวงไฟสมุนไพร ---------- */
    case 'leaves':
      return (
        <g>
          {Array.from({ length: 3 + tier * 3 }).map((_, i) => {
            const a = i * 137.5
            const r = 62 + ((i * 31) % 52)
            const x = CX + r * Math.cos(rad(a))
            const y = CY + r * 1.15 * Math.sin(rad(a))
            return (
              <g key={i} style={rise(i, 5)}>
                <g transform={`translate(${x} ${y}) rotate(${a})`}>
                  <path d="M0 0 Q9 -6 14 0 Q9 6 0 0 Z" fill={i % 2 ? c1 : c2} opacity=".85" />
                  <path d="M0 0 H12" stroke="#fff" strokeWidth=".8" opacity=".7" />
                </g>
              </g>
            )
          })}
          {tier >= 2 && (
            <g fill={c1}>
              {[[36, 120], [164, 150], [50, 250], [150, 260]].map(([x, y], i) => (
                <g key={i} style={pulse(2 + i * 0.3)}>
                  <circle cx={x} cy={y} r="8" opacity=".25" />
                  <circle cx={x} cy={y} r="3" opacity=".9" />
                </g>
              ))}
            </g>
          )}
          {tier >= 3 && (
            <g style={spin(52)}>
              {Array.from({ length: 16 }).map((_, i) => (
                <g key={i} transform={`translate(${CX + 104 * Math.cos(rad(i * 22.5))} ${CY + 104 * Math.sin(rad(i * 22.5))}) rotate(${i * 22.5 + 90})`}>
                  <path d="M0 0 Q6 -8 0 -16 Q-6 -8 0 0 Z" fill={i % 2 ? c1 : c2} opacity=".85" />
                </g>
              ))}
            </g>
          )}
        </g>
      )

    /* ---------- ตุลาการเที่ยงธรรม: เสาแสง + ตาชั่ง ---------- */
    case 'beams':
      return (
        <g>
          <defs>
            <linearGradient id={`${ctx.uid}-bm`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={c1} stopOpacity="0" />
              <stop offset=".5" stopColor={c1} stopOpacity=".7" />
              <stop offset="1" stopColor={c2} stopOpacity=".1" />
            </linearGradient>
          </defs>
          {[24, 176, 56, 144].slice(0, tier >= 2 ? 4 : 2).map((x, i) => (
            <rect key={x} x={x - (i < 2 ? 9 : 5)} y="20" width={i < 2 ? 18 : 10} height="290" rx="5" fill={`url(#${ctx.uid}-bm)`} style={pulse(2.6 + i * 0.4)} />
          ))}
          {tier >= 3 && (
            <g stroke={c2} strokeWidth="2.4" strokeLinecap="round" fill="none" style={pulse(3)}>
              <path d="M100 8 V30 M78 18 H122" />
              <path d="M78 18 L70 34 H86 Z M122 18 L114 34 H130 Z" fill={c1} />
            </g>
          )}
        </g>
      )

    /* ---------- จิ่นอีเว่ย: รอยฟันแดง ---------- */
    case 'slash': {
      const sl = (x1: number, y1: number, x2: number, y2: number, w: number, fill: string, key: string | number, delay = 0) => {
        const dx = y2 - y1
        const dy = x1 - x2
        const len = Math.hypot(dx, dy) || 1
        const nx = (dx / len) * w
        const ny = (dy / len) * w
        return <path key={key} d={`M${x1} ${y1} L${x2 + nx} ${y2 + ny} L${x2} ${y2} Z`} fill={fill} opacity=".7" style={pulse(2 + delay)} />
      }
      return (
        <g>
          {sl(8, 70, 190, 248, 4, c1, 'a')}
          {sl(196, 60, 10, 236, 3, c2, 'b', 0.4)}
          {tier >= 2 && sl(20, 130, 180, 300, 3, c1, 'c', 0.8)}
          {tier >= 2 && sl(190, 130, 30, 300, 2.4, '#fff', 'd', 1.1)}
          {tier >= 3 && (
            <g fill="none" stroke={c2} strokeWidth="3" strokeLinecap="round" opacity=".85">
              <path d="M16 40 Q100 -4 184 40" />
              <path d="M16 304 Q100 340 184 304" />
            </g>
          )}
        </g>
      )
    }
    default:
      return null
  }
}

const SPARK: Record<AuraTheme, string> = {
  gold: '#fde047', phoenix: '#fdba74', sword: '#e0f2fe', ink: '#e0e7ff', flame: '#fde047', lotus: '#fff7ed',
  bagua: '#cffafe', mist: '#ddd6fe', petals: '#fff', leaves: '#dcfce7', beams: '#fff', slash: '#fff',
}

export function SetAuraLayer({ theme, tier, uid, animate }: { theme: AuraTheme; tier: number; uid: string; animate: boolean }) {
  const [c1, c2] = GLOW[theme]
  const id = `${uid}-ag`
  const op = tier === 1 ? 0.3 : tier === 2 ? 0.44 : 0.6
  const ctx: Ctx = { tier, uid, animate, c1, c2 }
  return (
    <g pointerEvents="none">
      {animate && (
        <style>{`
          @keyframes ${uid}-spin{to{transform:rotate(360deg)}}
          @keyframes ${uid}-rise{0%{transform:translateY(10px);opacity:0}30%{opacity:1}100%{transform:translateY(-24px);opacity:0}}
          @keyframes ${uid}-pulse{0%,100%{opacity:.78}50%{opacity:1}}
        `}</style>
      )}
      <defs>
        <radialGradient id={id} cx="50%" cy="54%" r="55%">
          <stop offset="0" stopColor={c1} stopOpacity={op} />
          <stop offset=".6" stopColor={c2} stopOpacity={op * 0.45} />
          <stop offset="1" stopColor={c2} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={CX} cy="172" rx="97" ry="138" fill={`url(#${id})`} />
      <Deco theme={theme} ctx={ctx} />
      <Sparks ctx={ctx} color={SPARK[theme]} />
    </g>
  )
}

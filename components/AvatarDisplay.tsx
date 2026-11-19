'use client'

import type { CSSProperties, ReactNode } from 'react'
import { CharacterSvg, type FreePoseConfig } from '@/components/Character'
import { type AvatarConfig, readAvatarConfig, titleOf } from '@/lib/avatar'

// =====================================================================
// AvatarDisplay — ตัวแสดงตัวละครมาตรฐานของทั้งแอป
//   ใช้ทั้งโปรไฟล์ ร้านค้า แดชบอร์ด กระดานอันดับ และป้ายผู้พิชิต
//   อ่านจาก users.avatar_config ก้อนเดียว → ทุกที่แสดงเหมือนกัน
// =====================================================================

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
const PX: Record<AvatarSize, number> = { xs: 32, sm: 48, md: 72, lg: 104, xl: 160 }

const DEFAULT_BG = 'linear-gradient(135deg, #e0e7ff 0%, #fae8ff 100%)'

interface FrameStyle {
  outer: CSSProperties
  glow?: string
}

/** กรอบรอบรูป: อ่านจาก design.style / colors (รองรับกรอบรุ่นเก่าตาม item_key) */
function frameStyle(cfg: AvatarConfig, px: number): FrameStyle {
  const f = cfg.equip?.frame
  const thick = Math.max(2, Math.round(px * 0.05))
  if (!f) return { outer: { padding: Math.max(2, Math.round(px * 0.03)), background: '#ffffff' } }

  const legacy: Record<string, { style: string; colors: string[] }> = {
    frame_fire: { style: 'gradient', colors: ['#fb923c', '#ef4444', '#fde047'] },
    frame_gold: { style: 'solid', colors: ['#fbbf24', '#f59e0b', '#fde68a'] },
    frame_diamond: { style: 'gradient', colors: ['#67e8f9', '#a5f3fc', '#818cf8'] },
  }
  const style = (f.d?.style as string) || legacy[f.key]?.style || 'solid'
  const colors = (f.d?.colors as string[]) || legacy[f.key]?.colors || ['#fbbf24', '#f59e0b', '#fde68a']
  const glow = f.d?.glow !== false ? colors[0] : undefined

  if (style === 'rainbow') {
    return {
      outer: {
        padding: thick,
        background: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #fde047, #22c55e, #38bdf8, #8b5cf6, #ef4444)',
      },
      glow: '#a78bfa',
    }
  }
  if (style === 'gradient') {
    return {
      outer: { padding: thick, background: `linear-gradient(135deg, ${colors[0]}, ${colors[1] || colors[0]}, ${colors[2] || colors[0]})` },
      glow,
    }
  }
  if (style === 'neon') {
    return { outer: { padding: Math.max(2, thick - 1), background: colors[0] }, glow: colors[0] }
  }
  return { outer: { padding: thick, background: `linear-gradient(135deg, ${colors[2] || colors[0]}, ${colors[0]}, ${colors[1] || colors[0]})` }, glow }
}

export interface AvatarDisplayProps {
  user: any
  size?: AvatarSize
  showLevel?: boolean
  onClick?: () => void
  /** bust = หัว+ไหล่ (ค่าเริ่มต้น) / full = เต็มตัว */
  view?: 'bust' | 'full'
  /** ใช้ config อื่นแทนของ user (เช่น ตอนลองใส่) */
  configOverride?: AvatarConfig
  animate?: boolean
  className?: string
}

export function AvatarDisplay({ user, size = 'md', showLevel = false, onClick, view = 'bust', configOverride, animate, className }: AvatarDisplayProps) {
  const cfg = configOverride || readAvatarConfig(user)
  const px = PX[size]
  const legacyPortrait = !configOverride && !user?.avatar_config && user?.avatar_url ? (user.avatar_url as string) : null
  const portrait = cfg.mode === 'portrait' ? cfg.portrait : legacyPortrait
  const bg = cfg.equip?.bg?.d?.css || DEFAULT_BG
  const fr = frameStyle(cfg, px)
  const full = view === 'full'
  const w = px
  const h = full ? Math.round(px * 1.6) : px
  const radius = full ? '22%' : '30%'

  const body: ReactNode = (
    <div
      className="relative shrink-0"
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        ...fr.outer,
        boxShadow: fr.glow ? `0 0 ${Math.round(px * 0.18)}px ${fr.glow}aa, 0 2px 6px rgba(0,0,0,.18)` : '0 2px 6px rgba(0,0,0,.18)',
        boxSizing: 'border-box',
      }}
    >
      <div className="w-full h-full overflow-hidden" style={{ borderRadius: radius, background: bg }}>
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portrait} alt={user?.display_name || 'avatar'} className="w-full h-full object-cover" />
        ) : (
          <CharacterSvg config={cfg} view={full ? 'full' : 'bust'} animate={animate} className="w-full h-full block" />
        )}
      </div>
      {showLevel && user?.level != null && (
        <span
          className="absolute -bottom-1 -right-1 px-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black shadow border-2 border-white leading-tight"
          style={{ fontSize: Math.max(9, Math.round(px * 0.17)) }}
        >
          Lv.{user.level}
        </span>
      )}
    </div>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`cursor-pointer transition hover:scale-105 active:scale-95 ${className || ''}`} title="แต่งตัวละคร">
        {body}
      </button>
    )
  }
  return <div className={className}>{body}</div>
}

/** เวทีโชว์ตัวละครเต็มตัว (พื้นหลัง + กรอบ + ฉายา) ใช้ในหน้าแต่งตัวและร้านค้า */
export function CharacterStage({ config, className, animate = true, label, onPoseChange }: { config: AvatarConfig; className?: string; animate?: boolean; label?: ReactNode; onPoseChange?: (fp: FreePoseConfig) => void }) {
  const bg = config.equip?.bg?.d?.css || DEFAULT_BG
  const fr = frameStyle(config, 300)
  const title = titleOf(config)
  const portrait = config.mode === 'portrait' ? config.portrait : null
  return (
    <div className={className}>
      <div
        className="relative w-full"
        style={{
          aspectRatio: '5 / 8',
          borderRadius: 28,
          ...fr.outer,
          boxShadow: fr.glow ? `0 0 28px ${fr.glow}aa, 0 6px 18px rgba(0,0,0,.2)` : '0 6px 18px rgba(0,0,0,.2)',
          boxSizing: 'border-box',
        }}
      >
        <div className="w-full h-full overflow-hidden relative" style={{ borderRadius: 24, background: bg }}>
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <CharacterSvg config={config} view="full" animate={animate} className="w-full h-full block" onPoseChange={onPoseChange} />
          )}
          {title && (
            <div className="absolute left-0 right-0 bottom-2 flex justify-center pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-black/45 backdrop-blur text-white text-xs font-black shadow max-w-[90%] truncate">{title}</span>
            </div>
          )}
          {label}
        </div>
      </div>
    </div>
  )
}

/** ป้ายแสดงเพื่อนที่พิชิตชุด/ภารกิจนี้แล้ว (ใช้ในการ์ดการบ้านและภารกิจพิเศษ) */
export function CompletedAvatarsBadge({ completedUsers }: { completedUsers: any[] }) {
  const users = completedUsers || []
  if (users.length === 0) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">👑</span>
          <div className="min-w-0">
            <p className="text-sm font-black text-amber-900 leading-tight">ยังไม่มีผู้พิชิตชุดนี้!</p>
            <p className="text-[11px] font-bold text-orange-600 leading-tight">มาเป็นคนแรกที่คว้าคอยน์ชุดนี้กันเถอะ 🚀</p>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black whitespace-nowrap shadow-sm">ชิงอันดับ 1</span>
      </div>
    )
  }
  const shown = users.slice(0, 4)
  const rest = users.length - shown.length
  const medals = ['🥇', '🥈', '🥉']
  const top = users[0]
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex -space-x-3 shrink-0">
          {shown.map((u, i) => (
            <div key={u.id ?? i} className="relative" title={`${u.display_name || 'นักเรียน'}${u.coinsEarned != null ? ` • ${u.coinsEarned} คอยน์` : ''}`}>
              <AvatarDisplay user={u} size="xs" />
              {i < 3 && <span className="absolute -top-2 -right-1 text-[13px] leading-none">{medals[i]}</span>}
            </div>
          ))}
          {rest > 0 && (
            <span className="w-8 h-8 rounded-full bg-white border-2 border-amber-200 text-[11px] font-black text-amber-700 flex items-center justify-center">+{rest}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-amber-900 leading-tight">พิชิตแล้ว {users.length} คน</p>
          <p className="text-[11px] font-bold text-orange-600 leading-tight truncate">
            อันดับ 1: {top?.display_name || 'นักเรียน'}
            {top?.coinsEarned != null ? ` • ${top.coinsEarned} คอยน์` : ''}
          </p>
        </div>
      </div>
      <span className="px-3 py-1.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black whitespace-nowrap shadow-sm">ชิงอันดับ 1</span>
    </div>
  )
}
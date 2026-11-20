'use client'

import type React from 'react'
import { CompletedAvatarsBadge } from '@/components/AvatarDisplay'
import { CharacterSvg } from '@/components/Character'
import { readAvatarConfig } from '@/lib/avatar'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'
import AssignDateField from '@/components/AssignDateField'

// =====================================================================
// 🏯 ฉายาตามเลเวล 1-100 แนวนิยายกำลังภายในจีน (ฝึกบำเพ็ญสู่เซียน)
//   เลเวล 1-90  = 9 ภพ ภพละ 10 เลเวล (ชั้น 1-9 และขั้นสมบูรณ์)
//   เลเวล 91-100 = ภพเซียน แต่ละเลเวลมีฉายาเฉพาะ
// =====================================================================
const LEVEL_REALMS = [
  { emoji: '🌱', name: 'กลั่นลมปราณ' },
  { emoji: '🪨', name: 'สร้างรากฐาน' },
  { emoji: '🟡', name: 'ผนึกจินตัน' },
  { emoji: '🔮', name: 'กำเนิดวิญญาณ' },
  { emoji: '🌀', name: 'แปรเปลี่ยนเทพ' },
  { emoji: '🌌', name: 'ทะลวงห้วงว่างเปล่า' },
  { emoji: '🛡️', name: 'หลอมรวมกายา' },
  { emoji: '🌠', name: 'มหายาน' },
  { emoji: '⚡', name: 'ฝ่าทัณฑ์สวรรค์' },
]

const IMMORTAL_TITLES = [
  '🌤️ เซียนผู้เริ่มบรรลุ',
  '⛰️ เซียนปฐพี',
  '☁️ เซียนเมฆา',
  '🌙 เซียนจันทรา',
  '☀️ เซียนสุริยะ',
  '⭐ เซียนดารา',
  '🔱 เซียนทอง',
  '🐉 เซียนมังกรฟ้า',
  '🌌 มหาเซียนไท่อี่',
  '👑 จักรพรรดิเซียนผู้อมตะ',
]

const getLevelTitle = (level: number) => {
  const lv = Math.min(100, Math.max(1, Math.floor(level || 1)))
  if (lv > 90) return IMMORTAL_TITLES[lv - 91]
  const realm = LEVEL_REALMS[Math.floor((lv - 1) / 10)]
  const stage = ((lv - 1) % 10) + 1
  return `${realm.emoji} ${realm.name} ${stage === 10 ? 'ขั้นสมบูรณ์' : `ชั้น ${stage}`}`
}

// ฉายาที่แสดง: ใช้ที่เด็กสวมอยู่ใน avatar_config เท่านั้น ถ้าถอดออกแล้วให้ใช้ฉายาตามเลเวล
// (คอลัมน์ equipped_title รุ่นเก่าใช้เฉพาะคนที่ยังไม่เคยมี avatar_config)
const resolveDisplayTitle = (u: any, cfg: any, level: number) =>
  cfg?.equip?.title?.name || (!u?.avatar_config ? u?.equipped_title : '') || getLevelTitle(level)

const XP_PER_LEVEL = 50 // ต้องตรงกับสูตรเลเวล floor(xp/50)+1 ที่ใช้ในหน้าทำแบบฝึกและ SQL
const MAX_TITLE_LEVEL = 100

const getRealmOf = (level: number) =>
  level > 90 ? { emoji: '👑', name: 'ภพเซียน' } : LEVEL_REALMS[Math.floor((level - 1) / 10)]

// =====================================================================
// 📅 ฟังก์ชันช่วยจัดการ "วัน" ของแบบฝึกหัด (ใช้เวลาท้องถิ่นของเครื่อง ไม่ใช่ UTC)
// =====================================================================
const pad2 = (n: number) => String(n).padStart(2, '0')
const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const parseDateStr = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (s: string, n: number) => {
  const d = parseDateStr(s)
  d.setDate(d.getDate() + n)
  return toLocalDateStr(d)
}
// วันของชุดโจทย์ = target_date (ถ้าครูกำหนด) ไม่งั้นใช้วันที่สร้าง
const getSetDate = (set: any): string => {
  if (set.target_date) return String(set.target_date).slice(0, 10)
  if (set.created_at) return toLocalDateStr(new Date(set.created_at))
  return ''
}
const formatThaiDate = (s: string, options: Intl.DateTimeFormatOptions) =>
  s ? parseDateStr(s).toLocaleDateString('th-TH', options) : ''

// =====================================================================
// 🎨 ระบบดึงพื้นหลังของตัวละครที่เลือกจากหน้าโปรไฟล์ & แต่งตัว
// รองรับทั้ง equip.bg (design.css / design.colors / image_url / pattern / shape),
// fallback จากคอลัมน์ equipped_bg ในตาราง users และโหมด portrait
// =====================================================================
type AvatarCfg = ReturnType<typeof readAvatarConfig>

type ResolvedAvatarBg = {
  imageUrl: string | null
  cssBackground: string | null
  patternType: 'chalkboard' | 'stars' | 'grid' | 'aurora' | null
  isPortraitMode: boolean
  hasBg: boolean
}

function resolveAvatarBackground(
  config: AvatarCfg | null | undefined,
  fallbackBgKey?: string | null,
  shopBgMap?: Record<string, any>
): ResolvedAvatarBg {
  const cfg: any = config || {}
  const bgEquip = cfg.equip?.bg
  const fallbackItem = !bgEquip && fallbackBgKey && shopBgMap ? shopBgMap[fallbackBgKey] : null
  const shopItemByKey = bgEquip?.key && shopBgMap ? shopBgMap[bgEquip.key] : null

  const bgDesign = ((bgEquip?.d || shopItemByKey?.design || fallbackItem?.design || {}) as Record<string, any>)
  const bgKey = String(bgEquip?.key || fallbackBgKey || '').toLowerCase()
  const bgName = String(bgEquip?.name || fallbackItem?.item_name || '').toLowerCase()

  const isPortraitMode = cfg.mode === 'portrait' && !!cfg.portrait

  const imageUrl: string | null =
    bgEquip?.image_url ||
    bgDesign.image_url ||
    bgDesign.imageUrl ||
    bgDesign.url ||
    bgDesign.image ||
    bgDesign.bg_url ||
    bgDesign.bgUrl ||
    shopItemByKey?.image_url ||
    fallbackItem?.image_url ||
    (isPortraitMode ? cfg.portrait : null)

  const colors: string[] | undefined = Array.isArray(bgDesign.colors) ? bgDesign.colors : undefined
  const cssRaw = typeof bgDesign.css === 'string' && bgDesign.css.trim() ? bgDesign.css.trim() : null
  const cssBackground: string | null =
    cssRaw ||
    (colors && colors.length >= 2
      ? `linear-gradient(135deg, ${colors.join(', ')})`
      : colors && colors.length === 1
      ? colors[0]
      : null)

  const shape = String(bgDesign.shape || bgDesign.pattern || bgDesign.style || bgKey).toLowerCase()

  let patternType: ResolvedAvatarBg['patternType'] = null
  if (
    shape.includes('chalk') ||
    shape.includes('board') ||
    shape.includes('math') ||
    bgName.includes('กระดานดำ')
  ) {
    patternType = 'chalkboard'
  } else if (
    shape.includes('star') ||
    shape.includes('galaxy') ||
    shape.includes('space') ||
    shape.includes('night') ||
    bgName.includes('อวกาศ') ||
    bgName.includes('ดาว') ||
    bgName.includes('จักรวาล')
  ) {
    patternType = 'stars'
  } else if (
    shape.includes('grid') ||
    shape.includes('cyber') ||
    shape.includes('neon') ||
    bgName.includes('ไซเบอร์') ||
    bgName.includes('ตาราง')
  ) {
    patternType = 'grid'
  } else if (
    shape.includes('aurora') ||
    shape.includes('magic') ||
    bgName.includes('ออโรร่า') ||
    bgName.includes('เวทมนตร์')
  ) {
    patternType = 'aurora'
  }

  const hasBg = !!(imageUrl || cssBackground || patternType || bgEquip || fallbackItem)

  return {
    imageUrl,
    cssBackground,
    patternType,
    isPortraitMode,
    hasBg,
  }
}

function AvatarBgLayer({ bg }: { bg: ResolvedAvatarBg }) {
  if (!bg.hasBg) return null

  return (
    <>
      {bg.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg.imageUrl}
          //alt="avatar background"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
        />
      )}

      {!bg.imageUrl && bg.patternType === 'chalkboard' && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundColor: bg.cssBackground ? undefined : '#1e3a2f',
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.22) 1px, transparent 0), linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '18px 18px, 12px 12px, 12px 12px',
          }}
        />
      )}

      {!bg.imageUrl && bg.patternType === 'stars' && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundColor: bg.cssBackground ? undefined : '#0f172a',
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.85) 1px, transparent 0), radial-gradient(rgba(199,210,254,0.55) 1.5px, transparent 0)',
            backgroundSize: '20px 20px, 31px 31px',
            backgroundPosition: '0 0, 11px 15px',
          }}
        />
      )}

      {!bg.imageUrl && bg.patternType === 'grid' && (
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-45"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.28) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />
      )}

      {!bg.imageUrl && bg.patternType === 'aurora' && (
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-65"
          style={{
            background:
              bg.cssBackground ||
              'radial-gradient(circle at 20% 20%, #34d399 0%, transparent 55%), radial-gradient(circle at 80% 75%, #818cf8 0%, #1e1b4b 85%)',
          }}
        />
      )}
    </>
  )
}

// =====================================================================
// 🕯️ กรอบโปรไฟล์ตามที่เลือก + แสงค่อยๆ สว่างแล้วดับช้าๆ (สบายตา ไม่ตาลาย)
// =====================================================================
function FramedAvatarBox({
  config,
  fallbackFrame,
  fallbackBg,
  shopBgMap,
  sizeClass = 'w-16 h-20 sm:w-20 sm:h-24',
  animate = false,
  badge,
}: {
  config: AvatarCfg
  fallbackFrame?: string | null
  fallbackBg?: string | null
  shopBgMap?: Record<string, any>
  sizeClass?: string
  animate?: boolean
  badge?: React.ReactNode
}) {
  const frameDesign = config.equip?.frame?.d
  const frameStyle = frameDesign?.style || (fallbackFrame ? 'glow' : 'solid')
  const [c1, c2, c3] = frameDesign?.colors || ['#e0e7ff', '#c7d2fe', '#818cf8']
  const hasCustomFrame = !!config.equip?.frame || !!fallbackFrame
  const hasSoftGlow = hasCustomFrame && (frameStyle === 'glow' || frameStyle === 'rainbow')

  const bgInfo = resolveAvatarBackground(config, fallbackBg, shopBgMap)

  const borderBackground = !hasCustomFrame
    ? 'linear-gradient(135deg, #e0e7ff, #f3e8ff)'
    : frameStyle === 'rainbow'
    ? 'linear-gradient(135deg, #f59e0b, #ec4899, #6366f1, #10b981)'
    : `linear-gradient(135deg, ${c1}, ${c2 || c1}, ${c3 || c2 || c1})`

  const boxInlineStyle: React.CSSProperties | undefined =
    !bgInfo.imageUrl && bgInfo.cssBackground
      ? { background: bgInfo.cssBackground }
      : bgInfo.patternType === 'chalkboard'
      ? { backgroundColor: '#1e3a2f' }
      : bgInfo.patternType === 'stars'
      ? { backgroundColor: '#0f172a' }
      : undefined

  return (
    <div className={`relative ${sizeClass} shrink-0`}>
      <style>{`
        @keyframes kcSoftFrameBreath {
          0%, 100% {
            opacity: 0.12;
            transform: scale(0.99);
          }
          50% {
            opacity: 0.65;
            transform: scale(1.02);
          }
        }
      `}</style>

      {hasSoftGlow && (
        <div
          className="absolute -inset-1 rounded-[22px] blur-md pointer-events-none"
          style={{
            background: borderBackground,
            animation: 'kcSoftFrameBreath 4.5s ease-in-out infinite',
          }}
        />
      )}

      <div
        className="relative w-full h-full rounded-2xl p-[3.5px] shadow-sm"
        style={{ background: borderBackground }}
      >
        <div
          className="relative w-full h-full rounded-[13px] overflow-hidden bg-white"
          style={boxInlineStyle}
        >
          <AvatarBgLayer bg={bgInfo} />

          {!bgInfo.isPortraitMode && (
            <CharacterSvg config={config} animate={animate} className="relative z-10 w-full h-full" />
          )}
          {badge}
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// 🔍 เอาเมาส์ชี้ (หรือแตะบนมือถือ) แล้วขยายตัวละครให้เห็นการแต่งตัวชัดๆ
// =====================================================================
function HoverZoomAvatar({
  children,
  zoom,
  name,
  subtitle,
}: {
  children: React.ReactNode
  zoom: React.ReactNode
  name?: string
  subtitle?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="relative shrink-0 cursor-zoom-in"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
    >
      {children}
      {open && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 z-50 pointer-events-none flex flex-col items-center gap-2 bg-white rounded-3xl p-3 shadow-2xl border-2 border-indigo-200">
          {zoom}
          {name && <p className="text-sm font-black text-gray-800 max-w-[12rem] truncate">{name}</p>}
          {subtitle && <p className="text-[11px] font-bold text-purple-600 max-w-[12rem] truncate">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}

type Completion = { stars: number; score: number; total: number }
const EMPTY_COMPLETION: Completion = { stars: 0, score: 0, total: 0 }

// สถานะ 3 ระดับ: ยังไม่ทำ / ทำแล้วแต่ยังไม่เต็ม / เต็ม 100%
const getProgress = (comp: Completion) => {
  const isPerfect = comp.total > 0 && comp.score >= comp.total
  const isInProgress = comp.score > 0 && !isPerfect
  const missingPoints = Math.max(0, comp.total - comp.score)
  return { isPerfect, isInProgress, missingPoints }
}

export default function StudentDashboard() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [problemSets, setProblemSets] = useState<any[]>([])
  const [completions, setCompletions] = useState<{ [setId: string]: { stars: number; score: number; total: number } }>({})
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [shopBgMap, setShopBgMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const [sosPendingCount, setSosPendingCount] = useState(0)
  const [specialSetIds, setSpecialSetIds] = useState<string[]>([])
  const [completionsBySet, setCompletionsBySet] = useState<Record<string, any[]>>({})

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [statusTab, setStatusTab] = useState<'todo' | 'perfect' | 'all'>('todo')
  const [showAllSets, setShowAllSets] = useState(false)
  const [todayStr, setTodayStr] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [viewMode, setViewMode] = useState<'day' | 'backlog'>('day')
  const [unreadCount, setUnreadCount] = useState(0)

  // ---- Streak / กล่องของขวัญ ----
  const [streakInfo, setStreakInfo] = useState<any>(null)
  const [showGift, setShowGift] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [giftResult, setGiftResult] = useState<{ coins: number; xp: number } | null>(null)
  const [giftError, setGiftError] = useState('')
  const [showStreakSettings, setShowStreakSettings] = useState(false)
  const [setDaysInput, setSetDaysInput] = useState('')
  const [setCoinsInput, setSetCoinsInput] = useState('')
  const [setXpInput, setSetXpInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showLevels, setShowLevels] = useState(false)
  const currentLevelRowRef = useRef<HTMLDivElement | null>(null)

  // เปิดตารางเลเวลแล้วเลื่อนไปที่เลเวลปัจจุบันของเด็กให้เอง
  useEffect(() => {
    if (!showLevels) return
    const timer = setTimeout(() => currentLevelRowRef.current?.scrollIntoView({ block: 'center' }), 60)
    return () => clearTimeout(timer)
  }, [showLevels])
  const [historyList, setHistoryList] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savingStreakSettings, setSavingStreakSettings] = useState(false)

  useEffect(() => {
    const t = toLocalDateStr(new Date())
    setTodayStr(t)
    setSelectedDate(t)
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem('kidscoddy_user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const userData = JSON.parse(storedUser)
    setStudent(userData)

    if (userData.group_name) {
      setSelectedGroup(userData.group_name)
    }

    fetchDashboardData(userData.id)
    fetchCompletionsData()
  }, [router])

  const fetchDashboardData = async (userId: string) => {
    try {
      const [{ data: latestUser }, { data: bgItems }] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('shop_items').select('item_key, item_name, design, image_url').eq('item_type', 'bg'),
      ])

      if (bgItems) {
        const bgLookup: Record<string, any> = {}
        bgItems.forEach((it) => {
          bgLookup[it.item_key] = it
        })
        setShopBgMap(bgLookup)
      }

      if (latestUser) {
        setStudent(latestUser)
        localStorage.setItem('kidscoddy_user', JSON.stringify(latestUser))
      }

      // สถานะ Streak: ถ้ามีกล่องของขวัญค้างอยู่ให้เด้งขึ้นมาเลย
      const sInfo = await refreshStreak(userId)
      if (sInfo?.pending > 0) setShowGift(true)

      const { data: specialQuestsData } = await supabase
        .from('special_quests')
        .select('target_set_id')
        .eq('is_active', true)

      if (specialQuestsData) {
        const ids = specialQuestsData.map((q) => q.target_set_id).filter(Boolean)
        setSpecialSetIds(ids)
      }

      const { data: setsData } = await supabase
        .from('problem_sets')
        .select('*')
        .order('created_at', { ascending: false })

      setProblemSets(setsData || [])

      const { data: allProbs } = await supabase
        .from('problems')
        .select('id, set_id')

      const probCountMap: { [setId: string]: number } = {}
      if (allProbs) {
        allProbs.forEach((p) => {
          probCountMap[p.set_id] = (probCountMap[p.set_id] || 0) + 1
        })
      }

      const { data: compData } = await supabase
        .from('set_completions')
        .select('set_id, stars, score, total_questions')
        .eq('user_id', userId)

      const compMap: { [key: string]: { stars: number; score: number; total: number } } = {}

      if (setsData) {
        setsData.forEach((set) => {
          compMap[set.id] = {
            stars: 0,
            score: 0,
            total: probCountMap[set.id] || 0,
          }
        })
      }

      if (compData) {
        compData.forEach((item) => {
          if (compMap[item.set_id]) {
            compMap[item.set_id].stars = item.stars || 0
            compMap[item.set_id].score = item.score || 0
            compMap[item.set_id].total = probCountMap[item.set_id] || item.total_questions || 0
          }
        })
      }
      setCompletions(compMap)

      const { data: allStudents } = await supabase
        .from('users')
        .select('id, display_name, group_name, xp, level, streak_days, avatar_config, avatar_url, avatar_frame, equipped_title, equipped_hat, equipped_glasses, equipped_bg')
        .eq('role', 'student')

      if (allStudents) {
        const rankedList = allStudents.sort((a, b) => (b.xp || 0) - (a.xp || 0))
        setLeaderboard(rankedList)
      }

      if (latestUser?.role === 'admin') {
        const { count: sosCount } = await supabase
          .from('student_sos_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        setSosPendingCount(sosCount || 0)
      }

      const { count } = await supabase
        .from('student_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false)

      setUnreadCount(count || 0)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================================
  // 🏅 ดึงรายชื่อคนที่ทำเสร็จของแต่ละชุดโจทย์ (สำหรับแบนเนอร์ใต้การ์ด)
  //  - เรียงตาม "เวลาที่ทำเสร็จ" จากเร็วสุด -> ช้าสุด (คนทำก่อนอยู่ก่อน)
  //  - ดึงเป็นหน้าๆ (Supabase ตัดที่ 1,000 แถว/ครั้ง ทำให้บางชุดหายไป)
  //  - ไม่ JOIN ตาราง users (ถ้า RLS/คอลัมน์ผิด ทั้ง query จะพังหรือแถวหาย)
  //  - 1 คน/1 ชุด แสดงครั้งเดียว (ใช้คะแนนที่ดีที่สุด แต่ลำดับตามเวลาที่ทำครั้งแรก)
  // =====================================================================
  const refreshStreak = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_streak_status', { p_user_id: userId })
      if (error) throw error
      if (data?.ok) {
        setStreakInfo(data)
        return data
      }
    } catch (err) {
      console.error('Streak status error:', err)
    }
    return null
  }

  const claimGift = async () => {
    if (!student || claiming) return
    setClaiming(true)
    setGiftError('')
    try {
      const { data, error } = await supabase.rpc('claim_streak_reward', { p_user_id: student.id })
      if (error) throw error
      if (!data?.ok) {
        setGiftError(data?.error === 'nothing_to_claim' ? 'รับรางวัลนี้ไปแล้วนะ' : 'รับรางวัลไม่สำเร็จ ลองใหม่อีกครั้ง')
        await refreshStreak(student.id)
        return
      }
      const updated = { ...student, coins: data.coins, xp: data.xp, level: data.level }
      setStudent(updated)
      localStorage.setItem('kidscoddy_user', JSON.stringify(updated))
      setGiftResult({ coins: data.reward, xp: data.reward_xp })
      await refreshStreak(student.id)
    } catch (err) {
      console.error('Claim error:', err)
      setGiftError('รับรางวัลไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setClaiming(false)
    }
  }

  const openHistory = async () => {
    if (!student) return
    setShowHistory(true)
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase.rpc('get_streak_reward_history', { p_user_id: student.id })
      if (error) throw error
      setHistoryList(data?.items || [])
    } catch (err) {
      console.error('History error:', err)
      setHistoryList([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const closeGift = () => {
    setShowGift(false)
    setGiftResult(null)
    setGiftError('')
  }

  const saveStreakSettings = async () => {
    if (!student) return
    const d = Math.round(Number(setDaysInput))
    const c = Math.round(Number(setCoinsInput))
    const x = Math.round(Number(setXpInput))
    if (!Number.isFinite(d) || d < 1 || !Number.isFinite(c) || c < 0 || !Number.isFinite(x) || x < 0) {
      alert('จำนวนวันต้อง ≥ 1 ส่วนคอยน์และ XP ต้อง ≥ 0')
      return
    }
    setSavingStreakSettings(true)
    try {
      const { data, error } = await supabase.rpc('admin_set_streak_settings', {
        p_admin_id: student.id,
        p_days: d,
        p_coins: c,
        p_xp: x,
      })
      if (error) throw error
      if (!data?.ok) {
        alert(data?.error === 'not_admin' ? 'เฉพาะแอดมินเท่านั้น' : 'บันทึกไม่สำเร็จ: ' + data?.error)
        return
      }
      await refreshStreak(student.id)
      setShowStreakSettings(false)
    } catch (err) {
      console.error('Save streak settings error:', err)
      alert('บันทึกไม่สำเร็จ')
    } finally {
      setSavingStreakSettings(false)
    }
  }

  const fetchCompletionsData = async () => {
    try {
      const PAGE = 1000
      let rows: any[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('set_completions')
          .select('set_id, user_id, score, total_questions, completed_at')
          .order('completed_at', { ascending: true })
          .order('user_id', { ascending: true })
          .range(from, from + PAGE - 1)

        if (error) throw error
        if (!data || data.length === 0) break
        rows = rows.concat(data)
        if (data.length < PAGE) break
      }

      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))
      const userMap: Record<string, any> = {}
      for (let i = 0; i < userIds.length; i += 100) {
        const { data: us, error: uErr } = await supabase
          .from('users')
          .select('id, display_name, avatar_config, avatar_url, avatar_frame, equipped_title, equipped_hat, equipped_glasses, equipped_bg')
          .in('id', userIds.slice(i, i + 100))
        if (uErr) throw uErr
        ;(us || []).forEach((u) => {
          userMap[u.id] = u
        })
      }

      // รวมต่อ (ชุดโจทย์ + นักเรียน) -> คงลำดับตามเวลาที่ทำเสร็จครั้งแรก
      const grouped: Record<string, any[]> = {}
      const seen: Record<string, any> = {}
      rows.forEach((item) => {
        const user = userMap[item.user_id]
        if (!user) {
          console.warn('ไม่พบข้อมูลนักเรียนของ completion:', item.user_id)
          return
        }
        const key = `${item.set_id}|${item.user_id}`
        const score = item.score || 0
        const isPerfect = item.total_questions > 0 && score >= item.total_questions

        if (seen[key]) {
          if (score > seen[key].coinsEarned) seen[key].coinsEarned = score
          if (isPerfect) seen[key].isPerfect = true
          return
        }
        const entry = {
          ...user,
          coinsEarned: score,
          isPerfect,
          completedAt: item.completed_at,
        }
        seen[key] = entry
        if (!grouped[item.set_id]) grouped[item.set_id] = []
        grouped[item.set_id].push(entry)
      })

      setCompletionsBySet(grouped)
    } catch (err) {
      console.error('Error fetching completions:', err)
    }
  }

  const baseSets = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return problemSets.filter((set) => {
      if (specialSetIds.includes(set.id)) return false

      const setGroup = set.target_group || set.grade_level || 'ทั่วไป'
      const matchesSearch =
        set.title.toLowerCase().includes(q) ||
        (set.description && set.description.toLowerCase().includes(q))
      const matchesGroup =
        selectedGroup === 'all' || setGroup === selectedGroup || setGroup === 'ทั่วไป'

      return !!matchesSearch && matchesGroup
    })
  }, [problemSets, specialSetIds, searchQuery, selectedGroup])

  const dateSummary = useMemo(() => {
    const map: Record<string, { total: number; perfect: number }> = {}
    baseSets.forEach((set) => {
      const d = getSetDate(set)
      if (!d) return
      if (!map[d]) map[d] = { total: 0, perfect: 0 }
      map[d].total += 1
      if (getProgress(completions[set.id] || EMPTY_COMPLETION).isPerfect) map[d].perfect += 1
    })
    return map
  }, [baseSets, completions])

  const sortedDates = useMemo(() => Object.keys(dateSummary).sort(), [dateSummary])
  const activeDate = selectedDate || todayStr
  const daySummary = dateSummary[activeDate] || { total: 0, perfect: 0 }
  const prevHomeworkDate = [...sortedDates].reverse().find((d) => d < activeDate)
  const nextHomeworkDate = sortedDates.find((d) => d > activeDate)

  const backlogSets = useMemo(() => {
    if (!todayStr) return []
    return baseSets.filter((set) => {
      const d = getSetDate(set)
      return d && d < todayStr && !getProgress(completions[set.id] || EMPTY_COMPLETION).isPerfect
    })
  }, [baseSets, completions, todayStr])
  const backlogDayCount = useMemo(
    () => new Set(backlogSets.map((set) => getSetDate(set))).size,
    [backlogSets]
  )

  const isAdmin = student?.role === 'admin'
  const handleChangeSetDate = async (setId: string, newDate: string) => {
    const { error } = await supabase.from('problem_sets').update({ target_date: newDate }).eq('id', setId)
    if (error) {
      alert(`เปลี่ยนวันไม่สำเร็จ: ${error.message}`)
      return
    }
    setProblemSets((prev) => prev.map((s) => (s.id === setId ? { ...s, target_date: newDate } : s)))
  }

  const goToDate = (d: string) => {
    setSelectedDate(d)
    setViewMode('day')
    setShowAllSets(false)
  }

  const filteredProblemSets = useMemo(() => {
    let list: any[]
    if (viewMode === 'backlog') {
      list = backlogSets
    } else {
      list = baseSets.filter((set) => {
        if (getSetDate(set) !== activeDate) return false
        const { isPerfect } = getProgress(completions[set.id] || EMPTY_COMPLETION)
        if (statusTab === 'todo') return !isPerfect
        if (statusTab === 'perfect') return isPerfect
        return true
      })
    }

    const rank = (set: any) => {
      const p = getProgress(completions[set.id] || EMPTY_COMPLETION)
      return p.isInProgress ? 0 : p.isPerfect ? 2 : 1
    }
    return [...list].sort((a, b) => {
      const diff = rank(a) - rank(b)
      if (diff !== 0) return diff
      const dateDiff = getSetDate(b).localeCompare(getSetDate(a))
      if (dateDiff !== 0) return dateDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [baseSets, backlogSets, viewMode, activeDate, statusTab, completions])

  const displayedProblemSets = showAllSets ? filteredProblemSets : filteredProblemSets.slice(0, 4)
  const hasFilter = searchQuery.trim() !== '' || selectedGroup !== 'all'
  const dayProgressPct = daySummary.total > 0 ? (daySummary.perfect / daySummary.total) * 100 : 0

  const studentConfig = useMemo(() => readAvatarConfig(student), [student])
  const studentBg = useMemo(
    () => resolveAvatarBackground(studentConfig, student?.equipped_bg, shopBgMap),
    [studentConfig, student?.equipped_bg, shopBgMap]
  )

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดภารกิจของคุณ...</div>
  }

  const currentXP = student?.xp || 0
  const currentLevel = student?.level || 1
  const xpInThisLevel = currentXP % 50
  const xpPercentage = (xpInThisLevel / 50) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-200">
              KC
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">KidsCoddy Math</h1>
              <p className="text-xs text-indigo-600 font-bold">ยินดีต้อนรับ, {student?.display_name} ({student?.group_name})</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {student?.role === 'admin' && (
              <>
                <button
                  onClick={() => router.push('/admin/exercises')}
                  className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  ⚙️ จัดการข้อสอบ
                </button>
                <button
                  onClick={() => router.push('/admin/quests')}
                  className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  🎯 จัดการเควส
                </button>
                <button
                  onClick={() => router.push('/admin/messages')}
                  className="px-3.5 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  ✉️ ส่งจดหมาย
                </button>

                <button
                  onClick={() => router.push('/admin/sos')}
                  className={`relative px-3.5 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5 ${
                    sosPendingCount > 0
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span>🚨</span>
                  <span>จัดการ SOS</span>
                  {sosPendingCount > 0 && (
                    <span className="w-5 h-5 bg-white text-rose-600 text-[10px] font-black rounded-full flex items-center justify-center shadow">
                      {sosPendingCount}
                    </span>
                  )}
                </button>
              </>
            )}

            <button
              onClick={() => router.push('/quests')}
              className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>🎯</span>
              <span className="hidden sm:inline">ภารกิจพิเศษ</span>
            </button>

            <button
              onClick={() => router.push('/mailbox')}
              className="relative px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <span>📬</span>
              <span className="hidden sm:inline">จดหมาย</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => router.push('/shop')}
              className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              🛒 ร้านค้าไอเทม
            </button>

            <button
              onClick={() => router.push('/profile')}
              className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>🎨</span>
              <span className="hidden sm:inline">โปรไฟล์ & แต่งตัว</span>
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('kidscoddy_user')
                router.push('/login')
              }}
              className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-8 space-y-8">
        {/* ส่วนที่ 1: Gamification Profile Card */}
        <div
          className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-visible"
          style={
            !studentBg.imageUrl && studentBg.cssBackground
              ? { background: studentBg.cssBackground }
              : undefined
          }
        >
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            {studentBg.hasBg && (
              <>
                <AvatarBgLayer bg={studentBg} />
                <div className="absolute inset-0 bg-slate-950/45" />
              </>
            )}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12" />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            {/* แสดงตัวละครเต็มตัว + สัตว์เลี้ยง + กรอบแสงสว่างดับนุ่มๆ */}
            <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
              <div
                onClick={() => router.push('/profile')}
                title="คลิกเพื่อเข้าห้องแต่งตัวละคร"
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <FramedAvatarBox
                  config={studentConfig}
                  fallbackFrame={student?.avatar_frame}
                  fallbackBg={student?.equipped_bg}
                  shopBgMap={shopBgMap}
                  sizeClass="w-32 h-40 sm:w-36 sm:h-44"
                  animate={true}
                  badge={
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-black text-white hover:bg-amber-400 hover:text-gray-900 transition whitespace-nowrap z-20">
                      🎨 แต่งตัว
                    </span>
                  }
                />
              </div>

              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLevels(true)}
                    title="ดูเส้นทางเลเวลทั้งหมด"
                    className="px-3 py-0.5 bg-white/20 hover:bg-white/35 backdrop-blur-md rounded-full text-xs font-extrabold cursor-pointer transition"
                  >
                    ⭐ Level {currentLevel} ▸
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLevels(true)}
                    title="ดูเส้นทางเลเวลทั้งหมด"
                    className="text-xs font-bold text-purple-200 hover:text-white cursor-pointer transition"
                  >
                    {resolveDisplayTitle(student, studentConfig, currentLevel)}
                  </button>
                </div>
                <h2 className="text-xl md:text-2xl font-black">
                  สู้ๆ นะครับ, {student?.display_name}! 🚀
                </h2>
                <p className="text-xs text-purple-100">
                  สะสม XP เลเวลอัป และเก็บ Coins ไปแต่งตัวและแลกรางวัลกัน! (คลิกที่ตัวละครเพื่อแต่งตัว)
                </p>
              </div>
            </div>

            {/* สถิติ Streak, Coins, XP */}
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              <div
                onClick={() => {
                  if ((streakInfo?.pending || 0) > 0) setShowGift(true)
                }}
                className={`relative bg-white/15 backdrop-blur-md border border-white/25 px-3 py-2.5 rounded-2xl flex flex-col items-center justify-center text-center ${
                  (streakInfo?.pending || 0) > 0 ? 'cursor-pointer ring-2 ring-yellow-300 animate-pulse' : ''
                }`}
              >
                <span className="text-xl animate-pulse">🔥</span>
                <span className="text-[10px] uppercase tracking-wider text-amber-200 font-extrabold mt-0.5">Streak</span>
                <span className="text-sm font-black">{student?.streak_days || 0} วัน</span>
                {streakInfo && (
                  <span className="text-[10px] font-bold text-amber-100 mt-0.5">
                    {streakInfo.pending > 0 ? '🎁 กดรับรางวัล!' : `อีก ${streakInfo.days_to_next} วัน 🎁`}
                  </span>
                )}
                {streakInfo && (
                  <button
                    type="button"
                    title="ประวัติการรับรางวัล"
                    onClick={(e) => {
                      e.stopPropagation()
                      openHistory()
                    }}
                    className="absolute top-1 left-1 w-6 h-6 rounded-lg bg-white/25 hover:bg-white/40 text-[11px] cursor-pointer"
                  >
                    📜
                  </button>
                )}
                {student?.role === 'admin' && streakInfo && (
                  <button
                    type="button"
                    title="ตั้งค่ารางวัล Streak"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSetDaysInput(String(streakInfo.days_per_reward))
                      setSetCoinsInput(String(streakInfo.reward_coins))
                      setSetXpInput(String(streakInfo.reward_xp ?? 0))
                      setShowStreakSettings(true)
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/25 hover:bg-white/40 text-[11px] cursor-pointer"
                  >
                    ⚙️
                  </button>
                )}
              </div>

              <div className="bg-white/15 backdrop-blur-md border border-white/25 px-3 py-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                <CoinIcon className="w-6 h-6 shrink-0 drop-shadow" />
                <span className="text-[10px] uppercase tracking-wider text-yellow-200 font-extrabold mt-0.5">เหรียญ</span>
                <span className="text-sm font-black">{student?.coins || 0}</span>
              </div>

              <div className="bg-white/15 backdrop-blur-md border border-white/25 px-3 py-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-xl">✨</span>
                <span className="text-[10px] uppercase tracking-wider text-purple-200 font-extrabold mt-0.5">XP</span>
                <span className="text-sm font-black">{currentXP}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 relative z-10">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span>หลอดเลเวล {currentLevel} (XP สะสมในเลเวลนี้)</span>
              <span>{xpInThisLevel} / 50 XP</span>
            </div>
            <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden p-0.5 backdrop-blur-xs">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(xpPercentage, 100)}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowLevels(true)}
              className="mt-2 text-[11px] font-extrabold text-amber-200 hover:text-white underline-offset-2 hover:underline cursor-pointer"
            >
              🗺️ ดูเส้นทางเลเวล: แต่ละเลเวลได้ฉายาอะไร ต้องสะสม XP เท่าไหร่
            </button>
          </div>
        </div>

        {/* ภารกิจพิเศษ */}
        <div
          onClick={() => router.push('/quests')}
          className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl cursor-pointer hover:scale-[1.01] transition transform flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12 pointer-events-none" />

          <div className="flex items-center space-x-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner shrink-0">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-yellow-300 text-yellow-900 text-[10px] font-black rounded-full">
                  ⭐ ท้าทายพิเศษ
                </span>
                <span className="text-xs text-rose-100 font-bold">รับ Coins & XP จัดเต็ม!</span>
              </div>
              <h3 className="text-lg md:text-xl font-black mt-1">กระดานภารกิจพิเศษ & ของรางวัล</h3>
              <p className="text-xs text-rose-100">คลิกเพื่อดูโจทย์ท้าทายประจำวันและกวาดรางวัลพิเศษกันเถอะ!</p>
            </div>
          </div>

          <div className="px-6 py-3 bg-white text-rose-600 font-black text-xs rounded-2xl shadow-md hover:bg-rose-50 transition relative z-10 shrink-0">
            ลุยภารกิจเลย →
          </div>
        </div>

        {/* ส่วนที่ 2: ภารกิจฝึกฝนคณิตศาสตร์ */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-gray-800">🎯 ภารกิจฝึกฝนคณิตศาสตร์ประจำวัน</h2>
              <p className="text-sm text-gray-500">ภารกิจของวันนี้ขึ้นให้อัตโนมัติ เลือกดูการบ้านวันอื่นย้อนหลังหรือล่วงหน้าได้ด้านล่าง</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
              {viewMode === 'backlog' ? 'ภารกิจค้างทั้งหมด' : 'พบในวันนี้'} {filteredProblemSets.length} ชุด
            </span>
          </div>

          <div className="bg-white/95 backdrop-blur-sm p-5 md:p-6 rounded-3xl shadow-sm border border-indigo-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => prevHomeworkDate && goToDate(prevHomeworkDate)}
                  disabled={!prevHomeworkDate}
                  title="ไปวันก่อนหน้าที่มีการบ้าน"
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-indigo-100 text-indigo-700 font-black transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ◀
                </button>
                <div className="text-center px-2 min-w-[12rem]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-base md:text-lg font-black text-gray-800">
                      {formatThaiDate(activeDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-0.5 text-[10px] font-black rounded-full ${
                      activeDate === todayStr
                        ? 'bg-indigo-600 text-white'
                        : activeDate < todayStr
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {activeDate === todayStr ? '📍 วันนี้' : activeDate < todayStr ? '🕘 วันที่ผ่านมา' : '🔮 ล่วงหน้า'}
                  </span>
                </div>
                <button
                  onClick={() => nextHomeworkDate && goToDate(nextHomeworkDate)}
                  disabled={!nextHomeworkDate}
                  title="ไปวันถัดไปที่มีการบ้าน"
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-indigo-100 text-indigo-700 font-black transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ▶
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={activeDate}
                  onChange={(e) => e.target.value && goToDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                />
                <button
                  onClick={() => goToDate(todayStr)}
                  disabled={activeDate === todayStr && viewMode === 'day'}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  กลับมาวันนี้
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-gray-600">
                  {daySummary.total > 0
                    ? `ทำเต็ม 100% แล้ว ${daySummary.perfect} / ${daySummary.total} ชุด`
                    : 'ไม่มีการบ้านในวันที่เลือก'}
                </span>
                {daySummary.total > 0 && daySummary.perfect === daySummary.total && (
                  <span className="text-emerald-600">🎉 ครบทุกชุดแล้ว!</span>
                )}
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${dayProgressPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="grid grid-cols-7 gap-1.5">
                {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                  const d = addDays(activeDate, offset)
                  const sum = dateSummary[d]
                  const isActive = d === activeDate && viewMode === 'day'
                  const isToday = d === todayStr
                  const allDone = !!sum && sum.total > 0 && sum.perfect === sum.total

                  return (
                    <button
                      key={d}
                      onClick={() => goToDate(d)}
                      className={`flex flex-col items-center py-2 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md'
                          : isToday
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-100'
                      }`}
                    >
                      <span className="text-[10px] opacity-80">{formatThaiDate(d, { weekday: 'short' })}</span>
                      <span className="text-base font-black leading-tight">{parseDateStr(d).getDate()}</span>
                      <span className="h-4 flex items-center text-[10px]">
                        {!sum ? <span className="opacity-30">·</span> : allDone ? '✅' : `🔥${sum.total - sum.perfect}`}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-gray-400 font-bold mt-2 text-center">
                ✅ ทำเต็มครบแล้ว  •  🔥N = ยังเหลือ N ชุด  •  · = ไม่มีการบ้าน
              </p>
            </div>
          </div>

          {viewMode === 'day' && backlogSets.length > 0 && (
            <button
              onClick={() => {
                setViewMode('backlog')
                setShowAllSets(false)
              }}
              className="w-full flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-2xl text-left transition cursor-pointer"
            >
              <span className="text-sm font-extrabold text-amber-800">
                ⚠️ มีภารกิจค้างจากวันก่อนๆ {backlogSets.length} ชุด (จาก {backlogDayCount} วัน) — ตามเก็บให้ครบนะ!
              </span>
              <span className="text-xs font-black text-amber-700">ดูงานค้าง →</span>
            </button>
          )}

          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-3xl shadow-sm border border-indigo-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <input
              type="text"
              placeholder="🔍 ค้นหาชื่อบทเรียน หรือคำอธิบาย..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-80 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
              {['all', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'].map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    selectedGroup === group
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {group === 'all' ? 'ทุกระดับชั้น' : group}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'day' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap bg-white/90 p-1.5 rounded-2xl border border-indigo-100 shadow-xs gap-1">
                <button
                  onClick={() => { setStatusTab('todo'); setShowAllSets(false) }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    statusTab === 'todo'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>🔥</span>
                  <span>ภารกิจที่ต้องลุย / เก็บให้เต็ม ({daySummary.total - daySummary.perfect})</span>
                </button>

                <button
                  onClick={() => { setStatusTab('perfect'); setShowAllSets(false) }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    statusTab === 'perfect'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>👑</span>
                  <span>พิชิตเต็ม 100% แล้ว ({daySummary.perfect})</span>
                </button>

                <button
                  onClick={() => { setStatusTab('all'); setShowAllSets(false) }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                    statusTab === 'all'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  ทั้งหมด ({daySummary.total})
                </button>
              </div>
            </div>
          )}

          {filteredProblemSets.length === 0 ? (
            <div className="bg-white/85 rounded-3xl p-12 text-center border border-indigo-100 shadow-sm space-y-3">
              <span className="text-4xl">🎉</span>
              <p className="text-gray-700 font-black">ไม่มีภารกิจค้าง หรือทำครบหมดแล้ว!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {displayedProblemSets.map((set) => {
                const comp = completions[set.id] || EMPTY_COMPLETION
                const { isPerfect, isInProgress } = getProgress(comp)

                return (
                  <div
                    key={set.id}
                    className={`p-6 md:p-8 rounded-3xl border transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${
                      isPerfect
                        ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-300 shadow-md'
                        : isInProgress
                        ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 border-transparent shadow-xl shadow-orange-300/60 hover:-translate-y-1 hover:shadow-2xl'
                        : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 border-transparent shadow-xl shadow-indigo-300/60 hover:-translate-y-1 hover:shadow-2xl'
                    }`}
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <span className="px-3.5 py-1 bg-white/90 text-indigo-700 text-xs font-black rounded-full shadow-sm">
                          {set.target_group || 'ทั่วไป'}
                        </span>

                        <div className={`flex flex-col items-end px-3.5 py-1.5 rounded-2xl border shrink-0 ${isPerfect ? 'bg-emerald-50 border-emerald-200' : 'bg-white/95 border-white shadow-md'}`}>
                          <div className={`flex items-center gap-1 font-black text-sm ${isPerfect ? 'text-emerald-700' : 'text-purple-700'}`}>
                            <span>{isPerfect ? '👑' : '✨'}</span>
                            <span>{comp.score || 0} / {comp.total} คะแนน</span>
                          </div>
                        </div>
                      </div>

                      <h3 className={`text-xl md:text-2xl font-black mb-2 ${isPerfect ? 'text-gray-800' : 'text-white'}`}>
                        {set.title}
                      </h3>
                      <p className={`text-sm mb-4 line-clamp-2 ${isPerfect ? 'text-gray-500' : 'text-white/90'}`}>
                        {set.description || 'ไม่มีคำอธิบาย'}
                      </p>

                      {isAdmin && (
                        <div className="mb-4 p-2.5 rounded-2xl bg-white/90">
                          <AssignDateField
                            compact
                            label="📅 วันของการบ้าน"
                            value={getSetDate(set)}
                            onChange={(v) => handleChangeSetDate(set.id, v)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative z-10">
                      <CompletedAvatarsBadge completedUsers={completionsBySet[set.id] || []} />
                    </div>

                    <button
                      onClick={() => router.push(`/practice/${set.id}`)}
                      className={`relative z-10 w-full py-3.5 font-extrabold rounded-2xl shadow-lg transition transform active:scale-95 cursor-pointer text-center ${
                        isPerfect
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-white hover:bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {isPerfect ? '🔄 ทบทวนบทเรียน' : '🚀 เริ่มลุยภารกิจวันนี้!'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ส่วนที่ 3: กระดานผู้นำ (Leaderboard / แรงค์) */}
        <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-md border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-gray-800">🏆 กระดานผู้นำ XP และเลเวล</h3>
              <p className="text-xs text-gray-500">จัดอันดับตามคะแนนประสบการณ์ (XP) สะสมของนักผจญภัยทุกคน</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
              ✨ แรงก์ห้องเรียน
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">ยังไม่มีข้อมูลสถิติเพื่อนในระบบ</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((item, index) => {
                const isMe = item.id === student?.id

                let rankBadge = 'bg-gray-100 text-gray-600'
                if (index === 0) rankBadge = 'bg-amber-400 text-white shadow-md font-black'
                else if (index === 1) rankBadge = 'bg-slate-300 text-white font-black'
                else if (index === 2) rankBadge = 'bg-amber-700 text-white font-black'

                const friendConfig = readAvatarConfig(item)
                const friendTitle = resolveDisplayTitle(item, friendConfig, item.level || 1)

                return (
                  <div
                    key={item.id || index}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                      isMe ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-200 shadow-sm' : 'bg-gray-50/50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${rankBadge}`}>
                        {index + 1}
                      </div>

                      {/* แสดงตัวละครเต็มตัว + เอาเมาส์ชี้เพื่อขยายดูการแต่งตัว */}
                      <HoverZoomAvatar
                        name={item.display_name}
                        subtitle={friendTitle}
                        zoom={
                          <FramedAvatarBox
                            config={friendConfig}
                            fallbackFrame={item.avatar_frame}
                            fallbackBg={item.equipped_bg}
                            shopBgMap={shopBgMap}
                            sizeClass="w-48 h-60 sm:w-56 sm:h-72"
                            animate
                            badge={
                              <span className="absolute bottom-1 right-1 px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-xs font-black z-20">
                                Lv.{item.level || 1}
                              </span>
                            }
                          />
                        }
                      >
                        <FramedAvatarBox
                          config={friendConfig}
                          fallbackFrame={item.avatar_frame}
                          fallbackBg={item.equipped_bg}
                          shopBgMap={shopBgMap}
                          sizeClass="w-16 h-20 sm:w-20 sm:h-24"
                          animate={index < 3}
                          badge={
                            <span className="absolute bottom-0.5 right-0.5 px-1.5 py-0.2 rounded-md bg-indigo-600/90 text-white text-[9px] font-black z-20">
                              Lv.{item.level || 1}
                            </span>
                          }
                        />
                      </HoverZoomAvatar>

                      <div>
                        <h4 className="font-extrabold text-gray-800 text-sm flex items-center gap-2">
                          {item.display_name}
                          {isMe && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">คุณ</span>}
                        </h4>
                        <p className="text-xs text-purple-600 font-bold">
                          {friendTitle} • <span className="text-gray-400">{item.group_name || 'ทั่วไป'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                        <span>🔥</span>
                        <span>{item.streak_days || 0} วัน</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-base">✨</span>
                        <span className="text-sm font-black text-indigo-600">{item.xp || 0} XP</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* 🎁 กล่องของขวัญ Streak */}
      {showGift && streakInfo && (giftResult !== null || streakInfo.pending > 0) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !claiming && closeGift()}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-amber-50 to-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border-4 border-amber-300"
          >
            {giftResult === null ? (
              <>
                <div className="text-7xl animate-bounce">🎁</div>
                <h3 className="text-xl font-black text-gray-800">ขยันมาก! ครบ {streakInfo.days_per_reward} วันแล้ว</h3>
                <p className="text-sm font-bold text-amber-700">
                  มีกล่องของขวัญรอคุณอยู่ รับรางวัล {streakInfo.reward_coins} 🪙 และ {streakInfo.reward_xp ?? 0} ✨ XP
                </p>
                {giftError && <p className="text-xs font-bold text-rose-600">{giftError}</p>}
                <button
                  type="button"
                  onClick={claimGift}
                  disabled={claiming}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-black shadow-lg cursor-pointer"
                >
                  {claiming ? '⏳ กำลังเปิด...' : '🎉 เปิดกล่องของขวัญ'}
                </button>
                <button
                  type="button"
                  onClick={closeGift}
                  disabled={claiming}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  ไว้ก่อน
                </button>
              </>
            ) : (
              <>
                <div className="text-7xl">🎉</div>
                <h3 className="text-xl font-black text-gray-800">ได้รับรางวัลแล้ว!</h3>
                <p className="text-3xl font-black text-amber-600">+{giftResult.coins} 🪙</p>
                <p className="text-2xl font-black text-purple-600">+{giftResult.xp} ✨ XP</p>
                {streakInfo.pending > 0 && (
                  <p className="text-xs font-bold text-purple-600">ยังมีกล่องของขวัญรออีก {streakInfo.pending} กล่อง!</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setGiftResult(null)
                    if (!(streakInfo.pending > 0)) closeGift()
                  }}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer"
                >
                  {streakInfo.pending > 0 ? 'เปิดกล่องถัดไป' : 'เยี่ยมเลย!'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeGift()
                    openHistory()
                  }}
                  className="w-full py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-black cursor-pointer"
                >
                  📜 ดูประวัติการรับรางวัล
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 🗺️ เส้นทางเลเวล 1-100 */}
      {showLevels && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowLevels(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-purple-200 max-h-[88vh] flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-800">🗺️ เส้นทางบำเพ็ญ 100 เลเวล</h3>
              <button
                type="button"
                onClick={() => setShowLevels(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-purple-50 border border-purple-200 px-4 py-3 text-xs font-bold text-purple-800">
              ตอนนี้คุณอยู่ Level {currentLevel} • สะสมแล้ว {currentXP} XP
              {currentLevel < MAX_TITLE_LEVEL
                ? ` • อีก ${currentLevel * XP_PER_LEVEL - currentXP} XP จะเลื่อนเป็น Level ${currentLevel + 1}`
                : ' • ถึงจุดสูงสุดแล้ว 👑'}
            </div>

            <div className="overflow-y-auto pr-1 space-y-1.5">
              {Array.from({ length: MAX_TITLE_LEVEL }, (_, i) => i + 1).map((lv) => {
                const needXp = (lv - 1) * XP_PER_LEVEL
                const isCurrent = lv === currentLevel
                const isPassed = lv < currentLevel
                const realm = getRealmOf(lv)
                const showRealmHeader = lv === 1 || lv % 10 === 1
                const breakthrough = lv % 10 === 0 && lv < MAX_TITLE_LEVEL
                const nextRealm = breakthrough ? getRealmOf(lv + 1) : null
                return (
                  <div key={lv}>
                    {showRealmHeader && (
                      <p className="sticky top-0 z-10 bg-white/95 backdrop-blur py-1.5 text-xs font-black text-indigo-600">
                        {realm.emoji} ภพ{realm.name} (Level {lv}–{Math.min(lv + 9, MAX_TITLE_LEVEL)})
                      </p>
                    )}
                    <div
                      ref={isCurrent ? currentLevelRowRef : undefined}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2 ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
                          : isPassed
                            ? 'border-emerald-200 bg-emerald-50/60'
                            : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-black truncate ${isPassed || isCurrent ? 'text-gray-800' : 'text-gray-500'}`}>
                          Lv.{lv} {getLevelTitle(lv)}
                        </p>
                        {nextRealm && (
                          <p className="text-[11px] font-bold text-purple-600">🎉 ผ่านขั้นนี้แล้วทะลวงสู่ภพ{nextRealm.name}!</p>
                        )}
                        {lv === MAX_TITLE_LEVEL && <p className="text-[11px] font-bold text-amber-600">🏆 จุดสูงสุดของเส้นทางเซียน</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-black text-purple-700">ต้องสะสม {needXp.toLocaleString()} XP</p>
                        <p className="text-[11px] font-bold text-gray-500">
                          {isCurrent ? '◀ คุณอยู่ที่นี่' : isPassed ? '✅ ผ่านแล้ว' : `อีก ${(needXp - currentXP).toLocaleString()} XP`}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 📜 ประวัติการรับกล่องของขวัญ */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowHistory(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-amber-200 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-800">📜 ประวัติกล่องของขวัญ Streak</h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {streakInfo && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-bold text-amber-800 flex items-center justify-between gap-2">
                <span>
                  สะสมแล้ว {streakInfo.streak_days} วัน • ครบทุก {streakInfo.days_per_reward} วัน ได้ {streakInfo.reward_coins} 🪙 + {streakInfo.reward_xp ?? 0} ✨
                </span>
                {streakInfo.pending > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHistory(false)
                      setShowGift(true)
                    }}
                    className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black whitespace-nowrap cursor-pointer"
                  >
                    🎁 รับ {streakInfo.pending} กล่อง
                  </button>
                )}
              </div>
            )}

            <div className="overflow-y-auto space-y-2 pr-1">
              {loadingHistory ? (
                <p className="text-center text-xs font-bold text-gray-400 py-6">⏳ กำลังโหลด...</p>
              ) : historyList.length === 0 ? (
                <p className="text-center text-xs font-bold text-gray-400 py-6">ยังไม่มีประวัติการรับกล่องของขวัญ</p>
              ) : (
                historyList.map((h, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-800">🎁 กล่องที่ {h.box_no}</p>
                      <p className="text-[11px] font-bold text-gray-500">
                        {new Date(h.claimed_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} • สะสม {h.streak_days} วัน
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-amber-600">+{h.coins} 🪙</p>
                      <p className="text-xs font-black text-purple-600">+{h.xp} ✨</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ แอดมิน: ตั้งค่ารางวัล Streak */}
      {showStreakSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !savingStreakSettings && setShowStreakSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-200"
          >
            <h3 className="text-base font-black text-gray-800">⚙️ ตั้งค่ารางวัล Streak</h3>
            <label className="block space-y-1">
              <span className="text-xs font-extrabold text-gray-600">ครบกี่วันได้กล่องของขวัญ</span>
              <input
                type="number"
                min={1}
                value={setDaysInput}
                onChange={(e) => setSetDaysInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-extrabold text-gray-600">คอยน์ที่ได้ต่อ 1 กล่อง</span>
              <input
                type="number"
                min={0}
                value={setCoinsInput}
                onChange={(e) => setSetCoinsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-extrabold text-gray-600">XP ที่ได้ต่อ 1 กล่อง</span>
              <input
                type="number"
                min={0}
                value={setXpInput}
                onChange={(e) => setSetXpInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowStreakSettings(false)}
                disabled={savingStreakSettings}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={saveStreakSettings}
                disabled={savingStreakSettings}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
              >
                {savingStreakSettings ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

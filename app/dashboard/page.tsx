'use client'

import type React from 'react'
import { CompletedAvatarsBadge } from '@/components/AvatarDisplay'
import { CharacterSvg } from '@/components/Character'
import { readAvatarConfig } from '@/lib/avatar'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'
import AssignDateField from '@/components/AssignDateField'

// ฟังก์ชันช่วยแปลงเลเวลเป็นฉายาเท่ๆ
const getLevelTitle = (level: number) => {
  if (level >= 10) return '🧙‍♂️ จอมเวทคณิตศาสตร์ขั้นสูง'
  if (level >= 5) return '⚡ อัศวินสมการผู้พิชิต'
  if (level >= 3) return '🚀 นักผจญภัยตัวเลข'
  return '🌱 นักคำนวณฝึกหัด'
}

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
                  <span className="px-3 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold">
                    ⭐ Level {currentLevel}
                  </span>
                  <span className="text-xs font-bold text-purple-200">
                    {studentConfig.equip?.title?.name || student?.equipped_title || getLevelTitle(currentLevel)}
                  </span>
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
              <div className="bg-white/15 backdrop-blur-md border border-white/25 px-3 py-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-xl animate-pulse">🔥</span>
                <span className="text-[10px] uppercase tracking-wider text-amber-200 font-extrabold mt-0.5">Streak</span>
                <span className="text-sm font-black">{student?.streak_days || 0} วัน</span>
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
                const friendTitle = friendConfig.equip?.title?.name || item.equipped_title || '🌱 นักคำนวณฝึกหัด'

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
    </div>
  )
}
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'
import { CompletedAvatarsBadge } from '@/components/AvatarDisplay'

// =====================================================================
// 📅 ฟังก์ชันช่วยจัดการ "วัน" ของภารกิจ (ใช้เวลาท้องถิ่นของเครื่อง ไม่ใช่ UTC)
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
const formatThaiDate = (s: string, options: Intl.DateTimeFormatOptions) =>
  s ? parseDateStr(s).toLocaleDateString('th-TH', options) : ''

// วันที่เปิดของภารกิจ = start_date (ถ้าไม่มีใช้ created_at) / วันหมดเขต = end_date (ว่าง = ไม่มีหมดเขต)
const getQuestDate = (q: any): string => {
  const raw = q.start_date || q.created_at
  return raw ? toLocalDateStr(new Date(raw)) : ''
}
const getQuestEndDate = (q: any): string => (q.end_date ? toLocalDateStr(new Date(q.end_date)) : '')

// สถานะของภารกิจ: พิชิตแล้ว / ทำได้ตอนนี้ / ยังไม่ถึงวันเปิด / หมดเขตแล้ว
type QuestState = 'done' | 'open' | 'upcoming' | 'expired'
const getQuestState = (q: any, doneIds: string[], today: string): QuestState => {
  if (doneIds.includes(q.id)) return 'done'
  if (!today) return 'open'
  const start = getQuestDate(q)
  const end = getQuestEndDate(q)
  if (start && start > today) return 'upcoming'
  if (end && end < today) return 'expired'
  return 'open'
}

type QuestItem = { quest: any; date: string; state: QuestState }

export default function SpecialQuestsPage() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [quests, setQuests] = useState<any[]>([])
  const [completedQuests, setCompletedQuests] = useState<string[]>([])
  // เก็บรายชื่อเพื่อนที่พิชิตแต่ละภารกิจแล้ว { [questId]: any[] }
  const [questCompletionsByQuest, setQuestCompletionsByQuest] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  // 📅 State สำหรับเลือกดูรายวัน
  const [todayStr, setTodayStr] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [viewMode, setViewMode] = useState<'day' | 'backlog'>('day')
  const [statusTab, setStatusTab] = useState<'todo' | 'done' | 'all'>('todo')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    // กำหนดวันที่ปัจจุบัน (เวลาท้องถิ่น) เฉพาะฝั่ง Client ป้องกัน Error Prerender
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
    fetchQuestsData(userData.id)
  }, [router])

  const fetchQuestsData = async (userId: string) => {
    try {
      // 1. ดึงรายการภารกิจพิเศษทั้งหมดที่เปิดใช้งานอยู่
      const { data: questData } = await supabase
        .from('special_quests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const loadedQuests = questData || []
      setQuests(loadedQuests)

      // 2. ดึงประวัติการทำภารกิจทั้งหมดของนักเรียนทุกคน พร้อมข้อมูลโปรไฟล์
      const { data: allQuestComps } = await supabase
        .from('quest_completions')
        .select(`
          quest_id,
          user_id,
          completed_at,
          users (
            id,
            display_name,
            avatar_url,
            equipped_outfit
          )
        `)
        .order('completed_at', { ascending: true }) // เรียงคนที่พิชิตได้ก่อนขึ้นอันดับ 1

      // 3. ดึงคะแนนจาก set_completions เพื่อมาคำนวณคอยน์รวม (คอยน์จากข้อสอบ + โบนัสเควส)
      const { data: setComps } = await supabase
        .from('set_completions')
        .select('user_id, set_id, score, total_questions')

      // สร้าง Map คะแนนของแต่ละคนในแต่ละชุด
      const scoreMap: Record<string, { score: number; total: number }> = {}
      if (setComps) {
        setComps.forEach((sc) => {
          scoreMap[`${sc.user_id}_${sc.set_id}`] = {
            score: sc.score || 0,
            total: sc.total_questions || 0,
          }
        })
      }

      // 4. จัดกลุ่มรายชื่อผู้พิชิตตาม quest_id และเช็กว่าตัวเราเองทำภารกิจไหนไปแล้วบ้าง
      const myDoneIds: string[] = []
      const groupedByQuest: Record<string, any[]> = {}

      if (allQuestComps) {
        allQuestComps.forEach((item: any) => {
          if (item.user_id === userId) {
            myDoneIds.push(item.quest_id)
          }

          if (!groupedByQuest[item.quest_id]) {
            groupedByQuest[item.quest_id] = []
          }

          const userObj = Array.isArray(item.users) ? item.users[0] : item.users
          const questObj = loadedQuests.find((q) => q.id === item.quest_id)

          if (userObj && questObj) {
            const setScoreInfo = scoreMap[`${item.user_id}_${questObj.target_set_id}`] || { score: 0, total: 0 }
            // คอยน์รวมที่ได้ = คะแนนที่ทำได้ในชุดนั้น + รางวัลคอยน์พิเศษของเควส
            const totalCoinsEarned = setScoreInfo.score + (questObj.reward_coins || 0)

            groupedByQuest[item.quest_id].push({
              ...userObj,
              coinsEarned: totalCoinsEarned,
              isPerfect: setScoreInfo.total > 0 && setScoreInfo.score === setScoreInfo.total,
            })
          }
        })

        // เรียงลำดับคนในแต่ละเควสให้คนที่ได้คอยน์เยอะสุดอยู่หน้าสุด
        Object.keys(groupedByQuest).forEach((qId) => {
          groupedByQuest[qId].sort((a, b) => b.coinsEarned - a.coinsEarned)
        })
      }

      setCompletedQuests(myDoneIds)
      setQuestCompletionsByQuest(groupedByQuest)
    } catch (err) {
      console.error('Error fetching quests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartQuest = (setId: string) => {
    router.push(`/practice/${setId}`)
  }

  // =====================================================================
  // 📅 ตรรกะเลือกดูรายวัน
  // =====================================================================

  // ภารกิจทั้งหมดพร้อมวันที่และสถานะ
  const allItems: QuestItem[] = useMemo(
    () =>
      quests.map((quest) => ({
        quest,
        date: getQuestDate(quest),
        state: getQuestState(quest, completedQuests, todayStr),
      })),
    [quests, completedQuests, todayStr]
  )

  // สรุปรายวัน: ทั้งหมดกี่ภารกิจ / พิชิตแล้ว / ทำได้อยู่
  const dateSummary = useMemo(() => {
    const map: Record<string, { total: number; done: number; open: number }> = {}
    allItems.forEach(({ date, state }) => {
      if (!date) return
      if (!map[date]) map[date] = { total: 0, done: 0, open: 0 }
      map[date].total += 1
      if (state === 'done') map[date].done += 1
      if (state === 'open') map[date].open += 1
    })
    return map
  }, [allItems])

  const sortedDates = useMemo(() => Object.keys(dateSummary).sort(), [dateSummary])
  const activeDate = selectedDate || todayStr
  const daySummary = dateSummary[activeDate] || { total: 0, done: 0, open: 0 }
  // วันก่อนหน้า/ถัดไปที่ "มีภารกิจจริง" (ข้ามวันว่าง)
  const prevQuestDate = [...sortedDates].reverse().find((d) => d < activeDate)
  const nextQuestDate = sortedDates.find((d) => d > activeDate)

  // ⚠️ ภารกิจค้าง = ของวันก่อนวันนี้ ที่ยังทำได้อยู่ (ไม่นับที่หมดเขตแล้ว)
  const backlogItems = useMemo(
    () => (todayStr ? allItems.filter((it) => it.date && it.date < todayStr && it.state === 'open') : []),
    [allItems, todayStr]
  )
  const backlogDayCount = useMemo(() => new Set(backlogItems.map((it) => it.date)).size, [backlogItems])

  const goToDate = (d: string) => {
    setSelectedDate(d)
    setViewMode('day')
    setShowAll(false)
  }

  const filteredItems = useMemo(() => {
    let list: QuestItem[]
    if (viewMode === 'backlog') {
      list = backlogItems
    } else {
      list = allItems.filter((it) => {
        if (it.date !== activeDate) return false
        if (statusTab === 'todo') return it.state !== 'done'
        if (statusTab === 'done') return it.state === 'done'
        return true
      })
    }
    // ทำได้เลย → ยังไม่เปิด → หมดเขต → พิชิตแล้ว
    const rank: Record<QuestState, number> = { open: 0, upcoming: 1, expired: 2, done: 3 }
    return [...list].sort((a, b) => {
      const diff = rank[a.state] - rank[b.state]
      if (diff !== 0) return diff
      const dateDiff = b.date.localeCompare(a.date)
      if (dateDiff !== 0) return dateDiff
      return new Date(b.quest.created_at).getTime() - new Date(a.quest.created_at).getTime()
    })
  }, [allItems, backlogItems, viewMode, activeDate, statusTab])

  const PAGE_SIZE = 4
  const displayedItems = showAll ? filteredItems : filteredItems.slice(0, PAGE_SIZE)
  const dayProgressPct = daySummary.total > 0 ? (daySummary.done / daySummary.total) * 100 : 0
  const todaySummary = dateSummary[todayStr] || { total: 0, done: 0, open: 0 }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังเปิดกระดานภารกิจลับ...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-rose-200">
              🎯
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">KidsCoddy Special Quests</h1>
              <p className="text-xs text-rose-600 font-bold">ภารกิจท้าทายพิเศษ รับรางวัลจัดเต็ม!</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
          >
            🏠 กลับหน้าหลัก
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-6">
        <div className="bg-gradient-to-r from-rose-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black mb-1">🔥 กระดานภารกิจท้าทายประจำวัน</h2>
            <p className="text-xs text-rose-100">
              {todaySummary.total === 0
                ? 'วันนี้ยังไม่มีภารกิจพิเศษ เลือกดูภารกิจวันอื่นได้ด้านล่าง'
                : todaySummary.open > 0
                ? `วันนี้เหลืออีก ${todaySummary.open} ภารกิจ พิชิตเพื่อกวาดเหรียญทองและ XP ไปอัปเกรดตัวละครกัน!`
                : '🎉 วันนี้พิชิตภารกิจครบแล้ว เก่งมาก!'}
            </p>
          </div>
          <span className="text-3xl animate-bounce">⚔️</span>
        </div>

        {/* 📅 การ์ดเลือกวัน */}
        <div className="bg-white/95 backdrop-blur-sm p-5 md:p-6 rounded-3xl shadow-sm border border-indigo-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => prevQuestDate && goToDate(prevQuestDate)}
                disabled={!prevQuestDate}
                title="ไปวันก่อนหน้าที่มีภารกิจ"
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-rose-100 text-rose-700 font-black transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ◀
              </button>
              <div className="text-center px-2 min-w-[12rem]">
                <span className="text-base md:text-lg font-black text-gray-800">
                  {formatThaiDate(activeDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <div>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-0.5 text-[10px] font-black rounded-full ${
                      activeDate === todayStr
                        ? 'bg-rose-600 text-white'
                        : activeDate < todayStr
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {activeDate === todayStr ? '📍 วันนี้' : activeDate < todayStr ? '🕘 วันที่ผ่านมา' : '🔮 ล่วงหน้า'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => nextQuestDate && goToDate(nextQuestDate)}
                disabled={!nextQuestDate}
                title="ไปวันถัดไปที่มีภารกิจ"
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-rose-100 text-rose-700 font-black transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▶
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={activeDate}
                onChange={(e) => e.target.value && goToDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
              />
              <button
                onClick={() => goToDate(todayStr)}
                disabled={activeDate === todayStr && viewMode === 'day'}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                กลับมาวันนี้
              </button>
            </div>
          </div>

          {/* ความคืบหน้าของวันที่เลือก */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-gray-600">
                {daySummary.total > 0
                  ? `พิชิตแล้ว ${daySummary.done} / ${daySummary.total} ภารกิจ`
                  : 'ไม่มีภารกิจในวันที่เลือก'}
              </span>
              {daySummary.total > 0 && daySummary.done === daySummary.total && (
                <span className="text-emerald-600">🎉 พิชิตครบแล้ว!</span>
              )}
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${dayProgressPct}%` }}
              />
            </div>
          </div>

          {/* แถบ 7 วันรอบวันที่เลือก */}
          <div>
            <div className="grid grid-cols-7 gap-1.5">
              {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                const d = addDays(activeDate, offset)
                const sum = dateSummary[d]
                const isActive = d === activeDate && viewMode === 'day'
                const isToday = d === todayStr
                const allDone = !!sum && sum.total > 0 && sum.done === sum.total

                return (
                  <button
                    key={d}
                    onClick={() => goToDate(d)}
                    className={`flex flex-col items-center py-2 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-transparent shadow-md'
                        : isToday
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-100'
                    }`}
                  >
                    <span className="text-[10px] opacity-80">{formatThaiDate(d, { weekday: 'short' })}</span>
                    <span className="text-base font-black leading-tight">{parseDateStr(d).getDate()}</span>
                    <span className="h-4 flex items-center text-[10px]">
                      {!sum ? (
                        <span className="opacity-30">·</span>
                      ) : allDone ? (
                        '✅'
                      ) : sum.open > 0 ? (
                        `🔥${sum.open}`
                      ) : d > todayStr ? (
                        '🔒'
                      ) : (
                        '⌛'
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-2 text-center">
              ✅ พิชิตครบแล้ว &nbsp;•&nbsp; 🔥N = ทำได้อีก N ภารกิจ &nbsp;•&nbsp; 🔒 ยังไม่เปิด &nbsp;•&nbsp; ⌛ หมดเขตแล้ว &nbsp;•&nbsp; · = ไม่มีภารกิจ
            </p>
          </div>
        </div>

        {/* ⚠️ แบนเนอร์ภารกิจค้างจากวันก่อนๆ */}
        {viewMode === 'day' && backlogItems.length > 0 && (
          <button
            onClick={() => {
              setViewMode('backlog')
              setShowAll(false)
            }}
            className="w-full flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-2xl text-left transition cursor-pointer"
          >
            <span className="text-sm font-extrabold text-amber-800">
              ⚠️ มีภารกิจพิเศษค้างจากวันก่อนๆ {backlogItems.length} ภารกิจ (จาก {backlogDayCount} วัน) — ยังทำทันนะ!
            </span>
            <span className="text-xs font-black text-amber-700">ดูภารกิจค้าง →</span>
          </button>
        )}
        {viewMode === 'backlog' && (
          <div className="w-full flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-amber-50 border border-amber-300 rounded-2xl">
            <span className="text-sm font-extrabold text-amber-800">
              📚 กำลังดูภารกิจที่ค้างจากวันก่อนๆ (ยังไม่พิชิต และยังไม่หมดเขต)
            </span>
            <button
              onClick={() => goToDate(todayStr)}
              className="px-3.5 py-2 bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-black rounded-xl transition cursor-pointer"
            >
              ← กลับไปดูรายวัน
            </button>
          </div>
        )}

        {/* แท็บสถานะ — ใช้เฉพาะโหมดรายวัน */}
        {viewMode === 'day' && (
          <div className="flex flex-wrap bg-white/90 p-1.5 rounded-2xl border border-indigo-100 shadow-xs gap-1 w-fit">
            <button
              onClick={() => { setStatusTab('todo'); setShowAll(false) }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusTab === 'todo'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>🔥</span>
              <span>ยังไม่พิชิต ({daySummary.total - daySummary.done})</span>
            </button>
            <button
              onClick={() => { setStatusTab('done'); setShowAll(false) }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusTab === 'done' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>👑</span>
              <span>พิชิตแล้ว ({daySummary.done})</span>
            </button>
            <button
              onClick={() => { setStatusTab('all'); setShowAll(false) }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                statusTab === 'all' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ทั้งหมด ({daySummary.total})
            </button>
          </div>
        )}

        {/* รายการภารกิจ */}
        {filteredItems.length === 0 ? (
          <div className="bg-white/90 rounded-3xl p-12 text-center border border-indigo-100 space-y-3">
            {viewMode === 'backlog' ? (
              <>
                <span className="text-4xl">🎉</span>
                <p className="text-sm font-bold text-gray-600">ไม่มีภารกิจค้างเลย เก่งมาก!</p>
              </>
            ) : daySummary.total === 0 ? (
              <>
                <span className="text-4xl">📭</span>
                <p className="text-sm font-bold text-gray-600">ไม่มีภารกิจพิเศษในวันที่เลือก รอติดตามประกาศจากคุณครูได้เลย!</p>
                {prevQuestDate && (
                  <button
                    onClick={() => goToDate(prevQuestDate)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer"
                  >
                    ไปดูวันล่าสุดที่มีภารกิจ ({formatThaiDate(prevQuestDate, { day: 'numeric', month: 'short' })})
                  </button>
                )}
              </>
            ) : statusTab === 'todo' ? (
              <>
                <span className="text-4xl">🎉</span>
                <p className="text-sm font-bold text-gray-600">เก่งมาก! พิชิตภารกิจครบทุกอันของวันนี้แล้ว</p>
              </>
            ) : (
              <>
                <span className="text-4xl">🎯</span>
                <p className="text-sm font-bold text-gray-600">ยังไม่มีภารกิจที่พิชิต — ลุยกันเลย!</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayedItems.map(({ quest, date, state }) => {
              const isDone = state === 'done'
              const finishers = questCompletionsByQuest[quest.id] || []
              const endDate = getQuestEndDate(quest)

              return (
                <div
                  key={quest.id}
                  className={`bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-sm border flex flex-col justify-between transition group ${
                    isDone
                      ? 'border-emerald-200 bg-emerald-50/15'
                      : state === 'open'
                      ? 'border-indigo-100 hover:shadow-md'
                      : 'border-gray-200 bg-gray-50/60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-extrabold rounded-full">
                          ⭐ ภารกิจพิเศษ
                        </span>
                        {/* โหมดภารกิจค้าง: แสดงวันที่ของภารกิจ กดเพื่อไปดูวันนั้นได้ */}
                        {viewMode === 'backlog' && date && (
                          <button
                            onClick={() => goToDate(date)}
                            title="ไปดูภารกิจวันนั้น"
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-extrabold rounded-full transition cursor-pointer"
                          >
                            📅 {formatThaiDate(date, { day: 'numeric', month: 'short', year: '2-digit' })}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 text-xs font-bold text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-xl border border-yellow-200">
                          <CoinIcon className="w-4 h-4" />
                          <span>+{quest.reward_coins}</span>
                        </div>
                        <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                          ✨ +{quest.reward_xp} XP
                        </div>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-gray-800 pt-1">{quest.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{quest.description || 'ทำภารกิจชุดนี้ให้สำเร็จเพื่อรับรางวัลพิเศษ'}</p>

                    {endDate && !isDone && (
                      <p className={`text-[11px] font-bold ${state === 'expired' ? 'text-gray-400' : 'text-orange-600'}`}>
                        ⏰ หมดเขต {formatThaiDate(endDate, { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                    )}
                  </div>

                  {/* 🏆 แสดงรายชื่อและอวตารของเพื่อนที่พิชิตภารกิจพิเศษนี้แล้ว */}
                  <CompletedAvatarsBadge completedUsers={finishers} />

                  <div>
                    {isDone ? (
                      <div className="w-full py-3 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-2xl text-center border border-emerald-200">
                        ✓ พิชิตภารกิจสำเร็จแล้ว
                      </div>
                    ) : state === 'upcoming' ? (
                      <div className="w-full py-3 bg-sky-50 text-sky-700 text-xs font-extrabold rounded-2xl text-center border border-sky-200">
                        🔒 เปิดให้ทำวันที่ {formatThaiDate(date, { day: 'numeric', month: 'long' })}
                      </div>
                    ) : state === 'expired' ? (
                      <div className="w-full py-3 bg-gray-100 text-gray-500 text-xs font-extrabold rounded-2xl text-center border border-gray-200">
                        ⌛ หมดเขตแล้ว
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartQuest(quest.target_set_id)}
                        className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-extrabold rounded-2xl shadow-md transition cursor-pointer"
                      >
                        🚀 ลุยภารกิจนี้เลย!
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ปุ่มดูเพิ่มเติม / ย่อรายการ */}
        {filteredItems.length > PAGE_SIZE && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-6 py-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-black text-xs rounded-2xl shadow-sm transition cursor-pointer"
            >
              {showAll ? '▲ ย่อรายการให้สั้นลง' : `▼ แสดงภารกิจทั้งหมด (เหลืออีก ${filteredItems.length - PAGE_SIZE} ภารกิจ)`}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
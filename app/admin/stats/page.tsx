'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'
import { AvatarDisplay } from '@/components/AvatarDisplay'
import {
  buildAnalytics,
  buildInsights,
  ERROR_INFO,
  addDays,
  parseDateStr,
  toLocalDateStr,
  matchesGroup,
  getSetDay,
  classifyWrongAnswer,
  type ErrorType,
  type SetResult,
} from '@/lib/statsAnalytics'

// =====================================================================
// ดึงข้อมูลทั้งตารางแบบแบ่งหน้า (Supabase ส่งกลับสูงสุด 1,000 แถวต่อครั้ง)
// =====================================================================
async function fetchAll(table: string, columns = '*', orderBy = 'id', filter?: (q: any) => any): Promise<any[]> {
  const pageSize = 1000
  const out: any[] = []
  let from = 0
  let useOrder = true
  for (;;) {
    let q: any = supabase.from(table).select(columns)
    if (filter) q = filter(q)
    if (useOrder) q = q.order(orderBy, { ascending: true })
    const { data, error } = await q.range(from, from + pageSize - 1)
    if (error) {
      if (useOrder) {
        useOrder = false
        out.length = 0
        from = 0
        continue
      }
      throw error
    }
    out.push(...(data || []))
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return out
}

// =====================================================================
// ตัวช่วยแสดงผล
// =====================================================================
const pctText = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${Math.round(v * 100)}%`)
const formatDay = (s: string, long = false) =>
  s
    ? parseDateStr(s).toLocaleDateString('th-TH', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: '2-digit' })
    : '–'
const tone = (p: number | null) =>
  p === null ? 'bg-gray-300' : p >= 0.9 ? 'bg-emerald-500' : p >= 0.7 ? 'bg-indigo-500' : p >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'
const toneText = (p: number | null) =>
  p === null ? 'text-gray-400' : p >= 0.9 ? 'text-emerald-600' : p >= 0.7 ? 'text-indigo-600' : p >= 0.5 ? 'text-amber-600' : 'text-rose-600'

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function MathText({ text }: { text: string }) {
  return (
    <span className="whitespace-pre-wrap">
      {String(text || '')
        .split('$')
        .map((part, i) => (i % 2 === 1 ? <InlineMath key={i} math={part} /> : <span key={i}>{part}</span>))}
    </span>
  )
}

function Kpi({ icon, label, value, sub, color = 'indigo' }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  const map: Record<string, string> = {
    indigo: 'from-indigo-50 border-indigo-100 text-indigo-700',
    emerald: 'from-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'from-amber-50 border-amber-100 text-amber-700',
    rose: 'from-rose-50 border-rose-100 text-rose-700',
    purple: 'from-purple-50 border-purple-100 text-purple-700',
  }
  return (
    <div className={`bg-gradient-to-br ${map[color]} to-white border rounded-2xl p-4 shadow-xs`}>
      <div className="text-lg">{icon}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
      <div className="text-xs font-extrabold text-gray-600">{label}</div>
      {sub && <div className="text-[11px] font-semibold text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function FlagChip({ level, label }: { level: string; label: string }) {
  const cls =
    level === 'high'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : level === 'mid'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : level === 'good'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-sky-50 text-sky-700 border-sky-200'
  return <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold ${cls}`}>{label}</span>
}

function Card({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white/95 backdrop-blur-sm p-5 md:p-6 rounded-3xl shadow-md border border-indigo-100 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base md:text-lg font-black text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

function AttemptChips({ sub }: { sub: any }) {
  if (!sub) return null
  const att = Number(sub.attempts) || 0
  const toCorrect = sub.attempts_to_correct == null ? null : Number(sub.attempts_to_correct)
  const chip = 'px-2 py-0.5 rounded-md text-[11px] font-extrabold'
  return (
    <span className="flex flex-wrap justify-end gap-1 mt-1">
      {sub.is_correct && toCorrect !== null ? (
        <span className={`${chip} ${toCorrect === 1 ? 'bg-emerald-100 text-emerald-700' : toCorrect <= 3 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'}`}>
          {toCorrect === 1 ? '⚡ ถูกตั้งแต่ครั้งแรก' : `🔄 ถูกในครั้งที่ ${toCorrect}`}
        </span>
      ) : att > 0 ? (
        <span className={`${chip} bg-gray-100 text-gray-600`}>ส่งแล้ว {att} ครั้ง</span>
      ) : null}
      {sub.is_correct && sub.viewed_solution_before_correct && <span className={`${chip} bg-rose-100 text-rose-700`}>📖 ถูกหลังดูเฉลย</span>}
      {!sub.is_correct && sub.viewed_solution && <span className={`${chip} bg-amber-100 text-amber-800`}>📖 ดูเฉลยแล้วแต่ยังไม่ถูก</span>}
      {sub.is_correct && sub.viewed_solution && !sub.viewed_solution_before_correct && <span className={`${chip} bg-gray-100 text-gray-500`}>📖 ดูเฉลยหลังตอบถูก</span>}
    </span>
  )
}

type Tab = 'overview' | 'attention' | 'sets' | 'student' | 'quests'

export default function AdminStatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastLoaded, setLastLoaded] = useState('')

  const [problemSets, setProblemSets] = useState<any[]>([])
  const [allProblems, setAllProblems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])
  const [quests, setQuests] = useState<any[]>([])
  const [questCompletions, setQuestCompletions] = useState<any[]>([])

  // ตัวกรองรวม
  const [tab, setTab] = useState<Tab>('overview')
  const [todayStr, setTodayStr] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // แท็บ "รายชุด"
  const [setSearch, setSetSearch] = useState('')
  const [selectedSetId, setSelectedSetId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'pct' | 'status'>('status')

  // แท็บ "ควรดูแล"
  const [tierFilter, setTierFilter] = useState<'all' | 'attention' | 'watch' | 'star'>('all')

  // แท็บ "รายบุคคล"
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [expandedSetId, setExpandedSetId] = useState('')

  // แท็บ "ภารกิจพิเศษ" (แยกจากแบบฝึกหัดปกติ)
  const [selectedQuestId, setSelectedQuestId] = useState('')
  const [questStudentSearch, setQuestStudentSearch] = useState('')
  const [questStatusFilter, setQuestStatusFilter] = useState<'all' | 'done' | 'in_progress' | 'not_started'>('all')

  // ---------- โหลดข้อมูล ----------
  useEffect(() => {
    const storedUser = localStorage.getItem('kidscoddy_user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const user = JSON.parse(storedUser)
    if (user.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    const t = toLocalDateStr(new Date())
    setTodayStr(t)
    setDateTo(t)
    setDateFrom(addDays(t, -29))
    fetchData()
  }, [router])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [setsData, probsData, studentsData, compData, subsData, questData, questCompData] = await Promise.all([
        fetchAll('problem_sets'),
        fetchAll('problems', 'id, set_id, question_text, correct_answer, order_num'),
        fetchAll('users', '*', 'id', (q) => q.eq('role', 'student')),
        fetchAll('set_completions'),
        fetchAll('submissions'),
        fetchAll('special_quests').catch(() => []),
        fetchAll('quest_completions').catch(() => []),
      ])
      setProblemSets(setsData)
      setAllProblems(probsData)
      setStudents([...studentsData].sort((a, b) => String(a.display_name || '').localeCompare(String(b.display_name || ''), 'th')))
      setCompletions(compData)
      setAllSubmissions(subsData)
      // เรียงภารกิจพิเศษ: ที่เปิดใช้งาน (is_active) ขึ้นก่อน ตามด้วยวันที่สร้างล่าสุด
      const sortedQuests = [...questData].sort((a, b) => {
        if ((b.is_active ? 1 : 0) !== (a.is_active ? 1 : 0)) return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })
      setQuests(sortedQuests)
      setQuestCompletions(questCompData)
      setLastLoaded(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))
    } catch (err: any) {
      console.error('Error fetching admin stats:', err)
      setError(err?.message || 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  // ---------- ข้อมูลอนุพันธ์ ----------
  const availableGrades = useMemo(() => {
    const g = new Set<string>()
    problemSets.forEach((s) => s.target_group && g.add(String(s.target_group).trim()))
    students.forEach((st) => st.group_name && g.add(String(st.group_name).trim()))
    g.delete('ทั่วไป')
    return Array.from(g).filter(Boolean).sort()
  }, [problemSets, students])

  const gradeStudents = useMemo(
    () => (selectedGrade === 'ALL' ? students : students.filter((st) => (st.group_name || 'ทั่วไป') === selectedGrade)),
    [students, selectedGrade]
  )

  const specialSetIds = useMemo(() => quests.map((q) => q.target_set_id).filter(Boolean), [quests])
  const problemById = useMemo(() => new Map(allProblems.map((p) => [p.id, p])), [allProblems])
  const setById = useMemo(() => new Map(problemSets.map((s) => [s.id, s])), [problemSets])

  const analytics = useMemo(
    () =>
      todayStr
        ? buildAnalytics({
            sets: problemSets,
            problems: allProblems,
            students: gradeStudents,
            submissions: allSubmissions,
            completions,
            specialSetIds,
            today: todayStr,
            from: dateFrom,
            to: dateTo,
          })
        : null,
    [problemSets, allProblems, gradeStudents, allSubmissions, completions, specialSetIds, todayStr, dateFrom, dateTo]
  )

  const overview = useMemo(() => {
    if (!analytics) return null
    const rows = gradeStudents.map((st) => ({ st, a: analytics.students.get(st.id)! })).filter((r) => r.a)
    let assigned = 0, finished = 0, answered = 0, correct = 0, todayStudents = 0, todayDone = 0
    let tracked = 0, firstTry = 0, attemptsSum = 0, assistedCorrect = 0
    rows.forEach(({ a }) => {
      tracked += a.trackedCorrect
      firstTry += a.firstTry
      attemptsSum += a.attemptsSum
      assistedCorrect += a.assistedCorrect
      assigned += a.assigned
      finished += a.finished
      answered += a.answered
      correct += a.correct
      if (a.todayAssigned > 0) {
        todayStudents++
        if (a.todayFinished >= a.todayAssigned) todayDone++
      }
    })
    const topWrong = [...analytics.problemStats.values()]
      .filter((p) => p.answered >= 3 && p.pct !== null)
      .sort((x, y) => (x.pct! - y.pct!) || y.answered - x.answered)
      .slice(0, 8)
    const retryProblems = [...analytics.problemStats.values()]
      .filter((p) => p.tracked >= 3 && ((p.avgAttempts ?? 1) >= 2 || p.assisted / p.answered >= 0.25))
      .sort((x, y) => ((y.avgAttempts ?? 1) - (x.avgAttempts ?? 1)) || y.assisted - x.assisted)
      .slice(0, 6)
    const errTotal = Object.values(analytics.errorTotals).reduce((x, y) => x + y, 0)
    return {
      rows,
      trackedTotal: tracked,
      firstTryRate: tracked ? firstTry / tracked : null,
      avgAttempts: tracked ? attemptsSum / tracked : null,
      assistedRate: correct ? assistedCorrect / correct : null,
      assistedCorrect,
      retryProblems,
      submitRate: assigned ? finished / assigned : null,
      accuracy: answered ? correct / answered : null,
      todayStudents,
      todayDone,
      attention: rows.filter((r) => r.a.tier === 'attention').length,
      watch: rows.filter((r) => r.a.tier === 'watch').length,
      stars: rows.filter((r) => r.a.tier === 'star').length,
      topWrong,
      errTotal,
    }
  }, [analytics, gradeStudents])

  const selectableSets = useMemo(() => {
    if (!analytics) return []
    const q = setSearch.trim().toLowerCase()
    return analytics.sets.filter((s) => {
      const gradeOk = selectedGrade === 'ALL' || matchesGroup(s.target_group, selectedGrade)
      const searchOk = !q || String(s.title || '').toLowerCase().includes(q)
      return gradeOk && searchOk
    })
  }, [analytics, setSearch, selectedGrade])

  useEffect(() => {
    if (selectableSets.length === 0) {
      if (selectedSetId) setSelectedSetId('')
    } else if (!selectableSets.some((s) => s.id === selectedSetId)) {
      setSelectedSetId(selectableSets[0].id)
    }
  }, [selectableSets, selectedSetId])

  useEffect(() => {
    if (gradeStudents.length > 0 && !gradeStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(gradeStudents[0].id)
    }
  }, [gradeStudents, selectedStudentId])

  useEffect(() => {
    if (quests.length > 0 && !quests.some((q) => q.id === selectedQuestId)) {
      setSelectedQuestId(quests[0].id)
    }
  }, [quests, selectedQuestId])

  // =====================================================================
  // 🎯 คำนวณข้อมูลวิเคราะห์เฉพาะ "ภารกิจพิเศษ" (Special Quests Analytics)
  // =====================================================================
  const questAnalytics = useMemo(() => {
    const gradeStudentIds = new Set(gradeStudents.map((s) => s.id))

    const questList = quests.map((q) => {
      const targetSet = setById.get(q.target_set_id)
      const probs = allProblems
        .filter((p) => p.set_id === q.target_set_id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
      const probIds = new Set(probs.map((p) => p.id))

      // กรองนักเรียนที่มีสิทธิ์ในภารกิจนี้ (อิงกลุ่มของชุดโจทย์ปลายทาง)
      const eligibleStudents = gradeStudents.filter((st) =>
        targetSet ? matchesGroup(targetSet.target_group, st.group_name) : true
      )
      const eligibleIds = new Set(eligibleStudents.map((s) => s.id))

      // ประวัติการพิชิตภารกิจนี้จากตาราง quest_completions
      const qComps = questCompletions.filter(
        (qc) => qc.quest_id === q.id && eligibleIds.has(qc.user_id)
      )
      const compByUser = new Map(qComps.map((qc) => [qc.user_id, qc]))

      // วิเคราะห์รายละเอียดนักเรียนแต่ละคนในเควสนี้
      const studentRows = eligibleStudents.map((st) => {
        const qc = compByUser.get(st.id)
        const subs = allSubmissions.filter(
          (s) => s.user_id === st.id && probIds.has(s.problem_id)
        )
        const answered = subs.length
        const correct = subs.filter((s) => s.is_correct).length
        const firstTry = subs.filter((s) => s.is_correct && Number(s.attempts_to_correct) === 1).length
        const assisted = subs.filter((s) => s.is_correct && s.viewed_solution_before_correct).length
        const totalAttempts = subs.reduce((sum, s) => sum + (Number(s.attempts) || 1), 0)
        const avgAttempts = answered > 0 ? totalAttempts / answered : null

        const isCompleted = !!qc || (probs.length > 0 && correct > 0 && answered >= probs.length)
        const isPerfect = probs.length > 0 && correct >= probs.length
        const status: 'done' | 'in_progress' | 'not_started' = isCompleted
          ? 'done'
          : answered > 0
          ? 'in_progress'
          : 'not_started'

        return {
          student: st,
          status,
          isCompleted,
          isPerfect,
          completedAt: qc?.completed_at || null,
          answered,
          correct,
          total: probs.length,
          pct: probs.length > 0 ? correct / probs.length : 0,
          firstTry,
          assisted,
          avgAttempts,
          coinsEarned: isCompleted ? correct + (Number(q.reward_coins) || 0) : correct,
        }
      })

      // วิเคราะห์ความยากง่ายรายข้อเฉพาะในภารกิจพิเศษนี้
      const problemStats = probs.map((p) => {
        const subsForP = allSubmissions.filter(
          (s) => s.problem_id === p.id && gradeStudentIds.has(s.user_id)
        )
        const ansCount = subsForP.length
        const corrCount = subsForP.filter((s) => s.is_correct).length
        const firstTryCount = subsForP.filter((s) => s.is_correct && Number(s.attempts_to_correct) === 1).length
        const assistedCount = subsForP.filter((s) => s.is_correct && s.viewed_solution_before_correct).length
        const avgAtt = ansCount > 0 ? subsForP.reduce((sum, s) => sum + (Number(s.attempts) || 1), 0) / ansCount : null

        return {
          problem: p,
          answered: ansCount,
          correct: corrCount,
          pct: ansCount > 0 ? corrCount / ansCount : null,
          firstTryRate: corrCount > 0 ? firstTryCount / corrCount : null,
          assistedCount,
          avgAttempts: avgAtt,
        }
      })

      const doneCount = studentRows.filter((r) => r.status === 'done').length
      const inProgressCount = studentRows.filter((r) => r.status === 'in_progress').length
      const perfectCount = studentRows.filter((r) => r.isPerfect).length
      const completionRate = eligibleStudents.length > 0 ? doneCount / eligibleStudents.length : null

      return {
        quest: q,
        targetSet,
        probs,
        eligibleCount: eligibleStudents.length,
        doneCount,
        inProgressCount,
        notStartedCount: eligibleStudents.length - doneCount - inProgressCount,
        perfectCount,
        completionRate,
        studentRows,
        problemStats,
      }
    })

    const activeQuests = questList.filter((item) => item.quest.is_active)
    const totalEligibleSlots = activeQuests.reduce((sum, item) => sum + item.eligibleCount, 0)
    const totalDoneSlots = activeQuests.reduce((sum, item) => sum + item.doneCount, 0)
    const overallCompletionRate = totalEligibleSlots > 0 ? totalDoneSlots / totalEligibleSlots : null

    // นับจำนวนนักเรียนที่พิชิตครบทุกภารกิจที่เปิดใช้งานอยู่
    const allQuestChampions = gradeStudents.filter((st) => {
      const myEligibleQuests = activeQuests.filter((qItem) =>
        qItem.studentRows.some((sr) => sr.student.id === st.id)
      )
      if (myEligibleQuests.length === 0) return false
      return myEligibleQuests.every((qItem) =>
        qItem.studentRows.find((sr) => sr.student.id === st.id)?.isCompleted
      )
    }).length

    return {
      questList,
      activeCount: activeQuests.length,
      overallCompletionRate,
      totalDoneSlots,
      totalEligibleSlots,
      allQuestChampions,
    }
  }, [quests, questCompletions, gradeStudents, setById, allProblems, allSubmissions])

  const openProfile = (studentId: string, setId = '') => {
    setSelectedStudentId(studentId)
    setExpandedSetId(setId)
    setTab('student')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setQuickRange = (kind: 'today' | '7' | '30' | '90' | 'all') => {
    const t = toLocalDateStr(new Date())
    if (kind === 'all') {
      setDateFrom('')
      setDateTo('')
    } else {
      setDateTo(t)
      setDateFrom(kind === 'today' ? t : addDays(t, -(Number(kind) - 1)))
    }
  }

  // ---------- ส่งออก CSV ----------
  const exportAllStudents = () => {
    if (!analytics) return
    const tierText: Record<string, string> = { attention: 'ควรดูแล', watch: 'เฝ้าระวัง', ok: 'ปกติ', star: 'ผลงานเยี่ยม' }
    const rows: (string | number)[][] = [
      ['ชื่อ', 'username', 'กลุ่ม', 'ชุดที่ได้รับ', 'ทำแล้ว', 'เต็ม100%', 'ค้าง', 'ตอบแล้ว', 'ถูก', 'ความแม่นยำ%', 'XP', 'Level', 'ใช้งานล่าสุด(วันก่อน)', 'สถานะ', 'ธงเตือน', 'ถูกรอบแรก%', 'ลองเฉลี่ย(ครั้ง)', 'ถูกหลังดูเฉลย(ข้อ)'],
    ]
    gradeStudents.forEach((st) => {
      const a = analytics.students.get(st.id)
      if (!a) return
      rows.push([
        st.display_name || '', st.username || '', st.group_name || 'ทั่วไป', a.assigned, a.finished, a.perfect, a.backlog,
        a.answered, a.correct, a.accuracy === null ? '' : Math.round(a.accuracy * 100), st.xp || 0, st.level || 1,
        a.daysSinceActive ?? '', tierText[a.tier], a.flags.map((f) => f.label).join(' | '),
        a.firstTryRate === null ? '' : Math.round(a.firstTryRate * 100), a.avgAttempts === null ? '' : a.avgAttempts.toFixed(2), a.assistedCorrect,
      ])
    })
    downloadCsv(`kidscoddy_สรุปนักเรียน_${dateFrom || 'ทั้งหมด'}_${dateTo || ''}.csv`, rows)
  }

  // ---------- โหมดโหลด/ผิดพลาด ----------
  if (loading && !analytics) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดสถิติคุณครู...</div>
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-md text-center max-w-md space-y-3">
          <div className="text-5xl">😵</div>
          <p className="font-black text-gray-800">โหลดข้อมูลไม่สำเร็จ</p>
          <p className="text-xs text-gray-500 break-words">{error}</p>
          <button onClick={fetchData} className="px-5 py-2.5 bg-indigo-600 text-white font-black text-sm rounded-2xl cursor-pointer">
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    )
  }
  if (!analytics || !overview) return null

  // ---------- ค่าที่ใช้ใน JSX ----------
  const attentionRows = overview.rows
    .filter((r) => (tierFilter === 'all' ? true : r.a.tier === tierFilter))
    .sort((x, y) => y.a.priority - x.a.priority || (x.a.accuracy ?? 2) - (y.a.accuracy ?? 2))

  const currentSet = setById.get(selectedSetId)
  const currentSetProblems = analytics.problemsBySet.get(selectedSetId) || []
  const currentSetStat = analytics.setStats.get(selectedSetId)

  const setRows = gradeStudents
    .filter((st) => {
      const q = studentSearch.trim().toLowerCase()
      return !q || String(st.display_name || '').toLowerCase().includes(q) || String(st.username || '').toLowerCase().includes(q)
    })
    .map((st) => {
      const a = analytics.students.get(st.id)
      const res: SetResult | undefined = a?.perSet.find((r) => r.setId === selectedSetId)
      const eligible = !!currentSet && matchesGroup(currentSet.target_group, st.group_name)
      return { st, res, eligible }
    })
    .filter((r) => r.eligible)
    .sort((x, y) => {
      if (sortKey === 'name') return String(x.st.display_name).localeCompare(String(y.st.display_name), 'th')
      if (sortKey === 'pct') return (y.res?.pct ?? -1) - (x.res?.pct ?? -1)
      const rank = (r: typeof x) => (!r.res || r.res.answered === 0 ? 0 : !r.res.finished ? 1 : r.res.perfect ? 3 : 2)
      return rank(x) - rank(y) || (x.res?.pct ?? 0) - (y.res?.pct ?? 0)
    })

  const exportSetCsv = () => {
    const rows: (string | number)[][] = [['ชื่อ', 'username', 'กลุ่ม', 'สถานะ', 'ตอบแล้ว', 'ถูก', 'ทั้งหมด', 'คะแนน%', 'ดาว']]
    setRows.forEach(({ st, res }) => {
      const status = !res || res.answered === 0 ? 'ยังไม่เริ่ม' : !res.finished ? 'กำลังทำ' : res.perfect ? 'เต็ม 100%' : 'ทำครบ'
      rows.push([st.display_name || '', st.username || '', st.group_name || 'ทั่วไป', status, res?.answered ?? 0, res?.correct ?? 0, currentSetProblems.length, res ? Math.round(res.pct * 100) : 0, res?.stars ?? 0])
    })
    downloadCsv(`kidscoddy_ผลชุด_${String(currentSet?.title || '').slice(0, 30)}.csv`, rows)
  }

  const profile = analytics.students.get(selectedStudentId)
  const profileStudent = students.find((s) => s.id === selectedStudentId)
  const profileSubs = new Map<string, any>(allSubmissions.filter((s) => s.user_id === selectedStudentId).map((s) => [s.problem_id, s]))
  const trendSets = profile ? [...profile.perSet].filter((r) => r.answered > 0).sort((a, b) => a.day.localeCompare(b.day)).slice(-12) : []

  const exportProfileCsv = () => {
    if (!profile || !profileStudent) return
    const rows: (string | number)[][] = [['วันที่', 'ชุด', 'ตอบแล้ว', 'ถูก', 'ทั้งหมด', 'คะแนน%', 'สถานะ', 'ถูกรอบแรก(ข้อ)', 'ถูกหลังดูเฉลย(ข้อ)']]
    profile.perSet.forEach((r) => rows.push([r.day, r.title, r.answered, r.correct, r.total, Math.round(r.pct * 100), r.perfect ? 'เต็ม 100%' : r.finished ? 'ทำครบ' : r.answered > 0 ? 'กำลังทำ' : 'ยังไม่ทำ', r.firstTry, r.assisted]))
    downloadCsv(`kidscoddy_รายงาน_${profileStudent.display_name}.csv`, rows)
  }

  // ข้อมูลภารกิจพิเศษที่กำลังเลือกดู
  const currentQuestData = questAnalytics.questList.find((q) => q.quest.id === selectedQuestId)
  const filteredQuestStudentRows = currentQuestData
    ? currentQuestData.studentRows
        .filter((r) => {
          const q = questStudentSearch.trim().toLowerCase()
          const matchName = !q || String(r.student.display_name || '').toLowerCase().includes(q) || String(r.student.username || '').toLowerCase().includes(q)
          const matchStatus = questStatusFilter === 'all' || r.status === questStatusFilter
          return matchName && matchStatus
        })
        .sort((a, b) => {
          const order = { done: 0, in_progress: 1, not_started: 2 }
          if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
          return b.correct - a.correct
        })
    : []

  const exportQuestCsv = () => {
    if (!currentQuestData) return
    const statusMap = { done: 'พิชิตแล้ว', in_progress: 'กำลังทำ', not_started: 'ยังไม่เริ่ม' }
    const rows: (string | number)[][] = [['ชื่อนักเรียน', 'กลุ่ม', 'สถานะภารกิจ', 'คะแนนที่ทำได้', 'จำนวนข้อทั้งหมด', 'คอยน์รวมที่ได้', 'ถูกรอบแรก(ข้อ)', 'ถูกหลังดูเฉลย(ข้อ)', 'เวลาที่พิชิตสำเร็จ']]
    filteredQuestStudentRows.forEach((r) => {
      rows.push([
        r.student.display_name || '',
        r.student.group_name || 'ทั่วไป',
        statusMap[r.status],
        r.correct,
        r.total,
        r.coinsEarned,
        r.firstTry,
        r.assisted,
        r.completedAt ? new Date(r.completedAt).toLocaleString('th-TH') : '-',
      ])
    })
    downloadCsv(`kidscoddy_ภารกิจพิเศษ_${String(currentQuestData.quest.title || '').slice(0, 25)}.csv`, rows)
  }

  const recentDays = analytics.dayStats.slice(-14)
  const maxErr = Math.max(1, ...Object.values(analytics.errorTotals))
  const tabs: { key: Tab; label: string; badge?: number; badgeColor?: string }[] = [
    { key: 'overview', label: '📊 ภาพรวมแบบฝึกหัด' },
    { key: 'attention', label: '🚨 ควรดูแล', badge: overview.attention, badgeColor: 'bg-rose-500 text-white' },
    { key: 'sets', label: '📋 รายชุดโจทย์' },
    { key: 'student', label: '👤 รายบุคคล' },
    { key: 'quests', label: '🎯 ภารกิจพิเศษ', badge: questAnalytics.activeCount, badgeColor: 'bg-pink-500 text-white' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      {/* Navbar */}
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10 print:hidden">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-200">📊</div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">ศูนย์วิเคราะห์ผลการเรียนของนักเรียน</h1>
              <p className="text-xs text-emerald-600 font-bold">
                ดูภาพรวม หาจุดอ่อนรายข้อ และติดตามเด็กแต่ละคน {lastLoaded && `• โหลดล่าสุด ${lastLoaded} น.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={fetchData} disabled={loading} className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 text-xs font-extrabold rounded-xl transition cursor-pointer">
              {loading ? '⏳ กำลังโหลด...' : '🔄 รีเฟรชข้อมูล'}
            </button>
            <button onClick={exportAllStudents} className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-extrabold rounded-xl transition cursor-pointer">⬇️ ส่งออก CSV</button>
            <button onClick={() => router.push('/admin/quests')} className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold rounded-xl transition cursor-pointer">🎯 จัดการเควส</button>
            <button onClick={() => router.push('/admin/exercises')} className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-xl transition cursor-pointer">📚 จัดการชุดข้อสอบ</button>
            <button onClick={() => router.push('/dashboard')} className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer">🏠 กลับหน้าหลัก</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-6 space-y-6">
        {/* ตัวกรองรวม: ระดับชั้น + ช่วงวันที่ */}
        <div className="bg-white/95 backdrop-blur-sm p-5 rounded-3xl shadow-md border border-indigo-100 space-y-4 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-gray-600 mr-1">ระดับชั้น:</span>
            {['ALL', ...availableGrades].map((g) => (
              <button key={g} onClick={() => setSelectedGrade(g)} className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${selectedGrade === g ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                {g === 'ALL' ? 'ทุกระดับชั้น' : g}
              </button>
            ))}
            <span className="ml-auto text-xs font-bold text-gray-500">
              นักเรียน {gradeStudents.length} คน • {tab === 'quests' ? `ภารกิจพิเศษ ${quests.length} เควส` : `แบบฝึกหัดปกติ ${analytics.sets.length} ชุด`}
            </span>
          </div>

          {tab !== 'quests' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-gray-600 mr-1">📅 วันของการบ้าน:</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer" />
              <span className="text-xs text-gray-400 font-bold">ถึง</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer" />
              {([['today', 'วันนี้'], ['7', '7 วัน'], ['30', '30 วัน'], ['90', '90 วัน'], ['all', 'ทั้งหมด']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setQuickRange(k)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer">{label}</button>
              ))}
            </div>
          )}
        </div>

        {/* แท็บ */}
        <div className="flex flex-wrap gap-1.5 bg-white/90 p-1.5 rounded-2xl border border-indigo-100 shadow-xs w-fit print:hidden">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                tab === t.key
                  ? t.key === 'quests'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
              {!!t.badge && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab === t.key ? 'bg-white/25 text-white' : t.badgeColor || 'bg-rose-500 text-white'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ===================== ภาพรวม ===================== */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Kpi icon="👥" label="นักเรียน" value={String(gradeStudents.length)} sub={selectedGrade === 'ALL' ? 'ทุกระดับชั้น' : selectedGrade} />
              <Kpi icon="📅" label="ทำการบ้านวันนี้ครบ" value={overview.todayStudents ? `${overview.todayDone}/${overview.todayStudents}` : '–'} sub={overview.todayStudents ? 'คนที่มีการบ้านวันนี้' : 'วันนี้ไม่มีการบ้าน'} color="emerald" />
              <Kpi icon="📨" label="อัตราส่งงาน" value={pctText(overview.submitRate)} sub="เฉพาะแบบฝึกหัดปกติ" color="indigo" />
              <Kpi icon="🎯" label="ความแม่นยำเฉลี่ย" value={pctText(overview.accuracy)} sub="ข้อที่ตอบถูก/ตอบทั้งหมด" color="purple" />
              <Kpi icon="🚨" label="ควรดูแล" value={String(overview.attention)} sub={`เฝ้าระวังอีก ${overview.watch} คน`} color="rose" />
              <Kpi icon="🌟" label="ผลงานเยี่ยม" value={String(overview.stars)} sub="ควรชื่นชม" color="amber" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Kpi icon="⚡" label="ถูกตั้งแต่ครั้งแรก" value={pctText(overview.firstTryRate)} sub={overview.trackedTotal ? `จากข้อที่ถูกและมีข้อมูล ${overview.trackedTotal} ข้อ` : 'ยังไม่มีข้อมูล'} color="emerald" />
              <Kpi icon="🔄" label="ลองเฉลี่ยกว่าจะถูก" value={overview.avgAttempts === null ? '–' : `${overview.avgAttempts.toFixed(1)} ครั้ง`} sub="ต่อข้อ (1.0 = ถูกทันทีทุกข้อ)" color="indigo" />
              <Kpi icon="📖" label="ถูกหลังดูเฉลย" value={pctText(overview.assistedRate)} sub={`${overview.assistedCorrect} ข้อ จากข้อที่ถูกทั้งหมด`} color="rose" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card title="🚨 ควรดูแลก่อน" subtitle="เรียงตามระดับความเร่งด่วน (ค้างงาน • แม่นยำต่ำ • แนวโน้มลดลง • หายไป)" right={<button onClick={() => { setTierFilter('all'); setTab('attention') }} className="text-xs font-extrabold text-indigo-600 hover:underline cursor-pointer">ดูทั้งหมด →</button>}>
                {overview.rows.filter((r) => r.a.priority > 0).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">ไม่มีนักเรียนที่ต้องดูแลเป็นพิเศษ 🎉</p>
                ) : (
                  <div className="space-y-2.5">
                    {[...overview.rows].filter((r) => r.a.priority > 0).sort((x, y) => y.a.priority - x.a.priority).slice(0, 6).map(({ st, a }) => (
                      <button key={st.id} onClick={() => openProfile(st.id)} className="w-full text-left p-3 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition cursor-pointer">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-sm text-gray-800">{st.display_name} <span className="text-[11px] font-semibold text-gray-400">{st.group_name || ''}</span></span>
                          <span className={`text-sm font-black ${toneText(a.accuracy)}`}>{pctText(a.accuracy)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">{a.flags.filter((f) => f.level !== 'good').map((f) => <FlagChip key={f.code} level={f.level} label={f.label} />)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="🧩 รูปแบบข้อผิดพลาดของห้อง" subtitle={overview.errTotal ? `วิเคราะห์จากคำตอบผิด ${overview.errTotal} ข้อ — ใช้วางแผนทบทวนทั้งห้อง` : 'ยังไม่มีคำตอบผิดในช่วงนี้'}>
                <div className="space-y-3">
                  {(Object.keys(ERROR_INFO) as ErrorType[]).filter((t) => analytics.errorTotals[t] > 0).sort((a, b) => analytics.errorTotals[b] - analytics.errorTotals[a]).map((t) => (
                    <div key={t}>
                      <div className="flex justify-between text-xs font-extrabold text-gray-700 mb-1">
                        <span>{ERROR_INFO[t].icon} {ERROR_INFO[t].label}</span>
                        <span>{analytics.errorTotals[t]} ข้อ</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-400 to-rose-400 rounded-full" style={{ width: `${(analytics.errorTotals[t] / maxErr) * 100}%` }} /></div>
                      {t !== 'other' && t !== 'blank' && <p className="text-[11px] text-gray-400 mt-0.5">💡 {ERROR_INFO[t].advice}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="📈 ผลงานรายวัน (ล่าสุด 14 วันที่มีการบ้าน)" subtitle="แท่ง = ความแม่นยำเฉลี่ยของวันนั้น • ตัวเลขใต้แท่ง = ส่งงานแล้ว/ทั้งหมด">
              {recentDays.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">ไม่มีข้อมูลการบ้านในช่วงวันที่ที่เลือก</p>
              ) : (
                <div className="flex items-end gap-2 h-44 overflow-x-auto pb-1">
                  {recentDays.map((d) => (
                    <div key={d.day} className="flex flex-col items-center justify-end h-full min-w-[3.2rem] flex-1">
                      <span className={`text-[11px] font-black ${toneText(d.accuracy)}`}>{pctText(d.accuracy)}</span>
                      <div className="w-full max-w-[2.6rem] bg-gray-100 rounded-t-lg flex items-end" style={{ height: '6.5rem' }}>
                        <div className={`w-full rounded-t-lg ${tone(d.accuracy)}`} style={{ height: `${Math.max(4, (d.accuracy ?? 0) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 mt-1">{formatDay(d.day)}</span>
                      <span className="text-[10px] font-semibold text-gray-400">{d.finished}/{d.eligible}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="🔁 ข้อที่เด็กต้องลองหลายครั้ง / ดูเฉลยบ่อย" subtitle="ข้อที่กว่าจะถูกต้องลองหลายรอบ หรือมีคนกดดูวิธีทำก่อนตอบถูก (ต้องมีข้อมูลอย่างน้อย 3 คน)">
              {overview.retryProblems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">ยังไม่พบข้อที่มีสัญญาณผิดปกติ (หรือข้อมูลยังไม่พอ)</p>
              ) : (
                <div className="space-y-3">
                  {overview.retryProblems.map((ps) => {
                    const prob = problemById.get(ps.problemId)
                    const set = setById.get(ps.setId)
                    return (
                      <div key={ps.problemId} className="p-4 rounded-2xl border border-gray-100 space-y-1.5">
                        <div className="flex flex-wrap justify-between gap-2 text-[11px] font-bold text-gray-400">
                          <span>{set?.title} • ข้อ {prob?.order_num}</span>
                          <button onClick={() => { setSelectedSetId(ps.setId); setTab('sets') }} className="text-indigo-600 hover:underline cursor-pointer">ไปที่ชุดนี้ →</button>
                        </div>
                        <div className="text-sm font-extrabold text-gray-800"><MathText text={prob?.question_text} /></div>
                        <div className="flex flex-wrap gap-2 text-xs font-extrabold">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700">🔄 ลองเฉลี่ย {ps.avgAttempts?.toFixed(1)} ครั้ง</span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">⚡ ถูกครั้งแรก {pctText(ps.firstTryRate)}</span>
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700">📖 ดูเฉลยก่อนตอบ {ps.assisted}/{ps.answered} คน</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card title="📉 ข้อที่เด็กผิดบ่อยที่สุด" subtitle="ข้อที่ควรสอนซ้ำ (ต้องมีคนตอบอย่างน้อย 3 คน)">
              {overview.topWrong.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีข้อมูลเพียงพอ</p>
              ) : (
                <div className="space-y-3">
                  {overview.topWrong.map((ps) => {
                    const prob = problemById.get(ps.problemId)
                    const set = setById.get(ps.setId)
                    return (
                      <div key={ps.problemId} className="p-4 rounded-2xl border border-gray-100 space-y-2">
                        <div className="flex flex-wrap justify-between gap-2 text-[11px] font-bold text-gray-400">
                          <span>{set?.title} • ข้อ {prob?.order_num}</span>
                          <button onClick={() => { setSelectedSetId(ps.setId); setTab('sets') }} className="text-indigo-600 hover:underline cursor-pointer">ไปที่ชุดนี้ →</button>
                        </div>
                        <div className="text-sm font-extrabold text-gray-800"><MathText text={prob?.question_text} /></div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${tone(ps.pct)}`} style={{ width: `${(ps.pct ?? 0) * 100}%` }} /></div>
                          <span className={`text-xs font-black ${toneText(ps.pct)}`}>ถูก {pctText(ps.pct)} ({ps.correct}/{ps.answered})</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-gray-500">เฉลย: <b className="font-mono text-indigo-600">{prob?.correct_answer}</b></span>
                          {ps.wrong.slice(0, 3).map((w) => (
                            <span key={w.answer} className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-mono font-bold">{w.answer} ×{w.count}{w.type !== 'other' && <span className="font-sans font-semibold"> • {ERROR_INFO[w.type].label}</span>}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ===================== ควรดูแล ===================== */}
        {tab === 'attention' && (
          <Card
            title="🚨 รายชื่อนักเรียนที่ควรติดตาม"
            subtitle="ระบบคำนวณจากงานค้าง ความแม่นยำ แนวโน้ม 3 ชุดล่าสุด และจำนวนวันที่หายไป (เฉพาะแบบฝึกหัดปกติ)"
            right={
              <div className="flex flex-wrap gap-1.5">
                {([['all', 'ทั้งหมด'], ['attention', '🔴 ควรดูแล'], ['watch', '🟠 เฝ้าระวัง'], ['star', '🌟 ผลงานเยี่ยม']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setTierFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${tierFilter === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>{label}</button>
                ))}
              </div>
            }
          >
            {attentionRows.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">ไม่มีนักเรียนในหมวดนี้</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {attentionRows.map(({ st, a }) => (
                  <div key={st.id} className={`p-4 rounded-2xl border space-y-2.5 ${a.tier === 'attention' ? 'border-rose-200 bg-rose-50/30' : a.tier === 'watch' ? 'border-amber-200 bg-amber-50/30' : a.tier === 'star' ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <AvatarDisplay user={st} size="sm" showLevel={false} />
                        <div>
                          <div className="font-extrabold text-gray-800">{st.display_name}</div>
                          <div className="text-[11px] text-gray-400 font-semibold">{st.group_name || 'ทั่วไป'} • @{st.username} • Lv.{st.level || 1}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-black ${toneText(a.accuracy)}`}>{pctText(a.accuracy)}</div>
                        <div className="text-[10px] font-bold text-gray-400">ความแม่นยำ</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {a.flags.length === 0 ? <FlagChip level="low" label="ปกติ" /> : a.flags.map((f) => <FlagChip key={f.code} level={f.level} label={f.label} />)}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold text-gray-500">
                      <div className="bg-white/70 rounded-xl py-1.5 border border-gray-100"><b className="block text-sm text-gray-800">{a.finished}/{a.assigned}</b>ส่งงาน</div>
                      <div className="bg-white/70 rounded-xl py-1.5 border border-gray-100"><b className={`block text-sm ${a.backlog ? 'text-rose-600' : 'text-gray-800'}`}>{a.backlog}</b>ค้าง</div>
                      <div className="bg-white/70 rounded-xl py-1.5 border border-gray-100"><b className="block text-sm text-gray-800">{a.daysSinceActive === null ? '–' : a.daysSinceActive === 0 ? 'วันนี้' : `${a.daysSinceActive} ว.`}</b>ใช้งานล่าสุด</div>
                      <div className="bg-white/70 rounded-xl py-1.5 border border-gray-100"><b className="block text-sm text-gray-800">{a.firstTryRate === null ? '–' : pctText(a.firstTryRate)}</b>ถูกรอบแรก</div>
                    </div>
                    <button onClick={() => openProfile(st.id)} className="w-full py-2 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-xl border border-indigo-200 transition cursor-pointer">👤 ดูโปรไฟล์และข้อแนะนำ</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ===================== รายชุด ===================== */}
        {tab === 'sets' && (
          <div className="space-y-6">
            <Card title="🎯 เลือกชุดแบบฝึกหัด (ไม่รวมภารกิจพิเศษ)" subtitle={`พบ ${selectableSets.length} ชุด ในช่วงวันที่และระดับชั้นที่เลือก`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" placeholder="🔍 ค้นหาชื่อชุดโจทย์..." value={setSearch} onChange={(e) => setSetSearch(e.target.value)} className="px-4 py-2.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold text-gray-700" />
                <div className="md:col-span-2 flex gap-2">
                  <select value={selectedSetId} onChange={(e) => setSelectedSetId(e.target.value)} className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-extrabold text-gray-800 cursor-pointer">
                    {selectableSets.length === 0 ? <option value="">-- ไม่พบชุดข้อสอบ --</option> : selectableSets.map((s) => <option key={s.id} value={s.id}>{formatDay(getSetDay(s))} • {s.target_group ? `[${s.target_group}] ` : ''}{s.title}</option>)}
                  </select>
                </div>
              </div>
            </Card>

            {currentSet && currentSetStat ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Kpi icon="📨" label="ส่งงานแล้ว" value={`${currentSetStat.finished}/${currentSetStat.eligible}`} sub={pctText(currentSetStat.eligible ? currentSetStat.finished / currentSetStat.eligible : null)} color="indigo" />
                  <Kpi icon="📊" label="คะแนนเฉลี่ย" value={pctText(currentSetStat.avgPct)} sub="เฉพาะคนที่ทำ" color="purple" />
                  <Kpi icon="👑" label="ได้เต็ม 100%" value={String(currentSetStat.perfect)} sub="คน" color="emerald" />
                  <Kpi icon="⏳" label="ยังไม่เริ่ม" value={String(currentSetStat.eligible - currentSetStat.attempted)} sub="คน" color="rose" />
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  <Card title="การกระจายคะแนน" subtitle="จำนวนนักเรียนในแต่ละช่วง">
                    <div className="space-y-2.5">
                      {([['90–100%', 3, 'bg-emerald-500'], ['70–89%', 2, 'bg-indigo-500'], ['50–69%', 1, 'bg-amber-500'], ['ต่ำกว่า 50%', 0, 'bg-rose-500']] as const).map(([label, i, color]) => {
                        const n = currentSetStat.buckets[i]
                        const max = Math.max(1, ...currentSetStat.buckets)
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-xs font-extrabold text-gray-600 mb-1"><span>{label}</span><span>{n} คน</span></div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${(n / max) * 100}%` }} /></div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  <div className="lg:col-span-2">
                    <Card title="🔬 วิเคราะห์รายข้อ" subtitle="ข้อไหนเด็กผิดมาก + คำตอบผิดที่พบบ่อย">
                      <div className="space-y-3">
                        {currentSetProblems.map((p) => {
                          const ps = analytics.problemStats.get(p.id)
                          return (
                            <div key={p.id} className="p-3 rounded-2xl border border-gray-100 space-y-1.5">
                              <div className="text-sm font-extrabold text-gray-800"><span className="text-gray-400 mr-1">{p.order_num}.</span><MathText text={p.question_text} /></div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${tone(ps?.pct ?? null)}`} style={{ width: `${(ps?.pct ?? 0) * 100}%` }} /></div>
                                <span className={`text-xs font-black ${toneText(ps?.pct ?? null)}`}>{ps ? `ถูก ${pctText(ps.pct)} (${ps.correct}/${ps.answered})` : 'ยังไม่มีคนตอบ'}</span>
                              </div>
                              {ps && ps.tracked > 0 && (
                                <div className="flex flex-wrap gap-2 text-[11px] font-extrabold">
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">⚡ ถูกครั้งแรก {pctText(ps.firstTryRate)}</span>
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">🔄 ลองเฉลี่ย {ps.avgAttempts?.toFixed(1)} ครั้ง</span>
                                  {ps.assisted > 0 && <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">📖 ถูกหลังดูเฉลย {ps.assisted} คน</span>}
                                  {ps.viewedWrong > 0 && <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">📖 ดูเฉลยแล้วยังผิด {ps.viewedWrong} คน</span>}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-gray-500">เฉลย: <b className="font-mono text-indigo-600">{p.correct_answer}</b></span>
                                {ps?.wrong.slice(0, 3).map((w) => (
                                  <span key={w.answer} className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-mono font-bold">{w.answer} ×{w.count}{w.type !== 'other' && <span className="font-sans font-semibold"> • {ERROR_INFO[w.type].label}</span>}</span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  </div>
                </div>

                <Card
                  title={`📋 ผลรายบุคคล: ${currentSet.title}`}
                  subtitle={`${setRows.length} คน • ${currentSetProblems.length} ข้อ`}
                  right={
                    <div className="flex flex-wrap gap-2">
                      <input type="text" placeholder="🔍 ค้นหานักเรียน..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-400" />
                      <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer">
                        <option value="status">เรียง: ต้องช่วยก่อน</option>
                        <option value="pct">เรียง: คะแนนสูง→ต่ำ</option>
                        <option value="name">เรียง: ชื่อ</option>
                      </select>
                      <button onClick={exportSetCsv} className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-extrabold rounded-xl cursor-pointer">⬇️ CSV</button>
                    </div>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 font-extrabold">
                          <th className="py-3 px-3">ชื่อนักเรียน</th><th className="py-3 px-3">กลุ่ม</th><th className="py-3 px-3">สถานะ</th><th className="py-3 px-3">คะแนน</th><th className="py-3 px-3">ดาว</th><th className="py-3 px-3">ลอง / เฉลย</th><th className="py-3 px-3 text-right">รายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                        {setRows.map(({ st, res }) => {
                          const started = !!res && res.answered > 0
                          return (
                            <tr key={st.id} className="hover:bg-emerald-50/40 transition">
                              <td className="py-3 px-3 font-extrabold text-gray-800"><div className="flex items-center gap-2.5"><AvatarDisplay user={st} size="sm" showLevel={false} /><div>{st.display_name}<span className="block text-xs font-normal text-gray-400 font-mono">@{st.username}</span></div></div></td>
                              <td className="py-3 px-3"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-lg">{st.group_name || 'ทั่วไป'}</span></td>
                              <td className="py-3 px-3">
                                {!started ? <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-extrabold rounded-full">ยังไม่เริ่มทำ</span>
                                  : res!.perfect ? <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full">👑 เต็ม 100%</span>
                                  : res!.finished ? <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-extrabold rounded-full">✓ ทำครบ ({res!.answered}/{res!.total})</span>
                                  : <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full">⏳ กำลังทำ ({res!.answered}/{res!.total})</span>}
                              </td>
                              <td className="py-3 px-3 min-w-[9rem]">
                                {started ? (
                                  <div className="flex items-center gap-2"><div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${tone(res!.pct)}`} style={{ width: `${res!.pct * 100}%` }} /></div><span className={`text-xs font-black ${toneText(res!.pct)}`}>{res!.correct}/{res!.total}</span></div>
                                ) : <span className="text-gray-300">–</span>}
                              </td>
                              <td className="py-3 px-3 text-sm">{started && res!.stars ? '⭐'.repeat(res!.stars) : <span className="text-gray-300">–</span>}</td>
                              <td className="py-3 px-3 text-xs font-extrabold">
                                {started ? (
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">⚡ ถูกรอบแรก {res!.firstTry}</span>
                                    {res!.assisted > 0 && <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">📖 ถูกหลังดูเฉลย {res!.assisted}</span>}
                                  </div>
                                ) : <span className="text-gray-300">–</span>}
                              </td>
                              <td className="py-3 px-3 text-right"><button onClick={() => openProfile(st.id, selectedSetId)} className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-extrabold rounded-xl transition cursor-pointer">🔍 ดูคำตอบรายข้อ</button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {setRows.length === 0 && <p className="text-center text-sm text-gray-400 py-8">ไม่พบนักเรียน</p>}
                  </div>
                </Card>
              </>
            ) : (
              <Card title="ยังไม่มีชุดโจทย์ให้แสดง"><p className="text-sm text-gray-400 text-center py-6">ลองขยายช่วงวันที่หรือเปลี่ยนระดับชั้น</p></Card>
            )}
          </div>
        )}

        {/* ===================== รายบุคคล ===================== */}
        {tab === 'student' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <select value={selectedStudentId} onChange={(e) => { setSelectedStudentId(e.target.value); setExpandedSetId('') }} className="px-4 py-2.5 rounded-2xl border border-indigo-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-extrabold text-gray-800 cursor-pointer min-w-[16rem]">
                {gradeStudents.map((s) => <option key={s.id} value={s.id}>{s.display_name} {s.group_name ? `(${s.group_name})` : ''}</option>)}
              </select>
              <button onClick={() => window.print()} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-2xl cursor-pointer">🖨️ พิมพ์รายงาน (ส่งผู้ปกครอง)</button>
              <button onClick={exportProfileCsv} className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-extrabold rounded-2xl cursor-pointer">⬇️ CSV</button>
            </div>

            {profile && profileStudent ? (
              <>
                <div className="hidden print:block text-center border-b pb-3">
                  <h1 className="text-xl font-black">รายงานผลการเรียนคณิตศาสตร์ • KidsCoddy Math</h1>
                  <p className="text-sm text-gray-600">ช่วงการบ้าน {dateFrom ? formatDay(dateFrom) : 'เริ่มต้น'} – {dateTo ? formatDay(dateTo) : 'ปัจจุบัน'}</p>
                </div>

                <Card title={`👤 ${profileStudent.display_name}`} subtitle={`@${profileStudent.username} • ${profileStudent.group_name || 'ทั่วไป'} • Lv.${profileStudent.level || 1} • ${profileStudent.xp || 0} XP`} right={<div className="flex flex-wrap gap-1.5">{profile.flags.length === 0 ? <FlagChip level="low" label="ปกติ" /> : profile.flags.map((f) => <FlagChip key={f.code} level={f.level} label={f.label} />)}</div>}>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <AvatarDisplay user={profileStudent} size="sm" showLevel={true} />
                    <span className="text-xs font-bold text-gray-500">🔥 Streak {profileStudent.streak_days || 0} วัน • 🪙 {profileStudent.coins || 0} เหรียญ</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Kpi icon="🎯" label="ความแม่นยำ" value={pctText(profile.accuracy)} sub={`ถูก ${profile.correct}/${profile.answered} ข้อ`} color="purple" />
                    <Kpi icon="📨" label="ส่งงานแล้ว" value={`${profile.finished}/${profile.assigned}`} sub="ชุดที่ถึงกำหนด" color="indigo" />
                    <Kpi icon="👑" label="เต็ม 100%" value={String(profile.perfect)} sub="ชุด" color="emerald" />
                    <Kpi icon="⏳" label="งานค้าง" value={String(profile.backlog)} sub="ชุด" color="rose" />
                    <Kpi icon="🕘" label="ใช้งานล่าสุด" value={profile.daysSinceActive === null ? '–' : profile.daysSinceActive === 0 ? 'วันนี้' : `${profile.daysSinceActive} วัน`} sub={profile.trend ? `แนวโน้ม ${profile.trend.delta >= 0 ? '+' : ''}${Math.round(profile.trend.delta)} จุด` : 'ข้อมูลยังไม่พอดูแนวโน้ม'} color="amber" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <Kpi icon="⚡" label="ถูกตั้งแต่ครั้งแรก" value={pctText(profile.firstTryRate)} sub={profile.trackedCorrect ? `${profile.firstTry}/${profile.trackedCorrect} ข้อที่มีข้อมูล` : 'ยังไม่มีข้อมูล'} color="emerald" />
                    <Kpi icon="🔄" label="ลองเฉลี่ยกว่าจะถูก" value={profile.avgAttempts === null ? '–' : `${profile.avgAttempts.toFixed(1)} ครั้ง`} sub="ต่อข้อ (1.0 = ถูกทันที)" color="indigo" />
                    <Kpi icon="📖" label="ถูกหลังดูเฉลย" value={String(profile.assistedCorrect)} sub={profile.assistedRate === null ? '–' : `${Math.round(profile.assistedRate * 100)}% ของข้อที่ถูก`} color="rose" />
                    <Kpi icon="🧠" label="ถูกด้วยตัวเอง" value={pctText(profile.independentRate)} sub="ไม่นับข้อที่ดูเฉลยก่อน" color="purple" />
                  </div>
                </Card>

                <Card title="💡 ข้อแนะนำสำหรับครู (สร้างอัตโนมัติจากผลงาน)">
                  <ul className="space-y-2">
                    {buildInsights(profile).map((t, i) => (<li key={i} className="flex gap-2 text-sm font-semibold text-gray-700 bg-amber-50/50 border border-amber-100 rounded-xl px-3.5 py-2.5"><span>👉</span><span>{t}</span></li>))}
                  </ul>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                  <Card title="📈 คะแนนรายชุดล่าสุด" subtitle="12 ชุดล่าสุดที่ทำ (เก่า → ใหม่)">
                    {trendSets.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีข้อมูล</p> : (
                      <div className="flex items-end gap-1.5 h-40">
                        {trendSets.map((r) => (
                          <div key={r.setId} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${r.title}: ${r.correct}/${r.total}`}>
                            <span className={`text-[10px] font-black ${toneText(r.pct)}`}>{Math.round(r.pct * 100)}</span>
                            <div className="w-full bg-gray-100 rounded-t-md flex items-end" style={{ height: '5.5rem' }}><div className={`w-full rounded-t-md ${tone(r.pct)}`} style={{ height: `${Math.max(4, r.pct * 100)}%` }} /></div>
                            <span className="text-[9px] font-bold text-gray-400 mt-1 truncate w-full text-center">{formatDay(r.day).split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card title="🧩 รูปแบบข้อผิดพลาดของเด็กคนนี้" subtitle="ช่วยบอกว่าควรทบทวนเรื่องอะไร">
                    {Object.values(profile.errorTypes).every((n) => n === 0) ? <p className="text-sm text-gray-400 text-center py-6">ไม่พบข้อผิดพลาด 🎉</p> : (
                      <div className="space-y-3">
                        {(Object.keys(ERROR_INFO) as ErrorType[]).filter((t) => profile.errorTypes[t] > 0).sort((a, b) => profile.errorTypes[b] - profile.errorTypes[a]).map((t) => (
                          <div key={t}>
                            <div className="flex justify-between text-xs font-extrabold text-gray-700 mb-1"><span>{ERROR_INFO[t].icon} {ERROR_INFO[t].label}</span><span>{profile.errorTypes[t]} ข้อ</span></div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-400 to-rose-400 rounded-full" style={{ width: `${(profile.errorTypes[t] / Math.max(1, ...Object.values(profile.errorTypes))) * 100}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                <Card title="📚 ผลรายชุด (กดเพื่อดูคำตอบรายข้อ)" subtitle={`${profile.perSet.length} ชุดในช่วงวันที่ที่เลือก`}>
                  {profile.perSet.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">ไม่มีชุดโจทย์ในช่วงนี้</p> : (
                    <div className="space-y-2">
                      {profile.perSet.map((r) => {
                        const open = expandedSetId === r.setId
                        const probs = analytics.problemsBySet.get(r.setId) || []
                        return (
                          <div key={r.setId} className={`rounded-2xl border ${open ? 'border-indigo-200' : 'border-gray-100'}`}>
                            <button onClick={() => setExpandedSetId(open ? '' : r.setId)} className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left cursor-pointer print:cursor-default">
                              <span className="text-[11px] font-bold text-gray-400 w-20 shrink-0">{formatDay(r.day)}</span>
                              <span className="flex-1 min-w-[10rem] text-sm font-extrabold text-gray-800">{r.title}</span>
                              <span className="text-xs">{r.answered === 0 ? <span className="px-2.5 py-1 bg-gray-100 text-gray-500 font-extrabold rounded-full">ยังไม่ทำ</span> : r.perfect ? <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-full">👑 เต็ม</span> : r.finished ? <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-extrabold rounded-full">✓ ครบ</span> : <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-extrabold rounded-full">⏳ ทำไม่ครบ</span>}</span>
                              {r.assisted > 0 && <span className="text-[11px] font-extrabold text-rose-600">📖 ดูเฉลย {r.assisted}</span>}
                              <span className="w-28 flex items-center gap-2"><span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><span className={`block h-full ${tone(r.answered ? r.pct : null)}`} style={{ width: `${r.pct * 100}%` }} /></span><span className={`text-xs font-black ${toneText(r.answered ? r.pct : null)}`}>{r.correct}/{r.total}</span></span>
                              <span className="text-gray-300 print:hidden">{open ? '▲' : '▼'}</span>
                            </button>
                            {open && (
                              <div className="px-4 pb-4 space-y-2">
                                {probs.map((p) => {
                                  const sub = profileSubs.get(p.id)
                                  const ok = sub?.is_correct
                                  const errType: ErrorType | null = sub && !ok ? classifyWrongAnswer(String(sub.student_answer ?? ''), String(p.correct_answer ?? '')) : null
                                  return (
                                    <div key={p.id} className={`p-3 rounded-xl border flex flex-col md:flex-row justify-between gap-2 ${sub ? (ok ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200') : 'bg-gray-50 border-gray-200'}`}>
                                      <div className="space-y-0.5">
                                        <span className="text-[11px] font-black text-gray-400">ข้อ {p.order_num}</span>
                                        <div className="text-sm font-extrabold text-gray-800"><MathText text={p.question_text} /></div>
                                        <p className="text-xs text-gray-500">เฉลย: <span className="font-mono font-bold text-indigo-600">{p.correct_answer}</span></p>
                                      </div>
                                      <div className="text-right shrink-0 text-xs">
                                        {sub ? (<><span className="block font-bold text-gray-600">ตอบ: <span className="font-mono font-bold text-gray-900">{sub.student_answer || '(ว่าง)'}</span></span><span className={`inline-block mt-0.5 px-2.5 py-1 rounded-lg font-extrabold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{ok ? '✓ ถูกต้อง' : '✗ ยังไม่ถูก'}</span>{errType && errType !== 'other' && <span className="block mt-1 text-[11px] font-bold text-rose-600">{ERROR_INFO[errType].icon} {ERROR_INFO[errType].label}</span>}<AttemptChips sub={sub} /></>) : <span className="px-2.5 py-1 bg-gray-200 text-gray-500 font-bold rounded-lg">ยังไม่ได้ทำ</span>}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <Card title="ไม่พบนักเรียน"><p className="text-sm text-gray-400 text-center py-6">เลือกนักเรียนจากรายการด้านบน</p></Card>
            )}
          </div>
        )}

        {/* ===================== 🎯 แท็บที่ 5: วิเคราะห์ภารกิจพิเศษ (แยกส่วนอิสระ) ===================== */}
        {tab === 'quests' && (
          <div className="space-y-6">
            {/* KPI สรุปภาพรวมภารกิจพิเศษ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi
                icon="🎯"
                label="ภารกิจพิเศษทั้งหมด"
                value={String(quests.length)}
                sub={`กำลังเปิดใช้งาน ${questAnalytics.activeCount} เควส`}
                color="rose"
              />
              <Kpi
                icon="🔥"
                label="อัตราการพิชิตเควส"
                value={pctText(questAnalytics.overallCompletionRate)}
                sub={`${questAnalytics.totalDoneSlots}/${questAnalytics.totalEligibleSlots} ครั้งที่สำเร็จ`}
                color="purple"
              />
              <Kpi
                icon="👑"
                label="พิชิตครบทุกเควส"
                value={`${questAnalytics.allQuestChampions} คน`}
                sub={`จากนักเรียน ${gradeStudents.length} คน`}
                color="amber"
              />
              <Kpi
                icon="🪙"
                label="รางวัลของเควสที่เลือก"
                value={currentQuestData ? `+${currentQuestData.quest.reward_coins || 0} 🪙` : '–'}
                sub={currentQuestData ? `และ +${currentQuestData.quest.reward_xp || 0} XP` : ''}
                color="emerald"
              />
            </div>

            {questAnalytics.questList.length === 0 ? (
              <Card title="ยังไม่มีภารกิจพิเศษในระบบ">
                <p className="text-sm text-gray-400 text-center py-8">คุณครูสามารถสร้างภารกิจพิเศษได้ที่เมนู "🎯 จัดการเควส"</p>
              </Card>
            ) : (
              <>
                {/* แถบเลือกภารกิจพิเศษที่ต้องการวิเคราะห์ */}
                <Card
                  title="⚔️ เลือกภารกิจพิเศษที่ต้องการวิเคราะห์"
                  subtitle="แยกข้อมูลออกจากแบบฝึกหัดรายวัน 100% เพื่อดูความสนใจและความสำเร็จของเด็กในกิจกรรมท้าทาย"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {questAnalytics.questList.map((qItem) => {
                      const isSelected = qItem.quest.id === selectedQuestId
                      return (
                        <button
                          key={qItem.quest.id}
                          onClick={() => setSelectedQuestId(qItem.quest.id)}
                          className={`text-left p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'border-rose-400 bg-rose-50/70 ring-2 ring-rose-200 shadow-sm'
                              : 'border-gray-100 bg-gray-50/50 hover:border-rose-200 hover:bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  qItem.quest.is_active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {qItem.quest.is_active ? '🟢 เปิดใช้งาน' : '⚪ ปิดแล้ว'}
                              </span>
                              <span className="text-[11px] font-extrabold text-amber-700">
                                +{qItem.quest.reward_coins} 🪙 • +{qItem.quest.reward_xp} XP
                              </span>
                            </div>
                            <h4 className="font-black text-gray-800 text-sm line-clamp-1">{qItem.quest.title}</h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              กลุ่มเป้าหมาย: {qItem.targetSet?.target_group || 'ทั่วไป'} ({qItem.probs.length} ข้อ)
                            </p>
                          </div>

                          <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs font-extrabold">
                            <span className="text-rose-700">
                              พิชิตแล้ว {qItem.doneCount}/{qItem.eligibleCount} คน
                            </span>
                            <span className={toneText(qItem.completionRate)}>
                              {pctText(qItem.completionRate)}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Card>

                {/* รายละเอียดเชิงลึกของภารกิจพิเศษที่เลือก */}
                {currentQuestData && (
                  <>
                    {/* วิเคราะห์รายข้อเฉพาะในภารกิจพิเศษนี้ */}
                    <Card
                      title={`🔬 วิเคราะห์ความท้าทายรายข้อ: ${currentQuestData.quest.title}`}
                      subtitle={`ชุดโจทย์: ${currentQuestData.targetSet?.title || '-'} • พิชิตเต็ม 100% จำนวน ${currentQuestData.perfectCount} คน`}
                    >
                      {currentQuestData.problemStats.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">ไม่พบข้อสอบในภารกิจนี้</p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                          {currentQuestData.problemStats.map((ps) => (
                            <div key={ps.problem.id} className="p-3.5 rounded-2xl border border-rose-100 bg-rose-50/15 space-y-2">
                              <div className="text-sm font-extrabold text-gray-800">
                                <span className="text-rose-600 mr-1.5">ข้อ {ps.problem.order_num}.</span>
                                <MathText text={ps.problem.question_text} />
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${tone(ps.pct)}`} style={{ width: `${(ps.pct ?? 0) * 100}%` }} />
                                </div>
                                <span className={`text-xs font-black ${toneText(ps.pct)}`}>
                                  {ps.answered > 0 ? `ผ่าน ${pctText(ps.pct)} (${ps.correct}/${ps.answered})` : 'ยังไม่มีคนตอบ'}
                                </span>
                              </div>

                              {ps.answered > 0 && (
                                <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                                    ⚡ ถูกรอบแรก {pctText(ps.firstTryRate)}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                                    🔄 ลองเฉลี่ย {ps.avgAttempts?.toFixed(1)} ครั้ง
                                  </span>
                                  {ps.assistedCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                                      📖 ดูเฉลยก่อนถูก {ps.assistedCount} คน
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* ตารางรายชื่อผู้พิชิตภารกิจพิเศษ */}
                    <Card
                      title={`🏆 สถานะการพิชิตภารกิจของนักเรียน (${filteredQuestStudentRows.length} คน)`}
                      subtitle={`พิชิตสำเร็จ ${currentQuestData.doneCount} คน • กำลังทำ ${currentQuestData.inProgressCount} คน • ยังไม่เริ่ม ${currentQuestData.notStartedCount} คน`}
                      right={
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            placeholder="🔍 ค้นหาชื่อนักเรียน..."
                            value={questStudentSearch}
                            onChange={(e) => setQuestStudentSearch(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-400"
                          />
                          <select
                            value={questStatusFilter}
                            onChange={(e) => setQuestStatusFilter(e.target.value as any)}
                            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
                          >
                            <option value="all">สถานะ: ทั้งหมด</option>
                            <option value="done">✅ พิชิตสำเร็จแล้ว</option>
                            <option value="in_progress">⏳ กำลังทำค้างอยู่</option>
                            <option value="not_started">⚪ ยังไม่เริ่มทำ</option>
                          </select>
                          <button
                            onClick={exportQuestCsv}
                            className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-extrabold rounded-xl cursor-pointer"
                          >
                            ⬇️ CSV เควสนี้
                          </button>
                        </div>
                      }
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-100 text-xs text-gray-400 font-extrabold">
                              <th className="py-3 px-3">นักเรียน</th>
                              <th className="py-3 px-3">กลุ่ม</th>
                              <th className="py-3 px-3">สถานะภารกิจ</th>
                              <th className="py-3 px-3">คะแนนทำได้</th>
                              <th className="py-3 px-3">คอยน์รวมที่ได้รับ</th>
                              <th className="py-3 px-3">พฤติกรรมการตอบ</th>
                              <th className="py-3 px-3 text-right">วันที่พิชิต</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                            {filteredQuestStudentRows.map((r) => (
                              <tr key={r.student.id} className="hover:bg-rose-50/30 transition">
                                <td className="py-3 px-3 font-extrabold text-gray-800">
                                  <div className="flex items-center gap-2.5">
                                    <AvatarDisplay user={r.student} size="sm" showLevel={false} />
                                    <div>
                                      {r.student.display_name}
                                      <span className="block text-xs font-normal text-gray-400 font-mono">
                                        @{r.student.username}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-lg">
                                    {r.student.group_name || 'ทั่วไป'}
                                  </span>
                                </td>

                                <td className="py-3 px-3">
                                  {r.status === 'done' ? (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full">
                                      {r.isPerfect ? '👑 พิชิตเต็ม 100%' : '✅ พิชิตสำเร็จ'}
                                    </span>
                                  ) : r.status === 'in_progress' ? (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full">
                                      ⏳ ทำค้าง ({r.answered}/{r.total})
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-extrabold rounded-full">
                                      ยังไม่เข้าร่วม
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3">
                                  {r.answered > 0 ? (
                                    <span className={`font-black ${toneText(r.pct)}`}>
                                      {r.correct} / {r.total} ข้อ
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">–</span>
                                  )}
                                </td>

                                <td className="py-3 px-3">
                                  {r.status === 'done' ? (
                                    <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black rounded-xl">
                                      +{r.coinsEarned} 🪙
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">–</span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-xs font-extrabold">
                                  {r.answered > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                                        ⚡ รอบแรก {r.firstTry} ข้อ
                                      </span>
                                      {r.assisted > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">
                                          📖 ดูเฉลย {r.assisted} ข้อ
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-300">–</span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right text-xs text-gray-500 font-bold">
                                  {r.completedAt
                                    ? new Date(r.completedAt).toLocaleDateString('th-TH', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '–'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredQuestStudentRows.length === 0 && (
                          <p className="text-center text-sm text-gray-400 py-8">ไม่พบข้อมูลนักเรียนตามตัวกรองที่เลือก</p>
                        )}
                      </div>
                    </Card>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
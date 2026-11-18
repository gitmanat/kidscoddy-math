import { checkAnswer, numericValue } from '@/lib/answerMath'

// =====================================================================
// ตรรกะวิเคราะห์ผลการเรียนของนักเรียน (แยกจาก UI เพื่อให้ทดสอบได้)
// รับข้อมูลดิบจาก Supabase → คืนสถิติรายคน / รายชุด / รายข้อ / รายวัน + ธงเตือนและข้อแนะนำ
// =====================================================================

// ---------- ตัวช่วยวันที่ (เวลาท้องถิ่น) ----------
const pad2 = (n: number) => String(n).padStart(2, '0')
export const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
export const parseDateStr = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
  const d = parseDateStr(s)
  d.setDate(d.getDate() + n)
  return toLocalDateStr(d)
}
export const daysBetween = (from: string, to: string) =>
  Math.round((parseDateStr(to).getTime() - parseDateStr(from).getTime()) / 86400000)

// วันของชุดโจทย์ = target_date (ถ้าไม่มีใช้วันที่สร้าง)
export const getSetDay = (set: any): string => {
  if (set?.target_date) return String(set.target_date).slice(0, 10)
  if (set?.created_at) return toLocalDateStr(new Date(set.created_at))
  return ''
}

// ---------- ชนิดข้อผิดพลาด ----------
export type ErrorType = 'sign' | 'unreduced' | 'close' | 'format' | 'blank' | 'other'

export const ERROR_INFO: Record<ErrorType, { label: string; advice: string; icon: string }> = {
  sign: { icon: '±', label: 'ค่าถูกแต่เครื่องหมายผิด', advice: 'ทบทวนกฎเครื่องหมายของการบวก ลบ คูณ หาร จำนวนเต็ม (ใช้เส้นจำนวน/ตัวอย่างสั้นๆ ช่วย)' },
  unreduced: { icon: '÷', label: 'ไม่ทำเศษส่วนให้เป็นอย่างต่ำ', advice: 'ฝึกหา ห.ร.ม. แล้วทอนเศษส่วนทุกครั้งก่อนตอบ' },
  close: { icon: '≈', label: 'คลาดเคลื่อนเล็กน้อย (±1–2)', advice: 'มักเกิดจากคำนวณ/นับพลาด ให้ฝึกคิดทีละขั้นและตรวจคำตอบซ้ำก่อนส่ง' },
  format: { icon: '⌨', label: 'พิมพ์รูปแบบคำตอบไม่ถูก', advice: 'สอนวิธีพิมพ์คำตอบ (เศษส่วน ยกกำลัง ราก) ด้วยแป้นพิมพ์คณิตศาสตร์' },
  blank: { icon: '∅', label: 'ไม่ได้ตอบ', advice: 'ชวนคุยว่าติดตรงไหน และกระตุ้นให้ลองตอบก่อนขอความช่วยเหลือ' },
  other: { icon: '?', label: 'ผิดแบบอื่นๆ', advice: 'ดูวิธีคิดของเด็กรายข้อ แล้วอธิบายเฉลยเพิ่ม' },
}

const closeNum = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))

export function classifyWrongAnswer(studentAnswer: string, correctAnswer: string): ErrorType {
  const sa = String(studentAnswer ?? '').trim()
  if (!sa) return 'blank'
  const sv = numericValue(sa)
  const cv = numericValue(String(correctAnswer ?? ''))
  if (cv === null) return 'other'
  if (sv === null) return 'format'
  if (cv !== 0 && closeNum(sv, -cv)) return 'sign'
  if (closeNum(sv, cv)) return checkAnswer(sa, correctAnswer).hint ? 'unreduced' : 'other'
  if (Number.isInteger(sv) && Number.isInteger(cv) && Math.abs(sv - cv) <= 2) return 'close'
  return 'other'
}

// ---------- ชนิดข้อมูล ----------
export type FlagLevel = 'high' | 'mid' | 'low' | 'good'
export interface Flag { level: FlagLevel; code: string; label: string; detail: string }

export interface SetResult {
  setId: string
  title: string
  day: string
  total: number
  answered: number
  correct: number
  finished: boolean
  perfect: boolean
  stars: number
  pct: number // correct / total (ข้อที่ไม่ได้ตอบนับเป็นไม่ถูก)
  firstTry: number // จำนวนข้อที่ถูกตั้งแต่ครั้งแรก (เฉพาะข้อที่มีข้อมูลบันทึกจำนวนครั้ง)
  assisted: number // จำนวนข้อที่ถูกหลังดูเฉลย
}

export interface StudentStat {
  id: string
  assigned: number
  attempted: number
  finished: number
  perfect: number
  backlog: number
  backlogSets: SetResult[] // ชุดที่ค้าง (เลยวันแล้วยังไม่จบ)
  answered: number
  correct: number
  accuracy: number | null
  // ---- ลองกี่ครั้งถึงถูก / พึ่งเฉลย ----
  trackedCorrect: number // ข้อที่ถูกและมีข้อมูล attempts_to_correct
  firstTry: number // ถูกตั้งแต่ครั้งแรก
  attemptsSum: number // ผลรวมจำนวนครั้งที่ลองจนถูก (ของข้อที่มีข้อมูล)
  assistedCorrect: number // ถูกหลังดูเฉลย
  firstTryRate: number | null // firstTry / trackedCorrect
  avgAttempts: number | null // เฉลี่ยลองกี่ครั้งจนถูก
  assistedRate: number | null // assistedCorrect / correct
  independentRate: number | null // ถูกด้วยตัวเอง (ไม่ดูเฉลย) / ตอบทั้งหมด
  todayAssigned: number
  todayFinished: number
  lastActive: string | null
  daysSinceActive: number | null
  trend: { recent: number; previous: number; delta: number } | null
  perSet: SetResult[] // ใหม่ → เก่า
  errorTypes: Record<ErrorType, number>
  flags: Flag[]
  priority: number
  tier: 'attention' | 'watch' | 'ok' | 'star'
}

export interface ProblemStat {
  problemId: string
  setId: string
  answered: number
  correct: number
  pct: number | null
  tracked: number // ข้อมูลที่ถูกและมี attempts_to_correct
  firstTry: number
  attemptsSum: number
  assisted: number // ถูกหลังดูเฉลย
  viewedWrong: number // ดูเฉลยแล้วแต่ยังไม่ถูก
  avgAttempts: number | null
  firstTryRate: number | null
  wrong: { answer: string; count: number; type: ErrorType }[]
}

export interface SetStat {
  setId: string
  eligible: number
  attempted: number
  finished: number
  perfect: number
  avgPct: number | null
  buckets: [number, number, number, number] // <50, 50-69, 70-89, >=90
}

export interface DayStat {
  day: string
  sets: number
  eligible: number
  finished: number
  attempted: number
  accuracy: number | null
}

export interface Analytics {
  sets: any[] // ชุดในช่วงวันที่ (ใหม่ → เก่า) ไม่รวมชุดภารกิจพิเศษ
  problemsBySet: Map<string, any[]>
  setStats: Map<string, SetStat>
  problemStats: Map<string, ProblemStat>
  students: Map<string, StudentStat>
  dayStats: DayStat[]
  errorTotals: Record<ErrorType, number>
}

export interface AnalyticsInput {
  sets: any[]
  problems: any[]
  students: any[] // รายชื่อที่ต้องการวิเคราะห์ (กรองระดับชั้นมาแล้ว)
  submissions: any[]
  completions: any[]
  specialSetIds: string[]
  today: string // 'YYYY-MM-DD'
  from: string // '' = ไม่จำกัด
  to: string
}

const emptyErrors = (): Record<ErrorType, number> => ({ sign: 0, unreduced: 0, close: 0, format: 0, blank: 0, other: 0 })
export const matchesGroup = (setGroup: string | null | undefined, studentGroup: string | null | undefined) => {
  const sg = (setGroup || '').trim()
  const stg = (studentGroup || '').trim()
  return !sg || sg === 'ทั่วไป' || !stg || sg === stg
}
const subTime = (sub: any): string | null =>
  sub?.created_at || sub?.updated_at || sub?.submitted_at || sub?.answered_at || null

// =====================================================================
export function buildAnalytics(inp: AnalyticsInput): Analytics {
  const { sets, problems, students, submissions, completions, today, from, to } = inp
  const special = new Set(inp.specialSetIds)

  // ชุดในช่วงวันที่ (ใหม่ → เก่า)
  const setsInRange = sets
    .filter((s) => !special.has(s.id))
    .map((s) => ({ s, day: getSetDay(s) }))
    .filter(({ day }) => day && (!from || day >= from) && (!to || day <= to))
    .sort((a, b) => b.day.localeCompare(a.day))

  const problemsBySet = new Map<string, any[]>()
  problems.forEach((p) => {
    if (!problemsBySet.has(p.set_id)) problemsBySet.set(p.set_id, [])
    problemsBySet.get(p.set_id)!.push(p)
  })
  problemsBySet.forEach((arr) => arr.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0)))

  // คำตอบล่าสุดของแต่ละคนในแต่ละข้อ
  const studentIds = new Set(students.map((s) => s.id))
  const subMap = new Map<string, Map<string, any>>()
  const lastSubTime = new Map<string, string>()
  submissions.forEach((sub) => {
    if (!studentIds.has(sub.user_id)) return
    if (!subMap.has(sub.user_id)) subMap.set(sub.user_id, new Map())
    subMap.get(sub.user_id)!.set(sub.problem_id, sub)
    const t = subTime(sub)
    if (t && (!lastSubTime.has(sub.user_id) || t > lastSubTime.get(sub.user_id)!)) lastSubTime.set(sub.user_id, t)
  })
  const compMap = new Map<string, any>()
  const lastCompTime = new Map<string, string>()
  completions.forEach((c) => {
    if (!studentIds.has(c.user_id)) return
    compMap.set(`${c.user_id}_${c.set_id}`, c)
    if (c.completed_at && (!lastCompTime.has(c.user_id) || c.completed_at > lastCompTime.get(c.user_id)!)) {
      lastCompTime.set(c.user_id, c.completed_at)
    }
  })

  const errorTotals = emptyErrors()
  const problemStats = new Map<string, ProblemStat>()
  const wrongCache = new Map<string, ErrorType>()
  const classify = (sa: string, ca: string) => {
    const key = `${sa}\u0000${ca}`
    let t = wrongCache.get(key)
    if (!t) {
      t = classifyWrongAnswer(sa, ca)
      wrongCache.set(key, t)
    }
    return t
  }

  const studentStats = new Map<string, StudentStat>()
  const setAgg = new Map<string, { eligible: number; attempted: number; finished: number; perfect: number; pcts: number[] }>()
  const dayAgg = new Map<string, { sets: Set<string>; eligible: number; finished: number; attempted: number; correct: number; answered: number }>()

  students.forEach((st) => {
    const mySubs = subMap.get(st.id) || new Map<string, any>()
    const perSet: SetResult[] = []
    const errorTypes = emptyErrors()
    let totalAnswered = 0
    let totalCorrect = 0
    let stTracked = 0
    let stFirstTry = 0
    let stAttemptsSum = 0
    let stAssisted = 0

    setsInRange.forEach(({ s, day }) => {
      if (!matchesGroup(s.target_group, st.group_name)) return
      const probs = problemsBySet.get(s.id) || []
      const total = probs.length
      if (total === 0) return

      const comp = compMap.get(`${st.id}_${s.id}`)
      let answered = 0
      let correct = 0
      let setFirstTry = 0
      let setAssisted = 0
      probs.forEach((p) => {
        const sub = mySubs.get(p.id)
        if (!sub) return
        answered += 1
        const attemptsToCorrect = sub.attempts_to_correct == null ? null : Number(sub.attempts_to_correct)
        const isTracked = !!sub.is_correct && attemptsToCorrect !== null && Number.isFinite(attemptsToCorrect)
        const isAssisted = !!sub.is_correct && !!sub.viewed_solution_before_correct
        if (sub.is_correct) correct += 1
        if (isTracked) {
          stTracked += 1
          stAttemptsSum += attemptsToCorrect!
          if (attemptsToCorrect === 1) {
            stFirstTry += 1
            setFirstTry += 1
          }
        }
        if (isAssisted) {
          stAssisted += 1
          setAssisted += 1
        }
        if (sub.is_correct) {
          /* ถูก */
        } else {
          const type = classify(String(sub.student_answer ?? ''), String(p.correct_answer ?? ''))
          errorTypes[type] += 1
          errorTotals[type] += 1
        }
        // สถิติรายข้อ
        let ps = problemStats.get(p.id)
        if (!ps) {
          ps = { problemId: p.id, setId: s.id, answered: 0, correct: 0, pct: null, tracked: 0, firstTry: 0, attemptsSum: 0, assisted: 0, viewedWrong: 0, avgAttempts: null, firstTryRate: null, wrong: [] }
          problemStats.set(p.id, ps)
        }
        ps.answered += 1
        if (isTracked) {
          ps.tracked += 1
          ps.attemptsSum += attemptsToCorrect!
          if (attemptsToCorrect === 1) ps.firstTry += 1
        }
        if (isAssisted) ps.assisted += 1
        if (!sub.is_correct && sub.viewed_solution) ps.viewedWrong += 1
        if (sub.is_correct) ps.correct += 1
        else {
          const ans = String(sub.student_answer ?? '').trim() || '(ว่าง)'
          const found = ps.wrong.find((w) => w.answer === ans)
          if (found) found.count += 1
          else ps.wrong.push({ answer: ans, count: 1, type: classify(String(sub.student_answer ?? ''), String(p.correct_answer ?? '')) })
        }
      })
      if (answered === 0 && comp) {
        answered = comp.total_questions || total
        correct = comp.score || 0
      }

      const finished = !!comp || answered >= total
      const isFuture = day > today
      if (isFuture && answered === 0 && !comp) return // ชุดล่วงหน้าที่ยังไม่มีใครทำ ไม่นับ

      totalAnswered += answered
      totalCorrect += correct
      perSet.push({
        setId: s.id,
        title: s.title,
        day,
        total,
        answered,
        correct,
        finished,
        perfect: total > 0 && correct >= total,
        stars: comp?.stars || 0,
        pct: total > 0 ? correct / total : 0,
        firstTry: setFirstTry,
        assisted: setAssisted,
      })
    })

    // รวมเข้าสถิติรายชุด/รายวัน (เฉพาะชุดที่ถึงกำหนดแล้ว)
    perSet.forEach((r) => {
      if (r.day > today) return
      const attempted = r.answered > 0
      const sa = setAgg.get(r.setId) || { eligible: 0, attempted: 0, finished: 0, perfect: 0, pcts: [] }
      sa.eligible += 1
      if (attempted) {
        sa.attempted += 1
        sa.pcts.push(r.pct)
      }
      if (r.finished) sa.finished += 1
      if (r.perfect) sa.perfect += 1
      setAgg.set(r.setId, sa)

      const da = dayAgg.get(r.day) || { sets: new Set<string>(), eligible: 0, finished: 0, attempted: 0, correct: 0, answered: 0 }
      da.sets.add(r.setId)
      da.eligible += 1
      if (r.finished) da.finished += 1
      if (attempted) da.attempted += 1
      da.correct += r.correct
      da.answered += r.answered
      dayAgg.set(r.day, da)
    })

    // ---- สรุปรายคน ----
    const due = perSet.filter((r) => r.day <= today)
    const backlogSets = due.filter((r) => r.day < today && !r.finished)
    const todays = due.filter((r) => r.day === today)
    const attempted = perSet.filter((r) => r.answered > 0).length
    const accuracy = totalAnswered > 0 ? totalCorrect / totalAnswered : null

    const times = [lastSubTime.get(st.id), lastCompTime.get(st.id)].filter(Boolean) as string[]
    const lastActive = times.length ? times.sort().slice(-1)[0] : null
    const daysSinceActive = lastActive ? Math.max(0, daysBetween(toLocalDateStr(new Date(lastActive)), today)) : null

    // แนวโน้ม: เทียบ 3 ชุดล่าสุดที่ทำ กับ 3 ชุดก่อนหน้า (ต้องมีอย่างน้อย 4 ชุด)
    const attemptedAsc = perSet.filter((r) => r.answered > 0).sort((a, b) => a.day.localeCompare(b.day))
    let trend: StudentStat['trend'] = null
    if (attemptedAsc.length >= 4) {
      const acc = (arr: SetResult[]) => {
        const a = arr.reduce((x, r) => x + r.answered, 0)
        return a ? arr.reduce((x, r) => x + r.correct, 0) / a : 0
      }
      const recent = acc(attemptedAsc.slice(-3))
      const previous = acc(attemptedAsc.slice(-6, -3))
      trend = { recent, previous, delta: (recent - previous) * 100 }
    }

    const stat: StudentStat = {
      id: st.id,
      assigned: due.length,
      attempted,
      finished: due.filter((r) => r.finished).length,
      perfect: due.filter((r) => r.perfect).length,
      backlog: backlogSets.length,
      backlogSets,
      answered: totalAnswered,
      correct: totalCorrect,
      accuracy,
      trackedCorrect: stTracked,
      firstTry: stFirstTry,
      attemptsSum: stAttemptsSum,
      assistedCorrect: stAssisted,
      firstTryRate: stTracked > 0 ? stFirstTry / stTracked : null,
      avgAttempts: stTracked > 0 ? stAttemptsSum / stTracked : null,
      assistedRate: totalCorrect > 0 ? stAssisted / totalCorrect : null,
      independentRate: totalAnswered > 0 ? (totalCorrect - stAssisted) / totalAnswered : null,
      todayAssigned: todays.length,
      todayFinished: todays.filter((r) => r.finished).length,
      lastActive,
      daysSinceActive,
      trend,
      perSet: perSet.sort((a, b) => b.day.localeCompare(a.day)),
      errorTypes,
      flags: [],
      priority: 0,
      tier: 'ok',
    }
    stat.flags = buildFlags(stat)
    stat.priority = stat.flags.reduce((x, f) => x + (f.level === 'high' ? 3 : f.level === 'mid' ? 2 : f.level === 'low' ? 1 : 0), 0)
    stat.tier = stat.flags.some((f) => f.level === 'good') && stat.priority === 0 ? 'star' : stat.priority >= 3 ? 'attention' : stat.priority >= 1 ? 'watch' : 'ok'
    studentStats.set(st.id, stat)
  })

  problemStats.forEach((ps) => {
    ps.pct = ps.answered > 0 ? ps.correct / ps.answered : null
    ps.avgAttempts = ps.tracked > 0 ? ps.attemptsSum / ps.tracked : null
    ps.firstTryRate = ps.tracked > 0 ? ps.firstTry / ps.tracked : null
    ps.wrong.sort((a, b) => b.count - a.count)
    ps.wrong = ps.wrong.slice(0, 5)
  })

  const setStats = new Map<string, SetStat>()
  setAgg.forEach((a, setId) => {
    const buckets: [number, number, number, number] = [0, 0, 0, 0]
    a.pcts.forEach((p) => {
      if (p < 0.5) buckets[0]++
      else if (p < 0.7) buckets[1]++
      else if (p < 0.9) buckets[2]++
      else buckets[3]++
    })
    setStats.set(setId, {
      setId,
      eligible: a.eligible,
      attempted: a.attempted,
      finished: a.finished,
      perfect: a.perfect,
      avgPct: a.pcts.length ? a.pcts.reduce((x, y) => x + y, 0) / a.pcts.length : null,
      buckets,
    })
  })

  const dayStats: DayStat[] = [...dayAgg.entries()]
    .map(([day, a]) => ({
      day,
      sets: a.sets.size,
      eligible: a.eligible,
      finished: a.finished,
      attempted: a.attempted,
      accuracy: a.answered > 0 ? a.correct / a.answered : null,
    }))
    .sort((a, b) => a.day.localeCompare(b.day))

  return { sets: setsInRange.map((x) => x.s), problemsBySet, setStats, problemStats, students: studentStats, dayStats, errorTotals }
}

// ---------- ธงเตือน ----------
export function buildFlags(st: StudentStat): Flag[] {
  const flags: Flag[] = []
  if (st.backlog >= 3) flags.push({ level: 'high', code: 'backlog', label: `ค้างงาน ${st.backlog} ชุด`, detail: 'ยังไม่ได้ทำการบ้านที่เลยกำหนดมาแล้วหลายชุด' })
  else if (st.backlog >= 1) flags.push({ level: 'mid', code: 'backlog', label: `ค้างงาน ${st.backlog} ชุด`, detail: 'มีการบ้านที่เลยกำหนดแล้วยังไม่จบ' })

  if (st.accuracy !== null && st.answered >= 10) {
    if (st.accuracy < 0.5) flags.push({ level: 'high', code: 'lowAcc', label: `แม่นยำต่ำ ${Math.round(st.accuracy * 100)}%`, detail: 'ตอบถูกน้อยกว่าครึ่ง ควรทบทวนพื้นฐานรายบุคคล' })
    else if (st.accuracy < 0.7) flags.push({ level: 'mid', code: 'lowAcc', label: `แม่นยำ ${Math.round(st.accuracy * 100)}%`, detail: 'ยังต่ำกว่าเกณฑ์ 70% ควรติดตามใกล้ชิด' })
  }
  if (st.trend && st.trend.delta <= -15) {
    flags.push({ level: 'mid', code: 'declining', label: `แม่นยำลดลง ${Math.round(Math.abs(st.trend.delta))} จุด`, detail: 'ผลงาน 3 ชุดล่าสุดแย่กว่า 3 ชุดก่อนหน้าชัดเจน' })
  }
  if (st.daysSinceActive !== null && st.assigned > 0) {
    if (st.daysSinceActive >= 14) flags.push({ level: 'high', code: 'inactive', label: `หายไป ${st.daysSinceActive} วัน`, detail: 'ไม่มีการเข้าฝึกมานาน ควรติดต่อผู้ปกครอง' })
    else if (st.daysSinceActive >= 7) flags.push({ level: 'mid', code: 'inactive', label: `ไม่ได้ฝึก ${st.daysSinceActive} วัน`, detail: 'เริ่มห่างจากการฝึก ควรกระตุ้น' })
  }
  // พึ่งเฉลย: ตอบถูกหลังกดดูวิธีทำ (อาจยังไม่เข้าใจจริง)
  if (st.assistedCorrect >= 3 && st.assistedRate !== null) {
    if (st.assistedRate >= 0.5) flags.push({ level: 'high', code: 'assisted', label: `ถูกหลังดูเฉลย ${st.assistedCorrect} ข้อ`, detail: 'ข้อที่ตอบถูกครึ่งหนึ่งขึ้นไปเกิดหลังเปิดดูเฉลย อาจแค่ลอกคำตอบ' })
    else if (st.assistedRate >= 0.25) flags.push({ level: 'mid', code: 'assisted', label: `พึ่งเฉลย ${st.assistedCorrect} ข้อ`, detail: 'มีข้อที่ตอบถูกหลังดูเฉลยค่อนข้างบ่อย' })
  }
  // ลองผิดลองถูก: ต้องลองหลายครั้งกว่าจะถูก
  if (st.trackedCorrect >= 5 && st.avgAttempts !== null && st.avgAttempts >= 3) {
    flags.push({ level: 'mid', code: 'manyTries', label: `ลองเฉลี่ย ${st.avgAttempts.toFixed(1)} ครั้ง/ข้อ`, detail: 'ต้องลองหลายครั้งกว่าจะถูก อาจใช้วิธีเดาหรือยังไม่เข้าใจ' })
  }
  if (st.todayAssigned > 0 && st.todayFinished < st.todayAssigned) {
    flags.push({ level: 'low', code: 'today', label: 'วันนี้ยังไม่ทำ', detail: `การบ้านวันนี้ทำแล้ว ${st.todayFinished}/${st.todayAssigned} ชุด` })
  }
  if (st.accuracy !== null && st.answered >= 10 && st.accuracy >= 0.9 && st.backlog === 0 && (st.assistedRate ?? 0) < 0.25) {
    flags.push({ level: 'good', code: 'star', label: 'ผลงานเยี่ยม', detail: 'แม่นยำสูงและไม่มีงานค้าง ควรชื่นชม/ท้าทายด้วยโจทย์ระดับสูง' })
  }
  return flags
}

// ---------- ข้อแนะนำสำหรับครู (สร้างอัตโนมัติ) ----------
export function buildInsights(st: StudentStat): string[] {
  const out: string[] = []
  const errs = (Object.entries(st.errorTypes) as [ErrorType, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  errs
    .filter(([t, n]) => t !== 'other' && n >= 2)
    .slice(0, 2)
    .forEach(([t, n]) => out.push(`พบ "${ERROR_INFO[t].label}" ${n} ข้อ → ${ERROR_INFO[t].advice}`))

  if (st.assistedCorrect >= 2 && st.assistedRate !== null) {
    out.push(`ตอบถูกหลังดูเฉลย ${st.assistedCorrect} ข้อ (${Math.round(st.assistedRate * 100)}% ของข้อที่ถูก) → ถามวิธีคิดด้วยปากเปล่า หรือให้ทำโจทย์ลักษณะเดียวกันซ้ำโดยไม่ดูเฉลย เพื่อเช็กว่าเข้าใจจริง`)
  }
  if (st.trackedCorrect >= 5 && st.firstTryRate !== null) {
    if (st.firstTryRate < 0.5) out.push(`ถูกตั้งแต่ครั้งแรกเพียง ${Math.round(st.firstTryRate * 100)}%${st.avgAttempts ? ` (ลองเฉลี่ย ${st.avgAttempts.toFixed(1)} ครั้ง/ข้อ)` : ''} → มักลองผิดลองถูก ชวนให้คิดทีละขั้นและตรวจคำตอบก่อนกดส่ง`)
    else if (st.firstTryRate >= 0.85) out.push(`ถูกตั้งแต่ครั้งแรก ${Math.round(st.firstTryRate * 100)}% → ทำเองได้แม่น ลองเพิ่มความท้าทาย`)
  }

  const weak = st.perSet.filter((r) => r.answered > 0 && r.pct < 0.6).slice(0, 3)
  if (weak.length) out.push(`ชุดที่ควรให้ทำซ้ำ: ${weak.map((r) => `${r.title} (${Math.round(r.pct * 100)}%)`).join(' • ')}`)

  if (st.backlog >= 1) out.push(`มีงานค้าง ${st.backlog} ชุด → แนะนำให้ทำชุดล่าสุดก่อน แล้วค่อยไล่ย้อนหลังวันละ 1 ชุด`)
  const near = st.perSet.filter((r) => r.finished && !r.perfect && r.pct >= 0.8).slice(0, 2)
  if (near.length) out.push(`ใกล้เต็มแล้ว: ${near.map((r) => `${r.title} (ขาด ${r.total - r.correct} ข้อ)`).join(' • ')} → ชวนไปเก็บให้เต็ม 100%`)

  if (st.trend && st.trend.delta >= 10) out.push(`แนวโน้มดีขึ้น +${Math.round(st.trend.delta)} จุด → ชื่นชมเพื่อรักษาแรงจูงใจ`)
  if (st.trend && st.trend.delta <= -15) out.push(`แนวโน้มลดลง ${Math.round(st.trend.delta)} จุด → สอบถามสาเหตุ (เนื้อหายากขึ้น/ขาดสมาธิ/ไม่ได้ฝึก)`)
  if (st.tier === 'star') out.push('ผลงานโดดเด่น → ลองให้โจทย์ท้าทายหรือภารกิจพิเศษเพิ่ม')
  if (out.length === 0 && st.answered > 0) out.push('ผลงานอยู่ในเกณฑ์ดี ไม่พบสัญญาณที่ต้องกังวล')
  if (st.answered === 0) out.push('ยังไม่มีข้อมูลการทำโจทย์ในช่วงวันที่ที่เลือก')
  return out
}

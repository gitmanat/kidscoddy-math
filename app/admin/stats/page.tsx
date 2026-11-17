'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'
import { AvatarDisplay } from '@/components/AvatarDisplay'

// ฟังก์ชันช่วยเรนเดอร์ข้อความผสม LaTeX
function RenderMathText({ text }: { text: string }) {
  if (!text) return null
  const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\\n/g, '\n')
  return (
    <div className="space-y-1">
      {cleanText.split('\n').map((line, lineIdx) => {
        const parts = line.split(/(\$[^$]+\$)/g)
        return (
          <div key={lineIdx}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                return <InlineMath key={pIdx} math={part.slice(1, -1).trim()} />
              }
              return <span key={pIdx}>{part}</span>
            })}
          </div>
        )
      })}
    </div>
  )
}

export default function AdminStatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [problemSets, setProblemSets] = useState<any[]>([])
  const [allProblems, setAllProblems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])

  // ตัวกรองระดับชั้น & ค้นหาชุดข้อสอบ
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedSetId, setSelectedSetId] = useState<string>('')

  // แท็บมุมมองหลัก: 'students' (วิเคราะห์รายบุคคล) | 'problems' (วิเคราะห์ความยากรายข้อ)
  const [activeTab, setActiveTab] = useState<'students' | 'problems'>('students')

  // Modal เจาะลึกรายบุคคล
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any>(null)
  const [modalScope, setModalScope] = useState<'current_set' | 'all_sets'>('current_set')

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
    fetchData()
  }, [router])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [setsRes, probsRes, studentsRes, compRes, subsRes] = await Promise.all([
        supabase.from('problem_sets').select('*').order('created_at', { ascending: false }),
        supabase.from('problems').select('id, set_id, question_text, correct_answer, order_num').order('order_num', { ascending: true }),
        supabase.from('users').select('*').eq('role', 'student').order('xp', { ascending: false }),
        supabase.from('set_completions').select('*'),
        supabase.from('submissions').select('*'),
      ])

      const loadedSets = setsRes.data || []
      setProblemSets(loadedSets)
      if (loadedSets.length > 0 && !selectedSetId) {
        setSelectedSetId(loadedSets[0].id)
      }

      setAllProblems(probsRes.data || [])
      setStudents(studentsRes.data || [])
      setCompletions(compRes.data || [])
      setAllSubmissions(subsRes.data || [])
    } catch (err) {
      console.error('Error fetching admin stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // รวมรายการระดับชั้นที่มีทั้งหมด
  const availableGrades = useMemo(() => {
    const gradeSet = new Set<string>()
    problemSets.forEach((s) => {
      const g = s.target_group || s.grade_level || s.group_name || s.category || ''
      if (g && g.trim() !== '') gradeSet.add(g.trim())
    })
    students.forEach((st) => {
      const sg = st.group_name || st.grade_level || ''
      if (sg && sg.trim() !== '') gradeSet.add(sg.trim())
    })
    return Array.from(gradeSet).sort()
  }, [problemSets, students])

  // กรองชุดข้อสอบตามระดับชั้นและคำค้นหา
  const filteredProblemSets = useMemo(() => {
    return problemSets.filter((set) => {
      const setGrade = (set.target_group || set.grade_level || set.group_name || set.category || '').trim()
      const matchGrade =
        selectedGrade === 'ALL' ||
        setGrade === selectedGrade ||
        setGrade === '' ||
        set.title?.includes(selectedGrade)

      const matchSearch =
        !searchQuery.trim() ||
        set.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        setGrade.toLowerCase().includes(searchQuery.toLowerCase())

      return matchGrade && matchSearch
    })
  }, [problemSets, selectedGrade, searchQuery])

  useEffect(() => {
    if (filteredProblemSets.length > 0) {
      const stillExists = filteredProblemSets.some((s) => s.id === selectedSetId)
      if (!stillExists) {
        setSelectedSetId(filteredProblemSets[0].id)
      }
    } else {
      setSelectedSetId('')
    }
  }, [filteredProblemSets, selectedSetId])

  const filteredStudents = useMemo(() => {
    if (selectedGrade === 'ALL') return students
    return students.filter((st) => (st.group_name || 'ทั่วไป') === selectedGrade)
  }, [students, selectedGrade])

  const currentSet = problemSets.find((s) => s.id === selectedSetId)
  const problemsInCurrentSet = useMemo(
    () => allProblems.filter((p) => p.set_id === selectedSetId),
    [allProblems, selectedSetId]
  )
  const problemIdsInCurrentSet = useMemo(
    () => new Set(problemsInCurrentSet.map((p) => p.id)),
    [problemsInCurrentSet]
  )

  // 📊 คำนวณสถิติเชิงลึกรายบุคคลสำหรับชุดปัจจุบัน
  const studentAnalytics = useMemo(() => {
    return filteredStudents.map((st) => {
      const subs = allSubmissions.filter(
        (sub) => sub.user_id === st.id && problemIdsInCurrentSet.has(sub.problem_id)
      )
      const answeredCount = subs.length
      const correctCount = subs.filter((s) => s.is_correct).length
      const firstTryCorrectCount = subs.filter((s) => s.is_correct && (s.attempts || 1) === 1).length
      const totalAttempts = subs.reduce((sum, s) => sum + (s.attempts || 1), 0)
      const avgAttempts = answeredCount > 0 ? +(totalAttempts / answeredCount).toFixed(1) : 0
      const totalQuestions = problemsInCurrentSet.length

      // ประเมินพฤติกรรมการเรียนรู้ (Diagnostic Tag)
      let statusTag = { label: 'ยังไม่เริ่มทำ', color: 'bg-gray-100 text-gray-500', priority: 4 }
      if (answeredCount > 0) {
        const accuracy = (correctCount / answeredCount) * 100
        if (accuracy >= 80 && avgAttempts <= 1.3) {
          statusTag = { label: '🌟 แม่นยำสูง (เข้าใจดีเยี่ยม)', color: 'bg-emerald-100 text-emerald-800', priority: 3 }
        } else if (avgAttempts >= 2.2) {
          statusTag = { label: '⚠️ ลองผิดลองถูกเยอะ (ควรทบทวน)', color: 'bg-amber-100 text-amber-800', priority: 1 }
        } else if (accuracy < 60) {
          statusTag = { label: '🚨 ต้องการเสริมพื้นฐานด่วน', color: 'bg-rose-100 text-rose-800', priority: 0 }
        } else {
          statusTag = { label: '📈 กำลังพัฒนาได้ดี', color: 'bg-sky-100 text-sky-800', priority: 2 }
        }
      }

      return {
        ...st,
        answeredCount,
        correctCount,
        firstTryCorrectCount,
        totalAttempts,
        avgAttempts,
        totalQuestions,
        statusTag,
      }
    })
  }, [filteredStudents, allSubmissions, problemIdsInCurrentSet, problemsInCurrentSet.length])

  // 🧩 คำนวณสถิติรายข้อ (Item Analysis) เพื่อดูว่าข้อไหนเป็นจุดอ่อนของห้อง
  const problemAnalytics = useMemo(() => {
    return problemsInCurrentSet.map((prob, idx) => {
      const subsForProb = allSubmissions.filter((s) => s.problem_id === prob.id)
      const attemptUsersCount = subsForProb.length
      const correctUsersCount = subsForProb.filter((s) => s.is_correct).length
      const firstTryUsersCount = subsForProb.filter((s) => s.is_correct && (s.attempts || 1) === 1).length
      const totalAttempts = subsForProb.reduce((sum, s) => sum + (s.attempts || 1), 0)

      const passRate = attemptUsersCount > 0 ? Math.round((correctUsersCount / attemptUsersCount) * 100) : 0
      const avgAttempts = attemptUsersCount > 0 ? +(totalAttempts / attemptUsersCount).toFixed(1) : 0

      // รวบรวมคำตอบที่เด็กตอบผิดบ่อย (Common Wrong Answers)
      const wrongAnswers = subsForProb
        .filter((s) => !s.is_correct && s.student_answer)
        .map((s) => s.student_answer)

      return {
        ...prob,
        index: idx + 1,
        attemptUsersCount,
        correctUsersCount,
        firstTryUsersCount,
        passRate,
        avgAttempts,
        wrongAnswers,
      }
    })
  }, [problemsInCurrentSet, allSubmissions])

  // สรุปภาพรวมระดับชุดข้อสอบ (KPI Cards)
  const setSummaryKPI = useMemo(() => {
    const activeStudents = studentAnalytics.filter((s) => s.answeredCount > 0)
    const avgScore =
      activeStudents.length > 0
        ? +(activeStudents.reduce((acc, s) => acc + s.correctCount, 0) / activeStudents.length).toFixed(1)
        : 0
    const avgAttemptsOverall =
      activeStudents.length > 0
        ? +(activeStudents.reduce((acc, s) => acc + s.avgAttempts, 0) / activeStudents.length).toFixed(1)
        : 0
    const needHelpCount = studentAnalytics.filter((s) => s.statusTag.priority <= 1).length

    // หาข้อที่ยากที่สุด (ผ่านน้อยสุด หรือ ใช้จำนวนครั้งตอบเฉลี่ยสูงสุด)
    const hardestProb = [...problemAnalytics]
      .filter((p) => p.attemptUsersCount > 0)
      .sort((a, b) => a.passRate - b.passRate || b.avgAttempts - a.avgAttempts)[0]

    return {
      activeCount: activeStudents.length,
      totalStudents: filteredStudents.length,
      avgScore,
      avgAttemptsOverall,
      needHelpCount,
      hardestProb,
    }
  }, [studentAnalytics, filteredStudents.length, problemAnalytics])

  // ฟังก์ชันคัดลอกสรุปจุดอ่อนของเด็กคนนั้น เพื่อนำไปวางให้ AI หรือครูออกโจทย์เสริม
  const handleCopyWeaknessReport = (student: any) => {
    const studentSubs = allSubmissions.filter((s) => s.user_id === student.id)
    const weakItems = allProblems
      .map((prob) => {
        const sub = studentSubs.find((s) => s.problem_id === prob.id)
        if (!sub) return null
        if (!sub.is_correct || (sub.attempts || 1) >= 2) {
          const setTitle = problemSets.find((ps) => ps.id === prob.set_id)?.title || 'ไม่ระบุชุด'
          return `- [${setTitle}] โจทย์: ${prob.question_text} | เฉลย: ${prob.correct_answer} | เด็กตอบ: ${sub.student_answer} (${sub.is_correct ? 'ถูกแต่ลอง ' + sub.attempts + ' ครั้ง' : 'ยังตอบผิด ลองไป ' + sub.attempts + ' ครั้ง'})`
        }
        return null
      })
      .filter(Boolean)

    const reportText = `รายงานวิเคราะห์จุดอ่อนนักเรียน: ${student.display_name} (${student.group_name || 'ทั่วไป'})\nรายการข้อที่ตอบผิดหรือต้องลองตอบหลายครั้ง:\n${
      weakItems.length > 0 ? weakItems.join('\n') : 'ไม่มีข้อที่ผิดพลาด ทำได้แม่นยำทุกข้อ!'
    }\n\nคำแนะนำ: กรุณาออกแบบฝึกหัดเสริมทักษะที่คล้ายกับโจทย์ด้านบนเพื่ออุดรอยรั่วให้นักเรียนคนนี้`

    navigator.clipboard.writeText(reportText)
    alert('📋 คัดลอกรายงานวิเคราะห์จุดอ่อนของ ' + student.display_name + ' เรียบร้อยแล้ว! คุณครูสามารถนำไปวางเพื่อออกแบบโจทย์เสริมได้ทันทีครับ')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">
        กำลังวิเคราะห์ข้อมูลการเรียนรู้ของนักเรียน...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40 pb-16">
      {/* =====================================================================
          Modal เจาะลึกการวิเคราะห์รายบุคคล (Individual Student Deep-Dive)
          ===================================================================== */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-indigo-100 space-y-5 max-h-[90vh] flex flex-col">
            {/* Header ของ Modal */}
            <div className="flex flex-wrap justify-between items-start gap-4 border-b border-gray-100 pb-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <AvatarDisplay user={selectedStudentForDetail} size="sm" showLevel={true} />
                <div>
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                    {selectedStudentForDetail.display_name}
                    <span className="text-xs px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                      {selectedStudentForDetail.group_name || 'ทั่วไป'}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">
                    XP สะสม: {selectedStudentForDetail.xp || 0} • Streak: {selectedStudentForDetail.streak_days || 0} วัน
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyWeaknessReport(selectedStudentForDetail)}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>คัดลอกจุดอ่อนไปสร้างโจทย์เสริม</span>
                </button>
                <button
                  onClick={() => setSelectedStudentForDetail(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ตัวเลือกขอบเขตการดูใน Modal */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setModalScope('current_set')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  modalScope === 'current_set'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📌 เฉพาะชุดปัจจุบัน ({currentSet?.title})
              </button>
              <button
                onClick={() => setModalScope('all_sets')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  modalScope === 'all_sets'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📚 ประวัติที่เคยทำทั้งหมดทุกชุด
              </button>
            </div>

            {/* เนื้อหารายข้อ */}
            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {(() => {
                const targetProblems =
                  modalScope === 'current_set'
                    ? problemsInCurrentSet
                    : allProblems.filter((p) =>
                        allSubmissions.some((s) => s.user_id === selectedStudentForDetail.id && s.problem_id === p.id)
                      )

                if (targetProblems.length === 0) {
                  return <p className="text-center py-10 text-gray-400 text-sm">ยังไม่มีประวัติการทำข้อสอบในช่วงที่เลือก</p>
                }

                return targetProblems.map((prob, idx) => {
                  const sub = allSubmissions.find(
                    (s) => s.user_id === selectedStudentForDetail.id && s.problem_id === prob.id
                  )
                  const attempts = sub?.attempts || 0
                  const isCorrect = sub?.is_correct
                  const setInfo = problemSets.find((ps) => ps.id === prob.set_id)

                  return (
                    <div
                      key={prob.id}
                      className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
                        !sub
                          ? 'bg-gray-50 border-gray-200'
                          : isCorrect && attempts === 1
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : isCorrect && attempts > 1
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-rose-50/70 border-rose-200'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-gray-600">
                            {modalScope === 'all_sets' ? `[${setInfo?.title}] ` : ''}ข้อที่ {prob.order_num || idx + 1}
                          </span>
                          {sub && (
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                attempts === 1
                                  ? 'bg-emerald-200/70 text-emerald-900'
                                  : attempts <= 3
                                  ? 'bg-amber-200/80 text-amber-900'
                                  : 'bg-rose-200 text-rose-900'
                              }`}
                            >
                              🔄 ลองตอบ {attempts} ครั้ง
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-extrabold text-gray-800">
                          <RenderMathText text={prob.question_text} />
                        </div>

                        <p className="text-xs text-gray-500">
                          เฉลยที่ถูกต้อง:{' '}
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {prob.correct_answer}
                          </span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {sub ? (
                          <div className="space-y-1">
                            <span className="text-xs font-bold block text-gray-700">
                              คำตอบล่าสุด:{' '}
                              <span className="font-mono font-black text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                {sub.student_answer}
                              </span>
                            </span>
                            <span
                              className={`text-xs font-extrabold px-2.5 py-1 rounded-lg inline-block ${
                                isCorrect
                                  ? attempts === 1
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-500 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {isCorrect
                                ? attempts === 1
                                  ? '✓ ผ่านในครั้งเดียว!'
                                  : `✓ ผ่าน (ลอง ${attempts} ครั้ง)`
                                : `✗ ยังไม่ผ่าน (ลอง ${attempts} ครั้ง)`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 px-3 py-1 bg-gray-200 rounded-lg">
                            ยังไม่ได้ทำ
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="bg-white/90 backdrop-blur-md shadow-xs border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-200">
              📈
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">KidsCoddy Learning Analytics</h1>
              <p className="text-xs text-indigo-600 font-bold">
                ระบบวิเคราะห์พฤติกรรมการเรียนรู้ & วินิจฉัยจุดอ่อนรายบุคคล
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData()}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              🔄 อัปเดตข้อมูลล่าสุด
            </button>
            <button
              onClick={() => router.push('/admin/exercises')}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              📚 จัดการชุดข้อสอบ
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              🏠 กลับหน้าหลัก
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-6">
        {/* แถบตัวกรองระดับชั้น & ค้นหาชุดแบบฝึกหัด */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-100 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-black text-gray-800">🎯 เลือกชุดแบบฝึกหัดที่ต้องการวิเคราะห์</h2>
              <p className="text-xs text-gray-500">
                กรองตามระดับชั้นหรือพิมพ์ชื่อบทเรียนเพื่อดูผลการวิเคราะห์เชิงลึก
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedGrade('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  selectedGrade === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                ทุกระดับชั้น
              </button>
              {availableGrades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    selectedGrade === grade
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="🔍 ค้นหาชื่อชุดโจทย์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-gray-700"
            />
            <div className="md:col-span-2">
              <select
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/40 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-extrabold text-gray-800 cursor-pointer"
              >
                {filteredProblemSets.length === 0 ? (
                  <option value="">-- ไม่พบชุดข้อสอบในเงื่อนไขที่เลือก --</option>
                ) : (
                  filteredProblemSets.map((set, index) => {
                    const gradeLabel = set.target_group || set.grade_level || set.group_name
                    return (
                      <option key={set.id} value={set.id}>
                        {index + 1}. {gradeLabel ? `[${gradeLabel}] ` : ''}
                        {set.title}
                      </option>
                    )
                  })
                )}
              </select>
            </div>
          </div>
        </div>

        {/* =====================================================================
            ส่วนที่ 1: สรุปภาพรวมเชิงลึก (KPI Cards)
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-xs">
            <span className="text-xs font-bold text-gray-400">จำนวนผู้เข้าทำชุดนี้</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-700">{setSummaryKPI.activeCount}</span>
              <span className="text-xs font-bold text-gray-500">/ {setSummaryKPI.totalStudents} คน</span>
            </div>
            <p className="text-[11px] text-indigo-500 font-semibold mt-1">
              จำนวนข้อสอบทั้งหมด {problemsInCurrentSet.length} ข้อ
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs">
            <span className="text-xs font-bold text-gray-400">คะแนนเฉลี่ยของกลุ่ม</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">{setSummaryKPI.avgScore}</span>
              <span className="text-xs font-bold text-gray-500">/ {problemsInCurrentSet.length} คะแนน</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              ความพยายามเฉลี่ย {setSummaryKPI.avgAttemptsOverall} ครั้ง/ข้อ
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-xs">
            <span className="text-xs font-bold text-gray-400">นักเรียนที่ควรเสริมทักษะ</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">{setSummaryKPI.needHelpCount}</span>
              <span className="text-xs font-bold text-gray-500">คน</span>
            </div>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">
              กลุ่มที่ลองตอบหลายครั้งหรือคะแนนต่ำกว่าเกณฑ์
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs">
            <span className="text-xs font-bold text-gray-400">ข้อปราบเซียน (ยากที่สุด)</span>
            <div className="mt-1">
              {setSummaryKPI.hardestProb ? (
                <>
                  <span className="text-xl font-black text-rose-600">
                    ข้อที่ {setSummaryKPI.hardestProb.index}
                  </span>
                  <p className="text-[11px] text-rose-700 font-semibold mt-1">
                    ผ่าน {setSummaryKPI.hardestProb.passRate}% • เฉลี่ย {setSummaryKPI.hardestProb.avgAttempts} ครั้ง
                  </p>
                </>
              ) : (
                <span className="text-sm font-bold text-gray-400">ยังไม่มีข้อมูลการตอบ</span>
              )}
            </div>
          </div>
        </div>

        {/* แท็บสลับโหมดการวิเคราะห์ */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-indigo-50 border border-indigo-100'
            }`}
          >
            <span>🧑‍🎓</span>
            <span>วิเคราะห์พฤติกรรมรายบุคคล ({studentAnalytics.length} คน)</span>
          </button>

          <button
            onClick={() => setActiveTab('problems')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'problems'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-purple-50 border border-purple-100'
            }`}
          >
            <span>🧩</span>
            <span>วิเคราะห์ความยากง่ายรายข้อ ({problemAnalytics.length} ข้อ)</span>
          </button>
        </div>

        {/* =====================================================================
            มุมมองที่ 1: ตารางวิเคราะห์รายบุคคล (Student Diagnostic Table)
            ===================================================================== */}
        {activeTab === 'students' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-indigo-100">
            <div className="mb-6">
              <h3 className="text-lg font-black text-gray-800">
                📋 ผลการวิเคราะห์รายบุคคล: {currentSet?.title || '-'}
              </h3>
              <p className="text-xs text-gray-500">
                ดูจำนวนครั้งที่ลองตอบ (Attempts) ความแม่นยำรอบเดียวผ่าน และกดปุ่ม "เจาะลึกรายข้อ" เพื่อดูจุดอ่อนของเด็กแต่ละคน
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] text-gray-400 font-extrabold uppercase">
                    <th className="py-3 px-4">นักเรียน</th>
                    <th className="py-3 px-4">ทำถูก / ทั้งหมด</th>
                    <th className="py-3 px-4">ผ่านในครั้งเดียว</th>
                    <th className="py-3 px-4">เฉลี่ยการลองตอบ</th>
                    <th className="py-3 px-4">ผลวินิจฉัยการเรียนรู้</th>
                    <th className="py-3 px-4 text-right">เครื่องมือครู</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                  {studentAnalytics.map((st) => (
                    <tr key={st.id} className="hover:bg-indigo-50/40 transition">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <AvatarDisplay user={st} size="sm" showLevel={false} />
                          <div>
                            <p className="font-extrabold text-gray-800">{st.display_name}</p>
                            <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                              {st.group_name || 'ทั่วไป'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-black text-gray-800">
                          {st.correctCount} / {st.totalQuestions} ข้อ
                        </span>
                        <span className="block text-[11px] text-gray-400">
                          ส่งคำตอบแล้ว {st.answeredCount} ข้อ
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {st.answeredCount > 0 ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold">
                            🎯 {st.firstTryCorrectCount} ข้อ ({Math.round((st.firstTryCorrectCount / st.answeredCount) * 100)}%)
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {st.answeredCount > 0 ? (
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                              st.avgAttempts <= 1.3
                                ? 'bg-gray-100 text-gray-700'
                                : st.avgAttempts <= 2.2
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            🔄 {st.avgAttempts} ครั้ง/ข้อ
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block ${st.statusTag.color}`}>
                          {st.statusTag.label}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedStudentForDetail(st)
                            setModalScope('current_set')
                          }}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer"
                        >
                          🔍 เจาะลึกรายข้อ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            มุมมองที่ 2: ตารางวิเคราะห์รายข้อ (Item Analysis / จุดอ่อนของทั้งห้อง)
            ===================================================================== */}
        {activeTab === 'problems' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-purple-100 space-y-4">
            <div>
              <h3 className="text-lg font-black text-gray-800">
                🧩 วิเคราะห์ความยากง่ายและจุดผิดพลาดรายข้อ
              </h3>
              <p className="text-xs text-gray-500">
                ช่วยให้ครูเห็นว่าโจทย์ข้อไหนที่เด็กส่วนใหญ่ทำพลาด หรือต้องกดส่งหลายครั้ง เพื่อนำไปอธิบายซ้ำในห้องเรียน
              </p>
            </div>

            <div className="space-y-3">
              {problemAnalytics.map((prob) => (
                <div
                  key={prob.id}
                  className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-0.5 bg-purple-100 text-purple-800 text-xs font-black rounded-full">
                        ข้อที่ {prob.index}
                      </span>
                      <span className="text-xs text-gray-500 font-bold">
                        เฉลย: <span className="font-mono text-indigo-700">{prob.correct_answer}</span>
                      </span>
                    </div>

                    <div className="text-sm font-extrabold text-gray-800">
                      <RenderMathText text={prob.question_text} />
                    </div>

                    {prob.wrongAnswers.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-rose-600">คำตอบที่เด็กตอบผิด:</span>
                        {Array.from(new Set(prob.wrongAnswers)).map((ans: any, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs rounded"
                          >
                            {ans}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap md:flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">อัตราการทำถูก:</span>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black ${
                          prob.passRate >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : prob.passRate >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {prob.passRate}% ({prob.correctUsersCount}/{prob.attemptUsersCount} คน)
                      </span>
                    </div>

                    <span className="text-xs font-extrabold text-gray-600 bg-white px-3 py-1 rounded-xl border border-gray-200">
                      🔄 ลองตอบเฉลี่ย {prob.avgAttempts} ครั้ง/คน
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
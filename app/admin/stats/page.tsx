'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'

export default function AdminStatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [problemSets, setProblemSets] = useState<any[]>([])
  const [allProblems, setAllProblems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])

  // ตัวกรองระดับชั้น & ค้นหาชุดข้อสอบ (รองรับ 100+ ชุด)
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedSetId, setSelectedSetId] = useState<string>('')

  // Modal เจาะลึกดูคำตอบรายข้อของนักเรียนคนนั้น
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

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
    try {
      // 1. ดึงชุดข้อสอบทั้งหมด
      const { data: setsData } = await supabase
        .from('problem_sets')
        .select('*')
        .order('created_at', { ascending: false })

      const loadedSets = setsData || []
      setProblemSets(loadedSets)
      if (loadedSets.length > 0) {
        setSelectedSetId(loadedSets[0].id)
      }

      // 2. ดึงข้อสอบทั้งหมด (เพื่อใช้นับจำนวนข้อและจับคู่กับคำตอบที่เด็กส่ง)
      const { data: probsData } = await supabase
        .from('problems')
        .select('id, set_id, question_text, correct_answer, order_num')
        .order('order_num', { ascending: true })

      setAllProblems(probsData || [])

      // 3. ดึงรายชื่อนักเรียนทั้งหมด
      const { data: studentsData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('xp', { ascending: false })

      setStudents(studentsData || [])

      // 4. ดึงข้อมูลประวัติการคอมพลีตชุดโจทย์
      const { data: compData } = await supabase
        .from('set_completions')
        .select('*')

      setCompletions(compData || [])

      // 5. ดึงประวัติการตอบรายข้อทั้งหมด (แก้ปัญหาเด็กทำแล้วแต่ยังไม่กดจบภารกิจแล้ว XP ขึ้น 0)
      const { data: subsData } = await supabase
        .from('submissions')
        .select('*')

      setAllSubmissions(subsData || [])
    } catch (err) {
      console.error('Error fetching admin stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // รวมรายการระดับชั้นที่มีทั้งหมด (ดึงจาก target_group ของชุดข้อสอบ และ group_name ของนักเรียน)
  const availableGrades = useMemo(() => {
    const gradeSet = new Set<string>()
    problemSets.forEach((s) => {
      // ดึงจากฟิลด์ target_group เป็นหลักตามโครงสร้างฐานข้อมูลจริง
      const g = s.target_group || s.grade_level || s.group_name || s.category || ''
      if (g && g.trim() !== '') gradeSet.add(g.trim())
    })
    students.forEach((st) => {
      const sg = st.group_name || st.grade_level || ''
      if (sg && sg.trim() !== '') gradeSet.add(sg.trim())
    })
    return Array.from(gradeSet).sort()
  }, [problemSets, students])

  // กรองชุดข้อสอบตามระดับชั้นและคำค้นหา (อิง target_group)
  const filteredProblemSets = useMemo(() => {
    return problemSets.filter((set) => {
      const setGrade = (set.target_group || set.grade_level || set.group_name || set.category || '').trim()

      const matchGrade =
        selectedGrade === 'ALL' ||
        setGrade === selectedGrade ||
        setGrade === '' || // เผื่อชุดไหนยังไม่ได้เลือก ให้แสดงรวมด้วย
        set.title?.includes(selectedGrade)

      const matchSearch =
        !searchQuery.trim() ||
        set.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        setGrade.toLowerCase().includes(searchQuery.toLowerCase())

      return matchGrade && matchSearch
    })
  }, [problemSets, selectedGrade, searchQuery])

  // อัปเดตชุดที่เลือกอัตโนมัติเมื่อเปลี่ยนตัวกรองแล้วชุดเดิมไม่อยู่ในรายการ
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

  // กรองรายชื่อนักเรียนตามระดับชั้นที่เลือก (ถ้าเลือก ALL จะแสดงทุกคน)
  const filteredStudents = useMemo(() => {
    if (selectedGrade === 'ALL') return students
    return students.filter((st) => (st.group_name || 'ทั่วไป') === selectedGrade)
  }, [students, selectedGrade])

  // เปิด Modal ดูรายละเอียดการตอบรายข้อของเด็ก
  const openStudentDetail = (student: any) => {
    setSelectedStudentForDetail(student)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">
        กำลังโหลดสถิติคุณครู...
      </div>
    )
  }

  const currentSet = problemSets.find((s) => s.id === selectedSetId)
  const problemsInCurrentSet = allProblems.filter((p) => p.set_id === selectedSetId)
  const problemIdsInCurrentSet = new Set(problemsInCurrentSet.map((p) => p.id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      {/* Modal ดูรายละเอียดคำตอบรายข้อ */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-purple-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-800">
                  📊 รายละเอียดการทำโจทย์: {selectedStudentForDetail.display_name}
                </h3>
                <p className="text-xs text-indigo-600 font-bold">ชุด: {currentSet?.title}</p>
              </div>
              <button
                onClick={() => setSelectedStudentForDetail(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {problemsInCurrentSet.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">ไม่มีข้อสอบในชุดนี้</p>
            ) : (
              <div className="space-y-3">
                {problemsInCurrentSet.map((prob, idx) => {
                  const sub = allSubmissions.find(
                    (s) => s.user_id === selectedStudentForDetail.id && s.problem_id === prob.id
                  )
                  const isCorrect = sub?.is_correct

                  return (
                    <div
                      key={prob.id}
                      className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
                        sub
                          ? isCorrect
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-rose-50/60 border-rose-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-black text-gray-500 block">ข้อที่ {idx + 1}</span>
                        <div className="text-sm font-extrabold text-gray-800">
                          {prob.question_text.split('$').map((part: string, i: number) =>
                            i % 2 === 1 ? <InlineMath key={i} math={part} /> : <span key={i}>{part}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          เฉลยที่ถูกต้อง:{' '}
                          <span className="font-mono font-bold text-indigo-600">{prob.correct_answer}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {sub ? (
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold block text-gray-600">
                              ตอบ: <span className="font-mono font-bold text-gray-900">{sub.student_answer}</span>
                            </span>
                            <span
                              className={`text-xs font-extrabold px-2.5 py-1 rounded-lg inline-block ${
                                isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isCorrect ? '✓ ถูกต้อง (+1 XP)' : '✗ ยังไม่ถูกต้อง'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 px-2.5 py-1 bg-gray-200 rounded-lg">
                            ยังไม่ได้ทำ
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => setSelectedStudentForDetail(null)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-2xl transition cursor-pointer text-sm"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-200">
              📊
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">สถิติการฝึกฝนของนักเรียน</h1>
              <p className="text-xs text-emerald-600 font-bold">
                ตรวจสอบคะแนน XP และผลการทำแบบฝึกหัดรายบุคคล (อัปเดตเรียลไทม์)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData()}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              🔄 รีเฟรชข้อมูล
            </button>
            <button
              onClick={() => router.push('/admin/users')}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              👥 จัดการนักเรียน
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
        {/* แถบตัวกรองระดับชั้น & ค้นหาชุดแบบฝึกหัด (รองรับ 100+ ชุด) */}
        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-md border border-indigo-100 space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800">🎯 เลือกชุดแบบฝึกหัดและระดับชั้น</h2>
              <p className="text-xs text-gray-500">
                พบชุดแบบฝึกหัดทั้งหมด {filteredProblemSets.length} ชุด (จากทั้งหมด {problemSets.length} ชุด)
              </p>
            </div>

            {/* ปุ่มเลือกตัวกรองระดับชั้น */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedGrade('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  selectedGrade === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm'
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
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* ช่องค้นหา + Dropdown เลือกชุดโจทย์ (แก้ปัญหาล้นหน้าจอเมื่อมี 100+ ชุด) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <input
                type="text"
                placeholder="🔍 ค้นหาชื่อชุดโจทย์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold text-gray-700"
              />
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-extrabold text-gray-800 cursor-pointer"
              >
                {filteredProblemSets.length === 0 ? (
                  <option value="">-- ไม่พบชุดข้อสอบในเงื่อนไขที่เลือก --</option>
                ) : (
                  filteredProblemSets.map((set, index) => {
                    const gradeLabel = set.grade_level || set.group_name || set.category
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

        {/* ตารางแสดงผลสถิติรายบุคคล */}
        <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-md border border-indigo-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-800">
                📋 สรุปผลคะแนนชุด: {currentSet?.title || '-'}
              </h3>
              <p className="text-xs text-gray-500">
                แสดงรายชื่อนักเรียน {filteredStudents.length} คน • จำนวนข้อสอบในชุดนี้{' '}
                {problemsInCurrentSet.length} ข้อ
              </p>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              ไม่พบข้อมูลนักเรียนในระดับชั้นที่เลือก
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 font-extrabold uppercase">
                    <th className="py-3 px-4">ชื่อนักเรียน</th>
                    <th className="py-3 px-4">ระดับชั้น / กลุ่ม</th>
                    <th className="py-3 px-4">ความคืบหน้า</th>
                    <th className="py-3 px-4">XP ชุดนี้ (ทำถูกจริง)</th>
                    <th className="py-3 px-4">XP สะสมรวม</th>
                    <th className="py-3 px-4 text-right">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                  {filteredStudents.map((st) => {
                    // ดึงคำตอบของนักเรียนคนนี้เฉพาะข้อที่อยู่ในชุดโจทย์ปัจจุบัน
                    const studentSubsInSet = allSubmissions.filter(
                      (sub) => sub.user_id === st.id && problemIdsInCurrentSet.has(sub.problem_id)
                    )
                    const answeredCount = studentSubsInSet.length
                    const correctCount = studentSubsInSet.filter((sub) => sub.is_correct).length
                    const totalQuestions = problemsInCurrentSet.length

                    // เช็กสถานะการจบภารกิจ (จากตาราง set_completions หรือทำครบทุกข้อ)
                    const comp = completions.find(
                      (c) => c.user_id === st.id && c.set_id === selectedSetId
                    )
                    const isFinished = !!comp || (totalQuestions > 0 && answeredCount >= totalQuestions)

                    return (
                      <tr key={st.id} className="hover:bg-emerald-50/40 transition">
                        <td className="py-4 px-4 font-extrabold text-gray-800">
                          {st.display_name}
                          <span className="block text-xs font-normal text-gray-400 font-mono">
                            @{st.username}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-lg">
                            {st.group_name || 'ทั่วไป'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {isFinished ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full">
                              ✓ ทำครบแล้ว ({answeredCount}/{totalQuestions})
                            </span>
                          ) : answeredCount > 0 ? (
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full">
                              ⏳ กำลังทำ ({answeredCount}/{totalQuestions} ข้อ)
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-extrabold rounded-full">
                              ยังไม่เริ่มทำ
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 font-black rounded-xl text-xs">
                            ✨ {correctCount} / {totalQuestions} XP
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-extrabold text-amber-600">
                            🏆 {st.xp || 0} XP (Lv.{st.level || 1})
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => openStudentDetail(st)}
                            className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-extrabold rounded-xl transition cursor-pointer"
                          >
                            🔍 ดูคำตอบรายข้อ
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
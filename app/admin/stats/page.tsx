'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminStatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [problemSets, setProblemSets] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string>('')

  // Modal เจาะลึกดูคำตอบรายข้อของนักเรียนคนนั้น
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any>(null)
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([])
  const [problemsInSet, setProblemsInSet] = useState<any[]>([])
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
        .order('created_at', { ascending: true })

      setProblemSets(setsData || [])
      if (setsData && setsData.length > 0) {
        setSelectedSetId(setsData[0].id)
      }

      // 2. ดึงรายชื่อนักเรียนทั้งหมด
      const { data: studentsData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('xp', { ascending: false })

      setStudents(studentsData || [])

      // 3. ดึงข้อมูลประวัติการคอมพลีตชุดโจทย์ทั้งหมด
      const { data: compData } = await supabase
        .from('set_completions')
        .select('*')

      setCompletions(compData || [])
    } catch (err) {
      console.error('Error fetching admin stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // เปิด Modal ดูรายละเอียดการตอบรายข้อของเด็ก
  const openStudentDetail = async (student: any, setId: string) => {
    setSelectedStudentForDetail(student)
    setLoadingDetail(true)

    try {
      // ดึงรายการโจทย์ในชุดนี้
      const { data: probs } = await supabase
        .from('problems')
        .select('*')
        .eq('set_id', setId)
        .order('order_num', { ascending: true })

      setProblemsInSet(probs || [])

      // ดึงประวัติการตอบ (submissions) ของเด็กคนนี้
      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', student.id)

      setStudentSubmissions(subs || [])
    } catch (err) {
      console.error('Error loading student detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดสถิติคุณครู...</div>
  }

  const currentSet = problemSets.find((s) => s.id === selectedSetId)

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

            {loadingDetail ? (
              <p className="text-center py-8 text-gray-400 text-sm">กำลังโหลดข้อมูลคำตอบ...</p>
            ) : problemsInSet.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">ไม่มีข้อสอบในชุดนี้</p>
            ) : (
              <div className="space-y-3">
                {problemsInSet.map((prob, idx) => {
                  const sub = studentSubmissions.find((s) => s.problem_id === prob.id)
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
                        <p className="text-sm font-extrabold text-gray-800">{prob.question_text}</p>
                        <p className="text-xs text-gray-500">
                          เฉลยที่ถูกต้อง: <span className="font-mono font-bold text-indigo-600">{prob.correct_answer}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {sub ? (
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold block text-gray-600">
                              ตอบ: <span className="font-mono font-bold text-gray-900">{sub.student_answer}</span>
                            </span>
                            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg inline-block ${
                              isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
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
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-200">
              📊
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">สถิติการฝึกฝนของนักเรียน</h1>
              <p className="text-xs text-emerald-600 font-bold">ตรวจสอบคะแนน XP และผลการทำแบบฝึกหัดรายบุคคล</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/users')}
              className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              👥 จัดการนักเรียน
            </button>
            <button
              onClick={() => router.push('/admin/exercises')}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              📚 จัดการชุดข้อสอบ
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              🏠 กลับหน้าหลัก
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        
        {/* เลือกชุดแบบฝึกหัด */}
        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-md border border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-800">🎯 เลือกชุดแบบฝึกหัดที่ต้องการตรวจสอบ</h2>
            <p className="text-xs text-gray-500">คลิกเลือกชุดโจทย์ด้านข้างเพื่อดูคะแนน XP ที่เด็กทำได้ในแต่ละชุด</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {problemSets.map((set) => (
              <button
                key={set.id}
                onClick={() => setSelectedSetId(set.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  selectedSetId === set.id
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {set.title}
              </button>
            ))}
          </div>
        </div>

        {/* ตารางแสดงผลสถิติรายบุคคล */}
        <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-md border border-indigo-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-800">📋 สรุปผลคะแนนชุด: {currentSet?.title || '-'}</h3>
              <p className="text-xs text-gray-500">คลิกที่แถวชื่อนักเรียนเพื่อดูรายละเอียดการตอบคำตอบรายข้อ</p>
            </div>
          </div>

          {students.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">ยังไม่มีข้อมูลนักเรียนในระบบ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 font-extrabold uppercase">
                    <th className="py-3 px-4">ชื่อนักเรียน</th>
                    <th className="py-3 px-4">กลุ่มเรียน</th>
                    <th className="py-3 px-4">สถานะภารกิจ</th>
                    <th className="py-3 px-4">คะแนน XP ที่ทำได้ในชุดนี้</th>
                    <th className="py-3 px-4 text-right">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                  {students.map((st) => {
                    const comp = completions.find(
                      (c) => c.user_id === st.id && c.set_id === selectedSetId
                    )
                    const score = comp ? comp.score : 0
                    const total = comp ? comp.total_questions : '-'
                    const isFinished = !!comp

                    return (
                      <tr key={st.id} className="hover:bg-emerald-50/40 transition">
                        <td className="py-4 px-4 font-extrabold text-gray-800">
                          {st.display_name}
                          <span className="block text-xs font-normal text-gray-400 font-mono">@{st.username}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-lg">
                            {st.group_name || 'ทั่วไป'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {isFinished ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full">
                              ✓ สำเร็จภารกิจแล้ว
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-extrabold rounded-full">
                              ยังไม่จบภารกิจ
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 font-black rounded-xl text-xs">
                            ✨ {score} {total !== '-' ? `/ ${total}` : ''} XP
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => openStudentDetail(st, selectedSetId)}
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
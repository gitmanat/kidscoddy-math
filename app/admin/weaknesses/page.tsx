'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'

// ฟังก์ชันช่วยเรนเดอร์ข้อความผสม LaTeX
function RenderMathText({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="space-y-1">
      {text
        .replace(/\\n/g, '\n')
        .split('\n')
        .map((line, lineIdx) => (
          <div key={lineIdx}>
            {line.includes('$') ? (
              line.split('$').map((part, pIdx) =>
                pIdx % 2 === 1 ? (
                  <InlineMath key={pIdx} math={part} />
                ) : (
                  <span key={pIdx}>{part}</span>
                )
              )
            ) : (
              <span>{line}</span>
            )}
          </div>
        ))}
    </div>
  )
}

function WeaknessContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [weakProblems, setWeakProblems] = useState<any[]>([])

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

    fetchWeaknessData()
  }, [router])

  const fetchWeaknessData = async () => {
    try {
      // 1. ดึงข้อมูลข้อสอบทั้งหมด พร้อมข้อมูลชุดโจทย์
      const { data: problemsData } = await supabase
        .from('problems')
        .select('*, problem_sets(title)')

      // 2. ดึงรายชื่อนักเรียนทั้งหมดเพื่อนำมาจับคู่ชื่อ
      const { data: usersData } = await supabase
        .from('users')
        .select('id, display_name, group_name')
        .eq('role', 'student')

      // 3. ดึงประวัติการส่งคำตอบทั้งหมด
      const { data: subsData } = await supabase
        .from('submissions')
        .select('*')

      if (!problemsData || !subsData) return

      // สร้าง Map สำหรับค้นหาชื่อนักเรียนได้รวดเร็ว
      const userMap: { [userId: string]: { name: string; group: string } } = {}
      if (usersData) {
        usersData.forEach((u) => {
          userMap[u.id] = {
            name: u.display_name || 'ไม่ระบุชื่อ',
            group: u.group_name || '',
          }
        })
      }

      // 4. คำนวณสถิติความผิดพลาด และรวบรวมรายชื่อนักเรียนที่ตอบผิดรายข้อ
      const statsMap: {
        [key: string]: {
          totalAttempts: number
          wrongCount: number
          correctCount: number
          wrongStudents: { name: string; group: string; answer: string }[]
        }
      } = {}

      problemsData.forEach((p) => {
        statsMap[p.id] = {
          totalAttempts: 0,
          wrongCount: 0,
          correctCount: 0,
          wrongStudents: [],
        }
      })

      subsData.forEach((sub) => {
        if (statsMap[sub.problem_id]) {
          statsMap[sub.problem_id].totalAttempts += 1
          if (sub.is_correct) {
            statsMap[sub.problem_id].correctCount += 1
          } else {
            statsMap[sub.problem_id].wrongCount += 1
            const studentInfo = userMap[sub.user_id]
            if (studentInfo) {
              statsMap[sub.problem_id].wrongStudents.push({
                name: studentInfo.name,
                group: studentInfo.group,
                answer: sub.student_answer,
              })
            }
          }
        }
      })

      // 5. ผสานข้อมูลและเรียงลำดับข้อที่มีคนตอบผิดมากที่สุดขึ้นก่อน
      const analyzedList = problemsData.map((p) => {
        const stat = statsMap[p.id] || {
          totalAttempts: 0,
          wrongCount: 0,
          correctCount: 0,
          wrongStudents: [],
        }
        const wrongRate = stat.totalAttempts > 0 ? (stat.wrongCount / stat.totalAttempts) * 100 : 0
        return {
          ...p,
          set_title: p.problem_sets?.title || 'ไม่ระบุชุดโจทย์',
          ...stat,
          wrongRate: Math.round(wrongRate),
        }
      })

      analyzedList.sort((a, b) => b.wrongCount - a.wrongCount || b.wrongRate - a.wrongRate)
      setWeakProblems(analyzedList)
    } catch (err) {
      console.error('Error fetching weakness analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-purple-600 font-bold">กำลังวิเคราะห์ข้อมูลจุดอ่อน...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-purple-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/exercises')}
              className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
            >
              ← กลับหน้าจัดการชุดโจทย์
            </button>
          </div>
          <h1 className="font-extrabold text-gray-800 text-base">⚠️ วิเคราะห์จุดอ่อน (Weakness Analytics)</h1>
          <span className="text-xs px-3 py-1 bg-rose-100 text-rose-700 font-extrabold rounded-full">
            ติดตามรายบุคคล
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 mt-8">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-gray-800">สถิติข้อสอบที่นักเรียนตอบผิดพลาดมากที่สุด</h2>
          <p className="text-sm text-gray-500">
            ตรวจสอบรายชื่อนักเรียนที่ตอบผิดและคำตอบที่เด็กพิมพ์เข้ามา เพื่อติดตามติวเสริมได้ตรงจุด
          </p>
        </div>

        {weakProblems.length === 0 ? (
          <div className="bg-white/90 rounded-3xl p-12 text-center border border-purple-100 shadow-sm">
            <p className="text-gray-500">ยังไม่มีข้อมูลการทำแบบฝึกหัดในระบบ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {weakProblems.map((prob, index) => (
              <div
                key={prob.id}
                className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-md border border-purple-100 flex flex-col md:flex-row justify-between items-start gap-6"
              >
                <div className="space-y-3 flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-black rounded-full">
                      อันดับที่ {index + 1}
                    </span>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                      📁 {prob.set_title}
                    </span>
                    {prob.wrongRate >= 50 && (
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-extrabold rounded-full">
                        🔥 จุดอ่อนที่ต้องเน้นย้ำ!
                      </span>
                    )}
                  </div>

                  {/* โจทย์คำถาม */}
                  <div className="text-gray-800 font-bold text-base">
                    <RenderMathText text={prob.question_text} />
                  </div>

                  {/* เฉลย */}
                  <div className="text-xs text-indigo-700 font-semibold flex items-center gap-2">
                    <span>เฉลยที่ถูกต้อง:</span>
                    <span className="bg-indigo-50 px-2.5 py-1 rounded-lg font-mono font-bold">
                      {prob.correct_answer}
                    </span>
                  </div>

                  {/* รายชื่อนักเรียนที่ตอบผิดในข้อนี้ */}
                  {prob.wrongStudents && prob.wrongStudents.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-rose-100/70">
                      <span className="text-xs font-extrabold text-rose-700 block mb-2">
                        🚨 นักเรียนที่ตอบผิด ({prob.wrongStudents.length} คน):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {prob.wrongStudents.map((st: any, stIdx: number) => (
                          <div
                            key={stIdx}
                            className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs"
                          >
                            <span className="font-extrabold text-rose-900">
                              {st.name} {st.group && <span className="text-rose-500 font-normal">({st.group})</span>}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-mono font-bold text-rose-600 bg-white px-1.5 py-0.5 rounded border border-rose-100">
                              ตอบ: {st.answer}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs font-bold text-emerald-600">
                        ✅ ยังไม่มีนักเรียนตอบผิดในข้อนี้
                      </span>
                    </div>
                  )}
                </div>

                {/* สถิติการตอบด้านขวา */}
                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 gap-2 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-gray-400 block">อัตราการตอบผิด</span>
                    <span className={`text-2xl font-black ${prob.wrongRate > 50 ? 'text-rose-600' : 'text-gray-700'}`}>
                      {prob.wrongRate}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium bg-gray-50 px-3 py-1 rounded-lg">
                    ผิด {prob.wrongCount} / ทำ {prob.totalAttempts} ครั้ง
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function WeaknessAnalyticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-purple-600">กำลังโหลด...</div>}>
      <WeaknessContent />
    </Suspense>
  )
}
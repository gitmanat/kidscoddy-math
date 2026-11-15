'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'

export default function AdminSOSPage() {
  const router = useRouter()
  const [sosList, setSosList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSOSRequests()
  }, [])

  const fetchSOSRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('student_sos_requests')
        .select(`
          *,
          users (display_name, group_name),
          problem_sets (title)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSosList(data || [])
    } catch (err) {
      console.error('Error fetching SOS requests:', err)
    } finally {
      setLoading(false)
    }
  }

  // กดปุ่มเปลี่ยนสถานะเป็นช่วยเหลือแล้ว (ปิดเคส SOS)
  const handleResolveSOS = async (id: string) => {
    try {
      const { error } = await supabase
        .from('student_sos_requests')
        .update({ status: 'resolved' })
        .eq('id', id)

      if (error) throw error
      setSosList(sosList.filter(item => item.id !== id))
    } catch (err) {
      console.error('Error resolving SOS:', err)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดรายการขอความช่วยเหลือ...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-indigo-100">
          <div>
            <h1 className="text-xl font-black text-gray-800">🚨 กล่องคำขอความช่วยเหลือ (SOS Help Desk)</h1>
            <p className="text-xs text-gray-500 mt-1">รายชื่อนักเรียนที่กดขอความช่วยเหลือและข้อความอธิบายปัญหาขณะทำแบบฝึกหัด</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
          >
            🏠 กลับหน้าหลัก
          </button>
        </div>

        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-indigo-100 space-y-4">
          {sosList.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm font-bold">
              🎉 เยี่ยมมาก! ไม่มีนักเรียนติดปัญหาหรือกดขอความช่วยเหลือในขณะนี้
            </div>
          ) : (
            <div className="space-y-4">
              {sosList.map((item) => (
                <div key={item.id} className="p-5 rounded-2xl border border-rose-200 bg-rose-50/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">
                        SOS ติดโจทย์
                      </span>
                      <h3 className="font-extrabold text-gray-800 text-sm">
                        {item.users?.display_name} ({item.users?.group_name || 'ทั่วไป'})
                      </h3>
                      <span className="text-xs text-gray-400">
                        • {new Date(item.created_at).toLocaleString('th-TH')}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-indigo-700">
                      📚 ชุดโจทย์: {item.problem_sets?.title}
                    </p>

                    {/* แสดงโจทย์ รองรับ LaTeX */}
                    <div className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-indigo-100 font-semibold">
                      <span className="text-gray-400 block mb-1">❓ โจทย์ปัญหา:</span>
                      {item.question_text ? (
                        item.question_text.split('$').map((part: string, i: number) =>
                          i % 2 === 1 ? <InlineMath key={i} math={part} /> : <span key={i}>{part}</span>
                        )
                      ) : (
                        <span>ไม่พบข้อความโจทย์</span>
                      )}
                    </div>

                    {/* แสดงข้อความที่เด็กพิมพ์อธิบายปัญหา */}
                    {item.student_note && (
                      <div className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200 font-bold">
                        💬 ข้อความจากนักเรียน: "{item.student_note}"
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleResolveSOS(item.id)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer shrink-0"
                  >
                    ✓ ให้ความช่วยเหลือแล้ว (ปิดเคส)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
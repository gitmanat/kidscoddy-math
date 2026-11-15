'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminSendMessagesPage() {
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [title, setTitle] = useState('🎉 กำลังใจจากคุณครูคนเก่ง')
  const [message, setMessage] = useState('')
  const [rewardCoins, setRewardCoins] = useState(10)
  const [rewardXP, setRewardXP] = useState(15)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, display_name, group_name')
      .eq('role', 'student')
      .order('display_name', { ascending: true })

    setStudents(data || [])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !message.trim()) {
      setStatusMsg('⚠️ กรุณาเลือกนักเรียนและพิมพ์ข้อความก่อนส่ง')
      return
    }

    setLoading(true)
    setStatusMsg('⏳ กำลังส่งจดหมาย...')

    try {
      const { error } = await supabase.from('student_messages').insert({
        receiver_id: selectedStudent,
        title,
        message,
        reward_coins: Number(rewardCoins),
        reward_xp: Number(rewardXP),
      })

      if (error) throw error

      setStatusMsg('🎉 ส่งจดหมายและของขวัญให้นักเรียนสำเร็จเรียบร้อยแล้ว!')
      setMessage('')
    } catch (err: any) {
      console.error(err)
      setStatusMsg(`❌ เกิดข้อผิดพลาด: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-indigo-100">
          <div>
            <h1 className="text-xl font-black text-gray-800">✉️ ส่งจดหมายให้กำลังใจนักเรียน</h1>
            <p className="text-xs text-gray-500 mt-1">ส่งข้อความเซอร์ไพรส์พร้อมแนบเหรียญรางวัลและ XP</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
          >
            🏠 กลับหน้าหลัก
          </button>
        </div>

        <form onSubmit={handleSendMessage} className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-indigo-100 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-gray-700">เลือกนักเรียนผู้รับ:</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">-- เลือกนักเรียน --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name} ({s.group_name || 'ทั่วไป'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-gray-700">หัวข้อจดหมาย:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-gray-700">เนื้อหาข้อความ / คำชม:</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="พิมพ์ข้อความให้กำลังใจ เช่น 'ยอดเยี่ยมมากครับน้องกุนซือ พยายามฝึกซ้อมแบบนี้เรื่อยๆ นะครับ!'..."
              className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700">แนบเหรียญ Coins:</label>
              <input
                type="number"
                value={rewardCoins}
                onChange={(e) => setRewardCoins(Number(e.target.value))}
                className="w-full p-3.5 rounded-2xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700">แนบ XP:</label>
              <input
                type="number"
                value={rewardXP}
                onChange={(e) => setRewardXP(Number(e.target.value))}
                className="w-full p-3.5 rounded-2xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {statusMsg && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-xs font-bold animate-fadeIn">
              {statusMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-200 transition cursor-pointer text-sm"
          >
            {loading ? 'กำลังส่ง...' : '🚀 ส่งจดหมายให้นักเรียน'}
          </button>
        </form>
      </div>
    </div>
  )
}
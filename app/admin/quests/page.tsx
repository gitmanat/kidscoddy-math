'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'

export default function AdminQuestsListPage() {
  const router = useRouter()
  const [quests, setQuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminQuests()
  }, [])

  const fetchAdminQuests = async () => {
    try {
      const { data, error } = await supabase
        .from('special_quests')
        .select(`
          *,
          problem_sets (title)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuests(data || [])
    } catch (err) {
      console.error('Error fetching admin quests:', err)
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันสลับสถานะ เปิด/ปิด ภารกิจ
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('special_quests')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      setQuests(quests.map(q => q.id === id ? { ...q, is_active: !currentStatus } : q))
    } catch (err) {
      console.error('Error updating quest status:', err)
    }
  }

  // ฟังก์ชันลบภารกิจ
  const handleDeleteQuest = async (id: string) => {
    if (!confirm('คุณต้องการลบภารกิจนี้ใช่หรือไม่?')) return

    try {
      const { error } = await supabase
        .from('special_quests')
        .delete()
        .eq('id', id)

      if (error) throw error
      setQuests(quests.filter(q => q.id !== id))
    } catch (err) {
      console.error('Error deleting quest:', err)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดข้อมูลภารกิจ...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-indigo-100 gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-800">🛠️ Admin: จัดการภารกิจพิเศษ (Special Quests)</h1>
            <p className="text-xs text-gray-500 mt-1">ดูรายการภารกิจทั้งหมด เปิด/ปิดสถานะ หรือลบภารกิจ</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin/quests/upload')}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer"
            >
              + อัปโหลด JSON ภารกิจใหม่
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              🏠 กลับหน้าหลัก
            </button>
          </div>
        </div>

        {/* Quests Table / List */}
        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-indigo-100 space-y-4">
          {quests.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm font-bold">
              ยังไม่มีภารกิจพิเศษในระบบ กดปุ่ม "อัปโหลด JSON ภารกิจใหม่" ด้านบนเพื่อเริ่มสร้างได้เลย
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-black text-gray-500">
                    <th className="py-3 px-4">ชื่อภารกิจ</th>
                    <th className="py-3 px-4">ชุดโจทย์ที่ผูก</th>
                    <th className="py-3 px-4">รางวัล</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                  {quests.map((q) => (
                    <tr key={q.id} className="hover:bg-indigo-50/30 transition">
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-gray-800">{q.title}</div>
                        <div className="text-[11px] text-gray-400 font-normal truncate max-w-xs">{q.description}</div>
                      </td>
                      <td className="py-4 px-4 text-indigo-600 font-bold">
                        {q.problem_sets?.title || 'ไม่พบชุดโจทย์'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-200">
                            <CoinIcon className="w-3.5 h-3.5" /> +{q.reward_coins}
                          </span>
                          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                            +{q.reward_xp} XP
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(q.id, q.is_active)}
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition ${
                            q.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {q.is_active ? '🟢 เปิดใช้งาน' : '⚪ ปิดใช้งาน'}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDeleteQuest(q.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-extrabold rounded-xl transition cursor-pointer"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
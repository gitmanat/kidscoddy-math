'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function UploadQuestsAdminPage() {
  const router = useRouter()
  const [jsonInput, setJsonInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // ฟังก์ชันอ่านไฟล์ JSON ที่อัปโหลด
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        // จัดรูปแบบให้อ่านง่ายใน Textarea
        const parsed = JSON.parse(content)
        setJsonInput(JSON.stringify(parsed, null, 2))
        setMessage('📁 โหลดไฟล์ JSON สำเร็จ! ตรวจสอบความถูกต้องด้านล่างแล้วกดบันทึกได้เลย')
      } catch (err) {
        setMessage('❌ รูปแบบไฟล์ JSON ไม่ถูกต้อง กรุณาตรวจสอบโครงสร้างไฟล์')
      }
    }
    reader.readAsText(file)
  }

  // ฟังก์ชันบันทึกข้อมูลลง Supabase
  const handleSaveQuests = async () => {
    if (!jsonInput.trim()) {
      setMessage('⚠️ กรุณาอัปโหลดไฟล์หรือพิมพ์ข้อมูล JSON ก่อนบันทึก')
      return
    }

    setLoading(true)
    setMessage('⏳ กำลังนำเข้าข้อมูลภารกิจพิเศษ...')

    try {
      const questsArray = JSON.parse(jsonInput)

      if (!Array.isArray(questsArray)) {
        throw new Error('ข้อมูล JSON ต้องอยู่ในรูป Array [...]')
      }

      // วนลูปinsert ข้อมูลลงตาราง special_quests
      for (const q of questsArray) {
        const { error } = await supabase.from('special_quests').insert({
          title: q.title,
          description: q.description || '',
          reward_coins: q.reward_coins || 10,
          reward_xp: q.reward_xp || 15,
          target_set_id: q.target_set_id,
          is_active: q.is_active ?? true,
        })

        if (error) throw error
      }

      setMessage('🎉 นำเข้าภารกิจพิเศษทั้งหมดสำเร็จเรียบร้อยแล้ว!')
      setJsonInput('')
    } catch (err: any) {
      console.error('Error importing quests:', err)
      setMessage(`❌ เกิดข้อผิดพลาด: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-indigo-100">
          <div>
            <h1 className="text-xl font-black text-gray-800">🛠️ Admin: อัปโหลดภารกิจพิเศษ (JSON)</h1>
            <p className="text-xs text-gray-500 mt-1">นำเข้าโจทย์ท้าทายและภารกิจประจำวันแบบรวดเร็วผ่านไฟล์ JSON</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
          >
            🏠 กลับหน้าหลัก
          </button>
        </div>

        {/* Upload Card */}
        <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-indigo-100 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-gray-700">1. เลือกไฟล์ JSON ภารกิจพิเศษ:</label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-xs file:font-extrabold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer cursor-pointer border border-gray-200 rounded-2xl p-2"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-gray-700">2. หรือแก้ไขข้อความ JSON โดยตรง:</label>
            <textarea
              rows={10}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="[ { title: '...', reward_coins: 20, target_set_id: '...' } ]"
              className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs text-gray-800 bg-gray-50"
            />
          </div>

          {message && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-xs font-bold animate-fadeIn">
              {message}
            </div>
          )}

          <button
            onClick={handleSaveQuests}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-200 transition cursor-pointer text-sm"
          >
            {loading ? 'กำลังบันทึกข้อมูล...' : '🚀 ยืนยันการอัปโหลดเข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AssignDateField, { toLocalDateStr, useTodayStr } from '@/components/AssignDateField'

// ---------- ตัวช่วยเรื่องวันที่ (เวลาท้องถิ่น) ----------
const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return toLocalDateStr(dt)
}

// รับ 'YYYY-MM-DD' หรือ ISO string → คืน 'YYYY-MM-DD' (ถ้าอ่านไม่ได้คืน '')
const normalizeDay = (v: unknown): string => {
  if (!v) return ''
  const str = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const dt = new Date(str)
  return isNaN(dt.getTime()) ? '' : toLocalDateStr(dt)
}

const dayStartIso = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0).toISOString()
}
const dayEndIso = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59).toISOString()
}

export default function UploadQuestsAdminPage() {
  const router = useRouter()
  const [jsonInput, setJsonInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 📅 ตั้งวันเริ่มให้ภารกิจที่ใน JSON ไม่ได้ระบุ start_date
  const [defaultDate, setDefaultDate] = useState('') // ตั้งเป็นวันนี้ใน useEffect (ห้ามเรียก new Date() ตอน render)
  const today = useTodayStr()
  useEffect(() => {
    if (today && !defaultDate) setDefaultDate(today)
  }, [today, defaultDate])
  const [spreadDaily, setSpreadDaily] = useState(false) // กระจายวันละ 1 ภารกิจ ต่อเนื่องจากวันที่เริ่ม

  // แปลง JSON เป็นรายการภารกิจ + วันที่ที่จะบันทึก (ใช้ทั้งพรีวิวและตอนบันทึก)
  const parsed = useMemo(() => {
    if (!jsonInput.trim() || !defaultDate) return { rows: [] as any[], error: '' }
    try {
      let arr = JSON.parse(jsonInput)
      // ถ้าเป็น Object เดี่ยว (ลืมใส่ [...]) ให้แปลงเป็น Array อัตโนมัติ
      if (!Array.isArray(arr)) {
        if (typeof arr === 'object' && arr !== null) arr = [arr]
        else return { rows: [], error: 'ข้อมูล JSON ต้องอยู่ในรูป Array [...] หรือ Object ที่ถูกต้อง' }
      }

      let undated = 0
      const rows = arr.map((q: any) => {
        let day = normalizeDay(q.start_date)
        if (!day) {
          day = spreadDaily ? addDays(defaultDate, undated) : defaultDate
          undated += 1
        }
        const endDay = normalizeDay(q.end_date)
        return {
          title: q.title,
          description: q.description || '',
          reward_coins: q.reward_coins || 10,
          reward_xp: q.reward_xp || 15,
          min_percent: Math.min(100, Math.max(0, Number(q.min_percent ?? 50))), // ต้องตอบถูกอย่างน้อยกี่ % ถึงจะได้รางวัล
          target_set_id: q.target_set_id,
          is_active: q.is_active ?? true,
          start_date: dayStartIso(day),
          end_date: endDay ? dayEndIso(endDay) : null,
          _day: day,
          _endDay: endDay,
        }
      })
      return { rows, error: '' }
    } catch {
      return { rows: [], error: 'รูปแบบ JSON ไม่ถูกต้อง' }
    }
  }, [jsonInput, defaultDate, spreadDaily])

  // ฟังก์ชันอ่านไฟล์ JSON ที่อัปโหลด
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        // จัดรูปแบบให้อ่านง่ายใน Textarea
        const parsedJson = JSON.parse(content)
        setJsonInput(JSON.stringify(parsedJson, null, 2))
        setMessage('📁 โหลดไฟล์ JSON สำเร็จ! ตรวจสอบวันที่ในตัวอย่างด้านล่างแล้วกดบันทึกได้เลย')
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
    if (parsed.error) {
      setMessage(`❌ ${parsed.error}`)
      return
    }

    // ตรวจข้อมูลจำเป็นก่อนส่ง จะได้บอกได้ว่าผิดที่ข้อไหน
    const bad = parsed.rows.findIndex((r: any) => !r.title || !r.target_set_id)
    if (bad >= 0) {
      setMessage(`❌ ภารกิจลำดับที่ ${bad + 1} ไม่มี title หรือ target_set_id`)
      return
    }

    setLoading(true)
    setMessage('⏳ กำลังนำเข้าข้อมูลภารกิจพิเศษ...')

    try {
      // insert ทีเดียวทั้งชุด: ถ้ามีข้อใดผิดพลาดจะไม่บันทึกเลย ไม่เกิดข้อมูลค้างครึ่งๆ กลางๆ
      const payload = parsed.rows.map(({ _day, _endDay, ...row }: any) => row)
      const { error } = await supabase.from('special_quests').insert(payload)
      if (error) throw error

      setMessage(`🎉 นำเข้าภารกิจพิเศษสำเร็จ ${payload.length} ภารกิจ!`)
      setJsonInput('')
    } catch (err: any) {
      console.error('Error importing quests:', err)
      setMessage(`❌ เกิดข้อผิดพลาด: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const undatedCount = (() => {
    try {
      const arr = JSON.parse(jsonInput)
      const list = Array.isArray(arr) ? arr : [arr]
      return list.filter((q: any) => q && !normalizeDay(q.start_date)).length
    } catch {
      return 0
    }
  })()

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
              placeholder={`[\n  {\n    "title": "ภารกิจพิชิตเศษส่วน",\n    "description": "...",\n    "reward_coins": 20,\n    "reward_xp": 20,\n    "min_percent": 50,   // ไม่บังคับ: ต้องตอบถูกอย่างน้อยกี่ % ถึงได้รางวัล (ไม่ใส่ = 50)\n    "target_set_id": "<uuid ของชุดโจทย์>",\n    "start_date": "2026-11-18",   // ไม่บังคับ (ไม่ใส่ = ใช้วันที่จากข้อ 3)\n    "end_date": "2026-11-25"      // ไม่บังคับ (ไม่ใส่ = ไม่หมดเขต)\n  }\n]`}
              className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs text-gray-800 bg-gray-50"
            />
          </div>

          {/* 📅 ตั้งวันเปิดภารกิจ */}
          <div className="space-y-3 p-4 bg-rose-50/60 border border-rose-100 rounded-2xl">
            <label className="block text-xs font-extrabold text-gray-700">3. วันเปิดภารกิจ (สำหรับรายการที่ใน JSON ไม่มี start_date):</label>
            <AssignDateField value={defaultDate} onChange={setDefaultDate} label="📅 วันเริ่มต้น" />
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={spreadDaily}
                onChange={(e) => setSpreadDaily(e.target.checked)}
                className="w-4 h-4 accent-rose-600 cursor-pointer"
              />
              กระจายวันละ 1 ภารกิจ ต่อเนื่องจากวันเริ่มต้น (เหมาะกับการอัปโหลดภารกิจรายวันทีละหลายสิบวัน)
            </label>
          </div>

          {/* ตัวอย่างวันที่ที่จะบันทึก */}
          {parsed.error && jsonInput.trim() && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold">
              ⚠️ {parsed.error}
            </div>
          )}
          {parsed.rows.length > 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
              <p className="text-xs font-extrabold text-gray-700">
                👁️ ตัวอย่างที่จะบันทึก {parsed.rows.length} ภารกิจ
                {undatedCount > 0 && ` (ใช้วันจากข้อ 3 จำนวน ${undatedCount} ภารกิจ)`}
              </p>
              <ul className="space-y-1 text-xs text-gray-600">
                {parsed.rows.slice(0, 8).map((r: any, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono font-bold text-rose-600 shrink-0">{r._day}</span>
                    <span className="truncate">{r.title || '(ไม่มี title)'}</span>
                    {r._endDay && <span className="text-orange-600 shrink-0">⏰ ถึง {r._endDay}</span>}
                  </li>
                ))}
              </ul>
              {parsed.rows.length > 8 && (
                <p className="text-[11px] text-gray-400 font-bold">…และอีก {parsed.rows.length - 8} ภารกิจ</p>
              )}
            </div>
          )}

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

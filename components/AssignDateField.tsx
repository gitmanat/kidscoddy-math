'use client'

import { useEffect, useState } from 'react'

// ช่องเลือก "วันของการบ้าน / วันเปิดภารกิจ" ใช้ซ้ำได้ทั้งหน้าจัดการข้อสอบ, dashboard และ quests
// - value / onChange ใช้รูปแบบ 'YYYY-MM-DD' (เวลาท้องถิ่น ไม่ใช่ UTC)

const pad2 = (n: number) => String(n).padStart(2, '0')
export const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
// ⚠️ Next.js 16 ห้ามเรียก new Date() ระหว่าง render (prerender) ใน Client Component
// - todayLocalStr(): เรียกได้เฉพาะใน event handler หรือ useEffect เท่านั้น
// - useTodayStr(): hook สำหรับใช้ตอน render — รอบแรกคืน '' แล้วค่อยเป็นวันนี้หลัง mount
export const todayLocalStr = () => toLocalDateStr(new Date())
export function useTodayStr() {
  const [today, setToday] = useState('')
  useEffect(() => {
    setToday(todayLocalStr())
  }, [])
  return today
}

const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return toLocalDateStr(dt)
}

const formatThai = (s: string) => {
  if (!s) return ''
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

type Props = {
  value: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
  /** โหมดแถวเล็ก (ใช้บนการ์ด): ช่องวันที่ + ปุ่ม "วันนี้" เท่านั้น */
  compact?: boolean
}

export default function AssignDateField({
  value,
  onChange,
  label = '📅 วันของการบ้าน',
  disabled = false,
  compact = false,
}: Props) {
  const today = useTodayStr()
  const chips = today
    ? [
        { text: 'วันนี้', date: today },
        { text: 'พรุ่งนี้', date: addDays(today, 1) },
        { text: 'อีก 7 วัน', date: addDays(today, 7) },
      ]
    : []

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200'
    }`

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-extrabold text-gray-500">{label}</span>
        <input
          type="date"
          value={value}
          disabled={disabled}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !today || value === today}
          onClick={() => onChange(today)}
          className={chipClass(false)}
        >
          วันนี้
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={value}
          disabled={disabled}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
        />
        {chips.map((c) => (
          <button
            key={c.text}
            type="button"
            disabled={disabled}
            onClick={() => onChange(c.date)}
            className={chipClass(value === c.date)}
          >
            {c.text}
          </button>
        ))}
      </div>
      {value && <p className="text-xs font-bold text-indigo-600">นักเรียนจะเห็นชุดนี้ในวัน{formatThai(value)}</p>}
    </div>
  )
}

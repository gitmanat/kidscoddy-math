'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AssignDateField, { todayLocalStr, toLocalDateStr, useTodayStr } from '@/components/AssignDateField'

// ---------- ตัวช่วยเรื่อง "วัน" (เวลาท้องถิ่น) ----------
// วันของชุดโจทย์ = target_date (ถ้าไม่มีใช้วันที่สร้าง)
const getSetDay = (set: any): string => {
  if (set?.target_date) return String(set.target_date).slice(0, 10)
  if (set?.created_at) return toLocalDateStr(new Date(set.created_at))
  return ''
}
const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return toLocalDateStr(dt)
}
const formatThaiDay = (s: string, options: Intl.DateTimeFormatOptions) => {
  if (!s) return ''
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('th-TH', options)
}

export default function AdminExercisesPage() {
  const router = useRouter()
  const [problemSets, setProblemSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 🔍 State สำหรับค้นหา กรองหมวดหมู่ และแบ่งหน้า (Pagination)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('all')
  // 📅 ตัวกรองช่วงวันที่ (ว่าง = ไม่กรอง)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 // แสดงหน้าละ 10 ชุด เพื่อความลื่นไหล

  // ฟอร์มสร้างชุดข้อสอบใหม่
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTargetGroup, setNewTargetGroup] = useState('ป.4')
  const [newTargetDate, setNewTargetDate] = useState('') // วันของการบ้าน (ค่าเริ่มต้น = วันนี้ ตั้งใน useEffect ด้านล่าง)
  const today = useTodayStr()
  useEffect(() => {
    if (today && !newTargetDate) setNewTargetDate(today)
  }, [today, newTargetDate])
  const [errorMsg, setErrorMsg] = useState('')
  const [creating, setCreating] = useState(false)

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
    fetchProblemSets()
  }, [router])

  const fetchProblemSets = async () => {
    try {
      const { data, error } = await supabase
        .from('problem_sets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProblemSets(data || [])
    } catch (err) {
      console.error('Error fetching problem sets:', err)
    } finally {
      setLoading(false)
    }
  }

  // สร้างชุดแบบฝึกหัดใหม่
  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!newTitle.trim()) {
      setErrorMsg('กรุณากรอกชื่อชุดแบบฝึกหัด')
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('problem_sets')
        .insert({
          title: newTitle.trim(),
          description: newDesc.trim(),
          target_group: newTargetGroup.trim(),
          target_date: newTargetDate || todayLocalStr(),
        })
        .select()
        .single()

      if (error) throw error

      setNewTitle('')
      setNewDesc('')
      fetchProblemSets()

      // พาไปหน้าจัดการข้อสอบย่อยในชุดที่เพิ่งสร้างทันที
      if (data) {
        router.push(`/admin/exercises/${data.id}`)
      }
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  // ลบชุดข้อสอบ
  const handleDeleteSet = async (setId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบชุดแบบฝึกหัดนี้? (ข้อสอบและประวัติการทำของเด็กในชุดนี้จะถูกลบด้วย)')) return

    const { error } = await supabase.from('problem_sets').delete().eq('id', setId)
    if (!error) {
      fetchProblemSets()
    }
  }

  // เปลี่ยนวันของการบ้านจากรายการได้ทันที (บันทึกลง problem_sets.target_date)
  const handleChangeSetDate = async (setId: string, newDate: string) => {
    const { error } = await supabase.from('problem_sets').update({ target_date: newDate }).eq('id', setId)
    if (error) {
      alert(`เปลี่ยนวันไม่สำเร็จ: ${error.message}\n(ถ้ายังไม่ได้เพิ่มคอลัมน์ target_date ให้รันไฟล์ add_target_date.sql ก่อน)`)
      return
    }
    setProblemSets((prev) => prev.map((s) => (s.id === setId ? { ...s, target_date: newDate } : s)))
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดระบบจัดการข้อสอบ...</div>
  }

  // 🔍 กรองข้อมูลตามคำค้นหา หมวดหมู่ระดับชั้น และช่วงวันที่ → เรียงวันล่าสุดขึ้นก่อน
  const filteredSets = problemSets
    .filter((set) => {
      const matchesSearch = set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (set.description && set.description.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesGroup = selectedGroup === 'all' || set.target_group === selectedGroup
      const day = getSetDay(set)
      const matchesFrom = !dateFrom || (day && day >= dateFrom)
      const matchesTo = !dateTo || (day && day <= dateTo)
      return matchesSearch && matchesGroup && matchesFrom && matchesTo
    })
    .sort((a, b) => {
      const dateDiff = getSetDay(b).localeCompare(getSetDay(a))
      if (dateDiff !== 0) return dateDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const hasDateFilter = dateFrom !== '' || dateTo !== ''
  const setQuickRange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
    setCurrentPage(1)
  }

  // 📄 คำนวณการแบ่งหน้า (Pagination)
  const totalPages = Math.ceil(filteredSets.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentSets = filteredSets.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      {/* Navbar */}
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-200">
              📚
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">ระบบจัดการชุดแบบฝึกหัด (100+ Sets)</h1>
              <p className="text-xs text-indigo-600 font-bold">สร้างและจัดการข้อสอบ, ค้นหา, และแบ่งหมวดหมู่</p>
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
              onClick={() => router.push('/admin/stats')}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              📊 สถิติการตอบ
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
        
        {/* ส่วนที่ 1: ฟอร์มสร้างชุดแบบฝึกหัดใหม่ */}
        <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-md border border-indigo-100">
          <h2 className="text-lg font-black text-gray-800 mb-4">➕ สร้างชุดแบบฝึกหัดใหม่</h2>
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreateSet} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อชุดแบบฝึกหัด</label>
              <input
                type="text"
                placeholder="เช่น ชุดที่ 1: พหุนามเบื้องต้น"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">คำอธิบายย่อ</label>
              <input
                type="text"
                placeholder="เช่น การบวกลบเอกนามและพหุนาม"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">ระดับชั้น / หมวดหมู่</label>
              <select
                value={newTargetGroup}
                onChange={(e) => setNewTargetGroup(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="ป.4">ป.4</option>
                <option value="ป.5">ป.5</option>
                <option value="ป.6">ป.6</option>
                <option value="ม.1">ม.1</option>
                <option value="ม.2">ม.2</option>
                <option value="ม.3">ม.3</option>
                <option value="ทั่วไป">ทั่วไป</option>
              </select>
            </div>
            {/* 📅 วันของการบ้าน: นักเรียนจะเห็นชุดนี้ในวันที่เลือก */}
            <div className="md:col-span-2">
              <AssignDateField value={newTargetDate} onChange={setNewTargetDate} label="📅 วันของการบ้าน" />
            </div>
            <div className="flex items-end md:col-span-1">
              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {creating ? 'กำลังสร้าง...' : '+ สร้างชุดข้อสอบ'}
              </button>
            </div>
          </form>
        </div>

        {/* ส่วนที่ 2: รายการชุดข้อสอบ พร้อมระบบค้นหา กรอง และแบ่งหน้า */}
        <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-md border border-indigo-100 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-800">📚 รายการชุดแบบฝึกหัดทั้งหมด</h2>
              <p className="text-xs text-gray-500">จัดการข้อสอบ ค้นหา เลือกดูตามระดับชั้นและวันที่ (เรียงวันล่าสุดก่อน แสดงหน้าละ 10 ชุด)</p>
            </div>
            <span className="text-xs font-bold px-3.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
              พบทั้งหมด {filteredSets.length} ชุด (จากทั้งหมด {problemSets.length} ชุด)
            </span>
          </div>

          {/* 🔍 แถบค้นหาและตัวกรองหมวดหมู่ระดับชั้น */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
            <input
              type="text"
              placeholder="🔍 ค้นหาชื่อบทเรียน หรือคำอธิบาย..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // รีเซ็ตกลับหน้า 1 เมื่อพิมพ์ค้นหา
              }}
              className="w-full md:w-80 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />

            <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
              {['all', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ทั่วไป'].map((group) => (
                <button
                  key={group}
                  onClick={() => {
                    setSelectedGroup(group)
                    setCurrentPage(1) // รีเซ็ตกลับหน้า 1 เมื่อเปลี่ยนหมวดหมู่
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    selectedGroup === group
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {group === 'all' ? 'ทุกระดับชั้น' : group}
                </button>
              ))}
            </div>
          </div>

          {/* 📅 ตัวกรองช่วงวันที่ (รองรับการบ้านเป็นร้อยๆ วัน) */}
          <div className="flex flex-wrap items-center gap-3 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
            <span className="text-xs font-extrabold text-gray-600">📅 วันที่:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-400">ถึง</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setQuickRange(todayLocalStr(), todayLocalStr())}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition cursor-pointer"
              >
                วันนี้
              </button>
              <button
                onClick={() => setQuickRange(addDays(todayLocalStr(), -6), todayLocalStr())}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition cursor-pointer"
              >
                 7 วันล่าสุด
              </button>
              <button
                onClick={() => setQuickRange(addDays(todayLocalStr(), -29), todayLocalStr())}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition cursor-pointer"
              >
                 30 วันล่าสุด
              </button>
              {hasDateFilter && (
                <button
                  onClick={() => setQuickRange('', '')}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer"
                >
                  ✕ ล้างตัวกรองวันที่
                </button>
              )}
            </div>
          </div>

          {currentSets.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <span className="text-3xl">🔍</span>
              <p className="text-gray-600 font-bold">ไม่พบชุดแบบฝึกหัดที่คุณค้นหา</p>
              <p className="text-xs text-gray-400">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่ระดับชั้นอื่นดูครับ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentSets.map((set, idx) => {
                const itemNumber = startIndex + idx + 1
                const day = getSetDay(set)
                const prevDay = idx > 0 ? getSetDay(currentSets[idx - 1]) : null
                const showDayHeading = idx === 0 || day !== prevDay
                const daySetCount = filteredSets.filter((x) => getSetDay(x) === day).length
                return (
                  <Fragment key={set.id}>
                    {/* หัวข้อวันที่ (แสดงเมื่อขึ้นวันใหม่) */}
                    {showDayHeading && (
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs font-black text-rose-700">
                          📅 {formatThaiDay(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        {day === today && (
                          <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full">วันนี้</span>
                        )}
                        <span className="text-[11px] font-bold text-gray-400">({daySetCount} ชุด)</span>
                        <div className="flex-1 h-px bg-rose-100" />
                      </div>
                    )}
                  <div
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-indigo-50/30 transition gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {itemNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-extrabold rounded-full">
                            {set.target_group || 'ทั่วไป'}
                          </span>
                          <h3 className="font-black text-gray-800 text-base">{set.title}</h3>
                        </div>
                        <p className="text-xs text-gray-500">{set.description || 'ไม่มีคำอธิบาย'}</p>
                        <div className="mt-2">
                          <AssignDateField
                            compact
                            label="📅 วัน"
                            value={day}
                            onChange={(v) => handleChangeSetDate(set.id, v)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <button
                        onClick={() => router.push(`/admin/exercises/${set.id}`)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-sm"
                      >
                        ✏️ จัดการข้อสอบในชุดนี้
                      </button>
                      <button
                        onClick={() => handleDeleteSet(set.id)}
                        className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                  </Fragment>
                )
              })}
            </div>
          )}

          {/* 📄 Pagination Controls (ปุ่มเปลี่ยนหน้า) */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
              >
                ← หน้าก่อนหน้า
              </button>

              <span className="text-xs font-bold text-gray-500">
                หน้าที่ {currentPage} จาก {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl transition cursor-pointer"
              >
                หน้าถัดไป →
              </button>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
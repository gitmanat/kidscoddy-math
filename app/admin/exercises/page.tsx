'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminExercisesPage() {
  const router = useRouter()
  const [problemSets, setProblemSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 🔍 State สำหรับค้นหา กรองหมวดหมู่ และแบ่งหน้า (Pagination)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 // แสดงหน้าละ 10 ชุด เพื่อความลื่นไหล

  // ฟอร์มสร้างชุดข้อสอบใหม่
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTargetGroup, setNewTargetGroup] = useState('ป.4')
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดระบบจัดการข้อสอบ...</div>
  }

  // 🔍 กรองข้อมูลตามคำค้นหาและหมวดหมู่ระดับชั้น
  const filteredSets = problemSets.filter((set) => {
    const matchesSearch = set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (set.description && set.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesGroup = selectedGroup === 'all' || set.target_group === selectedGroup
    return matchesSearch && matchesGroup
  })

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

          <form onSubmit={handleCreateSet} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="flex items-end">
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
              <p className="text-xs text-gray-500">จัดการข้อสอบ ค้นหา และเลือกดูตามระดับชั้น (แสดงหน้าละ 10 ชุด)</p>
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
                return (
                  <div
                    key={set.id}
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
'use client'

import { CoinIcon } from '@/components/CoinIcon'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminUsersPage() {
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ฟอร์มสำหรับเพิ่มนักเรียนใหม่
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newGroup, setNewGroup] = useState('ป.4')
  const [errorMsg, setErrorMsg] = useState('')

  // State สำหรับ Modal จัดการเหรียญ / แก้ไขข้อมูล
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [editName, setEditName] = useState('')
  const [editGroup, setEditGroup] = useState('')
  const [editPin, setEditPin] = useState('')
  const [editCoins, setEditCoins] = useState<number>(0)
  const [editXP, setEditXP] = useState<number>(0)
  const [redeemAmount, setRedeemAmount] = useState<number>(1)

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
    fetchStudents()
  }, [router])

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('xp', { ascending: false })

      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!newUsername || !newDisplayName || !newPin) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    try {
      const { error } = await supabase.from('users').insert({
        username: newUsername.trim(),
        display_name: newDisplayName.trim(),
        pin_code: newPin.trim(),
        group_name: newGroup.trim(),
        role: 'student',
        xp: 0,
        coins: 0,
        level: 1,
        streak_days: 0,
      })

      if (error) throw error

      setNewUsername('')
      setNewDisplayName('')
      setNewPin('')
      fetchStudents()
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาด (ชื่อผู้ใช้อาจซ้ำในระบบ): ' + err.message)
    }
  }

  // เปิดหน้าต่างแลกรางวัล / แก้ไขข้อมูล
  const openEditModal = (student: any) => {
    setEditingStudent(student)
    setEditName(student.display_name)
    setEditGroup(student.group_name || '')
    setEditPin(student.pin_code)
    setEditCoins(student.coins || 0)
    setEditXP(student.xp || 0)
    setRedeemAmount(1)
  }

  // บันทึกการแก้ไขทั้งหมด
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return

    const finalCoins = Math.max(0, Number(editCoins))
    const finalXP = Math.max(0, Number(editXP))
    const newLevel = Math.floor(finalXP / 50) + 1

    const { error } = await supabase
      .from('users')
      .update({
        display_name: editName.trim(),
        group_name: editGroup.trim(),
        pin_code: editPin.trim(),
        coins: finalCoins,
        xp: finalXP,
        level: newLevel,
      })
      .eq('id', editingStudent.id)

    if (!error) {
      setEditingStudent(null)
      fetchStudents()
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบนักเรียนคนนี้?')) return

    const { error } = await supabase.from('users').delete().eq('id', studentId)
    if (!error) {
      fetchStudents()
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดระบบจัดการ...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      {/* Modal แลกรางวัล (หัก Coins) & แก้ไขข้อมูล */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-purple-100 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-800">🎁 แลกรางวัล & แก้ไขข้อมูล</h3>
                <p className="text-xs text-gray-500">{editingStudent.display_name} (Lv.{editingStudent.level || 1})</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* ส่วนจัดการ Coins แลกรางวัล (เลเวลไม่ลด) */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                    <CoinIcon className="w-5 h-5" />
                    <span>เหรียญแลกรางวัลคงเหลือ:</span>
                  </span>
                  <span className="text-2xl font-black text-amber-600">{editCoins} Coins</span>
                </div>

                {/* ปุ่มปรับลด-เพิ่ม ทีละ 1 เหรียญ */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditCoins(Math.max(0, editCoins - 1))}
                    className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-sm shadow-2xs cursor-pointer"
                  >
                    -1 Coin
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCoins(editCoins + 1)}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-sm shadow-2xs cursor-pointer"
                  >
                    +1 Coin
                  </button>
                </div>

                {/* หักตามจำนวนรางวัลที่แลก */}
                <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                  <input
                    type="number"
                    min={1}
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(Number(e.target.value))}
                    className="w-20 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-sm font-black text-center outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setEditCoins(Math.max(0, editCoins - redeemAmount))}
                    className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                  >
                    🎁 หักแลกรางวัล (-{redeemAmount} Coins)
                  </button>
                </div>

                <p className="text-[11px] text-amber-800/80 font-medium">
                  * การหัก Coins จะไม่ลด XP และ Level ของนักเรียน
                </p>
              </div>

              {/* กรอกตัวเลข Coins และ XP โดยตรง */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">ระบุ Coins คงเหลือ</label>
                  <input
                    type="number"
                    min={0}
                    value={editCoins}
                    onChange={(e) => setEditCoins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">XP สะสม (เกียรติยศ)</label>
                  <input
                    type="number"
                    min={0}
                    value={editXP}
                    onChange={(e) => setEditXP(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* ข้อมูลพื้นฐานนักเรียน */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อนักเรียน</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">กลุ่มเรียน</label>
                  <input
                    type="text"
                    value={editGroup}
                    onChange={(e) => setEditGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">รีเซ็ต PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  💾 บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-200">
              🛠️
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">ระบบจัดการครู (Teacher Control Center)</h1>
              <p className="text-xs text-purple-600 font-bold">จัดการบัญชีนักเรียน, แลกรางวัล Coins และติดตาม XP</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/exercises')}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              📚 จัดการชุดข้อสอบ
            </button>
            <button
              onClick={() => router.push('/admin/stats')}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              📊 สถิติการตอบของเด็ก
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
        {/* ฟอร์มเพิ่มนักเรียนใหม่ */}
        <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-md border border-indigo-100">
          <h2 className="text-lg font-black text-gray-800 mb-4">➕ เพิ่มบัญชีนักเรียนใหม่</h2>
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">รหัสนักเรียน (Username)</label>
              <input
                type="text"
                placeholder="เช่น student01"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อ-นามสกุล</label>
              <input
                type="text"
                placeholder="เช่น น้องกุนซือ"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">PIN 4 หลัก</label>
              <input
                type="text"
                maxLength={4}
                placeholder="เช่น 1234"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">กลุ่มเรียน</label>
              <input
                type="text"
                placeholder="เช่น ป.4"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition cursor-pointer"
              >
                + บันทึกนักเรียน
              </button>
            </div>
          </form>
        </div>

        {/* ตารางรายชื่อนักเรียน */}
        <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-md border border-indigo-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-800">👥 รายชื่อนักเรียนทั้งหมดในระบบ</h2>
              <p className="text-xs text-gray-500">กดปุ่ม "แลกรางวัล / แก้ไข" เพื่อหัก Coins แลกของรางวัลโดยไม่กระทบเลเวล</p>
            </div>
            <span className="text-xs font-bold px-3.5 py-1 bg-purple-100 text-purple-700 rounded-full">
              รวมทั้งหมด {students.length} คน
            </span>
          </div>

          {students.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">ยังไม่มีบัญชีนักเรียนในระบบ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 font-extrabold uppercase">
                    <th className="py-3 px-4">อันดับ / ชื่อนักเรียน</th>
                    <th className="py-3 px-4">กลุ่มเรียน</th>
                    <th className="py-3 px-4">เลเวล & XP</th>
                    <th className="py-3 px-4">Streak 🔥</th>
                    <th className="py-3 px-4">เหรียญแลกรางวัล</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                  {students.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-purple-50/40 transition">
                      <td className="py-4 px-4 flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-extrabold text-gray-800">{st.display_name}</p>
                          <p className="text-xs text-gray-400 font-mono">@{st.username} (PIN: {st.pin_code})</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-lg">
                          {st.group_name || 'ทั่วไป'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600 font-black">Lv.{st.level || 1}</span>
                          <span className="text-xs text-gray-400">({st.xp || 0} XP)</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-amber-600 font-bold">🔥 {st.streak_days || 0} วัน</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 font-black rounded-xl text-xs">
                          <CoinIcon className="w-4 h-4" />
                          <span>{st.coins || 0} Coins</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(st)}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-extrabold rounded-xl transition cursor-pointer"
                        >
                          🎁 แลกรางวัล / แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st.id)}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-rose-100 text-gray-600 hover:text-rose-600 text-xs font-extrabold rounded-xl transition cursor-pointer"
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
      </main>
    </div>
  )
}
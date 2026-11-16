'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'

export default function AdminQuestsListPage() {
  const router = useRouter()
  const [quests, setQuests] = useState<any[]>([])
  const [problemSets, setProblemSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State สำหรับการแก้ไขในแถว (Inline Edit)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    reward_coins: 0,
    reward_xp: 0,
    problem_set_id: '',
  })
  const [saving, setSaving] = useState(false)

  // State สำหรับการสร้างภารกิจใหม่แบบ Manual (Modal)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    problem_set_id: '',
    reward_coins: 50,
    reward_xp: 100,
    is_active: true,
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchAdminQuests()
    fetchProblemSets()
  }, [])

  const fetchAdminQuests = async () => {
    try {
      // ดึงข้อมูลภารกิจทั้งหมดก่อน
      const { data: questsData, error: questsErr } = await supabase
        .from('special_quests')
        .select('*')
        .order('created_at', { ascending: false })

      if (questsErr) throw questsErr

      // ดึงข้อมูลชุดโจทย์ทั้งหมดมาแมตช์ด้วยตัวเอง (ปลอดภัยที่สุด ไม่ติดปัญหา Multiple Relationships)
      const { data: setsData } = await supabase
        .from('problem_sets')
        .select('id, title')

      const setsMap = new Map(setsData?.map((ps: any) => [ps.id, ps]) || [])

      const combined = (questsData || []).map((q: any) => ({
        ...q,
        problem_sets: q.problem_set_id ? setsMap.get(q.problem_set_id) || null : null,
      }))

      setQuests(combined)
    } catch (err) {
      console.error('Error fetching admin quests:', err)
    } finally {
      setLoading(false)
    }
  }

  // ดึงรายการชุดโจทย์ทั้งหมดมาใช้ทั้งตอนสร้างใหม่ (Manual) และตอนแก้ไข
  const fetchProblemSets = async () => {
    try {
      const { data } = await supabase
        .from('problem_sets')
        .select('id, title')
        .order('created_at', { ascending: false })
      setProblemSets(data || [])
    } catch (err) {
      console.error('Error fetching problem sets:', err)
    }
  }

  // บันทึกภารกิจใหม่แบบ Manual ลง Supabase
  const handleCreateManualQuest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createForm.title.trim()) {
      alert('กรุณากรอกชื่อภารกิจด้วยครับ')
      return
    }
    if (!createForm.problem_set_id) {
      alert('กรุณาเลือกชุดโจทย์ที่ผูกกับภารกิจนี้ครับ')
      return
    }

    setCreating(true)
    try {
      const insertPayload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        problem_set_id: createForm.problem_set_id,
        reward_coins: Number(createForm.reward_coins) || 0,
        reward_xp: Number(createForm.reward_xp) || 0,
        is_active: createForm.is_active,
      }

      // บันทึกข้อมูลลงฐานข้อมูลโดยไม่ต้องผูก Embed ซ้อนกันตรงๆ
      const { data, error } = await supabase
        .from('special_quests')
        .insert(insertPayload)
        .select()
        .single()

      if (error) throw error

      // ค้นหาชื่อชุดโจทย์จาก state ที่เรามีอยู่แล้วมาใส่แสดงผลทันที
      const selectedSet = problemSets.find((ps) => ps.id === createForm.problem_set_id)
      const newQuestWithSet = {
        ...data,
        problem_sets: selectedSet ? { id: selectedSet.id, title: selectedSet.title } : null,
      }

      setQuests([newQuestWithSet, ...quests])
      setIsCreateModalOpen(false)
      setCreateForm({
        title: '',
        description: '',
        problem_set_id: '',
        reward_coins: 50,
        reward_xp: 100,
        is_active: true,
      })
    } catch (err: any) {
      alert('สร้างภารกิจไม่สำเร็จ: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  // เริ่มโหมดแก้ไขภารกิจ
  const handleStartEdit = (quest: any) => {
    setEditingId(quest.id)
    setEditForm({
      title: quest.title || '',
      description: quest.description || '',
      reward_coins: quest.reward_coins ?? 0,
      reward_xp: quest.reward_xp ?? 0,
      problem_set_id: quest.problem_set_id || '',
    })
  }

  // ยกเลิกการแก้ไข
  const handleCancelEdit = () => {
    setEditingId(null)
  }

  // บันทึกข้อมูลที่แก้ไขลง Supabase
  const handleSaveEdit = async (id: string) => {
    if (!editForm.title.trim()) {
      alert('กรุณากรอกชื่อภารกิจด้วยครับ')
      return
    }

    setSaving(true)
    try {
      const updatePayload: any = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        reward_coins: Number(editForm.reward_coins) || 0,
        reward_xp: Number(editForm.reward_xp) || 0,
      }

      if (editForm.problem_set_id) {
        updatePayload.problem_set_id = editForm.problem_set_id
      }

      const { error } = await supabase
        .from('special_quests')
        .update(updatePayload)
        .eq('id', id)

      if (error) throw error

      const selectedSet = problemSets.find((ps) => ps.id === editForm.problem_set_id)
      setQuests(
        quests.map((q) =>
          q.id === id
            ? {
                ...q,
                ...updatePayload,
                problem_sets: selectedSet ? { id: selectedSet.id, title: selectedSet.title } : q.problem_sets,
              }
            : q
        )
      )
      setEditingId(null)
    } catch (err: any) {
      alert('บันทึกการแก้ไขไม่สำเร็จ: ' + err.message)
    } finally {
      setSaving(false)
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
      setQuests(quests.map((q) => (q.id === id ? { ...q, is_active: !currentStatus } : q)))
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
      setQuests(quests.filter((q) => q.id !== id))
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
            <p className="text-xs text-gray-500 mt-1">สร้างภารกิจใหม่แบบ Manual หรืออัปโหลด JSON พร้อมแก้ไขชื่อและรางวัลได้ทันที</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {/* ปุ่มสร้างแบบ Manual */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer"
            >
              ✍️ + สร้างภารกิจ (Manual)
            </button>

            {/* ปุ่มอัปโหลด JSON เดิม */}
            <button
              onClick={() => router.push('/admin/quests/upload')}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer"
            >
              📄 + อัปโหลด JSON
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
              ยังไม่มีภารกิจพิเศษในระบบ กดปุ่ม "สร้างภารกิจ (Manual)" หรือ "อัปโหลด JSON" ด้านบนเพื่อเริ่มสร้างได้เลย
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
                  {quests.map((q) => {
                    const isEditing = editingId === q.id

                    return (
                      <tr
                        key={q.id}
                        className={`transition ${isEditing ? 'bg-indigo-50/70' : 'hover:bg-indigo-50/30'}`}
                      >
                        {/* คอลัมน์ 1: ชื่อภารกิจ + คำอธิบาย */}
                        <td className="py-4 px-4 align-top">
                          {isEditing ? (
                            <div className="space-y-2 min-w-[200px]">
                              <input
                                type="text"
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                placeholder="ชื่อภารกิจ..."
                                className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <textarea
                                rows={2}
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="คำอธิบายภารกิจ..."
                                className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-[11px] font-normal text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-extrabold text-gray-800">{q.title}</div>
                              <div className="text-[11px] text-gray-400 font-normal truncate max-w-xs">{q.description}</div>
                            </div>
                          )}
                        </td>

                        {/* คอลัมน์ 2: ชุดโจทย์ที่ผูก */}
                        <td className="py-4 px-4 align-top text-indigo-600 font-bold">
                          {isEditing ? (
                            <select
                              value={editForm.problem_set_id}
                              onChange={(e) => setEditForm({ ...editForm, problem_set_id: e.target.value })}
                              className="w-full max-w-[180px] px-2.5 py-1.5 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">-- เลือกชุดโจทย์ --</option>
                              {problemSets.map((ps) => (
                                <option key={ps.id} value={ps.id}>
                                  {ps.title}
                                </option>
                              ))}
                            </select>
                          ) : (
                            q.problem_sets?.title || 'ไม่พบชุดโจทย์'
                          )}
                        </td>

                        {/* คอลัมน์ 3: รางวัล (Coins & XP) */}
                        <td className="py-4 px-4 align-top">
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5 min-w-[120px]">
                              <div className="flex items-center gap-1.5">
                                <CoinIcon className="w-4 h-4 shrink-0" />
                                <input
                                  type="number"
                                  min={0}
                                  value={editForm.reward_coins}
                                  onChange={(e) => setEditForm({ ...editForm, reward_coins: Number(e.target.value) })}
                                  className="w-20 px-2 py-1 bg-white border border-yellow-300 rounded-lg text-xs font-black text-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                />
                                <span className="text-[10px] text-gray-400">Coins</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-purple-600 w-4 text-center">★</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={editForm.reward_xp}
                                  onChange={(e) => setEditForm({ ...editForm, reward_xp: Number(e.target.value) })}
                                  className="w-20 px-2 py-1 bg-white border border-purple-300 rounded-lg text-xs font-black text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                                <span className="text-[10px] text-gray-400">XP</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-200">
                                <CoinIcon className="w-3.5 h-3.5" /> +{q.reward_coins}
                              </span>
                              <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                                +{q.reward_xp} XP
                              </span>
                            </div>
                          )}
                        </td>

                        {/* คอลัมน์ 4: สถานะเปิด/ปิด */}
                        <td className="py-4 px-4 align-top text-center">
                          <button
                            onClick={() => handleToggleActive(q.id, q.is_active)}
                            disabled={isEditing}
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition ${
                              q.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {q.is_active ? '🟢 เปิดใช้งาน' : '⚪ ปิดใช้งาน'}
                          </button>
                        </td>

                        {/* คอลัมน์ 5: ปุ่มจัดการ */}
                        <td className="py-4 px-4 align-top text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveEdit(q.id)}
                                disabled={saving}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                              >
                                {saving ? '...' : '💾 บันทึก'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEdit(q)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-extrabold rounded-xl transition cursor-pointer"
                              >
                                ✏️ แก้ไข
                              </button>
                              <button
                                onClick={() => handleDeleteQuest(q.id)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-extrabold rounded-xl transition cursor-pointer"
                              >
                                ลบ
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          Modal: สร้างภารกิจใหม่แบบ Manual
         ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-base font-black">✍️ สร้างภารกิจพิเศษใหม่ (Manual)</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateManualQuest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-gray-700 mb-1">
                  ชื่อภารกิจ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ภารกิจพิชิตเศษส่วนมหัศจรรย์"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-gray-700 mb-1">คำอธิบายภารกิจ</label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดสั้นๆ เพื่อกระตุ้นให้นักเรียนทำภารกิจ..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-gray-700 mb-1">
                  เลือกชุดโจทย์ที่ผูกกับภารกิจ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.problem_set_id}
                  onChange={(e) => setCreateForm({ ...createForm, problem_set_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-bold text-indigo-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- กรุณาเลือกชุดโจทย์ที่มีในระบบ --</option>
                  {problemSets.map((ps) => (
                    <option key={ps.id} value={ps.id}>
                      {ps.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-extrabold text-gray-700 mb-1">รางวัลเหรียญ (Coins)</label>
                  <div className="flex items-center gap-2 bg-yellow-50/70 border border-yellow-200 px-3 py-2 rounded-xl">
                    <CoinIcon className="w-4 h-4 shrink-0" />
                    <input
                      type="number"
                      min={0}
                      value={createForm.reward_coins}
                      onChange={(e) => setCreateForm({ ...createForm, reward_coins: Number(e.target.value) })}
                      className="w-full bg-transparent font-black text-yellow-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-700 mb-1">รางวัลประสบการณ์ (XP)</label>
                  <div className="flex items-center gap-2 bg-purple-50/70 border border-purple-200 px-3 py-2 rounded-xl">
                    <span className="text-purple-600 font-black">★</span>
                    <input
                      type="number"
                      min={0}
                      value={createForm.reward_xp}
                      onChange={(e) => setCreateForm({ ...createForm, reward_xp: Number(e.target.value) })}
                      className="w-full bg-transparent font-black text-purple-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={createForm.is_active}
                    onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span>เปิดใช้งานภารกิจนี้ทันที</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
                  >
                    {creating ? 'กำลังสร้าง...' : '💾 บันทึกภารกิจ'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
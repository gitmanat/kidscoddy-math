'use client'

import { useEffect, useState, use, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'

// ฟังก์ชันช่วยเรนเดอร์ข้อความผสม LaTeX และขึ้นบรรทัดใหม่ให้แม่นยำ 100% (ล้างอักขระขยะอัตโนมัติ)
function RenderMathText({ text }: { text: string }) {
  if (!text) return null

  const cleanText = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\\n/g, '\n')

  return (
    <div className="space-y-1.5 leading-relaxed">
      {cleanText.split('\n').map((line, lineIdx) => {
        const parts = line.split(/(\$[^$]+\$)/g)

        return (
          <div key={lineIdx} className="min-h-[1.25rem]">
            {parts.map((part, pIdx) => {
              if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                const mathContent = part.slice(1, -1).trim()
                return <InlineMath key={pIdx} math={mathContent} />
              }
              return <span key={pIdx}>{part}</span>
            })}
          </div>
        )
      })}
    </div>
  )
}

function AdminProblemContent({ params }: { params: Promise<{ setId: string }> }) {
  const resolvedParams = use(params)
  const setId = resolvedParams.setId
  const router = useRouter()

  const [adminUser, setAdminUser] = useState<any>(null)
  const [problemSet, setProblemSet] = useState<any>(null)
  const [problems, setProblems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State สำหรับฟอร์มเพิ่มโจทย์ทีละข้อ
  const [questionText, setQuestionText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [solutionText, setSolutionText] = useState('')
  const [orderNum, setOrderNum] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // State สำหรับฟอร์มแก้ไขโจทย์เดิม
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editOrderNum, setEditOrderNum] = useState(1)
  const [editQuestionText, setEditQuestionText] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('')
  const [editSolutionText, setEditSolutionText] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

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
    setAdminUser(user)
    fetchSetAndProblems()
  }, [setId, router])

  const fetchSetAndProblems = async () => {
    try {
      const { data: setData } = await supabase
        .from('problem_sets')
        .select('*')
        .eq('id', setId)
        .single()
      setProblemSet(setData)

      const { data: probData, error: probErr } = await supabase
        .from('problems')
        .select('*')
        .eq('set_id', setId)
        .order('order_num', { ascending: true })

      if (probErr) throw probErr

      setProblems(probData || [])
      setOrderNum((probData?.length || 0) + 1)
    } catch (err) {
      console.error('Error fetching problems:', err)
    } finally {
      setLoading(false)
    }
  }

  // อัปโหลดรูปภาพ
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImg(true)
    setErrorMsg('')
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('exercise-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: publicURLData } = supabase.storage
        .from('exercise-images')
        .getPublicUrl(filePath)

      if (isEdit) {
        setEditImageUrl(publicURLData.publicUrl)
      } else {
        setImageUrl(publicURLData.publicUrl)
      }
    } catch (err: any) {
      alert('อัปโหลดรูปภาพไม่สำเร็จ: ' + err.message)
    } finally {
      setUploadingImg(false)
    }
  }

  // เพิ่มโจทย์ใหม่
  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!questionText.trim() || !correctAnswer.trim()) {
      setErrorMsg('กรุณากรอกโจทย์คำถามและคำตอบที่ถูกต้อง')
      return
    }

    try {
      const { error } = await supabase.from('problems').insert({
        set_id: setId,
        order_num: orderNum,
        question_text: questionText.trim(),
        image_url: imageUrl.trim() || null,
        answer_type: 'text',
        correct_answer: correctAnswer.trim(),
        solution_text: solutionText.trim(),
      })

      if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message)
      } else {
        setQuestionText('')
        setImageUrl('')
        setCorrectAnswer('')
        setSolutionText('')
        setIsAdding(false)
        fetchSetAndProblems()
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  // เริ่มแก้ไขโจทย์เดิม
  const startEditing = (prob: any) => {
    setEditingId(prob.id)
    setEditOrderNum(prob.order_num)
    setEditQuestionText(prob.question_text || '')
    setEditImageUrl(prob.image_url || '')
    setEditCorrectAnswer(prob.correct_answer || '')
    setEditSolutionText(prob.solution_text || '')
    setIsAdding(false)
  }

  // บันทึกการแก้ไขโจทย์เดิม
  const handleUpdateProblem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !editQuestionText.trim() || !editCorrectAnswer.trim()) return

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('problems')
        .update({
          order_num: editOrderNum,
          question_text: editQuestionText.trim(),
          image_url: editImageUrl.trim() || null,
          correct_answer: editCorrectAnswer.trim(),
          solution_text: editSolutionText.trim(),
        })
        .eq('id', editingId)

      if (error) {
        alert('อัปเดตไม่สำเร็จ: ' + error.message)
      } else {
        setEditingId(null)
        fetchSetAndProblems()
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  // ลบโจทย์
  const handleDeleteProblem = async (problemId: string) => {
    if (!confirm('คุณต้องการลบโจทย์ข้อนี้ใช่หรือไม่?')) return

    const { error } = await supabase.from('problems').delete().eq('id', problemId)
    if (error) {
      alert('ลบไม่สำเร็จ: ' + error.message)
    } else {
      if (editingId === problemId) setEditingId(null)
      fetchSetAndProblems()
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 font-bold">กำลังโหลดข้อมูลข้อสอบ...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push('/admin/exercises')}
            className="text-sm font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            ← กลับหน้าจัดการชุดโจทย์
          </button>
          <h1 className="font-extrabold text-gray-800 text-base">{problemSet?.title || 'จัดการข้อสอบ'}</h1>
          <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 font-bold rounded-full">
            {problems.length} ข้อ
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-800">รายการข้อสอบในชุดนี้ (แบบเติมคำตอบ)</h2>
            <p className="text-sm text-gray-500">จัดการข้อสอบ อัปโหลดรูปภาพประกอบ และเฉลยแบบเติมคำ (รองรับ LaTeX)</p>
          </div>
          <button
            onClick={() => {
              setIsAdding(!isAdding)
              setEditingId(null)
            }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition cursor-pointer"
          >
            {isAdding ? '✕ ปิดฟอร์ม' : '+ เพิ่มข้อสอบใหม่'}
          </button>
        </div>

        {/* ฟอร์มเพิ่มโจทย์ข้อใหม่ */}
        {isAdding && (
          <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-xl border border-purple-100 mb-8 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">✨ เพิ่มข้อสอบข้อที่ {orderNum}</h3>
            
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddProblem} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  โจทย์คำถาม (ใช้ $ คร่อมสมการ LaTeX เช่น $\frac{1}{2}$) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="พิมพ์โจทย์คำถามที่นี่..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                />
                {questionText && (
                  <div className="mt-2 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-sm text-gray-800">
                    <span className="text-xs font-bold text-indigo-500 block mb-1">👁️ ตัวอย่างการแสดงผลโจทย์:</span>
                    <RenderMathText text={questionText} />
                  </div>
                )}
              </div>

              {/* อัปโหลดรูปภาพประกอบโจทย์ */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                <label className="block font-extrabold text-indigo-900">🖼️ รูปภาพประกอบโจทย์จากเครื่อง (ถ้ามี)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
                    disabled={uploadingImg}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                  {uploadingImg && <span className="text-indigo-600 font-bold animate-pulse">กำลังอัปโหลด...</span>}
                </div>

                {imageUrl && (
                  <div className="mt-2 flex items-center gap-4 bg-white p-3 rounded-xl border border-indigo-200">
                    <img src={imageUrl} alt="Preview" className="w-20 h-20 object-contain rounded-lg" />
                    <div className="space-y-1">
                      <p className="font-bold text-emerald-600">✓ อัปโหลดรูปภาพสำเร็จแล้ว</p>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        ลบรูปภาพนี้
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ลำดับที่ (Order)</label>
                  <input
                    type="number"
                    value={orderNum}
                    onChange={(e) => setOrderNum(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    คำตอบที่ถูกต้อง (Correct Answer) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 3/4 หรือ x=5"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">วิธีทำ / เฉลยละเอียด (รองรับ LaTeX และขึ้นบรรทัดใหม่)</label>
                <textarea
                  rows={3}
                  placeholder="อธิบายขั้นตอนวิธีทำ..."
                  value={solutionText}
                  onChange={(e) => setSolutionText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                />
                {/* 👁️ เพิ่มกล่อง Preview สำหรับเฉลยวิธีทำ */}
                {solutionText && (
                  <div className="mt-2 p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold block mb-1 text-amber-700">👁️ ตัวอย่างการแสดงผลเฉลยวิธีทำ:</span>
                    <RenderMathText text={solutionText} />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  บันทึกโจทย์ข้อนี้
                </button>
              </div>
            </form>
          </div>
        )}

        {/* รายการข้อสอบทั้งหมด */}
        {problems.length === 0 ? (
          <div className="bg-white/80 rounded-3xl p-12 text-center border border-purple-100 shadow-sm">
            <p className="text-gray-500 mb-2">ยังไม่มีข้อสอบในชุดนี้</p>
            <p className="text-xs text-gray-400">กดปุ่ม "+ เพิ่มข้อสอบใหม่" ด้านบนเพื่อเริ่มสร้างโจทย์ได้เลยครับ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {problems.map((prob) => (
              <div
                key={prob.id}
                className={`bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-sm border transition ${
                  editingId === prob.id ? 'border-amber-400 ring-2 ring-amber-200' : 'border-purple-100'
                }`}
              >
                {editingId === prob.id ? (
                  /* ==========================================
                     โหมดแก้ไขโจทย์เดิม (Edit Mode)
                     ========================================== */
                  <form onSubmit={handleUpdateProblem} className="space-y-4 text-xs">
                    <div className="flex justify-between items-center border-b border-amber-100 pb-3">
                      <span className="text-sm font-extrabold text-amber-700">
                        ✏️ กำลังแก้ไขข้อสอบข้อที่ {prob.order_num}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                      >
                        ✕ ยกเลิก
                      </button>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        โจทย์คำถาม (รองรับ LaTeX ด้วยเครื่องหมาย $)
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={editQuestionText}
                        onChange={(e) => setEditQuestionText(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-400 outline-none text-sm font-semibold"
                      />
                      {editQuestionText && (
                        <div className="mt-2 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-sm text-gray-800">
                          <span className="text-[11px] font-bold text-indigo-500 block mb-0.5">👁️ ตัวอย่างโจทย์:</span>
                          <RenderMathText text={editQuestionText} />
                        </div>
                      )}
                    </div>

                    {/* แก้ไขรูปภาพประกอบ */}
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                      <label className="block font-bold text-amber-900">🖼️ รูปภาพประกอบโจทย์</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true)}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
                      />
                      {editImageUrl && (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-amber-200 mt-2">
                          <img src={editImageUrl} alt="Preview" className="w-16 h-16 object-contain rounded" />
                          <button
                            type="button"
                            onClick={() => setEditImageUrl('')}
                            className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            ลบรูปภาพ
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">ลำดับข้อ (Order)</label>
                        <input
                          type="number"
                          value={editOrderNum}
                          onChange={(e) => setEditOrderNum(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 font-semibold focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">คำตอบที่ถูกต้อง</label>
                        <input
                          type="text"
                          required
                          value={editCorrectAnswer}
                          onChange={(e) => setEditCorrectAnswer(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 font-semibold focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">วิธีทำ / เฉลยละเอียด</label>
                      <textarea
                        rows={3}
                        value={editSolutionText}
                        onChange={(e) => setEditSolutionText(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 font-semibold focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                      {/* 👁️ เพิ่มกล่อง Preview สำหรับโหมดแก้ไขเฉลยวิธีทำ */}
                      {editSolutionText && (
                        <div className="mt-2 p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900">
                          <span className="font-bold block mb-1 text-amber-700">👁️ ตัวอย่างการแสดงผลเฉลยวิธีทำ:</span>
                          <RenderMathText text={editSolutionText} />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow transition cursor-pointer"
                      >
                        {isUpdating ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ==========================================
                     โหมดแสดงรายการปกติ (View Mode)
                     ========================================== */
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                          ข้อที่ {prob.order_num}
                        </span>
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                          คำตอบ: {prob.correct_answer}
                        </span>
                      </div>

                      <div className="text-gray-800 font-semibold pt-1">
                        <RenderMathText text={prob.question_text} />
                      </div>

                      {/* แสดงรูปภาพถ้ามี */}
                      {prob.image_url && (
                        <div className="mt-2">
                          <img src={prob.image_url} alt="Question" className="max-h-40 rounded-xl border border-purple-100 object-contain bg-white p-1" />
                        </div>
                      )}

                      {prob.solution_text && (
                        <div className="text-xs text-amber-900 bg-amber-50/70 border border-amber-100 p-3 rounded-xl mt-2">
                          <span className="font-bold block mb-1 text-amber-700">💡 วิธีทำละเอียด:</span>
                          <RenderMathText text={prob.solution_text} />
                        </div>
                      )}
                    </div>

                    {/* ปุ่มจัดการ (แก้ไข / ลบ) */}
                    <div className="flex gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => startEditing(prob)}
                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        ✏️ แก้ไข
                      </button>
                      <button
                        onClick={() => handleDeleteProblem(prob.id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        🗑️ ลบ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function AdminProblemDetail({ params }: { params: Promise<{ setId: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-purple-600 font-bold">กำลังโหลดระบบจัดการข้อสอบ...</div>}>
      <AdminProblemContent params={params} />
    </Suspense>
  )
}
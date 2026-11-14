'use client'

import { useEffect, useState, use, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'

// ฟังก์ชันช่วยเรนเดอร์ข้อความผสม LaTeX และขึ้นบรรทัดใหม่ให้แสดงผลเหมือนหน้าจริง
function RenderMathText({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="space-y-1">
      {text
        .replace(/\\n/g, '\n')
        .split('\n')
        .map((line, lineIdx) => (
          <div key={lineIdx}>
            {line.includes('$') ? (
              line.split('$').map((part, pIdx) =>
                pIdx % 2 === 1 ? (
                  <InlineMath key={pIdx} math={part} />
                ) : (
                  <span key={pIdx}>{part}</span>
                )
              )
            ) : (
              <span>{line}</span>
            )}
          </div>
        ))}
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
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [solutionText, setSolutionText] = useState('')
  const [orderNum, setOrderNum] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  // State สำหรับฟอร์มนำเข้าโจทย์ชุดใหญ่ (Bulk Import JSON)
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
  const [bulkJsonText, setBulkJsonText] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkError, setBulkError] = useState('')

  // State สำหรับฟอร์มแก้ไขโจทย์เดิม (Edit Problem)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editOrderNum, setEditOrderNum] = useState(1)
  const [editQuestionText, setEditQuestionText] = useState('')
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

      const { data: probData } = await supabase
        .from('problems')
        .select('*')
        .eq('set_id', setId)
        .order('order_num', { ascending: true })

      setProblems(probData || [])
      setOrderNum((probData?.length || 0) + 1)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // เพิ่มโจทย์ใหม่ (ทีละข้อ)
  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!questionText.trim() || !correctAnswer.trim()) return

    try {
      const { error } = await supabase.from('problems').insert({
        set_id: setId,
        order_num: orderNum,
        question_text: questionText,
        answer_type: 'text',
        correct_answer: correctAnswer,
        solution_text: solutionText,
      })

      if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message)
      } else {
        setQuestionText('')
        setCorrectAnswer('')
        setSolutionText('')
        setIsAdding(false)
        fetchSetAndProblems()
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  // นำเข้าโจทย์ชุดใหญ่ผ่าน JSON (Bulk Import)
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setBulkError('')
    if (!bulkJsonText.trim()) {
      setBulkError('กรุณาวางข้อมูล JSON ก่อนนำเข้า')
      return
    }

    setBulkImporting(true)
    try {
      let parsedData = JSON.parse(bulkJsonText)
      if (!Array.isArray(parsedData)) {
        throw new Error('ข้อมูล JSON ต้องเป็นรูปแบบ Array [...]')
      }

      // หา order_num เริ่มต้นถัดไปถ้าไม่ได้ระบุมา
      let currentMaxOrder = problems.length > 0 ? Math.max(...problems.map(p => p.order_num)) : 0

      const formattedRows = parsedData.map((item, idx) => {
        currentMaxOrder += 1
        return {
          set_id: setId,
          order_num: item.order_num || currentMaxOrder,
          question_text: item.question_text,
          answer_type: 'text',
          correct_answer: String(item.correct_answer),
          solution_text: item.solution_text || '',
        }
      })

      const { error } = await supabase.from('problems').insert(formattedRows)

      if (error) throw error

      alert(`✅ นำเข้าโจทย์สำเร็จ ${formattedRows.length} ข้อ!`)
      setBulkJsonText('')
      setIsBulkImportOpen(false)
      fetchSetAndProblems()
    } catch (err: any) {
      setBulkError('รูปแบบ JSON ไม่ถูกต้อง: ' + (err.message || 'กรุณาตรวจสอบโครงสร้างข้อมูล'))
    } finally {
      setBulkImporting(false)
    }
  }

  // ตัวอย่างโค้ด JSON สำหรับให้คุณครูกดคัดลอกไปบอก AI
  const sampleJsonTemplate = `[
  {
    "order_num": 1,
    "question_text": "จงหาผลบวกของ $\\\\frac{1}{2} + \\\\frac{1}{3}$",
    "correct_answer": "5/6",
    "solution_text": "หา ค.ร.น. คือ 6\\\\nจะได้ $\\\\frac{3}{6} + \\\\frac{2}{6} = \\\\frac{5}{6}$"
  },
  {
    "order_num": 2,
    "question_text": "แก้สมการ $2x + 5 = 15$",
    "correct_answer": "5",
    "solution_text": "$2x = 15 - 5$\\\\n$2x = 10\\\\n$x = 5$"
  }
]`

  // เปิดโหมดแก้ไขและดึงข้อมูลเดิมมาใส่ฟอร์ม
  const startEditing = (prob: any) => {
    setEditingId(prob.id)
    setEditOrderNum(prob.order_num)
    setEditQuestionText(prob.question_text || '')
    setEditCorrectAnswer(prob.correct_answer || '')
    setEditSolutionText((prob.solution_text || '').replace(/\\n/g, '\n'))
    setIsAdding(false)
    setIsBulkImportOpen(false)
  }

  // บันทึกการแก้ไขโจทย์เดิมลง Supabase
  const handleUpdateProblem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !editQuestionText.trim() || !editCorrectAnswer.trim()) return

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('problems')
        .update({
          order_num: editOrderNum,
          question_text: editQuestionText,
          correct_answer: editCorrectAnswer,
          solution_text: editSolutionText,
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
    return <div className="min-h-screen flex items-center justify-center text-gray-500">กำลังโหลดข้อมูล...</div>
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
            <h2 className="text-2xl font-black text-gray-800">รายการข้อสอบในชุดนี้</h2>
            <p className="text-sm text-gray-500">เพิ่มทีละข้อ หรือนำเข้าชุดใหญ่ 10 ข้อรวดด้วย JSON (รองรับ LaTeX)</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setIsBulkImportOpen(!isBulkImportOpen)
                setIsAdding(false)
                setEditingId(null)
              }}
              className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition cursor-pointer"
            >
              {isBulkImportOpen ? '✕ ปิดนำเข้า' : '📥 นำเข้าโจทย์ชุดใหญ่ (JSON)'}
            </button>
            <button
              onClick={() => {
                setIsAdding(!isAdding)
                setIsBulkImportOpen(false)
                setEditingId(null)
              }}
              className="flex-1 md:flex-none px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition cursor-pointer"
            >
              {isAdding ? '✕ ปิดฟอร์ม' : '+ เพิ่มทีละข้อ'}
            </button>
          </div>
        </div>

        {/* 📥 กล่องนำเข้าโจทย์ชุดใหญ่ผ่าน JSON (Bulk Import) */}
        {isBulkImportOpen && (
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-emerald-200 mb-8 space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="text-base font-black text-emerald-800">📥 นำเข้าโจทย์ชุดใหญ่ (Bulk Import JSON)</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sampleJsonTemplate)
                  alert('คัดลอกโครงสร้างตัวอย่าง JSON ไปยังคลิปบอร์ดแล้ว! นำไปให้ AI เจนโจทย์มาวางได้เลยครับ')
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold rounded-xl border border-emerald-300 transition cursor-pointer"
              >
                📋 คัดลอกโครงสร้าง JSON ตัวอย่าง
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              วิธีใช้: บอกให้ AI สร้างโจทย์คณิตศาสตร์ 10 ข้อในรูปแบบ <span className="font-mono font-bold text-indigo-600">JSON Array [...]</span> ตามฟิลด์ `question_text`, `correct_answer`, `solution_text` แล้วนำมาวางในช่องด้านล่างนี้ได้เลยครับ กดบันทึกครั้งเดียวเข้าฐานข้อมูลรวดเดียวจบ!
            </p>

            {bulkError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {bulkError}
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-4">
              <textarea
                rows={8}
                placeholder="วางโค้ด JSON ที่นี่ เช่น [ { 'question_text': '...', 'correct_answer': '...' } ]"
                value={bulkJsonText}
                onChange={(e) => setBulkJsonText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={bulkImporting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
                >
                  {bulkImporting ? 'กำลังบันทึกโจทย์ทั้งหมด...' : '🚀 ยืนยันนำเข้าโจทย์เข้าสู่ระบบ'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ฟอร์มเพิ่มโจทย์ข้อใหม่ (ทีละข้อ) */}
        {isAdding && (
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-purple-100 mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">✨ เพิ่มโจทย์ข้อที่ {orderNum}</h3>
            <form onSubmit={handleAddProblem} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  โจทย์คำถาม (ใช้ $ คร่อมสมการ LaTeX เช่น $\frac{1}{2}$)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="พิมพ์โจทย์คำถามที่นี่..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                />
                {questionText && (
                  <div className="mt-2 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-sm text-gray-800">
                    <span className="text-xs font-bold text-indigo-500 block mb-1">👁️ ตัวอย่างการแสดงผลโจทย์:</span>
                    <RenderMathText text={questionText} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ลำดับที่ (Order)</label>
                  <input
                    type="number"
                    value={orderNum}
                    onChange={(e) => setOrderNum(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">คำตอบที่ถูกต้อง (Correct Answer)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 5/6 หรือ x=5"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">วิธีทำ / เฉลยละเอียด</label>
                <textarea
                  rows={3}
                  placeholder="อธิบายขั้นตอนวิธีทำ..."
                  value={solutionText}
                  onChange={(e) => setSolutionText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                />
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
            <p className="text-xs text-gray-400">กดปุ่ม "📥 นำเข้าโจทย์ชุดใหญ่ (JSON)" ด้านบนเพื่อเพิ่มโจทย์ 10 ข้อรวดได้เลยครับ</p>
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
                  <form onSubmit={handleUpdateProblem} className="space-y-4">
                    <div className="flex justify-between items-center border-b border-amber-100 pb-3">
                      <span className="text-sm font-extrabold text-amber-700">
                        ✏️ กำลังแก้ไขโจทย์ข้อที่ {prob.order_num}
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
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        โจทย์คำถาม (รองรับ LaTeX ด้วยเครื่องหมาย $)
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={editQuestionText}
                        onChange={(e) => setEditQuestionText(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                      />
                      {editQuestionText && (
                        <div className="mt-2 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-sm text-gray-800">
                          <span className="text-[11px] font-bold text-indigo-500 block mb-0.5">👁️ ตัวอย่างโจทย์:</span>
                          <RenderMathText text={editQuestionText} />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ลำดับข้อ (Order)</label>
                        <input
                          type="number"
                          value={editOrderNum}
                          onChange={(e) => setEditOrderNum(Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">คำตอบที่ถูกต้อง</label>
                        <input
                          type="text"
                          required
                          value={editCorrectAnswer}
                          onChange={(e) => setEditCorrectAnswer(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        วิธีทำ / เฉลยละเอียด
                      </label>
                      <textarea
                        rows={4}
                        value={editSolutionText}
                        onChange={(e) => setEditSolutionText(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                      />
                      {editSolutionText && (
                        <div className="mt-2 p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900">
                          <span className="text-[11px] font-bold text-amber-600 block mb-0.5">👁️ ตัวอย่างเฉลย:</span>
                          <RenderMathText text={editSolutionText} />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer"
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
                    <div className="space-y-1.5 flex-1">
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-purple-600">กำลังโหลดระบบจัดการข้อสอบ...</div>}>
      <AdminProblemContent params={params} />
    </Suspense>
  )
}
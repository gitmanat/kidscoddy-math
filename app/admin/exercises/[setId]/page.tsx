'use client'

import { useEffect, useState, use, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'
import AssignDateField, { toLocalDateStr } from '@/components/AssignDateField'

// วันของชุดโจทย์ = target_date (ถ้าไม่มีใช้วันที่สร้างตามเวลาเครื่อง)
const getSetDay = (set: any): string => {
  if (set?.target_date) return String(set.target_date).slice(0, 10)
  if (set?.created_at) return toLocalDateStr(new Date(set.created_at))
  return ''
}

// =====================================================================
// 📥 นำเข้าข้อสอบจาก JSON
// รูปแบบ: [ { "question_text": "...", "correct_answer": "...", "solution_text": "..." } ]
// - ไม่บังคับ: image_url, order_num (ถ้าไม่ใส่ จะเรียงต่อท้ายข้อที่มีอยู่ในชุดอัตโนมัติ)
// - รองรับชื่อสั้น: question / answer / solution และรูปแบบ { "problems": [...] } หรือ Object เดี่ยว
// =====================================================================
type ImportRow = {
  order_num: number
  question_text: string
  correct_answer: string
  solution_text: string
  image_url: string | null
}

const SAMPLE_JSON = JSON.stringify(
  [
    {
      question_text: 'จงหาค่าของ $(-8) + 13$',
      correct_answer: '5',
      solution_text: '1. ลบค่าสัมบูรณ์กัน $13 - 8 = 5$\n2. ตอบตามเครื่องหมายของตัวที่มากกว่า ได้ $5$',
    },
    {
      question_text: 'จงหาค่าของ $(-6) \\times (-7)$',
      correct_answer: '42',
      solution_text: 'เครื่องหมายเหมือนกัน ผลคูณเป็นบวก $6 \\times 7 = 42$',
    },
  ],
  null,
  2
)

// อักขระแท็บ/backspace/formfeed/CR ที่โผล่มาเพราะเขียน \times \frac \beta \right ใน JSON แบบ backslash เดียว
const CONTROL_CHARS = /[\u0008\u0009\u000C\u000D]/

function parseProblemsJson(input: string, startOrder: number) {
  const result = { rows: [] as ImportRow[], errors: [] as string[], warnings: [] as string[], fatal: '' }
  if (!input.trim()) return result

  let data: any
  try {
    data = JSON.parse(input)
  } catch (e: any) {
    result.fatal = `รูปแบบ JSON ไม่ถูกต้อง: ${e.message}`
    return result
  }

  if (data && !Array.isArray(data) && Array.isArray(data.problems)) data = data.problems
  if (!Array.isArray(data)) {
    if (typeof data === 'object' && data !== null) data = [data]
    else {
      result.fatal = 'ข้อมูล JSON ต้องอยู่ในรูป Array [...] หรือ Object ที่ถูกต้อง'
      return result
    }
  }

  let nextOrder = startOrder
  data.forEach((item: any, i: number) => {
    const no = i + 1
    const question = String(item?.question_text ?? item?.question ?? '').trim()
    const answer = String(item?.correct_answer ?? item?.answer ?? '').trim()
    const solution = String(item?.solution_text ?? item?.solution ?? '').trim()
    const image = String(item?.image_url ?? '').trim()

    if (!question) result.errors.push(`ข้อที่ ${no}: ไม่มี question_text`)
    if (!answer) result.errors.push(`ข้อที่ ${no}: ไม่มี correct_answer`)
    if (CONTROL_CHARS.test(question + answer + solution)) {
      result.warnings.push(
        `ข้อที่ ${no}: พบอักขระแท็บ/ขึ้นบรรทัดแปลกๆ น่าจะมาจาก \\times \\frac ที่เขียน backslash ตัวเดียว (ใน JSON ต้องเขียนเป็น \\\\times)`
      )
    }

    result.rows.push({
      order_num: typeof item?.order_num === 'number' ? item.order_num : nextOrder++,
      question_text: question,
      correct_answer: answer,
      solution_text: solution,
      image_url: image || null,
    })
  })

  return result
}

// แก้ backslash ที่ไม่ใช่ escape ของ JSON (เช่น \times \frac \div) ให้เป็น \\times \\frac \\div
// (คง \\ \" \/ \n \uXXXX ไว้ตามเดิม)
const fixLatexBackslashes = (input: string) =>
  input.replace(/\\(\\|"|\/|n|u[0-9a-fA-F]{4})|\\/g, (m, valid) => (valid ? m : '\\\\'))

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

  // 📥 State สำหรับนำเข้าข้อสอบจาก JSON
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [importing, setImporting] = useState(false)

  // 📅 State สำหรับ "วันของการบ้าน" ของชุดนี้
  const [setDate, setSetDate] = useState('')
  const [savingDate, setSavingDate] = useState(false)
  const [dateMsg, setDateMsg] = useState('')

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

  // ตั้งค่าช่องวันที่ครั้งแรกที่โหลดชุดโจทย์ (ผูกกับ id จึงไม่ถูกรีเซ็ตตอนเพิ่ม/แก้โจทย์แล้วโหลดซ้ำ)
  useEffect(() => {
    if (problemSet) setSetDate(getSetDay(problemSet))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemSet?.id])

  const savedDate = getSetDay(problemSet)
  const dateDirty = !!setDate && setDate !== savedDate

  // บันทึกวันของการบ้านลง problem_sets.target_date
  const handleSaveSetDate = async () => {
    if (!setDate) return
    setSavingDate(true)
    setDateMsg('')
    const { error } = await supabase.from('problem_sets').update({ target_date: setDate }).eq('id', setId)
    if (error) {
      setDateMsg(`❌ บันทึกวันไม่สำเร็จ: ${error.message} (ถ้ายังไม่มีคอลัมน์ target_date ให้รัน add_target_date.sql ก่อน)`)
    } else {
      setProblemSet((prev: any) => ({ ...prev, target_date: setDate }))
      setDateMsg('✅ บันทึกวันของการบ้านเรียบร้อยแล้ว')
    }
    setSavingDate(false)
  }

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

  // ลำดับข้อเริ่มต้นของการนำเข้า = ต่อท้ายข้อสุดท้ายที่มีอยู่
  const getImportStartOrder = () => Math.max(0, ...problems.map((p) => Number(p.order_num) || 0)) + 1

  // อ่านไฟล์ .json ที่อัปโหลด
  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setJsonInput((event.target?.result as string) || '')
      setImportMsg('📁 โหลดไฟล์สำเร็จ! ตรวจสอบตัวอย่างด้านล่างแล้วกดนำเข้าได้เลย')
    }
    reader.readAsText(file)
    e.target.value = '' // เลือกไฟล์เดิมซ้ำได้
  }

  // นำเข้าข้อสอบทั้งชุดในครั้งเดียว (ถ้ามีข้อใดผิดพลาดจะไม่บันทึกเลย)
  const handleImportProblems = async () => {
    setImportMsg('')
    if (!jsonInput.trim()) {
      setImportMsg('⚠️ กรุณาอัปโหลดไฟล์หรือวาง JSON ก่อนนำเข้า')
      return
    }
    const parsed = parseProblemsJson(jsonInput, getImportStartOrder())
    if (parsed.fatal) {
      setImportMsg(`❌ ${parsed.fatal}`)
      return
    }
    if (parsed.errors.length > 0) {
      setImportMsg(`❌ ${parsed.errors[0]} (พบปัญหาทั้งหมด ${parsed.errors.length} จุด)`)
      return
    }
    if (parsed.rows.length === 0) {
      setImportMsg('⚠️ ไม่พบข้อสอบใน JSON')
      return
    }
    if (parsed.warnings.length > 0 && !confirm(`พบคำเตือน ${parsed.warnings.length} จุด (สมการ LaTeX อาจแสดงผลผิด) ต้องการนำเข้าต่อหรือไม่?`)) {
      return
    }

    setImporting(true)
    try {
      const payload = parsed.rows.map((r) => ({
        set_id: setId,
        order_num: r.order_num,
        question_text: r.question_text,
        image_url: r.image_url,
        answer_type: 'text',
        correct_answer: r.correct_answer,
        solution_text: r.solution_text,
      }))
      const { error } = await supabase.from('problems').insert(payload)
      if (error) throw error

      setJsonInput('')
      setImportMsg(`🎉 นำเข้าข้อสอบสำเร็จ ${payload.length} ข้อ!`)
      fetchSetAndProblems()
    } catch (err: any) {
      setImportMsg(`❌ นำเข้าไม่สำเร็จ: ${err.message}`)
    } finally {
      setImporting(false)
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

  // 👁️ ตัวอย่างข้อสอบที่จะนำเข้า (คำนวณเฉพาะตอนเปิดแผงนำเข้า)
  const importPreview = isImportOpen
    ? parseProblemsJson(jsonInput, getImportStartOrder())
    : { rows: [] as ImportRow[], errors: [] as string[], warnings: [] as string[], fatal: '' }
  const needsBackslashFix = importPreview.warnings.length > 0 || importPreview.fatal.includes('JSON')

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
        {/* 📅 วันของการบ้านชุดนี้ — นักเรียนจะเห็นชุดนี้ตามวันที่กำหนด */}
        <div className="bg-white/95 backdrop-blur-sm p-5 md:p-6 rounded-3xl shadow-sm border border-purple-100 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <AssignDateField value={setDate} onChange={(v) => { setSetDate(v); setDateMsg('') }} label="📅 วันของการบ้านชุดนี้" />
          <div className="flex flex-col items-start md:items-end gap-2">
            <button
              type="button"
              onClick={handleSaveSetDate}
              disabled={!dateDirty || savingDate}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-2xl shadow-md transition cursor-pointer"
            >
              {savingDate ? 'กำลังบันทึก...' : dateDirty ? '💾 บันทึกวันที่' : '✓ บันทึกแล้ว'}
            </button>
            {dateMsg && <span className="text-xs font-bold text-gray-600">{dateMsg}</span>}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-800">รายการข้อสอบในชุดนี้ (แบบเติมคำตอบ)</h2>
            <p className="text-sm text-gray-500">จัดการข้อสอบ อัปโหลดรูปภาพประกอบ และเฉลยแบบเติมคำ (รองรับ LaTeX)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setIsImportOpen(!isImportOpen)
                setIsAdding(false)
                setEditingId(null)
                setImportMsg('')
              }}
              className={`px-5 py-2.5 font-extrabold text-xs rounded-2xl shadow-md transition cursor-pointer ${
                isImportOpen
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isImportOpen ? '✕ ปิดแผงนำเข้า' : '📥 นำเข้าจาก JSON'}
            </button>
            <button
              onClick={() => {
                setIsAdding(!isAdding)
                setIsImportOpen(false)
                setEditingId(null)
              }}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition cursor-pointer"
            >
              {isAdding ? '✕ ปิดฟอร์ม' : '+ เพิ่มข้อสอบใหม่'}
            </button>
          </div>
        </div>

        {/* 📥 แผงนำเข้าข้อสอบจาก JSON (ไม่ต้องแนบรูปภาพ เพิ่มทีละหลายข้อได้ในครั้งเดียว) */}
        {isImportOpen && (
          <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-xl border border-emerald-200 mb-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-gray-800">📥 นำเข้าข้อสอบจาก JSON</h3>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                จะเริ่มต่อที่ข้อที่ {getImportStartOrder()}
              </span>
            </div>

            <details className="text-xs bg-gray-50 border border-gray-200 rounded-2xl p-3">
              <summary className="font-extrabold text-gray-700 cursor-pointer">📖 รูปแบบ JSON ที่ใช้ได้</summary>
              <div className="mt-2 space-y-2 text-gray-600 leading-relaxed">
                <p>
                  ฟิลด์ที่ต้องมี: <code className="font-mono text-emerald-700">question_text</code>,{' '}
                  <code className="font-mono text-emerald-700">correct_answer</code> — ไม่บังคับ:{' '}
                  <code className="font-mono">solution_text</code>, <code className="font-mono">image_url</code>,{' '}
                  <code className="font-mono">order_num</code> (ถ้าไม่ใส่ จะเรียงต่อท้ายข้อเดิมให้อัตโนมัติ)
                </p>
                <p>
                  สมการ LaTeX ต้องใช้ backslash <b>สองตัว</b> ใน JSON เช่น <code className="font-mono">\\times</code>,{' '}
                  <code className="font-mono">\\frac</code> และขึ้นบรรทัดใหม่ใช้ <code className="font-mono">\n</code>
                  (ถ้าเผลอพิมพ์ตัวเดียว กดปุ่ม "แก้ \ ให้อัตโนมัติ" ได้)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setJsonInput(SAMPLE_JSON)
                    setImportMsg('')
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg cursor-pointer"
                >
                  ใส่ตัวอย่างลงในช่อง
                </button>
              </div>
            </details>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700">1. เลือกไฟล์ .json:</label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFile}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 file:cursor-pointer cursor-pointer border border-gray-200 rounded-2xl p-2"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700">2. หรือวาง / แก้ไข JSON ตรงนี้:</label>
              <textarea
                rows={10}
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value)
                  setImportMsg('')
                }}
                placeholder='[ { "question_text": "จงหาค่าของ $(-8) + 13$", "correct_answer": "5", "solution_text": "..." } ]'
                className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xs text-gray-800 bg-gray-50"
              />
              {needsBackslashFix && jsonInput.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setJsonInput(fixLatexBackslashes(jsonInput))
                    setImportMsg('🔧 แก้ backslash ให้แล้ว ตรวจตัวอย่างด้านล่างอีกครั้ง')
                  }}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  🔧 แก้ \ ให้อัตโนมัติ (เช่น \times → \\times)
                </button>
              )}
            </div>

            {/* ผลตรวจสอบ + ตัวอย่าง */}
            {importPreview.fatal && jsonInput.trim() && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
                ⚠️ {importPreview.fatal}
              </div>
            )}
            {importPreview.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold space-y-1">
                {importPreview.errors.slice(0, 5).map((er, i) => (
                  <p key={i}>❌ {er}</p>
                ))}
                {importPreview.errors.length > 5 && <p>…และอีก {importPreview.errors.length - 5} จุด</p>}
              </div>
            )}
            {importPreview.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-bold space-y-1">
                {importPreview.warnings.slice(0, 3).map((w, i) => (
                  <p key={i}>⚠️ {w}</p>
                ))}
                {importPreview.warnings.length > 3 && <p>…และอีก {importPreview.warnings.length - 3} จุด</p>}
              </div>
            )}

            {importPreview.rows.length > 0 && (
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                <p className="text-xs font-extrabold text-indigo-800">
                  👁️ ตัวอย่างข้อสอบที่จะนำเข้า ({importPreview.rows.length} ข้อ)
                </p>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {importPreview.rows.slice(0, 5).map((r, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-indigo-100 text-sm space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                          ข้อที่ {r.order_num}
                        </span>
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          คำตอบ: {r.correct_answer}
                        </span>
                        {r.image_url && <span className="text-[10px] text-sky-600 font-bold">🖼️ มีรูป</span>}
                      </div>
                      <div className="text-gray-800 font-semibold">
                        <RenderMathText text={r.question_text} />
                      </div>
                      {r.solution_text && (
                        <div className="text-xs text-amber-900 bg-amber-50/70 border border-amber-100 p-2 rounded-lg">
                          <RenderMathText text={r.solution_text} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {importPreview.rows.length > 5 && (
                  <p className="text-[11px] text-gray-400 font-bold">…และอีก {importPreview.rows.length - 5} ข้อ (แสดงตัวอย่าง 5 ข้อแรก)</p>
                )}
              </div>
            )}

            {importMsg && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-xs font-bold">
                {importMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setJsonInput('')
                  setImportMsg('')
                }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition cursor-pointer text-xs"
              >
                ล้างช่อง
              </button>
              <button
                type="button"
                onClick={handleImportProblems}
                disabled={importing || importPreview.rows.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold rounded-xl shadow-md transition cursor-pointer text-xs"
              >
                {importing ? 'กำลังนำเข้า...' : `🚀 นำเข้า ${importPreview.rows.length || ''} ข้อ`}
              </button>
            </div>
          </div>
        )}

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
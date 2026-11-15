'use client'

import { useEffect, useState, use, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'
import * as math from 'mathjs'

function PracticeContent({ params }: { params: Promise<{ setId: string }> }) {
  const resolvedParams = use(params)
  const setId = resolvedParams.setId
  const router = useRouter()

  const [student, setStudent] = useState<any>(null)
  const [problemSet, setProblemSet] = useState<any>(null)
  const [problems, setProblems] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const [isSosModalOpen, setIsSosModalOpen] = useState(false)
  const [sosMessage, setSosMessage] = useState('')

  // เก็บคำตอบและสถานะการตรวจของแต่ละข้อ { [problemId]: string }
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({})
  const [results, setResults] = useState<{ [key: string]: { isCorrect: boolean; checked: boolean; showSolution: boolean } }>({})

  // สถานะหน้าสรุปภารกิจ (Mission Complete)
  const [isCompleted, setIsCompleted] = useState(false)
  const [summaryData, setSummaryData] = useState({ score: 0, total: 0, stars: 0, bonusMessage: '' })
  const [savingSummary, setSavingSummary] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('kidscoddy_user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    setStudent(JSON.parse(storedUser))
    fetchProblemSetAndData(JSON.parse(storedUser).id)
  }, [setId, router])

  const fetchProblemSetAndData = async (userId: string) => {
    try {
      // 📌 รีเซ็ตสถานะหน้าต่างสรุปผลให้ปิดลงก่อน เมื่อเข้ามาหน้าทำแบบฝึกหัดใหม่
      setIsCompleted(false)

      // 1. ดึงข้อมูลชุดโจทย์
      const { data: setData } = await supabase
        .from('problem_sets')
        .select('*')
        .eq('id', setId)
        .single()
      setProblemSet(setData)

      // 2. ดึงรายการข้อสอบทั้งหมด
      const { data: probData } = await supabase
        .from('problems')
        .select('*')
        .eq('set_id', setId)
        .order('order_num', { ascending: true })

      const loadedProblems = probData || []
      setProblems(loadedProblems)

      // 3. ดึงประวัติการทำข้อสอบเก่าของเด็กคนนี้ (ถ้ามี) เพื่อเติมคำตอบและสถานะเดิม
      const { data: subData } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', userId)

      if (subData && subData.length > 0) {
        const ansMap: { [key: string]: string } = {}
        const resMap: { [key: string]: { isCorrect: boolean; checked: boolean; showSolution: boolean } } = {}

        subData.forEach((sub) => {
          ansMap[sub.problem_id] = sub.student_answer
          resMap[sub.problem_id] = {
            isCorrect: sub.is_correct,
            checked: true,
            showSolution: false,
          }
        })

        setUserAnswers(ansMap)
        setResults(resMap)
      }
    } catch (err) {
      console.error('Error fetching practice data:', err)
    } finally {
      setLoading(false)
    }
  }

  const currentProb = problems[currentIndex]
  // 🚨 ฟังก์ชันกดส่ง SOS ขอความช่วยเหลือจากคุณครู
  const handleSendSOS = async () => {
    if (!currentProb || !student) return
    try {
      const { error } = await supabase.from('student_sos_requests').insert({
        student_id: student.id,
        set_id: setId,
        problem_id: currentProb.id,
        question_text: currentProb.question_text,
        status: 'pending'
      })

      if (error) throw error
      alert('🚨 ส่งสัญญาณขอความช่วยเหลือไปยังคุณครูเรียบร้อยแล้ว! รอคุณครูมาแนะนำข้อนี้นะครับ')
    } catch (err) {
      console.error('Error sending SOS:', err)
      alert('❌ ไม่สามารถส่งสัญญาณได้ กรุณาลองใหม่อีกครั้ง')
    }
  }

  const handleSendSOSWithNote = async () => {
    if (!currentProb || !student) return
    try {
      const { error } = await supabase.from('student_sos_requests').insert({
        student_id: student.id,
        set_id: setId,
        problem_id: currentProb.id,
        question_text: currentProb.question_text,
        student_note: sosMessage.trim() || 'ติดโจทย์ข้อนี้ ไม่แน่ใจวิธีทำ', // บันทึกข้อความที่เด็กพิมพ์
        status: 'pending'
      })

      if (error) throw error
      alert('🚨 ส่งสัญญาณขอความช่วยเหลือและข้อความถึงคุณครูเรียบร้อยแล้วครับ!')
      setIsSosModalOpen(false)
      setSosMessage('')
    } catch (err) {
      console.error('Error sending SOS:', err)
      alert('❌ ไม่สามารถส่งสัญญาณได้ กรุณาลองใหม่อีกครั้ง')
    }
  }


  // ตรวจคำตอบอัจฉริยะด้วย mathjs
  const handleCheckAnswer = async () => {
    if (!currentProb) return
    const studentAns = (userAnswers[currentProb.id] || '').trim()
    if (!studentAns) return

    let isCorrect = false
    try {
      const cleanStudent = studentAns.replace(/\s+/g, '').toLowerCase()
      const cleanCorrect = currentProb.correct_answer.replace(/\s+/g, '').toLowerCase()

      if (cleanStudent === cleanCorrect) {
        isCorrect = true
      } else {
        const nodeStudent = math.parse(cleanStudent)
        const nodeCorrect = math.parse(cleanCorrect)
        isCorrect = nodeStudent.equals(nodeCorrect)
      }
    } catch (e) {
      isCorrect = studentAns.toLowerCase() === currentProb.correct_answer.toLowerCase()
    }

    // เช็กว่าข้อนี้เคยตอบถูกไปหรือยัง (ถ้าเคยถูกแล้ว จะไม่บวก XP ซ้ำ)
    const prevResult = results[currentProb.id]
    const wasAlreadyCorrect = prevResult?.checked && prevResult?.isCorrect

    setResults({
      ...results,
      [currentProb.id]: { isCorrect, checked: true, showSolution: false }
    })

    if (isCorrect) {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } })
    }

    // บันทึกลง Supabase submissions
    if (student) {
      await supabase.from('submissions').upsert({
        user_id: student.id,
        problem_id: currentProb.id,
        student_answer: studentAns,
        is_correct: isCorrect,
        attempts: 1,
      }, { onConflict: 'user_id,problem_id' })

      // ถ้าตอบถูกครั้งแรก และยังไม่เคยถูกข้อนี้มาก่อน -> บวก +1 XP, +1 Coin และอัปเดต Streak ทันที!
      if (isCorrect && !wasAlreadyCorrect) {
        const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD (ใช้วันปัจจุบันของระบบ)
        const lastActive = student.last_active_date || ''
        let newStreak = student.streak_days || 0

        // 🌟 ปรับปรุงตรรกะ Streak ให้คิดตามวันปฏิทินจริงอย่างแม่นยำ
        if (lastActive !== todayStr) {
          if (!lastActive) {
            newStreak = 1
          } else {
            const lastDate = new Date(lastActive)
            const currentDate = new Date(todayStr)
            // คำนวณส่วนต่างเป็นจำนวนเต็มวัน
            const diffTime = currentDate.getTime() - lastDate.getTime()
            const diffDays = Math.round(diffTime / (1000 * 3600 * 24))

            if (diffDays === 1) {
              newStreak += 1 // ทำต่อเนื่องจากเมื่อวาน บวกเพิ่ม 1 วัน
            } else if (diffDays > 1) {
              newStreak = 1 // ขาดช่วงไปหลายวัน รีเซิตเริ่มนับ 1 ใหม่
            } else {
              // กรณีเวลาคาบเกี่ยวแต่ยังเป็นวันเดียวกัน
              if (newStreak === 0) newStreak = 1
            }
          }
        } else if (newStreak === 0) {
          newStreak = 1
        }

        const currentXP = (student.xp || 0) + 1
        const currentCoins = (student.coins || 0) + 1
        const newLevel = Math.floor(currentXP / 50) + 1

        const updatedStudent = {
          ...student,
          xp: currentXP,
          coins: currentCoins,
          level: newLevel,
          streak_days: newStreak,
          last_active_date: todayStr
        }
        setStudent(updatedStudent)

        await supabase.from('users').update({
          xp: currentXP,
          coins: currentCoins,
          level: newLevel,
          streak_days: newStreak,
          last_active_date: todayStr
        }).eq('id', student.id)

        localStorage.setItem('kidscoddy_user', JSON.stringify(updatedStudent))
      }
    }
  }

  // กดปุ่มจบภารกิจและสรุปผล
  const handleFinishMission = async () => {
    setSavingSummary(true)
    const total = problems.length
    let score = 0

    problems.forEach((prob) => {
      if (results[prob.id]?.isCorrect) score += 1
    })

    let stars = 1
    if (score === total && total > 0) stars = 3
    else if (score >= total / 2) stars = 2

    let bonusMsg = ''

    if (student) {
      try {
        
        // 1. บันทึกผลชุดโจทย์
        const { data: existing } = await supabase
          .from('set_completions')
          .select('stars, score')
          .eq('user_id', student.id)
          .eq('set_id', setId)
          .maybeSingle()

        const bestStars = existing ? Math.max(existing.stars, stars) : stars
        const bestScore = existing ? Math.max(existing.score, score) : score

        await supabase.from('set_completions').upsert({
          user_id: student.id,
          set_id: setId,
          score: bestScore,
          total_questions: total,
          stars: bestStars,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,set_id' })

        // 2. ตรวจสอบและอัปเดต Streak ซ้ำอีกรอบตอนกดจบภารกิจ (เพื่อความชัวร์ 100%)
        const todayStr = new Date().toISOString().split('T')[0]
        const lastActive = student.last_active_date || ''
        let newStreak = student.streak_days || 0

        if (lastActive !== todayStr) {
          if (!lastActive) {
            newStreak = 1
          } else {
            const lastDate = new Date(lastActive)
            const currentDate = new Date(todayStr)
            const diffTime = currentDate.getTime() - lastDate.getTime()
            const diffDays = Math.round(diffTime / (1000 * 3600 * 24))

            if (diffDays === 1) {
              newStreak += 1
            } else if (diffDays > 1) {
              newStreak = 1
            } else {
              if (newStreak === 0) newStreak = 1
            }
          }
        } else if (newStreak === 0) {
          newStreak = 1
        }

        let bonusXP = 0
        let bonusCoins = 0

        // เช็กโบนัส Streak ครบ 7 วัน
        if (newStreak > 0 && newStreak % 7 === 0) {
          bonusXP += 10
          bonusCoins += 10
          bonusMsg = `🎉 สุดยอด! ทำ Streak ต่อเนื่องครบ ${newStreak} วัน รับโบนัสพิเศษทันที +10 XP และ +10 เหรียญทอง!\n`
        }

        // 🌟 3. เช็กเงื่อนไขภารกิจพิเศษ (Special Quests)
        const { data: questMatch } = await supabase
          .from('special_quests')
          .select('*')
          .eq('target_set_id', setId)
          .eq('is_active', true)
          .maybeSingle()

        if (questMatch) {
          const { data: alreadyDone } = await supabase
            .from('quest_completions')
            .select('id')
            .eq('user_id', student.id)
            .eq('quest_id', questMatch.id)
            .maybeSingle()

          if (!alreadyDone && stars >= 1) {
            await supabase.from('quest_completions').insert({
              user_id: student.id,
              quest_id: questMatch.id,
            })

            bonusXP += (questMatch.reward_xp || 15)
            bonusCoins += (questMatch.reward_coins || 10)
            bonusMsg += `⭐ พิชิตภารกิจพิเศษ "${questMatch.title}" สำเร็จ! รับรางวัล +${questMatch.reward_coins} Coins และ +${questMatch.reward_xp} XP!`
          }
        }

        const currentXP = (student.xp || 0) + bonusXP
        const currentCoins = (student.coins || 0) + bonusCoins
        const newLevel = Math.floor(currentXP / 50) + 1

        await supabase.from('users').update({
          streak_days: newStreak,
          last_active_date: todayStr,
          xp: currentXP,
          coins: currentCoins,
          level: newLevel
        }).eq('id', student.id)

        const updatedStudent = { 
          ...student, 
          streak_days: newStreak, 
          last_active_date: todayStr,
          xp: currentXP,
          coins: currentCoins,
          level: newLevel
        }
        setStudent(updatedStudent)
        localStorage.setItem('kidscoddy_user', JSON.stringify(updatedStudent))

      } catch (err) {
        console.error('Error saving mission summary:', err)
      }
    }

    setSummaryData({ score, total, stars, bonusMessage: bonusMsg })
    setSavingSummary(false)
    setIsCompleted(true)

    if (score > 0) {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } })
    }
  }

  // ตัวช่วยใส่สัญลักษณ์จากปุ่มลัด
  const insertSymbol = (symbol: string) => {
    if (!currentProb) return
    const currentVal = userAnswers[currentProb.id] || ''
    setUserAnswers({
      ...userAnswers,
      [currentProb.id]: currentVal + symbol
    })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดโจทย์...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      {/* Modal สรุปผลภารกิจ (Mission Complete) */}
      {isCompleted && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-purple-100 animate-fadeIn space-y-6">
            {/* ไอคอนฉลอง */}
            <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg shadow-yellow-200 animate-bounce">
              🏆
            </div>

            <div>
              <h3 className="text-2xl font-black text-gray-800">ภารกิจสำเร็จแล้ว!</h3>
              <p className="text-sm text-gray-500 mt-1">ยอดเยี่ยมมาก! บันทึกผลคะแนนเรียบร้อยแล้ว</p>
            </div>

            {/* กล่องโชว์คะแนนรอบนี้ */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-purple-200 p-5 rounded-2xl flex items-center justify-center gap-3">
              <span className="text-3xl">✨</span>
              <div className="text-left">
                <span className="text-xs font-bold text-purple-500 block">สรุปผลงานในชุดนี้</span>
                <span className="text-2xl font-black text-indigo-700">ถูกต้อง {summaryData.score} / {summaryData.total} ข้อ</span>
              </div>
            </div>

            {/* แสดงกล่องแจ้งเตือนโบนัสพิเศษ Streak ครบ 7 วัน */}
            {summaryData.bonusMessage && (
              <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl text-amber-900 text-xs font-extrabold animate-pulse shadow-sm">
                {summaryData.bonusMessage}
              </div>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-purple-200 transition cursor-pointer"
            >
              🏠 กลับสู่หน้าแดชบอร์ดหลัก
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
          >
            ← ออกภารกิจ
          </button>
          <h1 className="font-extrabold text-gray-800 text-sm truncate max-w-[220px] md:max-w-md">
            {problemSet?.title}
          </h1>
          <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
            ข้อ {currentIndex + 1} / {problems.length}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-6">
        {/* Question Navigator (แถบเลือกข้อด้านบน) */}
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-indigo-100 mb-6 flex flex-wrap gap-2 items-center justify-center">
          <span className="text-xs font-bold text-gray-500 mr-2">เลือกข้อ:</span>
          {problems.map((prob, idx) => {
            const res = results[prob.id]
            let badgeColor = 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
            if (res?.checked) {
              badgeColor = res.isCorrect
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                : 'bg-rose-500 text-white border-rose-600 shadow-sm'
            }
            if (currentIndex === idx) {
              badgeColor += ' ring-2 ring-indigo-500 ring-offset-2'
            }

            return (
              <button
                key={prob.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-9 h-9 rounded-xl font-extrabold text-xs border flex items-center justify-center transition cursor-pointer ${badgeColor}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>

        {/* Problem Card */}
        {currentProb && (
          <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-xl border border-indigo-100 space-y-6">
            <div className="flex justify-between items-center">
              <span className="px-3.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-full">
                ข้อที่ {currentIndex + 1}
              </span>
            </div>

            {/* โจทย์คำถาม รองรับ LaTeX */}
            <div className="text-lg md:text-xl font-extrabold text-gray-800 leading-relaxed">
              {currentProb.question_text.split('$').map((part: string, i: number) =>
                i % 2 === 1 ? <InlineMath key={i} math={part} /> : <span key={i}>{part}</span>
              )}
            </div>

            {/* แป้นพิมพ์คณิตศาสตร์ลัด */}
            <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-2xl space-y-2">
              <span className="text-xs font-extrabold text-indigo-900 block mb-1">
                ⌨️ แป้นพิมพ์คณิตศาสตร์ด่วน (คลิกเพื่อพิมพ์):
              </span>

              {/* แถวตัวแปร */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] font-bold text-indigo-700 self-center mr-1">ตัวแปร:</span>
                {['x', 'y', 'z', 'a', 'b', 'c', 'n', 'π'].map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => insertSymbol(char)}
                    className="w-9 h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-200 transition cursor-pointer flex items-center justify-center font-mono"
                  >
                    {char}
                  </button>
                ))}
              </div>

              {/* แถวตัวเลข */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] font-bold text-indigo-700 self-center mr-1">ตัวเลข:</span>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => insertSymbol(num)}
                    className="w-9 h-9 bg-white hover:bg-indigo-100 text-indigo-800 font-extrabold text-xs rounded-xl border border-indigo-200 transition cursor-pointer flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* แถวเครื่องหมาย */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '+', val: '+' },
                  { label: '-', val: '-' },
                  { label: '×', val: '*' },
                  { label: '÷', val: '/' },
                  { label: '=', val: '=' },
                  { label: '≠', val: '!=' },
                  { label: '>', val: '>' },
                  { label: '<', val: '<' },
                  { label: '≥', val: '>=' },
                  { label: '≤', val: '<=' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => insertSymbol(item.val)}
                    className="px-3 h-9 bg-purple-50 hover:bg-purple-100 text-purple-800 font-extrabold text-xs rounded-xl border border-purple-200 transition cursor-pointer flex items-center justify-center"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* แถวสัญลักษณ์พิเศษ & ปุ่มลบ */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'x²', val: '^2' },
                  { label: 'xⁿ', val: '^' },
                  { label: '√x', val: 'sqrt(' },
                  { label: '(', val: '(' },
                  { label: ')', val: ')' },
                  { label: 'เศษส่วน (/)', val: '/' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => insertSymbol(item.val)}
                    className="px-3.5 h-8 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-xs rounded-xl border border-amber-200 transition cursor-pointer flex items-center justify-center"
                  >
                    {item.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    if (!currentProb) return
                    const currentVal = userAnswers[currentProb.id] || ''
                    setUserAnswers({
                      ...userAnswers,
                      [currentProb.id]: currentVal.slice(0, -1)
                    })
                  }}
                  className="px-3.5 h-8 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition cursor-pointer flex items-center justify-center ml-auto"
                >
                  ⌫ ลบตัวอักษร
                </button>
              </div>
            </div>

            {/* ฟอร์มกรอกคำตอบ */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-gray-500">คำตอบของคุณ:</label>
                <button
                  type="button"
                  onClick={() => setIsSosModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>🙋‍♂️</span> ติดโจทย์? ขอความช่วยเหลือจากคุณครู
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="พิมพ์คำตอบที่นี่..."
                  value={userAnswers[currentProb.id] || ''}
                  onChange={(e) =>
                    setUserAnswers({ ...userAnswers, [currentProb.id]: e.target.value })
                  }
                  className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-gray-800 text-base"
                />
                <button
                  onClick={handleCheckAnswer}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-md transition cursor-pointer"
                >
                  ส่งคำตอบ
                </button>
              </div>
            </div>

            {/* ผลการตรวจคำตอบ */}
            {results[currentProb.id]?.checked && (
              <div
                className={`p-4 rounded-2xl text-sm font-bold flex justify-between items-center ${
                  results[currentProb.id].isCorrect
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span>
                  {results[currentProb.id].isCorrect
                    ? '🎉 ถูกต้อง! เก่งมากครับ'
                    : '❌ ยังไม่ถูกต้อง ลองคิดดูใหม่อีกนิด!'}
                </span>
                {currentProb.solution_text && (
                  <button
                    onClick={() =>
                      setResults({
                        ...results,
                        [currentProb.id]: {
                          ...results[currentProb.id],
                          showSolution: !results[currentProb.id].showSolution,
                        },
                      })
                    }
                    className="text-xs underline cursor-pointer"
                  >
                    {results[currentProb.id].showSolution ? 'ซ่อนวิธีทำ' : 'ดูวิธีทำละเอียด'}
                  </button>
                )}
              </div>
            )}

            {/* กล่องเฉลยวิธีทำละเอียด */}
            {results[currentProb.id]?.showSolution && currentProb.solution_text && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm space-y-2">
                <span className="font-extrabold block mb-1">💡 วิธีทำละเอียด:</span>
                {currentProb.solution_text
                  .replace(/\\n/g, '\n')
                  .split('\n')
                  .map((line: string, lineIdx: number) => (
                    <div key={lineIdx}>
                      {line.includes('$') ? (
                        line.split('$').map((part: string, pIdx: number) =>
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
            )}

            {/* ปุ่มเปลี่ยนข้อซ้าย-ขวา & ปุ่มส่งงาน */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ← ข้อก่อนหน้า
              </button>

              {currentIndex < problems.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer"
                >
                  ข้อถัดไป →
                </button>
              ) : (
                <button
                  onClick={handleFinishMission}
                  disabled={savingSummary}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-lg transition cursor-pointer"
                >
                  {savingSummary ? 'กำลังบันทึก...' : '🏁 จบภารกิจ & ดูสรุปผล!'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal พิมพ์ข้อความ SOS */}
        {isSosModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-rose-100 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🙋‍♂️</span>
                <div>
                  <h3 className="font-black text-gray-800 text-base">ขอความช่วยเหลือจากคุณครู</h3>
                  <p className="text-xs text-gray-500">บอกให้คุณครูรู้หน่อยครับว่าติดปัญหาตรงไหน?</p>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs text-indigo-900 font-bold">
                📌 โจทย์ข้อนี้: {currentProb.question_text}
              </div>

              <textarea
                rows={3}
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
                placeholder="พิมพ์อธิบายปัญหา เช่น 'หนูกดลบเศษส่วนตรงวิธีทำไม่ถูกค่ะ' หรือ 'งงการแปลงตัวส่วน'..."
                className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSosModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-2xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSendSOSWithNote}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-2xl shadow-md transition cursor-pointer"
                >
                  🚨 ส่งสัญญาณ SOS
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function PracticePage({ params }: { params: Promise<{ setId: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-indigo-600">กำลังโหลด...</div>}>
      <PracticeContent params={params} />
    </Suspense>
  )
}
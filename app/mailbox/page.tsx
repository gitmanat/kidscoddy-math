'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'
import confetti from 'canvas-confetti'

export default function MailboxPage() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('kidscoddy_user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const userData = JSON.parse(storedUser)
    setStudent(userData)
    fetchMessages(userData.id)
  }, [router])

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_messages')
        .select('*')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  // กดเปิดอ่านและรับรางวัลจากจดหมาย
  const handleOpenMessage = async (msg: any) => {
    if (!msg.is_read) {
      // 1. อัปเดตสถานะว่าอ่านแล้ว
      await supabase
        .from('student_messages')
        .update({ is_read: true })
        .eq('id', msg.id)

      // 2. ถ้ามีรางวัลแนบมาด้วย ให้บวกเข้าบัญชีเด็กทันที
      if (msg.reward_coins > 0 || msg.reward_xp > 0) {
        const newCoins = (student.coins || 0) + (msg.reward_coins || 0)
        const newXP = (student.xp || 0) + (msg.reward_xp || 0)
        const newLevel = Math.floor(newXP / 50) + 1

        await supabase
          .from('users')
          .update({ coins: newCoins, xp: newXP, level: newLevel })
          .eq('id', student.id)

        const updatedStudent = { ...student, coins: newCoins, xp: newXP, level: newLevel }
        setStudent(updatedStudent)
        localStorage.setItem('kidscoddy_user', JSON.stringify(updatedStudent))

        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
      }

      // อัปเดต State หน้าจอ
      setMessages(messages.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังเปิดตู้จดหมาย...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-200">
              📬
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">ตู้จดหมายส่วนตัว</h1>
              <p className="text-xs text-amber-600 font-bold">รับข้อความและกำลังใจจากคุณครู</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
          >
            🏠 กลับหน้าหลัก
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-8 space-y-4">
        {messages.length === 0 ? (
          <div className="bg-white/90 rounded-3xl p-12 text-center border border-indigo-100 space-y-2 shadow-sm">
            <span className="text-4xl">📭</span>
            <p className="text-sm font-bold text-gray-600">ยังไม่มีจดหมายใหม่ในขณะนี้ ตั้งใจทำโจทย์แล้วรอรับเซอร์ไพรส์จากคุณครูได้เลย!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => handleOpenMessage(msg)}
              className={`bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-sm border transition cursor-pointer flex flex-col gap-3 ${
                msg.is_read ? 'border-gray-200 opacity-80' : 'border-amber-300 ring-2 ring-amber-200 shadow-md bg-amber-50/20'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{msg.is_read ? '✉️' : '💌'}</span>
                  <div>
                    <h3 className="font-black text-gray-800 text-sm">{msg.title}</h3>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.created_at).toLocaleString('th-TH')}
                    </span>
                  </div>
                </div>

                {!msg.is_read && (
                  <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full animate-bounce">
                    จดหมายใหม่! (คลิกเพื่อเปิด)
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-600 bg-white/60 p-4 rounded-2xl border border-indigo-50 leading-relaxed font-semibold">
                {msg.message}
              </p>

              {(msg.reward_coins > 0 || msg.reward_xp > 0) && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-extrabold text-gray-500">ของขวัญในจดหมาย:</span>
                  {msg.reward_coins > 0 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-xl border border-yellow-200">
                      <CoinIcon className="w-4 h-4" />
                      <span>+{msg.reward_coins} Coins</span>
                    </div>
                  )}
                  {msg.reward_xp > 0 && (
                    <div className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                      ✨ +{msg.reward_xp} XP
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  )
}
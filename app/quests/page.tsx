'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'
import { CompletedAvatarsBadge } from '@/components/AvatarDisplay'

export default function SpecialQuestsPage() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [quests, setQuests] = useState<any[]>([])
  const [completedQuests, setCompletedQuests] = useState<string[]>([])
  // เก็บรายชื่อเพื่อนที่พิชิตแต่ละภารกิจแล้ว { [questId]: any[] }
  const [questCompletionsByQuest, setQuestCompletionsByQuest] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('kidscoddy_user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const userData = JSON.parse(storedUser)
    setStudent(userData)
    fetchQuestsData(userData.id)
  }, [router])

  const fetchQuestsData = async (userId: string) => {
    try {
      // 1. ดึงรายการภารกิจพิเศษทั้งหมดที่เปิดใช้งานอยู่
      const { data: questData } = await supabase
        .from('special_quests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const loadedQuests = questData || []
      setQuests(loadedQuests)

      // 2. ดึงประวัติการทำภารกิจทั้งหมดของนักเรียนทุกคน พร้อมข้อมูลโปรไฟล์
      const { data: allQuestComps } = await supabase
        .from('quest_completions')
        .select(`
          quest_id,
          user_id,
          completed_at,
          users (
            id,
            display_name,
            avatar_url,
            equipped_outfit
          )
        `)
        .order('completed_at', { ascending: true }) // เรียงคนที่พิชิตได้ก่อนขึ้นอันดับ 1

      // 3. ดึงคะแนนจาก set_completions เพื่อมาคำนวณคอยน์รวม (คอยน์จากข้อสอบ + โบนัสเควส)
      const { data: setComps } = await supabase
        .from('set_completions')
        .select('user_id, set_id, score, total_questions')

      // สร้าง Map คะแนนของแต่ละคนในแต่ละชุด
      const scoreMap: Record<string, { score: number; total: number }> = {}
      if (setComps) {
        setComps.forEach((sc) => {
          scoreMap[`${sc.user_id}_${sc.set_id}`] = {
            score: sc.score || 0,
            total: sc.total_questions || 0,
          }
        })
      }

      // 4. จัดกลุ่มรายชื่อผู้พิชิตตาม quest_id และเช็กว่าตัวเราเองทำภารกิจไหนไปแล้วบ้าง
      const myDoneIds: string[] = []
      const groupedByQuest: Record<string, any[]> = {}

      if (allQuestComps) {
        allQuestComps.forEach((item: any) => {
          if (item.user_id === userId) {
            myDoneIds.push(item.quest_id)
          }

          if (!groupedByQuest[item.quest_id]) {
            groupedByQuest[item.quest_id] = []
          }

          const userObj = Array.isArray(item.users) ? item.users[0] : item.users
          const questObj = loadedQuests.find((q) => q.id === item.quest_id)

          if (userObj && questObj) {
            const setScoreInfo = scoreMap[`${item.user_id}_${questObj.target_set_id}`] || { score: 0, total: 0 }
            // คอยน์รวมที่ได้ = คะแนนที่ทำได้ในชุดนั้น + รางวัลคอยน์พิเศษของเควส
            const totalCoinsEarned = setScoreInfo.score + (questObj.reward_coins || 0)

            groupedByQuest[item.quest_id].push({
              ...userObj,
              coinsEarned: totalCoinsEarned,
              isPerfect: setScoreInfo.total > 0 && setScoreInfo.score === setScoreInfo.total,
            })
          }
        })

        // เรียงลำดับคนในแต่ละเควสให้คนที่ได้คอยน์เยอะสุดอยู่หน้าสุด
        Object.keys(groupedByQuest).forEach((qId) => {
          groupedByQuest[qId].sort((a, b) => b.coinsEarned - a.coinsEarned)
        })
      }

      setCompletedQuests(myDoneIds)
      setQuestCompletionsByQuest(groupedByQuest)
    } catch (err) {
      console.error('Error fetching quests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartQuest = (setId: string) => {
    router.push(`/practice/${setId}`)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังเปิดกระดานภารกิจลับ...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-rose-200">
              🎯
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">KidsCoddy Special Quests</h1>
              <p className="text-xs text-rose-600 font-bold">ภารกิจท้าทายพิเศษ รับรางวัลจัดเต็ม!</p>
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

      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-6">
        <div className="bg-gradient-to-r from-rose-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black mb-1">🔥 กระดานภารกิจท้าทายประจำวัน</h2>
            <p className="text-xs text-rose-100">พิชิตภารกิจพิเศษเพื่อกวาดเหรียญทองและค่า XP จำนวนมากไปอัปเกรดตัวละครกัน!</p>
          </div>
          <span className="text-3xl animate-bounce">⚔️</span>
        </div>

        {quests.length === 0 ? (
          <div className="bg-white/90 rounded-3xl p-12 text-center border border-indigo-100 space-y-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm font-bold text-gray-600">ยังไม่มีภารกิจพิเศษในขณะนี้ รอติดตามประกาศจากคุณครูได้เลย!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {quests.map((quest) => {
              const isDone = completedQuests.includes(quest.id)
              const finishers = questCompletionsByQuest[quest.id] || []

              return (
                <div
                  key={quest.id}
                  className={`bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-sm border flex flex-col justify-between transition group ${
                    isDone ? 'border-emerald-200 bg-emerald-50/15' : 'border-indigo-100 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-extrabold rounded-full">
                        ⭐ ภารกิจพิเศษ
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs font-bold text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-xl border border-yellow-200">
                          <CoinIcon className="w-4 h-4" />
                          <span>+{quest.reward_coins}</span>
                        </div>
                        <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                          ✨ +{quest.reward_xp} XP
                        </div>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-gray-800 pt-1">{quest.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{quest.description || 'ทำภารกิจชุดนี้ให้สำเร็จเพื่อรับรางวัลพิเศษ'}</p>
                  </div>

                  {/* 🏆 แสดงรายชื่อและอวตารของเพื่อนที่พิชิตภารกิจพิเศษนี้แล้ว */}
                  <CompletedAvatarsBadge completedUsers={finishers} />

                  <div>
                    {isDone ? (
                      <div className="w-full py-3 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-2xl text-center border border-emerald-200">
                        ✓ พิชิตภารกิจสำเร็จแล้ว
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartQuest(quest.target_set_id)}
                        className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-extrabold rounded-2xl shadow-md transition cursor-pointer"
                      >
                        🚀 ลุยภารกิจนี้เลย!
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
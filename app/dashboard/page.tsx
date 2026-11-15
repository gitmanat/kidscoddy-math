'use client'

import { AvatarDisplay } from '@/components/AvatarDisplay'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'

// ฟังก์ชันช่วยแปลงเลเวลเป็นฉายาเท่ๆ
const getLevelTitle = (level: number) => {
  if (level >= 10) return '🧙‍♂️ จอมเวทคณิตศาสตร์ขั้นสูง'
  if (level >= 5) return '⚡ อัศวินสมการผู้พิชิต'
  if (level >= 3) return '🚀 นักผจญภัยตัวเลข'
  return '🌱 นักคำนวณฝึกหัด'
}

export default function StudentDashboard() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [problemSets, setProblemSets] = useState<any[]>([])
  const [completions, setCompletions] = useState<{ [setId: string]: { stars: number; score: number; total: number } }>({})
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [sosPendingCount, setSosPendingCount] = useState(0)
  const [specialSetIds, setSpecialSetIds] = useState<string[]>([])

  // 🔍 State สำหรับระบบค้นหาและกรองหมวดหมู่
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [todayStr, setTodayStr] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // กำหนดวันที่ปัจจุบันเฉพาะฝั่ง Client ป้องกัน Error Prerender
    setTodayStr(new Date().toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem('kidscoddy_user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const userData = JSON.parse(storedUser)
    setStudent(userData)
    
    // ตั้งค่าตัวกรองเริ่มต้นตามระดับชั้นของนักเรียน (ถ้ามี)
    if (userData.group_name) {
      setSelectedGroup(userData.group_name)
    }

    fetchDashboardData(userData.id)
  }, [router])

  const fetchDashboardData = async (userId: string) => {
    try {
      // 1. ดึงข้อมูลล่าสุดของนักเรียน
      const { data: latestUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (latestUser) {
        setStudent(latestUser)
        localStorage.setItem('kidscoddy_user', JSON.stringify(latestUser))
      }

      // ดึงรหัสชุดโจทย์ที่เป็นภารกิจพิเศษ เพื่อนำมาคัดกรองไม่ให้แสดงปะปนกับแบบฝึกหัดทั่วไป
      const { data: specialQuestsData } = await supabase
        .from('special_quests')
        .select('target_set_id')
        .eq('is_active', true)

      if (specialQuestsData) {
        const ids = specialQuestsData.map(q => q.target_set_id).filter(Boolean)
        setSpecialSetIds(ids)
      }

      // 2. ดึงชุดแบบฝึกหัดทั้งหมด
      const { data: setsData } = await supabase
        .from('problem_sets')
        .select('*')
        .order('created_at', { ascending: false })

      setProblemSets(setsData || [])

      // 3. ดึงรายการข้อสอบทั้งหมดมานับจำนวนข้อจริง
      const { data: allProbs } = await supabase
        .from('problems')
        .select('id, set_id')

      const probCountMap: { [setId: string]: number } = {}
      if (allProbs) {
        allProbs.forEach((p) => {
          probCountMap[p.set_id] = (probCountMap[p.set_id] || 0) + 1
        })
      }

      // 4. ดึงข้อมูลคอมพลีตของตัวเอง
      const { data: compData } = await supabase
        .from('set_completions')
        .select('set_id, stars, score, total_questions')
        .eq('user_id', userId)

      const compMap: { [key: string]: { stars: number; score: number; total: number } } = {}

      if (setsData) {
        setsData.forEach((set) => {
          compMap[set.id] = {
            stars: 0,
            score: 0,
            total: probCountMap[set.id] || 0,
          }
        })
      }

      if (compData) {
        compData.forEach((item) => {
          if (compMap[item.set_id]) {
            compMap[item.set_id].stars = item.stars || 0
            compMap[item.set_id].score = item.score || 0
            compMap[item.set_id].total = probCountMap[item.set_id] || item.total_questions || 0
          }
        })
      }
      setCompletions(compMap)

      // 5. ดึงข้อมูล Leaderboard (รวมชิ้นส่วนอวตารทั้งหมดของเพื่อนๆ)
      const { data: allStudents } = await supabase
        .from('users')
        .select('id, display_name, group_name, xp, level, streak_days, avatar_url, avatar_frame, equipped_title, equipped_hat, equipped_glasses, equipped_bg')
        .eq('role', 'student')

      if (allStudents) {
        const rankedList = allStudents.sort((a, b) => (b.xp || 0) - (a.xp || 0))
        setLeaderboard(rankedList)
      }

      // 7. นับจำนวนเคส SOS ที่ยังค้างอยู่ (สำหรับแอดมิน)
      if (latestUser?.role === 'admin') {
        const { count: sosCount } = await supabase
          .from('student_sos_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        setSosPendingCount(sosCount || 0)
      }

      // 6. นับจำนวนจดหมายที่ยังไม่ได้เปิดอ่าน
      const { count } = await supabase
        .from('student_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false)

      setUnreadCount(count || 0)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // 🔍 กรองและจัดเรียงชุดแบบฝึกหัด (ซ่อนชุดโจทย์ที่เป็นภารกิจพิเศษไม่ให้ปะปนกับรายวัน)
  const filteredProblemSets = useMemo(() => {
    return problemSets
      .filter((set) => {
        // ❌ กรองออกถ้าชุดโจทย์นี้เป็นภารกิจพิเศษ (เพื่อให้ไปทำที่หน้ากระดานภารกิจพิเศษแทน)
        if (specialSetIds.includes(set.id)) return false

        const setGroup = set.target_group || set.grade_level || 'ทั่วไป'
        const matchesSearch =
          set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (set.description && set.description.toLowerCase().includes(searchQuery.toLowerCase()))
        
        const matchesGroup =
          selectedGroup === 'all' || setGroup === selectedGroup || setGroup === 'ทั่วไป'

        return matchesSearch && matchesGroup
      })
      .sort((a, b) => {
        const aDate = a.target_date || a.created_at?.split('T')[0] || ''
        const bDate = b.target_date || b.created_at?.split('T')[0] || ''

        const aIsToday = todayStr && aDate === todayStr ? 1 : 0
        const bIsToday = todayStr && bDate === todayStr ? 1 : 0

        if (aIsToday !== bIsToday) {
          return bIsToday - aIsToday
        }

        const aComp = completions[a.id]?.score || 0
        const bComp = completions[b.id]?.score || 0
        const aIsDone = aComp > 0 ? 1 : 0
        const bIsDone = bComp > 0 ? 1 : 0

        if (aIsDone !== bIsDone) {
          return aIsDone - bIsDone 
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [problemSets, specialSetIds, searchQuery, selectedGroup, completions, todayStr])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังโหลดภารกิจของคุณ...</div>
  }

  const currentXP = student?.xp || 0
  const currentLevel = student?.level || 1
  const xpInThisLevel = currentXP % 50
  const xpPercentage = (xpInThisLevel / 50) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-200">
              KC
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">KidsCoddy Math</h1>
              <p className="text-xs text-indigo-600 font-bold">ยินดีต้อนรับ, {student?.display_name} ({student?.group_name})</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {student?.role === 'admin' && (
              <>
                <button
                  onClick={() => router.push('/admin/exercises')}
                  className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  ⚙️ จัดการข้อสอบ
                </button>
                <button
                  onClick={() => router.push('/admin/quests')}
                  className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  🎯 จัดการเควส
                </button>
                <button
                  onClick={() => router.push('/admin/messages')}
                  className="px-3.5 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  ✉️ ส่งจดหมาย
                </button>

                {/* 🚨 ปุ่มจัดการ SOS (จะกระพริบและแสดงตัวเลขเฉพาะตอนมีเด็กส่ง SOS ค้างอยู่) */}
                <button
                  onClick={() => router.push('/admin/sos')}
                  className={`relative px-3.5 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5 ${
                    sosPendingCount > 0
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span>🚨</span>
                  <span>จัดการ SOS</span>
                  {sosPendingCount > 0 && (
                    <span className="w-5 h-5 bg-white text-rose-600 text-[10px] font-black rounded-full flex items-center justify-center shadow">
                      {sosPendingCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* 🎯 ปุ่มทางลัดไปกระดานภารกิจพิเศษบน Header */}
            <button
              onClick={() => router.push('/quests')}
              className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>🎯</span>
              <span className="hidden sm:inline">ภารกิจพิเศษ</span>
            </button>

            <button
              onClick={() => router.push('/mailbox')}
              className="relative px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <span>📬</span>
              <span className="hidden sm:inline">จดหมาย</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => router.push('/shop')}
              className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              🛒 ร้านค้าไอเทม
            </button>

            {/* 🎨 ปุ่มทางลัดไปหน้าโปรไฟล์และแต่งตัวละคร */}
            <button
              onClick={() => router.push('/profile')}
              className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>🎨</span>
              <span className="hidden sm:inline">โปรไฟล์ & แต่งตัว</span>
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('kidscoddy_user')
                router.push('/login')
              }}
              className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-8 space-y-8">
        
        {/* =====================================================================
            ส่วนที่ 1: Gamification Profile Card (Level, Streak, Coins, XP)
            ===================================================================== */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-visible">
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12" />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            
            {/* 🎨 แสดง AvatarDisplay แบบครบทุกเลเยอร์ พร้อมคลิกไปหน้าแต่งตัว */}
            <div className="flex items-center gap-5 pt-2">
              <AvatarDisplay
                user={student}
                size="md"
                onClick={() => router.push('/profile')}
              />

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold">
                    ⭐ Level {currentLevel}
                  </span>
                  <span className="text-xs font-bold text-purple-200">
                    {student?.equipped_title || getLevelTitle(currentLevel)}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black">
                  สู้ๆ นะครับ, {student?.display_name}! 🚀
                </h2>
                <p className="text-xs text-purple-100">
                  สะสม XP เลเวลอัป และเก็บ Coins ไปแลกรางวัลจริงกัน! (คลิกที่ตัวละครเพื่อแต่งตัว)
                </p>
              </div>
            </div>

            {/* สถิติ Streak, Coins, XP */}
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              {/* Streak */}
              <div className="bg-white/15 backdrop-blur-md border border-white/25 px-3 py-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-xl animate-pulse">🔥</span>
                <span className="text-[10px] uppercase tracking-wider text-amber-200 font-extrabold mt-0.5">Streak</span>
                <span className="text-sm font-black">{student?.streak_days || 0} วัน</span>
              </div>

              {/* Coins */}
              <div className="bg-white/15 backdrop-blur-md border border-white/25 px-3 py-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                <CoinIcon className="w-6 h-6 shrink-0 drop-shadow" />
                <span className="text-[10px] uppercase tracking-wider text-yellow-200 font-extrabold mt-0.5">เหรียญ</span>
                <span className="text-sm font-black">{student?.coins || 0}</span>
              </div>

              {/* XP */}
              <div className="bg-white/15 backdrop-blur-md border border-white/25 px-3 py-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-xl">✨</span>
                <span className="text-[10px] uppercase tracking-wider text-purple-200 font-extrabold mt-0.5">XP</span>
                <span className="text-sm font-black">{currentXP}</span>
              </div>
            </div>
          </div>

          {/* หลอดพลัง XP Progress Bar */}
          <div className="mt-6 pt-4 border-t border-white/20 relative z-10">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span>หลอดเลเวล {currentLevel} (XP สะสมในเลเวลนี้)</span>
              <span>{xpInThisLevel} / 50 XP</span>
            </div>
            <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden p-0.5 backdrop-blur-xs">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(xpPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* =====================================================================
            ส่วนเสริม: ทางลัดสู่กระดานภารกิจพิเศษ (Special Quests Banner)
            ===================================================================== */}
        <div 
          onClick={() => router.push('/quests')}
          className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl cursor-pointer hover:scale-[1.01] transition transform flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12 pointer-events-none" />
          
          <div className="flex items-center space-x-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner shrink-0">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-yellow-300 text-yellow-900 text-[10px] font-black rounded-full">
                  ⭐ ท้าทายพิเศษ
                </span>
                <span className="text-xs text-rose-100 font-bold">รับ Coins & XP จัดเต็ม!</span>
              </div>
              <h3 className="text-lg md:text-xl font-black mt-1">กระดานภารกิจพิเศษ & ของรางวัล</h3>
              <p className="text-xs text-rose-100">คลิกเพื่อดูโจทย์ท้าทายประจำวันและกวาดรางวัลพิเศษกันเถอะ!</p>
            </div>
          </div>

          <div className="px-6 py-3 bg-white text-rose-600 font-black text-xs rounded-2xl shadow-md hover:bg-rose-50 transition relative z-10 shrink-0">
            ลุยภารกิจเลย →
          </div>
        </div>

        {/* =====================================================================
            ส่วนที่ 2: ภารกิจฝึกฝนคณิตศาสตร์ (เรียงวันปัจจุบันขึ้นก่อน + กรองชั้นเรียน)
            ===================================================================== */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-gray-800">🎯 ภารกิจฝึกฝนคณิตศาสตร์ประจำวัน</h2>
              <p className="text-sm text-gray-500">แบบฝึกหัดของวันนี้จะแสดงอยู่ด้านบนสุด เพื่อให้เด็กๆ ลุยทำภารกิจรักษา Streak ได้ทันที!</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
              พบทั้งหมด {filteredProblemSets.length} ชุด
            </span>
          </div>

          {/* 🔍 แถบค้นหาและตัวกรองหมวดหมู่ */}
          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-3xl shadow-sm border border-indigo-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <input
              type="text"
              placeholder="🔍 ค้นหาชื่อบทเรียน หรือคำอธิบาย..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-80 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
              {['all', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'].map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    selectedGroup === group
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {group === 'all' ? 'ทุกระดับชั้น' : group}
                </button>
              ))}
            </div>
          </div>

          {filteredProblemSets.length === 0 ? (
            <div className="bg-white/85 rounded-3xl p-12 text-center border border-indigo-100 shadow-sm space-y-2">
              <span className="text-3xl">🔍</span>
              <p className="text-gray-600 font-bold">ไม่พบชุดแบบฝึกหัดที่คุณค้นหา</p>
              <p className="text-xs text-gray-400">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่ระดับชั้นอื่นดูครับ</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredProblemSets.map((set) => {
                const comp = completions[set.id] || { stars: 0, score: 0, total: 0 }
                const isFinished = comp.score > 0

                return (
                  <div
                    key={set.id}
                    className={`bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-md border transition-all flex flex-col justify-between group relative overflow-hidden ${
                      isFinished ? 'border-emerald-200 bg-emerald-50/20' : 'border-indigo-100 hover:shadow-xl'
                    }`}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${isFinished ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} />

                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-3.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full">
                          {set.target_group || 'ทั่วไป'}
                        </span>

                        {/* แสดงผล XP และสถานะการทำ */}
                        <div className={`flex flex-col items-end px-3.5 py-1.5 rounded-2xl border ${isFinished ? 'bg-emerald-50 border-emerald-200' : 'bg-purple-50 border-purple-200'}`}>
                          <div className={`flex items-center gap-1 font-black text-sm ${isFinished ? 'text-emerald-700' : 'text-purple-700'}`}>
                            <span>✨</span>
                            <span>{comp.score || 0} / {comp.total} XP</span>
                          </div>
                          <span className={`text-[10px] font-extrabold mt-0.5 ${isFinished ? 'text-emerald-600' : 'text-purple-400'}`}>
                            {isFinished ? '✓ พิชิตภารกิจแล้ว' : '⏳ รอทำภารกิจ'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-gray-800 mb-2 group-hover:text-indigo-600 transition">
                        {set.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-6 line-clamp-2">
                        {set.description || 'ไม่มีคำอธิบายสำหรับชุดโจทย์นี้'}
                      </p>
                    </div>

                    <button
                      onClick={() => router.push(`/practice/${set.id}`)}
                      className={`w-full py-3.5 font-extrabold rounded-2xl shadow-lg transition transform active:scale-95 cursor-pointer text-center ${
                        isFinished
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-200'
                      }`}
                    >
                      {isFinished ? '🔄 ทบทวน / ทำใหม่อีกรอบ' : '🚀 เริ่มลุยภารกิจวันนี้!'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* =====================================================================
            ส่วนที่ 3: กระดานผู้นำ (Leaderboard)
            ===================================================================== */}
        <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-md border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-gray-800">🏆 กระดานผู้นำ XP และเลเวล</h3>
              <p className="text-xs text-gray-500">จัดอันดับตามคะแนนประสบการณ์ (XP) สะสมของนักผจญภัยทุกคน</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
              ✨ แรงก์ห้องเรียน
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">ยังไม่มีข้อมูลสถิติเพื่อนในระบบ</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((item, index) => {
                const isMe = item.id === student?.id
                
                let rankBadge = 'bg-gray-100 text-gray-600'
                if (index === 0) rankBadge = 'bg-amber-400 text-white shadow-md font-black'
                else if (index === 1) rankBadge = 'bg-slate-300 text-white font-black'
                else if (index === 2) rankBadge = 'bg-amber-700 text-white font-black'

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                      isMe ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-200 shadow-sm' : 'bg-gray-50/50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${rankBadge}`}>
                        {index + 1}
                      </div>

                      {/* 🏆 แสดงตัวละครของเพื่อนๆ ครบทุกชิ้นส่วน */}
                      <AvatarDisplay user={item} size="sm" showLevel={true} />

                      <div>
                        <h4 className="font-extrabold text-gray-800 text-sm flex items-center gap-2">
                          {item.display_name}
                          {isMe && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">คุณ</span>}
                        </h4>
                        <p className="text-xs text-purple-600 font-bold">
                          {item.equipped_title || '🌱 นักคำนวณฝึกหัด'} • <span className="text-gray-400">{item.group_name || 'ทั่วไป'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                        <span>🔥</span>
                        <span>{item.streak_days || 0} วัน</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-base">✨</span>
                        <span className="text-sm font-black text-indigo-600">{item.xp || 0} XP</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
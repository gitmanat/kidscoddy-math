'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'
import { AvatarDisplay } from '@/components/AvatarDisplay'

type SlotCategory = 'avatar' | 'outfit' | 'pants' | 'shoes' | 'hat' | 'glasses' | 'bg' | 'frame' | 'title'

export default function ProfileStudioPage() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<SlotCategory>('outfit')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('kidscoddy_user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const userData = JSON.parse(storedUser)
    setStudent(userData)
    fetchProfileData(userData.id)
  }, [router])

  const fetchProfileData = async (userId: string) => {
    try {
      const { data: userLatest } = await supabase.from('users').select('*').eq('id', userId).single()
      if (userLatest) {
        setStudent(userLatest)
        localStorage.setItem('kidscoddy_user', JSON.stringify(userLatest))
      }

      const { data: invData } = await supabase.from('user_inventory').select('item_key').eq('user_id', userId)
      if (invData && invData.length > 0) {
        const keys = invData.map((i) => i.item_key)
        const { data: shopData } = await supabase.from('shop_items').select('*').in('item_key', keys)
        setInventoryItems(shopData || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // สวมใส่ หรือ ถอดไอเทมออกตามหมวดหมู่ชิ้นส่วน
  const handleToggleEquip = async (slotType: SlotCategory, value: string | null) => {
    try {
      let updateData: any = {}
      if (slotType === 'avatar') updateData.avatar_url = value
      else if (slotType === 'outfit') updateData.equipped_outfit = value
      else if (slotType === 'pants') updateData.equipped_pants = value
      else if (slotType === 'shoes') updateData.equipped_shoes = value
      else if (slotType === 'hat') updateData.equipped_hat = value
      else if (slotType === 'glasses') updateData.equipped_glasses = value
      else if (slotType === 'bg') updateData.equipped_bg = value
      else if (slotType === 'frame') updateData.avatar_frame = value
      else if (slotType === 'title') updateData.equipped_title = value

      const { error } = await supabase.from('users').update(updateData).eq('id', student.id)
      if (error) throw error

      const updatedUser = { ...student, ...updateData }
      setStudent(updatedUser)
      localStorage.setItem('kidscoddy_user', JSON.stringify(updatedUser))
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังเปิดตู้เสื้อผ้าเวทมนตร์...</div>
  }

  // 8 หมวดหมู่ชิ้นส่วนหลัก + ฉายา
  const slotTabs: { key: SlotCategory; label: string; icon: string }[] = [
    { key: 'outfit', label: 'เสื้อผ้าหลัก', icon: '👕' },
    { key: 'pants', label: 'กางเกง', icon: '👖' },
    { key: 'shoes', label: 'รองเท้า', icon: '👟' },
    { key: 'hat', label: 'หมวก/หัว', icon: '👑' },
    { key: 'glasses', label: 'แว่นตา', icon: '🕶️' },
    { key: 'bg', label: 'พื้นหลัง', icon: '🌌' },
    { key: 'frame', label: 'กรอบออร่า', icon: '🖼️' },
    { key: 'title', label: 'ฉายา', icon: '🏷️' },
    { key: 'avatar', label: 'ฐานอวตาร', icon: '🤖' },
  ]

  const currentTabItems = inventoryItems.filter((item) => item.item_type === activeTab)

  // ตรวจสอบว่าไอเทมชิ้นนี้สวมใส่อยู่หรือไม่
  const checkIsEquipped = (item: any) => {
    if (item.item_type === 'avatar') return student?.avatar_url === item.image_url
    if (item.item_type === 'outfit') return student?.equipped_outfit === item.image_url
    if (item.item_type === 'pants') return student?.equipped_pants === item.image_url
    if (item.item_type === 'shoes') return student?.equipped_shoes === item.image_url
    if (item.item_type === 'hat') return student?.equipped_hat === item.image_url
    if (item.item_type === 'glasses') return student?.equipped_glasses === item.image_url
    if (item.item_type === 'bg') return student?.equipped_bg === item.image_url
    if (item.item_type === 'frame') return student?.avatar_frame === item.item_key
    if (item.item_type === 'title') return student?.equipped_title === item.item_name
    return false
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center font-black text-lg shadow-md">
              🎨
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">Roblox-Style Avatar Studio</h1>
              <p className="text-xs text-purple-600 font-bold">ห้องแต่งตัวละครแบบละเอียดทุกชิ้นส่วน</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/shop')}
              className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              🛒 ไปช้อปเพิ่ม
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

      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-6">
        {/* เวทีโชว์ตัวละคร Live Preview (Roblox Style) */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-visible">
          <div className="flex flex-col md:flex-row items-center gap-6 z-10">
            <div className="pt-4">
              <AvatarDisplay user={student} size="xl" />
            </div>

            <div className="text-center md:text-left space-y-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold">
                {student?.equipped_title || '🌱 นักคำนวณฝึกหัด'}
              </span>
              <h2 className="text-2xl md:text-3xl font-black">{student?.display_name}</h2>
              <p className="text-xs text-purple-100">
                ระดับชั้น: {student?.group_name || 'ทั่วไป'} • สะสม XP: {student?.xp || 0}
              </p>

              <div className="flex items-center justify-center md:justify-start gap-2 pt-1">
                <div className="bg-white/15 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold">
                  <CoinIcon className="w-4 h-4" />
                  <span>{student?.coins || 0} Coins</span>
                </div>
                <div className="bg-white/15 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold">
                  <span>🔥</span>
                  <span>Streak {student?.streak_days || 0} วัน</span>
                </div>
              </div>
            </div>
          </div>

          {/* สรุปชิ้นส่วนที่สวมใส่อยู่ปัจจุบัน */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl w-full md:w-64 space-y-1.5 text-xs">
            <p className="font-black text-amber-200 uppercase tracking-wider text-[10px] mb-1">สวมใส่ปัจจุบัน</p>
            <div className="flex justify-between"><span className="text-purple-100">👕 เสื้อ:</span><span className="font-bold truncate max-w-[120px]">{student?.equipped_outfit ? 'ใส่แล้ว' : 'ไม่ได้ใส่'}</span></div>
            <div className="flex justify-between"><span className="text-purple-100">👖 กางเกง:</span><span className="font-bold truncate max-w-[120px]">{student?.equipped_pants ? 'ใส่แล้ว' : 'ไม่ได้ใส่'}</span></div>
            <div className="flex justify-between"><span className="text-purple-100">👑 หมวก:</span><span className="font-bold truncate max-w-[120px]">{student?.equipped_hat || 'ไม่ได้ใส่'}</span></div>
            <div className="flex justify-between"><span className="text-purple-100">🕶️ แว่นตา:</span><span className="font-bold truncate max-w-[120px]">{student?.equipped_glasses || 'ไม่ได้ใส่'}</span></div>
            <div className="flex justify-between"><span className="text-purple-100">🖼️ กรอบ:</span><span className="font-bold truncate max-w-[120px]">{student?.avatar_frame || 'ค่าเริ่มต้น'}</span></div>
          </div>
        </div>

        {/* ตู้เสื้อผ้าเลือกเปลี่ยนชิ้นส่วน (8+ หมวดหมู่) */}
        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-md border border-indigo-100 space-y-6">
          {/* แถบเลือกหมวดหมู่ */}
          <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
            {slotTabs.map((tab) => {
              const isSelected = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* รายการไอเทมในหมวดหมู่ที่เลือก */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* การ์ดถอดออก */}
            <div
              onClick={() => handleToggleEquip(activeTab, null)}
              className="p-4 rounded-2xl border-2 border-dashed border-gray-300 hover:border-rose-400 bg-gray-50 hover:bg-rose-50/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition min-h-[140px]"
            >
              <span className="text-2xl">🚫</span>
              <span className="text-xs font-extrabold text-gray-600 text-center">ถอดชิ้นส่วนนี้</span>
              <span className="text-[10px] text-gray-400">(รีเซ็ตค่าเริ่มต้น)</span>
            </div>

            {currentTabItems.map((item) => {
              const isEquipped = checkIsEquipped(item)
              const valueToEquip =
                item.item_type === 'frame'
                  ? item.item_key
                  : item.item_type === 'title'
                  ? item.item_name
                  : item.image_url

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleEquip(activeTab, isEquipped ? null : valueToEquip)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-between gap-3 cursor-pointer transition min-h-[140px] ${
                    isEquipped
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden text-3xl">
                    {item.item_type === 'bg' ? (
                      <div className="w-full h-full" style={{ background: item.image_url }} />
                    ) : item.image_url?.startsWith('http') ? (
                      <img src={item.image_url} alt={item.item_name} className="w-full h-full object-contain" />
                    ) : (
                      <span>{item.image_url || '🏷️'}</span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-gray-800 text-center line-clamp-1">{item.item_name}</span>

                  <span
                    className={`w-full py-1 rounded-xl text-[10px] font-black text-center ${
                      isEquipped ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {isEquipped ? '✓ สวมใส่อยู่ (คลิกถอด)' : 'คลิกเพื่อสวมใส่'}
                  </span>
                </div>
              )
            })}
          </div>

          {currentTabItems.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-gray-500 font-bold">คุณยังไม่มีไอเทมในหมวดหมู่นี้เลยครับ</p>
              <button
                onClick={() => router.push('/shop')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow cursor-pointer"
              >
                🛒 ไปเลือกซื้อที่ร้านค้าไอเทม
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
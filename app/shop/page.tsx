'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'

export default function ShopPage() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [myInventory, setMyInventory] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('kidscoddy_user')
    if (!storedUser) {
      router.push('/login')
      return
    }
    const userData = JSON.parse(storedUser)
    setStudent(userData)
    fetchShopData(userData.id)
  }, [router])

  const fetchShopData = async (userId: string) => {
    try {
      const { data: userLatest } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (userLatest) setStudent(userLatest)

      const { data: shopData } = await supabase
        .from('shop_items')
        .select('*')
        .order('price_coins', { ascending: true })
      setItems(shopData || [])

      const { data: invData } = await supabase
        .from('user_inventory')
        .select('item_key')
        .eq('user_id', userId)

      setMyInventory(invData ? invData.map((i) => i.item_key) : [])
    } catch (err) {
      console.error('Error fetching shop:', err)
    } finally {
      setLoading(false)
    }
  }

  // ซื้อไอเทม
  const handleBuyItem = async (item: any) => {
    if ((student.coins || 0) < item.price_coins) {
      alert('❌ เหรียญทองไม่พอ! ไปลุยทำแบบฝึกหัดเพิ่มเพื่อเก็บเหรียญกันเถอะ!')
      return
    }

    if (!confirm(`คุณต้องการซื้อ "${item.item_name}" ในราคา ${item.price_coins} Coins ใช่หรือไม่?`)) return

    try {
      const newCoins = student.coins - item.price_coins

      const { error: updateErr } = await supabase
        .from('users')
        .update({ coins: newCoins })
        .eq('id', student.id)

      if (updateErr) throw updateErr

      const { error: invErr } = await supabase.from('user_inventory').insert({
        user_id: student.id,
        item_key: item.item_key,
      })

      if (invErr) throw invErr

      alert(`🎉 เย้! ซื้อ "${item.item_name}" สำเร็จแล้ว! กดปุ่ม "สวมใส่" เพื่อใช้งานได้เลย`)
      
      const updatedUser = { ...student, coins: newCoins }
      setStudent(updatedUser)
      localStorage.setItem('kidscoddy_user', JSON.stringify(updatedUser))
      setMyInventory([...myInventory, item.item_key])
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  // สวมใส่ไอเทม (อวตาร, กรอบ, หรือฉายา)
  const handleEquipItem = async (item: any) => {
    try {
      let updateData: any = {}
      if (item.item_type === 'avatar') {
        updateData.avatar_url = item.image_url
      } else if (item.item_type === 'frame') {
        updateData.avatar_frame = item.item_key
      } else if (item.item_type === 'title') {
        updateData.equipped_title = item.item_name
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', student.id)

      if (error) throw error

      alert(`✨ สวมใส่ "${item.item_name}" เรียบร้อยแล้ว!`)
      const updatedUser = { ...student, ...updateData }
      setStudent(updatedUser)
      localStorage.setItem('kidscoddy_user', JSON.stringify(updatedUser))
    } catch (err: any) {
      alert('สวมใส่ไม่สำเร็จ: ' + err.message)
    }
  }

  // ฟังก์ชันช่วยแสดงตัวอย่างไอคอนสินค้าในร้าน
  const renderItemPreview = (item: any) => {
    if (item.item_type === 'avatar' && item.image_url) {
      return (
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 overflow-hidden shrink-0 p-1">
          <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover" />
        </div>
      )
    }

    if (item.item_type === 'frame') {
      let frameClass = 'border-2 border-gray-300'
      let icon = '🖼️'
      if (item.item_key === 'frame_fire') {
        frameClass = 'border-3 border-orange-500 shadow-md shadow-orange-200 ring-2 ring-orange-300'
        icon = '🔥'
      } else if (item.item_key === 'frame_gold') {
        frameClass = 'border-3 border-yellow-400 shadow-md shadow-yellow-200 ring-2 ring-yellow-300'
        icon = '👑'
      } else if (item.item_key === 'frame_diamond') {
        frameClass = 'border-3 border-cyan-400 shadow-md shadow-cyan-200 ring-2 ring-cyan-300'
        icon = '💎'
      }
      return (
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-2xl shrink-0 ${frameClass}`}>
          {icon}
        </div>
      )
    }

    return (
      <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-2xl shrink-0">
        🏷️
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังเปิดประตูเข้าร้านค้าเวทมนตร์...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-black text-lg shadow-md shadow-amber-200">
              🛒
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">KidsCoddy Magic Shop</h1>
              <p className="text-xs text-amber-600 font-bold">ร้านค้าแลกอวตาร กรอบ และฉายาเท่ๆ</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 px-3.5 py-1.5 rounded-2xl shadow-xs">
              <CoinIcon className="w-5 h-5 shrink-0" />
              <span className="text-sm font-black text-yellow-700">{student?.coins || 0} Coins</span>
            </div>

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
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black mb-1">🎁 เลือกซื้ออวตารและไอเทมโปรดของคุณ!</h2>
            <p className="text-xs text-purple-100">ใช้เหรียญทองจากการทำแบบฝึกหัดมาแต่งตัวละครให้เท่ไม่ซ้ำใครกันเลย!</p>
          </div>
          <span className="text-3xl animate-bounce">🛍️</span>
        </div>

        {/* รายการสินค้าในร้าน */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const isOwned = myInventory.includes(item.item_key)

            // ✅ แก้ไขบั๊ก: เช็กสถานะสวมใส่แยกตามประเภทสินค้าอย่างถูกต้อง
            let isEquipped = false
            if (item.item_type === 'avatar') {
              isEquipped = Boolean(student?.avatar_url && student.avatar_url === item.image_url)
            } else if (item.item_type === 'frame') {
              isEquipped = Boolean(student?.avatar_frame && student.avatar_frame === item.item_key)
            } else if (item.item_type === 'title') {
              isEquipped = Boolean(student?.equipped_title && student.equipped_title === item.item_name)
            }

            return (
              <div
                key={item.id}
                className="bg-white/95 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-indigo-100 flex justify-between items-center gap-4 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  {renderItemPreview(item)}

                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded-full">
                      {item.item_type === 'avatar' ? '🤖 อวตารตัวละคร' : item.item_type === 'frame' ? '🖼️ กรอบอวตาร' : '🏷️ ฉายาพิเศษ'}
                    </span>
                    <h3 className="text-sm font-black text-gray-800">{item.item_name}</h3>
                    <div className="flex items-center gap-1 text-xs font-bold text-yellow-600">
                      <CoinIcon className="w-4 h-4" />
                      <span>{item.price_coins} Coins</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isEquipped ? (
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-2xl">
                      ✓ สวมใส่อยู่
                    </span>
                  ) : isOwned ? (
                    <button
                      onClick={() => handleEquipItem(item)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-2xl shadow transition cursor-pointer"
                    >
                      ✨ สวมใส่
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyItem(item)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-xs font-extrabold rounded-2xl shadow transition cursor-pointer"
                    >
                      🛒 ซื้อเลย
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
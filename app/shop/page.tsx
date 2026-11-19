'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CharacterStage } from '@/components/AvatarDisplay'
import {
  type AvatarConfig,
  type Rarity,
  type Slot,
  RARITY_META,
  SLOT_META,
  rarityOf,
  readAvatarConfig,
  withOverride,
} from '@/lib/avatar'

export default function ShopPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [buyingKey, setBuyingKey] = useState('')
  const [toast, setToast] = useState('')

  const [items, setItems] = useState<any[]>([])
  const [ownedKeys, setOwnedKeys] = useState<Set<string>>(new Set())

  const [selectedSlot, setSelectedSlot] = useState<'ALL' | Slot>('ALL')
  const [selectedRarity, setSelectedRarity] = useState<'ALL' | Rarity>('ALL')
  const [search, setSearch] = useState('')

  const [baseConfig, setBaseConfig] = useState<AvatarConfig>({ v: 2, mode: 'doll', base: {}, equip: {} })
  const [previewItem, setPreviewItem] = useState<any | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  useEffect(() => {
    const raw = localStorage.getItem('kidscoddy_user')
    if (!raw) {
      router.push('/login')
      return
    }
    const localUser = JSON.parse(raw)
    loadShop(localUser.id)
  }, [router])

  const loadShop = async (userId: string) => {
    setLoading(true)
    try {
      const [{ data: uData, error: uErr }, { data: shopData }, { data: invData }] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase
          .from('shop_items')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase.from('user_inventory').select('item_key').eq('user_id', userId),
      ])

      if (uErr || !uData) throw uErr || new Error('ไม่พบข้อมูลผู้ใช้')
      setUser(uData)
      localStorage.setItem('kidscoddy_user', JSON.stringify(uData))
      setBaseConfig(readAvatarConfig(uData))

      setItems(shopData || [])
      const owned = new Set<string>((invData || []).map((r: any) => r.item_key))
      ;(shopData || []).forEach((it: any) => {
        if (Number(it.price_coins) === 0) owned.add(it.item_key)
      })
      setOwnedKeys(owned)
    } catch (err) {
      console.error('Shop load error:', err)
      showToast('โหลดร้านค้าไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const stageConfig = useMemo(() => {
    if (!previewItem) return baseConfig
    return withOverride(baseConfig, previewItem.item_type as Slot, {
      key: previewItem.item_key,
      name: previewItem.item_name,
      d: previewItem.design,
    })
  }, [baseConfig, previewItem])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (selectedSlot !== 'ALL' && it.item_type !== selectedSlot) return false
      if (selectedRarity !== 'ALL' && rarityOf(it.rarity) !== selectedRarity) return false
      if (q && !String(it.item_name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [items, selectedSlot, selectedRarity, search])

  const handleBuy = async (item: any) => {
    if (!user || buyingKey) return
    if (ownedKeys.has(item.item_key)) return
    if ((user.coins || 0) < item.price_coins) {
      showToast('🪙 คอยน์ยังไม่พอ ลองทำแบบฝึกหัดเพิ่มนะ!')
      return
    }

    setBuyingKey(item.item_key)
    try {
      const { data, error } = await supabase.rpc('buy_shop_item', {
        p_user_id: user.id,
        p_item_key: item.item_key,
      })
      if (error) throw error
      if (!data?.ok) {
        if (data?.error === 'not_enough_coins') showToast('🪙 คอยน์ไม่พอครับ')
        else if (data?.error === 'already_owned') showToast('มีไอเทมนี้แล้วครับ')
        else showToast('ซื้อไม่สำเร็จ: ' + data?.error)
        return
      }

      const updatedUser = { ...user, coins: data.coins }
      setUser(updatedUser)
      localStorage.setItem('kidscoddy_user', JSON.stringify(updatedUser))
      setOwnedKeys((prev) => new Set([...prev, item.item_key]))
      setPreviewItem(item)
      showToast(`🎉 ซื้อ "${item.item_name}" สำเร็จ! กดไปห้องแต่งตัวเพื่อสวมใส่ได้เลย`)
    } catch (err: any) {
      console.error('Buy error:', err)
      showToast('❌ เกิดข้อผิดพลาดในการซื้อ')
    } finally {
      setBuyingKey('')
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังเปิดร้านค้า...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 pb-12">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900/90 text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-extrabold backdrop-blur">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-amber-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-xl shadow-md">
              🛍️
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">ร้านค้าไอเทมแต่งตัว</h1>
              <p className="text-xs text-amber-700 font-bold">กด "ลองใส่" เพื่อดูตัวอย่างบนตัวละครก่อนซื้อได้ฟรี!</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-4 py-2 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black">
              🪙 คอยน์ของฉัน: {(user.coins || 0).toLocaleString()}
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              🎨 โปรไฟล์ & แต่งตัว
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

      <main className="max-w-6xl mx-auto px-6 mt-6 grid lg:grid-cols-12 gap-6 items-start">
        {/* ฝั่งซ้าย: เวทีลองชุด */}
        <div className="lg:col-span-4 bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-md border border-amber-100 flex flex-col items-center space-y-4 lg:sticky lg:top-24">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-black text-gray-700">✨ ห้องลองชุด (Preview)</span>
            {previewItem && (
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="text-[11px] font-extrabold text-rose-600 hover:underline cursor-pointer"
              >
                รีเซ็ตชุดเดิม
              </button>
            )}
          </div>

          <CharacterStage config={stageConfig} className="w-56 sm:w-64" animate={true} />

          {previewItem ? (
            <div className="w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
              <div className="text-xs font-black text-gray-800">กำลังลอง: {previewItem.item_name}</div>
              {ownedKeys.has(previewItem.item_key) ? (
                <button
                  type="button"
                  onClick={() => router.push('/profile')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  ✓ มีชิ้นนี้แล้ว (ไปสวมใส่ในห้องแต่งตัว)
                </button>
              ) : (
                <button
                  type="button"
                  disabled={buyingKey === previewItem.item_key || (user.coins || 0) < previewItem.price_coins}
                  onClick={() => handleBuy(previewItem)}
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer"
                >
                  {buyingKey === previewItem.item_key
                    ? '⏳ กำลังซื้อ...'
                    : `🛒 ซื้อเลย (${previewItem.price_coins} 🪙)`}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center">คลิกที่การ์ดสินค้าทางขวาเพื่อลองสวมใส่</p>
          )}
        </div>

        {/* ฝั่งขวา: รายการสินค้า */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-3xl shadow-sm border border-amber-100 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSlot('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                  selectedSlot === 'ALL' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ทั้งหมด ({items.length})
              </button>
              {SLOT_META.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedSlot(s.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                    selectedSlot === s.key ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="🔍 ค้นหาชื่อไอเทม..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[12rem] px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-400"
              />
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-extrabold text-gray-700 cursor-pointer"
              >
                <option value="ALL">ความหายาก: ทุกระดับ</option>
                <option value="common">★ ธรรมดา</option>
                <option value="rare">★★ หายาก</option>
                <option value="epic">★★★ อีพิค</option>
                <option value="legendary">★★★★ ในตำนาน</option>
              </select>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white/95 p-10 rounded-3xl text-center text-sm text-gray-400 font-bold">
              ไม่พบไอเทมในหมวดนี้
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredItems.map((item) => {
                const owned = ownedKeys.has(item.item_key)
                const isPreviewing = previewItem?.item_key === item.item_key
                const r = RARITY_META[rarityOf(item.rarity)]
                const slotMeta = SLOT_META.find((s) => s.key === item.item_type)
                const canAfford = (user.coins || 0) >= item.price_coins

                return (
                  <div
                    key={item.item_key}
                    onClick={() => setPreviewItem(item)}
                    className={`p-4 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between gap-3 bg-gradient-to-b ${r.bg} ${
                      isPreviewing
                        ? 'border-amber-500 ring-2 ring-amber-200 scale-[1.02]'
                        : `${r.border} hover:shadow-md`
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] font-black ${r.text}`}>
                          {'★'.repeat(r.stars)} {r.label}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">
                          {slotMeta?.icon} {slotMeta?.label}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-xs sm:text-sm text-gray-800 line-clamp-2 leading-snug">
                        {item.item_name}
                      </h3>

                      <div className="flex items-center gap-1.5 pt-1">
                        {(item.design?.colors || []).slice(0, 3).map((c: string, i: number) => (
                          <span
                            key={i}
                            className="w-4 h-4 rounded-full border border-black/15"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        {item.design?.css && (
                          <span
                            className="w-12 h-4 rounded-full border border-black/15"
                            style={{ background: item.design.css }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-black/5 flex items-center justify-between gap-1.5">
                      {owned ? (
                        <span className="w-full py-1.5 text-center rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black">
                          ✓ มีแล้ว
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford || buyingKey === item.item_key}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleBuy(item)
                          }}
                          className={`w-full py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {buyingKey === item.item_key ? '⏳...' : `🪙 ${item.price_coins}`}
                        </button>
                      )}
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
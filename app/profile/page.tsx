'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoinIcon } from '@/components/CoinIcon'
import { CharacterStage } from '@/components/AvatarDisplay'
//import { POSE_PRESETS, type PosePresetKey } from '@/components/Character'
import {
  type AgeStyle,
  type AvatarConfig,
  type BuildStyle,
  type EyeStyle,
  type HairStyle,
  type MouthStyle,
  type Slot,
  AGE_STYLES,
  BUILD_STYLES,
  CHINESE_COLORS,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  RARITY_META,
  SKIN_TONES,
  SLOT_META,
  clearColorOverride,
  effectiveDesign,
  SHAPE_OPTIONS,
  rarityOf,
  readAvatarConfig,
  resolveBase,
  setColorOverride,
  titleOf,
} from '@/lib/avatar'
import { detectSet, slotLabel } from '@/lib/avatarSets'
import { poseForWeapon } from '@/components/avatar/weaponPoses'
import {
  DEFAULT_FREE_POSE,
  PART_META,
  POSE_PRESETS,
  resolveFreePose,
  type FreePoseConfig,
  type PartTransform,
  type PosePresetKey,
} from '@/components/Character'

type Preset = { name: string; keys: Partial<Record<Slot, string>> }

export default function ProfileStudioPage() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [shopItems, setShopItems] = useState<any[]>([])
  const [ownedKeys, setOwnedKeys] = useState<Set<string>>(new Set())

  const [draft, setDraft] = useState<AvatarConfig>({ v: 2, mode: 'doll', base: {}, equip: {} })
  const [presets, setPresets] = useState<Preset[]>([])
  const [activeTab, setActiveTab] = useState<'face' | Slot>('face')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

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
      const [{ data: userLatest }, { data: allItems }, { data: invData }] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('shop_items').select('*').order('sort_order', { ascending: true }),
        supabase.from('user_inventory').select('item_key').eq('user_id', userId),
      ])

      if (userLatest) {
        setStudent(userLatest)
        localStorage.setItem('kidscoddy_user', JSON.stringify(userLatest))
        const cfg = readAvatarConfig(userLatest)
        setDraft(cfg)
        setPresets(Array.isArray((cfg as any).presets) ? (cfg as any).presets : [])
      }

      setShopItems(allItems || [])
      const owned = new Set<string>((invData || []).map((i: any) => i.item_key))
      ;(allItems || []).forEach((it: any) => {
        if (Number(it.price_coins) === 0) owned.add(it.item_key)
      })
      setOwnedKeys(owned)
    } catch (err) {
      console.error(err)
      showToast('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const base = useMemo(() => resolveBase(draft), [draft])
  const fpDraft = useMemo(() => resolveFreePose(draft), [draft])
  // ชุดเซ็ตที่ใส่ใกล้ครบที่สุด (ครบ 2/3/5 ชิ้น = ออร่าระดับ 1/2/3)
  const setInfo = useMemo(() => detectSet(draft), [draft])

  // เด็กขยับเอง (ลากบนเวที หรือเลื่อนแถบ) → เก็บทั้ง pose และ freePose คู่กันเสมอ
  const setFree = (fp: FreePoseConfig, pose = 'custom') =>
    setDraft((prev) => ({ ...prev, mode: 'doll', pose, freePose: fp } as any))
  const setPart = (key: keyof FreePoseConfig, patch: Partial<PartTransform>) =>
    setFree({ ...fpDraft, [key]: { ...fpDraft[key], ...patch } })

  const ownedItemsBySlot = useMemo(() => {
    const map: Record<string, any[]> = {}
    SLOT_META.forEach((s) => (map[s.key] = []))
    shopItems.forEach((it) => {
      if (ownedKeys.has(it.item_key) && map[it.item_type]) {
        map[it.item_type].push(it)
      }
    })
    return map
  }, [shopItems, ownedKeys])

  const ownedPortraits = useMemo(() => {
    const list: string[] = []
    if (draft.portrait) list.push(draft.portrait)
    shopItems.forEach((it) => {
      if (it.item_type === 'avatar' && ownedKeys.has(it.item_key) && it.image_url && !list.includes(it.image_url)) {
        list.push(it.image_url)
      }
    })
    return list
  }, [shopItems, ownedKeys, draft.portrait])

  const updateBase = (patch: Partial<typeof base>) => {
    setDraft((prev) => ({
      ...prev,
      mode: 'doll',
      base: { ...(prev.base || {}), ...patch },
    }))
  }

  const equipItem = (slot: Slot, item: any | null) => {
    setDraft((prev) => ({
      ...prev,
      mode: 'doll',
      equip: {
        ...(prev.equip || {}),
        [slot]: item
          ? {
              key: item.item_key,
              name: item.item_name,
              d: item.design,
              ...(item.image_url ? { image_url: item.image_url } : {}),
            }
          : null,
      },
    }))
  }

  const randomizeLook = () => {
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
    const nextEquip: any = { ...(draft.equip || {}) }
    SLOT_META.forEach(({ key }) => {
      const pool = ownedItemsBySlot[key] || []
      if (pool.length > 0) {
        const mustWear = key === 'outfit' || key === 'pants' || key === 'shoes'
        if (mustWear || Math.random() < 0.6) {
          const chosen = pick(pool)
          nextEquip[key] = {
            key: chosen.item_key,
            name: chosen.item_name,
            d: chosen.design,
            ...(chosen.image_url ? { image_url: chosen.image_url } : {}),
          }
        } else {
          nextEquip[key] = null
        }
      }
    })

    setDraft((prev) => ({
      ...prev,
      mode: 'doll',
      base: {
        ...(prev.base || {}), // คงวัย/รูปร่างที่เด็กเลือกไว้
        skin: pick(SKIN_TONES),
        hair: pick(HAIR_STYLES).key,
        hairColor: pick(HAIR_COLORS),
        eyes: pick(EYE_STYLES).key,
        mouth: pick(MOUTH_STYLES).key,
      },
      equip: nextEquip,
    }))
    showToast('🎲 สุ่มลุคใหม่แล้ว! กด "บันทึกตัวละคร" เพื่อใช้งาน')
  }

  const saveCurrentAsPreset = (idx: number) => {
    const keys: Partial<Record<Slot, string>> = {}
    SLOT_META.forEach(({ key }) => {
      const k = draft.equip?.[key]?.key
      if (k) keys[key] = k
    })
    const next = [...presets]
    next[idx] = { name: `ชุดโปรด ${idx + 1}`, keys }
    setPresets(next)
    showToast(`⭐ บันทึกลง "ชุดโปรด ${idx + 1}" แล้ว`)
  }

  const applyPreset = (p: Preset) => {
    const nextEquip: any = {}
    SLOT_META.forEach(({ key }) => {
      const k = p.keys?.[key]
      if (k) {
        const found = shopItems.find((it) => it.item_key === k)
        if (found && ownedKeys.has(k)) {
          nextEquip[key] = {
            key: found.item_key,
            name: found.item_name,
            d: found.design,
            ...(found.image_url ? { image_url: found.image_url } : {}),
          }
        }
      }
    })
    setDraft((prev) => ({ ...prev, mode: 'doll', equip: nextEquip }))
    showToast(`✨ สวมใส่ "${p.name}" แล้ว`)
  }

  const handleSave = async () => {
    if (!student || saving) return
    setSaving(true)
    try {
      const payload = { ...draft, presets }
      const { data, error } = await supabase.rpc('save_avatar', {
        p_user_id: student.id,
        p_config: payload,
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'บันทึกไม่สำเร็จ')

      // กันค่าสูญหายหาก RPC save_avatar ฝั่ง DB ตัดฟิลด์บางส่วนออก (เช่น freePose, pose, bg, presets)
      const returnedCfg: any = data.config || {}
      const savedCfg: any = {
        ...payload,
        ...returnedCfg,
        equip: {
          ...(payload.equip || {}),
          ...(returnedCfg.equip || {}),
        },
      }
      if (!returnedCfg.freePose && (payload as any).freePose) {
        savedCfg.freePose = (payload as any).freePose
        savedCfg.pose = (payload as any).pose
      }
      // กันค่าใหม่ (วัย/รูปร่าง/สีที่ทาเอง) สูญหายหาก RPC save_avatar ตัดฟิลด์ที่ไม่รู้จักออก — ค่าที่เด็กเลือกชนะเสมอ
      savedCfg.base = { ...(returnedCfg.base || {}), ...((payload as any).base || {}) }
      if (!returnedCfg.colorOverrides && (payload as any).colorOverrides) {
        savedCfg.colorOverrides = (payload as any).colorOverrides
      }
      // กรณีถอด bg ออก (payload.equip.bg === null) ให้แน่ใจว่าไม่ค้างค่าเก่าจาก DB
      if ((payload.equip as any)?.bg === null) {
        savedCfg.equip.bg = null
      }

      const nextBgKey = savedCfg.equip?.bg?.key || null
      const nextTitle = savedCfg.equip?.title?.name || student.equipped_title

      // อัปเดตคอลัมน์สำรอง (equipped_bg, avatar_config) เพื่อให้หน้า Dashboard และตารางแรงค์อ่านตรงกันเสมอ
      await supabase
        .from('users')
        .update({
          avatar_config: savedCfg,
          equipped_bg: nextBgKey,
          equipped_title: nextTitle,
        })
        .eq('id', student.id)

      const updatedUser = {
        ...student,
        avatar_config: savedCfg,
        equipped_bg: nextBgKey,
        equipped_title: nextTitle,
      }
      setStudent(updatedUser)
      setDraft(savedCfg)
      localStorage.setItem('kidscoddy_user', JSON.stringify(updatedUser))
      showToast('✅ บันทึกตัวละครเรียบร้อย!')
    } catch (err: any) {
      console.error(err)
      showToast('❌ บันทึกไม่สำเร็จ: ' + (err?.message || 'ลองใหม่อีกครั้ง'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold">กำลังเปิดตู้เสื้อผ้าเวทมนตร์...</div>
  }

  const activeTitle = titleOf(draft) || student?.equipped_title || '🌱 นักคำนวณฝึกหัด'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-12">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900/90 text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-extrabold backdrop-blur">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md shadow-sm border-b border-indigo-100 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center font-black text-lg shadow-md">
              🎨
            </div>
            <div>
              <h1 className="font-extrabold text-gray-800 text-base">โปรไฟล์ & ห้องแต่งตัวละคร</h1>
              <p className="text-xs text-purple-600 font-bold">ปรับแต่งหน้าตาฟรี และสวมใส่ไอเทมจากกระเป๋า</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
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

      <main className="max-w-6xl mx-auto px-6 mt-6 space-y-6">
        {/* การ์ดข้อมูลโปรไฟล์นักเรียน */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left space-y-1">
            <span className="px-3 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold">
              {activeTitle}
            </span>
            <h2 className="text-2xl font-black">{student?.display_name}</h2>
            <p className="text-xs text-purple-100">
              ระดับชั้น: {student?.group_name || 'ทั่วไป'} • Level {student?.level || 1} ({student?.xp || 0} XP)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-black">
              <CoinIcon className="w-5 h-5" />
              <span>{(student?.coins || 0).toLocaleString()} Coins</span>
            </div>
            <div className="bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl flex items-center gap-1.5 text-xs font-black">
              <span>🔥</span>
              <span>Streak {student?.streak_days || 0} วัน</span>
            </div>
          </div>
        </div>

        {/* โซนห้องแต่งตัว */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* ฝั่งซ้าย: เวทีตัวละคร + ปุ่มบันทึก + ชุดโปรด */}
          <div className="lg:col-span-4 bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-md border border-indigo-100 flex flex-col items-center space-y-4 lg:sticky lg:top-24">
            <CharacterStage config={draft} className="w-56 sm:w-64" animate={true} onPoseChange={(fp) => setFree(fp)} />
            <p className="text-[11px] font-bold text-purple-600 text-center">👆 ลากแขน ขา อาวุธ หรือตัวละครได้เลย!</p>

            {/* ชุดเซ็ต: ใส่ธีมเดียวกันครบ 2/3/5 ชิ้น ปลดออร่า */}
            {setInfo ? (
              <div
                className={`w-full p-3 rounded-2xl border text-center space-y-1.5 ${
                  setInfo.tier === 3 ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50' : 'border-indigo-100 bg-indigo-50/50'
                }`}
              >
                <p className="text-xs font-black text-gray-800">
                  {setInfo.def.icon} ชุด{setInfo.def.name} {setInfo.count}/{setInfo.total} ชิ้น
                </p>
                <div className="flex justify-center gap-1">
                  {Array.from({ length: setInfo.total }).map((_, i) => (
                    <span key={i} className={`w-5 h-1.5 rounded-full ${i < setInfo.count ? 'bg-amber-400' : 'bg-gray-200'}`} />
                  ))}
                </div>
                <p className="text-[11px] font-bold text-gray-500">
                  {setInfo.tier === 3
                    ? '✨ ออร่าระดับสูงสุด! ครบทั้งชุดแล้ว'
                    : `ออร่าระดับ ${setInfo.tier} · ขาดอีก ${setInfo.total - setInfo.count} ชิ้น: ${setInfo.missing.map(slotLabel).join(', ')}`}
                </p>
              </div>
            ) : (
              <p className="text-[11px] font-bold text-gray-400 text-center">
                🎖️ ใส่ชุด/หมวก/ของถือธีมเดียวกันตั้งแต่ 2 ชิ้น ปลดออร่าพิเศษ!
              </p>
            )}

            <div className="w-full grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={randomizeLook}
                className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-extrabold rounded-2xl border border-purple-200 transition cursor-pointer"
              >
                🎲 สุ่มลุคเท่ๆ
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-md shadow-emerald-200 transition cursor-pointer"
              >
                {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกตัวละคร'}
              </button>
            </div>

            <div className="w-full pt-3 border-t border-gray-100 space-y-2">
              <p className="text-xs font-extrabold text-gray-600">⭐ ชุดโปรดของฉัน (สูงสุด 3 ชุด)</p>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => {
                  const p = presets[idx]
                  return (
                    <div key={idx} className="p-2 rounded-2xl border border-gray-100 bg-gray-50/70 text-center space-y-1.5">
                      <div className="text-[11px] font-extrabold text-gray-700 truncate">
                        {p ? p.name : `ช่องว่าง ${idx + 1}`}
                      </div>
                      <div className="flex gap-1 justify-center">
                        {p && (
                          <button
                            type="button"
                            onClick={() => applyPreset(p)}
                            className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-extrabold rounded-lg cursor-pointer"
                          >
                            ใส่
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => saveCurrentAsPreset(idx)}
                          className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold rounded-lg cursor-pointer"
                        >
                          บันทึก
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ฝั่งขวา: แท็บเลือกปรับแต่ง */}
          <div className="lg:col-span-8 bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-md border border-indigo-100 space-y-5">
            <div className="flex flex-wrap gap-1.5 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('face')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeTab === 'face'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                😊 หน้าตาและทรงผม (ฟรี)
              </button>
              {SLOT_META.map((s) => {
                const count = ownedItemsBySlot[s.key]?.length || 0
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setActiveTab(s.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                      activeTab === s.key
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                    <span className={`px-1.5 rounded-full text-[10px] ${activeTab === s.key ? 'bg-white/25' : 'bg-white text-gray-500'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {activeTab === 'face' && (
              
              <div className="space-y-5">

                <div>
                  <h3 className="text-xs font-black text-gray-700 mb-2">🧬 วัยของตัวละคร</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AGE_STYLES.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => updateBase({ age: a.key as AgeStyle })}
                        className={`px-3 py-2.5 rounded-2xl border text-left transition cursor-pointer ${
                          base.age === a.key
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-200'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="text-xs font-extrabold">{a.icon} {a.label}</div>
                        <div className="text-[10px] font-bold text-gray-400 leading-tight mt-0.5">{a.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-700 mb-2">💪 รูปร่าง</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BUILD_STYLES.map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => updateBase({ build: b.key as BuildStyle })}
                        className={`px-3 py-2.5 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                          base.build === b.key
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-200'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {b.icon} {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-700 mb-2">🕺 ท่าทางสำเร็จรูป (Presets)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(POSE_PRESETS) as PosePresetKey[]).map((key) => {
                      const currentPose = ((draft as any)?.pose as PosePresetKey) || 'idle'
                      const isSelected = currentPose === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFree(POSE_PRESETS[key].freePose, key)}
                          className={`px-3 py-2.5 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-200'
                              : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {POSE_PRESETS[key].label}
                        </button>
                      )
                    })}
                  </div>
                  {(() => {
                    const wShape = draft.equip?.hand?.d?.shape
                    const wp = poseForWeapon(wShape)
                    if (!wp) return null
                    const wName = SHAPE_OPTIONS.hand.find((o) => o.shape === wShape)?.label || 'อาวุธ'
                    return (
                      <button
                        type="button"
                        onClick={() => setFree(wp)}
                        className="mt-2 w-full px-3 py-2.5 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-xs font-extrabold text-amber-800 transition cursor-pointer"
                      >
                        🎯 ท่าประจำ{wName}
                      </button>
                    )
                  })()}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black text-gray-700">🎛️ ขยับเองทีละชิ้น</h3>
                    <button
                      type="button"
                      onClick={() => setFree(POSE_PRESETS.idle.freePose, 'idle')}
                      className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[11px] font-extrabold text-gray-700 cursor-pointer"
                    >
                      ↩️ รีเซ็ตท่า
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {PART_META.map((m) => {
                      const v = fpDraft[m.key]
                      const sliders: { label: string; prop: keyof PartTransform; max: number }[] = [{ label: 'หมุน', prop: 'deg', max: m.deg }]
                      if (m.move > 0) {
                        sliders.push({ label: 'ซ้าย-ขวา', prop: 'x', max: m.move }, { label: 'ขึ้น-ลง', prop: 'y', max: m.key === 'body' ? 20 : m.move })
                      }
                      return (
                        <div key={m.key} className="p-3 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-1.5">
                          <p className="text-xs font-black text-gray-700">{m.icon} {m.label}</p>
                          {sliders.map((sl) => (
                            <label key={sl.prop} className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                              <span className="w-14 shrink-0">{sl.label}</span>
                              <input
                                type="range"
                                min={-sl.max}
                                max={sl.max}
                                step={1}
                                value={Math.round(v[sl.prop])}
                                onChange={(e) => setPart(m.key, { [sl.prop]: Number(e.target.value) })}
                                className="flex-1 accent-indigo-500"
                              />
                              <span className="w-8 text-right tabular-nums">{Math.round(v[sl.prop])}</span>
                            </label>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-700 mb-2">🎨 สีผิว</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {SKIN_TONES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => updateBase({ skin: hex })}
                        className={`w-10 h-10 rounded-2xl border-2 transition cursor-pointer ${
                          base.skin === hex ? 'border-indigo-600 scale-110 ring-2 ring-indigo-200' : 'border-white shadow-sm'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-700 mb-2">💇 ทรงผม</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HAIR_STYLES.map((h) => (
                      <button
                        key={h.key}
                        type="button"
                        onClick={() => updateBase({ hair: h.key as HairStyle })}
                        className={`px-3 py-2.5 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                          base.hair === h.key
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-700 mb-2">🌈 สีผม</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {HAIR_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => updateBase({ hairColor: hex })}
                        className={`w-9 h-9 rounded-2xl border-2 transition cursor-pointer ${
                          base.hairColor === hex ? 'border-indigo-600 scale-110 ring-2 ring-indigo-200' : 'border-white shadow-sm'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-black text-gray-700 mb-2">👀 ดวงตา</h3>
                    <div className="flex flex-wrap gap-2">
                      {EYE_STYLES.map((e) => (
                        <button
                          key={e.key}
                          type="button"
                          onClick={() => updateBase({ eyes: e.key as EyeStyle })}
                          className={`px-3 py-2 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                            base.eyes === e.key
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                              : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-gray-700 mb-2">👄 ปาก</h3>
                    <div className="flex flex-wrap gap-2">
                      {MOUTH_STYLES.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => updateBase({ mouth: m.key as MouthStyle })}
                          className={`px-3 py-2 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                            base.mouth === m.key
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                              : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {ownedPortraits.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-black text-gray-700 mb-2">🖼️ ภาพโปรไฟล์สำเร็จรูปรุ่นเก่าของฉัน</h3>
                    <div className="flex flex-wrap gap-3">
                      {ownedPortraits.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setDraft((prev) => ({ ...prev, mode: 'portrait', portrait: url }))}
                          className={`w-16 h-16 rounded-2xl overflow-hidden border-2 cursor-pointer ${
                            draft.mode === 'portrait' && draft.portrait === url
                              ? 'border-indigo-600 ring-2 ring-indigo-200'
                              : 'border-gray-200'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="portrait" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'face' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-800">
                    {SLOT_META.find((s) => s.key === activeTab)?.icon} {SLOT_META.find((s) => s.key === activeTab)?.label} ในกระเป๋าของฉัน
                  </h3>
                  {draft.equip?.[activeTab] && (
                    <button
                      type="button"
                      onClick={() => equipItem(activeTab, null)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold rounded-xl cursor-pointer"
                    >
                      ❌ ถอดชิ้นนี้ออก
                    </button>
                  )}
                </div>

                {(ownedItemsBySlot[activeTab] || []).length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                    <p className="text-sm font-bold text-gray-500">ยังไม่มีไอเทมหมวดนี้ในกระเป๋าเลย</p>
                    <button
                      type="button"
                      onClick={() => router.push('/shop')}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                    >
                      🛍️ ไปเลือกซื้อที่ร้านค้า
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(ownedItemsBySlot[activeTab] || []).map((item) => {
                      const equipped = draft.mode !== 'portrait' && draft.equip?.[activeTab]?.key === item.item_key
                      const r = RARITY_META[rarityOf(item.rarity)]
                      return (
                        <button
                          key={item.item_key}
                          type="button"
                          onClick={() => equipItem(activeTab, equipped ? null : item)}
                          className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-2 bg-gradient-to-b ${r.bg} ${
                            equipped
                              ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-sm'
                              : `${r.border} hover:scale-[1.02]`
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-[10px] font-black ${r.text}`}>
                                {'★'.repeat(r.stars)} {r.label}
                              </span>
                              {equipped && (
                                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full">
                                  ใส่อยู่
                                </span>
                              )}
                            </div>
                            <div className="font-extrabold text-xs text-gray-800 line-clamp-2">{item.item_name}</div>
                          </div>

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
                                className="w-10 h-4 rounded-full border border-black/15"
                                style={{ background: item.design.css }}
                              />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* ทาสีไอเทมที่ใส่อยู่เอง — สีเป็นของฟรี ร้านค้าขายเฉพาะ "รูปทรง" */}
                {activeTab !== 'bg' &&
                  activeTab !== 'frame' &&
                  activeTab !== 'title' &&
                  draft.mode !== 'portrait' &&
                  draft.equip?.[activeTab]?.d?.colors && (
                    <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-gray-700">🎨 ทาสีชิ้นนี้เอง (ฟรี)</h4>
                        {draft.colorOverrides?.[activeTab] && (
                          <button
                            type="button"
                            onClick={() => setDraft((prev) => clearColorOverride(prev, activeTab))}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-[11px] font-extrabold text-gray-600 cursor-pointer"
                          >
                            ↩️ กลับสีเดิม
                          </button>
                        )}
                      </div>
                      {['สีหลัก', 'สีรอง', 'สีเน้น'].map((label, idx) => {
                        const cur = effectiveDesign(draft, activeTab)?.colors?.[idx]
                        return (
                          <div key={label}>
                            <p className="text-[11px] font-bold text-gray-500 mb-1">{label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {CHINESE_COLORS.map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  title={c.name}
                                  onClick={() => setDraft((prev) => setColorOverride(prev, activeTab, idx, c.hex))}
                                  className={`w-7 h-7 rounded-lg border-2 transition cursor-pointer ${
                                    cur?.toLowerCase() === c.hex ? 'border-indigo-600 scale-110 ring-2 ring-indigo-200' : 'border-white shadow-sm'
                                  }`}
                                  style={{ backgroundColor: c.hex }}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      <p className="text-[10px] font-bold text-gray-400">
                        สีเปลี่ยนได้ฟรี แต่รูปทรงเปลี่ยนไม่ได้ อยากได้รูปทรงใหม่ไปดูที่ร้านค้า 🛍️
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

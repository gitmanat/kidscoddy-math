// =====================================================================
// KidsCoddy Avatar System — ชนิดข้อมูล ตัวเลือกพื้นฐาน และตัวช่วย
// 🏯 ธีมหนังจีนโบราณ: ฮ่องเต้ ฮองเฮา สนม จอมยุทธ์ ขุนนาง แม่ทัพ พระ นักพรต
//
// หลักการ: ตัวละครทุกตัวถูกบันทึกใน users.avatar_config (jsonb) "ก้อนเดียว"
//   - base  = ผิว ผม ใบหน้า (แต่งได้ฟรี)
//   - equip = ไอเทมที่ใส่อยู่แต่ละช่อง พร้อมสำเนา design ของไอเทม (snapshot)
// ทุกหน้า (โปรไฟล์ ร้านค้า แดชบอร์ด อันดับ ป้ายผู้พิชิต) อ่านก้อนเดียวกัน → ตัวละครเหมือนกันทุกที่
//
// ⚠️ ความเข้ากันได้ย้อนหลัง: key เก่า (short/spiky/curly, hoodie, wizard, robot ฯลฯ)
//    ยังอยู่ใน type และ Character.tsx แปลงเป็นของจีนให้อัตโนมัติ ข้อมูลที่บันทึกไว้จึงไม่พัง
// =====================================================================

export type Slot = 'outfit' | 'pants' | 'shoes' | 'hat' | 'glasses' | 'back' | 'hand' | 'pet' | 'bg' | 'frame' | 'title'

export type HairStyle =
  // ทรงผมจีนโบราณ
  | 'topknot' | 'ponytail' | 'long' | 'bob' | 'twin' | 'empress' | 'concubine' | 'bald'
  // ของเดิม (ยังรองรับ → Character.tsx แปลงให้)
  | 'short' | 'spiky' | 'curly'
export type EyeStyle = 'round' | 'happy' | 'sparkle' | 'sleepy' | 'wink' | 'phoenix' | 'sword'
export type MouthStyle = 'smile' | 'grin' | 'cat' | 'open' | 'smirk' | 'rouge' | 'calm' | 'mustache'

export interface AvatarBase {
  skin: string
  hair: HairStyle
  hairColor: string
  eyes: EyeStyle
  mouth: MouthStyle
}

export type BgPatternKey = 'cloud' | 'calligraphy' | 'plum' | 'stars' | 'coins' | 'math' | 'dots' | 'hearts'

/** design ของไอเทม: shape = รูปทรงที่โค้ดวาดให้, colors = [สีหลัก, สีรอง, สีเน้น] */
export interface ItemDesign {
  shape?: string
  colors?: string[]
  css?: string // bg: CSS gradient
  pattern?: BgPatternKey | null
  style?: string // frame: solid | gradient | glow | rainbow
  emblem?: string
  glow?: boolean // shoes 'cloud': มีก้อนเมฆลอยตามหลัง
  [key: string]: unknown
}

export interface EquipEntry {
  key: string
  name?: string
  d?: ItemDesign
}

export interface AvatarConfig {
  v?: number
  mode?: 'doll' | 'portrait'
  base?: Partial<AvatarBase>
  equip?: Partial<Record<Slot, EquipEntry | null>>
  portrait?: string | null // ภาพอวตารสำเร็จรูปรุ่นเก่า (DiceBear)
  /** ท่าทาง: คีย์ท่าสำเร็จรูป หรือ 'custom' เมื่อเด็กขยับเอง */
  pose?: string
  /** ตำแหน่ง/มุมของแต่ละชิ้นส่วน (ตัวจริงที่ใช้วาด) — ต้องถูกเก็บใน DB ด้วย */
  freePose?: Partial<Record<'lArm' | 'rArm' | 'lLeg' | 'rLeg' | 'body' | 'hand' | 'pet', { x: number; y: number; deg: number }>>
}

export const DEFAULT_BASE: AvatarBase = {
  skin: '#f7c9a0',
  hair: 'topknot',
  hairColor: '#2b2b2b',
  eyes: 'round',
  mouth: 'smile',
}

export const SKIN_TONES = ['#ffe0c2', '#f7c9a0', '#e8a87c', '#c68642', '#8d5524', '#5c3a21']

// สีผมแบบหนังจีน: ดำ/น้ำตาลเข้ม + ขาว/เงิน (ผู้เฒ่า ปรมาจารย์) + แดงเข้ม/น้ำเงินเข้ม/ม่วง (เซียน)
export const HAIR_COLORS = [
  '#1a1a1a', '#2b2b2b', '#4a2c17', '#6b4226', '#8b8b8b', '#e5e7eb', '#f2c94c', '#991b1b', '#1e3a8a', '#7c3aed',
]

export const HAIR_STYLES: { key: HairStyle; label: string }[] = [
  { key: 'topknot', label: 'มวยผมสูง (บุรุษ)' },
  { key: 'ponytail', label: 'หางม้าจอมยุทธ์' },
  { key: 'long', label: 'ผมสยายยาว' },
  { key: 'bob', label: 'ผมประบ่า' },
  { key: 'twin', label: 'สองมวย (นางกำนัล)' },
  { key: 'concubine', label: 'มวยห่วงคู่ (สนม)' },
  { key: 'empress', label: 'ทรงฮองเฮา' },
  { key: 'bald', label: 'ศีรษะโล้น (พระ)' },
]
export const EYE_STYLES: { key: EyeStyle; label: string }[] = [
  { key: 'round', label: 'ตากลม' },
  { key: 'sparkle', label: 'ตาแวววาว' },
  { key: 'phoenix', label: 'ตาหงส์' },
  { key: 'sword', label: 'ตาคมคิ้วกระบี่' },
  { key: 'happy', label: 'ตายิ้ม' },
  { key: 'wink', label: 'ขยิบตา' },
  { key: 'sleepy', label: 'ตาง่วง' },
]
export const MOUTH_STYLES: { key: MouthStyle; label: string }[] = [
  { key: 'smile', label: 'ยิ้มสดใส' },
  { key: 'grin', label: 'ยิ้มกว้าง' },
  { key: 'smirk', label: 'ยิ้มมุมปาก' },
  { key: 'calm', label: 'สงบขรึม' },
  { key: 'rouge', label: 'ปากแดงจิ๋ว' },
  { key: 'mustache', label: 'หนวดปลายงอน' },
  { key: 'cat', label: 'ปากแมว' },
  { key: 'open', label: 'ตื่นเต้น' },
]

// key ของ slot คงเดิม (เพื่อไม่ให้ข้อมูลใน DB พัง) เปลี่ยนเฉพาะชื่อและไอคอนที่แสดง
export const SLOT_META: { key: Slot; label: string; icon: string; wearable: boolean }[] = [
  { key: 'outfit', label: 'ชุด', icon: '🥋', wearable: true },
  { key: 'pants', label: 'กางเกง/ผ้าพันขา', icon: '👖', wearable: true },
  { key: 'shoes', label: 'รองเท้า', icon: '🥿', wearable: true },
  { key: 'hat', label: 'หมวก/มงกุฎ', icon: '👑', wearable: true },
  { key: 'glasses', label: 'แต่งหน้า', icon: '🎭', wearable: true },
  { key: 'back', label: 'ของสะพายหลัง', icon: '⚔️', wearable: true },
  { key: 'hand', label: 'ของถือ', icon: '🗡️', wearable: true },
  { key: 'pet', label: 'สัตว์มงคล', icon: '🐉', wearable: true },
  { key: 'bg', label: 'พื้นหลัง', icon: '🏯', wearable: true },
  { key: 'frame', label: 'กรอบ', icon: '🖼️', wearable: true },
  { key: 'title', label: 'ฉายา/ตำแหน่ง', icon: '📜', wearable: true },
]
export const SLOT_KEYS = SLOT_META.map((s) => s.key)

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export const RARITY_META: Record<Rarity, { label: string; text: string; border: string; bg: string; ring: string; stars: number }> = {
  common: { label: 'สามัญ', text: 'text-slate-600', border: 'border-slate-300', bg: 'from-slate-50 to-white', ring: 'ring-slate-200', stars: 1 },
  rare: { label: 'ยอดฝีมือ', text: 'text-sky-600', border: 'border-sky-400', bg: 'from-sky-50 to-white', ring: 'ring-sky-200', stars: 2 },
  epic: { label: 'ปรมาจารย์', text: 'text-purple-600', border: 'border-purple-400', bg: 'from-purple-50 to-fuchsia-50', ring: 'ring-purple-200', stars: 3 },
  legendary: { label: 'จักรพรรดิ', text: 'text-amber-600', border: 'border-amber-400', bg: 'from-amber-50 to-yellow-50', ring: 'ring-amber-300', stars: 4 },
}
export const rarityOf = (r: unknown): Rarity => (r === 'rare' || r === 'epic' || r === 'legendary' ? r : 'common')

// =====================================================================
// 📦 รายการ shape ที่ Character.tsx วาดได้ — ใช้ทำหน้าแอดมิน/seed ร้านค้า
//    colors = [สีหลัก, สีรอง, สีเน้น] ค่าแนะนำตรงกับสีเริ่มต้นที่ตัววาดใช้
// =====================================================================
export interface ShapeOption {
  shape: string
  label: string
  colors: [string, string, string]
  extra?: Partial<ItemDesign>
}

export const SHAPE_OPTIONS: Record<Exclude<Slot, 'frame' | 'title'>, ShapeOption[]> = {
  outfit: [
    { shape: 'commoner', label: 'ชุดศิษย์น้อย', colors: ['#4f6fa8', '#e8d9b0', '#8b5e34'] },
    { shape: 'wuxia', label: 'ชุดจอมยุทธ์', colors: ['#1f2937', '#dc2626', '#fbbf24'] },
    { shape: 'scholar', label: 'ชุดบัณฑิต', colors: ['#e5e7eb', '#1e3a8a', '#fbbf24'] },
    { shape: 'taoist', label: 'ชุดนักพรต', colors: ['#f1f5f9', '#1f2937', '#fbbf24'] },
    { shape: 'monk', label: 'จีวรเส้าหลิน', colors: ['#f59e0b', '#b45309', '#7c2d12'] },
    { shape: 'official', label: 'ชุดขุนนาง', colors: ['#b91c1c', '#fbbf24', '#fef08a'] },
    { shape: 'general', label: 'เกราะแม่ทัพ', colors: ['#94a3b8', '#fbbf24', '#dc2626'] },
    { shape: 'concubine', label: 'ชุดสนม', colors: ['#f9a8d4', '#f472b6', '#fde047'] },
    { shape: 'empress', label: 'ชุดฮองเฮา', colors: ['#dc2626', '#fbbf24', '#fde68a'] },
    { shape: 'imperial', label: 'หลงเผาฮ่องเต้', colors: ['#facc15', '#dc2626', '#fef3c7'] },
  ],
  pants: [
    { shape: 'trousers', label: 'กางเกงจีนพันขา', colors: ['#6b7280', '#e8d9b0', '#8b5e34'] },
    { shape: 'short', label: 'กางเกงขาสั้น', colors: ['#6b7280', '#e8d9b0', '#8b5e34'] },
    { shape: 'silk', label: 'กางเกงผ้าไหม', colors: ['#facc15', '#dc2626', '#fde68a'] },
    { shape: 'greaves', label: 'เกราะขา', colors: ['#94a3b8', '#fbbf24', '#dc2626'] },
  ],
  shoes: [
    { shape: 'kungfu', label: 'รองเท้าผ้ากังฟู', colors: ['#1f2937', '#e5e7eb', '#ffffff'] },
    { shape: 'cloud', label: 'รองเท้าปลายงอน', colors: ['#1f2937', '#e5e7eb', '#ffffff'] },
    { shape: 'cloud', label: 'รองเท้าเหินเมฆ', colors: ['#6366f1', '#e0e7ff', '#ffffff'], extra: { glow: true } },
    { shape: 'court', label: 'รองเท้าขุนนาง', colors: ['#1f2937', '#fbbf24', '#ffffff'] },
    { shape: 'flower', label: 'รองเท้าปักดอกไม้', colors: ['#f472b6', '#ffffff', '#fde047'] },
    { shape: 'boot', label: 'บู๊ตแม่ทัพ', colors: ['#78350f', '#fbbf24', '#451a03'] },
  ],
  hat: [
    { shape: 'headband', label: 'ผ้าคาดหัวจอมยุทธ์', colors: ['#dc2626', '#fbbf24', '#fef08a'] },
    { shape: 'douli', label: 'หมวกงอบ', colors: ['#d6b76a', '#a16207', '#ef4444'] },
    { shape: 'scholar', label: 'หมวกบัณฑิต', colors: ['#1e3a8a', '#facc15', '#93c5fd'] },
    { shape: 'official', label: 'หมวกขุนนาง', colors: ['#1f2937', '#facc15', '#34d399'] },
    { shape: 'taoist', label: 'มงกุฎดอกบัวนักพรต', colors: ['#fde68a', '#92400e', '#ffffff'] },
    { shape: 'general', label: 'หมวกแม่ทัพพู่แดง', colors: ['#94a3b8', '#fbbf24', '#dc2626'] },
    { shape: 'flowers', label: 'ปิ่นโบตั๋นผีเสื้อ', colors: ['#f472b6', '#fbbf24', '#34d399'] },
    { shape: 'phoenix', label: 'มงกุฎหงส์ฮองเฮา', colors: ['#fbbf24', '#dc2626', '#34d399'] },
    { shape: 'imperial', label: 'มงกุฎฮ่องเต้', colors: ['#1f2937', '#facc15', '#ffffff'] },
  ],
  glasses: [
    { shape: 'huadian', label: 'ลายดอกไม้หน้าผาก', colors: ['#dc2626', '#fbbf24', '#ffffff'] },
    { shape: 'mask', label: 'ผ้าปิดหน้าจอมยุทธ์', colors: ['#1f2937', '#ef4444', '#ffffff'] },
    { shape: 'veil', label: 'ผ้าคลุมหน้า', colors: ['#ffffff', '#f9a8d4', '#ffffff'] },
    { shape: 'beard', label: 'เคราขาวผู้เฒ่า', colors: ['#f8fafc', '#cbd5e1', '#ffffff'] },
    { shape: 'scar', label: 'แผลเป็นนักรบ', colors: ['#b91c1c', '#ffffff', '#ffffff'] },
  ],
  back: [
    { shape: 'cape', label: 'ผ้าคลุมจอมยุทธ์', colors: ['#7f1d1d', '#b91c1c', '#fde047'] },
    { shape: 'ribbons', label: 'ผ้าแพรเซียน', colors: ['#a5f3fc', '#f0abfc', '#fde047'] },
    { shape: 'swords', label: 'กระบี่คู่ไขว้หลัง', colors: ['#7c2d12', '#fbbf24', '#dc2626'] },
  ],
  hand: [
    { shape: 'scroll', label: 'ม้วนราชโองการ', colors: ['#fde047', '#b45309', '#dc2626'] },
    { shape: 'sword_chinese', label: 'กระบี่', colors: ['#7c2d12', '#fbbf24', '#dc2626'] },
    { shape: 'saber', label: 'ดาบใบกว้าง', colors: ['#7c2d12', '#fbbf24', '#dc2626'] },
    { shape: 'staff', label: 'ไม้พลองเส้าหลิน', colors: ['#92400e', '#9ca3af', '#dc2626'] },
    { shape: 'fan', label: 'พัดกระดาษ', colors: ['#fef3c7', '#b45309', '#dc2626'] },
    { shape: 'flywhisk', label: 'แส้เซียน', colors: ['#92400e', '#fbbf24', '#ffffff'] },
    { shape: 'flute', label: 'ขลุ่ยไม้ไผ่', colors: ['#65a30d', '#fbbf24', '#dc2626'] },
    { shape: 'lantern', label: 'โคมแดง', colors: ['#dc2626', '#fbbf24', '#fde047'] },
    { shape: 'umbrella', label: 'ร่มกระดาษ', colors: ['#f472b6', '#fbbf24', '#ffffff'] },
    { shape: 'seal', label: 'ตราหยกจักรพรรดิ', colors: ['#34d399', '#dc2626', '#fbbf24'] },
  ],
  pet: [
    { shape: 'cat', label: 'แมวกวักนำโชค', colors: ['#fbbf24', '#f59e0b', '#1f2937'] },
    { shape: 'panda', label: 'แพนด้า', colors: ['#ffffff', '#1f2937', '#65a30d'] },
    { shape: 'rabbit', label: 'กระต่ายหยก', colors: ['#f8fafc', '#fda4af', '#dc2626'] },
    { shape: 'crane', label: 'นกกระเรียน', colors: ['#ffffff', '#dc2626', '#1f2937'] },
    { shape: 'lion', label: 'สิงโตมงคล', colors: ['#fbbf24', '#f59e0b', '#1f2937'] },
    { shape: 'phoenix', label: 'หงส์ไฟน้อย', colors: ['#fb923c', '#dc2626', '#fbbf24'] },
    { shape: 'qilin', label: 'ฉีหลิน', colors: ['#fbbf24', '#f59e0b', '#1f2937'] },
    { shape: 'dragon', label: 'มังกรทอง', colors: ['#facc15', '#f59e0b', '#dc2626'] },
  ],
  bg: [
    { shape: 'cloud', label: 'เมฆมงคล', colors: ['#ffffff', '#ffffff', '#ffffff'], extra: { pattern: 'cloud' } },
    { shape: 'plum', label: 'ดอกท้อ/ดอกเหมย', colors: ['#ffffff', '#ffffff', '#ffffff'], extra: { pattern: 'plum' } },
    { shape: 'calligraphy', label: 'อักษรมงคล 福龍武俠', colors: ['#ffffff', '#ffffff', '#ffffff'], extra: { pattern: 'calligraphy' } },
    { shape: 'stars', label: 'ราตรีดารา', colors: ['#ffffff', '#ffffff', '#ffffff'], extra: { pattern: 'stars' } },
    { shape: 'coins', label: 'เหรียญทองโบราณ', colors: ['#ffffff', '#ffffff', '#ffffff'], extra: { pattern: 'coins' } },
  ],
}

/** อ่านค่าตัวละครจากแถวผู้ใช้ (ถ้าไม่มี avatar_config ใช้ค่าเริ่มต้น) */
export function readAvatarConfig(user: any): AvatarConfig {
  const raw = user?.avatar_config
  if (raw && typeof raw === 'object') return raw as AvatarConfig
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as AvatarConfig
    } catch {
      /* ignore */
    }
  }
  return { v: 2, mode: 'doll', base: {}, equip: {} }
}

export const resolveBase = (cfg: AvatarConfig): AvatarBase => ({ ...DEFAULT_BASE, ...(cfg.base || {}) })

/** ชื่อฉายาที่ใส่อยู่ (ถ้ามี) */
export const titleOf = (cfg: AvatarConfig): string | null => cfg.equip?.title?.name || null

/** ใส่/ถอดไอเทมแบบ "ลองใส่" โดยไม่บันทึก (override = null หมายถึงถอด) */
export function withOverride(cfg: AvatarConfig, slot: Slot, entry: EquipEntry | null | undefined): AvatarConfig {
  return { ...cfg, mode: 'doll', equip: { ...(cfg.equip || {}), [slot]: entry === undefined ? cfg.equip?.[slot] : entry } }
}

/** ย่อ/เพิ่มความสว่างของสี hex (amt เป็น % ติดลบ = เข้มขึ้น) */
export function shade(hex: string, amt: number): string {
  let h = (hex || '#888888').trim()
  if (!h.startsWith('#')) return hex
  h = h.slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6) return hex
  const n = parseInt(h, 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const t = amt < 0 ? 0 : 255
    const p = Math.abs(amt) / 100
    return Math.round((t - v) * p + v)
  })
  return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('')
}
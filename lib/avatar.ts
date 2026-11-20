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
  // ทรงผมตามวัยและบทบาท (เฟส 4)
  | 'tuft' | 'bowl' | 'pigtails' | 'lowbun' | 'braid' | 'halfup' | 'elder' | 'wild' | 'princess' | 'sidebun'
  // ของเดิม (ยังรองรับ → Character.tsx แปลงให้)
  | 'short' | 'spiky' | 'curly'
export type EyeStyle = 'round' | 'happy' | 'sparkle' | 'sleepy' | 'wink' | 'phoenix' | 'sword'
export type MouthStyle = 'smile' | 'grin' | 'cat' | 'open' | 'smirk' | 'rouge' | 'calm' | 'mustache'

/** วัยของตัวละคร: เด็ก / วัยรุ่น / วัยกลางคน / ผู้เฒ่า */
export type AgeStyle = 'child' | 'teen' | 'adult' | 'elder'
/** รูปร่าง: เพรียว / ปกติ / ล่ำสัน / อวบ */
export type BuildStyle = 'slim' | 'normal' | 'sturdy' | 'round'

export interface AvatarBase {
  skin: string
  hair: HairStyle
  hairColor: string
  eyes: EyeStyle
  mouth: MouthStyle
  age: AgeStyle
  build: BuildStyle
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
  /**
   * ตัวแปรประกอบชิ้นส่วน — shape เดียวกันแต่รูปทรงต่างกันจริง
   *  - outfit (ทุกชุด)   : pattern = none|cloud|wave|bamboo|plum|coin|dragon (ลายปัก)
   *  - pet 'fox'         : tails = 1|3|5|9
   *  - pet 'dragon'      : head = eastern|lion|fish · body = serpent|coil · element = none|fire|water|thunder|ice|jade
   *  - hand 'sword_chinese': blade = straight|flame|leaf|crystal · hilt = wing|disc · aura = none|fire|ice|thunder|jade
   *  - hand 'saber'      : blade = curved|broad|ringed · aura = (เหมือนกระบี่)
   */
  variant?: Record<string, string>
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
  /** สีที่เด็กเลือกเองบนไอเทมที่ซื้อแล้ว (ผูกกับ key ไอเทม เปลี่ยนไอเทม = กลับเป็นสีเดิมอัตโนมัติ) */
  colorOverrides?: Partial<Record<Slot, { key: string; colors: string[] }>>
  portrait?: string | null // ภาพอวตารสำเร็จรูปรุ่นเก่า (DiceBear)
}

export const DEFAULT_BASE: AvatarBase = {
  skin: '#f7c9a0',
  hair: 'topknot',
  hairColor: '#2b2b2b',
  eyes: 'round',
  mouth: 'smile',
  age: 'teen',
  build: 'normal',
}

export const SKIN_TONES = ['#ffe0c2', '#f7c9a0', '#e8a87c', '#c68642', '#8d5524', '#5c3a21']

// สีผมแบบหนังจีน: ดำ/น้ำตาลเข้ม + ขาว/เงิน (ผู้เฒ่า ปรมาจารย์) + แดงเข้ม/น้ำเงินเข้ม/ม่วง (เซียน)
export const HAIR_COLORS = [
  '#1a1a1a', '#2b2b2b', '#4a2c17', '#6b4226', '#8b8b8b', '#e5e7eb', '#f2c94c', '#991b1b', '#1e3a8a', '#7c3aed',
]

/** ages = วัยที่ทรงผมนี้เหมาะ (ไว้จัดกลุ่ม/แนะนำใน UI) */
export const HAIR_STYLES: { key: HairStyle; label: string; ages?: AgeStyle[] }[] = [
  { key: 'topknot', label: 'มวยผมสูง (บุรุษ)', ages: ['teen', 'adult'] },
  { key: 'ponytail', label: 'หางม้าจอมยุทธ์', ages: ['teen', 'adult'] },
  { key: 'long', label: 'ผมสยายยาว' },
  { key: 'bob', label: 'ผมประบ่า' },
  { key: 'twin', label: 'สองมวย (นางกำนัล)', ages: ['child', 'teen'] },
  { key: 'concubine', label: 'มวยห่วงคู่ (สนม)', ages: ['teen', 'adult'] },
  { key: 'empress', label: 'ทรงฮองเฮา', ages: ['adult', 'elder'] },
  { key: 'bald', label: 'ศีรษะโล้น (พระ)' },
  { key: 'tuft', label: 'จุกหัวใจ (เด็กน้อย)', ages: ['child'] },
  { key: 'bowl', label: 'หัวกะลาหน้าม้า (เด็ก)', ages: ['child'] },
  { key: 'pigtails', label: 'เปียคู่ผูกโบว์ (เด็ก)', ages: ['child'] },
  { key: 'lowbun', label: 'เกล้าต่ำ+ผ้าคาดผม', ages: ['adult'] },
  { key: 'braid', label: 'เปียยาวพาดไหล่', ages: ['teen', 'adult'] },
  { key: 'halfup', label: 'มัดครึ่งปล่อยครึ่ง', ages: ['adult', 'elder'] },
  { key: 'elder', label: 'ผมบางผู้เฒ่า', ages: ['elder'] },
  { key: 'wild', label: 'ผมยุ่งเหยิง (นักเลง/ขอทาน)' },
  { key: 'princess', label: 'ทรงองค์หญิง', ages: ['child', 'teen'] },
  { key: 'sidebun', label: 'มวยเอียงข้าง', ages: ['teen', 'adult'] },
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

export const AGE_STYLES: { key: AgeStyle; label: string; icon: string; hint: string }[] = [
  { key: 'child', label: 'เด็กน้อย', icon: '🧒', hint: 'หัวโต ตัวเตี้ย ตากลมโต' },
  { key: 'teen', label: 'วัยรุ่น', icon: '🧑', hint: 'สัดส่วนมาตรฐาน' },
  { key: 'adult', label: 'วัยกลางคน', icon: '🧔', hint: 'ไหล่กว้าง คิ้วเข้ม ร่องแก้ม' },
  { key: 'elder', label: 'ผู้เฒ่า', icon: '👴', hint: 'ผมหงอก คิ้วขาว ริ้วรอย ตัวเตี้ยหลังค่อม' },
]
export const BUILD_STYLES: { key: BuildStyle; label: string; icon: string }[] = [
  { key: 'slim', label: 'เพรียว', icon: '🎋' },
  { key: 'normal', label: 'ปกติ', icon: '🧍' },
  { key: 'sturdy', label: 'ล่ำสัน', icon: '💪' },
  { key: 'round', label: 'อวบ', icon: '🍑' },
]

/** พารามิเตอร์สัดส่วน: head = ขนาดหัว, sx/sy = ยืดตัวด้านกว้าง/สูง (ย่อรอบเท้า), drop = คอหด (ผู้เฒ่า), faceScale = ขนาดหน้า */
export const AGE_PARAMS: Record<AgeStyle, { head: number; sx: number; sy: number; drop: number; faceScale: number }> = {
  child: { head: 1.16, sx: 0.94, sy: 0.8, drop: 0, faceScale: 1.08 },
  teen: { head: 1, sx: 1, sy: 1, drop: 0, faceScale: 1 },
  adult: { head: 0.97, sx: 1.05, sy: 1.04, drop: 0, faceScale: 1 },
  elder: { head: 0.98, sx: 0.98, sy: 0.93, drop: 5, faceScale: 1 },
}
export const BUILD_SX: Record<BuildStyle, number> = { slim: 0.86, normal: 1, sturdy: 1.18, round: 1.3 }

export function bodyParams(base: Partial<AvatarBase>) {
  const a = AGE_PARAMS[(base.age as AgeStyle) in AGE_PARAMS ? (base.age as AgeStyle) : 'teen']
  const bx = BUILD_SX[(base.build as BuildStyle) in BUILD_SX ? (base.build as BuildStyle) : 'normal']
  return { head: a.head, sx: a.sx * bx, sy: a.sy, drop: a.drop, faceScale: a.faceScale }
}

/** สีดั้งเดิมแบบจีน (ชื่อไทย + ชื่อจีน) ให้เด็กเลือกทาไอเทมที่ซื้อแล้ว */
export const CHINESE_COLORS: { hex: string; name: string }[] = [
  { hex: '#e0402a', name: 'แดงชาด 朱砂' },
  { hex: '#b8244d', name: 'แดงเยนจือ 胭脂' },
  { hex: '#f4a0b8', name: 'ชมพูท้อ 桃红' },
  { hex: '#f59e0b', name: 'ส้มทอง 橙黄' },
  { hex: '#facc15', name: 'เหลืองจักรพรรดิ 帝王黄' },
  { hex: '#fde68a', name: 'เหลืองห่าน 鹅黄' },
  { hex: '#65a30d', name: 'เขียวไผ่ 竹青' },
  { hex: '#34d399', name: 'เขียวหยก 翡翠' },
  { hex: '#7dd3fc', name: 'ฟ้าหลังฝน 天青' },
  { hex: '#2f4fa8', name: 'น้ำเงินคราม 靛蓝' },
  { hex: '#1e3a8a', name: 'น้ำเงินเข้ม 藏青' },
  { hex: '#6d28d9', name: 'ม่วงจันทน์ 紫檀' },
  { hex: '#1f2937', name: 'ดำสนิท 玄黑' },
  { hex: '#6b7280', name: 'เทาหมึก 墨灰' },
  { hex: '#f1f5f9', name: 'ขาวจันทร์ 月白' },
  { hex: '#92400e', name: 'น้ำตาลดินแดง 赭石' },
  { hex: '#fbbf24', name: 'ทอง 金' },
  { hex: '#cbd5e1', name: 'เงิน 银' },
]

/** design ของช่องนั้น หลังซ้อนสีที่เด็กเลือกเองแล้ว (ใช้ตอนวาดตัวละคร) */
export function effectiveDesign(cfg: AvatarConfig, slot: Slot): ItemDesign | undefined {
  const e = cfg.equip?.[slot]
  if (!e?.d) return undefined
  const o = cfg.colorOverrides?.[slot]
  return o && o.key === e.key ? { ...e.d, colors: o.colors } : e.d
}

/** เปลี่ยนสีช่องที่ idx (0=หลัก 1=รอง 2=เน้น) ของไอเทมที่ใส่อยู่ในช่อง slot */
export function setColorOverride(cfg: AvatarConfig, slot: Slot, idx: number, hex: string): AvatarConfig {
  const e = cfg.equip?.[slot]
  if (!e?.d) return cfg
  const cur = [...(effectiveDesign(cfg, slot)?.colors || [])]
  while (cur.length < 3) cur.push(cur[cur.length - 1] || '#888888')
  cur[idx] = hex
  return { ...cfg, colorOverrides: { ...(cfg.colorOverrides || {}), [slot]: { key: e.key, colors: cur } } }
}

export function clearColorOverride(cfg: AvatarConfig, slot: Slot): AvatarConfig {
  const next = { ...(cfg.colorOverrides || {}) }
  delete next[slot]
  return { ...cfg, colorOverrides: next }
}

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
  variant?: Record<string, string>
  extra?: Partial<ItemDesign>
}

/** แปลง ShapeOption → design ที่เก็บใน shop_items.design */
export const designOf = (o: ShapeOption): ItemDesign => ({
  shape: o.shape,
  colors: [...o.colors],
  ...(o.variant ? { variant: o.variant } : {}),
  ...(o.extra || {}),
})

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
    // ชุดตามอาชีพ (เฟส 3)
    { shape: 'eunuch', label: 'ชุดขันที', colors: ['#0f766e', '#e2e8f0', '#fbbf24'] },
    { shape: 'jinyiwei', label: 'ชุดองครักษ์จิ่นอีเว่ย', colors: ['#111827', '#b91c1c', '#fbbf24'] },
    { shape: 'judge', label: 'ชุดผู้พิพากษา', colors: ['#1e293b', '#f8fafc', '#facc15'] },
    { shape: 'physician', label: 'ชุดหมอยา', colors: ['#4d7c0f', '#f8fafc', '#f97316'] },
    { shape: 'merchant', label: 'ชุดพ่อค้า', colors: ['#b45309', '#dc2626', '#fbbf24'] },
    { shape: 'dancer', label: 'ชุดนางรำ', colors: ['#f472b6', '#fde68a', '#a78bfa'] },
    { shape: 'assassin', label: 'ชุดนักฆ่า', colors: ['#111827', '#b91c1c', '#7f1d1d'] },
    { shape: 'beggar', label: 'ชุดขอทานเก้าชั้น', colors: ['#a8a29e', '#3b82f6', '#dc2626'] },
    { shape: 'farmer', label: 'ชุดชาวนา', colors: ['#a16207', '#e7e5e4', '#78350f'] },
    { shape: 'swordswoman', label: 'ชุดนักดาบหญิง', colors: ['#0e7490', '#e0f2fe', '#f97316'] },
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
    // รองเท้าทรงใหม่ (เฟส 3)
    { shape: 'straw', label: 'รองเท้าฟางสาน', colors: ['#92400e', '#d6b76a', '#a16207'] },
    { shape: 'wooden', label: 'รองเท้าไม้ฟันคู่', colors: ['#78350f', '#dc2626', '#d6b76a'] },
    { shape: 'platform', label: 'รองเท้าฐานสูงราชสำนัก', colors: ['#be185d', '#f8fafc', '#fbbf24'] },
    { shape: 'riding', label: 'บู๊ตขี่ม้าขอบขน', colors: ['#78350f', '#f1f5f9', '#fbbf24'] },
    { shape: 'tiger', label: 'รองเท้าหัวเสือ', colors: ['#f59e0b', '#fff7ed', '#1f2937'] },
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
    // หมวกตามอาชีพ (เฟส 4)
    { shape: 'physician', label: 'หมวกหมอยา', colors: ['#4d7c0f', '#f8fafc', '#f97316'] },
    { shape: 'merchant', label: 'หมวกพ่อค้า', colors: ['#111827', '#fbbf24', '#dc2626'] },
    { shape: 'guard', label: 'หมวกองครักษ์', colors: ['#111827', '#fbbf24', '#dc2626'] },
    { shape: 'princess', label: 'มงกุฎองค์หญิง', colors: ['#fbbf24', '#f472b6', '#ffffff'] },
    { shape: 'eunuch', label: 'หมวกขันที', colors: ['#111827', '#dc2626', '#fbbf24'] },
    { shape: 'judge', label: 'หมวกผู้พิพากษา', colors: ['#111827', '#fbbf24', '#34d399'] },
    { shape: 'beggar', label: 'หมวกฟางขาด', colors: ['#d6b76a', '#3b82f6', '#dc2626'] },
    { shape: 'farmer', label: 'หมวกฟางชาวนา', colors: ['#d6b76a', '#a16207', '#dc2626'] },
    { shape: 'dancer', label: 'มงกุฎดอกไม้นางรำ', colors: ['#f472b6', '#a78bfa', '#fde68a'] },
    { shape: 'bandana', label: 'ผ้าโพกหัวนักฆ่า', colors: ['#111827', '#b91c1c', '#7f1d1d'] },
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
    { shape: 'tiger', label: 'เสือ (ปีขาล)', colors: ['#f59e0b', '#fff7ed', '#1f2937'] },
    { shape: 'horse', label: 'ม้า (ปีมะเมีย)', colors: ['#a16207', '#1f2937', '#3f3f46'] },
    { shape: 'monkey', label: 'ลิงคาดผมทอง (ปีวอก)', colors: ['#a16207', '#fde68a', '#fbbf24'] },
    { shape: 'ox', label: 'วัวเขียว (ปีฉลู)', colors: ['#6b8fb5', '#fde68a', '#1f2937'] },
    { shape: 'rooster', label: 'ไก่ (ปีระกา)', colors: ['#f97316', '#fde047', '#dc2626'] },
    { shape: 'pig', label: 'หมูถือก้อนทอง (ปีกุน)', colors: ['#fbcfe8', '#f472b6', '#fbbf24'] },
    { shape: 'koi', label: 'ปลาคราฟ', colors: ['#fb923c', '#ffffff', '#dc2626'] },
    { shape: 'turtle', label: 'เต่าดำเสวียนอู่', colors: ['#334155', '#94a3b8', '#16a34a'] },
    { shape: 'fox', label: 'จิ้งจอก', colors: ['#f97316', '#ffffff', '#1f2937'], variant: { tails: '1' } },
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

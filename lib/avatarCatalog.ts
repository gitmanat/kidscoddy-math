// =====================================================================
// 🛍️ รายการสินค้ารอบแรก "รูปทรงใหม่" (มังกร + อาวุธ) — ทุกชิ้นต่างกันที่ซิลลูเอต ไม่ใช่แค่สี
//    ใช้ seed ลง shop_items ผ่าน seed_shop_items.sql ที่แนบมา
// =====================================================================
import type { ItemDesign } from './avatar'

export interface CatalogItem {
  item_key: string
  item_name: string
  item_type: 'pet' | 'hand'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  design: ItemDesign
}

const dragon = (key: string, name: string, rarity: CatalogItem['rarity'], v: { head: string; body: string; element: string }, colors: string[]): CatalogItem => ({
  item_key: `pet_dragon_${key}`, item_name: name, item_type: 'pet', rarity, design: { shape: 'dragon', colors, variant: v },
})
const hand = (key: string, name: string, rarity: CatalogItem['rarity'], shape: string, colors: string[], variant?: Record<string, string>): CatalogItem => ({
  item_key: `hand_${key}`, item_name: name, item_type: 'hand', rarity, design: { shape, colors, ...(variant ? { variant } : {}) },
})

const pet = (key: string, name: string, rarity: CatalogItem['rarity'], shape: string, colors: string[], variant?: Record<string, string>): CatalogItem => ({
  item_key: `pet_${key}`, item_name: name, item_type: 'pet', rarity, design: { shape, colors, ...(variant ? { variant } : {}) },
})

export const NEW_SHAPE_ITEMS: CatalogItem[] = [
  // ---- มังกร 12 แบบ (หัว × ลำตัว × ธาตุ) ----
  dragon('gold_coil', 'มังกรทองขดตัว', 'common', { head: 'eastern', body: 'coil', element: 'none' }, ['#facc15', '#f59e0b', '#dc2626']),
  dragon('jade_serpent', 'หลงหยกมรกต', 'rare', { head: 'eastern', body: 'serpent', element: 'jade' }, ['#34d399', '#059669', '#fde047']),
  dragon('fire_serpent', 'หลงเพลิงสุริยา', 'epic', { head: 'eastern', body: 'serpent', element: 'fire' }, ['#ef4444', '#f97316', '#fde047']),
  dragon('wave_coil', 'หลงขดคลื่นสมุทร', 'rare', { head: 'eastern', body: 'coil', element: 'water' }, ['#38bdf8', '#0ea5e9', '#e0f2fe']),
  dragon('lion_fire_coil', 'สิงห์มังกรขดเพลิง', 'rare', { head: 'lion', body: 'coil', element: 'fire' }, ['#f59e0b', '#b45309', '#dc2626']),
  dragon('lion_thunder', 'สิงห์มังกรอสนีบาต', 'epic', { head: 'lion', body: 'serpent', element: 'thunder' }, ['#6366f1', '#facc15', '#fde047']),
  dragon('lion_jade', 'สิงห์มังกรหยกขาว', 'legendary', { head: 'lion', body: 'coil', element: 'jade' }, ['#f1f5f9', '#34d399', '#fbbf24']),
  dragon('lion_plain', 'สิงห์มังกรสามัญ', 'common', { head: 'lion', body: 'serpent', element: 'none' }, ['#fb923c', '#b45309', '#7f1d1d']),
  dragon('fish_water', 'ยฺหวีหลงสายน้ำ', 'rare', { head: 'fish', body: 'serpent', element: 'water' }, ['#38bdf8', '#0ea5e9', '#e0f2fe']),
  dragon('fish_ice_coil', 'ยฺหวีหลงน้ำแข็งขด', 'epic', { head: 'fish', body: 'coil', element: 'ice' }, ['#bae6fd', '#7dd3fc', '#ffffff']),
  dragon('fish_thunder', 'ยฺหวีหลงฟ้าผ่า', 'epic', { head: 'fish', body: 'serpent', element: 'thunder' }, ['#a78bfa', '#facc15', '#fde047']),
  dragon('fish_fire_coil', 'ยฺหวีหลงมหาอัคคี', 'legendary', { head: 'fish', body: 'coil', element: 'fire' }, ['#fb923c', '#dc2626', '#fde047']),

  // ---- กระบี่ (ใบ × ด้าม × ออร่า) ----
  hand('jian_steel', 'กระบี่เหล็กกล้า', 'common', 'sword_chinese', ['#7c2d12', '#fbbf24', '#dc2626'], { blade: 'straight', aura: 'none' }),
  hand('jian_flame_fire', 'กระบี่เพลิงทะลวง', 'epic', 'sword_chinese', ['#7f1d1d', '#fbbf24', '#f97316'], { blade: 'flame', aura: 'fire' }),
  hand('jian_leaf_jade', 'กระบี่ใบไผ่หยก', 'rare', 'sword_chinese', ['#365314', '#fde047', '#34d399'], { blade: 'leaf', aura: 'jade', hilt: 'disc' }),
  hand('jian_crystal_ice', 'กระบี่คริสตัลน้ำแข็ง', 'epic', 'sword_chinese', ['#1e3a8a', '#bae6fd', '#38bdf8'], { blade: 'crystal', aura: 'ice' }),
  hand('jian_thunder', 'กระบี่สายฟ้า', 'rare', 'sword_chinese', ['#312e81', '#facc15', '#fde047'], { blade: 'straight', aura: 'thunder', hilt: 'disc' }),
  hand('jian_flame_thunder', 'กระบี่คลื่นอสนี', 'legendary', 'sword_chinese', ['#4c1d95', '#fbbf24', '#facc15'], { blade: 'flame', aura: 'thunder', hilt: 'disc' }),
  // ---- ดาบ ----
  hand('saber_ringed', 'ดาบเก้าห่วง', 'rare', 'saber', ['#7c2d12', '#fbbf24', '#dc2626'], { blade: 'ringed' }),
  hand('saber_broad_fire', 'ดาบกวนตาวสั้นเพลิง', 'epic', 'saber', ['#7f1d1d', '#fbbf24', '#f97316'], { blade: 'broad', aura: 'fire' }),
  hand('saber_curved_ice', 'ดาบจันทร์เสี้ยวน้ำแข็ง', 'epic', 'saber', ['#1e3a8a', '#bae6fd', '#38bdf8'], { blade: 'curved', aura: 'ice' }),
  // ---- อาวุธชนิดใหม่ ----
  hand('spear', 'หอกพู่แดง', 'common', 'spear', ['#92400e', '#9ca3af', '#dc2626']),
  hand('guandao', 'กวนตาวมังกรเขียว', 'epic', 'guandao', ['#65a30d', '#fbbf24', '#dc2626']),
  hand('twin_blades', 'ดาบคู่ผีเสื้อ', 'rare', 'twin_blades', ['#7c2d12', '#fbbf24', '#dc2626']),
  hand('whip', 'แส้เก้าท่อน', 'rare', 'whip', ['#7c2d12', '#fbbf24', '#dc2626']),
  hand('bow', 'ธนูเหินหาว', 'common', 'bow', ['#92400e', '#fbbf24', '#dc2626']),
  hand('pipa', 'ผีผาเสียงสวรรค์', 'rare', 'pipa', ['#b45309', '#fde68a', '#dc2626']),
  hand('meteor', 'ตุ้มดาวตก', 'epic', 'meteor', ['#7c2d12', '#64748b', '#dc2626']),
  hand('brush', 'พู่กันยักษ์บัณฑิต', 'common', 'brush', ['#65a30d', '#1f2937', '#dc2626']),
  hand('abacus', 'ลูกคิดวิเศษ', 'rare', 'abacus', ['#92400e', '#dc2626', '#fbbf24']),

  // ---- สัตว์นักษัตร/สัตว์มงคล (รูปทรงต่างกันทุกตัว) ----
  pet('tiger', 'เสือเหลืองปีขาล', 'common', 'tiger', ['#f59e0b', '#fff7ed', '#1f2937']),
  pet('tiger_white', 'เสือขาวสี่ทิศ', 'rare', 'tiger', ['#f1f5f9', '#ffffff', '#475569']),
  pet('horse', 'ม้าศึกปีมะเมีย', 'common', 'horse', ['#a16207', '#1f2937', '#3f3f46']),
  pet('monkey', 'ลิงคาดผมทอง', 'epic', 'monkey', ['#a16207', '#fde68a', '#fbbf24']),
  pet('ox', 'วัวเขียวปีฉลู', 'rare', 'ox', ['#6b8fb5', '#fde68a', '#1f2937']),
  pet('rooster', 'ไก่เพลิงปีระกา', 'rare', 'rooster', ['#f97316', '#fde047', '#dc2626']),
  pet('pig', 'หมูถือก้อนทองปีกุน', 'common', 'pig', ['#fbcfe8', '#f472b6', '#fbbf24']),
  pet('koi', 'ปลาคราฟกระโดดประตูมังกร', 'epic', 'koi', ['#fb923c', '#ffffff', '#dc2626']),
  pet('turtle', 'เต่าดำเสวียนอู่', 'legendary', 'turtle', ['#334155', '#94a3b8', '#16a34a']),
  pet('fox1', 'จิ้งจอกไฟ', 'common', 'fox', ['#f97316', '#ffffff', '#1f2937'], { tails: '1' }),
  pet('fox3', 'จิ้งจอกสามหาง', 'rare', 'fox', ['#f97316', '#ffffff', '#1f2937'], { tails: '3' }),
  pet('fox9_silver', 'จิ้งจอกเก้าหางเงิน', 'legendary', 'fox', ['#e5e7eb', '#ffffff', '#475569'], { tails: '9' }),
]

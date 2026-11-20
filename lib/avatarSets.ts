// =====================================================================
// 🎖️ ชุดเซ็ต (Set Bonus) — ใส่ไอเทมของธีมเดียวกันครบกี่ชิ้น ก็ปลดออร่าระดับนั้น
//   คำนวณจาก "รูปทรง (shape)" ของไอเทมที่ใส่อยู่ จึงใช้กับ SKU ไหนก็ได้ ไม่ต้องแก้ฐานข้อมูล
//   ระดับออร่า: ครบ 2 ชิ้น = ระดับ 1 · ครบ 3-4 ชิ้น = ระดับ 2 · ครบ 5 ชิ้น = ระดับ 3 (ชุดเต็ม)
// =====================================================================
import { SLOT_META, type AvatarConfig, type Slot } from './avatar'

export type AuraTheme =
  | 'gold' | 'phoenix' | 'sword' | 'ink' | 'flame' | 'lotus'
  | 'bagua' | 'mist' | 'petals' | 'leaves' | 'beams' | 'slash'

export interface SetDef {
  key: string
  name: string
  icon: string
  theme: AuraTheme
  /** ช่อง → รายการ shape ที่นับเป็นชิ้นของชุดนี้ (รวม key เก่าที่ถูกแปลงเป็นของจีน) */
  pieces: Partial<Record<Slot, string[]>>
}

export const SET_DEFS: SetDef[] = [
  { key: 'emperor', name: 'จักรพรรดิมังกร', icon: '👑', theme: 'gold',
    pieces: { outfit: ['imperial'], hat: ['imperial', 'crown'], hand: ['seal', 'trophy'], shoes: ['court'], pet: ['dragon'] } },
  { key: 'empress', name: 'ฮองเฮาหงส์ฟ้า', icon: '🦚', theme: 'phoenix',
    pieces: { outfit: ['empress'], hat: ['phoenix', 'catears'], hand: ['fan'], shoes: ['flower'], pet: ['phoenix'] } },
  { key: 'wuxia', name: 'จอมยุทธ์สายลม', icon: '⚔️', theme: 'sword',
    pieces: { outfit: ['wuxia'], hat: ['headband', 'douli'], hand: ['sword_chinese', 'sword', 'saber'], back: ['swords', 'backpack', 'cape'], shoes: ['cloud', 'magic', 'speed', 'kungfu'] } },
  { key: 'scholar', name: 'บัณฑิตจอหงวน', icon: '📜', theme: 'ink',
    pieces: { outfit: ['scholar', 'labcoat'], hat: ['scholar', 'cap', 'grad'], hand: ['scroll', 'brush', 'abacus', 'book'], pet: ['crane', 'penguin'], shoes: ['kungfu', 'sneaker'] } },
  { key: 'general', name: 'แม่ทัพศึก', icon: '🛡️', theme: 'flame',
    pieces: { outfit: ['general', 'armor', 'hero'], hat: ['general', 'helmet'], hand: ['guandao', 'spear', 'staff'], pet: ['horse', 'lion', 'dog'], shoes: ['boot', 'riding'] } },
  { key: 'monk', name: 'ศิษย์เส้าหลิน', icon: '🪷', theme: 'lotus',
    pieces: { outfit: ['monk'], hand: ['staff', 'flywhisk', 'wand'], pet: ['panda'], pants: ['trousers', 'chinese_pants', 'short', 'shorts'], shoes: ['kungfu', 'straw', 'wooden', 'sneaker'] } },
  { key: 'taoist', name: 'นักพรตเซียน', icon: '☯️', theme: 'bagua',
    pieces: { outfit: ['taoist', 'robe'], hat: ['taoist', 'wizard'], hand: ['flywhisk', 'wand', 'flute'], glasses: ['beard'], shoes: ['cloud', 'magic', 'speed'] } },
  { key: 'assassin', name: 'เงามืด', icon: '🌑', theme: 'mist',
    pieces: { outfit: ['assassin'], hat: ['bandana'], hand: ['twin_blades', 'whip', 'meteor'], glasses: ['mask', 'shades'], shoes: ['riding', 'boot'] } },
  { key: 'dancer', name: 'นางรำบุปผา', icon: '💃', theme: 'petals',
    pieces: { outfit: ['dancer'], hat: ['dancer', 'flowers', 'beanie'], hand: ['umbrella', 'fan'], glasses: ['huadian', 'veil', 'round', 'star', 'vr'], shoes: ['platform', 'flower'] } },
  { key: 'physician', name: 'หมอเทวดา', icon: '🌿', theme: 'leaves',
    pieces: { outfit: ['physician'], hat: ['physician'], hand: ['abacus', 'brush', 'flute'], pet: ['rabbit', 'robot', 'fox'], shoes: ['straw', 'wooden', 'kungfu'] } },
  { key: 'judge', name: 'ตุลาการเที่ยงธรรม', icon: '⚖️', theme: 'beams',
    pieces: { outfit: ['judge'], hat: ['judge'], hand: ['scroll', 'seal', 'brush', 'book', 'trophy'], back: ['cape'], shoes: ['court'] } },
  { key: 'jinyiwei', name: 'จิ่นอีเว่ย', icon: '🗡️', theme: 'slash',
    pieces: { outfit: ['jinyiwei'], hat: ['guard'], hand: ['saber', 'sword_chinese', 'twin_blades'], back: ['cape'], shoes: ['riding', 'boot'] } },
]

export interface SetProgress {
  def: SetDef
  count: number
  total: number
  tier: 0 | 1 | 2 | 3
  matched: Slot[]
  missing: Slot[]
}

export const tierOf = (count: number, total: number): 0 | 1 | 2 | 3 =>
  count >= total ? 3 : count >= 3 ? 2 : count >= 2 ? 1 : 0

/** หาชุดเซ็ตที่ใส่ใกล้ครบที่สุด (เสมอกัน → ตามลำดับใน SET_DEFS) คืน null ถ้ายังไม่มีชุดไหนถึง 2 ชิ้น */
export function detectSet(cfg: AvatarConfig): SetProgress | null {
  const equip = cfg.equip || {}
  let best: SetProgress | null = null
  for (const def of SET_DEFS) {
    const slots = Object.keys(def.pieces) as Slot[]
    const matched = slots.filter((s) => {
      const shape = equip[s]?.d?.shape
      return !!shape && def.pieces[s]!.includes(String(shape))
    })
    const p: SetProgress = {
      def, count: matched.length, total: slots.length, tier: tierOf(matched.length, slots.length),
      matched, missing: slots.filter((s) => !matched.includes(s)),
    }
    if (p.count >= 2 && (!best || p.count > best.count)) best = p
  }
  return best
}

export const slotLabel = (s: Slot) => SLOT_META.find((m) => m.key === s)?.label || s

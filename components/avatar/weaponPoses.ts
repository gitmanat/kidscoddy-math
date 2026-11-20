import type { FreePoseConfig } from '@/components/Character'

// =====================================================================
// 🎯 ท่าประจำอาวุธ — กดปุ่มเดียว ตัวละครตั้งท่าให้เข้ากับของที่ถืออยู่
//   ค่า: lArm/rArm = มุมแขน (แขนขวา ลบ = ยกออกด้านนอก) · hd = หมุนของในมือชดเชยมุมแขน (ให้ของตั้งตรง)
// =====================================================================
const ZERO = { x: 0, y: 0, deg: 0 }
const P = (o: { lArm?: number; rArm?: number; lLeg?: number; rLeg?: number; bodyY?: number; hx?: number; hy?: number; hd?: number }): FreePoseConfig => ({
  lArm: { x: 0, y: 0, deg: o.lArm ?? 0 },
  rArm: { x: 0, y: 0, deg: o.rArm ?? 0 },
  lLeg: { x: 0, y: 0, deg: o.lLeg ?? 0 },
  rLeg: { x: 0, y: 0, deg: o.rLeg ?? 0 },
  body: { x: 0, y: o.bodyY ?? 0, deg: 0 },
  hand: { x: o.hx ?? 0, y: o.hy ?? 0, deg: o.hd ?? 0 },
  pet: { ...ZERO },
})

const ALIAS: Record<string, string> = { sword: 'sword_chinese', wand: 'flywhisk', trophy: 'seal', book: 'scroll' }

export const WEAPON_POSES: Record<string, FreePoseConfig> = {
  sword_chinese: P({ lArm: 30, rArm: -40, lLeg: 16, rLeg: -10, bodyY: 3, hd: 27 }),
  saber: P({ lArm: 25, rArm: -45, lLeg: 14, rLeg: -12, bodyY: 3, hd: 31 }),
  twin_blades: P({ lArm: 40, rArm: -40, lLeg: 16, rLeg: -16, bodyY: 3, hd: 40 }),
  spear: P({ lArm: 18, rArm: -12, lLeg: 10, rLeg: -8, bodyY: 2, hd: 8 }),
  guandao: P({ lArm: 18, rArm: -12, lLeg: 10, rLeg: -8, bodyY: 2, hd: 8 }),
  staff: P({ lArm: 18, rArm: -15, lLeg: 10, rLeg: -8, bodyY: 2, hd: 10 }),
  bow: P({ lArm: -50, rArm: -42, lLeg: 10, rLeg: -6, bodyY: 2, hd: 36 }),
  fan: P({ lArm: 15, rArm: -50, hd: 48 }),
  flywhisk: P({ lArm: 20, rArm: -40, hd: 40 }),
  pipa: P({ lArm: -48, rArm: 48, bodyY: 2, hd: -40 }),
  brush: P({ lArm: 14, rArm: -55, hd: 45 }),
  abacus: P({ lArm: -50, rArm: 50, bodyY: 2, hd: -48 }),
  whip: P({ lArm: 30, rArm: -80, lLeg: 18, rLeg: -14, bodyY: 3, hd: 70 }),
  meteor: P({ lArm: 25, rArm: -85, lLeg: 16, rLeg: -12, bodyY: 3, hd: 75 }),
  flute: P({ lArm: 10, rArm: -45, hd: 45 }),
  lantern: P({ lArm: 8, rArm: -20, hd: 20 }),
  umbrella: P({ lArm: 8, rArm: -18, hd: 14 }),
  seal: P({ lArm: -40, rArm: 40, bodyY: 2, hd: -40 }),
  scroll: P({ lArm: -30, rArm: -35, hd: 35 }),
}

/** ท่าประจำของอาวุธ/ของถือ shape นี้ (null ถ้าไม่มี) */
export const poseForWeapon = (shape?: string | null): FreePoseConfig | null => {
  if (!shape) return null
  return WEAPON_POSES[ALIAS[shape] || shape] || null
}

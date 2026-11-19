'use client'

import { useId, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  type AvatarConfig,
  type EquipEntry,
  type ItemDesign,
  type Slot,
  resolveBase,
  shade,
} from '@/lib/avatar'

// =====================================================================
// 🏯 ตัวละครหนังจีนโบราณ — ฮ่องเต้ / ฮองเฮา / สนม / จอมยุทธ์ / ขุนนาง / แม่ทัพ / พระ / นักพรต
// ท่าทางสำเร็จรูป (Presets) และ ชิ้นส่วนอิสระ (FreePose)
// =====================================================================
export type PosePresetKey = 'idle' | 'stance' | 'cheer' | 'stride' | 'salute' | 'sword'

export type PartTransform = {
  x: number
  y: number
  deg: number
}

export type FreePoseConfig = {
  lArm: PartTransform
  rArm: PartTransform
  lLeg: PartTransform
  rLeg: PartTransform
  body: PartTransform
  hand: PartTransform
  pet: PartTransform
}

const ZERO_PART: PartTransform = { x: 0, y: 0, deg: 0 }

export const DEFAULT_FREE_POSE: FreePoseConfig = {
  lArm: { ...ZERO_PART },
  rArm: { ...ZERO_PART },
  lLeg: { ...ZERO_PART },
  rLeg: { ...ZERO_PART },
  body: { ...ZERO_PART },
  hand: { ...ZERO_PART },
  pet: { ...ZERO_PART },
}

export const POSE_PRESETS: Record<PosePresetKey, { label: string; freePose: FreePoseConfig }> = {
  idle: {
    label: '🧍 ยืนสง่างาม',
    freePose: {
      ...DEFAULT_FREE_POSE,
    },
  },
  stance: {
    label: '🥋 ตั้งท่าจอมยุทธ์',
    freePose: {
      ...DEFAULT_FREE_POSE,
      lArm: { x: 0, y: 0, deg: 26 },
      rArm: { x: 0, y: 0, deg: -26 },
      lLeg: { x: 0, y: 0, deg: 8 },
      rLeg: { x: 0, y: 0, deg: -8 },
      body: { x: 0, y: 3, deg: 0 },
    },
  },
  salute: {
    label: '🙏 ประสานมือคารวะ',
    freePose: {
      ...DEFAULT_FREE_POSE,
      lArm: { x: 0, y: 0, deg: -55 },
      rArm: { x: 0, y: 0, deg: 55 },
      body: { x: 0, y: 2, deg: 0 },
    },
  },
  sword: {
    label: '⚔️ ชักกระบี่',
    freePose: {
      ...DEFAULT_FREE_POSE,
      lArm: { x: 0, y: 0, deg: 30 },
      rArm: { x: 0, y: 0, deg: -55 },
      lLeg: { x: 0, y: 0, deg: 16 },
      rLeg: { x: 0, y: 0, deg: -10 },
      body: { x: 0, y: 3, deg: 0 },
      hand: { x: 0, y: 0, deg: 35 }, // ของถือตามแขนขวาแล้ว จึงแค่เอียงเล็กน้อย
    },
  },
  cheer: {
    label: '🙌 ชัยชนะ!',
    freePose: {
      ...DEFAULT_FREE_POSE,
      lArm: { x: 0, y: 0, deg: 125 },
      rArm: { x: 0, y: 0, deg: -125 },
      lLeg: { x: 0, y: 0, deg: -4 },
      rLeg: { x: 0, y: 0, deg: 4 },
      body: { x: 0, y: -2, deg: 0 },
    },
  },
  stride: {
    label: '🏃 ก้าวเดินลุย',
    freePose: {
      ...DEFAULT_FREE_POSE,
      lArm: { x: 0, y: 0, deg: -20 },
      rArm: { x: 0, y: 0, deg: 20 },
      lLeg: { x: 0, y: 0, deg: 15 },
      rLeg: { x: 0, y: 0, deg: -15 },
      body: { x: 0, y: 1, deg: 0 },
    },
  },
}

const num = (v: unknown, fb = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fb
}

const normPart = (p: any): PartTransform => ({
  x: num(p?.x, 0),
  y: num(p?.y, 0),
  deg: num(p?.deg, 0),
})

function resolveFreePoseRaw(config: AvatarConfig): FreePoseConfig {
  const rawFree = (config as any)?.freePose
  if (rawFree && typeof rawFree === 'object') {
    return {
      lArm: normPart(rawFree.lArm),
      rArm: normPart(rawFree.rArm),
      lLeg: normPart(rawFree.lLeg),
      rLeg: normPart(rawFree.rLeg),
      body: normPart(rawFree.body),
      hand: normPart(rawFree.hand),
      pet: normPart(rawFree.pet),
    }
  }

  const rawPose = (config as any)?.pose
  if (typeof rawPose === 'string' && POSE_PRESETS[rawPose as PosePresetKey]) {
    return POSE_PRESETS[rawPose as PosePresetKey].freePose
  }
  if (rawPose && typeof rawPose === 'object') {
    return {
      lArm: { x: 0, y: 0, deg: num(rawPose.lArm, 0) },
      rArm: { x: 0, y: 0, deg: num(rawPose.rArm, 0) },
      lLeg: { x: 0, y: 0, deg: num(rawPose.lLeg, 0) },
      rLeg: { x: 0, y: 0, deg: num(rawPose.rLeg, 0) },
      body: { x: 0, y: num(rawPose.bodyY, 0), deg: 0 },
      hand: { ...ZERO_PART },
      pet: { ...ZERO_PART },
    }
  }

  return DEFAULT_FREE_POSE
}

/* ---------- ข้อมูลชิ้นส่วน + ขีดจำกัด (กันชุดฉีก/ขาหลุดชายเสื้อ) ---------- */
export type PartKey = keyof FreePoseConfig
export const PART_META: { key: PartKey; label: string; icon: string; deg: number; move: number }[] = [
  { key: 'lArm', label: 'แขนซ้าย', icon: '🫲', deg: 170, move: 0 },
  { key: 'rArm', label: 'แขนขวา', icon: '🫱', deg: 170, move: 0 },
  { key: 'lLeg', label: 'ขาซ้าย', icon: '🦵', deg: 22, move: 0 },
  { key: 'rLeg', label: 'ขาขวา', icon: '🦵', deg: 22, move: 0 },
  { key: 'body', label: 'ทั้งตัว', icon: '🧍', deg: 15, move: 30 },
  { key: 'hand', label: 'ของในมือ', icon: '🗡️', deg: 180, move: 60 },
  { key: 'pet', label: 'สัตว์มงคล', icon: '🐉', deg: 30, move: 70 },
]
// จุดหมุนของแขน/ขา (พิกัดเดียวกับ partTransformAttr)
const PIVOT: Partial<Record<PartKey, [number, number]>> = {
  lArm: [63, 156],
  rArm: [137, 156],
  lLeg: [87, 210],
  rLeg: [113, 210],
}
const clampN = (v: number, m: number) => Math.max(-m, Math.min(m, v))
export function clampPart(key: PartKey, p: PartTransform): PartTransform {
  const meta = PART_META.find((m) => m.key === key)!
  return {
    x: clampN(p.x, meta.move),
    y: clampN(p.y, key === 'body' ? 20 : meta.move),
    deg: clampN(p.deg, meta.deg),
  }
}
export function clampPose(fp: FreePoseConfig): FreePoseConfig {
  const out = {} as FreePoseConfig
  for (const m of PART_META) out[m.key] = clampPart(m.key, fp[m.key])
  return out
}
export function resolveFreePose(config: AvatarConfig): FreePoseConfig {
  return clampPose(resolveFreePoseRaw(config))
}

function partTransformAttr(p: PartTransform, pivotX: number, pivotY: number): string {
  return `translate(${pivotX + p.x} ${pivotY + p.y}) rotate(${p.deg}) translate(${-pivotX} ${-pivotY})`
}

// =====================================================================
// ตัวละครแบบแยกชิ้นส่วน (SVG)
// =====================================================================
type Palette = { c1: string; c2: string; c3: string }
const pal = (d: ItemDesign | undefined, fb: [string, string, string]): Palette => ({
  c1: d?.colors?.[0] || fb[0],
  c2: d?.colors?.[1] || fb[1],
  c3: d?.colors?.[2] || fb[2],
})

interface Ctx {
  skin: string
  skinDark: string
  uid: string
}

const GOLD = '#fbbf24'
const JADE = '#34d399'
const INK = '#1f2937'
const CHINESE_FONT = "'Noto Serif SC','Songti SC','STKaiti','KaiTi','SimSun',serif"

/* ---------- ชื่อ key เก่า → ชุดจีนใหม่ (ตัวละครที่เคยบันทึกไว้ยังใช้ได้) ---------- */
const TOP_ALIAS: Record<string, string> = {
  tee: 'commoner',
  hoodie: 'commoner',
  labcoat: 'scholar',
  hero: 'general',
  jersey: 'official',
  armor: 'general',
  robe: 'taoist',
}

const TOP_DEFAULTS: Record<string, [string, string, string]> = {
  imperial: ['#facc15', '#dc2626', '#fef3c7'], // ฮ่องเต้ (หลงเผา)
  empress: ['#dc2626', '#fbbf24', '#fde68a'], // ฮองเฮา
  concubine: ['#f9a8d4', '#f472b6', '#fde047'], // สนม
  wuxia: ['#1f2937', '#dc2626', '#fbbf24'], // จอมยุทธ์
  scholar: ['#e5e7eb', '#1e3a8a', '#fbbf24'], // บัณฑิต
  taoist: ['#f1f5f9', '#1f2937', '#fbbf24'], // นักพรต
  official: ['#b91c1c', '#fbbf24', '#fef08a'], // ขุนนาง
  general: ['#94a3b8', '#fbbf24', '#dc2626'], // แม่ทัพ
  monk: ['#f59e0b', '#b45309', '#7c2d12'], // พระเส้าหลิน
  commoner: ['#4f6fa8', '#e8d9b0', '#8b5e34'], // ชาวบ้าน/ศิษย์น้อย
}

type SleeveKind = 'wide' | 'flow' | 'armor' | 'short'
const SLEEVE: Record<string, SleeveKind> = {
  imperial: 'wide',
  empress: 'wide',
  concubine: 'wide',
  scholar: 'wide',
  taoist: 'wide',
  official: 'wide',
  wuxia: 'flow',
  monk: 'flow',
  general: 'armor',
  commoner: 'short',
}

function topPal(d?: ItemDesign) {
  const raw = d?.shape || 'commoner'
  const shape = TOP_ALIAS[raw] || raw
  const key = TOP_DEFAULTS[shape] ? shape : 'commoner'
  return { shape: key, ...pal(d, TOP_DEFAULTS[key]) }
}

/* ปกเสื้อไขว้ (เจียวหลิ่ง) */
function Lapel({ c, w = 4, y2 = 196 }: { c: string; w?: number; y2?: number }) {
  return (
    <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M84 143 L102 171" />
      <path d={`M116 143 Q108 162 86 ${y2}`} />
    </g>
  )
}

/* ============================ ชุด (ลำตัว) ============================ */
function Top({ d, ctx }: { d?: ItemDesign; ctx: Ctx }) {
  const { shape, c1, c2, c3 } = topPal(d)
  const neck = ctx.skinDark
  const g = `${ctx.uid}-top`
  const edge = shade(c1, -28)

  switch (shape) {
    /* ---------- ฮ่องเต้ : หลงเผาสีเหลืองทอง ปักมังกร ---------- */
    case 'imperial':
      return (
        <g>
          <path d="M70 147 Q100 137 130 147 L149 268 Q100 280 51 268 Z" fill={c1} stroke={edge} strokeWidth="1.5" />
          <path d="M86 146 L100 168 L114 146 Z" fill={neck} />
          <path d="M80 144 Q100 172 120 144" fill="none" stroke={c2} strokeWidth="6" strokeLinecap="round" />
          {/* ตรามังกรกลมกลางอก */}
          <circle cx="100" cy="182" r="15" fill={shade(c1, 8)} stroke={c3} strokeWidth="2" />
          <path d="M90 187 Q92 172 102 174 Q111 176 108 184 Q105 191 97 188" fill="none" stroke={c2} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="90" cy="188" r="2.4" fill={c2} />
          <path d="M108 174 L113 171 M109 178 L114 178" stroke={c2} strokeWidth="1.6" strokeLinecap="round" />
          {/* สายคาดเอวหยก */}
          <rect x="68" y="199" width="64" height="10" rx="4" fill={c2} stroke={shade(c2, -25)} strokeWidth="1" />
          <rect x="91" y="196" width="18" height="16" rx="3" fill={JADE} stroke={c3} strokeWidth="1.4" />
          <circle cx="100" cy="204" r="3" fill={c3} />
          {/* ตรามังกรชายล่าง + ลายคลื่น */}
          <circle cx="82" cy="238" r="9" fill={shade(c1, 8)} stroke={c3} strokeWidth="1.5" />
          <circle cx="118" cy="238" r="9" fill={shade(c1, 8)} stroke={c3} strokeWidth="1.5" />
          <circle cx="82" cy="238" r="3" fill={c2} />
          <circle cx="118" cy="238" r="3" fill={c2} />
          <path d="M57 256 q6 -8 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" fill="none" stroke={c3} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M51 261 Q100 275 149 261 L149 269 Q100 283 51 269 Z" fill={c2} />
        </g>
      )

    /* ---------- ฮองเฮา : ชุดคลุมยาวปักหงส์ ---------- */
    case 'empress':
      return (
        <g>
          <path d="M72 147 Q100 138 128 147 L148 266 Q100 278 52 266 Z" fill={c1} stroke={edge} strokeWidth="1.4" />
          <path d="M86 146 L101 174 L114 146 Z" fill={neck} />
          <Lapel c="#fff7ed" w={5} y2={190} />
          <path d="M80 143 L100 182 M120 143 Q108 168 82 198" fill="none" stroke={c2} strokeWidth="3.4" strokeLinecap="round" />
          {/* สายรัดอกกว้าง */}
          <path d="M71 188 Q100 197 129 188 L130 204 Q100 214 70 204 Z" fill={c2} stroke={shade(c2, -25)} strokeWidth="1.2" />
          <circle cx="100" cy="200" r="5" fill={c3} stroke={shade(c3, -25)} strokeWidth="1" />
          {/* พู่ + หยกห้อย */}
          <path d="M100 208 V226" stroke={c3} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="100" cy="230" r="4.2" fill={JADE} stroke={c3} strokeWidth="1" />
          {/* หงส์ปักชายกระโปรง */}
          <path d="M100 252 Q86 244 80 230 Q92 234 100 244 Q108 234 120 230 Q114 244 100 252 Z" fill={c3} opacity=".95" />
          <path d="M100 250 Q94 262 84 264 M100 250 Q106 262 116 264" fill="none" stroke={c3} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="100" cy="238" r="2" fill={c2} />
          <path d="M52 259 Q100 273 148 259 L148 267 Q100 281 52 267 Z" fill={c2} />
          <path d="M60 262 L60 268 M76 266 L76 272 M92 269 L92 275 M108 269 L108 275 M124 266 L124 272 M140 262 L140 268" stroke={c3} strokeWidth="2" strokeLinecap="round" />
        </g>
      )

    /* ---------- สนม : เสื้อรัดอก + กระโปรงบาน + ผ้าคาดโบว์ ---------- */
    case 'concubine':
      return (
        <g>
          <path d="M72 147 Q100 138 128 147 L130 192 Q100 198 70 192 Z" fill={c1} stroke={edge} strokeWidth="1.2" />
          <path d="M86 146 L101 172 L114 146 Z" fill={neck} />
          <path d="M84 143 L102 176 M116 143 Q108 160 88 190" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" opacity=".95" />
          <path d="M70 192 Q100 200 130 192 L152 268 Q100 282 48 268 Z" fill={c2} stroke={shade(c2, -22)} strokeWidth="1.2" />
          <path d="M86 200 L72 266 M100 202 V274 M114 200 L128 266" stroke={shade(c2, -18)} strokeWidth="1.2" opacity=".6" />
          {/* ดอกไม้ปักบนกระโปรง */}
          {[[78, 240], [122, 246], [92, 258], [108, 226]].map(([x, y], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={x + 3.6 * Math.cos((a * Math.PI) / 180)} cy={y + 3.6 * Math.sin((a * Math.PI) / 180)} r="2.4" fill="#fff" opacity=".85" />
              ))}
              <circle cx={x} cy={y} r="1.8" fill={c3} />
            </g>
          ))}
          {/* ผ้าคาดเอวสูง + โบว์ */}
          <path d="M69 188 Q100 197 131 188 L131 196 Q100 205 69 196 Z" fill={c3} stroke={shade(c3, -25)} strokeWidth="1" />
          <path d="M100 198 L86 210 L95 213 Z M100 198 L114 210 L105 213 Z" fill={c3} stroke={shade(c3, -25)} strokeWidth="1" />
          <path d="M99 200 L94 232 M101 200 L108 230" stroke={c3} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M49 262 Q100 276 151 262 L151 269 Q100 283 49 269 Z" fill={c1} />
        </g>
      )

    /* ---------- จอมยุทธ์ : ชุดกังฟูผ่าข้าง คาดเอว ห้อยหยก ---------- */
    case 'wuxia':
      return (
        <g>
          <path d="M72 147 Q100 138 128 147 L146 266 Q100 278 54 266 Z" fill={c1} stroke={shade(c1, -25)} strokeWidth="1.4" />
          <path d="M86 144 L103 170 L115 144 Z" fill={neck} />
          <Lapel c={c2} w={4.2} y2={192} />
          <rect x="69" y="192" width="62" height="10" rx="4" fill={c2} stroke={shade(c2, -25)} strokeWidth="1" />
          <rect x="94" y="190" width="12" height="14" rx="2.5" fill={c3} />
          <path d="M100 204 V216" stroke={c3} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="219" r="3.5" fill={JADE} stroke={shade(c3, -20)} strokeWidth="1" />
          <path d="M118 204 Q124 230 120 258" fill="none" stroke={shade(c1, -22)} strokeWidth="1.2" />
          <path d="M54 260 Q100 274 146 260 L146 267 Q100 281 54 267 Z" fill={c2} />
        </g>
      )

    /* ---------- บัณฑิต : เสื้อคลุมขาว ปกสีเข้ม ---------- */
    case 'scholar':
      return (
        <g>
          <path d="M72 147 Q100 138 128 147 L148 264 Q100 276 52 264 Z" fill={c1} stroke={shade(c1, -22)} strokeWidth="1.3" />
          <path d="M86 145 L101 172 L114 145 Z" fill={neck} />
          <path d="M84 143 L102 171 M116 143 Q108 162 86 198" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Lapel c={c2} w={3.4} y2={198} />
          <rect x="71" y="196" width="58" height="10" rx="4" fill={c2} />
          <path d="M100 206 V226" stroke={c3} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="100" cy="230" r="4" fill={c3} stroke={shade(c3, -25)} strokeWidth="1" />
          {/* ลายไผ่ */}
          <path d="M72 226 V262 M76 232 q6 -3 9 -8 M76 246 q6 -3 9 -8" fill="none" stroke={shade(c1, -28)} strokeWidth="2" strokeLinecap="round" opacity=".6" />
          <path d="M52 258 Q100 272 148 258 L148 266 Q100 280 52 266 Z" fill={c2} />
        </g>
      )

    /* ---------- นักพรต : เสื้อคลุมขาว ลายไท่เก๊ก ---------- */
    case 'taoist':
      return (
        <g>
          <path d="M72 147 Q100 138 128 147 L148 264 Q100 276 52 264 Z" fill={c1} stroke={shade(c1, -22)} strokeWidth="1.3" />
          <path d="M86 145 L101 172 L114 145 Z" fill={neck} />
          <Lapel c={c2} w={4.4} y2={196} />
          <rect x="71" y="194" width="58" height="10" rx="4" fill={c2} />
          <path d="M100 204 L94 218 L100 214 L106 218 Z" fill={c3} />
          {/* ไท่เก๊ก */}
          <circle cx="100" cy="236" r="13" fill="#fff" stroke={c2} strokeWidth="1.6" />
          <path d="M100 223 A13 13 0 0 1 100 249 A6.5 6.5 0 0 1 100 236 A6.5 6.5 0 0 0 100 223 Z" fill={c2} />
          <circle cx="100" cy="229.5" r="2.2" fill="#fff" />
          <circle cx="100" cy="242.5" r="2.2" fill={c2} />
          <path d="M52 258 Q100 272 148 258 L148 266 Q100 280 52 266 Z" fill={c2} />
        </g>
      )

    /* ---------- ขุนนาง : เสื้อคอกลม ป้ายยศ (ปู่จื่อ) ---------- */
    case 'official':
      return (
        <g>
          <path d="M71 147 Q100 138 129 147 L148 268 Q100 280 52 268 Z" fill={c1} stroke={edge} strokeWidth="1.4" />
          <path d="M86 146 Q100 166 114 146 Z" fill={neck} />
          <path d="M80 144 Q100 170 120 144" fill="none" stroke={c2} strokeWidth="5" strokeLinecap="round" />
          {/* ป้ายยศรูปนกกระเรียน */}
          <rect x="83" y="164" width="34" height="32" rx="3" fill={c2} stroke={c3} strokeWidth="1.6" />
          <circle cx="100" cy="174" r="5" fill={c3} />
          <path d="M92 184 Q100 178 108 184 M100 184 V191 M95 191 H105" fill="none" stroke={c1} strokeWidth="2.2" strokeLinecap="round" />
          {/* สายรัดเอวแข็ง + แผ่นหยก */}
          <rect x="67" y="200" width="66" height="11" rx="3" fill="#1f2937" stroke={c2} strokeWidth="1.2" />
          {[76, 88, 100, 112, 124].map((x) => (
            <rect key={x} x={x - 4} y="202" width="8" height="7" rx="1.5" fill={x === 100 ? JADE : c2} />
          ))}
          <path d="M54 262 Q100 276 146 262 L146 269 Q100 283 54 269 Z" fill="#1f2937" />
        </g>
      )

    /* ---------- แม่ทัพ : เกราะเกล็ด ตรากระจกอก กระโปรงเกราะ ---------- */
    case 'general':
      return (
        <g>
          <defs>
            <linearGradient id={g} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor={shade(c1, 35)} />
              <stop offset="0.5" stopColor={c1} />
              <stop offset="1" stopColor={shade(c1, -28)} />
            </linearGradient>
          </defs>
          {/* ผ้าแดงใต้เกราะ */}
          <path d="M66 236 Q100 252 134 236 L144 268 Q100 282 56 268 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1.2" />
          <path d="M71 148 Q100 138 129 148 L128 202 Q100 214 72 202 Z" fill={`url(#${g})`} stroke={shade(c1, -35)} strokeWidth="1.5" />
          {/* เกล็ดเกราะ */}
          <g fill="none" stroke={shade(c1, -32)} strokeWidth="1.2" opacity=".75">
            <path d="M76 158 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0" />
            <path d="M75 168 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0" />
            <path d="M76 190 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0 q4.5 5 9 0" />
          </g>
          <circle cx="100" cy="178" r="11.5" fill={c2} stroke={shade(c2, -30)} strokeWidth="1.5" />
          <circle cx="100" cy="178" r="6" fill="none" stroke={shade(c2, -30)} strokeWidth="1.3" />
          <circle cx="100" cy="178" r="2.2" fill={c3} />
          <rect x="68" y="198" width="64" height="11" rx="3" fill={c2} stroke={shade(c2, -30)} strokeWidth="1.2" />
          <path d="M94 198 H106 L108 209 H92 Z" fill={c3} stroke={shade(c3, -30)} strokeWidth="1" />
          <path d="M72 208 H128 L137 244 Q100 255 63 244 Z" fill={`url(#${g})`} stroke={shade(c1, -35)} strokeWidth="1.5" />
          <path d="M100 209 V250 M86 209 L82 248 M114 209 L118 248" stroke={shade(c1, -30)} strokeWidth="1.2" />
          <path d="M84 142 Q100 154 116 142 L121 151 Q100 166 79 151 Z" fill={c2} stroke={shade(c2, -30)} strokeWidth="1.2" />
        </g>
      )

    /* ---------- พระเส้าหลิน : จีวรสีส้ม ลูกประคำ ---------- */
    case 'monk':
      return (
        <g>
          <path d="M72 147 Q100 138 128 147 L146 262 Q100 274 54 262 Z" fill={c1} stroke={shade(c1, -25)} strokeWidth="1.4" />
          <path d="M86 144 L102 172 L115 144 Z" fill={neck} />
          <Lapel c={c2} w={5} y2={200} />
          <path d="M70 200 Q100 210 130 200 L131 212 Q100 222 69 212 Z" fill={c2} stroke={shade(c2, -25)} strokeWidth="1" />
          <path d="M100 210 L92 232 M100 210 L108 232" stroke={c2} strokeWidth="4" strokeLinecap="round" />
          {/* ลูกประคำ */}
          <ellipse cx="100" cy="168" rx="19" ry="25" fill="none" stroke={c3} strokeWidth="4.2" strokeDasharray="0.1 6.4" strokeLinecap="round" />
          <path d="M54 258 Q100 272 146 258 L146 264 Q100 278 54 264 Z" fill={c2} />
        </g>
      )

    /* ---------- ชาวบ้าน / ศิษย์น้อย (ชุดเริ่มต้น) ---------- */
    default:
      return (
        <g>
          <path d="M70 149 Q70 143 81 143 H119 Q130 143 130 149 L131 214 Q100 223 69 214 Z" fill={c1} stroke={shade(c1, -22)} strokeWidth="1.2" />
          <path d="M86 144 L102 172 L115 144 Z" fill={neck} />
          <Lapel c={c2} w={4} y2={204} />
          <path d="M69 206 Q100 215 131 206 L131 213 Q100 222 69 213 Z" fill={c3} />
          <path d="M100 212 L95 224 M100 212 L106 222" stroke={c3} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M80 170 Q100 178 120 170" fill="none" stroke={shade(c1, -12)} strokeWidth="1.3" opacity=".45" />
        </g>
      )
  }
}

/* ============================ แขน + แขนเสื้อ (หมุนตามแขน) ============================ */
// วาดเป็นแขนซ้าย แล้วใช้ mirror สำหรับแขนขวา
function Arm({ top, skin }: { top: ItemDesign; skin: string }) {
  const { shape, c1, c2, c3 } = topPal(top)
  const kind = SLEEVE[shape] || 'short'
  const edge = shade(c1, -26)
  const ex = shape === 'imperial' ? 7 : shape === 'empress' ? 3 : 0

  return (
    <g>
      <rect x="54" y="151" width="18" height="62" rx="9" fill={skin} />
      <circle cx="63" cy="215" r="9" fill={skin} />

      {kind === 'wide' && (
        <g>
          <path
            d={`M52 149 L74 149 L74 198 Q75 216 ${78 + ex} 230 Q62 240 ${44 - ex} 230 Q51 214 52 196 Z`}
            fill={c1}
            stroke={edge}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d={`M${44 - ex} 230 Q62 240 ${78 + ex} 230 L${77 + ex} 222 Q62 232 ${45 - ex} 222 Z`} fill={c2} />
          {shape === 'imperial' && (
            <g>
              <circle cx="62" cy="200" r="6" fill="none" stroke={c3} strokeWidth="1.6" />
              <circle cx="62" cy="200" r="2" fill={c2} />
            </g>
          )}
          {shape === 'concubine' && <path d="M56 156 Q64 190 52 226" fill="none" stroke={c3} strokeWidth="2.4" strokeLinecap="round" opacity=".8" />}
          {shape === 'empress' && <path d="M60 196 q3 -4 6 0 t6 0" fill="none" stroke={c3} strokeWidth="1.6" strokeLinecap="round" />}
        </g>
      )}

      {kind === 'flow' && (
        <g>
          <path d="M52 149 L74 149 L73 196 Q75 206 72 210 L52 210 Q51 204 52 194 Z" fill={c1} stroke={edge} strokeWidth="1.2" strokeLinejoin="round" />
          <rect x="51" y="199" width="23" height="11" rx="4" fill={c2} stroke={shade(c2, -25)} strokeWidth="1" />
          <path d="M53 203 H72 M53 207 H72" stroke={c3} strokeWidth="1.2" opacity=".7" />
        </g>
      )}

      {kind === 'armor' && (
        <g>
          <rect x="54" y="151" width="18" height="40" rx="6" fill="#991b1b" />
          <ellipse cx="55" cy="153" rx="17" ry="14" fill={shade(c1, 8)} stroke={shade(c1, -35)} strokeWidth="1.5" />
          <path d="M42 156 Q55 164 68 156" fill="none" stroke={c2} strokeWidth="3" strokeLinecap="round" />
          <circle cx="55" cy="150" r="3" fill={c2} />
          <rect x="50" y="190" width="23" height="23" rx="7" fill={shade(c1, 8)} stroke={shade(c1, -35)} strokeWidth="1.5" />
          <path d="M52 198 H71 M52 205 H71" stroke={c2} strokeWidth="2" />
        </g>
      )}

      {kind === 'short' && (
        <g>
          <path d="M53 150 L73 150 L72 184 L52 184 Z" fill={c1} stroke={edge} strokeWidth="1" />
          <rect x="51" y="178" width="23" height="8" rx="3" fill={c2} />
        </g>
      )}
    </g>
  )
}

/* ============================ กางเกง / ขา ============================ */
const LEG_ALIAS: Record<string, string> = {
  chinese_pants: 'trousers',
  jeans: 'trousers',
  shorts: 'short',
  skirt: 'silk',
  magic: 'silk',
  knight: 'greaves',
}

// วาดเป็นขาซ้าย แล้ว mirror สำหรับขาขวา
function LegWear({ d, skin }: { d?: ItemDesign; skin: string }) {
  const raw = d?.shape || 'trousers'
  const shape = LEG_ALIAS[raw] || raw
  const { c1, c2, c3 } = pal(d, ['#6b7280', '#e8d9b0', '#8b5e34'])
  const edge = shade(c1, -24)

  return (
    <g>
      <rect x="77" y="206" width="21" height="76" rx="10" fill={skin} />
      {shape === 'short' && (
        <g>
          <rect x="74" y="204" width="27" height="44" rx="9" fill={c1} stroke={edge} strokeWidth="1" />
          <rect x="74" y="240" width="27" height="8" rx="3" fill={c2} />
        </g>
      )}
      {shape === 'silk' && (
        <g>
          <path d="M72 204 H102 L107 272 Q88 279 69 272 Z" fill={c1} stroke={edge} strokeWidth="1.1" />
          <path d="M69 262 Q88 270 107 262 L107 272 Q88 279 69 272 Z" fill={c2} />
          <path d="M82 214 Q88 240 80 262" fill="none" stroke={c3} strokeWidth="2" strokeLinecap="round" opacity=".7" />
        </g>
      )}
      {shape === 'greaves' && (
        <g>
          <path d="M74 204 H101 L102 266 H73 Z" fill="#7f1d1d" />
          <rect x="74" y="226" width="27" height="40" rx="7" fill={c1} stroke={shade(c1, -35)} strokeWidth="1.3" />
          <ellipse cx="87.5" cy="230" rx="12" ry="8" fill={c2} stroke={shade(c2, -30)} strokeWidth="1.2" />
          <path d="M87 238 V264" stroke={c3} strokeWidth="2" />
        </g>
      )}
      {(shape === 'trousers' || !['short', 'silk', 'greaves'].includes(shape)) && (
        <g>
          <path d="M74 204 H101 L102 264 H73 Z" fill={c1} stroke={edge} strokeWidth="1.1" />
          {/* ผ้าพันขา */}
          <rect x="74" y="246" width="27" height="22" rx="4" fill={c2} stroke={shade(c2, -22)} strokeWidth="1" />
          <path d="M76 250 L99 258 M76 258 L99 266" stroke={c3} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

/* ============================ รองเท้า (วาดเป็นคู่) ============================ */
const SHOE_ALIAS: Record<string, string> = { sneaker: 'kungfu', speed: 'cloud', magic: 'cloud' }

function ShoeLeft({ d }: { d?: ItemDesign; ctx?: Ctx }) {
  const raw = d?.shape || 'kungfu'
  const shape = SHOE_ALIAS[raw] || raw
  const { c1, c2, c3 } = pal(d, ['#1f2937', '#e5e7eb', '#ffffff'])

  /* รองเท้าฟุตผ้า: ปลายงอน ลอยบนเมฆ */
  if (shape === 'cloud') {
    return (
      <g>
        <path d="M74 262 H99 L100 286 H70 Q60 284 56 270 Q64 270 68 280 L72 270 Z" fill={c1} stroke={shade(c1, -28)} strokeWidth="1" />
        <path d="M56 270 Q52 262 58 258 Q60 266 64 268 Z" fill={c2} />
        <rect x="72" y="260" width="29" height="7" rx="3" fill={c2} />
        <path d="M66 286 H101 V294 Q101 297 98 297 H70 Q64 297 66 289 Z" fill={c3} stroke={shade(c3, -22)} strokeWidth="1" />
        {/* ลายเมฆมงคล */}
        <path d="M80 276 q4 -6 8 -1 q5 -4 6 2 q-3 4 -8 2 q-4 3 -6 -3 Z" fill="none" stroke={c2} strokeWidth="1.4" strokeLinejoin="round" />
        {d?.glow && (
          <g fill="#ffffff" opacity=".85">
            <circle cx="62" cy="298" r="5" />
            <circle cx="50" cy="296" r="4" />
            <circle cx="40" cy="299" r="3" />
            <circle cx="76" cy="300" r="4.5" />
          </g>
        )}
      </g>
    )
  }

  /* รองเท้าขุนนาง: บู๊ตดำพื้นขาวหนา */
  if (shape === 'court') {
    return (
      <g>
        <path d="M74 256 H99 L100 284 H66 Q61 282 64 276 L74 268 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1" />
        <rect x="72" y="254" width="29" height="7" rx="3" fill={c2} />
        <path d="M63 284 H102 V294 Q102 297 99 297 H66 Q61 297 63 290 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M78 270 H96" stroke={shade(c1, 25)} strokeWidth="1.4" opacity=".6" />
      </g>
    )
  }

  /* รองเท้าสตรี: ปลายแหลมงอน ปักดอกไม้ ประดับไข่มุก */
  if (shape === 'flower') {
    return (
      <g>
        <path d="M74 264 H99 L100 286 H68 Q56 284 52 270 Q62 272 68 280 L72 272 Z" fill={c1} stroke={shade(c1, -25)} strokeWidth="1" />
        <circle cx="52" cy="269" r="3.2" fill="#fff" stroke="#cbd5e1" strokeWidth="1" />
        <path d="M66 286 H101 V294 Q101 297 98 297 H70 Q64 297 66 289 Z" fill={c3} stroke={shade(c3, -22)} strokeWidth="1" />
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={84 + 3.4 * Math.cos((a * Math.PI) / 180)} cy={277 + 3.4 * Math.sin((a * Math.PI) / 180)} r="2.2" fill={c2} />
        ))}
        <circle cx="84" cy="277" r="1.6" fill={GOLD} />
      </g>
    )
  }

  if (shape === 'boot') {
    return (
      <g>
        <path d="M74 258 H99 L100 286 H68 Q64 282 70 278 L74 270 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1" />
        <rect x="72" y="256" width="29" height="8" rx="3" fill={c2} />
        <path d="M64 286 H101 V294 Q101 297 98 297 H68 Q63 297 64 291 Z" fill={c3} />
        <path d="M78 270 H96 M78 276 H96" stroke={shade(c1, -20)} strokeWidth="1.6" />
      </g>
    )
  }

  /* kungfu — รองเท้าผ้ากังฟู (ค่าเริ่มต้น) */
  return (
    <g>
      <path d="M74 264 H99 L100 286 H67 Q63 282 69 277 L74 269 Z" fill={c1} stroke={shade(c1, -25)} strokeWidth="1.1" />
      <path d="M71 274 H98" stroke={c2} strokeWidth="2.5" />
      <path d="M63 286 H101 V294 Q101 297 98 297 H67 Q62 297 63 291 Z" fill={c3} stroke={shade(c3, -20)} strokeWidth="1" />
    </g>
  )
}

/* ============================ ผม ============================ */
const HAIR_ALIAS: Record<string, string> = {
  spiky: 'topknot',
  short: 'topknot',
  curly: 'concubine',
  default: 'topknot',
}
const hairKey = (s: string) => HAIR_ALIAS[s] || s

function HairBack({ style, color }: { style: string; color: string }) {
  const dk = shade(color, -18)
  const common = { fill: color, stroke: dk, strokeWidth: 1.5, strokeLinejoin: 'round' as const }
  switch (hairKey(style)) {
    /* มวยผมสูงของชาย (จี้) */
    case 'topknot':
      return (
        <g {...common}>
          <path d="M92 52 Q90 40 100 38 Q110 40 108 52 Z" />
          <ellipse cx="100" cy="30" rx="14" ry="11" />
        </g>
      )
    /* ผมหางม้าสูงของนักดาบ */
    case 'ponytail':
      return (
        <path
          d="M108 54 Q150 26 170 68 Q182 112 160 158 Q156 124 146 98 Q140 74 112 64 Z"
          {...common}
        />
      )
    case 'bob':
      return <path d="M49 94 Q47 144 63 142 L137 142 Q153 144 151 94 Q151 46 100 46 Q49 46 49 94 Z" {...common} />
    case 'long':
      return <path d="M47 96 Q38 176 62 200 L138 200 Q162 176 153 96 Q153 44 100 44 Q47 44 47 96 Z" {...common} />
    /* สองมวย นางกำนัล */
    case 'twin':
      return (
        <g {...common}>
          <circle cx="62" cy="64" r="16" />
          <circle cx="138" cy="64" r="16" />
          <path d="M56 70 Q54 90 58 96 L66 84 Z" />
          <path d="M144 70 Q146 90 142 96 L134 84 Z" />
        </g>
      )
    /* ทรงฮองเฮา: มวยใหญ่หลายชั้น + ผมยาวด้านหลัง */
    case 'empress':
      return (
        <g {...common}>
          <path d="M49 96 Q40 150 64 176 L136 176 Q160 150 151 96 Z" />
          <ellipse cx="76" cy="40" rx="22" ry="14" transform="rotate(-16 76 40)" />
          <ellipse cx="124" cy="40" rx="22" ry="14" transform="rotate(16 124 40)" />
          <circle cx="100" cy="44" r="16" />
        </g>
      )
    /* ทรงสนม: มวยห่วงสองข้าง ผมยาวหลัง */
    case 'concubine':
      return (
        <g {...common}>
          <path d="M50 96 Q44 140 66 160 L134 160 Q156 140 150 96 Z" />
          <ellipse cx="62" cy="58" rx="17" ry="12" transform="rotate(-32 62 58)" />
          <ellipse cx="138" cy="58" rx="17" ry="12" transform="rotate(32 138 58)" />
        </g>
      )
    case 'bald':
      return null
    default:
      return null
  }
}

function HairFront({ style, color }: { style: string; color: string }) {
  const dk = shade(color, -18)
  const common = { fill: color, stroke: dk, strokeWidth: 1.5, strokeLinejoin: 'round' as const }
  const cap = 'M53 94 Q48 48 100 46 Q152 48 147 94 Q140 70 120 68 Q100 80 80 68 Q60 70 53 94 Z'
  switch (hairKey(style)) {
    case 'topknot':
      return (
        <g>
          <path d={cap} {...common} />
          <rect x="84" y="29" width="32" height="4" rx="2" fill={GOLD} stroke={shade(GOLD, -30)} strokeWidth="1" />
          <path d="M96 52 Q100 58 104 52" fill="none" stroke={dk} strokeWidth="1.4" />
        </g>
      )
    case 'ponytail':
      return (
        <g>
          <path d={cap} {...common} />
          <path d="M102 48 L122 42 L120 58 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
          <circle cx="112" cy="50" r="4" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
        </g>
      )
    case 'bob':
      return <path d="M54 92 Q52 50 100 48 Q148 50 146 92 Q138 70 100 70 Q62 70 54 92 Z" {...common} />
    case 'long':
      return <path d="M52 100 Q48 48 100 46 Q152 48 148 100 Q142 72 112 66 Q92 74 72 68 Q56 76 52 100 Z" {...common} />
    case 'twin':
      return (
        <g>
          <path d="M53 92 Q50 50 100 48 Q150 50 147 92 Q136 74 118 72 Q100 82 82 72 Q64 74 53 92 Z" {...common} />
          <path d="M48 68 Q62 80 76 68" fill="none" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M124 68 Q138 80 152 68" fill="none" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="62" cy="64" r="3" fill={GOLD} />
          <circle cx="138" cy="64" r="3" fill={GOLD} />
        </g>
      )
    case 'empress':
      return (
        <g>
          <path d="M52 100 Q48 48 100 46 Q152 48 148 100 Q146 80 128 68 Q100 76 72 68 Q54 80 52 100 Z" {...common} />
          {/* ปอยผมข้างแก้ม */}
          <path d="M56 92 Q52 114 60 134" fill="none" stroke={dk} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M144 92 Q148 114 140 134" fill="none" stroke={dk} strokeWidth="3.2" strokeLinecap="round" />
          {/* ปิ่นทอง */}
          <path d="M60 36 L38 28 M140 36 L162 28 M100 30 V16" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="38" cy="28" r="3.4" fill="#ef4444" stroke={GOLD} strokeWidth="1" />
          <circle cx="162" cy="28" r="3.4" fill="#ef4444" stroke={GOLD} strokeWidth="1" />
          <circle cx="100" cy="15" r="3.8" fill={JADE} stroke={GOLD} strokeWidth="1" />
        </g>
      )
    case 'concubine':
      return (
        <g>
          <path d="M52 100 Q48 48 100 46 Q152 48 148 100 Q144 78 124 70 Q100 80 76 70 Q56 78 52 100 Z" {...common} />
          <path d="M56 94 Q54 112 62 126" fill="none" stroke={dk} strokeWidth="3" strokeLinecap="round" />
          <path d="M144 94 Q146 112 138 126" fill="none" stroke={dk} strokeWidth="3" strokeLinecap="round" />
          {/* ดอกไม้ประดับมวย */}
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={62 + 5.5 * Math.cos((a * Math.PI) / 180)} cy={56 + 5.5 * Math.sin((a * Math.PI) / 180)} r="4" fill="#f9a8d4" stroke="#ec4899" strokeWidth=".8" />
          ))}
          <circle cx="62" cy="56" r="3" fill={GOLD} />
          <path d="M138 64 L152 44" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="152" cy="43" r="3.2" fill="#fff" stroke="#cbd5e1" strokeWidth="1" />
        </g>
      )
    case 'bald':
      return (
        <g>
          <path d={cap} fill={color} opacity=".14" />
          <ellipse cx="86" cy="66" rx="13" ry="6" fill="#fff" opacity=".22" />
          {/* รอยจุดศีรษะของพระเส้าหลิน */}
          <g fill={dk} opacity=".75">
            <circle cx="88" cy="58" r="2.2" />
            <circle cx="100" cy="55" r="2.2" />
            <circle cx="112" cy="58" r="2.2" />
          </g>
        </g>
      )
    default:
      return <path d={cap} {...common} />
  }
}

/* ============================ ใบหน้า ============================ */
function Face({
  eyes,
  mouth,
  animate,
  uid,
  hairColor,
}: {
  eyes: string
  mouth: string
  animate: boolean
  uid: string
  hairColor: string
}) {
  const ink = INK
  const brow = shade(hairColor || '#1f2937', -22)
  const eyeStyle = animate ? { transformBox: 'fill-box' as const, transformOrigin: 'center', animation: `${uid}-blink 4.5s infinite` } : undefined

  const eyeAt = (x: number, k: string) => {
    const left = x < 100
    if (eyes === 'happy') return <path key={k} d={`M${x - 7} 102 Q${x} 92 ${x + 7} 102`} fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
    if (eyes === 'sleepy') return <path key={k} d={`M${x - 7} 98 Q${x} 105 ${x + 7} 98`} fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
    if (eyes === 'sparkle')
      return (
        <g key={k} style={eyeStyle}>
          <ellipse cx={x} cy="100" rx="7" ry="9" fill={ink} />
          <circle cx={x + 2.2} cy="96" r="3" fill="#fff" />
          <circle cx={x - 2.5} cy="104" r="1.6" fill="#fff" />
        </g>
      )
    /* ตาหงส์ — หางตายกเฉียงขึ้น */
    if (eyes === 'phoenix')
      return (
        <g key={k} style={eyeStyle}>
          <ellipse cx={x} cy="100" rx="5.4" ry="5.6" fill={ink} />
          <circle cx={x + 1.8} cy="98" r="1.8" fill="#fff" />
          <path d={left ? `M${x - 7} 102 Q${x - 11} 100 ${x - 14} 94` : `M${x + 7} 102 Q${x + 11} 100 ${x + 14} 94`} fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
          <path d={`M${x - 6} 95 Q${x} 91 ${x + 6} 95`} fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )
    /* ตาคม จอมยุทธ์ */
    if (eyes === 'sword')
      return (
        <g key={k} style={eyeStyle}>
          <ellipse cx={x} cy="101" rx="5" ry="5.4" fill={ink} />
          <circle cx={x + 1.6} cy="99" r="1.7" fill="#fff" />
          <path d={`M${x - 8} 96 Q${x} 94 ${x + 8} 96`} fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )
    return (
      <g key={k} style={eyeStyle}>
        <ellipse cx={x} cy="100" rx="5.2" ry="6.6" fill={ink} />
        <circle cx={x + 1.8} cy="97.6" r="1.9" fill="#fff" />
      </g>
    )
  }

  const rightEye =
    eyes === 'wink' ? (
      <path key="r" d="M110 102 Q117 94 124 102" fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
    ) : (
      eyeAt(117, 'r')
    )
  const leftEye = eyeAt(83, 'l')

  /* คิ้ว */
  const browsEl =
    eyes === 'sword' ? (
      <g fill="none" stroke={brow} strokeWidth="4.4" strokeLinecap="round">
        <path d="M71 90 L94 84" />
        <path d="M106 84 L129 90" />
      </g>
    ) : eyes === 'phoenix' ? (
      <g fill="none" stroke={brow} strokeWidth="2.4" strokeLinecap="round">
        <path d="M70 88 Q82 80 96 87" />
        <path d="M104 87 Q118 80 130 88" />
      </g>
    ) : (
      <g fill="none" stroke={brow} strokeWidth="2.8" strokeLinecap="round" opacity=".85">
        <path d="M73 89 Q83 84 93 88" />
        <path d="M107 88 Q117 84 127 89" />
      </g>
    )

  return (
    <g>
      <ellipse cx="71" cy="112" rx="7.5" ry="4.8" fill="#fb7185" opacity=".38" />
      <ellipse cx="129" cy="112" rx="7.5" ry="4.8" fill="#fb7185" opacity=".38" />
      {browsEl}
      {leftEye}
      {rightEye}
      {mouth === 'grin' && (
        <g>
          <path d="M87 113 Q100 134 113 113 Z" fill="#7f1d1d" />
          <path d="M92 124 Q100 130 108 124 Q100 120 92 124 Z" fill="#fb7185" />
        </g>
      )}
      {mouth === 'cat' && <path d="M91 116 Q96 123 100 116 Q104 123 109 116" fill="none" stroke={ink} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />}
      {mouth === 'open' && <ellipse cx="100" cy="121" rx="6" ry="7.5" fill="#7f1d1d" />}
      {mouth === 'smirk' && <path d="M91 119 Q101 124 112 114" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />}
      {/* ปากแดงจิ๋ว สตรีโบราณ */}
      {mouth === 'rouge' && <path d="M93 116 Q100 111 107 116 Q100 125 93 116 Z" fill="#dc2626" stroke="#991b1b" strokeWidth=".8" />}
      {/* สงบนิ่ง ขรึม */}
      {mouth === 'calm' && <path d="M92 118 Q100 121 108 118" fill="none" stroke={ink} strokeWidth="2.8" strokeLinecap="round" />}
      {/* หนวดปลายงอน */}
      {mouth === 'mustache' && (
        <g>
          <path d="M100 113 Q92 107 80 112 Q78 118 86 117 Q94 116 100 117 Q106 116 114 117 Q122 118 120 112 Q108 107 100 113 Z" fill={brow} />
          <path d="M94 123 Q100 127 106 123" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
      {(mouth === 'smile' || !['grin', 'cat', 'open', 'smirk', 'rouge', 'calm', 'mustache'].includes(mouth)) && (
        <path d="M89 116 Q100 128 111 116" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      )}
    </g>
  )
}

/* ============================ หมวก / มงกุฎ / เครื่องประดับศีรษะ ============================ */
const HAT_ALIAS: Record<string, string> = {
  crown: 'imperial',
  catears: 'phoenix',
  grad: 'official',
  cap: 'scholar',
  wizard: 'taoist',
  helmet: 'general',
  beanie: 'flowers',
}

function Hat({ d, ctx }: { d?: ItemDesign; ctx: Ctx }) {
  const raw = d?.shape || 'scholar'
  const shape = HAT_ALIAS[raw] || raw
  const g = `${ctx.uid}-hat`

  switch (shape) {
    /* หมวกงอบไม้ไผ่ */
    case 'douli': {
      const { c1, c2, c3 } = pal(d, ['#d6b76a', '#a16207', '#ef4444'])
      return (
        <g>
          <path d="M22 72 Q100 88 178 72 L100 24 Z" fill={c1} stroke={shade(c1, -28)} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M100 24 L56 75 M100 24 L78 78 M100 24 L100 79 M100 24 L122 78 M100 24 L144 75" stroke={shade(c1, -18)} strokeWidth="1.1" opacity=".65" />
          <path d="M44 62 Q100 74 156 62 M60 48 Q100 58 140 48" fill="none" stroke={shade(c1, -18)} strokeWidth="1" opacity=".5" />
          <circle cx="100" cy="24" r="5" fill={c2} />
          <path d="M64 75 Q60 98 72 114 M136 75 Q140 98 128 114" fill="none" stroke={c3} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )
    }
    /* ผ้าคาดหัวจอมยุทธ์ */
    case 'headband': {
      const { c1, c2, c3 } = pal(d, ['#dc2626', '#fbbf24', '#fef08a'])
      return (
        <g>
          <path d="M52 74 Q100 64 148 74 L148 84 Q100 74 52 84 Z" fill={c1} stroke={shade(c1, -25)} strokeWidth="1.2" />
          <rect x="92" y="67" width="16" height="12" rx="3" fill={c2} stroke={shade(c3, -20)} strokeWidth="1" />
          <circle cx="100" cy="73" r="3" fill={c3} />
          <path d="M148 78 Q170 76 182 92 Q166 90 148 83 Z" fill={c1} />
          <path d="M148 82 Q166 88 174 106 Q160 98 146 84 Z" fill={shade(c1, -10)} />
        </g>
      )
    }
    /* มงกุฎฮ่องเต้ (เหมียนกวน) — แผ่นไม้ด้านบน + สายไข่มุกห้อย */
    case 'imperial': {
      const { c1, c2, c3 } = pal(d, ['#1f2937', '#facc15', '#ffffff'])
      return (
        <g>
          <path d="M62 66 Q58 44 70 42 H130 Q142 44 138 66 Q100 58 62 66 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.4" />
          <path d="M62 62 Q100 54 138 62" fill="none" stroke={c2} strokeWidth="3.4" />
          <rect x="38" y="32" width="124" height="11" rx="3.5" fill={c1} stroke={c2} strokeWidth="1.8" />
          <rect x="38" y="32" width="124" height="4" rx="2" fill="#ffffff" opacity=".12" />
          {/* สายไข่มุก 12 สาย */}
          {Array.from({ length: 12 }).map((_, i) => {
            const x = 44 + i * 10.2
            return (
              <g key={i}>
                <path d={`M${x} 43 V74`} stroke={c2} strokeWidth="1" />
                {[52, 60, 68].map((y) => (
                  <circle key={y} cx={x} cy={y} r="2.5" fill={i % 3 === 0 ? '#ef4444' : c3} stroke="#cbd5e1" strokeWidth=".5" />
                ))}
              </g>
            )
          })}
          <circle cx="100" cy="64" r="3" fill={JADE} />
        </g>
      )
    }
    /* มงกุฎหงส์ฮองเฮา (เฟิ่งกวน) */
    case 'phoenix': {
      const { c1, c2, c3 } = pal(d, ['#fbbf24', '#dc2626', '#34d399'])
      return (
        <g>
          <defs>
            <linearGradient id={g} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={shade(c1, 30)} />
              <stop offset="1" stopColor={shade(c1, -15)} />
            </linearGradient>
          </defs>
          <path d="M58 70 Q56 52 100 50 Q144 52 142 70 Q100 62 58 70 Z" fill={`url(#${g})`} stroke={shade(c1, -35)} strokeWidth="1.5" />
          {/* หงส์กลาง กางปีก */}
          <path d="M100 24 Q90 36 80 34 Q86 46 100 50 Q114 46 120 34 Q110 36 100 24 Z" fill={`url(#${g})`} stroke={shade(c1, -35)} strokeWidth="1.3" />
          <path d="M100 24 Q104 16 112 14 Q108 22 106 28" fill="none" stroke={c1} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="100" cy="38" r="3.4" fill={c2} />
          {/* ดอกไม้ข้าง */}
          {[72, 128].map((x) => (
            <g key={x}>
              <circle cx={x} cy="54" r="6.5" fill={c2} stroke={shade(c1, -25)} strokeWidth="1" />
              <circle cx={x} cy="54" r="2.4" fill={c1} />
            </g>
          ))}
          {/* อัญมณี */}
          {[84, 92, 108, 116].map((x) => (
            <circle key={x} cx={x} cy="64" r="2.6" fill={c3} />
          ))}
          {/* สายไข่มุกห้อยข้างแก้ม */}
          {[56, 62, 138, 144].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 68 V${112 + (i % 2) * 8}`} stroke={c1} strokeWidth="1" />
              {[78, 90, 102].map((y) => (
                <circle key={y} cx={x} cy={y} r="2.4" fill="#fff" stroke="#cbd5e1" strokeWidth=".6" />
              ))}
            </g>
          ))}
        </g>
      )
    }
    /* หมวกขุนนาง (อูซาเมา) — ปีกยาวสองข้าง */
    case 'official': {
      const { c1, c2, c3 } = pal(d, ['#1f2937', '#facc15', '#34d399'])
      return (
        <g>
          <rect x="6" y="52" width="56" height="10" rx="5" fill={c1} stroke={shade(c1, 30)} strokeWidth="1" />
          <rect x="138" y="52" width="56" height="10" rx="5" fill={c1} stroke={shade(c1, 30)} strokeWidth="1" />
          <path d="M60 70 Q56 34 100 32 Q144 34 140 70 Q100 62 60 70 Z" fill={c1} stroke={shade(c1, 30)} strokeWidth="1.2" />
          <path d="M60 66 Q100 58 140 66" fill="none" stroke={c2} strokeWidth="3.2" />
          <path d="M76 46 Q100 40 124 46" fill="none" stroke={shade(c1, 40)} strokeWidth="1.4" opacity=".5" />
          <circle cx="100" cy="62" r="4" fill={c3} stroke={c2} strokeWidth="1.2" />
        </g>
      )
    }
    /* มงกุฎดอกบัวของนักพรต (เหลียนฮวากวน) */
    case 'taoist': {
      const { c1, c2, c3 } = pal(d, ['#fde68a', '#92400e', '#ffffff'])
      return (
        <g>
          <path d="M62 68 Q60 54 100 52 Q140 54 138 68 Q100 62 62 68 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.3" />
          {/* กลีบบัว */}
          <path d="M100 16 Q110 34 100 54 Q90 34 100 16 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.2" />
          <path d="M82 28 Q96 38 94 54 Q78 46 82 28 Z" fill={shade(c1, -6)} stroke={shade(c1, -30)} strokeWidth="1.1" />
          <path d="M118 28 Q104 38 106 54 Q122 46 118 28 Z" fill={shade(c1, -6)} stroke={shade(c1, -30)} strokeWidth="1.1" />
          <path d="M66 40 Q82 46 90 54 Q70 56 66 40 Z" fill={shade(c1, -12)} stroke={shade(c1, -30)} strokeWidth="1" />
          <path d="M134 40 Q118 46 110 54 Q130 56 134 40 Z" fill={shade(c1, -12)} stroke={shade(c1, -30)} strokeWidth="1" />
          {/* ปิ่นปักผมเสียบขวาง */}
          <path d="M60 48 L140 48" stroke={c2} strokeWidth="3" strokeLinecap="round" />
          <circle cx="58" cy="48" r="3.4" fill={c3} stroke={c2} strokeWidth="1" />
          <circle cx="142" cy="48" r="3.4" fill={c3} stroke={c2} strokeWidth="1" />
        </g>
      )
    }
    /* หมวกแม่ทัพ + พู่แดง */
    case 'general': {
      const { c1, c2, c3 } = pal(d, ['#94a3b8', '#fbbf24', '#dc2626'])
      return (
        <g>
          <defs>
            <linearGradient id={g} x1="0" x2="1">
              <stop offset="0" stopColor={shade(c1, 32)} />
              <stop offset="0.55" stopColor={c1} />
              <stop offset="1" stopColor={shade(c1, -28)} />
            </linearGradient>
          </defs>
          {/* พู่แดง */}
          <path d="M100 30 Q84 16 70 26 Q82 28 82 42 Z" fill={c3} />
          <path d="M100 30 Q116 16 130 26 Q118 28 118 42 Z" fill={c3} />
          <circle cx="100" cy="30" r="8" fill={c3} stroke={shade(c3, -30)} strokeWidth="1" />
          <path d="M100 18 V30" stroke={c2} strokeWidth="3" strokeLinecap="round" />
          {/* ตัวหมวก + แผ่นป้องกันแก้ม */}
          <path d="M52 108 Q44 44 100 40 Q156 44 148 108 L138 112 L136 80 Q100 70 64 80 L62 112 Z" fill={`url(#${g})`} stroke={shade(c1, -35)} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M64 80 Q100 72 136 80" fill="none" stroke={c2} strokeWidth="4" />
          <rect x="95" y="40" width="10" height="38" rx="3" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <circle cx="100" cy="64" r="4" fill={c3} />
        </g>
      )
    }
    /* ปิ่นดอกโบตั๋น + ผีเสื้อ (สนม) */
    case 'flowers': {
      const { c1, c2, c3 } = pal(d, ['#f472b6', '#fbbf24', '#34d399'])
      return (
        <g>
          {/* ปิ่นทอง */}
          <path d="M60 62 L36 44 M150 62 L170 38" stroke={c2} strokeWidth="2.6" strokeLinecap="round" />
          {/* ใบ */}
          <path d="M122 62 Q112 52 104 60 Q112 70 122 62 Z" fill={c3} />
          <path d="M148 62 Q158 52 166 60 Q158 70 148 62 Z" fill={c3} />
          {/* โบตั๋นซ้อนกลีบ */}
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle key={a} cx={134 + 11 * Math.cos((a * Math.PI) / 180)} cy={58 + 11 * Math.sin((a * Math.PI) / 180)} r="9" fill={c1} stroke={shade(c1, -22)} strokeWidth="1" />
          ))}
          {[0, 90, 180, 270].map((a) => (
            <circle key={a} cx={134 + 5 * Math.cos((a * Math.PI) / 180)} cy={58 + 5 * Math.sin((a * Math.PI) / 180)} r="5.5" fill={shade(c1, 18)} stroke={shade(c1, -22)} strokeWidth=".8" />
          ))}
          <circle cx="134" cy="58" r="3.4" fill={c2} />
          {/* ผีเสื้อ */}
          <g transform="translate(62 50)">
            <path d="M0 0 Q-12 -12 -14 0 Q-12 8 0 2 Z" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
            <path d="M0 0 Q12 -12 14 0 Q12 8 0 2 Z" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
            <path d="M0 -3 V6" stroke={shade(c2, -45)} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M0 -3 Q-3 -9 -6 -9 M0 -3 Q3 -9 6 -9" fill="none" stroke={shade(c2, -45)} strokeWidth="1" />
          </g>
        </g>
      )
    }
    /* หมวกบัณฑิตทรงสี่เหลี่ยม (ฟางจิน) — ค่าเริ่มต้น */
    default: {
      const { c1, c2, c3 } = pal(d, ['#1e3a8a', '#facc15', '#93c5fd'])
      return (
        <g>
          <path d="M60 70 L64 40 Q100 30 136 40 L140 70 Q100 62 60 70 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M64 40 Q100 48 136 40" fill="none" stroke={shade(c1, 30)} strokeWidth="1.4" opacity=".6" />
          <path d="M62 64 Q100 56 138 64" fill="none" stroke={c2} strokeWidth="3" />
          <circle cx="100" cy="58" r="3.8" fill={c3} stroke={c2} strokeWidth="1" />
          {/* แพรห้อยสองข้าง */}
          <path d="M140 62 Q152 84 148 112 M140 62 Q158 80 160 106" fill="none" stroke={c1} strokeWidth="5" strokeLinecap="round" />
        </g>
      )
    }
  }
}

/* ============================ ของแต่งหน้า (ช่อง glasses เดิม) ============================ */
const FACE_ALIAS: Record<string, string> = { round: 'huadian', shades: 'mask', vr: 'veil', star: 'huadian' }

function Glasses({ d }: { d?: ItemDesign }) {
  const raw = d?.shape || 'huadian'
  const shape = FACE_ALIAS[raw] || raw

  switch (shape) {
    /* ผ้าปิดหน้าครึ่งล่าง จอมยุทธ์ปริศนา */
    case 'mask': {
      const { c1, c2 } = pal(d, ['#1f2937', '#ef4444', '#ffffff'])
      return (
        <g>
          <path d="M56 106 Q100 98 144 106 L140 128 Q100 150 60 128 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.4" />
          <path d="M60 108 Q100 102 140 108" fill="none" stroke={c2} strokeWidth="2.4" />
          <path d="M56 108 L46 98 M144 108 L154 98" stroke={c1} strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    }
    /* ผ้าคลุมหน้านางเอก */
    case 'veil': {
      const { c1, c2 } = pal(d, ['#ffffff', '#f9a8d4', '#fff'])
      return (
        <g>
          <path d="M58 108 Q100 100 142 108 L138 134 Q100 150 62 134 Z" fill={c1} opacity=".6" stroke={c2} strokeWidth="1.4" />
          <path d="M58 108 Q54 100 58 94 M142 108 Q146 100 142 94" fill="none" stroke={c2} strokeWidth="2" strokeLinecap="round" />
          {[70, 82, 94, 106, 118, 130].map((x, i) => (
            <circle key={x} cx={x} cy={134 - Math.abs(x - 100) * 0.2 + (i % 2) * 0.5 + 2} r="2" fill="#fff" stroke="#cbd5e1" strokeWidth=".6" />
          ))}
        </g>
      )
    }
    /* เคราขาวยาวแบบผู้เฒ่า/เซียน */
    case 'beard': {
      const { c1 } = pal(d, ['#f8fafc', '#cbd5e1', '#fff'])
      return (
        <g>
          <path d="M62 114 Q66 150 100 186 Q134 150 138 114 Q124 132 100 126 Q76 132 62 114 Z" fill={c1} stroke="#94a3b8" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M100 130 V176 M86 134 Q88 156 98 176 M114 134 Q112 156 102 176" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
          <path d="M100 114 Q90 108 78 113 Q82 120 92 118 Q100 118 100 118 Q100 118 108 118 Q118 120 122 113 Q110 108 100 114 Z" fill={c1} stroke="#94a3b8" strokeWidth="1" />
        </g>
      )
    }
    /* แผลเป็นนักรบ */
    case 'scar': {
      const { c1 } = pal(d, ['#b91c1c', '#fff', '#fff'])
      return (
        <g stroke={c1} strokeLinecap="round" fill="none">
          <path d="M122 80 L136 120" strokeWidth="3" />
          <path d="M123 90 l8 -4 M127 100 l8 -4 M131 110 l8 -4" strokeWidth="1.6" />
        </g>
      )
    }
    /* ลายดอกไม้หน้าผาก (ฮัวเตี้ยน) — ค่าเริ่มต้น */
    default: {
      const { c1, c2 } = pal(d, ['#dc2626', '#fbbf24', '#ffffff'])
      return (
        <g>
          <path d="M100 66 Q108 74 100 84 Q92 74 100 66 Z" fill={c1} stroke={c2} strokeWidth="1.2" />
          <circle cx="100" cy="76" r="1.8" fill={c2} />
          <circle cx="90" cy="76" r="1.5" fill={c2} />
          <circle cx="110" cy="76" r="1.5" fill={c2} />
        </g>
      )
    }
  }
}

/* ============================ ของสะพายหลัง ============================ */
const BACK_ALIAS: Record<string, string> = { wings: 'ribbons', backpack: 'swords' }

function BackItem({ d }: { d?: ItemDesign; ctx?: Ctx }) {
  const raw = d?.shape || 'cape'
  const shape = BACK_ALIAS[raw] || raw

  /* ผ้าแพรพลิ้วสไตล์เซียน (ผีป๋อ) */
  if (shape === 'ribbons') {
    const { c1, c2 } = pal(d, ['#a5f3fc', '#f0abfc', '#fde047'])
    return (
      <g>
        {[false, true].map((m) => (
          <g key={String(m)} transform={m ? 'translate(200 0) scale(-1 1)' : undefined}>
            <path d="M74 152 Q22 146 14 196 Q8 238 38 270 Q28 232 42 204 Q54 176 78 170 Z" fill={c1} stroke={shade(c1, -25)} strokeWidth="1.3" opacity=".95" />
            <path d="M74 158 Q34 160 28 200 Q26 230 46 254 Q40 226 50 204 Q60 180 78 174 Z" fill={c2} opacity=".85" />
            <path d="M16 190 Q28 184 40 192" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
          </g>
        ))}
      </g>
    )
  }

  /* กระบี่คู่ไขว้หลัง */
  if (shape === 'swords') {
    const { c1, c2, c3 } = pal(d, ['#7c2d12', '#fbbf24', '#dc2626'])
    return (
      <g>
        {[38, -38].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 100 200)`}>
            <rect x="95.5" y="92" width="9" height="150" rx="4" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.1" />
            <rect x="93" y="150" width="14" height="5" rx="2" fill={c2} />
            <rect x="93" y="196" width="14" height="5" rx="2" fill={c2} />
            <rect x="96.5" y="76" width="7" height="18" rx="3" fill={shade(c1, 10)} />
            <circle cx="100" cy="72" r="4.4" fill={c2} />
            <path d="M100 76 Q94 66 96 58 M100 76 Q106 66 104 56" fill="none" stroke={c3} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        ))}
      </g>
    )
  }

  /* ผ้าคลุมไหล่จอมยุทธ์ (ผีเฟิง) — ค่าเริ่มต้น */
  const { c1, c2, c3 } = pal(d, ['#7f1d1d', '#b91c1c', '#fde047'])
  return (
    <g>
      <path d="M70 148 Q30 214 46 280 Q100 296 154 280 Q170 214 130 148 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.5" />
      <path d="M82 158 Q54 218 66 272 Q100 282 134 272 Q146 218 118 158 Z" fill={c2} opacity=".75" />
      <path d="M58 268 q6 -6 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" fill="none" stroke={c3} strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
    </g>
  )
}

function BackItemFront({ d }: { d?: ItemDesign }) {
  const raw = d?.shape || 'cape'
  const shape = BACK_ALIAS[raw] || raw
  if (shape === 'swords') {
    const { c2, c3 } = pal(d, ['#7c2d12', '#fbbf24', '#dc2626'])
    return (
      <g>
        <path d="M82 146 L130 206" stroke={c3} strokeWidth="5" strokeLinecap="round" />
        <path d="M82 146 L130 206" stroke={c2} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 5" />
        <circle cx="106" cy="176" r="4.2" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
      </g>
    )
  }
  if (shape === 'cape') {
    const { c3 } = pal(d, ['#7f1d1d', '#b91c1c', '#fde047'])
    return (
      <g>
        <path d="M80 150 Q100 162 120 150" fill="none" stroke={c3} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="80" cy="150" r="5.5" fill={c3} stroke={shade(c3, -30)} strokeWidth="1.2" />
        <circle cx="120" cy="150" r="5.5" fill={c3} stroke={shade(c3, -30)} strokeWidth="1.2" />
      </g>
    )
  }
  return null
}

/* ============================ ของถือ (มือขวา) ============================ */
const HAND_ALIAS: Record<string, string> = { sword: 'sword_chinese', wand: 'flywhisk', trophy: 'seal', book: 'scroll' }

function HandItem({ d }: { d?: ItemDesign }) {
  const raw = d?.shape || 'scroll'
  const shape = HAND_ALIAS[raw] || raw

  switch (shape) {
    /* กระบี่จีน (เจี้ยน) */
    case 'sword_chinese': {
      const { c1, c2, c3 } = pal(d, ['#7c2d12', '#fbbf24', '#dc2626'])
      return (
        <g transform="translate(140 216) rotate(18)">
          <path d="M-4 -76 L0 -86 L4 -76 L4.5 -8 H-4.5 Z" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.1" />
          <path d="M0 -82 V-10" stroke="#cbd5e1" strokeWidth="1.4" />
          <path d="M-16 -7 Q0 -13 16 -7 L13 -2 Q0 -7 -13 -2 Z" fill={c2} stroke={shade(c2, -28)} strokeWidth="1" />
          <rect x="-3.2" y="-3" width="6.4" height="16" rx="3" fill={c1} />
          <circle cx="0" cy="15" r="4" fill={c2} />
          <path d="M0 18 Q-8 32 -4 44 M0 18 Q2 34 6 44" fill="none" stroke={c3} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )
    }
    /* ดาบใบกว้าง (ตาว) */
    case 'saber': {
      const { c1, c2, c3 } = pal(d, ['#7c2d12', '#fbbf24', '#dc2626'])
      return (
        <g transform="translate(140 216) rotate(14)">
          <path d="M-5 -8 L-5 -62 Q-5 -84 13 -94 Q8 -76 10 -60 L10 -8 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.1" />
          <path d="M-1 -12 V-64 Q-1 -78 8 -88" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".8" />
          <ellipse cx="2.5" cy="-6" rx="10" ry="3.6" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <rect x="-1" y="-3" width="7" height="17" rx="3" fill={c1} />
          <circle cx="2.5" cy="16" r="3.8" fill={c2} />
          <path d="M2.5 19 Q-6 30 -2 44 M2.5 19 Q8 32 12 44" fill="none" stroke={c3} strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    }
    /* พัดกระดาษ */
    case 'fan': {
      const { c1, c2, c3 } = pal(d, ['#fef3c7', '#b45309', '#dc2626'])
      return (
        <g transform="translate(142 210) rotate(-18)">
          <path d="M0 10 L-30 -24 Q0 -44 30 -24 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.2" />
          <path d="M-30 -24 Q0 -40 30 -24" fill="none" stroke={c2} strokeWidth="3" />
          <path d="M0 10 L-15 -31 M0 10 L15 -31 M0 10 L-23 -28 M0 10 L23 -28 M0 10 L-8 -34 M0 10 L8 -34" stroke={c2} strokeWidth="1.1" opacity=".7" />
          <path d="M-8 -14 Q-2 -22 4 -16 Q10 -22 14 -14" fill="none" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="0" cy="10" r="3.5" fill={c2} />
          <path d="M0 12 Q-4 22 -2 30" fill="none" stroke={c3} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )
    }
    /* แส้เซียน (ฝูเฉิน) */
    case 'flywhisk': {
      const { c1, c2, c3 } = pal(d, ['#92400e', '#fbbf24', '#ffffff'])
      return (
        <g transform="translate(140 218) rotate(22)">
          <rect x="-2.4" y="-46" width="4.8" height="58" rx="2.4" fill={c1} stroke={shade(c1, -30)} strokeWidth=".8" />
          <rect x="-3.4" y="-4" width="6.8" height="5" rx="2" fill={c2} />
          <rect x="-3.4" y="-46" width="6.8" height="5" rx="2" fill={c2} />
          <g fill="none" stroke={c3} strokeWidth="1.8" strokeLinecap="round" opacity=".95">
            <path d="M0 -46 Q-16 -62 -22 -82" />
            <path d="M0 -46 Q-8 -66 -10 -90" />
            <path d="M0 -46 Q2 -68 6 -92" />
            <path d="M0 -46 Q12 -64 20 -84" />
            <path d="M0 -46 Q18 -56 28 -70" />
            <path d="M0 -46 Q-20 -54 -30 -68" />
          </g>
          <g fill="none" stroke="#cbd5e1" strokeWidth="1" opacity=".8">
            <path d="M0 -46 Q-12 -64 -16 -86" />
            <path d="M0 -46 Q8 -66 14 -90" />
          </g>
        </g>
      )
    }
    /* ตราหยกประจำองค์จักรพรรดิ */
    case 'seal': {
      const { c1, c2, c3 } = pal(d, ['#34d399', '#dc2626', '#fbbf24'])
      return (
        <g transform="translate(140 214)">
          <path d="M-9 -24 Q-10 -42 0 -40 Q10 -42 9 -24 Z" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.2" />
          <path d="M-6 -34 Q-2 -44 4 -38 M3 -40 Q8 -36 6 -31" fill="none" stroke={shade(c1, -30)} strokeWidth="1.1" />
          <rect x="-15" y="-24" width="30" height="22" rx="3" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.3" />
          <rect x="-15" y="-24" width="30" height="5" rx="2" fill={shade(c1, 22)} opacity=".7" />
          <rect x="-11" y="-14" width="22" height="9" rx="1.5" fill="none" stroke={c3} strokeWidth="1.2" />
          <path d="M-15 -8 Q-24 -2 -22 8 M15 -8 Q24 -2 22 8" fill="none" stroke={c2} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="-22" cy="9" r="2.6" fill={c3} />
          <circle cx="22" cy="9" r="2.6" fill={c3} />
        </g>
      )
    }
    /* โคมแดง */
    case 'lantern': {
      const { c1, c2, c3 } = pal(d, ['#dc2626', '#fbbf24', '#fde047'])
      return (
        <g transform="translate(140 214)">
          <path d="M0 0 V-18" stroke={c2} strokeWidth="1.8" />
          <rect x="-7" y="-23" width="14" height="5" rx="2" fill={c2} />
          <ellipse cx="0" cy="-38" rx="17" ry="15" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.3" />
          <path d="M0 -53 Q-9 -38 0 -23 M0 -53 Q9 -38 0 -23 M-17 -38 H17" fill="none" stroke={shade(c1, -25)} strokeWidth="1.1" />
          <ellipse cx="-8" cy="-44" rx="4" ry="6" fill="#fff" opacity=".22" />
          <rect x="-7" y="-55" width="14" height="5" rx="2" fill={c2} />
          <path d="M0 -24 L0 -14 M-3 -24 Q-6 -12 -4 -8 M3 -24 Q6 -12 4 -8" fill="none" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )
    }
    /* ขลุ่ยไม้ไผ่ (ตี๋จื่อ) */
    case 'flute': {
      const { c1, c2, c3 } = pal(d, ['#65a30d', '#fbbf24', '#dc2626'])
      return (
        <g transform="translate(140 214) rotate(-62)">
          <rect x="-3.2" y="-40" width="6.4" height="78" rx="3" fill={c1} stroke={shade(c1, -30)} strokeWidth="1" />
          {[-30, -6, 20].map((y) => (
            <rect key={y} x="-3.8" y={y} width="7.6" height="3" rx="1" fill={c2} />
          ))}
          {[-20, -12, 0, 8].map((y) => (
            <circle key={y} cx="0" cy={y} r="1.5" fill={shade(c1, -45)} />
          ))}
          <path d="M0 38 Q-6 48 -2 58 M0 38 Q5 50 8 58" fill="none" stroke={c3} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )
    }
    /* ร่มกระดาษน้ำมัน */
    case 'umbrella': {
      const { c1, c2, c3 } = pal(d, ['#f472b6', '#fbbf24', '#ffffff'])
      return (
        <g transform="translate(140 216) rotate(14)">
          <path d="M0 14 V-56" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
          <path d="M-38 -52 Q0 -100 38 -52 Q19 -60 0 -52 Q-19 -60 -38 -52 Z" fill={c1} stroke={shade(c1, -28)} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M0 -52 L-26 -66 M0 -52 L-12 -78 M0 -52 L12 -78 M0 -52 L26 -66" stroke={shade(c1, -25)} strokeWidth="1" opacity=".7" />
          <path d="M-38 -52 Q-19 -60 0 -52 Q19 -60 38 -52" fill="none" stroke={c2} strokeWidth="2.6" />
          <circle cx="-8" cy="-70" r="3" fill={c3} opacity=".8" />
          <circle cx="8" cy="-70" r="3" fill={c3} opacity=".8" />
          <circle cx="0" cy="-80" r="2.4" fill={c3} opacity=".8" />
          <circle cx="0" cy="-90" r="2.6" fill={c2} />
        </g>
      )
    }
    /* ไม้พลองเส้าหลิน */
    case 'staff': {
      const { c1, c2, c3 } = pal(d, ['#92400e', '#9ca3af', '#dc2626'])
      return (
        <g transform="translate(140 214) rotate(8)">
          <rect x="-2.8" y="-92" width="5.6" height="108" rx="2.8" fill={c1} stroke={shade(c1, -30)} strokeWidth="1" />
          <rect x="-4.2" y="-96" width="8.4" height="12" rx="3" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <rect x="-4.2" y="-2" width="8.4" height="8" rx="3" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <path d="M0 -82 Q-8 -72 -5 -60 M0 -82 Q8 -72 5 -60" fill="none" stroke={c3} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )
    }
    /* ม้วนราชโองการ (ค่าเริ่มต้น) */
    default: {
      const { c1, c2, c3 } = pal(d, ['#fde047', '#b45309', '#dc2626'])
      return (
        <g transform="translate(140 212) rotate(-12)">
          <rect x="-17" y="-28" width="34" height="42" rx="3" fill={c1} stroke={shade(c1, -30)} strokeWidth="1.2" />
          <rect x="-20" y="-31" width="40" height="7" rx="3.5" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <rect x="-20" y="8" width="40" height="7" rx="3.5" fill={c2} stroke={shade(c2, -30)} strokeWidth="1" />
          <path d="M-9 -22 V6 M9 -22 V6" stroke={c3} strokeWidth="2" opacity=".8" />
          <path d="M-3 -18 H3 M-3 -12 H3 M-3 -6 H3 M-3 0 H3" stroke={c3} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="-20" cy="-27.5" r="3.4" fill={c3} />
          <circle cx="20" cy="-27.5" r="3.4" fill={c3} />
        </g>
      )
    }
  }
}

/* ============================ เพื่อนคู่ใจ (สัตว์มงคล) ============================ */
const PET_ALIAS: Record<string, string> = { dog: 'lion', robot: 'rabbit', penguin: 'crane' }

function Pet({ d }: { d?: ItemDesign }) {
  const raw = d?.shape || 'cat'
  const shape = PET_ALIAS[raw] || raw
  const { c1, c2, c3 } = pal(d, ['#fbbf24', '#f59e0b', '#1f2937'])
  const ink = INK

  switch (shape) {
    /* ฉีหลิน */
    case 'qilin':
      return (
        <g>
          <path d="M16 280 Q2 270 8 254 Q12 266 22 270 Z" fill="#fb923c" />
          <path d="M14 286 Q0 284 2 274 Q8 280 18 280 Z" fill={GOLD} />
          <ellipse cx="32" cy="282" rx="18" ry="12" fill={c1} stroke={shade(c1, -22)} strokeWidth="1.1" />
          <path d="M22 274 q4 4 8 0 M32 274 q4 4 8 0 M27 282 q4 4 8 0" fill="none" stroke={shade(c1, -22)} strokeWidth="1.1" />
          <path d="M18 292 H26 M38 292 H46" stroke={c3} strokeWidth="4" strokeLinecap="round" />
          <circle cx="30" cy="257" r="14" fill={c1} stroke={shade(c1, -22)} strokeWidth="1.1" />
          <path d="M44 248 Q54 250 54 262 Q48 258 44 258 Z" fill="#fb923c" />
          <path d="M30 244 Q26 234 32 228 Q34 236 36 244" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
          <path d="M18 250 L14 240 L24 246 M40 248 L44 240 L34 245" fill={c2} />
          <circle cx="25" cy="256" r="2.2" fill={ink} />
          <circle cx="35" cy="256" r="2.2" fill={ink} />
          <path d="M26 264 Q30 268 34 264" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M20 266 Q10 270 8 276 M40 266 Q50 270 52 276" fill="none" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )
    /* มังกรจีนน้อย */
    case 'dragon':
      return (
        <g transform="translate(-3 58) scale(0.8)">
          <path d="M12 292 Q50 296 44 274 Q38 254 56 244" fill="none" stroke={shade(c1, -22)} strokeWidth="14" strokeLinecap="round" />
          <path d="M12 292 Q50 296 44 274 Q38 254 56 244" fill="none" stroke={c1} strokeWidth="11" strokeLinecap="round" />
          <path d="M14 293 Q48 297 42 275 Q37 256 54 246" fill="none" stroke={shade(c1, 35)} strokeWidth="4" strokeLinecap="round" strokeDasharray="1 7" />
          {/* ครีบสันหลัง */}
          <g fill={c2}>
            <path d="M28 284 l-3 -8 l7 5 Z" />
            <path d="M44 286 l4 -8 l2 8 Z" />
            <path d="M44 268 l-6 -4 l8 -2 Z" />
          </g>
          {/* หัวมังกร */}
          <ellipse cx="60" cy="238" rx="13" ry="10" fill={c1} stroke={shade(c1, -22)} strokeWidth="1.1" />
          <path d="M52 230 Q46 218 40 218 Q46 224 48 232 M66 230 Q72 218 78 220 Q72 226 70 232" fill="none" stroke={c2} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="56" cy="236" r="2.6" fill="#fff" />
          <circle cx="56.6" cy="236" r="1.4" fill={ink} />
          <circle cx="68" cy="236" r="2.6" fill="#fff" />
          <circle cx="68.6" cy="236" r="1.4" fill={ink} />
          <ellipse cx="62" cy="243" rx="7" ry="4.5" fill={shade(c1, 25)} />
          <circle cx="60" cy="243" r="1" fill={ink} />
          <circle cx="65" cy="243" r="1" fill={ink} />
          {/* หนวดมังกร */}
          <path d="M54 244 Q40 250 36 244 M70 244 Q84 252 90 244" fill="none" stroke={c3 === '#1f2937' ? '#fde047' : c3} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M44 250 l-4 4 M48 252 l-3 5" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )
    /* สิงโตมงคล */
    case 'lion': {
      return (
        <g>
          <ellipse cx="32" cy="284" rx="16" ry="11" fill={c1} stroke={shade(c1, -22)} strokeWidth="1.1" />
          <path d="M46 282 Q60 280 58 268" fill="none" stroke={c2} strokeWidth="5" strokeLinecap="round" />
          <circle cx="56" cy="266" r="4" fill={c2} />
          {/* แผงคอ */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <circle key={a} cx={31 + 15 * Math.cos((a * Math.PI) / 180)} cy={258 + 15 * Math.sin((a * Math.PI) / 180)} r="7" fill={c2} stroke={shade(c2, -22)} strokeWidth=".8" />
          ))}
          <circle cx="31" cy="258" r="13" fill={c1} stroke={shade(c1, -22)} strokeWidth="1.1" />
          <circle cx="25" cy="255" r="3" fill="#fff" />
          <circle cx="37" cy="255" r="3" fill="#fff" />
          <circle cx="25.4" cy="255.4" r="1.6" fill={ink} />
          <circle cx="36.6" cy="255.4" r="1.6" fill={ink} />
          <path d="M22 249 Q25 246 28 249 M34 249 Q37 246 40 249" fill="none" stroke={ink} strokeWidth="1.3" />
          <ellipse cx="31" cy="262" rx="4" ry="3" fill={ink} />
          <path d="M31 265 V268 M26 268 Q31 272 36 268" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M28 268 l1 3 l2 -3 M32 268 l1 3 l2 -3" fill="#fff" stroke="none" />
          {/* ลูกปักแดง */}
          <circle cx="12" cy="292" r="6" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
          <path d="M6 292 H18 M12 286 V298" stroke={GOLD} strokeWidth="1.2" />
        </g>
      )
    }
    /* แพนด้า */
    case 'panda':
      return (
        <g>
          <ellipse cx="32" cy="282" rx="17" ry="13" fill="#fff" stroke="#cbd5e1" strokeWidth="1" />
          <ellipse cx="18" cy="286" rx="7" ry="9" fill={ink} transform="rotate(20 18 286)" />
          <ellipse cx="46" cy="286" rx="7" ry="9" fill={ink} transform="rotate(-20 46 286)" />
          <circle cx="32" cy="258" r="15" fill="#fff" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="20" cy="247" r="5.5" fill={ink} />
          <circle cx="44" cy="247" r="5.5" fill={ink} />
          <ellipse cx="25" cy="258" rx="4.4" ry="5.6" fill={ink} transform="rotate(-18 25 258)" />
          <ellipse cx="39" cy="258" rx="4.4" ry="5.6" fill={ink} transform="rotate(18 39 258)" />
          <circle cx="25.6" cy="257.4" r="1.4" fill="#fff" />
          <circle cx="38.4" cy="257.4" r="1.4" fill="#fff" />
          <ellipse cx="32" cy="265" rx="3.2" ry="2.4" fill={ink} />
          <path d="M28 269 Q32 272 36 269" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
          {/* ไผ่ */}
          <path d="M54 296 V250" stroke="#65a30d" strokeWidth="4" strokeLinecap="round" />
          <path d="M51 274 H57 M51 262 H57" stroke="#3f6212" strokeWidth="1.4" />
          <path d="M54 252 Q62 248 66 252 Q60 256 54 254 Z" fill="#84cc16" />
        </g>
      )
    /* หงส์ไฟน้อย */
    case 'phoenix':
      return (
        <g>
          <path d="M18 284 Q2 288 4 262 Q10 276 20 276 Z" fill={c2} />
          <path d="M18 288 Q0 300 -2 278 Q8 290 20 282 Z" fill={c3 === '#1f2937' ? '#dc2626' : c3} />
          <path d="M20 290 Q4 306 0 288 Q10 298 22 288 Z" fill={GOLD} />
          <ellipse cx="34" cy="280" rx="16" ry="14" fill={c1} stroke={shade(c1, -25)} strokeWidth="1.1" />
          <path d="M26 280 Q40 270 50 282 Q40 290 26 284 Z" fill={c2} />
          <circle cx="38" cy="258" r="12" fill={c1} stroke={shade(c1, -25)} strokeWidth="1.1" />
          <path d="M32 248 Q30 236 38 234 M38 247 Q40 232 48 232 M44 250 Q52 240 58 244" fill="none" stroke={c2} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="34" cy="257" r="2.2" fill={ink} />
          <path d="M44 260 L56 264 L44 267 Z" fill="#f97316" />
          <path d="M28 292 V298 M40 292 V298" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )
    /* นกกระเรียน */
    case 'crane':
      return (
        <g transform="translate(-6 58) scale(0.8)">
          <path d="M28 292 V274 M38 292 V274" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 292 H31 M34 292 H43" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 278 Q8 268 20 270 L52 272 Q48 288 30 284 Q18 284 12 278 Z" fill="#fff" stroke="#cbd5e1" strokeWidth="1.1" />
          <path d="M12 278 Q4 274 6 266 Q14 270 18 274 Z" fill={ink} />
          <path d="M20 272 Q34 266 46 274 Q36 284 22 280 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          <path d="M22 276 Q34 272 44 276" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
          {/* คอยาว */}
          <path d="M48 272 Q58 262 52 248 Q48 240 54 234" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          <path d="M48 272 Q58 262 52 248 Q48 240 54 234" fill="none" stroke="#e2e8f0" strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
          <circle cx="54" cy="233" r="5.4" fill="#fff" stroke="#cbd5e1" strokeWidth="1" />
          <path d="M51 229 Q54 226 58 229 Q56 231 51 231 Z" fill="#dc2626" />
          <path d="M58 234 L70 237 L58 238 Z" fill="#fb923c" />
          <circle cx="55" cy="233" r="1.2" fill={ink} />
        </g>
      )
    /* กระต่ายหยก */
    case 'rabbit':
      return (
        <g>
          <ellipse cx="32" cy="282" rx="16" ry="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="50" cy="284" r="4.4" fill="#fff" stroke="#cbd5e1" strokeWidth="1" />
          <ellipse cx="24" cy="236" rx="5" ry="16" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" transform="rotate(-8 24 236)" />
          <ellipse cx="38" cy="236" rx="5" ry="16" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" transform="rotate(8 38 236)" />
          <ellipse cx="24" cy="237" rx="2.4" ry="11" fill="#fda4af" transform="rotate(-8 24 237)" />
          <ellipse cx="38" cy="237" rx="2.4" ry="11" fill="#fda4af" transform="rotate(8 38 237)" />
          <circle cx="31" cy="262" r="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="25" cy="260" r="2.4" fill="#dc2626" />
          <circle cx="37" cy="260" r="2.4" fill="#dc2626" />
          <path d="M29 266 L31 268 L33 266 Z" fill="#fb7185" />
          <path d="M31 268 V271 M27 271 Q31 274 35 271" fill="none" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />
          <rect x="20" y="274" width="22" height="5" rx="2.5" fill="#dc2626" />
          <circle cx="31" cy="279" r="2.6" fill={GOLD} />
        </g>
      )
    /* แมวกวักนำโชค (ค่าเริ่มต้น) */
    default:
      return (
        <g>
          <ellipse cx="32" cy="282" rx="17" ry="12" fill={c1} />
          <path d="M48 284 Q66 282 62 266 Q60 276 48 276 Z" fill={c1} stroke={c2} strokeWidth="1" />
          {/* ขาหน้ากวัก */}
          <path d="M44 270 Q56 262 54 246" fill="none" stroke={c1} strokeWidth="7" strokeLinecap="round" />
          <path d="M44 270 Q56 262 54 246" fill="none" stroke={c2} strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
          <circle cx="30" cy="258" r="14" fill={c1} />
          <path d="M18 250 L16 234 L28 246 Z M42 250 L44 234 L32 246 Z" fill={c1} />
          <path d="M19 247 L18 238 L25 245 Z M41 247 L42 238 L35 245 Z" fill="#fda4af" />
          <circle cx="25" cy="257" r="2.2" fill={ink} />
          <circle cx="35" cy="257" r="2.2" fill={ink} />
          <path d="M28 263 Q30 266 32 263" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14 262 H22 M38 262 H46" stroke={ink} strokeWidth="1" opacity=".6" />
          <rect x="20" y="271" width="20" height="5" rx="2.5" fill="#dc2626" />
          <circle cx="30" cy="279" r="3" fill={GOLD} stroke="#b45309" strokeWidth=".8" />
          {/* เหรียญทองอยู่หน้าอก */}
          <circle cx="30" cy="286" r="6.5" fill={GOLD} stroke="#b45309" strokeWidth="1" />
          <rect x="27.6" y="283.6" width="4.8" height="4.8" fill="none" stroke="#b45309" strokeWidth="1" />
        </g>
      )
  }
}

/* ============================ ลวดลายพื้นหลัง ============================ */
const BG_ALIAS: Record<string, string> = { math: 'calligraphy', hearts: 'plum' }

function BgPattern({ pattern }: { pattern?: string | null }) {
  if (!pattern) return null
  const key = BG_ALIAS[pattern] || pattern

  /* เมฆมงคล (เซียงอวิ๋น) */
  if (key === 'cloud') {
    const cloud = (x: number, y: number, s = 1) => (
      <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
        <path d="M0 14 Q-2 4 8 4 Q10 -6 22 -2 Q30 -8 38 2 Q48 2 46 12 Q50 16 42 18 H6 Q-2 18 0 14 Z" />
        <path d="M12 12 Q12 6 18 7 Q22 9 19 12 Q16 14 14 11" />
        <path d="M32 11 Q32 5 38 6 Q42 8 39 11 Q36 13 34 10" />
        <path d="M2 22 Q12 26 22 22 M26 22 Q36 26 46 22" />
      </g>
    )
    return (
      <g fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".38">
        {cloud(10, 38)}
        {cloud(132, 72, 0.9)}
        {cloud(14, 214, 0.85)}
        {cloud(136, 252)}
      </g>
    )
  }

  /* อักษรมงคล */
  if (key === 'calligraphy') {
    const syms = [
      ['福', 28, 46], ['龍', 164, 62], ['武', 36, 118], ['俠', 168, 138], ['壽', 28, 196], ['喜', 170, 216], ['禄', 34, 272], ['雲', 166, 284], ['皇', 100, 26],
    ] as const
    return (
      <g fill="#ffffff" opacity=".24" fontFamily={CHINESE_FONT} fontWeight="900" fontSize="26" textAnchor="middle">
        {syms.map(([s, x, y]) => <text key={s + x} x={x} y={y}>{s}</text>)}
      </g>
    )
  }

  const pts: [number, number, number][] = [
    [20, 30, 2.4], [58, 18, 1.6], [150, 28, 2.6], [176, 70, 1.8], [30, 90, 1.8], [168, 120, 2.2], [14, 150, 1.6], [178, 180, 2], [24, 220, 2.4], [172, 250, 1.8], [60, 300, 1.6], [150, 304, 2.2],
  ]

  /* กลีบดอกท้อ/ดอกเหมย */
  if (key === 'plum') {
    return (
      <g fill="#ffffff" opacity=".5">
        {pts.map(([x, y, r], i) => (
          <g key={i}>
            {[0, 72, 144, 216, 288].map((a) => (
              <circle key={a} cx={x + r * 2.2 * Math.cos((a * Math.PI) / 180)} cy={y + r * 2.2 * Math.sin((a * Math.PI) / 180)} r={r * 1.5} />
            ))}
            <circle cx={x} cy={y} r={r * 0.9} fill="#fbbf24" />
          </g>
        ))}
      </g>
    )
  }

  /* ดาวยามค่ำ */
  if (key === 'stars') {
    return (
      <g fill="#ffffff" opacity={0.75}>
        {pts.map(([x, y, r], i) => (
          <path key={i} d={`M${x} ${y - r * 2.2} L${x + r * 0.7} ${y - r * 0.7} L${x + r * 2.2} ${y} L${x + r * 0.7} ${y + r * 0.7} L${x} ${y + r * 2.2} L${x - r * 0.7} ${y + r * 0.7} L${x - r * 2.2} ${y} L${x - r * 0.7} ${y - r * 0.7} Z`} />
        ))}
      </g>
    )
  }

  /* เหรียญทองโบราณ (ค่าเริ่มต้น) */
  return (
    <g fill="none" stroke="#ffffff" opacity=".4" strokeWidth="1.8">
      {pts.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r * 3.6} />
          <rect x={x - r * 1.2} y={y - r * 1.2} width={r * 2.4} height={r * 2.4} />
        </g>
      ))}
    </g>
  )
}

/* ============================ ตัวละคร ============================ */
export interface CharacterSvgProps {
  config: AvatarConfig
  view?: 'full' | 'bust'
  animate?: boolean
  className?: string
  /** ใส่ฟังก์ชันนี้ = เด็กลากแขน/ขา/ของถือ/สัตว์/ตัวละครบนเวทีได้เอง (เฉพาะ view='full') */
  onPoseChange?: (fp: FreePoseConfig) => void
}

// ชุดเริ่มต้น: ศิษย์น้อยสำนักยุทธ์
const DEFAULT_TOP: ItemDesign = { shape: 'commoner', colors: ['#4f6fa8', '#e8d9b0', '#8b5e34'] }
const DEFAULT_BOTTOM: ItemDesign = { shape: 'trousers', colors: ['#6b7280', '#e8d9b0', '#8b5e34'] }
const DEFAULT_SHOES: ItemDesign = { shape: 'kungfu', colors: ['#1f2937', '#e5e7eb', '#ffffff'] }

export function CharacterSvg({ config, view = 'full', animate = false, className, onPoseChange }: CharacterSvgProps) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  const uid = `cc${raw}`
  const base = resolveBase(config)
  const eq = (config.equip || {}) as Partial<Record<Slot, EquipEntry | null>>
  const ctx: Ctx = { skin: base.skin, skinDark: shade(base.skin, -9), uid }

  const top = eq.outfit?.d || DEFAULT_TOP
  const bottom = eq.pants?.d || DEFAULT_BOTTOM
  const shoes = eq.shoes?.d || DEFAULT_SHOES
  const viewBox = view === 'bust' ? '16 2 168 168' : '0 0 200 320'
  const wingsOrCape = eq.back?.d

  const fp = resolveFreePose(config)
  const lArmAttr = partTransformAttr(fp.lArm, 63, 156)
  const rArmAttr = partTransformAttr(fp.rArm, 137, 156)
  const lLegAttr = partTransformAttr(fp.lLeg, 87, 210)
  const rLegAttr = partTransformAttr(fp.rLeg, 113, 210)
  const bodyAttr = partTransformAttr(fp.body, 100, 180)
  const handAttr = partTransformAttr(fp.hand, 140, 216)
  const petAttr = partTransformAttr(fp.pet, 32, 272)
  const MIRROR = 'translate(200 0) scale(-1 1)'

  /* ---------- ลากชิ้นส่วนด้วยนิ้ว/เมาส์ ---------- */
  const editable = !!onPoseChange && view === 'full'
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<null | {
    part: PartKey
    mode: 'rot' | 'move'
    start: { x: number; y: number }
    startAng: number
    init: PartTransform
    base: FreePoseConfig
  }>(null)

  const toSvg = (e: ReactPointerEvent) => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const angleOf = (part: PartKey, p: { x: number; y: number }, b: FreePoseConfig) => {
    const pv = PIVOT[part]
    if (!pv) return 0
    return (Math.atan2(p.y - (pv[1] + b.body.y), p.x - (pv[0] + b.body.x)) * 180) / Math.PI
  }
  const startDrag = (e: ReactPointerEvent, part: PartKey, mode: 'rot' | 'move') => {
    if (!editable) return
    e.stopPropagation()
    e.preventDefault()
    try { svgRef.current?.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    const p = toSvg(e)
    drag.current = { part, mode, start: p, startAng: angleOf(part, p, fp), init: { ...fp[part] }, base: fp }
  }
  const moveDrag = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || !onPoseChange) return
    const p = toSvg(e)
    let next: PartTransform
    if (d.mode === 'rot') {
      let deg = d.init.deg + (angleOf(d.part, p, d.base) - d.startAng)
      deg = ((((deg + 180) % 360) + 360) % 360) - 180
      next = { ...d.init, deg }
    } else {
      let dx = p.x - d.start.x
      let dy = p.y - d.start.y
      if (d.part === 'hand') {
        // ของในมืออยู่ในกลุ่มแขนขวา ต้องหมุนกลับตามมุมแขน
        const a = (-d.base.rArm.deg * Math.PI) / 180
        ;[dx, dy] = [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]
      }
      next = { ...d.init, x: d.init.x + dx, y: d.init.y + dy }
    }
    const c = clampPart(d.part, next)
    const r1 = (v: number) => Math.round(v * 10) / 10
    onPoseChange({ ...d.base, [d.part]: { x: r1(c.x), y: r1(c.y), deg: r1(c.deg) } })
  }
  const endDrag = (e: ReactPointerEvent) => {
    if (!drag.current) return
    drag.current = null
    try { svgRef.current?.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  const grab = (part: PartKey, mode: 'rot' | 'move'): Record<string, any> =>
    editable ? { onPointerDown: (e: ReactPointerEvent) => startDrag(e, part, mode), style: { cursor: 'grab' } } : {}

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ตัวละครจีนโบราณ"
      style={editable ? { touchAction: 'none', userSelect: 'none' } : undefined}
      onPointerMove={editable ? moveDrag : undefined}
      onPointerUp={editable ? endDrag : undefined}
      onPointerCancel={editable ? endDrag : undefined}
    >
      {animate && (
        <style>{`
          @keyframes ${uid}-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
          @keyframes ${uid}-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
        `}</style>
      )}
      <BgPattern pattern={eq.bg?.d?.pattern as string | undefined} />
      {view === 'full' && <ellipse cx="100" cy="298" rx="52" ry="8" fill="#000" opacity=".16" />}

      <g style={animate ? { animation: `${uid}-bob 3.2s ease-in-out infinite` } : undefined}>
        {/* ---- สัตว์เลี้ยงมงคล (ขยับอิสระ) ---- */}
        {view === 'full' && eq.pet?.d && (
          <g transform={petAttr} {...grab('pet', 'move')}>
            <Pet d={eq.pet.d} />
          </g>
        )}

        {/* ---- กลุ่มลำตัว + ศีรษะ + แขนขา ---- */}
        <g transform={bodyAttr} {...grab('body', 'move')}>
          {wingsOrCape && <BackItem d={wingsOrCape} ctx={ctx} />}
          <HairBack style={base.hair} color={base.hairColor} />

          {/* ขาซ้าย & ขาขวา */}
          <g transform={lLegAttr} {...grab('lLeg', 'rot')}>
            <LegWear d={bottom} skin={base.skin} />
            <g transform="translate(-2 0)">
              <ShoeLeft d={shoes} ctx={ctx} />
            </g>
          </g>
          <g transform={rLegAttr} {...grab('rLeg', 'rot')}>
            <g transform={MIRROR}>
              <LegWear d={bottom} skin={base.skin} />
            </g>
            <g transform="translate(200 0) scale(-1 1) translate(-2 0)">
              <ShoeLeft d={shoes} ctx={ctx} />
            </g>
          </g>

          {/* ลำตัวหลัก + ชุด */}
          <rect x="73" y="145" width="54" height="70" rx="18" fill={base.skin} />
          <rect x="89" y="128" width="22" height="26" rx="9" fill={ctx.skinDark} />
          <Top d={top} ctx={ctx} />

          {/* แขนซ้าย (พร้อมแขนเสื้อ) */}
          <g transform={lArmAttr} {...grab('lArm', 'rot')}>
            <Arm top={top} skin={base.skin} />
          </g>

          {/* แขนขวา (mirror จากแขนซ้าย) */}
          <g transform={rArmAttr} {...grab('rArm', 'rot')}>
            <g transform={MIRROR}>
              <Arm top={top} skin={base.skin} />
            </g>
            {/* ของถือ: อยู่ในกลุ่มแขนขวา จึงเคลื่อนตามแขนเสมอ (ปรับเพิ่มได้อิสระ) */}
            {eq.hand?.d && (
              <g transform={handAttr} {...grab('hand', 'move')}>
                <HandItem d={eq.hand.d} />
              </g>
            )}
          </g>

          {wingsOrCape && <BackItemFront d={wingsOrCape} />}

          {/* ศีรษะ */}
          <circle cx="54" cy="102" r="8" fill={base.skin} />
          <circle cx="146" cy="102" r="8" fill={base.skin} />
          <circle cx="54" cy="102" r="4" fill={ctx.skinDark} opacity=".5" />
          <circle cx="146" cy="102" r="4" fill={ctx.skinDark} opacity=".5" />
          <circle cx="100" cy="96" r="46" fill={base.skin} />
          <ellipse cx="86" cy="74" rx="14" ry="8" fill="#fff" opacity=".14" />
          <Face eyes={base.eyes} mouth={base.mouth} animate={animate} uid={uid} hairColor={base.hairColor} />
          <HairFront style={base.hair} color={base.hairColor} />
          {eq.glasses?.d && <Glasses d={eq.glasses.d} />}
          {eq.hat?.d && <Hat d={eq.hat.d} ctx={ctx} />}
        </g>
      </g>
      {/* ประกายออร่าระดับจักรพรรดิ เมื่อใส่ไอเทมที่มี glow: true */}
      {Object.values(eq).some((entry) => entry?.d?.glow) && (
        <g fill="#fde047" opacity=".85">
          <circle cx="34" cy="64" r="2.5" />
          <circle cx="168" cy="78" r="3" />
          <circle cx="28" cy="184" r="2.2" />
          <circle cx="174" cy="210" r="2.8" />
          <path d="M162 42 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" />
          <path d="M36 128 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 l4.5 -1.5 Z" />
        </g>
      )}
    </svg>
  )
}
import * as math from 'mathjs'

// =====================================================================
// ตัวช่วยคำตอบคณิตศาสตร์: (1) แปลงข้อความที่เด็กพิมพ์เป็น LaTeX เพื่อพรีวิวสด
//                        (2) ตรวจคำตอบว่า "เท่ากันทางคณิตศาสตร์" หรือไม่
//
// รูปแบบที่เด็กพิมพ์ได้ (ตัวอย่าง)
//   เศษส่วน      1/2   (1)/(2)   3/(2x)
//   ยกกำลัง      x^2   (x+1)^2   2^(n+1)
//   รากที่สอง    sqrt(2)   √2   รากที่สาม cbrt(8)
//   จำนวนคละ     1_1/2  หรือ  1 1/2   (จำนวนเต็ม + เศษส่วน)
//   สมการ/อสมการ x=3   y=2x+1   x>=2   x<5
//   คูณ ×        2*3  (ใส่ติดกัน 2x ก็ได้)
// =====================================================================

/** true = ถ้าตอบเป็นเศษส่วนต้องเป็นเศษส่วนอย่างต่ำ (เช่น 2/4 ไม่ผ่านเมื่อเฉลยคือ 1/2) */
export const REQUIRE_LOWEST_TERMS = true

export type AnswerCheck = { correct: boolean; hint?: string }

const PLACEHOLDER = 'zzph' // ตัวแทน "ช่องว่าง" ระหว่างพิมพ์ยังไม่เสร็จ → แสดงเป็น □
const SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
}

// ---------------------------------------------------------------------
// 1) ทำความสะอาดข้อความ (รองรับทั้งที่เด็กพิมพ์ และเฉลยที่ครูอาจเขียนเป็น LaTeX / สัญลักษณ์ยูนิโค้ด)
// ---------------------------------------------------------------------
export function cleanAnswer(raw: unknown): string {
  let s = String(raw ?? '').trim()
  s = s.replace(/\$/g, '').replace(/\\left|\\right/g, '').replace(/\\dfrac|\\tfrac/g, '\\frac')

  // \frac{a}{b} → ((a)/(b)) (วนซ้ำเผื่อซ้อนกัน)
  for (let i = 0; i < 6 && /\\frac\s*\{[^{}]*\}\s*\{[^{}]*\}/.test(s); i++) {
    s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '(($1)/($2))')
  }
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
  s = s.replace(/\\(?:times|cdot)/g, '*').replace(/\\div/g, '/').replace(/\\pi/g, 'pi')
  s = s.replace(/\\geq?/g, '>=').replace(/\\leq?/g, '<=').replace(/\\neq/g, '!=')
  s = s.replace(/[{}]/g, (m) => (m === '{' ? '(' : ')'))

  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '^' + [...m].map((c) => SUPERSCRIPTS[c]).join(''))
  s = s
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/∛/g, 'cbrt')
  s = s.replace(/√\s*(?=\()/g, 'sqrt').replace(/√\s*([0-9.]+|[a-zA-Z])/g, 'sqrt($1)')
  s = s.replace(/sqrt\s*([0-9]+(?:\.[0-9]+)?)/gi, 'sqrt($1)')

  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

// ---------------------------------------------------------------------
// 2) จำนวนคละ  "1_1/2" หรือ "1 1/2"
// ---------------------------------------------------------------------
type Mixed = { neg: boolean; whole: string; rest: string }

function parseMixed(s: string): Mixed | null {
  const t = s.trim()
  let m = t.match(/^(-?)(\d+)_(.*)$/)
  if (m) return { neg: m[1] === '-', whole: m[2], rest: m[3] }
  m = t.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (m) return { neg: m[1] === '-', whole: m[2], rest: `${m[3]}/${m[4]}` }
  return null
}

// ข้อความ → นิพจน์ที่ mathjs อ่านได้ (จำนวนคละกลายเป็น (จำนวนเต็ม+เศษส่วน))
function toExpr(clean: string): string {
  const mixed = parseMixed(clean)
  const body = mixed
    ? `${mixed.neg ? '-' : ''}(${mixed.whole}+(${mixed.rest.replace(/\s+/g, '')}))`
    : clean.replace(/\s+/g, '')
  // x(x+1) → x*(x+1) (ไม่ให้ mathjs เข้าใจว่าเป็นการเรียกฟังก์ชัน x)
  return body.replace(/(?<![a-z])([a-z])\(/g, '$1*(')
}

// ---------------------------------------------------------------------
// 3) เปรียบเทียบเชิงตัวเลข
// ---------------------------------------------------------------------
const toNum = (v: any): number => {
  if (typeof v === 'number') return v
  if (v && typeof v.re === 'number' && typeof v.im === 'number' && Math.abs(v.im) < 1e-12) return v.re
  return NaN
}
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))

function collectSymbols(...exprs: string[]): string[] {
  const set = new Set<string>()
  exprs.forEach((e) => {
    math.parse(e).traverse((n: any, path: string, parent: any) => {
      if (n.isSymbolNode && !(parent && parent.isFunctionNode && path === 'fn') && n.name !== 'pi') {
        set.add(n.name)
      }
    })
  })
  return [...set]
}

const SAMPLE_VALUES = [2, 3, 5, -2, 0.5, 7, -3.5, 1.5]
function sampleScope(vars: string[], trial: number) {
  const scope: Record<string, number> = {}
  vars.forEach((v, k) => {
    scope[v] = SAMPLE_VALUES[(trial + 2 * k) % SAMPLE_VALUES.length] + trial * 0.13
  })
  return scope
}

function expressionsEqual(a: string, b: string): boolean {
  const vars = collectSymbols(a, b)
  if (vars.length === 0) {
    const x = toNum(math.evaluate(a))
    const y = toNum(math.evaluate(b))
    return Number.isFinite(x) && Number.isFinite(y) && close(x, y)
  }
  let used = 0
  for (let t = 0; t < 8; t++) {
    const scope = sampleScope(vars, t)
    let x: number, y: number
    try {
      x = toNum(math.evaluate(a, { ...scope }))
      y = toNum(math.evaluate(b, { ...scope }))
    } catch {
      continue
    }
    if (!Number.isFinite(x) && !Number.isFinite(y)) continue
    if (!Number.isFinite(x) || !Number.isFinite(y) || !close(x, y)) return false
    used++
  }
  return used >= 3
}

// สมการ: ถือว่าเท่ากันถ้า (ซ้าย−ขวา) ของสองสมการต่างกันแค่ตัวคูณคงที่  เช่น  y=2x+1  กับ  2x+1=y
function equationsEqual(a: string, b: string): boolean {
  const pa = a.split('=')
  const pb = b.split('=')
  if (pa.length !== 2 || pb.length !== 2) return false

  // เฉลยเป็นรูปแก้แล้ว เช่น x=3 → เด็กต้องตอบให้ตัวแปรอยู่โดดๆ ด้านใดด้านหนึ่ง (ไม่รับ 2x=6)
  const solved = /^[a-z]$/.test(pb[0]) && !new RegExp(`\\b${pb[0]}\\b`).test(pb[1])
  if (solved && !(pa[0] === pb[0] || pa[1] === pb[0])) return false

  const f1 = `(${pa[0]})-(${pa[1]})`
  const f2 = `(${pb[0]})-(${pb[1]})`
  const vars = collectSymbols(f1, f2)
  if (vars.length === 0) return a === b

  let ratio: number | null = null
  let used = 0
  for (let t = 0; t < 8; t++) {
    const scope = sampleScope(vars, t)
    let x: number, y: number
    try {
      x = toNum(math.evaluate(f1, { ...scope }))
      y = toNum(math.evaluate(f2, { ...scope }))
    } catch {
      continue
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    if (Math.abs(y) < 1e-9) {
      if (Math.abs(x) > 1e-9) return false
      continue
    }
    const r = x / y
    if (ratio === null) ratio = r
    else if (!close(ratio, r)) return false
    used++
  }
  return used >= 3 && ratio !== null && Math.abs(ratio) > 1e-12
}

const REL = /(>=|<=|!=|>|<)/
function relationsEqual(a: string, b: string): boolean {
  const norm = (e: string) => {
    const m = e.match(/^(.*?)(>=|<=|!=|>|<)(.*)$/)
    if (!m) return null
    let [, l, op, r] = m
    if (op === '>') { [l, r] = [r, l]; op = '<' }
    else if (op === '>=') { [l, r] = [r, l]; op = '<=' }
    return { l, op, r }
  }
  const x = norm(a)
  const y = norm(b)
  if (!x || !y || x.op !== y.op) return false
  return expressionsEqual(x.l, y.l) && expressionsEqual(x.r, y.r)
}

// ---------------------------------------------------------------------
// 4) กติกา "เศษส่วนอย่างต่ำ"
// ---------------------------------------------------------------------
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

// คืน { reduced: boolean } ถ้าเป็นเศษส่วน/จำนวนคละ — คืน null ถ้าไม่ใช่เศษส่วนล้วน
function fractionForm(clean: string): { reduced: boolean } | null {
  const mixed = parseMixed(clean)
  const fracRe = /^\(?(\d+)\)?\/\(?(\d+)\)?$/
  if (mixed) {
    const m = mixed.rest.replace(/\s+/g, '').match(fracRe)
    if (!m) return null
    const [n, d] = [Number(m[1]), Number(m[2])]
    return { reduced: d > 0 && gcd(n, d) === 1 && n < d }
  }
  const m = clean.replace(/\s+/g, '').replace(/^-/, '').match(fracRe)
  if (!m) return null
  const [n, d] = [Number(m[1]), Number(m[2])]
  return { reduced: d > 0 && gcd(n, d) === 1 }
}

// ---------------------------------------------------------------------
// 5) ตรวจคำตอบ
// ---------------------------------------------------------------------
export function checkAnswer(studentRaw: string, correctRaw: string): AnswerCheck {
  const sClean = cleanAnswer(studentRaw)
  const cClean = cleanAnswer(correctRaw)
  if (!sClean) return { correct: false }

  const s = toExpr(sClean)
  const c = toExpr(cClean)
  if (s === c) return { correct: true }

  try {
    if (REL.test(s) || REL.test(c)) return { correct: relationsEqual(s, c) }
    if (s.includes('=') || c.includes('=')) return { correct: equationsEqual(s, c) }

    if (!expressionsEqual(s, c)) return { correct: false }

    if (REQUIRE_LOWEST_TERMS) {
      const sf = fractionForm(sClean)
      const cf = fractionForm(cClean)
      const correctIsReduced = cf ? cf.reduced : true // เฉลยเป็นจำนวนเต็ม/ทศนิยม = ถือว่าอย่างต่ำ
      if (sf && !sf.reduced && correctIsReduced) {
        return { correct: false, hint: 'ค่าถูกแล้ว! แต่ลองทำเศษส่วนให้เป็นอย่างต่ำก่อนนะ 😊' }
      }
    }
    return { correct: true }
  } catch {
    return { correct: false }
  }
}

// ---------------------------------------------------------------------
// 6) แปลงคำตอบที่พิมพ์ → LaTeX สำหรับพรีวิวสด (ทนต่อข้อความที่ยังพิมพ์ไม่เสร็จ)
// ---------------------------------------------------------------------
function closeParens(s: string): string {
  const open = (s.match(/\(/g) || []).length
  const close_ = (s.match(/\)/g) || []).length
  return open > close_ ? s + ')'.repeat(open - close_) : s
}

function exprToTex(token: string): string | null {
  let s = token.trim()
  if (!s) return '\\square'

  // จำนวนคละ: 3_1/2 → 3 + เศษส่วน
  const mixed = parseMixed(s)
  if (mixed) {
    const restTex = mixed.rest.trim() === '' ? '\\square' : exprToTex(mixed.rest)
    if (restTex === null) return null
    return `${mixed.neg ? '-' : ''}${mixed.whole}\\,${restTex}`
  }

  s = s.replace(/\s+/g, '')

  const candidates: string[] = [s, closeParens(s)]
  if (/[+\-*/^]$/.test(s)) candidates.push(closeParens(s + PLACEHOLDER))

  for (const cand of candidates) {
    try {
      // วงเล็บว่าง () → ช่องว่าง □ (เช่น sqrt( หรือเทมเพลต ()/() ที่ยังไม่ได้กรอก)
      const c = cand.replace(/\(\)/g, `(${PLACEHOLDER})`)
      const tex = math.parse(c).toTex({ parenthesis: 'auto', implicit: 'hide' })
      return tex
        .replace(/~/g, '')
        .replace(/\\mathrm\{([a-z])\}/g, '$1')
        .replace(new RegExp(`\\\\mathrm\\{${PLACEHOLDER}\\}`, 'g'), '\\square')
        .replace(new RegExp(PLACEHOLDER, 'g'), '\\square')
        .replace(/\\cdot/g, '\\times')
    } catch {
      /* ลองรูปแบบถัดไป */
    }
  }
  return null
}

const REL_TEX: Record<string, string> = {
  '>=': '\\geq', '<=': '\\leq', '!=': '\\neq', '=': '=', '>': '>', '<': '<',
}

/** คืนสตริง LaTeX ของคำตอบ, '' ถ้ายังไม่ได้พิมพ์, null ถ้าแปลงไม่ได้ (ให้โชว์ข้อความดิบแทน) */
export function answerToTex(raw: string): string | null {
  const clean = cleanAnswer(raw)
  if (!clean) return ''
  const parts = clean.split(/(>=|<=|!=|=|>|<)/)
  const out: string[] = []
  for (const part of parts) {
    if (REL_TEX[part]) {
      out.push(REL_TEX[part])
    } else {
      const t = exprToTex(part)
      if (t === null) return null
      out.push(t)
    }
  }
  return out.join(' ')
}

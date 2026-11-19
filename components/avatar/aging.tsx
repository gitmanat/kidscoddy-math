'use client'

import type { AgeStyle } from '@/lib/avatar'

/** ริ้วรอย/ร่องบนใบหน้าตามวัย (วาดทับใบหน้า ก่อนผมหน้า) */
export function AgeMarks({ age, skinDark }: { age: AgeStyle; skinDark: string }) {
  if (age === 'adult')
    return (
      <g fill="none" stroke={skinDark} strokeWidth="1.5" strokeLinecap="round" opacity=".55">
        {/* ร่องแก้ม */}
        <path d="M87 107 Q84 115 88 123" />
        <path d="M113 107 Q116 115 112 123" />
        {/* รอยหว่างคิ้วจางๆ */}
        <path d="M98 86 V90 M102 86 V90" strokeWidth="1.1" opacity=".7" />
      </g>
    )

  if (age === 'elder')
    return (
      <g fill="none" stroke={skinDark} strokeLinecap="round">
        {/* รอยย่นหน้าผาก */}
        <g strokeWidth="1.5" opacity=".6">
          <path d="M82 77 Q100 73 118 77" />
          <path d="M87 82 Q100 79 113 82" />
        </g>
        {/* ตีนกา */}
        <g strokeWidth="1.3" opacity=".65">
          <path d="M68 97 l-7 -2 M68 101 l-8 1 M68 105 l-7 4" />
          <path d="M132 97 l7 -2 M132 101 l8 1 M132 105 l7 4" />
        </g>
        {/* ถุงใต้ตา + ร่องแก้มลึก */}
        <g strokeWidth="1.4" opacity=".5">
          <path d="M76 109 Q83 112 90 109" />
          <path d="M110 109 Q117 112 124 109" />
          <path d="M86 108 Q80 117 85 127" strokeWidth="1.8" />
          <path d="M114 108 Q120 117 115 127" strokeWidth="1.8" />
        </g>
        {/* กระ/จุดด่างวัยชรา */}
        <g fill={skinDark} stroke="none" opacity=".35">
          <circle cx="66" cy="116" r="1.6" />
          <circle cx="134" cy="113" r="1.4" />
          <circle cx="72" cy="121" r="1.1" />
        </g>
      </g>
    )

  return null
}

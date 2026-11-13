export function CoinIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* ไล่เฉดสีทองด้านนอก */}
        <linearGradient id="goldOuter" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        {/* ไล่เฉดสีทองด้านใน */}
        <linearGradient id="goldInner" x1="30" y1="30" x2="6" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* เงาขอบล่างให้เหรียญดูนูนมีมิติ */}
      <circle cx="18" cy="19.5" r="14.5" fill="#92400E" />

      {/* ตัวเหรียญวงกลมสีทองหลัก */}
      <circle
        cx="18"
        cy="17.5"
        r="14.5"
        fill="url(#goldOuter)"
        stroke="#FEF9C3"
        strokeWidth="1.5"
      />

      {/* ขอบร่องวงกลมด้านใน */}
      <circle
        cx="18"
        cy="17.5"
        r="10.5"
        stroke="url(#goldInner)"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />

      {/* แสงวิบวับบนเนื้อเหรียญ */}
      <path
        d="M9 11C11 8 14.5 6.5 18 6.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* รูสี่เหลี่ยม/วงกลมตรงกลางเหรียญ (แบบเจาะทะลุเห็นพื้นหลัง) */}
      <circle
        cx="18"
        cy="17.5"
        r="4.2"
        fill="#78350F"
        stroke="#FEF08A"
        strokeWidth="1.5"
      />
    </svg>
  )
}
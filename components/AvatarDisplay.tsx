'use client'

import React from 'react'

interface AvatarDisplayProps {
  user: any
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClick?: () => void
  showLevel?: boolean
}

export function AvatarDisplay({ user, size = 'md', onClick, showLevel = true }: AvatarDisplayProps) {
  // กำหนดขนาดตาม Size
  const sizeClasses = {
    sm: 'w-12 h-12 rounded-2xl',
    md: 'w-20 h-20 rounded-3xl',
    lg: 'w-28 h-28 rounded-3xl',
    xl: 'w-36 h-36 rounded-[2rem]',
  }

  const hatSizes = {
    sm: 'text-lg -top-2.5',
    md: 'text-3xl -top-4',
    lg: 'text-4xl -top-5',
    xl: 'text-5xl -top-6',
  }

  const glassesSizes = {
    sm: 'text-sm top-3',
    md: 'text-2xl top-5',
    lg: 'text-3xl top-7',
    xl: 'text-4xl top-9',
  }

  // 1. สไตล์กรอบอวาตาร์ (Layer บนสุด)
  let frameStyle = 'border-2 border-white/60 shadow-md'
  if (user?.avatar_frame === 'frame_fire') {
    frameStyle = 'border-3 border-orange-500 shadow-lg shadow-orange-300 ring-2 ring-orange-300 animate-pulse'
  } else if (user?.avatar_frame === 'frame_gold') {
    frameStyle = 'border-3 border-yellow-400 shadow-lg shadow-yellow-200 ring-2 ring-yellow-300'
  } else if (user?.avatar_frame === 'frame_diamond') {
    frameStyle = 'border-3 border-cyan-400 shadow-lg shadow-cyan-200 ring-2 ring-cyan-300'
  }

  // 2. พื้นหลัง (Layer 1)
  const bgStyle = user?.equipped_bg?.startsWith('linear-gradient')
    ? { background: user.equipped_bg }
    : { background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }

  // ฟังก์ชันช่วยเรนเดอร์ไอเทม (รองรับทั้ง URL รูปภาพ PNG และ Emoji)
  const renderAccessory = (value: string | undefined, className: string) => {
    if (!value) return null
    if (value.startsWith('http') || value.startsWith('/')) {
      return <img src={value} alt="accessory" className={`absolute pointer-events-none object-contain ${className}`} />
    }
    return <span className={`absolute pointer-events-none select-none drop-shadow-md ${className}`}>{value}</span>
  }

  return (
    <div className="relative inline-block shrink-0" onClick={onClick}>
      {/* Layer 4 (ลอยเหนือหัว): หมวก / เครื่องประดับหัว */}
      {user?.equipped_hat && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 hover:-translate-y-1 ${hatSizes[size]}`}>
          {user.equipped_hat.startsWith('http') ? (
            <img src={user.equipped_hat} alt="hat" className="w-12 h-12 object-contain" />
          ) : (
            <span className="drop-shadow-lg select-none">{user.equipped_hat}</span>
          )}
        </div>
      )}

      {/* กล่องตัวละครหลัก */}
      <div
        style={bgStyle}
        className={`relative overflow-hidden flex items-center justify-center transition-transform ${
          onClick ? 'cursor-pointer hover:scale-105' : ''
        } ${sizeClasses[size]} ${frameStyle}`}
      >
        {/* Layer 1: พื้นหลังรูปภาพ (ถ้าเป็น URL) */}
        {user?.equipped_bg?.startsWith('http') && (
          <img src={user.equipped_bg} alt="bg" className="absolute inset-0 w-full h-full object-cover z-0" />
        )}

        {/* Layer 2: ตัวละคร / ชุดหลัก (Avatar) */}
        <img
          src={
            user?.avatar_url ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.display_name || 'kid')}`
          }
          alt="Avatar"
          className="relative z-10 w-[88%] h-[88%] object-contain drop-shadow"
        />

        {/* Layer 3: แว่นตา / หน้ากาก */}
        {user?.equipped_glasses && (
          <div className={`left-1/2 -translate-x-1/2 z-20 ${glassesSizes[size]}`}>
            {renderAccessory(user.equipped_glasses, 'w-full h-full')}
          </div>
        )}
      </div>

      {/* ป้าย Level มุมขวาล่าง */}
      {showLevel && (
        <span className="absolute -bottom-1.5 -right-1.5 z-30 bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md border border-white">
          Lv.{user?.level || 1}
        </span>
      )}
    </div>
  )
}
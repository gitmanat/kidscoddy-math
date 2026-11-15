'use client'

import React from 'react'

interface AvatarDisplayProps {
  user: any
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClick?: () => void
  showLevel?: boolean
}

export function AvatarDisplay({ user, size = 'md', onClick, showLevel = true }: AvatarDisplayProps) {
  // กำหนดขนาดกล่องตัวละครตาม Size
  const sizeClasses = {
    sm: 'w-12 h-12 rounded-2xl',
    md: 'w-20 h-20 rounded-3xl',
    lg: 'w-28 h-28 rounded-3xl',
    xl: 'w-36 h-36 rounded-[2rem]',
  }

  // 1. สไตล์กรอบออร่าเรืองแสง (Layer นอกสุด)
  let frameStyle = 'border-2 border-white/60 shadow-md'
  if (user?.avatar_frame === 'frame_fire') {
    frameStyle = 'border-3 border-orange-500 shadow-lg shadow-orange-300 ring-2 ring-orange-300 animate-pulse'
  } else if (user?.avatar_frame === 'frame_gold') {
    frameStyle = 'border-3 border-yellow-400 shadow-lg shadow-yellow-200 ring-2 ring-yellow-300'
  } else if (user?.avatar_frame === 'frame_diamond') {
    frameStyle = 'border-3 border-cyan-400 shadow-lg shadow-cyan-200 ring-2 ring-cyan-300'
  }

  // 2. พื้นหลัง (Background Layer)
  const bgStyle = user?.equipped_bg?.startsWith('linear-gradient')
    ? { background: user.equipped_bg }
    : { background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }

  return (
    <div className="relative inline-block shrink-0" onClick={onClick}>
      {/* กล่องเวทีตัวละครหลัก */}
      <div
        style={bgStyle}
        className={`relative overflow-hidden flex items-center justify-center transition-transform ${
          onClick ? 'cursor-pointer hover:scale-105' : ''
        } ${sizeClasses[size]} ${frameStyle}`}
      >
        {/* เลเยอร์ 0: พื้นหลังรูปภาพ (ถ้ามี) */}
        {user?.equipped_bg?.startsWith('http') && (
          <img src={user.equipped_bg} alt="bg" className="absolute inset-0 w-full h-full object-cover z-0" />
        )}

        {/* ==========================================
            เลเยอร์จัดตำแหน่งตัวละคร (Roblox-Style Layers)
            ========================================== */}

        {/* 1. รองเท้า (Shoes) - อยู่ล่างสุดของตัวละคร */}
        {user?.equipped_shoes && (
          <div className="absolute bottom-1 z-10 text-center text-xs md:text-sm pointer-events-none drop-shadow">
            {user.equipped_shoes.startsWith('http') ? (
              <img src={user.equipped_shoes} alt="shoes" className="w-8 h-8 object-contain" />
            ) : (
              <span>{user.equipped_shoes}</span>
            )}
          </div>
        )}

        {/* 2. กางเกง (Pants) - อยู่ช่วงล่างกลาง */}
        {user?.equipped_pants && (
          <div className="absolute bottom-3 z-10 text-center text-sm md:text-base pointer-events-none drop-shadow">
            {user.equipped_pants.startsWith('http') ? (
              <img src={user.equipped_pants} alt="pants" className="w-10 h-10 object-contain" />
            ) : (
              <span>{user.equipped_pants}</span>
            )}
          </div>
        )}

        {/* 3. ชุดหลัก หรือ เสื้อผ้า (Outfit / Avatar Base) */}
        <img
          src={
            user?.equipped_outfit ||
            user?.avatar_url ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.display_name || 'kid')}`
          }
          alt="Avatar"
          className="relative z-20 w-[80%] h-[80%] object-contain drop-shadow-md"
        />

        {/* 4. แว่นตา / หน้ากาก (Glasses) - ล็อกตำแหน่งไว้ที่กึ่งกลางหน้าเป๊ะๆ */}
        {user?.equipped_glasses && (
          <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none text-base md:text-xl drop-shadow">
            {user.equipped_glasses.startsWith('http') ? (
              <img src={user.equipped_glasses} alt="glasses" className="w-8 h-8 object-contain" />
            ) : (
              <span>{user.equipped_glasses}</span>
            )}
          </div>
        )}

        {/* 5. หมวก / ทรงผม (Hat) - ล็อกตำแหน่งไว้บนหัวพอดี */}
        {user?.equipped_hat && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 z-40 pointer-events-none text-xl md:text-2xl drop-shadow-lg transition-transform hover:-translate-y-0.5">
            {user.equipped_hat.startsWith('http') ? (
              <img src={user.equipped_hat} alt="hat" className="w-10 h-10 object-contain" />
            ) : (
              <span>{user.equipped_hat}</span>
            )}
          </div>
        )}
      </div>

      {/* ป้าย Level มุมขวาล่าง */}
      {showLevel && (
        <span className="absolute -bottom-1.5 -right-1.5 z-40 bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md border border-white">
          Lv.{user?.level || 1}
        </span>
      )}
    </div>
  )
}
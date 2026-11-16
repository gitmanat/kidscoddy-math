'use client'

import React from 'react'

interface AvatarDisplayProps {
  user: any
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClick?: () => void
  showLevel?: boolean
}

export function AvatarDisplay({ user, size = 'md', onClick, showLevel = true }: AvatarDisplayProps) {
  const sizeClasses = {
    sm: 'w-12 h-12 rounded-2xl',
    md: 'w-20 h-20 rounded-3xl',
    lg: 'w-28 h-28 rounded-3xl',
    xl: 'w-36 h-36 rounded-[2rem]',
  }

  // อัตราส่วนเทียบกับขนาดมาตรฐานในห้องแต่งตัว (xl = 144px)
  const sizeRatios = {
    sm: 48 / 144,  // ~0.33
    md: 80 / 144,  // ~0.55
    lg: 112 / 144, // ~0.78
    xl: 1,         // 1.00 (ขนาดอ้างอิงหลัก)
  }

  const ratio = sizeRatios[size]

  let frameStyle = 'border-2 border-white/60 shadow-md'
  if (user?.avatar_frame === 'frame_fire') {
    frameStyle = 'border-3 border-orange-500 shadow-lg shadow-orange-300 ring-2 ring-orange-300 animate-pulse'
  } else if (user?.avatar_frame === 'frame_gold') {
    frameStyle = 'border-3 border-yellow-400 shadow-lg shadow-yellow-200 ring-2 ring-yellow-300'
  } else if (user?.avatar_frame === 'frame_diamond') {
    frameStyle = 'border-3 border-cyan-400 shadow-lg shadow-cyan-200 ring-2 ring-cyan-300'
  }

  const bgStyle = user?.equipped_bg?.startsWith('linear-gradient')
    ? { background: user.equipped_bg }
    : { background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }

  // คำนวณพิกัดและสเกลตามสัดส่วนกล่องปัจจุบัน
  const glassesX = (user?.glasses_x || 0) * ratio
  const glassesY = (user?.glasses_y || 0) * ratio
  const glassesScale = (user?.glasses_scale || 1) * ratio

  const hatX = (user?.hat_x || 0) * ratio
  const hatY = (user?.hat_y || 0) * ratio
  const hatScale = (user?.hat_scale || 1) * ratio

  return (
    <div className="relative inline-block shrink-0" onClick={onClick}>
      <div
        style={bgStyle}
        className={`relative overflow-hidden flex items-center justify-center transition-transform ${
          onClick ? 'cursor-pointer hover:scale-105' : ''
        } ${sizeClasses[size]} ${frameStyle}`}
      >
        {user?.equipped_bg?.startsWith('http') && (
          <img src={user.equipped_bg} alt="bg" className="absolute inset-0 w-full h-full object-cover z-0" />
        )}

        {/* รองเท้า */}
        {user?.equipped_shoes && (
          <div
            className="absolute bottom-1 z-10 text-center pointer-events-none drop-shadow leading-none"
            style={{ fontSize: `${20 * ratio}px` }}
          >
            {user.equipped_shoes.startsWith('http') ? (
              <img
                src={user.equipped_shoes}
                alt="shoes"
                style={{ width: `${36 * ratio}px`, height: `${36 * ratio}px` }}
                className="object-contain"
              />
            ) : (
              <span>{user.equipped_shoes}</span>
            )}
          </div>
        )}

        {/* กางเกง */}
        {user?.equipped_pants && (
          <div
            className="absolute bottom-3 z-10 text-center pointer-events-none drop-shadow leading-none"
            style={{ fontSize: `${24 * ratio}px` }}
          >
            {user.equipped_pants.startsWith('http') ? (
              <img
                src={user.equipped_pants}
                alt="pants"
                style={{ width: `${48 * ratio}px`, height: `${48 * ratio}px` }}
                className="object-contain"
              />
            ) : (
              <span>{user.equipped_pants}</span>
            )}
          </div>
        )}

        {/* ชุดหลัก */}
        <img
          src={
            user?.equipped_outfit ||
            user?.avatar_url ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.display_name || 'kid')}`
          }
          alt="Avatar"
          className="relative z-20 w-[80%] h-[80%] object-contain drop-shadow-md"
        />

        {/* แว่นตา (ย่อ-ขยายและเลื่อนตำแหน่งตามสัดส่วนกล่อง) */}
        {user?.equipped_glasses && (
          <div
            className="absolute top-[38%] left-1/2 z-30 pointer-events-none drop-shadow leading-none transition-all duration-150"
            style={{
              fontSize: '36px', // ขนาดฐานสำหรับ xl (144px) แล้วจะถูกย่อด้วย glassesScale
              transform: `translate(calc(-50% + ${glassesX}px), calc(-50% + ${glassesY}px)) scale(${glassesScale})`,
            }}
          >
            {user.equipped_glasses.startsWith('http') ? (
              <img src={user.equipped_glasses} alt="glasses" className="w-12 h-12 object-contain" />
            ) : (
              <span>{user.equipped_glasses}</span>
            )}
          </div>
        )}

        {/* หมวก (ย่อ-ขยายและเลื่อนตำแหน่งตามสัดส่วนกล่อง) */}
        {user?.equipped_hat && (
          <div
            className="absolute top-1 left-1/2 z-40 pointer-events-none drop-shadow-lg leading-none transition-all duration-150"
            style={{
              fontSize: '42px', // ขนาดฐานสำหรับ xl (144px) แล้วจะถูกย่อด้วย hatScale
              transform: `translateX(calc(-50% + ${hatX}px)) translateY(${hatY}px) scale(${hatScale})`,
            }}
          >
            {user.equipped_hat.startsWith('http') ? (
              <img src={user.equipped_hat} alt="hat" className="w-14 h-14 object-contain" />
            ) : (
              <span>{user.equipped_hat}</span>
            )}
          </div>
        )}
      </div>

      {showLevel && (
        <span className="absolute -bottom-1.5 -right-1.5 z-40 bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md border border-white">
          Lv.{user?.level || 1}
        </span>
      )}
    </div>
  )
}
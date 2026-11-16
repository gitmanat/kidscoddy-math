'use client'

import React from 'react'

interface AvatarDisplayProps {
  user: any
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClick?: () => void
  showLevel?: boolean
}

// แทนที่ฟังก์ชัน CompletedAvatarsBadge เดิมใน components/AvatarDisplay.tsx
export function CompletedAvatarsBadge({ completedUsers }: { completedUsers: any[] }) {
  if (!completedUsers || completedUsers.length === 0) {
    return (
      <div className="my-4 p-3 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-dashed border-amber-300 flex items-center justify-between gap-2 group-hover:border-amber-400 transition">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-600 flex items-center justify-center text-lg animate-bounce">
            👑
          </span>
          <div>
            <p className="text-xs font-black text-amber-900">ยังไม่มีผู้พิชิตชุดนี้!</p>
            <p className="text-[10px] font-bold text-amber-600">มาเป็นคนแรกที่คว้าคอยน์ชุดนี้กันเถอะ 🚀</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-amber-400 text-amber-950 text-[10px] font-black rounded-lg shadow-xs shrink-0">
          ชิงอันดับ 1
        </span>
      </div>
    )
  }

  const maxDisplay = 4
  const visibleUsers = completedUsers.slice(0, maxDisplay)
  const remainingCount = completedUsers.length - maxDisplay

  const topUser = visibleUsers[0]
  const topUserName = topUser?.display_name || 'เพื่อน'
  const topCoins = topUser?.coinsEarned || 0

  return (
    <div className="my-4 p-3 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-amber-50/80 border border-indigo-100/80 shadow-xs space-y-2">
      {/* แถวบน: หัวข้อชวนแข่งขัน + จำนวนผู้พิชิต */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-indigo-700 flex items-center gap-1">
          <span>🔥</span> เพื่อนที่พิชิตภารกิจนี้แล้ว ({completedUsers.length} คน)
        </span>
        <span className="px-2 py-0.5 bg-amber-400/25 text-amber-900 border border-amber-300/60 rounded-full text-[10px] font-black flex items-center gap-1">
          <span>🏆 สูงสุด</span>
          <span className="text-amber-700">+{topCoins} 🪙</span>
        </span>
      </div>

      {/* แถวล่าง: รูปอวตารซ้อนกัน + ชื่อแชมป์ประจำชุด */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex -space-x-2.5 shrink-0 py-0.5">
          {visibleUsers.map((user, idx) => (
            <div
              key={user.id || idx}
              title={`${user.display_name} เก็บได้ +${user.coinsEarned} Coins`}
              className={`relative w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-black text-white overflow-hidden ring-2 ${
                idx === 0
                  ? 'ring-amber-400 z-20 scale-105 shadow-md shadow-amber-200'
                  : user.isPerfect
                  ? 'ring-yellow-300 z-10'
                  : 'ring-white'
              } transition-transform hover:scale-125 hover:z-30 cursor-pointer`}
            >
              {/* แสดงรูปอวตารจริงของเด็ก */}
              <img
                src={
                  user?.equipped_outfit ||
                  user?.avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.display_name || 'kid')}`
                }
                alt={user.display_name || 'avatar'}
                className="w-full h-full object-cover"
              />
              {/* มงกุฎเล็กๆ บนหัวคนที่ได้คะแนนสูงสุด */}
              {idx === 0 && (
                <span className="absolute -top-0.5 right-0 text-[9px] drop-shadow">👑</span>
              )}
            </div>
          ))}

          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white z-10 shadow-xs">
              +{remainingCount}
            </div>
          )}
        </div>

        {/* ข้อความสรุปชื่อเพื่อน */}
        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-black text-gray-800 truncate">
            {completedUsers.length === 1
              ? `${topUserName} เก็บไป +${topCoins} 🪙`
              : `${topUserName} และอีก ${completedUsers.length - 1} คน`}
          </p>
          <p className="text-[10px] font-bold text-indigo-600">
            ชี้ที่รูปเพื่อดูคอยน์ของเพื่อน 👆
          </p>
        </div>
      </div>
    </div>
  )
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
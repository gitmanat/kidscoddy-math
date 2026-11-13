import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ตรวจสอบเฉพาะเส้นทางที่ขึ้นต้นด้วย /admin
  if (path.startsWith('/admin')) {
    // อ่านค่า Role จาก Cookie
    const role = request.cookies.get('kidscoddy_role')?.value

    // ถ้าไม่ใช่ admin ให้ดีดกลับไปหน้า dashboard ทันที
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

// กำหนดให้ Middleware ทำงานเฉพาะเส้นทาง /admin ขึ้นไปเท่านั้น
export const config = {
  matcher: '/admin/:path*',
}
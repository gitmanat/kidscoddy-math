'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log("กำลังค้นหา:", { username: username.trim().toLowerCase(), pin })

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .eq('pin_code', pin.trim())
        .single()

      console.log("ผลลัพธ์จาก Supabase:", { data, dbError })

      if (dbError || !data) {
        setError(`เข้าสู่ระบบไม่สำเร็จ: ${dbError?.message || 'ไม่พบข้อมูล'}`)
        setLoading(false)
        return
      }

      localStorage.setItem('kidscoddy_user', JSON.stringify(data))

      if (data.role === 'admin') {
        router.push('/admin/exercises')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      console.error("Catch Error:", err)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-indigo-50">
        {/* ส่วนหัวโลโก้สถาบัน */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 text-white text-2xl font-bold mb-4 shadow-md">
            KC
          </div>
          <h1 className="text-2xl font-bold text-gray-800">KidsCoddy Math</h1>
          <p className="text-gray-500 text-sm mt-1">ระบบฝึกทำโจทย์คณิตศาสตร์และตรรกะออนไลน์</p>
        </div>

        {/* แจ้งเตือนเมื่อกรอกผิด */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        {/* ฟอร์มเข้าสู่ระบบ */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              รหัสนักเรียน (Username)
            </label>
            <input
              type="text"
              required
              placeholder="เช่น kc001"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-800 text-lg transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              รหัส PIN 4 หลัก
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-800 text-center text-2xl tracking-[0.5em] font-bold transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition duration-200 disabled:opacity-50 text-lg cursor-pointer"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* คำแนะนำสำหรับทดสอบ */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
          บัญชีทดสอบ: นักเรียน <span className="font-mono text-gray-600">kc001</span> (PIN: <span className="font-mono text-gray-600">1234</span>)
        </div>
      </div>
    </div>
  )
}
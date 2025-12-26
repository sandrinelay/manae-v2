'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/capture', label: 'Capturer', icon: <CaptureIcon /> },
    { href: '/ma-liste', label: 'Ma Liste', icon: <ListIcon /> },
    { href: '/profil', label: 'Profil', icon: <ProfileIcon /> },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-bottom">
      {/* Safe area padding for iOS */}
      <div className="max-w-lg mx-auto flex items-center justify-around px-4 py-2 pb-[env(safe-area-inset-bottom,8px)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 min-w-[70px] py-1"
            >
              {/* Icon container with background when active */}
              <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center transition-all
                ${isActive
                  ? 'bg-secondary text-white shadow-lg'
                  : 'text-text-muted hover:bg-gray-light'
                }
              `}>
                {item.icon}
              </div>
              {/* Label */}
              <span className={`
                text-xs font-medium transition-colors
                ${isActive ? 'text-secondary' : 'text-text-muted'}
              `}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function CaptureIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
      <path d="M18.364 5.636l-2.121 2.121m-8.486 8.486l-2.121 2.121m0-12.728l2.121 2.121m8.486 8.486l2.121 2.121" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

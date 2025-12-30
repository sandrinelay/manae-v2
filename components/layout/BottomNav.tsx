'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CaptureIcon, BrainIcon, UserIcon } from '@/components/ui/icons'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/capture', label: 'Capturer', icon: CaptureIcon },
    { href: '/clarte', label: 'Clarté', icon: BrainIcon },
    { href: '/profil', label: 'Profil', icon: UserIcon },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-bottom">
      {/* Safe area padding for iOS */}
      <div className="max-w-lg mx-auto flex items-center justify-around px-4 py-2 pb-[env(safe-area-inset-bottom,8px)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

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
                <Icon className="w-[22px] h-[22px]" />
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

'use client'

import { ChevronRightIcon, HelpCircleIcon, FileTextIcon, BookOpenIcon } from '@/components/ui/icons'

const SITE_URL = 'https://manae.app'

const LEGAL_LINKS = [
  { label: 'CGU', href: `${SITE_URL}/legal/cgu` },
  { label: 'Confidentialité', href: `${SITE_URL}/legal/confidentialite` },
  { label: 'Mentions légales', href: `${SITE_URL}/legal/mentions-legales` },
]

export function MoreSection() {
  return (
    <section className="bg-white rounded-2xl overflow-hidden">
      <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
        Plus
      </h2>

      {/* Guide simple */}
      <a
        href={`${SITE_URL}/guide-simple`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpenIcon className="w-5 h-5 text-text-muted" />
          <span className="text-text-dark">Guide simple</span>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-text-muted" />
      </a>

      {/* Support */}
      <a
        href="mailto:support@manae.app"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-t border-gray-100"
      >
        <div className="flex items-center gap-3">
          <HelpCircleIcon className="w-5 h-5 text-text-muted" />
          <span className="text-text-dark">Support</span>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-text-muted" />
      </a>

      {/* Liens légaux */}
      {LEGAL_LINKS.map((link, index) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
            index === 0 ? 'border-t border-gray-100' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <FileTextIcon className="w-5 h-5 text-text-muted" />
            <span className="text-text-dark">{link.label}</span>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-text-muted" />
        </a>
      ))}
    </section>
  )
}

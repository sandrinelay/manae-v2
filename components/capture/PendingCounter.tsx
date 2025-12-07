'use client'

interface PendingCounterProps {
    count: number
}

export default function PendingCounter({ count }: PendingCounterProps) {
    if (count === 0) return null

    return (
        <div className="bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold font-quicksand">
                        {count}
                    </span>
                </div>

                <div>
                    <p className="text-text-dark font-medium text-sm font-quicksand">
                        {count} capture{count > 1 ? 's' : ''} en attente
                    </p>
                    <p className="text-text-muted text-xs">
                        {count === 1 ? 'Prête' : 'Prêtes'} à être organisée{count > 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
    )
}
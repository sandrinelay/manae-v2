import React from 'react';

interface EnergyCardProps {
    id: string;
    icon: React.FC<{ className?: string }>;
    label: string;
    timeRange: string;
    selected: boolean;
    onClick: () => void;
}

export const EnergyCard: React.FC<EnergyCardProps> = ({
    icon: Icon,
    label,
    timeRange,
    selected,
    onClick
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
        relative p-3 rounded-xl border-2
        transition-all duration-200
        flex flex-col items-center justify-center gap-1
        min-h-[100px]
        ${selected
                    ? 'bg-primary border-primary text-white shadow-md'
                    : 'bg-white border-border text-text-dark hover:border-primary hover:shadow-sm hover:-translate-y-0.5'
                }
      `}
        >
            {/* Checkmark si sélectionné */}
            {selected && (
                <span className="absolute top-3 right-3 text-white text-lg font-bold">
                    ✓
                </span>
            )}

            {/* Icon moderne */}
            <Icon className={`w-7 h-7 ${selected ? 'text-white' : 'text-primary'}`} />

            {/* Label */}
            <span className={`font-semibold text-sm text-center ${selected ? 'text-white' : 'text-text-dark'}`}>
                {label}
            </span>

            {/* Horaire */}
            <span className={`text-xs ${selected ? 'text-white/80' : 'text-text-medium'}`}>
                {timeRange}
            </span>
        </button>
    );
};
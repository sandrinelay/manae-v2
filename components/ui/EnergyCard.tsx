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
        relative p-5 rounded-2xl border-2 
        transition-all duration-200
        flex flex-col items-center justify-center gap-2
        min-h-[140px]
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
            <Icon className={`w-10 h-10 mb-1 ${selected ? 'text-white' : 'text-primary'}`} />

            {/* Label */}
            <span className={`font-semibold text-base text-center ${selected ? 'text-white' : 'text-text-dark'}`}>
                {label}
            </span>

            {/* Horaire */}
            <span className={`text-sm ${selected ? 'text-white/80' : 'text-text-medium'}`}>
                {timeRange}
            </span>
        </button>
    );
};
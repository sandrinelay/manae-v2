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
                    ? 'bg-[#BC8A7F] border-[#BC8A7F] text-white shadow-md'
                    : 'bg-white border-[#E5E7EB] text-[#443C38] hover:border-[#BC8A7F] hover:shadow-sm hover:-translate-y-0.5'
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
            <Icon className={`w-10 h-10 mb-1 ${selected ? 'text-white' : 'text-[#BC8A7F]'}`} />

            {/* Label */}
            <span className={`font-semibold text-base text-center ${selected ? 'text-white' : 'text-[#443C38]'}`}>
                {label}
            </span>

            {/* Horaire */}
            <span className={`text-sm ${selected ? 'text-white/80' : 'text-[#6B625E]'}`}>
                {timeRange}
            </span>
        </button>
    );
};
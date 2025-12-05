import React from 'react';
import { Constraint, CATEGORY_CONFIG, DAYS_OF_WEEK } from '@/types';
import {
    BriefcaseIcon,
    GraduationCapIcon,
    HomeIcon,
    ActivityIcon,
    UsersIcon,
    PinIcon
} from '@/components/ui/icons/CategoryIcons';

interface ConstraintCardProps {
    constraint: Constraint;
    onEdit: (constraint: Constraint) => void;
    onDelete: (id: string) => void;
}

const CATEGORY_ICONS = {
    work: BriefcaseIcon,
    school: GraduationCapIcon,
    home: HomeIcon,
    sport: ActivityIcon,
    social: UsersIcon,
    other: PinIcon
};

export const ConstraintCard: React.FC<ConstraintCardProps> = ({
    constraint,
    onEdit,
    onDelete
}) => {
    const Icon = CATEGORY_ICONS[constraint.category];
    const categoryInfo = CATEGORY_CONFIG[constraint.category];
    const selectedDays = DAYS_OF_WEEK.filter(day =>
        constraint.days.includes(day.id)
    ).map(day => day.label).join(' ');

    return (
        <div className="bg-white border-2 border-border rounded-2xl p-4 mb-3">
            {/* Header avec nom et actions */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-primary" />
                    <h3 className="font-semibold text-text-dark">{constraint.name}</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit(constraint)}
                        className="p-1.5 hover:bg-mint rounded-lg transition-colors"
                        aria-label="Modifier"
                    >
                        <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDelete(constraint.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Supprimer"
                    >
                        <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Jours */}
            <div className="flex items-center gap-2 mb-2 text-sm text-text-medium">
                <span>📅</span>
                <span>{selectedDays}</span>
            </div>

            {/* Horaires */}
            <div className="flex items-center gap-2 mb-2 text-sm text-text-medium">
                <span>⏰</span>
                <span>{constraint.start_time} - {constraint.end_time}</span>
            </div>

            {/* Pause déjeuner */}
            {constraint.allow_lunch_break && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                        <line x1="6" y1="1" x2="6" y2="4" />
                        <line x1="10" y1="1" x2="10" y2="4" />
                        <line x1="14" y1="1" x2="14" y2="4" />
                    </svg>
                    <span>Pause déjeuner 12h-14h</span>
                </div>
            )}
        </div>
    );
};
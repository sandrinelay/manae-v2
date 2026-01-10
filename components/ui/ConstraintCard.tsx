import React from 'react';
import { Constraint, DAYS_OF_WEEK } from '@/types';
import {
    BriefcaseIcon,
    GraduationCapIcon,
    HomeIcon,
    ActivityIcon,
    UsersIcon,
    PinIcon,
    EditIcon,
    TrashIcon,
    CoffeeIcon,
    CalendarIcon,
    ClockIcon
} from '@/components/ui/icons';
import { IconButton } from '@/components/ui/IconButton';

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
                    <IconButton
                        icon={<EditIcon />}
                        label="Modifier"
                        variant="teal"
                        size="sm"
                        onClick={() => onEdit(constraint)}
                    />
                    <IconButton
                        icon={<TrashIcon />}
                        label="Supprimer"
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(constraint.id)}
                    />
                </div>
            </div>

            {/* Jours */}
            <div className="flex items-center gap-2 mb-2 text-sm text-text-medium">
                <CalendarIcon className="w-4 h-4" />
                <span>{selectedDays}</span>
            </div>

            {/* Horaires */}
            <div className="flex items-center gap-2 mb-2 text-sm text-text-medium">
                <ClockIcon className="w-4 h-4" />
                <span>{constraint.start_time} - {constraint.end_time}</span>
            </div>

            {/* Pause déjeuner */}
            {constraint.allow_lunch_break && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                    <CoffeeIcon className="w-4 h-4" />
                    <span>Pause déjeuner 12h-14h</span>
                </div>
            )}
        </div>
    );
};
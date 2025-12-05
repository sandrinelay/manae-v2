import React from 'react';
import { Button } from './Button';
import { Constraint } from '@/types';

interface ConflictModalProps {
    newConstraintName: string;
    conflictingConstraint: Constraint;
    overlappingDays: string[];
    onCancel: () => void;
    onConfirm: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
    newConstraintName,
    conflictingConstraint,
    overlappingDays,
    onCancel,
    onConfirm
}) => {
    const daysLabel = overlappingDays.length === 1
        ? overlappingDays[0]
        : `${overlappingDays.length} jours`;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">⚠️</span>
                    <h3 className="text-xl font-bold text-text-dark">
                        Chevauchement détecté
                    </h3>
                </div>

                {/* Message */}
                <div className="mb-6 space-y-3">
                    <p className="text-text-medium">
                        <strong className="text-text-dark">"{newConstraintName}"</strong> chevauche{' '}
                        <strong className="text-text-dark">"{conflictingConstraint.name}"</strong>{' '}
                        sur <strong>{daysLabel}</strong>.
                    </p>

                    <div className="bg-mint border-l-4 border-primary p-3 rounded">
                        <p className="text-sm text-text-medium">
                            💡 Tu peux avoir 2 indisponibilités en même temps, mais l'IA ne pourra pas
                            suggérer de tâches pendant ces créneaux.
                        </p>
                    </div>
                </div>

                {/* Détails du conflit */}
                <div className="bg-gray-light rounded-xl p-4 mb-6 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Nouveau :</span>
                        <span className="text-text-dark font-medium">
                            {newConstraintName}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">Existant :</span>
                        <span className="text-text-dark font-medium">
                            {conflictingConstraint.name} ({conflictingConstraint.start_time} - {conflictingConstraint.end_time})
                        </span>
                    </div>
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        ← Modifier
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1"
                    >
                        Ajouter quand même →
                    </Button>
                </div>
            </div>
        </div>
    );
};
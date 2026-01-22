'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ActionButton } from './ActionButton';
import { Constraint } from '@/types';

interface ConflictModalProps {
    newConstraintName: string;
    conflictingConstraint: Constraint;
    overlappingDays: string[];
    onCancel: () => void;
    onConfirm: () => void;
}

// Traduction des jours de la semaine
const DAY_TRANSLATIONS: Record<string, string> = {
    'monday': 'lundi',
    'tuesday': 'mardi',
    'wednesday': 'mercredi',
    'thursday': 'jeudi',
    'friday': 'vendredi',
    'saturday': 'samedi',
    'sunday': 'dimanche'
}

function translateDay(day: string): string {
    return DAY_TRANSLATIONS[day.toLowerCase()] || day
}

// Helper pour détecter si on est côté client
function subscribeMounted() {
    return () => {};
}

function getMountedSnapshot() {
    return true;
}

function getServerMountedSnapshot() {
    return false;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
    newConstraintName,
    conflictingConstraint,
    overlappingDays,
    onCancel,
    onConfirm
}) => {
    // Utiliser useSyncExternalStore pour détecter le montage côté client
    const isMounted = useSyncExternalStore(
        subscribeMounted,
        getMountedSnapshot,
        getServerMountedSnapshot
    );

    const daysLabel = overlappingDays.length === 1
        ? translateDay(overlappingDays[0])
        : overlappingDays.length === 2
            ? `${translateDay(overlappingDays[0])} et ${translateDay(overlappingDays[1])}`
            : `${overlappingDays.length} jours`;

    // Gérer le scroll du body (cet effet est OK car il ne fait pas de setState)
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Empêcher la propagation des clics depuis la modale vers l'overlay
    const handleModalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    // Gérer la confirmation avec propagation stoppée
    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        onConfirm();
    };

    // Gérer l'annulation avec propagation stoppée
    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCancel();
    };

    const modalContent = (
        <div
            className="fixed inset-0 flex items-center justify-center p-6 animate-fadeIn"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 2147483647, // Maximum z-index value
                isolation: 'isolate',
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={handleCancel}
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1,
                    animation: 'fadeIn 0.2s ease-out'
                }}
            />

            {/* Modal */}
            <div
                className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                style={{
                    position: 'relative',
                    zIndex: 2,
                    animation: 'scaleIn 0.3s ease-out',
                    border: '2px solid rgba(20, 184, 166, 0.3)'
                }}
                onClick={handleModalClick}
            >
                {/* Header */}
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-text-dark">
                        Chevauchement détecté
                    </h3>
                </div>

                {/* Message */}
                <div className="mb-6 space-y-3">
                    <p className="text-text-medium leading-relaxed">
                        <strong className="text-text-dark">&quot;{newConstraintName}&quot;</strong> chevauche{' '}
                        <strong className="text-text-dark">&quot;{conflictingConstraint.name}&quot;</strong>{' '}
                        sur <strong>{daysLabel}</strong>.
                    </p>

                    <div className="bg-mint border-l-4 border-primary p-3 rounded-lg">
                        <p className="text-sm text-text-medium leading-relaxed">
                            Les deux indisponibilités seront actives. L&apos;IA évitera de suggérer des tâches pendant ces créneaux.
                        </p>
                    </div>
                </div>

                {/* Détails du conflit */}
                <div className="bg-gray-light rounded-xl p-4 mb-6 space-y-2 text-sm">
                    <div className="flex justify-between items-start gap-2">
                        <span className="text-text-muted">Nouveau :</span>
                        <span className="text-text-dark font-medium text-right">
                            {newConstraintName}
                        </span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                        <span className="text-text-muted">Existant :</span>
                        <span className="text-text-dark font-medium text-right">
                            {conflictingConstraint.name}
                            <br />
                            <span className="text-xs text-text-muted">
                                {conflictingConstraint.start_time} - {conflictingConstraint.end_time}
                            </span>
                        </span>
                    </div>
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                    <ActionButton
                        type="button"
                        label="← Modifier"
                        variant="secondary"
                        onClick={handleCancel}
                        className="flex-1"
                    />
                    <ActionButton
                        type="button"
                        label="Ajouter quand même →"
                        variant="save"
                        onClick={handleConfirm}
                        className="flex-1"
                    />
                </div>
            </div>
        </div>
    );

    // Ne rien afficher tant que le composant n'est pas monté côté client
    if (!isMounted) {
        return null;
    }

    // Utiliser createPortal pour rendre au top-level du DOM
    return createPortal(modalContent, document.body);
};
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    const [isMounted, setIsMounted] = useState(false);

    const daysLabel = overlappingDays.length === 1
        ? overlappingDays[0]
        : `${overlappingDays.length} jours`;

    // S'assurer que le composant est monté côté client
    useEffect(() => {
        setIsMounted(true);
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
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">⚠️</span>
                    <h3 className="text-xl font-bold text-text-dark">
                        Chevauchement détecté
                    </h3>
                </div>

                {/* Message */}
                <div className="mb-6 space-y-3">
                    <p className="text-text-medium leading-relaxed">
                        <strong className="text-text-dark">"{newConstraintName}"</strong> chevauche{' '}
                        <strong className="text-text-dark">"{conflictingConstraint.name}"</strong>{' '}
                        sur <strong>{daysLabel}</strong>.
                    </p>

                    <div className="bg-mint border-l-4 border-primary p-3 rounded-lg">
                        <p className="text-sm text-text-medium leading-relaxed">
                            💡 Tu peux avoir 2 indisponibilités en même temps, mais l'IA ne pourra pas
                            suggérer de tâches pendant ces créneaux.
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
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancel}
                        className="flex-1"
                    >
                        ← Modifier
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1"
                    >
                        Ajouter quand même →
                    </Button>
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
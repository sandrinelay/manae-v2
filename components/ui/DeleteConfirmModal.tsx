'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface DeleteConfirmModalProps {
    itemName: string;
    onCancel: () => void;
    onConfirm: () => void;
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

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    itemName,
    onCancel,
    onConfirm
}) => {
    // Utiliser useSyncExternalStore pour détecter le montage côté client
    const isMounted = useSyncExternalStore(
        subscribeMounted,
        getMountedSnapshot,
        getServerMountedSnapshot
    );

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
                    border: '2px solid rgba(239, 68, 68, 0.3)' // Red border with opacity
                }}
                onClick={handleModalClick}
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🗑️</span>
                    <h3 className="text-xl font-bold text-text-dark">
                        Supprimer l&apos;indisponibilité ?
                    </h3>
                </div>

                {/* Message */}
                <div className="mb-6 space-y-3">
                    <p className="text-text-medium leading-relaxed">
                        Es-tu sûr(e) de vouloir supprimer <strong className="text-text-dark">&quot;{itemName}&quot;</strong> ?
                    </p>

                    <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg">
                        <p className="text-sm text-red-700 leading-relaxed">
                            ⚠️ Cette action est irréversible.
                        </p>
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
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                        Supprimer
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

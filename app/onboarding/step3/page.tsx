'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ConstraintCard } from '@/components/ui/ConstraintCard';
import { ConstraintForm } from '@/components/ui/ConstraintForm';
import { Constraint } from '@/types';
import { detectConflict } from '@/utils/conflictDetector';
import { ConflictModal } from '@/components/ui/ConflictModal';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { saveConstraints, getConstraints } from '@/services/supabaseService';
import { PlusIcon } from '@/components/ui/icons';

export default function OnboardingStep3() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Contrainte "Travail" pré-remplie
    const defaultConstraint: Constraint = {
        id: crypto.randomUUID(),
        name: 'Travail',
        category: 'work',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        start_time: '09:00',
        end_time: '18:00',
        allow_lunch_break: true
    };

    const [constraints, setConstraints] = useState<Constraint[]>([defaultConstraint]);

    // Charger les contraintes existantes
    useEffect(() => {
        const loadConstraints = async () => {
            try {
                const existingConstraints = await getConstraints();
                if (existingConstraints && existingConstraints.length > 0) {
                    // Convertir le format de la DB vers le format local
                    const mapped: Constraint[] = existingConstraints.map(c => ({
                        id: c.id,
                        name: c.name,
                        category: c.category as Constraint['category'],
                        days: c.days,
                        start_time: c.start_time,
                        end_time: c.end_time,
                        allow_lunch_break: c.allow_lunch_break ?? false
                    }));
                    setConstraints(mapped);
                }
            } catch (error) {
                console.error('Error loading constraints:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadConstraints();
    }, []);
    const [showForm, setShowForm] = useState(false);
    const [editingConstraint, setEditingConstraint] = useState<Constraint | undefined>();
    const [pendingConstraint, setPendingConstraint] = useState<Omit<Constraint, 'id'> | null>(null);
    const [conflictInfo, setConflictInfo] = useState<{ constraint: Constraint; days: string[] } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    const handleAddConstraint = (data: Omit<Constraint, 'id'>) => {
        // Détecter les conflits
        const conflict = detectConflict(data, constraints);

        console.log('🔍 Détection de conflit:', {
            nouveauNom: data.name,
            hasConflict: conflict.hasConflict,
            conflictingConstraint: conflict.conflictingConstraint,
            overlappingDays: conflict.overlappingDays
        });

        if (conflict.hasConflict && conflict.conflictingConstraint) {
            // Afficher la modale de conflit
            console.log('⚠️ Conflit détecté! Affichage de la modale');
            setPendingConstraint(data);
            setConflictInfo({
                constraint: conflict.conflictingConstraint,
                days: conflict.overlappingDays || []
            });
        } else {
            // Pas de conflit, ajouter directement
            console.log('✅ Pas de conflit, ajout direct');
            const newConstraint: Constraint = {
                ...data,
                id: crypto.randomUUID()
            };
            setConstraints(prev => [...prev, newConstraint]);
            setShowForm(false);
        }
    };

    const handleEditConstraint = (data: Omit<Constraint, 'id'>) => {
        if (editingConstraint) {
            // Détecter les conflits (en excluant la contrainte en cours d'édition)
            const conflict = detectConflict(data, constraints, editingConstraint.id);

            if (conflict.hasConflict && conflict.conflictingConstraint) {
                setPendingConstraint(data);
                setConflictInfo({
                    constraint: conflict.conflictingConstraint,
                    days: conflict.overlappingDays || []
                });
            } else {
                setConstraints(prev => prev.map(c =>
                    c.id === editingConstraint.id ? { ...data, id: c.id } : c
                ));
                setEditingConstraint(undefined);
                setShowForm(false);
            }
        }
    };

    const handleDeleteConstraint = (id: string) => {
        const constraint = constraints.find(c => c.id === id);
        if (constraint) {
            setDeleteTarget({ id: constraint.id, name: constraint.name });
        }
    };

    const handleConfirmDelete = () => {
        if (deleteTarget) {
            setConstraints(prev => prev.filter(c => c.id !== deleteTarget.id));
            setDeleteTarget(null);
        }
    };

    const handleCancelDelete = () => {
        setDeleteTarget(null);
    };

    const handleEdit = (constraint: Constraint) => {
        setEditingConstraint(constraint);
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingConstraint(undefined);
    };

    const handleBack = () => {
        router.push('/onboarding/step2');
    };

    const handleSubmit = async () => {
        if (isSaving) return;
        setIsSaving(true);

        try {
            // Sauvegarder vers Supabase
            const constraintsForDb = constraints.map(c => ({
                name: c.name,
                category: c.category,
                days: c.days,
                start_time: c.start_time,
                end_time: c.end_time,
                allow_lunch_break: c.allow_lunch_break
            }));
            await saveConstraints(constraintsForDb);

            // Garder aussi en localStorage
            const existingData = localStorage.getItem('manae_onboarding');
            const parsedData = existingData ? JSON.parse(existingData) : {};
            const payload = {
                ...parsedData,
                step: 3,
                constraints: constraints,
                completed_at: new Date().toISOString()
            };
            localStorage.setItem('manae_onboarding', JSON.stringify(payload));

            console.log('Saved to Supabase and localStorage');
            router.push('/onboarding/step4');
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erreur lors de la sauvegarde');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmConflict = () => {
        if (pendingConstraint) {
            if (editingConstraint) {
                // Mode édition
                setConstraints(prev => prev.map(c =>
                    c.id === editingConstraint.id ? { ...pendingConstraint, id: c.id } : c
                ));
                setEditingConstraint(undefined);
            } else {
                // Mode ajout
                const newConstraint: Constraint = {
                    ...pendingConstraint,
                    id: crypto.randomUUID()
                };
                setConstraints(prev => [...prev, newConstraint]);
            }
            setShowForm(false);
            setPendingConstraint(null);
            setConflictInfo(null);
        }
    };

    const handleCancelConflict = () => {
        setPendingConstraint(null);
        setConflictInfo(null);
        // Garde le formulaire ouvert pour modification
    };

    return (
        <div className="min-h-screen bg-mint flex items-start justify-center">
            <div className="w-full max-w-md">



                {/* Content */}
                <main>
                    <h2 className="text-2xl font-bold text-text-dark mb-3">
                        Tes temps indisponibles
                    </h2>
                    <p className="text-base text-text-medium mb-6 leading-relaxed">
                        Bloque tes créneaux fixes pour que je te propose le bon moment.
                    </p>

                    {/* Liste des contraintes */}
                    <div className="mb-4">
                        {constraints.map(constraint => (
                            <ConstraintCard
                                key={constraint.id}
                                constraint={constraint}
                                onEdit={handleEdit}
                                onDelete={handleDeleteConstraint}
                            />
                        ))}
                    </div>

                    {/* Formulaire d'ajout/édition */}
                    {showForm && (
                        <ConstraintForm
                            constraint={editingConstraint}
                            existingConstraints={constraints}
                            onSave={editingConstraint ? handleEditConstraint : handleAddConstraint}
                            onCancel={handleCancelForm}
                        />
                    )}

                    {/* Bouton ajouter */}
                    {!showForm && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowForm(true)}
                            className="mb-6"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Ajouter une indisponibilité
                        </Button>
                    )}

                    {/* Boutons navigation */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleBack}
                            className="flex-1"
                        >
                            ← Retour
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSaving || isLoading}
                            className="flex-1"
                        >
                            {isSaving ? 'Sauvegarde...' : 'Continuer →'}
                        </Button>
                    </div>

                    {/* Modale de conflit */}
                    {(() => {
                        console.log('🎭 Vérification condition modale:', {
                            conflictInfo,
                            pendingConstraint,
                            shouldShow: !!(conflictInfo && pendingConstraint)
                        });
                        return conflictInfo && pendingConstraint && (
                            <ConflictModal
                                newConstraintName={pendingConstraint.name}
                                conflictingConstraint={conflictInfo.constraint}
                                overlappingDays={conflictInfo.days}
                                onCancel={handleCancelConflict}
                                onConfirm={handleConfirmConflict}
                            />
                        );
                    })()}

                    {/* Modale de suppression */}
                    {deleteTarget && (
                        <DeleteConfirmModal
                            itemName={deleteTarget.name}
                            onCancel={handleCancelDelete}
                            onConfirm={handleConfirmDelete}
                        />
                    )}
                </main>
            </div>
        </div >
    );
}
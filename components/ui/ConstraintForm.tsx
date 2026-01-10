'use client';

import React, { useState } from 'react';
import { Constraint, DAYS_OF_WEEK } from '@/types';
import { Input } from './Input';
import { Button } from './Button';
import {
    BriefcaseIcon,
    GraduationCapIcon,
    HomeIcon,
    ActivityIcon,
    UsersIcon,
    PinIcon
} from '@/components/ui/icons';

interface ConstraintFormProps {
    constraint?: Constraint;
    existingConstraints: Constraint[];  // NOUVEAU
    onSave: (constraint: Omit<Constraint, 'id'>) => void;
    onCancel: () => void;
}

const CATEGORY_ICONS = {
    work: BriefcaseIcon,
    school: GraduationCapIcon,
    home: HomeIcon,
    sport: ActivityIcon,
    social: UsersIcon,
    other: PinIcon
};

// Détection automatique de catégorie
const detectCategory = (name: string): Constraint['category'] => {
    const lowerName = name.toLowerCase();

    if (/travail|boulot|taf|job|bureau|emploi/.test(lowerName)) return 'work';
    if (/école|ecole|crèche|creche|garderie|maternelle|collège|college/.test(lowerName)) return 'school';
    if (/maison|ménage|menage|courses|linge/.test(lowerName)) return 'home';
    if (/sport|gym|yoga|course|musculation|fitness/.test(lowerName)) return 'sport';
    if (/amis|famille|sortie|rdv|rendez-vous/.test(lowerName)) return 'social';

    return 'other';
};

export const ConstraintForm: React.FC<ConstraintFormProps> = ({
    constraint,
    onSave,
    onCancel
}) => {
    const [formData, setFormData] = useState({
        name: constraint?.name || '',
        category: constraint?.category || 'other' as Constraint['category'],
        days: constraint?.days || [],
        start_time: constraint?.start_time || '09:00',
        end_time: constraint?.end_time || '18:00',
        allow_lunch_break: constraint?.allow_lunch_break || false
    });

    // Auto-détection de catégorie quand le nom change
    // Note: On utilise un pattern différent - la détection se fait dans le onChange
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        const detectedCategory = !constraint && newName ? detectCategory(newName) : formData.category;
        setFormData(prev => ({
            ...prev,
            name: newName,
            category: detectedCategory
        }));
    };

    const toggleDay = (dayId: string) => {
        setFormData(prev => ({
            ...prev,
            days: prev.days.includes(dayId)
                ? prev.days.filter(d => d !== dayId)
                : [...prev.days, dayId]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name && formData.days.length > 0) {
            onSave(formData);  // On délègue la détection au parent
        }
    };

    const isValid = formData.name.trim() && formData.days.length > 0;

    return (
        <div className="bg-white border-2 border-primary rounded-2xl p-6 mb-4">
            <h3 className="text-lg font-semibold text-text-dark mb-4">
                {constraint ? 'Modifier l\'indisponibilité' : 'Nouvelle indisponibilité'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nom */}
                <Input
                    id="name"
                    name="name"
                    label="NOM"
                    placeholder="Ex: Travail, École des enfants..."
                    value={formData.name}
                    onChange={handleNameChange}
                />

                {/* Sélection d'icône */}
                <div>
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                        ICÔNE {formData.name && '(détectée automatiquement)'}
                    </label>
                    <div className="flex gap-2 flex-wrap">
                        {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, category: key as Constraint['category'] }))}
                                className={`
                  px-4 py-2 rounded-xl border-2 font-medium transition-all
                  ${formData.category === key
                                        ? 'border-primary bg-mint scale-110'
                                        : 'border-border hover:border-primary'
                                    }
                `}
                            >
                                <Icon className={`w-6 h-6 ${formData.category === key ? 'text-primary' : 'text-text-medium'}`} />
                            </button>
                        ))}
                    </div>
                    {formData.name && (
                        <p className="text-xs text-text-muted mt-2">
                            💡 Tu peux cliquer pour changer
                        </p>
                    )}
                </div>

                {/* Jours */}
                <div>
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                        JOURS DE LA SEMAINE
                    </label>
                    <div className="flex gap-2 flex-wrap">
                        {DAYS_OF_WEEK.map(day => (
                            <button
                                key={day.id}
                                type="button"
                                onClick={() => toggleDay(day.id)}
                                className={`
                  px-4 py-2 rounded-xl border-2 font-medium transition-all
                  ${formData.days.includes(day.id)
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-border text-text-dark hover:border-primary'
                                    }
                `}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Horaires */}
                <div>
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                        HORAIRES
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            id="start_time"
                            name="start_time"
                            type="time"
                            value={formData.start_time}
                            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                            className="flex-1 min-w-0 px-3 py-2 text-sm text-text-dark bg-white border-2 border-border rounded-xl focus:border-primary outline-none"
                        />
                        <span className="text-text-muted text-sm shrink-0">à</span>
                        <input
                            id="end_time"
                            name="end_time"
                            type="time"
                            value={formData.end_time}
                            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                            className="flex-1 min-w-0 px-3 py-2 text-sm text-text-dark bg-white border-2 border-border rounded-xl focus:border-primary outline-none"
                        />
                    </div>
                </div>

                {/* Pause déjeuner */}
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.allow_lunch_break}
                        onChange={(e) => setFormData(prev => ({ ...prev, allow_lunch_break: e.target.checked }))}
                        className="w-5 h-5 rounded border-2 border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text-dark">
                        Inclure une pause déjeuner (12h-14h disponible)
                    </span>
                </label>

                {/* Boutons */}
                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
                        Annuler
                    </Button>
                    <Button type="submit" disabled={!isValid} className="flex-1">
                        {constraint ? 'Sauvegarder' : 'Ajouter'}
                    </Button>
                </div>
            </form >
        </div >
    );
};
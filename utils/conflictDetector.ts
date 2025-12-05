import { Constraint } from '@/types';

/**
 * Détecte si deux plages horaires se chevauchent
 */
function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const parseTime = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const s1 = parseTime(start1);
    const e1 = parseTime(end1);
    const s2 = parseTime(start2);
    const e2 = parseTime(end2);

    // Deux plages se chevauchent si l'une commence avant que l'autre ne se termine
    return s1 < e2 && s2 < e1;
}

/**
 * Détecte les conflits entre une nouvelle contrainte et les contraintes existantes
 * @param newConstraint - La nouvelle contrainte à vérifier
 * @param existingConstraints - Liste des contraintes existantes
 * @param excludeId - ID optionnel d'une contrainte à exclure de la vérification (pour l'édition)
 * @returns Objet contenant les informations sur le conflit détecté
 */
export function detectConflict(
    newConstraint: Omit<Constraint, 'id'>,
    existingConstraints: Constraint[],
    excludeId?: string
): {
    hasConflict: boolean;
    conflictingConstraint?: Constraint;
    overlappingDays?: string[];
} {
    for (const existing of existingConstraints) {
        // Ignorer la contrainte en cours d'édition
        if (excludeId && existing.id === excludeId) {
            continue;
        }

        // Trouver les jours qui se chevauchent
        const overlappingDays = newConstraint.days.filter(day => existing.days.includes(day));

        // Si au moins un jour en commun
        if (overlappingDays.length > 0) {
            // Vérifier si les horaires se chevauchent
            const hasTimeOverlap = timesOverlap(
                newConstraint.start_time,
                newConstraint.end_time,
                existing.start_time,
                existing.end_time
            );

            if (hasTimeOverlap) {
                return {
                    hasConflict: true,
                    conflictingConstraint: existing,
                    overlappingDays
                };
            }
        }
    }

    return {
        hasConflict: false
    };
}
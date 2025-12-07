'use client'

import { useState, useEffect } from 'react'

interface OrganizeModalProps {
    isOpen: boolean
    onClose: () => void
    captureCount: number
}

type ItemType = 'task' | 'project' | 'course' | 'note'

interface AnalyzedItem {
    id: string
    text: string
    type: ItemType
    category: string
    suggestedSlot?: string
    projectSteps?: string[]
    projectTag?: string
}

export default function OrganizeModal({ isOpen, onClose, captureCount }: OrganizeModalProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(true)
    const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([])
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (isOpen) {
            setIsAnalyzing(true)

            // Simulate IA analysis
            setTimeout(() => {
                setAnalyzedItems(getMockAnalyzedItems())
                setIsAnalyzing(false)
            }, 2000)
        }
    }, [isOpen])

    const toggleProject = (id: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text-dark font-quicksand">
                        Organisation de tes captures ({captureCount})
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gray-light flex items-center justify-center transition-colors"
                        aria-label="Fermer"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isAnalyzing ? (
                        <AnalyzingLoader />
                    ) : (
                        <div className="space-y-4">
                            {analyzedItems.map(item => (
                                <AnalyzedItemCard
                                    key={item.id}
                                    item={item}
                                    isExpanded={expandedProjects.has(item.id)}
                                    onToggleExpand={() => toggleProject(item.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isAnalyzing && (
                    <div className="px-6 py-4 border-t border-border flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-lg border-2 border-border hover:bg-gray-light transition-colors font-medium text-text-dark font-quicksand"
                        >
                            Fermer
                        </button>
                        <button
                            className="flex-1 py-3 px-4 rounded-lg bg-primary hover:bg-primary-dark transition-colors font-semibold text-white font-quicksand"
                        >
                            Tout planifier
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function AnalyzingLoader() {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
            <p className="text-text-medium font-medium font-quicksand">
                Analyse en cours...
            </p>
            <p className="text-text-muted text-sm mt-1">
                L'IA organise tes captures
            </p>
        </div>
    )
}

interface AnalyzedItemCardProps {
    item: AnalyzedItem
    isExpanded: boolean
    onToggleExpand: () => void
}

function AnalyzedItemCard({ item, isExpanded, onToggleExpand }: AnalyzedItemCardProps) {
    if (item.type === 'task') {
        return <TaskCard item={item} />
    }

    if (item.type === 'project') {
        return <ProjectCard item={item} isExpanded={isExpanded} onToggleExpand={onToggleExpand} />
    }

    if (item.type === 'course') {
        return <CourseCard item={item} />
    }

    if (item.type === 'note') {
        return <NoteCard item={item} />
    }

    return null
}

function TaskCard({ item }: { item: AnalyzedItem }) {
    return (
        <div className="bg-mint/50 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-5 h-5 rounded border-2 border-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-text-dark font-medium font-quicksand">
                        {item.text}
                    </p>
                    <p className="text-text-muted text-xs mt-1">
                        {item.category}
                    </p>
                </div>
            </div>

            {item.suggestedSlot && (
                <div className="bg-white rounded-lg p-3 mb-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <SparklesIconSmall />
                        <span className="text-text-medium text-xs font-medium">
                            Suggestion
                        </span>
                    </div>
                    <p className="text-text-dark text-sm font-medium">
                        {item.suggestedSlot}
                    </p>
                </div>
            )}

            <div className="flex gap-2">
                <button className="flex-1 py-2 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors">
                    Planifier
                </button>
                <button className="py-2 px-3 rounded-lg border border-border text-text-medium text-sm font-medium hover:bg-gray-light transition-colors">
                    Plus tard
                </button>
            </div>
        </div>
    )
}

function ProjectCard({ item, isExpanded, onToggleExpand }: AnalyzedItemCardProps) {
    return (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    💡
                </div>
                <div className="flex-1">
                    <p className="text-text-dark font-semibold font-quicksand mb-1">
                        {item.text}
                    </p>
                    <p className="text-text-muted text-xs">
                        Projet détecté • {item.category}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg p-3 mb-3 border border-purple-200">
                <p className="text-text-medium text-sm mb-2">
                    Étapes suggérées :
                </p>

                {isExpanded ? (
                    <div className="space-y-2">
                        {item.projectSteps?.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border-2 border-primary flex-shrink-0" />
                                <span className="text-text-dark text-sm">{step}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-text-muted text-sm">
                        {item.projectSteps?.length} tâches
                    </p>
                )}

                {item.projectTag && (
                    <div className="mt-2 pt-2 border-t border-border">
                        <span className="text-xs text-text-muted">
                            Tag : <span className="text-primary font-medium">{item.projectTag}</span>
                        </span>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onToggleExpand}
                    className="flex-1 py-2 px-3 rounded-lg bg-white border border-purple-200 text-text-dark text-sm font-medium hover:bg-purple-50 transition-colors"
                >
                    {isExpanded ? 'Réduire' : 'Voir les étapes'}
                </button>
                <button className="flex-1 py-2 px-3 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">
                    Valider
                </button>
                <button className="py-2 px-3 rounded-lg border border-border text-text-medium text-sm font-medium hover:bg-gray-light transition-colors">
                    Refuser
                </button>
            </div>
        </div>
    )
}

function CourseCard({ item }: { item: AnalyzedItem }) {
    return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    🛒
                </div>
                <div className="flex-1">
                    <p className="text-text-dark font-medium font-quicksand">
                        {item.text}
                    </p>
                    <p className="text-text-muted text-xs mt-1">
                        Course
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2">
                    <CheckIconSmall />
                    <span className="text-text-dark text-sm">
                        Ajouté à ta liste de courses
                    </span>
                </div>
            </div>
        </div>
    )
}

function NoteCard({ item }: { item: AnalyzedItem }) {
    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    📝
                </div>
                <div className="flex-1">
                    <p className="text-text-dark font-medium font-quicksand">
                        {item.text}
                    </p>
                    <p className="text-text-muted text-xs mt-1">
                        Mémo
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-yellow-200">
                <div className="flex items-center gap-2">
                    <CheckIconSmall />
                    <span className="text-text-dark text-sm">
                        Enregistré dans Mémos
                    </span>
                </div>
            </div>
        </div>
    )
}

function CloseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    )
}

function SparklesIconSmall() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}

function CheckIconSmall() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}

// Mock data for demo
function getMockAnalyzedItems(): AnalyzedItem[] {
    return [
        {
            id: '1',
            text: 'Appeler la maîtresse pour le rendez-vous',
            type: 'task',
            category: 'Enfants',
            suggestedSlot: 'Jeudi 10h (20 min libre)'
        },
        {
            id: '2',
            text: 'Lait, Pain',
            type: 'course',
            category: 'Courses'
        },
        {
            id: '3',
            text: 'Organiser anniversaire Léa',
            type: 'project',
            category: 'Perso',
            projectSteps: [
                'Choisir le thème',
                'Envoyer invitations',
                'Commander gâteau',
                'Acheter déco'
            ],
            projectTag: '#anniversaire-lea'
        },
        {
            id: '4',
            text: 'Léa adore les licornes',
            type: 'note',
            category: 'Enfants'
        }
    ]
}
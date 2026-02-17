'use client'

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    className = '',
    type,
    ...props
}) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'

    return (
        <div className="flex flex-col gap-1 w-full mb-4">
            <label
                htmlFor={props.id}
                className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1"
            >
                {label}
            </label>
            <div className="relative">
                <input
                    {...props}
                    type={isPassword && showPassword ? 'text' : type}
                    className={`
                        input-field py-3.5 w-full
                        ${isPassword ? 'pr-12' : ''}
                        ${error
                            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : ''
                        }
                        disabled:bg-gray-light disabled:cursor-not-allowed disabled:opacity-60
                        ${className}
                    `}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                )}
            </div>
            {error && (
                <span className="text-red-500 text-xs mt-1">
                    {error}
                </span>
            )}
        </div>
    );
};

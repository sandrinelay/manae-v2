import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    className = '',
    ...props
}) => {
    return (
        <div className="flex flex-col gap-1 w-full mb-4">
            <label
                htmlFor={props.id}
                className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1"
            >
                {label}
            </label>
            <input
                {...props}
                className={`
          input-field py-3.5
          ${error
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                        : ''
                    }
          disabled:bg-gray-light disabled:cursor-not-allowed disabled:opacity-60
          ${className}
        `}
            />
            {error && (
                <span className="text-red-500 text-xs mt-1">
                    {error}
                </span>
            )}
        </div>
    );
};
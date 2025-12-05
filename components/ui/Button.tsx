import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = `
    w-full py-3.5 px-6
    font-semibold text-base
    rounded-xl border-2
    transition-all duration-200 ease-in-out
    flex items-center justify-center gap-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

    const variantStyles = variant === 'primary'
        ? `
      bg-primary text-white border-primary
      hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-md
      disabled:hover:bg-primary disabled:hover:translate-y-0 disabled:hover:shadow-none
    `
        : `
      bg-white text-text-dark border-border
      hover:border-primary hover:bg-mint
    `;

    return (
        <button
            disabled={disabled}
            className={`${baseStyles} ${variantStyles} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
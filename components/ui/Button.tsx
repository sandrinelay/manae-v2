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
      bg-[#BC8A7F] text-white border-[#BC8A7F]
      hover:bg-[#A47568] hover:-translate-y-0.5 hover:shadow-md
      disabled:hover:bg-[#BC8A7F] disabled:hover:translate-y-0 disabled:hover:shadow-none
    `
        : `
      bg-white text-[#443C38] border-[#E5E7EB]
      hover:border-[#BC8A7F] hover:bg-[#FFF8F0]
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
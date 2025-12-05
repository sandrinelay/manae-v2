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
                className="text-xs font-medium text-[#A89F91] uppercase tracking-wide mb-1"
            >
                {label}
            </label>
            <input
                {...props}
                className={`
          w-full px-4 py-3.5 
          text-base text-[#443C38] placeholder-[#A89F91]
          bg-white border-2 rounded-xl 
          transition-all duration-200 outline-none
          ${error
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                        : 'border-[#E5E7EB] focus:border-[#BC8A7F] focus:ring-2 focus:ring-[#BC8A7F]/10'
                    }
          disabled:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60
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
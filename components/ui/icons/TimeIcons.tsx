import React from 'react';

interface IconProps {
    className?: string;
}

export const SunriseIcon: React.FC<IconProps> = ({ className = "w-10 h-10" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 20V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 12H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M22 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M19.07 4.93L17.66 6.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6.34 17.66L4.93 19.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M19.07 19.07L17.66 17.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6.34 6.34L4.93 4.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const CoffeeIcon: React.FC<IconProps> = ({ className = "w-10 h-10" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 8H18C19.1046 8 20 8.89543 20 10V11C20 12.1046 19.1046 13 18 13H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3 8H17V15C17 16.6569 15.6569 18 14 18H6C4.34315 18 3 16.6569 3 15V8Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 21H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 3V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 3V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13 3V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const BriefcaseIcon: React.FC<IconProps> = ({ className = "w-10 h-10" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 11H21" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 11V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const SunsetIcon: React.FC<IconProps> = ({ className = "w-10 h-10" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 13H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M22 13H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M19.07 5.93L17.66 7.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6.34 7.34L4.93 5.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3 21H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 21C16 18.79 14.21 17 12 17C9.79 17 8 18.79 8 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const MoonIcon: React.FC<IconProps> = ({ className = "w-10 h-10" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * Minimal shared UI primitives — Tailwind-based, dark mode aware.
 * All props pass through className for full override capability.
 */
import React from 'react';

// ----- Card (form wrapper) -----
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        'w-full max-w-md p-8 rounded-2xl',
        'bg-white dark:bg-gray-900',
        'border border-gray-200 dark:border-gray-700',
        'shadow-sm',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

// ----- Heading -----
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-1">
      {children}
    </h2>
  );
}

export function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
      {children}
    </p>
  );
}

// ----- Alert / Error banner -----
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
      {message}
    </div>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg px-4 py-3 text-sm bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
      {message}
    </div>
  );
}

// ----- Label -----
export function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
    >
      {children}
    </label>
  );
}

// ----- Input -----
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div>
      <input
        ref={ref}
        className={[
          'w-full px-3 py-2.5 rounded-lg text-sm',
          'bg-white dark:bg-gray-800',
          'text-gray-900 dark:text-white',
          'placeholder-gray-400 dark:placeholder-gray-500',
          'border transition-colors duration-150',
          error
            ? 'border-red-400 dark:border-red-600 focus:ring-red-400'
            : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';

// ----- Button -----
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}
export function Button({ variant = 'primary', loading, children, className, disabled, ...props }: ButtonProps) {
  const base = 'flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 focus:ring-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 dark:hover:bg-gray-800 dark:text-gray-400',
  };
  return (
    <button
      disabled={disabled || loading}
      className={[base, variants[variant], className].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner /> {children}
        </span>
      ) : children}
    </button>
  );
}

// ----- Spinner -----
export function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ----- TextButton (link-style) -----
export function TextButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={[
        'text-sm text-indigo-600 dark:text-indigo-400 hover:underline',
        'bg-transparent border-none cursor-pointer p-0',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}

// ----- Divider -----
export function Divider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

// ----- Field (label + input wrapper) -----
interface FieldProps {
  label: string;
  id?: string;
  error?: string;
  children: React.ReactNode;
}
export function Field({ label, id, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

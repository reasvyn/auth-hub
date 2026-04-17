import React from 'react';
import { validatePasswordStrength } from '@reasvyn/auth-core';
import type { PasswordStrengthIndicatorProps } from '../types';

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'] as const;

const STRENGTH_BAR_COLORS = [
  '',
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-400',
  'bg-green-500',
  'bg-green-600',
] as const;

const STRENGTH_TEXT_COLORS = [
  '',
  'text-red-500',
  'text-orange-500',
  'text-yellow-500',
  'text-green-600',
  'text-green-700',
] as const;

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  if (!password) return null;
  const result = validatePasswordStrength(password);
  const score = result.score; // 1-5

  return (
    <div className={['mt-2', className].filter(Boolean).join(' ')}>
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={[
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i <= score ? STRENGTH_BAR_COLORS[score] : 'bg-gray-200 dark:bg-gray-700',
            ].join(' ')}
          />
        ))}
      </div>
      {score > 0 && (
        <p className={['text-xs font-medium', STRENGTH_TEXT_COLORS[score]].join(' ')}>
          {STRENGTH_LABELS[score]}
        </p>
      )}
      {result.feedback.length > 0 && (
        <ul className="mt-1 text-xs text-gray-500 dark:text-gray-400 list-disc list-inside space-y-0.5">
          {result.feedback.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

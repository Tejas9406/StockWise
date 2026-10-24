import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const ErrorState = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the logistics server.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-6 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-center max-w-lg mx-auto ${className}`}>
      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
      <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button onClick={onRetry} size="sm" variant="danger" icon={RefreshCw}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

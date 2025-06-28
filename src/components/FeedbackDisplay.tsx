import { useState } from 'react';

export type FeedbackStatus = 'idle' | 'loading' | 'success' | 'error' | 'warning';

interface FeedbackDisplayProps {
  status: FeedbackStatus;
  message?: string;
  prompt?: string; // For testing: shows the prompt sent to LLM
}

export function FeedbackDisplay({ status, message, prompt }: FeedbackDisplayProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  
  if (status === 'idle' || !message) {
    return null;
  }

  const getStatusStyles = () => {
    switch (status) {
      case 'loading':
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          icon: (
            <svg className="w-8 h-8 text-blue-500 mr-4 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" aria-label="Loading">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
            </svg>
          )
        };
      case 'success':
        return {
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          icon: (
            <svg className="w-8 h-8 text-green-500 mr-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Success">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'error':
        return {
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          icon: (
            <svg className="w-8 h-8 text-red-500 mr-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Error">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          icon: (
            <svg className="w-8 h-8 text-yellow-500 mr-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Warning">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )
        };
      default:
        return {
          bgColor: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-800',
          icon: null
        };
    }
  };

  const { bgColor, textColor, icon } = getStatusStyles();

  return (
    <div className="mt-6">
      <div className={`feedback-card ${bgColor} p-5 rounded-lg border flex items-start shadow-sm transition-all duration-300`}>
        {icon}
        <div>
          <h4 className={`font-bold ${textColor}`}>
            {status === 'loading' ? 'Checking...' : 'Tutor Feedback'}
          </h4>
          <p className="mt-1 text-gray-700">{message}</p>
        </div>
      </div>
      
      {/* Debug Section: Show LLM Prompt */}
      {prompt && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg">
          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg transition-colors"
          >
            <div className="flex items-center justify-between">
              <span>🔍 Debug: View LLM Prompt</span>
              <span className={`transform transition-transform ${showPrompt ? 'rotate-90' : ''}`}>
                ▶️
              </span>
            </div>
          </button>
          
          {showPrompt && (
            <div className="px-4 pb-4">
              <div className="bg-white border border-gray-300 rounded p-3 mt-2">
                <h5 className="text-xs font-semibold text-gray-600 mb-2">PROMPT SENT TO LLM:</h5>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                  {prompt}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
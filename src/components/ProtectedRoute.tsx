import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from './auth/AuthPage';
import { WelcomeScreen } from './WelcomeScreen';
import { Loader2, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, connectionError, retryConnection } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [forceShowContent, setForceShowContent] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Safety timeout - if loading takes too long, show auth page anyway
  useEffect(() => {
    if (loading && !forceShowContent) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('Loading timeout reached, forcing content display');
        setForceShowContent(true);
      }, 8000); // 8 second max loading time
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, forceShowContent]);

  useEffect(() => {
    if (user) {
      // Check if user should see welcome screen
      const hasVisited = localStorage.getItem(`scrum-teens-visited-${user.id}`);
      setShowWelcome(!hasVisited);
    }
  }, [user]);

  const handleRetry = async () => {
    setRetrying(true);
    setForceShowContent(false);
    try {
      await retryConnection();
    } finally {
      setRetrying(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // If we've hit the force timeout and still loading, show auth page
  const effectiveLoading = loading && !forceShowContent;

  // Show loading state (but only for a reasonable time)
  if (effectiveLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading your workspace...</h2>
          <p className="text-gray-500 mb-6">
            Getting everything ready for you
          </p>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Taking longer than expected?
            </p>
            <button 
              onClick={handleRefresh} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show connection error state (but still allow access if user is logged in)
  if (connectionError && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="h-8 w-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connection Issue</h2>
          <p className="text-gray-600 mb-6">
            {connectionError}
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={handleRetry}
              disabled={retrying}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </>
              )}
            </button>
            
            <button 
              onClick={handleRefresh} 
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Refresh Page
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Troubleshooting tips:</h3>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Try disabling VPN if you're using one</li>
              <li>• Clear your browser cache</li>
              <li>• Try a different browser</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in - show auth page
  if (!user) {
    return <AuthPage />;
  }

  // Show connection warning banner if there's an error but user is logged in
  if (connectionError) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-100 border-b border-orange-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{connectionError}</span>
            </div>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="text-sm text-orange-700 hover:text-orange-900 font-medium flex items-center gap-1"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </>
              )}
            </button>
          </div>
        </div>
        <div className="pt-10">
          {showWelcome ? (
            <WelcomeScreen onContinue={() => setShowWelcome(false)} />
          ) : (
            children
          )}
        </div>
      </>
    );
  }

  // Show welcome screen for new users
  if (showWelcome) {
    return <WelcomeScreen onContinue={() => setShowWelcome(false)} />;
  }

  // Normal authenticated state
  return <>{children}</>;
};

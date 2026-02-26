import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { PasswordResetForm } from './PasswordResetForm';

type AuthView = 'login' | 'signup' | 'reset';

export const AuthPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
      {/* Subtle decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-rose-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-100/30 rounded-full blur-3xl" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {currentView === 'login' && (
          <LoginForm
            onSwitchToSignup={() => setCurrentView('signup')}
            onSwitchToReset={() => setCurrentView('reset')}
          />
        )}
        
        {currentView === 'signup' && (
          <SignupForm
            onSwitchToLogin={() => setCurrentView('login')}
          />
        )}
        
        {currentView === 'reset' && (
          <PasswordResetForm
            onBack={() => setCurrentView('login')}
          />
        )}
      </div>
    </div>
  );
};

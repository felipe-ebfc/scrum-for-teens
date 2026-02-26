import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export const EmailConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (type === 'signup' && token) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to confirm email');
          } else {
            setStatus('success');
            setMessage('Email confirmed successfully! You can now log in.');
          }
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during confirmation');
      }
    };

    handleEmailConfirmation();
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/auth?mode=login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-blue-600" />}
            {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-600" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-600" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Confirming Email...'}
            {status === 'success' && 'Email Confirmed!'}
            {status === 'error' && 'Confirmation Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we confirm your email address.'}
            {status === 'success' && 'Your account has been successfully activated.'}
            {status === 'error' && 'There was a problem confirming your email.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant={status === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          
          {status !== 'loading' && (
            <Button onClick={handleContinue} className="w-full mt-4">
              {status === 'success' ? 'Continue to Login' : 'Back to Login'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle2, Sparkles, Users, Target } from 'lucide-react';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { signup, loading } = useAuth();

  const passwordRequirements = [
    { test: (pwd: string) => pwd.length >= 8, text: 'At least 8 characters' },
    { test: (pwd: string) => /[A-Z]/.test(pwd), text: 'One uppercase letter' },
    { test: (pwd: string) => /[a-z]/.test(pwd), text: 'One lowercase letter' },
    { test: (pwd: string) => /\d/.test(pwd), text: 'One number' }
  ];

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccessMessage('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!passwordRequirements.every(req => req.test(formData.password))) {
      setError('Password does not meet requirements');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateForm()) return;

    try {
      const result = await signup(formData.email, formData.password, formData.name);
      if (result.error) {
        setError(result.error);
      } else if (result.message) {
        setSuccessMessage(result.message);
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during signup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>
      </div>

      <Card className="w-full max-w-lg mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-lg relative z-10">
        <CardHeader className="space-y-4 text-center pb-6">
          {/* App Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur-lg opacity-75 animate-pulse"></div>
              <img 
                src="https://d64gsuwffb70l.cloudfront.net/68cb7f50f08eddacce6b52a3_1758519973662_03b3d4e0.webp" 
                alt="Scrum for Teens"
                className="relative w-16 h-16 rounded-xl shadow-lg"
              />
            </div>
          </div>
          
          <CardTitle className="text-3xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Join Scrum for Teens! 🚀
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Start your productivity journey today
          </CardDescription>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <div className="flex items-center gap-1 bg-purple-100 px-3 py-1 rounded-full">
              <Target className="h-3 w-3 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">Goal Tracking</span>
            </div>
            <div className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full">
              <Users className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Team Collaboration</span>
            </div>
            <div className="flex items-center gap-1 bg-teal-100 px-3 py-1 rounded-full">
              <Sparkles className="h-3 w-3 text-teal-600" />
              <span className="text-xs font-medium text-teal-700">Productivity Boost</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
            
            {successMessage && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={loading}
                className="border-2 focus:border-purple-400 focus:ring-purple-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={loading}
                className="border-2 focus:border-blue-400 focus:ring-blue-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  disabled={loading}
                  className="border-2 focus:border-teal-400 focus:ring-teal-200 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {formData.password && (
                <div className="space-y-1 text-xs bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-700 mb-2">Password Requirements:</p>
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className={`flex items-center gap-2 ${req.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <CheckCircle2 className={`h-3 w-3 ${req.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`} />
                      {req.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  disabled={loading}
                  className="border-2 focus:border-purple-400 focus:ring-purple-200 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating your account...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Create My Account
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-200">
              Already have an account?{' '}
              <Button
                type="button"
                variant="link"
                onClick={onSwitchToLogin}
                className="p-0 h-auto font-bold text-purple-600 hover:text-purple-700"
              >
                Sign in here →
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
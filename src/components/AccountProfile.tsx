import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { User, Mail, Calendar, LogOut, Loader2 } from 'lucide-react';

export const AccountProfile: React.FC = () => {
  const { user, updateProfile, logout, profileLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Hydrate form data from profile (single source of truth: user.profile)
  // Profile should already be hydrated by AuthContext on app load
  useEffect(() => {
    if (!user) return;

    // Get values from profile (hydrated by AuthContext)
    const profileName = user.profile?.full_name || '';
    const email = user.email || '';

    console.log('👤 AccountProfile: Hydrating form from profile:', {
      profileName,
      email,
      hasProfile: !!user.profile
    });

    setFormData({
      name: profileName,
      email: email
    });
  }, [user?.id, user?.profile?.full_name, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!formData.name.trim()) {
      setError('Name is required');
      setIsLoading(false);
      return;
    }

    console.log('👤 AccountProfile: Saving profile...', { name: formData.name.trim() });

    // User is explicitly saving - set has_set_full_name = true
    // This prevents future backfills from overwriting their choice
    const result = await updateProfile({
      full_name: formData.name.trim(),
      avatar_url: null, // MVP: initials only
      use_initials: true,
      has_set_full_name: true // Mark that user has explicitly set their name
    });

    if (result.error) {
      // Show error to user - DO NOT pretend save succeeded
      console.error('👤 AccountProfile: Save FAILED:', result.error);
      setError(result.error);
      setIsLoading(false);
      return;
    }

    // Success - profile state is already updated by updateProfile
    console.log('👤 AccountProfile: Save SUCCESS:', result.profile);
    setSuccess('Profile updated successfully!');
    setIsLoading(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  // Get initials from profile full_name
  const getInitials = (): string => {
    const profileName = user?.profile?.full_name;
    if (profileName && profileName.trim()) {
      return profileName
        .trim()
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    // Fall back to form data name (for immediate feedback while typing)
    if (formData.name && formData.name.trim()) {
      return formData.name
        .trim()
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    return 'U';
  };

  const formatMemberSince = () => {
    if (user?.created_at) {
      return new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return 'Unknown';
  };

  if (!user) return null;

  // Show loading state while profile is being hydrated
  if (profileLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading profile...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-700 font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">Account Settings</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your profile information
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert>
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  disabled={isLoading}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled={true}
                  className="pl-10 bg-muted"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Member since {formatMemberSince()}</span>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Profile'
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountProfile;

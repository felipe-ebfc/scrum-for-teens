import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Rocket, Target, Trophy, Zap, LogOut } from 'lucide-react';
interface WelcomeScreenProps {
  onContinue: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const { user, logout } = useAuth();
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem(`scrum-teens-visited-${user?.id}`);
    setIsFirstTime(!hasVisited);
    
    if (!hasVisited) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [user?.id]);

  const handleGetStarted = () => {
    if (user?.id) {
      localStorage.setItem(`scrum-teens-visited-${user.id}`, 'true');
    }
    onContinue();
  };

  const firstName = user?.profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Champion';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-pink-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <Sparkles className="h-6 w-6 text-yellow-300" />
            </div>
          ))}
        </div>
      )}

      <Card className="w-full max-w-2xl mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-lg relative z-10">
        <CardContent className="p-4 md:p-6 text-center space-y-3">
          {/* Book Cover Thumbnail */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur-lg opacity-50 scale-105"></div>
              <img 
                src="https://d64gsuwffb70l.cloudfront.net/68cb7ad2f4237b94daaac269_1758501748670_72f18d27.png" 
                alt="Scrum for Teens Book Cover"
                className="relative w-16 md:w-20 h-auto rounded-lg shadow-xl border-2 border-white/30"
              />
            </div>
          </div>

          {isFirstTime ? (
            <>
              <div className="space-y-2">
                <div className="animate-bounce">
                  <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-teal-500 bg-clip-text text-transparent">
                    Welcome to Scrum for Teens! 🎉
                  </h1>
                </div>
                <p className="text-base text-gray-700 leading-snug max-w-lg mx-auto">
                  Transform how you tackle school, projects, and life with the power of Scrum methodology!
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3 my-3">
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2 rounded-full">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Goal Tracking</span>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-teal-100 px-4 py-2 rounded-full">
                  <Trophy className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Sprint Planning</span>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-teal-100 to-green-100 px-4 py-2 rounded-full">
                  <Zap className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-700">Productivity Boost</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4 border-2 border-yellow-200">
                <p className="text-base text-gray-800 font-semibold">
                  ✨ Ready to unlock your potential? Let's build something amazing together!
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-teal-500 bg-clip-text text-transparent animate-pulse">
                  Welcome back, {firstName}! 🚀
                </h1>
                <p className="text-base text-gray-700 leading-snug">
                  Your Sprint board is ready and waiting. Time to crush those goals!
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border-2 border-blue-200">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Rocket className="h-5 w-5 text-blue-600 animate-pulse" />
                  <span className="text-base font-bold text-blue-700">Daily Success Tip</span>
                </div>
                <p className="text-sm text-blue-700 font-medium">
                  Start each day by reviewing your Sprint goals and updating task progress!
                </p>
              </div>
            </>
          )}

          <Button 
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-500 hover:from-purple-700 hover:via-blue-700 hover:to-teal-600 text-white px-10 py-3 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"
            size="lg"
          >
            {isFirstTime ? (
              <>
                <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                Let's Get Started!
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-5 w-5 animate-pulse" />
                Continue Sprint
              </>
            )}
          </Button>

          {/* Logout Option */}
          <div className="flex justify-center">
            <Button 
              onClick={logout}
              variant="ghost"
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 text-sm py-1"
            >
              <LogOut className="mr-2 h-3 w-3" />
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            Powered by Scrum • Built for Teen Success
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

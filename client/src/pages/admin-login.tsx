import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return await response.json();
    },
    onSuccess: (data) => {
      const userType = data.user?.userType;
      const role = data.user?.role;
      if (userType !== 'admin' && role !== 'admin') {
        fetch('/api/auth/logout', { method: 'POST' });
        toast({
          title: 'Access Denied',
          description: 'This login is for administrators only.',
          variant: 'destructive',
        });
        return;
      }
      queryClient.setQueryData(['/api/user'], data.user);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Welcome, Admin',
        description: `Signed in as ${data.user.firstName} ${data.user.lastName}`,
      });
      setTimeout(() => {
        setLocation('/admin-dashboard');
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (user) {
      const u = user as any;
      if (u.userType === 'admin' || u.role === 'admin') {
        setLocation('/admin-dashboard');
      }
    }
  }, [user, setLocation]);

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-900/40">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl font-extrabold bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Taskdrip
            </span>
            <span className="bg-violet-700/40 text-violet-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-violet-600/50">
              Admin
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Admin Portal</h2>
          <p className="mt-1 text-sm text-gray-400">
            Restricted access — administrators only
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 bg-amber-950/50 border border-amber-800/60 rounded-lg px-4 py-3 mb-6">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-400">This area is restricted to platform administrators.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
                Admin Email
              </Label>
              <Input
                id="email"
                data-testid="input-admin-email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className={`mt-1.5 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-violet-500/20 ${
                  errors.email ? 'border-red-500' : ''
                }`}
                placeholder="admin@taskdrip.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                Password
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  data-testid="input-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-violet-500/20 pr-10 ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            <Button
              data-testid="button-admin-signin"
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-violet-900/30 transition-all duration-200 mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Sign In as Admin
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600">
          Not an admin?{' '}
          <Link href="/login" className="text-violet-500 hover:text-violet-400 transition-colors">
            Go to regular login
          </Link>
        </p>
      </div>
    </div>
  );
}

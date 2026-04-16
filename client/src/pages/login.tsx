import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [pendingCredentials, setPendingCredentials] = useState<LoginFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData & { twoFactorToken?: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        return;
      }
      // Immediately set auth state so route guards update before redirect
      queryClient.setQueryData(['/api/user'], data.user);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.firstName}!`,
      });
      const userType = data.user?.userType;
      if (userType === 'admin') {
        setLocation('/admin-dashboard');
      } else if (userType === 'brand') {
        setLocation('/brand-dashboard');
      } else {
        setLocation('/dashboard');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (user) {
      const userType = (user as any)?.userType;
      if (userType === 'admin') {
        setLocation('/admin-dashboard');
      } else if (userType === 'brand') {
        setLocation('/brand-dashboard');
      } else {
        setLocation('/dashboard');
      }
    }
  }, [user, setLocation]);

  const onSubmit = (data: LoginFormData) => {
    setPendingCredentials(data);
    loginMutation.mutate(data);
  };

  const onSubmit2FA = () => {
    if (!pendingCredentials) return;
    loginMutation.mutate({ ...pendingCredentials, twoFactorToken });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your Taskdrip account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{requiresTwoFactor ? 'Two-Factor Verification' : 'Sign In'}</CardTitle>
            <CardDescription>
              {requiresTwoFactor
                ? 'Enter the 6-digit code from your authenticator app'
                : 'Enter your email and password to access your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requiresTwoFactor ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <ShieldCheck className="h-16 w-16 text-blue-500" />
                </div>
                <div>
                  <Label htmlFor="twoFactorToken">Authenticator Code</Label>
                  <Input
                    id="twoFactorToken"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest"
                    data-testid="input-2fa-token"
                  />
                </div>
                <Button
                  className="w-full bg-black text-white hover:bg-gray-800"
                  onClick={onSubmit2FA}
                  disabled={loginMutation.isPending || twoFactorToken.length !== 6}
                  data-testid="button-verify-2fa"
                >
                  {loginMutation.isPending ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setRequiresTwoFactor(false); setTwoFactorToken(''); }}
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className={errors.email ? 'border-red-500' : ''}
                    data-testid="input-email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      {...register('password')}
                      className={errors.password ? 'border-red-500' : ''}
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500">
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-800"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            )}

            {!requiresTwoFactor && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link href="/signup">
                    <Button variant="outline" className="w-full">
                      Create new account
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

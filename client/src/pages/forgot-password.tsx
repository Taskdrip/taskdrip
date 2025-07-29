import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { ArrowLeft, Mail, Key } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  token: z.string().min(1, 'Reset token is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [resetToken, setResetToken] = useState('');
  const [email, setEmail] = useState('');

  const forgotForm = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const resetForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: email,
      token: resetToken,
    },
  });

  const forgotMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const response = await apiRequest('POST', '/api/auth/forgot-password', data);
      return await response.json();
    },
    onSuccess: (data) => {
      setEmail(forgotForm.getValues('email'));
      setResetToken(data.resetToken);
      setStep('reset');
      resetForm.setValue('email', forgotForm.getValues('email'));
      resetForm.setValue('token', data.resetToken);
      toast({
        title: "Reset link sent",
        description: "Check your email for the password reset instructions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const response = await apiRequest('POST', '/api/auth/reset-password', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated. You can now log in.",
      });
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const onForgotSubmit = (data: ForgotPasswordData) => {
    forgotMutation.mutate(data);
  };

  const onResetSubmit = (data: ResetPasswordData) => {
    resetMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/login">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            {step === 'request' ? 'Forgot Password' : 'Reset Password'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 'request' 
              ? 'Enter your email to receive reset instructions'
              : 'Enter your new password below'
            }
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {step === 'request' ? (
                <>
                  <Mail className="h-5 w-5 mr-2" />
                  Request Reset
                </>
              ) : (
                <>
                  <Key className="h-5 w-5 mr-2" />
                  New Password
                </>
              )}
            </CardTitle>
            <CardDescription>
              {step === 'request' 
                ? 'We\'ll send you a link to reset your password'
                : 'Choose a strong password for your account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'request' ? (
              <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...forgotForm.register('email')}
                    className={forgotForm.formState.errors.email ? 'border-red-500' : ''}
                  />
                  {forgotForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {forgotForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-800"
                  disabled={forgotMutation.isPending}
                >
                  {forgotMutation.isPending ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            ) : (
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label htmlFor="reset-token">Reset Token</Label>
                  <Input
                    id="reset-token"
                    value={resetToken}
                    disabled
                    className="bg-gray-100 text-xs"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    In production, this would be sent to your email
                  </p>
                </div>

                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    {...resetForm.register('newPassword')}
                    className={resetForm.formState.errors.newPassword ? 'border-red-500' : ''}
                  />
                  {resetForm.formState.errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {resetForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    {...resetForm.register('confirmPassword')}
                    className={resetForm.formState.errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {resetForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-800"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
                Remember your password? Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
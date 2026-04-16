import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, ShieldOff, Key, Mail, Eye, EyeOff, QrCode } from 'lucide-react';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const emailSchema = z.object({
  currentPassword: z.string().min(1, 'Password is required'),
  newEmail: z.string().email('Invalid email address'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type EmailFormData = z.infer<typeof emailSchema>;

export default function SecuritySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);

  const twoFactorEnabled = (user as any)?.twoFactorEnabled;

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { currentPassword: '', newEmail: (user as any)?.email || '' },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest('POST', '/api/auth/change-password', data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
      passwordForm.reset();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      const res = await apiRequest('POST', '/api/auth/change-email', data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Email updated', description: 'Your email has been changed successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      emailForm.reset();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/2fa/setup', {});
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setShow2FASetup(true);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest('POST', '/api/auth/2fa/enable', { token });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '2FA Enabled', description: 'Two-factor authentication is now active on your account.' });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setShow2FASetup(false);
      setQrCode(null);
      setSetupToken('');
    },
    onError: (err: any) => {
      toast({ title: 'Invalid code', description: err.message, variant: 'destructive' });
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest('POST', '/api/auth/2fa/disable', { password });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '2FA Disabled', description: 'Two-factor authentication has been turned off.' });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setShowDisable2FA(false);
      setDisablePassword('');
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account security, password, and two-factor authentication.</p>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPw ? 'text' : 'password'}
                  {...passwordForm.register('currentPassword')}
                  data-testid="input-current-password"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}>
                  {showCurrentPw ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-red-600 mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPw ? 'text' : 'password'}
                  {...passwordForm.register('newPassword')}
                  data-testid="input-new-password"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPw(!showNewPw)}>
                  {showNewPw ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-red-600 mt-1">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...passwordForm.register('confirmPassword')}
                data-testid="input-confirm-password"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending} data-testid="button-change-password">
              {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Change Email
          </CardTitle>
          <CardDescription>Update the email address associated with your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={emailForm.handleSubmit((d) => changeEmailMutation.mutate(d))} className="space-y-4">
            <div>
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                {...emailForm.register('newEmail')}
                data-testid="input-new-email"
              />
              {emailForm.formState.errors.newEmail && (
                <p className="text-sm text-red-600 mt-1">{emailForm.formState.errors.newEmail.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="emailPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="emailPassword"
                  type={showEmailPw ? 'text' : 'password'}
                  {...emailForm.register('currentPassword')}
                  data-testid="input-email-password"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowEmailPw(!showEmailPw)}>
                  {showEmailPw ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
              {emailForm.formState.errors.currentPassword && (
                <p className="text-sm text-red-600 mt-1">{emailForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <Button type="submit" disabled={changeEmailMutation.isPending} data-testid="button-change-email">
              {changeEmailMutation.isPending ? 'Updating...' : 'Update Email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Two-Factor Authentication (2FA)
            <Badge variant={twoFactorEnabled ? 'default' : 'secondary'} className="ml-2">
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Add an extra layer of security by requiring a code from your authenticator app at login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!twoFactorEnabled && !show2FASetup && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                2FA is currently <span className="font-semibold text-red-600">disabled</span>. Enable it to secure your account with Google Authenticator, Authy, or any TOTP app.
              </p>
              <Button
                onClick={() => setup2FAMutation.mutate()}
                disabled={setup2FAMutation.isPending}
                data-testid="button-setup-2fa"
              >
                <QrCode className="h-4 w-4 mr-2" />
                {setup2FAMutation.isPending ? 'Generating...' : 'Set Up 2FA'}
              </Button>
            </div>
          )}

          {show2FASetup && qrCode && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below to activate.
              </p>
              <div className="flex justify-center">
                <img src={qrCode} alt="2FA QR Code" className="border rounded-lg p-2 w-48 h-48" data-testid="img-qr-code" />
              </div>
              <div>
                <Label htmlFor="setupToken">Verification Code</Label>
                <Input
                  id="setupToken"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-xl tracking-widest"
                  data-testid="input-setup-token"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => enable2FAMutation.mutate(setupToken)}
                  disabled={enable2FAMutation.isPending || setupToken.length !== 6}
                  data-testid="button-enable-2fa"
                >
                  {enable2FAMutation.isPending ? 'Activating...' : 'Activate 2FA'}
                </Button>
                <Button variant="outline" onClick={() => { setShow2FASetup(false); setQrCode(null); setSetupToken(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {twoFactorEnabled && !showDisable2FA && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                2FA is <span className="font-semibold text-green-600">active</span>. Your account is protected with two-factor authentication.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDisable2FA(true)}
                data-testid="button-disable-2fa-prompt"
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable 2FA
              </Button>
            </div>
          )}

          {showDisable2FA && (
            <div className="space-y-4 border rounded-lg p-4 bg-red-50">
              <p className="text-sm text-red-700 font-medium">
                Enter your password to confirm disabling 2FA:
              </p>
              <Input
                type="password"
                placeholder="Your password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                data-testid="input-disable-2fa-password"
              />
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={() => disable2FAMutation.mutate(disablePassword)}
                  disabled={disable2FAMutation.isPending || !disablePassword}
                  data-testid="button-confirm-disable-2fa"
                >
                  {disable2FAMutation.isPending ? 'Disabling...' : 'Confirm Disable'}
                </Button>
                <Button variant="outline" onClick={() => { setShowDisable2FA(false); setDisablePassword(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

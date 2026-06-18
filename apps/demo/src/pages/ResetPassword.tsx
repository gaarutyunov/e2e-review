import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '@/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Two-step reset flow:
 *  1. enter the account email ("request" step),
 *  2. set a new password ("set" step), then return to login.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<'request' | 'set' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStage('set');
  }

  function onSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    resetPassword(email, password);
    setStage('done');
  }

  return (
    <Card className="w-full max-w-sm" data-testid="reset-card">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          {stage === 'request' && 'Enter your email to start.'}
          {stage === 'set' && 'Choose a new password.'}
          {stage === 'done' && 'Your password has been updated.'}
        </CardDescription>
      </CardHeader>

      {stage === 'request' && (
        <form onSubmit={onRequest}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                data-testid="reset-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" data-testid="reset-continue">
              Continue
            </Button>
          </CardFooter>
        </form>
      )}

      {stage === 'set' && (
        <form onSubmit={onSetPassword}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" data-testid="reset-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                data-testid="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                data-testid="confirm-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" data-testid="reset-submit">
              Update password
            </Button>
          </CardFooter>
        </form>
      )}

      {stage === 'done' && (
        <CardContent className="space-y-4">
          <Alert data-testid="reset-success">
            <AlertDescription>Password updated. You can now sign in.</AlertDescription>
          </Alert>
          <Button className="w-full" data-testid="back-to-login" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        </CardContent>
      )}

      <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="underline-offset-4 hover:underline">
          Return to sign in
        </Link>
      </div>
    </Card>
  );
}

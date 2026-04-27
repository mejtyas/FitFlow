'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type CredentialAuthMode = 'login' | 'register';

type CredentialAuthFormProps = {
  mode: CredentialAuthMode;
};

async function authenticate(
  mode: CredentialAuthMode,
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  if (mode === 'login') {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? { error: error.message } : {};
  }
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });
  return error ? { error: error.message } : {};
}

export function CredentialAuthForm({ mode }: CredentialAuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const copy =
    mode === 'login'
      ? {
          title: 'Sign in',
          description: 'Enter your email and password',
          submitIdle: 'Sign in',
          submitBusy: 'Signing in…',
          passwordAutoComplete: 'current-password' as const,
          passwordMinLength: undefined as number | undefined,
          passwordHint: null as string | null,
        }
      : {
          title: 'Register',
          description: 'Enter your email and choose a password',
          submitIdle: 'Create account',
          submitBusy: 'Creating account…',
          passwordAutoComplete: 'new-password' as const,
          passwordMinLength: 6,
          passwordHint: 'At least 6 characters',
        };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authenticate(mode, email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={copy.passwordMinLength}
              autoComplete={copy.passwordAutoComplete}
              disabled={loading}
            />
            {copy.passwordHint ? (
              <p className="text-xs text-muted-foreground">{copy.passwordHint}</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? copy.submitBusy : copy.submitIdle}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

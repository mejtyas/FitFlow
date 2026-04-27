import Link from 'next/link';
import { LoginForm } from './login-form';

// Middleware already redirects authenticated users away from /login
export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">FitFlow</h1>
        <p className="mt-1 text-muted-foreground">Sign in to your account</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}

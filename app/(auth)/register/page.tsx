import Link from "next/link";
import { RegisterForm } from "./register-form";

// Middleware already redirects authenticated users away from /register
export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">FitFlow</h1>
        <p className="mt-1 text-muted-foreground">Create your account</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

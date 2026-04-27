import { redirect } from 'next/navigation';

export default function HomePage() {
  // Middleware already redirects "/" to /dashboard or /login
  redirect('/login');
}

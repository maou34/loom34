import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { safeAdminRedirect } from '@/lib/adminRedirect';

// Login form validation schema
const loginSchema = z.object({
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // /admin/login?redirect=/admin/… : retour vers la page admin demandée
  // (chemins /admin uniquement, voir safeAdminRedirect). /auth/login : accueil.
  const isAdminLogin = pathname.startsWith('/admin');
  const target = isAdminLogin ? safeAdminRedirect(searchParams.get('redirect')) : '/';
  
  // Form validation
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  // Handle form submission
  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      await signIn(data.email, data.password);
      navigate(target, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      // Error toast is already shown in the auth context
    } finally {
      setIsLoading(false);
    }
  };
  
  // Déjà connecté (ex. « Espace admin » avec une session ouverte) : on y va directement
  if (isAdminLogin && !isAuthLoading && isAuthenticated && !isLoading) {
    return <Navigate to={target} replace />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-loom-bg p-4 text-loom-text">
      <div className="w-full max-w-md overflow-hidden rounded-[22px] bg-loom-surface shadow-loom-card ring-1 ring-loom-border">
        <div aria-hidden="true" className="h-1 bg-bear" />
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <img src="/logo-loom.png" alt="" width={56} height={56} className="h-14 w-14 rounded-[14px]" />
            <div>
              <h1 className="text-2xl font-extrabold">{isAdminLogin ? 'Espace admin' : 'Connexion'}</h1>
              <p className="text-sm text-loom-text-muted">Entrez vos identifiants de connexion</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemple.fr"
                autoComplete="email"
                disabled={isLoading}
                aria-invalid={!!form.formState.errors.email}
                aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
                className="h-11 bg-loom-surface-2"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p id="email-error" className="text-sm text-loom-danger">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  to="/auth/reset-password"
                  className="text-sm font-semibold text-loom-link underline-offset-4 hover:text-loom-link-hover hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <PasswordInput
                id="password"
                                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                aria-invalid={!!form.formState.errors.password}
                aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                className="h-11 bg-loom-surface-2"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p id="password-error" className="text-sm text-loom-danger">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-2 h-11 w-full rounded-full bg-loom-primary-bg font-extrabold text-loom-primary-fg hover:bg-loom-primary-hover"
              disabled={isLoading}
            >
              {isLoading ? 'Connexion en cours…' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </div>

      <Link
        to="/"
        className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-loom-text-muted hover:text-loom-text"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Retour au site
      </Link>
    </main>
  );
}

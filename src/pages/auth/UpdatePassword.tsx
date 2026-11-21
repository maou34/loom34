import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(6, "Au moins 6 caractères"),
    confirmPassword: z.string().min(6, "Au moins 6 caractères"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Les deux mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!cancelled) {
          if (!data.session) {
            toast.error(
              "Lien invalide ou expiré. Merci de refaire une demande de réinitialisation."
            );
          }
          setIsReady(true);
        }
      } catch (e) {
        console.error(e);
        toast.error(e?.message ?? "Impossible de vérifier la session.");
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async ({ password }) => {
    try {
      setIsLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error(
          "Lien invalide ou expiré. Merci de refaire une demande de réinitialisation."
        );
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Mot de passe mis à jour. Tu peux te connecter.");

      // Optionnel mais propre: on termine le flow recovery en déconnectant
      await supabase.auth.signOut();

      // Redirection vers la page de login
      navigate("/auth/login", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error(e?.message ?? "Impossible de changer le mot de passe.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Nouveau mot de passe</CardTitle>
          <CardDescription>Choisis un nouveau mot de passe pour ton compte.</CardDescription>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {!isReady && (
              <div className="text-sm text-slate-600">Vérification du lien...</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <PasswordInput
                id="password"
                                placeholder="••••••••"
                autoComplete="new-password"
                disabled={!isReady || isLoading}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <PasswordInput
                id="confirmPassword"
                                placeholder="••••••••"
                autoComplete="new-password"
                disabled={!isReady || isLoading}
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.confirmPassword.message}
                </span>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={!isReady || isLoading}>
              {isLoading ? "Mise à jour..." : "Changer le mot de passe"}
            </Button>

            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={() => navigate("/auth/reset-password")}
              disabled={isLoading}
            >
              Renvoyer un lien de réinitialisation
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
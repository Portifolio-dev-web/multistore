import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Esqueci minha senha" subtitle="Enviamos um link para redefinir a senha, se o e-mail existir.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}

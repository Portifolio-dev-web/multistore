import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { resetPassword } from "@/actions/auth";

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  return (
    <AuthShell title="Redefinir senha" subtitle="Escolha uma nova senha para sua conta.">
      <ResetPasswordForm action={resetPassword.bind(null, params.token)} />
    </AuthShell>
  );
}

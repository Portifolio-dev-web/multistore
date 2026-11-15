import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { resetPassword } from "@/actions/auth";

export default async function ResetPasswordPage({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const params = await paramsPromise;
  return (
    <AuthShell title="Redefinir senha" subtitle="Escolha uma nova senha para sua conta.">
      <ResetPasswordForm action={resetPassword.bind(null, params.token)} />
    </AuthShell>
  );
}

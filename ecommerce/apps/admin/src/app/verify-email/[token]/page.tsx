import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { verifyEmail } from "@/actions/auth";

export default async function VerifyEmailPage({ params }: { params: { token: string } }) {
  const ok = await verifyEmail(params.token);
  return (
    <AuthShell title={ok ? "E-mail confirmado" : "Link inválido"} subtitle={ok ? "Seu e-mail foi verificado com sucesso." : "Este link expirou ou já foi usado."}>
      <Link href="/" className="btn w-full text-center" data-testid="verify-email-continue-link">Ir para o painel</Link>
    </AuthShell>
  );
}

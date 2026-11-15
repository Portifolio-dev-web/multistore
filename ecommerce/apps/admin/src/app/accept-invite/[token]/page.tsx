import { AuthShell } from "@/components/auth-shell";
import { AcceptInviteForm } from "@/components/accept-invite-form";
import { acceptInvite } from "@/actions/auth";

export default async function AcceptInvitePage({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const params = await paramsPromise;
  return (
    <AuthShell title="Aceitar convite" subtitle="Crie uma senha para entrar na equipe da loja.">
      <AcceptInviteForm action={acceptInvite.bind(null, params.token)} />
    </AuthShell>
  );
}

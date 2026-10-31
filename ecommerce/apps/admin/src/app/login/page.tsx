import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <AuthShell title="Entrar no painel" subtitle="Acesse a administração da sua loja.">
      <LoginForm next={searchParams.next} />
    </AuthShell>
  );
}

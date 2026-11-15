import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await searchParamsPromise;
  return (
    <AuthShell title="Entrar no painel" subtitle="Acesse a administração da sua loja.">
      <LoginForm next={searchParams.next} />
    </AuthShell>
  );
}

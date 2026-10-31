import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell title="Criar sua loja" subtitle="Cadastre-se como lojista em menos de um minuto.">
      <RegisterForm />
    </AuthShell>
  );
}

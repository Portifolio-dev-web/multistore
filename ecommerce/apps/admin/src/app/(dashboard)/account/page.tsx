import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { resendVerificationEmail } from "@/actions/auth";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ResendVerificationButton } from "@/components/resend-verification-button";

export default async function AccountPage() {
  const { userId, email } = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });

  return (
    <>
      <PageHeader title="Minha conta" subtitle={email} />
      {!user?.emailVerifiedAt && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="email-unverified-banner">
          <span>Seu e-mail ainda não foi confirmado.</span>
          <ResendVerificationButton action={resendVerificationEmail} />
        </div>
      )}
      <ChangePasswordForm />
    </>
  );
}

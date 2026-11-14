import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { removeMembership } from "@/actions/team";
import { PageHeader } from "@/components/page-header";
import { InviteForm } from "@/components/invite-form";
import { RoleSelectForm } from "@/components/role-select-form";
import { DeleteButton } from "@/components/delete-button";

export default async function TeamPage() {
  const { storeId, userId } = await requireSession("team");
  const members = await prisma.membership.findMany({
    where: { storeId },
    include: { user: { select: { id: true, name: true, email: true, emailVerifiedAt: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader title="Equipe" subtitle="Quem tem acesso a esta loja e com qual papel." />
      <InviteForm />
      <section className="card mt-6 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Pessoa</th>
              <th className="th">Papel</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => (
              <tr key={m.id} data-testid={`member-row-${m.id}`}>
                <td className="td">
                  <span className="block">{m.user.name ?? m.user.email}</span>
                  <span className="block font-mono text-xs text-ink/50">
                    {m.user.email}
                    {!m.user.emailVerifiedAt && " · convite pendente"}
                  </span>
                </td>
                <td className="td"><RoleSelectForm membershipId={m.id} role={m.role} /></td>
                <td className="td text-right">
                  {m.userId !== userId && (
                    <DeleteButton
                      action={removeMembership.bind(null, m.id)}
                      confirmMessage="Remover esta pessoa da equipe?"
                      label="Remover"
                      testId={`remove-member-${m.id}`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

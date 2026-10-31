"use client";

import { useFormStatus } from "react-dom";

type Props = { children: React.ReactNode; pendingLabel?: string; className?: string; testId: string };

export function SubmitButton({ children, pendingLabel = "Salvando…", className = "btn", testId }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} data-testid={testId}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FieldError({ errors, testId }: { errors?: string[]; testId?: string }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-700" data-testid={testId}>{errors[0]}</p>;
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="form-error">{error}</p>;
  if (success) return <p className="rounded-lg border border-lime bg-lime/30 px-3 py-2 text-sm" data-testid="form-success">{success}</p>;
  return null;
}

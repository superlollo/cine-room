// Label + campo + errore inline, condiviso dalle pagine auth e dal profilo.
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/90">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-accent-red">{error}</span>
      )}
    </label>
  );
}

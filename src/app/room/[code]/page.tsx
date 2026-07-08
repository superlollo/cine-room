// Placeholder — stanza (accessibile via link condiviso), implementazione ai Giorni 5-6.
export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <div className="p-8">Stanza {code} — in arrivo (Giorno 5)</div>;
}

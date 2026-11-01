type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const OWNER_EMAIL = (
  process.env.NEXT_PUBLIC_OWNER_EMAIL || "jondenham85@gmail.com"
).toLowerCase();

export default function AdminDashboard({
  currentUser,
}: {
  currentUser: CurrentUser | null;
}) {
  const isOwner =
    !!currentUser &&
    (currentUser.name === "Jonathan Denham" ||
      currentUser.role === "OWNER" ||
      currentUser.email.toLowerCase() === OWNER_EMAIL);

  const authorityChain = [
    {
      name: "Jonathan Denham",
      role: "Owner",
      description: "Final authority over all admin changes and permission updates",
    },
  ];

  return (
    <section aria-labelledby="authority-chain-heading" className="space-y-6">
      <div className="rounded-xl border border-cyan-500/30 bg-slate-950/70 p-6 shadow-lg shadow-cyan-950/20">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Ownership
          </p>

          <h2
            id="authority-chain-heading"
            className="mt-2 text-xl font-bold tracking-wide text-white"
          >
            OWNER ACCESS
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Jonathan Denham is the sole owner and has exclusive authority to approve,
            modify, or revoke any admin access.
          </p>
        </div>

        <ol className="space-y-3">
          {authorityChain.map((entry, index) => (
            <li
              key={entry.name}
              className="flex items-center gap-4 rounded-lg border border-cyan-500/20 bg-slate-900/80 p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-bold text-cyan-300">
                {index + 1}
              </span>

              <div>
                <div className="font-medium text-slate-100">{entry.name}</div>
                <div className="text-sm text-cyan-300">{entry.role}</div>
                <div className="text-sm text-slate-400">{entry.description}</div>
              </div>
            </li>
          ))}
        </ol>

        {!isOwner && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            You do not have owner access.
          </div>
        )}

        {isOwner && (
          <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Owner access granted to jondenham85@gmail.com.
          </div>
        )}
      </div>
    </section>
  );
}

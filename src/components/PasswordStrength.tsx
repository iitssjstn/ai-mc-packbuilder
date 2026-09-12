"use client";

function scorePassword(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "bg-base-700" };

  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { score: 3, label: "Good", color: "bg-emerald-500/60" };
  return { score: 4, label: "Strong", color: "bg-emerald-500" };
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = scorePassword(password);

  return (
    <div className="mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? color : "bg-base-700"}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

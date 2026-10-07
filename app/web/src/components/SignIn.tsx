import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function SignIn({ onSkip }: { onSkip(): void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
  };

  return (
    <main className="mx-auto grid min-h-svh max-w-md content-center gap-8 px-4 py-10">
      <header className="grid gap-2">
        <Wordmark />
        <h1 className="text-2xl font-semibold">Sign in to record site visits</h1>
        <p className="text-muted-foreground">Readings you save are filed under your name.</p>
      </header>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-fault">{error}</p>}
        <Button type="submit" size="lg" className="h-12 text-base" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <button type="button" onClick={onSkip} className="justify-self-start text-sm text-muted-foreground underline-offset-2 hover:underline">
        Just view readings (nothing is saved)
      </button>
    </main>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-wide">
      <span className="grid gap-[3px] rounded-[3px] bg-primary p-[3px]" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-[#e5533d]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#e0ad00]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#3fc58f]" />
      </span>
      SERVICE SENSE OS
    </span>
  );
}

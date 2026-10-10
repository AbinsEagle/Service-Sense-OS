import { useState } from "react";
import { Button, Dialog } from "@/components/m3";
import { CheckFlow } from "@/screens/check/CheckFlow";
import { HistoryDetail } from "@/screens/HistoryDetail";
import { HomeScreen } from "@/screens/HomeScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { newCheck, useDraft, useHistory, useTechnician, withReading } from "@/lib/store";
import type { Check } from "@/lib/types";
import { useDevice } from "@/lib/useDevice";

// Stage 1: everything stays on this phone (no sign-in, no server). See docs/feature-list.md.
type View = { kind: "home" } | { kind: "check" } | { kind: "profile" } | { kind: "history"; id: string };

export default function App() {
  const [tech, setTech] = useTechnician();
  const [draft, setDraft] = useDraft();
  const [history, setHistory] = useHistory();
  const [view, setView] = useState<View>({ kind: "home" });
  const [confirmNew, setConfirmNew] = useState(false);
  // One Bluetooth link for the whole app: connect once on Home, it stays up through the check.
  const device = useDevice((m) => setDraft((c) => (c && !c.finishedAt ? withReading(c, { ...m, taken_at: new Date().toISOString() }) : c)));

  if (!tech) return <ProfileScreen initial={null} onSave={setTech} />;

  if (view.kind === "profile")
    return (
      <ProfileScreen
        initial={tech}
        onBack={() => setView({ kind: "home" })}
        onSave={(t) => {
          setTech(t);
          setView({ kind: "home" });
        }}
      />
    );

  if (view.kind === "check" && draft)
    return (
      <CheckFlow
        check={draft}
        device={device}
        setCheck={(f) => setDraft((c) => (c ? f(c) : c))}
        onFinish={(c) => setHistory((h) => [c, ...h.filter((x) => x.id !== c.id)])}
        onExit={() => {
          setDraft((c) => (c?.finishedAt ? null : c));
          setView({ kind: "home" });
        }}
      />
    );

  if (view.kind === "history") {
    const c = history.find((x) => x.id === view.id);
    if (c) return <HistoryDetail check={c} onBack={() => setView({ kind: "home" })} />;
  }

  const startNew = () => {
    setConfirmNew(false);
    setDraft(newCheck(tech));
    setView({ kind: "check" });
  };
  const unfinished = draft && !draft.finishedAt ? draft : null;

  return (
    <>
      <HomeScreen
        technicianName={tech.name || "Add your details"}
        device={device}
        draft={unfinished}
        history={history}
        onProfile={() => setView({ kind: "profile" })}
        onResume={() => setView({ kind: "check" })}
        onNew={() => (unfinished ? setConfirmNew(true) : startNew())}
        onOpen={(c: Check) => setView({ kind: "history", id: c.id })}
      />
      <Dialog
        open={confirmNew}
        onClose={() => setConfirmNew(false)}
        title="Discard the check in progress?"
        actions={
          <>
            <Button variant="text" onClick={() => setConfirmNew(false)}>
              Keep it
            </Button>
            <Button variant="text" onClick={startNew}>
              Discard and start new
            </Button>
          </>
        }
      >
        {unfinished?.customer.name || "The unfinished check"} isn't finished yet. Starting a new check removes it.
      </Dialog>
    </>
  );
}

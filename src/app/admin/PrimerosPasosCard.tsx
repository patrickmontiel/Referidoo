"use client";

import { useEffect, useState } from "react";
import { TASKS, type TaskState } from "./AdminLayoutShell";

// Tarjeta de "Primeros Pasos" en el Resumen. Comparte estado con el chip de la
// barra superior (mismo endpoint) y se mantienen en sync vía el evento
// referidoo:tasks-updated. Al tocar una tarea dispara su recorrido guiado
// (el motor vive en AdminLayoutShell, que escucha referidoo:startTask).
export default function PrimerosPasosCard() {
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("referidoo_pp_dismissed") === "1") setDismissed(true);
    } catch {}

    const load = () =>
      fetch("/api/advisor/onboarding-tasks")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: TaskState | null) => { if (d) setTaskState(d); })
        .catch(() => {});
    load();

    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("referidoo:tasks-updated", load);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("referidoo:tasks-updated", load);
    };
  }, []);

  if (!taskState || dismissed) return null;
  const doneCount = TASKS.filter((t) => t.done(taskState)).length;
  if (doneCount === TASKS.length) return null;

  function dismiss() {
    try { localStorage.setItem("referidoo_pp_dismissed", "1"); } catch {}
    setDismissed(true);
  }
  function startTask(id: string) {
    window.dispatchEvent(new CustomEvent("referidoo:startTask", { detail: id }));
  }

  return (
    <div
      className="mb-6 rounded-2xl border border-[#DCE6FF] bg-[#F5F8FF] p-5"
      style={{ animation: "ppCardIn .4s cubic-bezier(.22,1,.36,1) both" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[15px] font-bold text-[#0B0B0C]">Termina de configurar tu cuenta</p>
          <p className="text-xs text-[#5A626E] mt-0.5">
            {doneCount} de {TASKS.length} · toca una tarea y te llevo de la mano
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Ocultar"
          className="text-[#9098A2] hover:text-[#5A626E] transition -mt-1 -mr-1 p-1 flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="h-1.5 rounded-full bg-[#DCE6FF] mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#2563EB]"
          style={{ width: `${(doneCount / TASKS.length) * 100}%`, transition: "width .5s ease" }}
        />
      </div>

      <div className="space-y-1.5">
        {TASKS.map((t) => {
          const done = t.done(taskState);
          const locked = t.id !== "email" && !taskState.emailVerified;
          return (
            <button
              key={t.id}
              disabled={done || locked}
              aria-disabled={done || locked}
              onClick={() => { if (locked) return; startTask(t.id); }}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition active:scale-[0.99] ${
                done || locked
                  ? "text-[#9098A2] cursor-default"
                  : "text-[#0B0B0C] bg-white hover:bg-[#EEF3FE] border border-[#E7EDFB]"
              }`}
            >
              <span className={`flex items-center gap-3 flex-1 min-w-0 ${locked ? "blur-[1.5px] opacity-55" : ""}`}>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done ? "bg-[#1F9D5B]" : "border-2 border-[#B9CCF5]"
                  }`}
                >
                  {done && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
                <span className={`flex-1 ${done ? "line-through" : "font-medium"}`}>{t.label}</span>
              </span>
              {done ? null : locked ? (
                <span className="text-[#9098A2] flex-shrink-0" aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
              ) : (
                <span className="text-[#2563EB] font-bold">→</span>
              )}
            </button>
          );
        })}
      </div>

      <style>{`@keyframes ppCardIn { 0% { opacity: 0; transform: translateY(-6px); } 100% { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

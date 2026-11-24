import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PauseCircle,
  Play,
  Terminal,
  XCircle,
} from 'lucide-react';
import type { WorkflowRunResult } from '../types';

interface ExecutionBarProps {
  open: boolean;
  onToggleOpen: () => void;
  prompt: string;
  onChangePrompt: (val: string) => void;
  samplePrompts: string[];
  isRunning: boolean;
  lastRun: WorkflowRunResult | null;
  onRunPrompt: (text: string) => void;
  onApprovePending: () => void;
  onRejectPending: () => void;
  onSelectNode: (nodeId: string) => void;
}

export function ExecutionBar({
  open,
  onToggleOpen,
  prompt,
  onChangePrompt,
  samplePrompts,
  isRunning,
  lastRun,
  onRunPrompt,
  onApprovePending,
  onRejectPending,
  onSelectNode,
}: ExecutionBarProps) {
  return (
    <section
      aria-label="Consola de ejecución del workflow"
      className="z-20 shrink-0 border-t border-[#242a38] bg-[#12151e]"
    >
      {/* Always-visible Compact Trigger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggleOpen}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white"
        >
          <Terminal className="h-3.5 w-3.5 text-[#80e0be]" aria-hidden="true" />
          <span>Consola de Prueba en Vivo (Sin n8n)</span>
          {lastRun && (
            <span
              className={`rounded-full px-2 py-0.5 font-mono-code text-[10px] ${
                lastRun.status === 'completed'
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : lastRun.status === 'awaiting_approval'
                    ? 'bg-amber-400/20 text-amber-200'
                    : 'bg-blue-500/20 text-blue-200'
              }`}
            >
              {lastRun.status === 'awaiting_approval'
                ? 'Pausado · Aprobación Humana'
                : lastRun.status === 'blocked'
                  ? 'Bloqueado por Seguridad'
                  : lastRun.status === 'rejected'
                    ? 'Rechazado por Humano'
                    : 'Ejecución Completa'}
            </span>
          )}
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
          )}
        </button>

        {/* Quick Run Form inline */}
        <form
          aria-label="Ejecutar prueba rápida del workflow"
          className="flex flex-1 items-center justify-end gap-2 sm:max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            onRunPrompt(prompt || samplePrompts[0]);
          }}
        >
          <label htmlFor="exec-bar-prompt" className="sr-only">
            Mensaje de prueba para el workflow
          </label>
          <input
            id="exec-bar-prompt"
            name="executionPrompt"
            type="text"
            value={prompt}
            onChange={(e) => onChangePrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.nativeEvent.isComposing) {
                e.preventDefault();
              }
            }}
            placeholder={samplePrompts[0]}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-[#80e0be]"
          />
          <button
            type="submit"
            disabled={isRunning}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#ff6d5a] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#ff8170] disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            {isRunning ? 'Ejecutando...' : 'Ejecutar Workflow'}
          </button>
        </form>
      </div>

      {/* Collapsible Execution Details Panel */}
      {open && (
        <div className="max-h-[220px] space-y-3 overflow-y-auto border-t border-[#242a38] bg-[#0d1017] px-4 py-3 text-xs">
          {/* Quick Sample Test Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">
              Pruebas 1 clic:
            </span>
            {samplePrompts.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => {
                  onChangePrompt(sp);
                  onRunPrompt(sp);
                }}
                className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-[11px] text-slate-200 transition-colors hover:border-[#80e0be]/50 hover:text-white"
              >
                ▶ {sp}
              </button>
            ))}
          </div>

          {lastRun && (
            <div className="space-y-2.5">
              {/* Clickable Node Execution Timeline Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {lastRun.orderedTraces.map((tr) => (
                  <button
                    key={tr.nodeId}
                    type="button"
                    onClick={() => onSelectNode(tr.nodeId)}
                    className={`font-mono-code inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors hover:brightness-125 ${
                      tr.status === 'passed'
                        ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300'
                        : tr.status === 'waiting'
                          ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                          : tr.status === 'blocked'
                            ? 'border-blue-400/50 bg-blue-500/15 text-blue-200'
                            : 'border-rose-400/40 bg-rose-950/40 text-rose-200'
                    }`}
                  >
                    <span>{tr.nodeLabel}</span>
                    <span className="opacity-75">· {tr.durationMs}ms</span>
                  </button>
                ))}
                <span className="text-[10px] text-slate-500">
                  (haz clic en un nodo para inspeccionar su JSON)
                </span>
              </div>

              {/* Human-in-the-Loop Interactive Pause Box */}
              {lastRun.status === 'awaiting_approval' && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex flex-col justify-between gap-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-2">
                    <PauseCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                      aria-hidden="true"
                    />
                    <div>
                      <div className="font-bold text-amber-200">
                        Workflow pausado en Aprobación Humana
                      </div>
                      <div className="text-[11px] text-amber-100/85">
                        {lastRun.pendingApprovalReason}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={onApprovePending}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Aprobar y Liberar
                    </button>
                    <button
                      type="button"
                      onClick={onRejectPending}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-400/50 bg-rose-950/50 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-950/80"
                    >
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Rechazar
                    </button>
                  </div>
                </div>
              )}

              {/* Final Output Box */}
              <div className="rounded-xl border border-slate-800 bg-[#151924] p-3 leading-relaxed text-slate-200 whitespace-pre-line">
                {lastRun.finalReply.split('**').map((c, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="font-semibold text-white">
                      {c}
                    </strong>
                  ) : (
                    <span key={i}>{c}</span>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

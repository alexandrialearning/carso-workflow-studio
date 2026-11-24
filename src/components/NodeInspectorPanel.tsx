import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { RAG_DOCUMENTS } from '../data/workflowTemplates';
import type { NodeExecutionTrace, WorkflowNode } from '../types';

interface NodeInspectorPanelProps {
  node: WorkflowNode;
  trace?: NodeExecutionTrace;
  onUpdateNode: (nodeId: string, updater: (node: WorkflowNode) => WorkflowNode) => void;
  onMoveByDelta: (nodeId: string, dx: number, dy: number) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeInspectorPanel({
  node,
  trace,
  onUpdateNode,
  onMoveByDelta,
  onDeleteNode,
  onClose,
}: NodeInspectorPanelProps) {
  const toggleRagDoc = (docId: string) => {
    onUpdateNode(node.id, (prev) => {
      const current = prev.config.ragDocIds ?? [];
      const next = current.includes(docId)
        ? current.filter((id) => id !== docId)
        : [...current, docId];
      return {
        ...prev,
        subtitle: `${next.length} manual${next.length === 1 ? '' : 'es'} Carso`,
        config: { ...prev.config, ragDocIds: next },
      };
    });
  };

  return (
    <aside
      aria-label={`Configuración del nodo ${node.label}`}
      className="z-20 flex h-full w-[320px] shrink-0 flex-col border-r border-[#242a38] bg-[#13161f]/98 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#242a38] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal
            className="h-4 w-4 shrink-0 text-emerald-300"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="font-heading truncate text-sm font-bold text-white">
              {node.label}
            </h2>
            <div className="font-mono-code truncate text-[10px] text-slate-400">
              {node.n8nType}
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar inspector de nodo"
          onClick={onClose}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Parameters Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
        {/* Common Name + Enabled */}
        <div className="space-y-3">
          <div>
            <label
              htmlFor="insp-node-label"
              className="block font-medium text-slate-300"
            >
              Nombre del Nodo
            </label>
            <input
              id="insp-node-label"
              name="nodeLabel"
              type="text"
              value={node.label}
              onChange={(e) =>
                onUpdateNode(node.id, (p) => ({ ...p, label: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
            <input
              type="checkbox"
              name="nodeEnabled"
              checked={node.enabled}
              onChange={() =>
                onUpdateNode(node.id, (p) => ({ ...p, enabled: !p.enabled }))
              }
            />
            <span className="text-slate-200">
              Nodo activo en la ejecución del workflow
            </span>
          </label>
        </div>

        {/* Kind-specific Parameters */}
        {node.kind === 'agent' && (
          <div>
            <label
              htmlFor="insp-agent-prompt"
              className="block font-medium text-emerald-300"
            >
              System Prompt (Instrucciones del Agente)
            </label>
            <textarea
              id="insp-agent-prompt"
              name="systemPrompt"
              rows={5}
              value={node.config.systemPrompt ?? ''}
              onChange={(e) =>
                onUpdateNode(node.id, (p) => ({
                  ...p,
                  config: { ...p.config, systemPrompt: e.target.value },
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-400"
            />
          </div>
        )}

        {node.kind === 'llm' && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="insp-llm-model"
                className="block font-medium text-blue-300"
              >
                Modelo en Google Cloud Vertex AI
              </label>
              <select
                id="insp-llm-model"
                name="llmModel"
                value={node.config.modelId ?? 'gemini-2.5-flash'}
                onChange={(e) => {
                  const val = e.target.value as
                    | 'gemini-2.5-flash'
                    | 'gemini-2.5-pro'
                    | 'vertex-model-garden-open';
                  onUpdateNode(node.id, (p) => ({
                    ...p,
                    subtitle: val,
                    config: { ...p.config, modelId: val },
                  }));
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <option value="gemini-2.5-flash">
                  gemini-2.5-flash (Rápido / Económico)
                </option>
                <option value="gemini-2.5-pro">
                  gemini-2.5-pro (Razonamiento Complejo)
                </option>
                <option value="vertex-model-garden-open">
                  Open-Weights (Vertex Model Garden)
                </option>
              </select>
            </div>
          </div>
        )}

        {node.kind === 'security' && (
          <fieldset className="space-y-2">
            <legend className="font-semibold text-blue-300">
              Reglas Model Armor + Cloud DLP
            </legend>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              <input
                type="checkbox"
                checked={node.config.blockPromptInjection !== false}
                onChange={() =>
                  onUpdateNode(node.id, (p) => ({
                    ...p,
                    config: {
                      ...p.config,
                      blockPromptInjection: !(
                        p.config.blockPromptInjection !== false
                      ),
                    },
                  }))
                }
                className="mt-0.5"
              />
              <span>
                <strong className="block text-white">Escudo Prompt Injection</strong>
                <span className="text-[11px] text-slate-400">
                  Detiene ataques antes de tocar el AI Agent.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              <input
                type="checkbox"
                checked={node.config.redactPiiLfpdppp !== false}
                onChange={() =>
                  onUpdateNode(node.id, (p) => ({
                    ...p,
                    config: {
                      ...p.config,
                      redactPiiLfpdppp: !(p.config.redactPiiLfpdppp !== false),
                    },
                  }))
                }
                className="mt-0.5"
              />
              <span>
                <strong className="block text-white">
                  Enmascaramiento PII (LFPDPPP)
                </strong>
                <span className="text-[11px] text-slate-400">
                  Redacta RFC, CURP, CLABE, correos y teléfonos.
                </span>
              </span>
            </label>
          </fieldset>
        )}

        {node.kind === 'rag' && (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2.5">
              <input
                type="checkbox"
                checked={node.config.strictGrounding !== false}
                onChange={() =>
                  onUpdateNode(node.id, (p) => ({
                    ...p,
                    config: {
                      ...p.config,
                      strictGrounding: !(p.config.strictGrounding !== false),
                    },
                  }))
                }
              />
              <span className="font-semibold text-emerald-200">
                Modo Cero Alucinaciones (Citar o abstenerse)
              </span>
            </label>

            <fieldset className="space-y-1.5">
              <legend className="font-semibold text-slate-300">
                Manuales Corporativos Sintéticos
              </legend>
              {RAG_DOCUMENTS.map((doc) => {
                const checked = (node.config.ragDocIds ?? []).includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 ${
                      checked
                        ? 'border-emerald-400/45 bg-emerald-400/10'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRagDoc(doc.id)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="font-mono-code block truncate text-[10.5px] font-semibold text-white">
                        {doc.filename}
                      </span>
                      <span className="text-[10px] text-amber-300">
                        {doc.category}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </div>
        )}

        {node.kind === 'memory' && (
          <div>
            <label
              htmlFor="insp-memory-win"
              className="block font-medium text-violet-300"
            >
              Turnos recordados (Window Buffer): {node.config.windowLength ?? 8}
            </label>
            <input
              id="insp-memory-win"
              type="range"
              min={2}
              max={20}
              value={node.config.windowLength ?? 8}
              onChange={(e) => {
                const v = Number(e.target.value);
                onUpdateNode(node.id, (p) => ({
                  ...p,
                  subtitle: `Window Buffer (${v})`,
                  config: { ...p.config, windowLength: v },
                }));
              }}
              className="mt-2 w-full"
            />
          </div>
        )}

        {node.kind === 'approval' && (
          <div>
            <label
              htmlFor="insp-approver"
              className="block font-medium text-amber-300"
            >
              Rol Aprobador (Human-in-the-Loop)
            </label>
            <input
              id="insp-approver"
              type="text"
              value={node.config.approverRole ?? 'Responsable de Área'}
              onChange={(e) =>
                onUpdateNode(node.id, (p) => ({
                  ...p,
                  subtitle: e.target.value || 'Human-in-the-Loop',
                  config: { ...p.config, approverRole: e.target.value },
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus-visible:outline-2 focus-visible:outline-amber-400"
            />
          </div>
        )}

        {node.kind === 'output' && (
          <div>
            <label
              htmlFor="insp-output-channel"
              className="block font-medium text-teal-300"
            >
              Canal de Entrega Auditada
            </label>
            <select
              id="insp-output-channel"
              value={node.config.channel ?? 'Scroll_v2 JSON'}
              onChange={(e) => {
                const ch = e.target.value as
                  | 'Scroll_v2 JSON'
                  | 'Google Chat / Correo'
                  | 'Bitácora Auditoría';
                onUpdateNode(node.id, (p) => ({
                  ...p,
                  subtitle: ch,
                  config: { ...p.config, channel: ch },
                }));
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <option value="Scroll_v2 JSON">Scroll_v2 JSON</option>
              <option value="Google Chat / Correo">Google Chat / Correo</option>
              <option value="Bitácora Auditoría">Bitácora Auditoría</option>
            </select>
          </div>
        )}

        {node.kind === 'tool_erp_risky' && (
          <div className="rounded-xl border border-rose-400/50 bg-rose-950/40 p-3 text-[11px] leading-relaxed text-rose-100">
            <strong>Antipatrón de Menor Privilegio:</strong> Este nodo simula una escritura directa sin autorización humana en el ERP. Elimínalo o pídele a <strong>Alexandr.ia</strong> que audite y corrija el workflow.
          </div>
        )}

        {/* Single-pointer accessible position nudge controls per modern-web-guidance `drag` */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-2 text-[11px] font-semibold text-slate-400">
            Mover posición en el lienzo
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Mover a la izquierda"
              onClick={() => onMoveByDelta(node.id, -30, 0)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Mover hacia arriba"
              onClick={() => onMoveByDelta(node.id, 0, -30)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Mover hacia abajo"
              onClick={() => onMoveByDelta(node.id, 0, 30)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Mover a la derecha"
              onClick={() => onMoveByDelta(node.id, 30, 0)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Last Execution Output JSON */}
        {trace && (
          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-mono-code text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Salida JSON (Última ejecución)
              </span>
              <span className="font-mono-code text-[10px] text-slate-400">
                {trace.durationMs} ms
              </span>
            </div>
            <p className="text-[11px] text-slate-300">{trace.summary}</p>
            <pre className="font-mono-code max-h-[160px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[10.5px] leading-relaxed text-emerald-200">
              {JSON.stringify(trace.outputJson, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Delete */}
      {node.kind !== 'trigger' && (
        <div className="border-t border-[#242a38] p-3">
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-950/60"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Eliminar este nodo del canvas
          </button>
        </div>
      )}
    </aside>
  );
}

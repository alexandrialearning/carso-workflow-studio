import { useState } from 'react';
import {
  Download,
  MessageSquareText,
  Play,
  Plus,
} from 'lucide-react';
import { AlexandriaCopilot } from './components/AlexandriaCopilot';
import { ExecutionBar } from './components/ExecutionBar';
import { NodeInspectorPanel } from './components/NodeInspectorPanel';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import {
  NODE_PALETTE,
  WORKFLOW_TEMPLATES,
} from './data/workflowTemplates';
import {
  autoArrangeNodes,
  downloadCanvasAsN8nJson,
  executeCanvasWorkflow,
} from './lib/workflowGraphEngine';
import type {
  CognitiveStyle,
  CorporateAreaId,
  NodeExecutionTrace,
  NodePaletteItem,
  WorkflowNode,
  WorkflowNodeKind,
  WorkflowRunResult,
} from './types';

export function App() {
  const [templateId, setTemplateId] = useState<CorporateAreaId>('finanzas');
  const [workflowTitle, setWorkflowTitle] = useState(
    WORKFLOW_TEMPLATES.finanzas.title
  );
  const [nodes, setNodes] = useState<WorkflowNode[]>(() =>
    WORKFLOW_TEMPLATES.finanzas.nodes.map((n) => ({ ...n, config: { ...n.config } }))
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [execBarOpen, setExecBarOpen] = useState(true);

  const [cognitiveStyle, setCognitiveStyle] =
    useState<CognitiveStyle>('Pragmático');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const [testPrompt, setTestPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeRunningNodeId, setActiveRunningNodeId] = useState<string | null>(
    null
  );
  const [traces, setTraces] = useState<Record<string, NodeExecutionTrace>>({});
  const [lastRun, setLastRun] = useState<WorkflowRunResult | null>(null);

  const activeTemplate = WORKFLOW_TEMPLATES[templateId];
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleLoadTemplate = (nextArea: CorporateAreaId) => {
    const tpl = WORKFLOW_TEMPLATES[nextArea];
    setTemplateId(nextArea);
    setWorkflowTitle(tpl.title);
    setNodes(tpl.nodes.map((n) => ({ ...n, config: { ...n.config } })));
    setSelectedNodeId(null);
    setTraces({});
    setLastRun(null);
    setActiveRunningNodeId(null);
    setTestPrompt('');
  };

  const handleMoveNode = (nodeId: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n)));
  };

  const handleMoveByDelta = (nodeId: string, dx: number, dy: number) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              x: Math.max(20, Math.min(1420, n.x + dx)),
              y: Math.max(20, Math.min(560, n.y + dy)),
            }
          : n
      )
    );
  };

  const handleUpdateNode = (
    nodeId: string,
    updater: (node: WorkflowNode) => WorkflowNode
  ) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? updater(n) : n)));
  };

  const handleAddNode = (item: NodePaletteItem) => {
    setNodes((prev) => {
      const existing = prev.find((n) => n.kind === item.kind);
      if (existing) {
        return prev.map((n) =>
          n.id === existing.id ? { ...n, enabled: true } : n
        );
      }
      const newNode: WorkflowNode = {
        id: `n-${item.kind}-${Date.now()}`,
        kind: item.kind,
        group: item.group,
        label: item.label,
        subtitle: item.subtitle,
        n8nType: item.n8nType,
        x: 360,
        y: item.group === 'main' ? 120 : 330,
        enabled: true,
        config: { ...item.defaultConfig },
      };
      return autoArrangeNodes([...prev, newNode]);
    });
    setPaletteOpen(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleRemoveNodesByKind = (kind: WorkflowNodeKind) => {
    setNodes((prev) => prev.filter((n) => n.kind !== kind));
  };

  const handleFixWorkflowSecurity = (): number => {
    const required: WorkflowNodeKind[] = ['security', 'llm', 'rag', 'approval'];
    let addedCount = 0;

    setNodes((prev) => {
      let next = prev.filter((n) => n.kind !== 'tool_erp_risky');
      for (const kind of required) {
        const existing = next.find((n) => n.kind === kind);
        if (existing) {
          next = next.map((n) =>
            n.id === existing.id ? { ...n, enabled: true } : n
          );
        } else {
          const item = NODE_PALETTE.find((p) => p.kind === kind)!;
          addedCount += 1;
          next.push({
            id: `n-${kind}-${Date.now()}-${addedCount}`,
            kind: item.kind,
            group: item.group,
            label: item.label,
            subtitle: item.subtitle,
            n8nType: item.n8nType,
            x: 360,
            y: item.group === 'main' ? 120 : 330,
            enabled: true,
            config: { ...item.defaultConfig },
          });
        }
      }
      return autoArrangeNodes(next);
    });

    return addedCount;
  };

  const handleRunWorkflow = async (inputPrompt?: string) => {
    const effective = (inputPrompt ?? testPrompt).trim() || activeTemplate.samplePrompts[0];
    if (isRunning) return;

    setExecBarOpen(true);
    setIsRunning(true);
    setTraces({});
    setLastRun(null);

    const result = await executeCanvasWorkflow({
      nodes,
      prompt: effective,
      workflowTitle,
      geminiApiKey,
      onTraceUpdate: (nextTraces, runningId) => {
        setTraces(nextTraces);
        setActiveRunningNodeId(runningId);
      },
    });

    setIsRunning(false);
    setTraces(result.traces);
    setLastRun(result);
    if (result.status !== 'awaiting_approval') {
      setActiveRunningNodeId(null);
    }
  };

  const handleApprovePending = () => {
    if (!lastRun || lastRun.status !== 'awaiting_approval') return;
    const approvalId = lastRun.pendingApprovalNodeId;
    const outputNode = nodes.find((n) => n.kind === 'output' && n.enabled);
    const updatedTraces: Record<string, NodeExecutionTrace> = { ...lastRun.traces };

    if (approvalId && updatedTraces[approvalId]) {
      updatedTraces[approvalId] = {
        ...updatedTraces[approvalId],
        status: 'passed',
        durationMs: 16,
        summary: 'Aprobado en vivo por responsable humano',
        outputJson: {
          ...updatedTraces[approvalId].outputJson,
          status: 'APPROVED_BY_HUMAN',
          approvedAt: new Date().toLocaleTimeString('es-MX'),
        },
      };
    }

    const ordered = [...lastRun.orderedTraces].map((t) =>
      t.nodeId === approvalId ? updatedTraces[approvalId] : t
    );

    if (outputNode) {
      const outTrace: NodeExecutionTrace = {
        nodeId: outputNode.id,
        nodeLabel: outputNode.label,
        status: 'passed',
        durationMs: 12,
        summary: `Salida liberada vía ${outputNode.config.channel ?? 'Scroll_v2 JSON'}`,
        outputJson: { delivered: true, humanApproved: true, auditLogged: true },
      };
      updatedTraces[outputNode.id] = outTrace;
      ordered.push(outTrace);
    }

    setTraces(updatedTraces);
    setActiveRunningNodeId(null);
    setLastRun({
      ...lastRun,
      status: 'completed',
      finalReply: `${lastRun.finalReply}\n\n✅ **Aprobado por Human-in-the-Loop** — Respuesta liberada y registrada en bitácora.`,
      traces: updatedTraces,
      orderedTraces: ordered,
      pendingApprovalNodeId: undefined,
    });
  };

  const handleRejectPending = () => {
    if (!lastRun || lastRun.status !== 'awaiting_approval') return;
    const approvalId = lastRun.pendingApprovalNodeId;
    const updatedTraces: Record<string, NodeExecutionTrace> = { ...lastRun.traces };
    if (approvalId && updatedTraces[approvalId]) {
      updatedTraces[approvalId] = {
        ...updatedTraces[approvalId],
        status: 'blocked',
        summary: 'Rechazado por aprobador humano (salida retenida)',
        outputJson: {
          ...updatedTraces[approvalId].outputJson,
          status: 'REJECTED_BY_HUMAN',
        },
      };
    }

    setTraces(updatedTraces);
    setActiveRunningNodeId(null);
    setLastRun({
      ...lastRun,
      status: 'rejected',
      finalReply:
        '⛔ **Workflow detenido en Aprobación Humana.** La salida fue descartada antes de enviarse.',
      traces: updatedTraces,
      orderedTraces: lastRun.orderedTraces.map((t) =>
        t.nodeId === approvalId ? updatedTraces[approvalId] : t
      ),
      pendingApprovalNodeId: undefined,
    });
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0e1016] text-slate-100">
      {/* Authentic n8n-Style Top Studio Toolbar */}
      <header className="z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#242a38] bg-[#13161f] px-4 py-2.5">
        {/* Left: Brand + Editable Workflow Title + Template Switcher */}
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <img
              src="/grupo-carso-logo.webp"
              alt="Grupo Carso"
              width={118}
              height={32}
              className="h-7 w-auto shrink-0 object-contain"
            />
            <span className="hidden rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-0.5 font-mono-code text-[10px] font-semibold uppercase tracking-wider text-slate-300 md:inline">
              Workflow Studio
            </span>
          </div>

          <span className="hidden h-5 w-px bg-slate-800 sm:inline" aria-hidden="true" />

          <label htmlFor="workflow-title-input" className="sr-only">
            Nombre del workflow
          </label>
          <input
            id="workflow-title-input"
            name="workflowTitle"
            type="text"
            value={workflowTitle}
            onChange={(e) => setWorkflowTitle(e.target.value)}
            className="w-56 truncate rounded-lg border border-transparent bg-transparent px-2 py-1 font-heading text-sm font-semibold text-white transition-colors hover:border-slate-700 focus:border-emerald-400 focus:bg-slate-950 focus-visible:outline-none sm:w-72"
          />

          <label htmlFor="template-selector" className="sr-only">
            Cargar plantilla corporativa
          </label>
          <select
            id="template-selector"
            name="corporateTemplate"
            value={templateId}
            onChange={(e) =>
              handleLoadTemplate(e.target.value as CorporateAreaId)
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 focus-visible:outline-2 focus-visible:outline-[#80e0be]"
          >
            <option value="finanzas">Plantilla: Finanzas FP&amp;A</option>
            <option value="legal">Plantilla: Legal &amp; Contratos</option>
            <option value="compras">Plantilla: Compras RFP</option>
            <option value="rh">Plantilla: RH &amp; Onboarding</option>
            <option value="blank">Lienzo Inicial (Básico)</option>
          </select>
        </div>

        {/* Right: Studio Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-colors hover:border-emerald-400/60 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5 text-[#80e0be]" aria-hidden="true" />
            Agregar Nodo
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => void handleRunWorkflow()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff6d5a] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#ff8170] disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            {isRunning ? 'Corriendo...' : 'Ejecutar'}
          </button>

          <button
            type="button"
            onClick={() => downloadCanvasAsN8nJson(nodes, workflowTitle)}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-orange-400/50 hover:text-white md:inline-flex"
          >
            <Download className="h-3.5 w-3.5 text-orange-300" aria-hidden="true" />
            Exportar .json
          </button>

          <button
            type="button"
            aria-pressed={copilotOpen}
            onClick={() => setCopilotOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              copilotOpen
                ? 'border-[#80e0be]/60 bg-[#80e0be]/15 text-[#80e0be]'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
            Alexandr.ia
          </button>
        </div>
      </header>

      {/* Center Workspace: Inspector (Left, contextual) + Full-Bleed n8n Canvas + Alexandr.ia Chatbot (Right) */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {selectedNode && (
          <NodeInspectorPanel
            node={selectedNode}
            trace={traces[selectedNode.id]}
            onUpdateNode={handleUpdateNode}
            onMoveByDelta={handleMoveByDelta}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}

        <WorkflowCanvas
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          traces={traces}
          activeRunningNodeId={activeRunningNodeId}
          paletteOpen={paletteOpen}
          onClosePalette={() => setPaletteOpen(false)}
          onOpenPalette={() => setPaletteOpen(true)}
          onSelectNode={setSelectedNodeId}
          onMoveNode={handleMoveNode}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onAutoLayout={() => setNodes((prev) => autoArrangeNodes(prev))}
        />

        {copilotOpen && (
          <AlexandriaCopilot
            nodes={nodes}
            workflowTitle={workflowTitle}
            cognitiveStyle={cognitiveStyle}
            geminiApiKey={geminiApiKey}
            onChangeCognitiveStyle={setCognitiveStyle}
            onChangeGeminiApiKey={setGeminiApiKey}
            onLoadTemplate={handleLoadTemplate}
            onAddNodeByKind={handleAddNode}
            onRemoveNodesByKind={handleRemoveNodesByKind}
            onFixWorkflowSecurity={handleFixWorkflowSecurity}
            onClose={() => setCopilotOpen(false)}
          />
        )}
      </div>

      {/* Bottom n8n-Style Execution Console */}
      <ExecutionBar
        open={execBarOpen}
        onToggleOpen={() => setExecBarOpen((v) => !v)}
        prompt={testPrompt}
        onChangePrompt={setTestPrompt}
        samplePrompts={activeTemplate.samplePrompts}
        isRunning={isRunning}
        lastRun={lastRun}
        onRunPrompt={(txt) => void handleRunWorkflow(txt)}
        onApprovePending={handleApprovePending}
        onRejectPending={handleRejectPending}
        onSelectNode={setSelectedNodeId}
      />
    </div>
  );
}

export default App;

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cloud,
  Database,
  FileText,
  GripVertical,
  HelpCircle,
  History,
  LayoutGrid,
  Minus,
  PauseCircle,
  Plus,
  Send,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  Webhook,
  Wrench,
  X,
} from 'lucide-react';
import { NODE_PALETTE } from '../data/workflowTemplates';
import { deriveCanvasEdges } from '../lib/workflowGraphEngine';
import type {
  NodeExecutionTrace,
  NodePaletteItem,
  WorkflowNode,
  WorkflowNodeKind,
} from '../types';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  selectedNodeId: string | null;
  traces: Record<string, NodeExecutionTrace>;
  activeRunningNodeId: string | null;
  paletteOpen: boolean;
  onClosePalette: () => void;
  onOpenPalette: () => void;
  onSelectNode: (nodeId: string | null) => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onAddNode: (item: NodePaletteItem) => void;
  onDeleteNode: (nodeId: string) => void;
  onAutoLayout: () => void;
}

const MAIN_W = 196;
const MAIN_H = 88;
const SUB_W = 166;
const SUB_H = 74;

function getNodeVisualMeta(kind: WorkflowNodeKind) {
  switch (kind) {
    case 'trigger':
      return {
        icon: Webhook,
        badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-400/40',
        wireColor: '#fb923c',
      };
    case 'security':
      return {
        icon: Shield,
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
        wireColor: '#60a5fa',
      };
    case 'agent':
      return {
        icon: Bot,
        badgeBg: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/50',
        wireColor: '#80e0be',
      };
    case 'approval':
      return {
        icon: UserCheck,
        badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-400/45',
        wireColor: '#fbbf24',
      };
    case 'output':
      return {
        icon: Send,
        badgeBg: 'bg-teal-400/20 text-teal-300 border-teal-400/40',
        wireColor: '#2dd4bf',
      };
    case 'llm':
      return {
        icon: Cloud,
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
        wireColor: '#60a5fa',
      };
    case 'memory':
      return {
        icon: History,
        badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-400/40',
        wireColor: '#a78bfa',
      };
    case 'rag':
      return {
        icon: Database,
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
        wireColor: '#34d399',
      };
    case 'tool_exec':
      return {
        icon: FileText,
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
        wireColor: '#fbbf24',
      };
    case 'tool_erp_risky':
      return {
        icon: ShieldAlert,
        badgeBg: 'bg-rose-500/25 text-rose-300 border-rose-400/50',
        wireColor: '#fb7185',
      };
  }
}

export function WorkflowCanvas({
  nodes,
  selectedNodeId,
  traces,
  activeRunningNodeId,
  paletteOpen,
  onClosePalette,
  onOpenPalette,
  onSelectNode,
  onMoveNode,
  onAddNode,
  onDeleteNode,
  onAutoLayout,
}: WorkflowCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const dragMetaRef = useRef<{
    nodeId: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const announce = (msg: string) => {
    setLiveAnnouncement(msg);
    window.setTimeout(() => setLiveAnnouncement(''), 1000);
  };

  const clampPos = (x: number, y: number) => ({
    x: Math.max(20, Math.min(x, 1420)),
    y: Math.max(20, Math.min(y, 560)),
  });

  const handleDragPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    node: WorkflowNode
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragMetaRef.current = {
      nodeId: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: node.x,
      originY: node.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (
    e: React.PointerEvent<HTMLButtonElement>,
    node: WorkflowNode
  ) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const meta = dragMetaRef.current;
    if (!meta || meta.nodeId !== node.id) return;

    const dx = e.clientX - meta.startClientX;
    const dy = e.clientY - meta.startClientY;
    if (!meta.moved && Math.hypot(dx, dy) < 4) return;

    meta.moved = true;
    setDraggingNodeId(node.id);
    const next = clampPos(meta.originX + dx / zoom, meta.originY + dy / zoom);
    onMoveNode(node.id, Math.round(next.x), Math.round(next.y));
  };

  const handleLostPointerCapture = (node: WorkflowNode) => {
    if (dragMetaRef.current?.moved) {
      announce(`Nodo ${node.label} reubicado en el lienzo`);
    }
    dragMetaRef.current = null;
    setDraggingNodeId(null);
  };

  const handleDragKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    node: WorkflowNode
  ) => {
    const step = 20;
    let dx = 0;
    let dy = 0;
    let dirText = '';

    if (e.key === 'ArrowRight') {
      dx = step;
      dirText = 'a la derecha';
    } else if (e.key === 'ArrowLeft') {
      dx = -step;
      dirText = 'a la izquierda';
    } else if (e.key === 'ArrowUp') {
      dy = -step;
      dirText = 'hacia arriba';
    } else if (e.key === 'ArrowDown') {
      dy = step;
      dirText = 'hacia abajo';
    } else {
      return;
    }

    e.preventDefault();
    const next = clampPos(node.x + dx, node.y + dy);
    onMoveNode(node.id, next.x, next.y);
    announce(`Nodo ${node.label} movido ${dirText}`);
  };

  const edges = deriveCanvasEdges(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const categories = Array.from(new Set(NODE_PALETTE.map((p) => p.category)));

  return (
    <div className="n8n-dot-grid relative flex-1 overflow-auto">
      {/* Live region for screen reader drag announcements (modern-web-guidance `drag`) */}
      <div className="visually-hidden" aria-live="polite">
        {liveAnnouncement}
      </div>

      {/* Scrollable Inner Canvas Workspace */}
      <div
        className="relative min-h-[540px] min-w-[1260px] origin-top-left transition-transform duration-150"
        style={{ transform: `scale(${zoom})` }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectNode(null);
          }
        }}
      >
        {/* SVG Cubic Bezier Wires Layer */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          {edges.map((edge) => {
            const src = byId.get(edge.fromId);
            const dst = byId.get(edge.toId);
            if (!src || !dst) return null;

            const srcTrace = traces[src.id];
            const dstTrace = traces[dst.id];
            const isFlowActive =
              activeRunningNodeId === src.id ||
              activeRunningNodeId === dst.id ||
              srcTrace?.status === 'passed';
            const isBlockedWire = srcTrace?.status === 'blocked';

            if (edge.type === 'main') {
              const x1 = src.x + MAIN_W;
              const y1 = src.y + MAIN_H / 2;
              const x2 = dst.x;
              const y2 = dst.y + MAIN_H / 2;
              const cOffset = Math.max(46, Math.abs(x2 - x1) * 0.45);
              const d = `M ${x1} ${y1} C ${x1 + cOffset} ${y1}, ${x2 - cOffset} ${y2}, ${x2} ${y2}`;

              const stroke = isBlockedWire
                ? '#60a5fa'
                : isFlowActive
                  ? '#80e0be'
                  : '#475569';

              return (
                <g key={edge.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={isFlowActive ? 2.6 : 2}
                    strokeOpacity={isFlowActive ? 0.95 : 0.65}
                    className={
                      activeRunningNodeId === dst.id ? 'edge-animated' : ''
                    }
                  />
                  {/* Connector dot at target */}
                  <circle cx={x2} cy={y2} r={3.5} fill={stroke} />
                </g>
              );
            }

            // Sub-node curved vertical dashed wire up into AI Agent bottom port
            const x1 = src.x + SUB_W / 2;
            const y1 = src.y;
            const portOffset =
              src.kind === 'llm'
                ? MAIN_W * 0.25
                : src.kind === 'memory'
                  ? MAIN_W * 0.5
                  : MAIN_W * 0.75;
            const x2 = dst.x + portOffset;
            const y2 = dst.y + MAIN_H;
            const midY = (y1 + y2) / 2;
            const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

            const isRiskySub = src.kind === 'tool_erp_risky';
            const stroke = isRiskySub
              ? '#fb7185'
              : dstTrace || srcTrace
                ? '#80e0be'
                : '#64748b';

            return (
              <g key={edge.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isRiskySub ? 2.4 : 1.8}
                  strokeDasharray="5 5"
                  strokeOpacity={0.85}
                />
                {edge.portLabel && (
                  <text
                    x={(x1 + x2) / 2}
                    y={midY - 4}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {edge.portLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Draggable n8n-style Nodes */}
        {nodes.map((node) => {
          const meta = getNodeVisualMeta(node.kind);
          const Icon = meta.icon;
          const isMain = node.group === 'main';
          const width = isMain ? MAIN_W : SUB_W;
          const height = isMain ? MAIN_H : SUB_H;
          const isSelected = selectedNodeId === node.id;
          const trace = traces[node.id];
          const isRunning = activeRunningNodeId === node.id;
          const isRisky = node.kind === 'tool_erp_risky';

          let borderTone = 'border-[#2c3346] hover:border-slate-500';
          if (isRisky) {
            borderTone = 'border-rose-400/80 shadow-[0_0_24px_rgba(251,113,133,0.2)]';
          } else if (trace?.status === 'waiting') {
            borderTone =
              'border-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.28)] animate-pulse';
          } else if (trace?.status === 'blocked') {
            borderTone = 'border-blue-400 shadow-[0_0_24px_rgba(96,165,250,0.3)]';
          } else if (isRunning) {
            borderTone = 'border-emerald-300 shadow-[0_0_28px_rgba(128,224,190,0.35)]';
          } else if (trace?.status === 'passed') {
            borderTone = 'border-emerald-400/65';
          } else if (isSelected) {
            borderTone = 'border-emerald-400 ring-2 ring-emerald-400/35';
          }

          return (
            <div
              key={node.id}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${width}px`,
                minHeight: `${height}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              className={`group absolute rounded-2xl border bg-[#171b26]/95 p-3 backdrop-blur transition-shadow ${borderTone} ${
                !node.enabled ? 'opacity-50' : ''
              }`}
            >
              {/* n8n Side Input/Output Ports for Main Nodes */}
              {isMain && node.kind !== 'trigger' && (
                <span
                  aria-hidden="true"
                  className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#171b26] bg-slate-400"
                />
              )}
              {isMain && node.kind !== 'output' && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#171b26] bg-emerald-400"
                />
              )}

              {/* n8n Bottom AI Sub-node Port Sockets on AI Agent */}
              {node.kind === 'agent' && (
                <>
                  <span
                    aria-hidden="true"
                    title="Chat Model"
                    className="absolute -bottom-1.5 left-1/4 h-3 w-3 -translate-x-1/2 rotate-45 border border-[#171b26] bg-blue-400"
                  />
                  <span
                    aria-hidden="true"
                    title="Memory"
                    className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-[#171b26] bg-violet-400"
                  />
                  <span
                    aria-hidden="true"
                    title="Tools / RAG"
                    className="absolute -bottom-1.5 left-3/4 h-3 w-3 -translate-x-1/2 rotate-45 border border-[#171b26] bg-emerald-400"
                  />
                </>
              )}

              {/* Top Port for Sub-nodes */}
              {!isMain && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-[#171b26] bg-emerald-400"
                />
              )}

              {/* Node Card Content */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.badgeBg}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-white">
                      {node.label}
                    </div>
                    <div className="truncate text-[10px] text-slate-400">
                      {node.subtitle}
                    </div>
                  </div>
                </div>

                {/* Dedicated accessible drag handle per modern-web-guidance `drag` */}
                <button
                  type="button"
                  aria-label={`Mover nodo ${node.label}. Usa las flechas del teclado para moverlo.`}
                  onPointerDown={(e) => handleDragPointerDown(e, node)}
                  onPointerMove={(e) => handleDragPointerMove(e, node)}
                  onLostPointerCapture={() => handleLostPointerCapture(node)}
                  onKeyDown={(e) => handleDragKeyDown(e, node)}
                  className={`drag-handle inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                    draggingNodeId === node.id ? 'dragging text-emerald-300' : ''
                  }`}
                >
                  <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Execution Telemetry / Quick Delete Strip */}
              <div className="mt-2 flex items-center justify-between gap-1">
                {trace ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono-code text-[9.5px] font-semibold ${
                      trace.status === 'passed'
                        ? 'bg-emerald-400/15 text-emerald-300'
                        : trace.status === 'blocked'
                          ? 'bg-blue-400/20 text-blue-200'
                          : trace.status === 'waiting'
                            ? 'bg-amber-400/20 text-amber-200'
                            : 'bg-rose-500/20 text-rose-200'
                    }`}
                  >
                    {trace.status === 'passed' && (
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    )}
                    {trace.status === 'waiting' && (
                      <PauseCircle className="h-3 w-3" aria-hidden="true" />
                    )}
                    {(trace.status === 'warning' ||
                      trace.status === 'blocked') && (
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    )}
                    {trace.status === 'waiting'
                      ? 'Pausado HITL'
                      : trace.status === 'blocked'
                        ? 'Bloqueado'
                        : `${trace.durationMs} ms`}
                  </span>
                ) : (
                  <span className="font-mono-code truncate text-[9.5px] text-slate-500">
                    {isRisky ? 'Riesgo ERP' : node.n8nType.split('.').pop()}
                  </span>
                )}

                {node.kind !== 'trigger' && (
                  <button
                    type="button"
                    aria-label={`Eliminar nodo ${node.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-rose-500/20 hover:text-rose-300 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Floating Quick "+" Add Node Ghost Slot at end of main chain */}
        <button
          type="button"
          onClick={onOpenPalette}
          style={{ left: '1240px', top: '140px' }}
          aria-label="Agregar un nuevo nodo al workflow"
          className="absolute flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/70 text-slate-300 transition-all hover:border-emerald-400 hover:bg-emerald-400/15 hover:text-emerald-300"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Bottom-Left Authentic n8n Canvas Controls */}
      <div className="fixed bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#13161f]/95 p-1.5 shadow-xl backdrop-blur">
        <button
          type="button"
          aria-label="Alejar zoom"
          onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(2))))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="font-mono-code w-10 text-center text-[11px] text-slate-300">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="Acercar zoom"
          onClick={() => setZoom((z) => Math.min(1.25, Number((z + 0.1).toFixed(2))))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <span className="mx-0.5 h-4 w-px bg-slate-800" aria-hidden="true" />

        <button
          type="button"
          onClick={() => {
            setZoom(1);
            onAutoLayout();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
          Auto-ordenar
        </button>

        <button
          type="button"
          aria-expanded={showKeyboardHelp}
          aria-label="Ayuda de atajos de teclado para mover nodos"
          onClick={() => setShowKeyboardHelp((v) => !v)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {showKeyboardHelp && (
        <div className="fixed bottom-16 left-4 z-20 max-w-xs rounded-xl border border-slate-700 bg-[#151924] p-3 text-xs text-slate-300 shadow-2xl">
          <div className="font-semibold text-white">Mover nodos en el lienzo</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Arrastra cualquier nodo desde el ícono de puntos (<strong>⋮⋮</strong>) o enfócalo con <kbd className="rounded bg-slate-800 px-1 text-slate-200">Tab</kbd> y muévelo con las flechas del teclado. También puedes usar <strong>Auto-ordenar</strong> con un clic.
          </p>
        </div>
      )}

      {/* Slide-out n8n-style Node Palette ("+ Agregar Nodo") */}
      {paletteOpen && (
        <aside
          aria-label="Catálogo de nodos del workflow"
          className="fixed left-4 top-16 z-30 flex max-h-[calc(100dvh-10rem)] w-[320px] flex-col overflow-hidden rounded-2xl border border-slate-700/90 bg-[#141822]/98 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-300" aria-hidden="true" />
              <h2 className="font-heading text-sm font-bold text-white">
                Agregar Nodo (Estilo n8n)
              </h2>
            </div>
            <button
              type="button"
              aria-label="Cerrar catálogo de nodos"
              onClick={onClosePalette}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-3.5">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1.5">
                <div className="font-mono-code text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {cat}
                </div>
                {NODE_PALETTE.filter((p) => p.category === cat).map((item) => {
                  const meta = getNodeVisualMeta(item.kind);
                  const Icon = meta.icon;
                  const alreadyExists = nodes.some((n) => n.kind === item.kind);
                  return (
                    <button
                      key={item.kind}
                      type="button"
                      onClick={() => onAddNode(item)}
                      className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                        item.isRisky
                          ? 'border-rose-500/35 bg-rose-950/20 hover:border-rose-400'
                          : 'border-slate-800 bg-slate-900/70 hover:border-emerald-400/50 hover:bg-slate-900'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${meta.badgeBg}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-white">
                            {item.label}
                          </span>
                          {alreadyExists && (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                              En canvas
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

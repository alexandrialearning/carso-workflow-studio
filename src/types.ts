export type CognitiveStyle = 'Pragmático' | 'Teórico' | 'Reflexivo' | 'Activo';

export type CorporateAreaId =
  | 'finanzas'
  | 'legal'
  | 'compras'
  | 'rh'
  | 'blank';

export type WorkflowNodeKind =
  | 'trigger'
  | 'security'
  | 'agent'
  | 'approval'
  | 'output'
  | 'llm'
  | 'memory'
  | 'rag'
  | 'tool_exec'
  | 'tool_erp_risky';

export type NodeGroup = 'main' | 'subnode';

export interface WorkflowNodeConfig {
  // Agent
  systemPrompt?: string;
  // LLM
  modelId?: 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'vertex-model-garden-open';
  temperature?: number;
  // Security
  blockPromptInjection?: boolean;
  redactPiiLfpdppp?: boolean;
  // RAG
  ragDocIds?: string[];
  strictGrounding?: boolean;
  // Memory
  windowLength?: number;
  // Approval
  approverRole?: string;
  // Output
  channel?: 'Scroll_v2 JSON' | 'Google Chat / Correo' | 'Bitácora Auditoría';
}

export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  group: NodeGroup;
  label: string;
  subtitle: string;
  n8nType: string;
  x: number;
  y: number;
  enabled: boolean;
  config: WorkflowNodeConfig;
}

export interface NodePaletteItem {
  kind: WorkflowNodeKind;
  group: NodeGroup;
  category:
    | 'Triggers'
    | 'Seguridad & Gobierno'
    | 'Agente IA'
    | 'Sub-nodos IA (n8n)'
    | 'Flujo y Salida';
  label: string;
  subtitle: string;
  n8nType: string;
  description: string;
  defaultConfig: WorkflowNodeConfig;
  isRisky?: boolean;
}

export interface RagDocument {
  id: string;
  filename: string;
  category: string;
  badge: string;
  section: string;
  keywords: string[];
  excerpt: string;
}

export interface NodeExecutionTrace {
  nodeId: string;
  nodeLabel: string;
  status: 'running' | 'passed' | 'blocked' | 'warning' | 'waiting' | 'skipped';
  durationMs: number;
  summary: string;
  outputJson: Record<string, unknown>;
}

export interface WorkflowRunResult {
  runId: string;
  prompt: string;
  engineLabel: string;
  status: 'completed' | 'blocked' | 'awaiting_approval' | 'rejected' | 'error';
  finalReply: string;
  traces: Record<string, NodeExecutionTrace>;
  orderedTraces: NodeExecutionTrace[];
  pendingApprovalNodeId?: string;
  pendingApprovalReason?: string;
}

export interface CopilotActionBadge {
  label: string;
  tone: 'mint' | 'amber' | 'blue';
}

export interface CopilotMessage {
  id: string;
  sender: 'alexandria' | 'user';
  text: string;
  timestamp: string;
  styleTag?: string;
  actionBadge?: CopilotActionBadge;
  suggestedQuickAction?: {
    label: string;
    command: string;
  };
}

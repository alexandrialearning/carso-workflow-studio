import { RAG_DOCUMENTS } from '../data/workflowTemplates';
import type {
  NodeExecutionTrace,
  WorkflowNode,
  WorkflowNodeKind,
  WorkflowRunResult,
} from '../types';

export interface DerivedEdge {
  id: string;
  fromId: string;
  toId: string;
  type: 'main' | 'subnode';
  portLabel?: string;
}

const MAIN_ORDER: WorkflowNodeKind[] = [
  'trigger',
  'security',
  'agent',
  'approval',
  'output',
];

export function deriveCanvasEdges(nodes: WorkflowNode[]): DerivedEdge[] {
  const edges: DerivedEdge[] = [];

  const mainNodes = nodes
    .filter((n) => n.group === 'main')
    .sort((a, b) => {
      const idxA = MAIN_ORDER.indexOf(a.kind);
      const idxB = MAIN_ORDER.indexOf(b.kind);
      if (idxA !== idxB) return idxA - idxB;
      return a.x - b.x;
    });

  for (let i = 0; i < mainNodes.length - 1; i += 1) {
    edges.push({
      id: `e-${mainNodes[i].id}-${mainNodes[i + 1].id}`,
      fromId: mainNodes[i].id,
      toId: mainNodes[i + 1].id,
      type: 'main',
    });
  }

  const agentNode = nodes.find((n) => n.kind === 'agent');
  if (agentNode) {
    const subNodes = nodes.filter((n) => n.group === 'subnode');
    for (const sub of subNodes) {
      const portLabel =
        sub.kind === 'llm'
          ? 'Model'
          : sub.kind === 'memory'
            ? 'Memory'
            : 'Tool';
      edges.push({
        id: `e-sub-${sub.id}-${agentNode.id}`,
        fromId: sub.id,
        toId: agentNode.id,
        type: 'subnode',
        portLabel,
      });
    }
  }

  return edges;
}

export function autoArrangeNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  const mainNodes = nodes
    .filter((n) => n.group === 'main')
    .sort((a, b) => MAIN_ORDER.indexOf(a.kind) - MAIN_ORDER.indexOf(b.kind));

  const subNodes = nodes.filter((n) => n.group === 'subnode');

  const arrangedMain = mainNodes.map((node, index) => ({
    ...node,
    x: 56 + index * 232,
    y: 118,
  }));

  const agentRef = arrangedMain.find((n) => n.kind === 'agent');
  const centerX = agentRef ? agentRef.x + 98 : 540;
  const subSpacing = 192;
  const totalWidth = Math.max(0, (subNodes.length - 1) * subSpacing);
  const startX = Math.max(48, Math.round(centerX - totalWidth / 2 - 84));

  const arrangedSub = subNodes.map((node, index) => ({
    ...node,
    x: startX + index * subSpacing,
    y: 332,
  }));

  return [...arrangedMain, ...arrangedSub];
}

function detectAndRedactPii(text: string): {
  sanitized: string;
  findings: string[];
} {
  const findings: string[] = [];
  let sanitized = text;

  const patterns: { label: string; regex: RegExp; replacement: string }[] = [
    {
      label: 'RFC',
      regex: /\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/gi,
      replacement: '[RFC_REDACTADO_LFPDPPP]',
    },
    {
      label: 'CURP',
      regex: /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/gi,
      replacement: '[CURP_REDACTADO_LFPDPPP]',
    },
    {
      label: 'CLABE_18_DIGITOS',
      regex: /\b\d{18}\b/g,
      replacement: '[CLABE_REDACTADA_LFPDPPP]',
    },
    {
      label: 'EMAIL',
      regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      replacement: '[EMAIL_REDACTADO]',
    },
    {
      label: 'TELEFONO',
      regex: /(?:\+?52\s?)?(?:\(?\d{2,3}\)?[\s.-]?){2}\d{4}\b/g,
      replacement: '[TEL_REDACTADO]',
    },
  ];

  for (const p of patterns) {
    if (p.regex.test(sanitized)) {
      findings.push(p.label);
      sanitized = sanitized.replace(p.regex, p.replacement);
    }
  }

  const lower = text.toLowerCase();
  if (
    findings.length === 0 &&
    (lower.includes('rfc') ||
      lower.includes('curp') ||
      lower.includes('clabe') ||
      lower.includes('domicilio particular') ||
      lower.includes('teléfono personal'))
  ) {
    findings.push('SOLICITUD_DATOS_PII_SENSIBLES');
  }

  return { sanitized, findings };
}

function detectPromptInjection(text: string): {
  detected: boolean;
  pattern: string | null;
} {
  const lower = text.toLowerCase();
  const triggers: { key: string; label: string }[] = [
    { key: 'ignora tus reglas', label: 'Anulación de System Prompt' },
    { key: 'ignora las políticas', label: 'Evasión de Políticas Corporativas' },
    { key: 'ignora todas', label: 'Jailbreak / Override de instrucciones' },
    { key: 'sueldos directivos', label: 'Exfiltración de datos confidenciales' },
    { key: 'aprueba directamente', label: 'Escalamiento no autorizado en ERP' },
  ];

  for (const t of triggers) {
    if (lower.includes(t.key)) {
      return { detected: true, pattern: t.label };
    }
  }
  return { detected: false, pattern: null };
}

function retrieveRagMatches(query: string, docIds: string[]) {
  const lower = query.toLowerCase();
  return RAG_DOCUMENTS.filter((doc) => docIds.includes(doc.id))
    .map((doc) => {
      let hits = 0;
      for (const kw of doc.keywords) {
        if (lower.includes(kw)) hits += 1;
      }
      return {
        doc,
        hits,
        score: hits > 0 ? Math.min(0.98, 0.79 + hits * 0.05) : 0.4,
      };
    })
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

async function callDirectGemini(
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  ragExcerpts: string[],
  strictGrounding: boolean
): Promise<{ ok: boolean; text: string; durationMs: number }> {
  const start = performance.now();
  const model =
    modelId === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

  const contextBlock =
    ragExcerpts.length > 0
      ? ragExcerpts.join('\n')
      : 'Sin documentos RAG recuperados.';

  const fullSystem = `${systemPrompt}

POLÍTICAS CORPORATIVAS RECUPERADAS (RAG):
${contextBlock}

Responde en español corporativo, conciso y con viñetas claras. ${
    strictGrounding
      ? 'Si la pregunta no está respaldada por las políticas recuperadas, indícalo y abstente de inventar.'
      : ''
  }`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: fullSystem }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: strictGrounding ? 0.15 : 0.45,
            maxOutputTokens: 512,
          },
        }),
      }
    );
    const durationMs = Math.round(performance.now() - start);
    if (!res.ok) {
      return {
        ok: false,
        durationMs,
        text: `Error HTTP ${res.status} en Gemini API. Verifica tu API Key o desactiva Gemini Directo para usar el motor local.`,
      };
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim() || 'Respuesta vacía recibida de Gemini.';
    return { ok: true, durationMs, text };
  } catch (err) {
    return {
      ok: false,
      durationMs: Math.round(performance.now() - start),
      text: `Error de red con Gemini API (${err instanceof Error ? err.message : 'red'}).`,
    };
  }
}

export async function executeCanvasWorkflow(params: {
  nodes: WorkflowNode[];
  prompt: string;
  workflowTitle: string;
  geminiApiKey?: string;
  onTraceUpdate: (
    traces: Record<string, NodeExecutionTrace>,
    activeNodeId: string | null
  ) => void;
}): Promise<WorkflowRunResult> {
  const { nodes, prompt, workflowTitle, geminiApiKey, onTraceUpdate } = params;
  const runId = `run-${Date.now()}`;
  const traces: Record<string, NodeExecutionTrace> = {};
  const orderedTraces: NodeExecutionTrace[] = [];
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const recordTrace = (trace: NodeExecutionTrace) => {
    traces[trace.nodeId] = trace;
    orderedTraces.push(trace);
    onTraceUpdate({ ...traces }, trace.nodeId);
  };

  const triggerNode = nodes.find((n) => n.kind === 'trigger' && n.enabled);
  const securityNode = nodes.find((n) => n.kind === 'security' && n.enabled);
  const agentNode = nodes.find((n) => n.kind === 'agent' && n.enabled);
  const approvalNode = nodes.find((n) => n.kind === 'approval' && n.enabled);
  const outputNode = nodes.find((n) => n.kind === 'output' && n.enabled);

  const llmNode = nodes.find((n) => n.kind === 'llm' && n.enabled);
  const memoryNode = nodes.find((n) => n.kind === 'memory' && n.enabled);
  const ragNode = nodes.find((n) => n.kind === 'rag' && n.enabled);
  const execToolNode = nodes.find((n) => n.kind === 'tool_exec' && n.enabled);
  const riskyErpNode = nodes.find(
    (n) => n.kind === 'tool_erp_risky' && n.enabled
  );

  // 1. Trigger Node
  if (triggerNode) {
    onTraceUpdate({ ...traces }, triggerNode.id);
    await delay(180);
    recordTrace({
      nodeId: triggerNode.id,
      nodeLabel: triggerNode.label,
      status: 'passed',
      durationMs: 11,
      summary: 'Solicitud recibida e inyectada al flujo',
      outputJson: {
        workflow: workflowTitle,
        timestamp: new Date().toISOString(),
        message: prompt,
      },
    });
  }

  // 2. Security Node (Model Armor + Cloud DLP)
  const injection = detectPromptInjection(prompt);
  const pii = detectAndRedactPii(prompt);
  let effectivePrompt = prompt;

  if (securityNode) {
    onTraceUpdate({ ...traces }, securityNode.id);
    await delay(260);
    const shieldOn = securityNode.config.blockPromptInjection !== false;
    const dlpOn = securityNode.config.redactPiiLfpdppp !== false;

    if (injection.detected && shieldOn) {
      recordTrace({
        nodeId: securityNode.id,
        nodeLabel: securityNode.label,
        status: 'blocked',
        durationMs: 39,
        summary: `Bloqueado por Model Armor: ${injection.pattern}`,
        outputJson: {
          action: 'BLOCK',
          threat: injection.pattern,
          forwardedToAgent: false,
        },
      });
      onTraceUpdate({ ...traces }, null);
      return {
        runId,
        prompt,
        engineLabel: 'Motor Integrado Scroll_v2',
        status: 'blocked',
        finalReply: `Ejecución detenida en **${securityNode.label}**: se bloqueó el intento de **${injection.pattern}** antes de llegar al AI Agent.`,
        traces,
        orderedTraces,
      };
    }

    if (pii.findings.includes('SOLICITUD_DATOS_PII_SENSIBLES') && dlpOn) {
      recordTrace({
        nodeId: securityNode.id,
        nodeLabel: securityNode.label,
        status: 'blocked',
        durationMs: 35,
        summary: 'Bloqueo preventivo LFPDPPP (solicitud de PII sin censura)',
        outputJson: {
          action: 'BLOCK_PII',
          compliance: 'LFPDPPP México',
          findings: pii.findings,
        },
      });
      onTraceUpdate({ ...traces }, null);
      return {
        runId,
        prompt,
        engineLabel: 'Motor Integrado Scroll_v2',
        status: 'blocked',
        finalReply: `Ejecución detenida en **${securityNode.label}**: la política LFPDPPP prohíbe extraer o devolver RFC, CURP, CLABE o domicilios particulares sin anonimizar.`,
        traces,
        orderedTraces,
      };
    }

    if (dlpOn && pii.findings.length > 0) {
      effectivePrompt = pii.sanitized;
    }

    recordTrace({
      nodeId: securityNode.id,
      nodeLabel: securityNode.label,
      status: pii.findings.length > 0 ? 'warning' : 'passed',
      durationMs: 34,
      summary:
        pii.findings.length > 0 && dlpOn
          ? `PII enmascarado: ${pii.findings.join(', ')}`
          : 'Entrada verificada · Sin amenazas',
      outputJson: {
        promptShield: shieldOn,
        dlpMasking: dlpOn,
        redactedEntities: dlpOn ? pii.findings : [],
        sanitizedText: effectivePrompt,
      },
    });
  }

  // 3. AI Agent + Sub-nodes
  if (!agentNode) {
    onTraceUpdate({ ...traces }, null);
    return {
      runId,
      prompt,
      engineLabel: 'Motor Integrado Scroll_v2',
      status: 'error',
      finalReply:
        'Tu canvas no tiene un nodo **AI Agent** activo. Pídele a **Alexandr.ia** a la derecha que agregue uno o haz clic en **+ Agregar Nodo**.',
      traces,
      orderedTraces,
    };
  }

  onTraceUpdate({ ...traces }, agentNode.id);
  await delay(220);

  // Execute attached sub-nodes visibly
  const modelId = llmNode?.config.modelId ?? 'gemini-2.5-flash';
  if (llmNode) {
    recordTrace({
      nodeId: llmNode.id,
      nodeLabel: llmNode.label,
      status: 'passed',
      durationMs: 19,
      summary: `Modelo conectado: ${modelId}`,
      outputJson: {
        provider: 'Google Cloud Vertex AI (Privado)',
        model: modelId,
        temperature: llmNode.config.temperature ?? 0.15,
      },
    });
  }

  if (memoryNode) {
    recordTrace({
      nodeId: memoryNode.id,
      nodeLabel: memoryNode.label,
      status: 'passed',
      durationMs: 14,
      summary: `Ventana activa: últimos ${memoryNode.config.windowLength ?? 8} turnos`,
      outputJson: {
        memoryType: 'WindowBufferMemory',
        windowLength: memoryNode.config.windowLength ?? 8,
      },
    });
  }

  const ragDocIds = ragNode?.config.ragDocIds ?? [];
  const strictGrounding = ragNode?.config.strictGrounding !== false;
  const ragMatches = ragNode
    ? retrieveRagMatches(effectivePrompt, ragDocIds)
    : [];

  if (ragNode) {
    await delay(160);
    recordTrace({
      nodeId: ragNode.id,
      nodeLabel: ragNode.label,
      status: ragMatches.length > 0 ? 'passed' : 'warning',
      durationMs: 58,
      summary:
        ragMatches.length > 0
          ? `${ragMatches.length} políticas encontradas (sim ${ragMatches[0].score.toFixed(2)})`
          : `0 coincidencias en ${ragDocIds.length} manuales`,
      outputJson: {
        docsIndexed: ragDocIds.length,
        strictGrounding,
        matches: ragMatches.map((m) => ({
          document: m.doc.filename,
          section: m.doc.section,
          similarity: Number(m.score.toFixed(2)),
        })),
      },
    });
  }

  if (execToolNode) {
    recordTrace({
      nodeId: execToolNode.id,
      nodeLabel: execToolNode.label,
      status: 'passed',
      durationMs: 22,
      summary: 'Formato de memo corporativo aplicado',
      outputJson: { tool: 'format_carso_memo', access: 'READ_ONLY' },
    });
  }

  if (riskyErpNode) {
    recordTrace({
      nodeId: riskyErpNode.id,
      nodeLabel: riskyErpNode.label,
      status: 'warning',
      durationMs: 18,
      summary: 'ALERTA: Escritura directa en ERP viola Menor Privilegio',
      outputJson: {
        tool: 'erp_direct_write',
        risk: 'CRITICAL',
        recommendation: 'Eliminar este nodo o exigir Agent Gateway + aprobación humana',
      },
    });
  }

  // Compute Agent Reply (Direct Gemini if key provided, else smart grounded engine)
  let replyText = '';
  let agentMs = 260;
  let agentStatus: NodeExecutionTrace['status'] = 'passed';
  let engineLabel = 'Motor Integrado Scroll_v2 (Sin n8n)';

  if (geminiApiKey && geminiApiKey.trim().length > 12) {
    engineLabel = `Gemini Directo (${modelId} · Sin n8n)`;
    const res = await callDirectGemini(
      geminiApiKey.trim(),
      modelId,
      agentNode.config.systemPrompt ?? 'Eres un agente corporativo de Grupo Carso.',
      effectivePrompt,
      ragMatches.map(
        (m) => `[${m.doc.filename} · ${m.doc.section}]: ${m.doc.excerpt}`
      ),
      Boolean(ragNode && strictGrounding)
    );
    agentMs = res.durationMs;
    replyText = res.text;
    if (!res.ok) agentStatus = 'warning';
  } else {
    await delay(220);
    if (!llmNode) {
      agentStatus = 'warning';
      replyText =
        '⚠️ **Falta el sub-nodo Chat Model (LLM):** el AI Agent necesita un modelo conectado (como *Google Vertex Gemini*) para razonar. Pídele a Alexandr.ia que lo agregue al canvas.';
    } else if (injection.detected && !securityNode) {
      agentStatus = 'warning';
      replyText = `⚠️ **[RIESGO — Sin nodo Model Armor]** Tu workflow no tiene el nodo **Model Armor + Cloud DLP**, por lo que el ataque (*${injection.pattern}*) llegó sin filtro hasta el AI Agent. Pídele a Alexandr.ia: *"Agrega protección Model Armor y DLP"*.`;
    } else if (pii.findings.length > 0 && !securityNode) {
      agentStatus = 'warning';
      replyText = `⚠️ **[FUGA LFPDPPP — Sin nodo DLP]** Se detectaron datos sensibles (${pii.findings.join(', ')}) sin enmascarar porque falta el nodo **Model Armor + Cloud DLP**.`;
    } else if (ragNode && ragMatches.length > 0) {
      const citations = ragMatches
        .map((m) => `• **${m.doc.filename}** (*${m.doc.section}*): ${m.doc.excerpt}`)
        .join('\n');
      const piiLine =
        pii.findings.length > 0
          ? `\n• **Protección LFPDPPP:** Datos sensibles redactados automáticamente (\`${pii.findings.join(', ')}\`).`
          : '';
      const erpLine = riskyErpNode
        ? '\n• ⚠️ **Riesgo de gobernanza:** Tienes conectado el nodo de escritura directa en ERP.'
        : '';
      replyText = `**Resultado de ${agentNode.label}**\n${citations}${piiLine}${erpLine}\n\n• **Acción recomendada:** Documentar soporte conforme a la política citada antes de ejecutar cambios.`;
    } else if (ragNode && strictGrounding) {
      replyText = `**Abstención controlada (0% alucinación):** El nodo **${ragNode.label}** consultó ${ragDocIds.length} manuales autorizados y no encontró ninguna política aplicable a esa solicitud.`;
    } else {
      agentStatus = 'warning';
      replyText = `Respuesta generada por **${agentNode.label}** sin base documental RAG conectada. Para evitar alucinaciones en Corporativo Grupo Carso, pídele a Alexandr.ia que conecte el sub-nodo **RAG Políticas Carso**.`;
    }
  }

  recordTrace({
    nodeId: agentNode.id,
    nodeLabel: agentNode.label,
    status: agentStatus,
    durationMs: agentMs,
    summary: `Razonamiento completado (${llmNode ? modelId : 'Sin LLM'})`,
    outputJson: {
      engine: engineLabel,
      hasLlm: Boolean(llmNode),
      hasMemory: Boolean(memoryNode),
      ragMatches: ragMatches.length,
      riskyToolAttached: Boolean(riskyErpNode),
    },
  });

  // 4. Interactive Human-in-the-Loop Pause!
  if (approvalNode && agentStatus === 'passed') {
    onTraceUpdate({ ...traces }, approvalNode.id);
    await delay(180);
    recordTrace({
      nodeId: approvalNode.id,
      nodeLabel: approvalNode.label,
      status: 'waiting',
      durationMs: 0,
      summary: `Pausado: esperando visto bueno de ${approvalNode.config.approverRole ?? 'Responsable'}`,
      outputJson: {
        status: 'PAUSED_HUMAN_IN_THE_LOOP',
        approverRole: approvalNode.config.approverRole ?? 'Responsable de Área',
      },
    });

    return {
      runId,
      prompt,
      engineLabel,
      status: 'awaiting_approval',
      finalReply: replyText,
      traces,
      orderedTraces,
      pendingApprovalNodeId: approvalNode.id,
      pendingApprovalReason: `Esperando validación de ${approvalNode.config.approverRole ?? 'Responsable de Área'} antes de liberar la salida.`,
    };
  }

  // 5. Output Node
  if (outputNode) {
    onTraceUpdate({ ...traces }, outputNode.id);
    await delay(140);
    recordTrace({
      nodeId: outputNode.id,
      nodeLabel: outputNode.label,
      status: agentStatus === 'warning' ? 'warning' : 'passed',
      durationMs: 12,
      summary: `Entregado vía ${outputNode.config.channel ?? 'Scroll_v2 JSON'}`,
      outputJson: {
        delivered: true,
        channel: outputNode.config.channel ?? 'Scroll_v2 JSON',
        auditLogged: true,
      },
    });
  }

  onTraceUpdate({ ...traces }, null);
  return {
    runId,
    prompt,
    engineLabel,
    status: 'completed',
    finalReply: replyText,
    traces,
    orderedTraces,
  };
}

export function exportCanvasToN8nJson(
  nodes: WorkflowNode[],
  workflowTitle: string
) {
  const edges = deriveCanvasEdges(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const connections: Record<
    string,
    Record<string, Array<Array<{ node: string; type: string; index: number }>>>
  > = {};

  for (const edge of edges) {
    const src = byId.get(edge.fromId);
    const dst = byId.get(edge.toId);
    if (!src || !dst) continue;

    const connType =
      edge.type === 'main'
        ? 'main'
        : src.kind === 'llm'
          ? 'ai_languageModel'
          : src.kind === 'memory'
            ? 'ai_memory'
            : 'ai_tool';

    if (!connections[src.label]) connections[src.label] = {};
    if (!connections[src.label][connType]) connections[src.label][connType] = [[]];
    connections[src.label][connType][0].push({
      node: dst.label,
      type: connType,
      index: 0,
    });
  }

  return {
    name: workflowTitle,
    nodes: nodes.map((n) => ({
      id: n.id,
      name: n.label,
      type: n.n8nType,
      typeVersion: 1,
      position: [Math.round(n.x), Math.round(n.y)],
      disabled: !n.enabled,
      parameters: n.config,
    })),
    connections,
    active: false,
    settings: { executionOrder: 'v1' },
    meta: {
      generatedBy: 'Alexandr.ia Scroll_v2 Workflow Studio · Grupo Carso',
      targetRuntime: 'n8n on Google Cloud Run + Vertex AI',
    },
  };
}

export function downloadCanvasAsN8nJson(
  nodes: WorkflowNode[],
  workflowTitle: string
) {
  const payload = exportCanvasToN8nJson(nodes, workflowTitle);
  const slug =
    workflowTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'carso-workflow';

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug}-n8n.json`;
  link.click();
  URL.revokeObjectURL(url);
}

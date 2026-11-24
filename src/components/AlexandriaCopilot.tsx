import { useEffect, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Send,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import {
  COGNITIVE_STYLE_NOTES,
  NODE_PALETTE,
  WORKFLOW_TEMPLATES,
} from '../data/workflowTemplates';
import type {
  CognitiveStyle,
  CopilotMessage,
  CorporateAreaId,
  NodePaletteItem,
  WorkflowNode,
  WorkflowNodeKind,
} from '../types';

const ALEXANDRIA_LOGO_URL =
  'https://www.alexandriamx.com/__l5e/assets-v1/9c989cf6-7b8d-4a16-aa6b-32da54d336cf/alexandria-logo.png';

interface AlexandriaCopilotProps {
  nodes: WorkflowNode[];
  workflowTitle: string;
  cognitiveStyle: CognitiveStyle;
  geminiApiKey: string;
  onChangeCognitiveStyle: (style: CognitiveStyle) => void;
  onChangeGeminiApiKey: (key: string) => void;
  onLoadTemplate: (areaId: CorporateAreaId) => void;
  onAddNodeByKind: (item: NodePaletteItem) => void;
  onRemoveNodesByKind: (kind: WorkflowNodeKind) => void;
  onFixWorkflowSecurity: () => number;
  onClose?: () => void;
}

function nowStamp() {
  return new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AlexandriaLogoBadge() {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/50 bg-[#0b1221] font-heading text-sm font-bold text-[#80e0be] shadow-[0_0_18px_rgba(128,224,190,0.28)]">
        A<span className="text-white">.</span>
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-400/45 bg-[#0b1221] p-1 shadow-[0_0_18px_rgba(128,224,190,0.25)]">
      <img
        src={ALEXANDRIA_LOGO_URL}
        alt="Logo Alexandr.ia"
        className="h-full w-full object-contain"
        onError={() => setImgFailed(true)}
      />
    </div>
  );
}

export function AlexandriaCopilot({
  nodes,
  workflowTitle,
  cognitiveStyle,
  geminiApiKey,
  onChangeCognitiveStyle,
  onChangeGeminiApiKey,
  onLoadTemplate,
  onAddNodeByKind,
  onRemoveNodesByKind,
  onFixWorkflowSecurity,
  onClose,
}: AlexandriaCopilotProps) {
  const [input, setInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [revealKey, setRevealKey] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'alx-welcome',
      sender: 'alexandria',
      timestamp: nowStamp(),
      styleTag: `Scroll_v2 · ${cognitiveStyle}`,
      text: 'Hola, soy **Alexandr.ia**. Estoy aquí para enseñarte qué nodos usar en tu workflow y **ayudarte a construirlo directamente en el lienzo**.\n\nPuedes preguntarme sobre cualquier nodo o pedirme cosas como: *"Construye un workflow para revisar contratos de Legal"*, *"Audita mi flujo"* o *"Agrega protección LFPDPPP"*.',
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, isThinking]);

  const findPalette = (kind: WorkflowNodeKind) =>
    NODE_PALETTE.find((p) => p.kind === kind)!;

  const handleUserCommand = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isThinking) return;

    setInput('');
    const userMsg: CopilotMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: nowStamp(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const lower = text.toLowerCase();

    // 1. Live Canvas Co-Builder Intents (REAL canvas mutations!)
    if (
      (lower.includes('constru') ||
        lower.includes('arma') ||
        lower.includes('crea') ||
        lower.includes('genera')) &&
      (lower.includes('legal') || lower.includes('contrat'))
    ) {
      onLoadTemplate('legal');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Co-Builder · ${cognitiveStyle}`,
          actionBadge: {
            label: '8 nodos construidos en canvas · Legal & Contratos',
            tone: 'mint',
          },
          text: `Listo — armé el workflow **${WORKFLOW_TEMPLATES.legal.title}** directo en tu lienzo:\n\n• **Model Armor + DLP:** redacta RFC/CURP antes del modelo.\n• **AI Agent + Vertex Gemini Pro:** detecta cláusulas de riesgo.\n• **RAG Cláusulas:** acotado a la Guía Legal Carso (0% alucinaciones).\n• **Aprobación Humana:** pausa antes de liberar para firma de Jurídico Senior.\n\nPrueba ahora hacer clic en **▶ Ejecutar** abajo.`,
        },
      ]);
      return;
    }

    if (
      (lower.includes('constru') ||
        lower.includes('arma') ||
        lower.includes('crea') ||
        lower.includes('genera')) &&
      (lower.includes('compra') || lower.includes('rfp') || lower.includes('licitac'))
    ) {
      onLoadTemplate('compras');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Co-Builder · ${cognitiveStyle}`,
          actionBadge: {
            label: '8 nodos construidos en canvas · Compras RFP',
            tone: 'mint',
          },
          text: `Armé el workflow **${WORKFLOW_TEMPLATES.compras.title}** en el canvas.\n\nConecté **RAG Compras** (Manual de Licitaciones), **Tool: Memo RFP** de solo lectura y la pausa de **Comité de Compras** para que ningún agente adjudique órdenes sin aprobación humana.`,
        },
      ]);
      return;
    }

    if (
      (lower.includes('constru') ||
        lower.includes('arma') ||
        lower.includes('crea') ||
        lower.includes('genera')) &&
      (lower.includes('finanz') || lower.includes('presupuest') || lower.includes('fp&a'))
    ) {
      onLoadTemplate('finanzas');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Co-Builder · ${cognitiveStyle}`,
          actionBadge: {
            label: '8 nodos construidos en canvas · Finanzas FP&A',
            tone: 'mint',
          },
          text: `Construí el workflow **${WORKFLOW_TEMPLATES.finanzas.title}** listo para ejecutar con **RAG de Variaciones Presupuestales**, **Model Armor + DLP** y escalación a **Contraloría Corporativa**.`,
        },
      ]);
      return;
    }

    if (
      (lower.includes('constru') ||
        lower.includes('arma') ||
        lower.includes('crea') ||
        lower.includes('genera')) &&
      (lower.includes('rh') ||
        lower.includes('talento') ||
        lower.includes('onboarding') ||
        lower.includes('recursos humanos'))
    ) {
      onLoadTemplate('rh');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Co-Builder · ${cognitiveStyle}`,
          actionBadge: {
            label: '8 nodos construidos en canvas · Talento RH',
            tone: 'mint',
          },
          text: `Listo — construí el workflow **${WORKFLOW_TEMPLATES.rh.title}** con **Memoria de Sesión**, **RAG Manual RH** y compuerta humana para casos laborales sensibles.`,
        },
      ]);
      return;
    }

    // Add individual nodes on command!
    if (
      (lower.includes('agrega') || lower.includes('pon') || lower.includes('añade') || lower.includes('conecta')) &&
      (lower.includes('segur') || lower.includes('model armor') || lower.includes('dlp') || lower.includes('lfpdppp') || lower.includes('privacidad'))
    ) {
      onAddNodeByKind(findPalette('security'));
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Acción en Canvas · ${cognitiveStyle}`,
          actionBadge: { label: '+ Nodo Model Armor + DLP conectado', tone: 'blue' },
          text: 'Agregué y conecté el nodo **Model Armor + Cloud DLP** justo antes de tu AI Agent. Ahora cualquier intento de *Prompt Injection* se bloquea y los campos `RFC`, `CURP` y `CLABE` se redactan automáticamente (LFPDPPP).',
        },
      ]);
      return;
    }

    if (
      (lower.includes('agrega') || lower.includes('pon') || lower.includes('añade') || lower.includes('conecta')) &&
      (lower.includes('aprobac') || lower.includes('human') || lower.includes('hitl'))
    ) {
      onAddNodeByKind(findPalette('approval'));
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Acción en Canvas · ${cognitiveStyle}`,
          actionBadge: { label: '+ Nodo Aprobación Humana conectado', tone: 'amber' },
          text: 'Conecté el nodo **Aprobación Humana (Human-in-the-Loop)** antes de la salida. Cuando ejecutes el workflow, verás que el flujo se pausa en ámbar hasta que una persona haga clic en **Aprobar**.',
        },
      ]);
      return;
    }

    if (
      (lower.includes('agrega') || lower.includes('pon') || lower.includes('añade') || lower.includes('conecta')) &&
      (lower.includes('rag') || lower.includes('política') || lower.includes('manual') || lower.includes('conocimiento'))
    ) {
      onAddNodeByKind(findPalette('rag'));
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Acción en Canvas · ${cognitiveStyle}`,
          actionBadge: { label: '+ Sub-nodo RAG Políticas Carso', tone: 'mint' },
          text: 'Conecté el sub-nodo **RAG Políticas Carso** al puerto *Tool* de tu AI Agent con modo **Cero Alucinaciones** activo. Haz clic sobre ese nodo en el canvas para elegir qué manuales corporativos leerá.',
        },
      ]);
      return;
    }

    if (
      (lower.includes('agrega') || lower.includes('pon') || lower.includes('añade') || lower.includes('conecta')) &&
      (lower.includes('memoria') || lower.includes('memory'))
    ) {
      onAddNodeByKind(findPalette('memory'));
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Acción en Canvas · ${cognitiveStyle}`,
          actionBadge: { label: '+ Sub-nodo Memoria conectado', tone: 'mint' },
          text: 'Conecté **Memoria de Sesión (Window Buffer)** al puerto *Memory* del AI Agent para que recuerde el hilo de conversación sin mezclar sesiones entre áreas.',
        },
      ]);
      return;
    }

    if (
      (lower.includes('agrega') || lower.includes('pon') || lower.includes('añade') || lower.includes('conecta')) &&
      (lower.includes('gemini') || lower.includes('modelo') || lower.includes('llm') || lower.includes('vertex'))
    ) {
      onAddNodeByKind(findPalette('llm'));
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Acción en Canvas · ${cognitiveStyle}`,
          actionBadge: { label: '+ Sub-nodo Vertex Gemini 2.5', tone: 'blue' },
          text: 'Conecté **Google Vertex Gemini 2.5** al puerto *Model* de tu AI Agent. Haz clic sobre el nodo si quieres alternar entre `gemini-2.5-flash` (rápido) y `gemini-2.5-pro` (razonamiento complejo).',
        },
      ]);
      return;
    }

    if (
      lower.includes('repara') ||
      lower.includes('corrige') ||
      lower.includes('arregla') ||
      lower.includes('quita el riesgo')
    ) {
      onRemoveNodesByKind('tool_erp_risky');
      const added = onFixWorkflowSecurity();
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Auto-remediación · Scroll_v2`,
          actionBadge: {
            label:
              added > 0
                ? `${added} nodos de gobierno agregados y riesgos eliminados`
                : 'Workflow validado al 100%',
            tone: 'mint',
          },
          text: 'Listo: eliminé cualquier herramienta de escritura directa en ERP y aseguré que tu canvas tenga **Model Armor + DLP**, **Vertex Gemini**, **RAG Políticas Carso** y **Aprobación Humana** conectados y ordenados.',
        },
      ]);
      return;
    }

    // Live Audit of Current Canvas Nodes!
    if (lower.includes('audita') || lower.includes('revisa mi') || lower.includes('qué le falta')) {
      const missing: string[] = [];
      if (!nodes.some((n) => n.kind === 'security' && n.enabled)) {
        missing.push('• Falta el nodo **Model Armor + Cloud DLP** (riesgo de Prompt Injection y fuga PII/LFPDPPP).');
      }
      if (!nodes.some((n) => n.kind === 'llm' && n.enabled)) {
        missing.push('• Falta conectar el sub-nodo **Google Vertex Gemini** al puerto *Model* del AI Agent.');
      }
      if (!nodes.some((n) => n.kind === 'rag' && n.enabled)) {
        missing.push('• Falta el sub-nodo **RAG Políticas Carso** (sin él el agente puede alucinar).');
      }
      if (!nodes.some((n) => n.kind === 'approval' && n.enabled)) {
        missing.push('• Falta la pausa de **Aprobación Humana (Human-in-the-Loop)** antes de la salida.');
      }
      if (nodes.some((n) => n.kind === 'tool_erp_risky' && n.enabled)) {
        missing.push('• ⚠️ **Riesgo Crítico:** tienes un nodo de **Escritura directa en ERP** que viola Menor Privilegio.');
      }

      const reply =
        missing.length === 0
          ? `✅ **Auditoría de "${workflowTitle}": 100% aprobado.**\n\nTu workflow tiene los 5 pilares de un agente corporativo seguro de Grupo Carso (${nodes.length} nodos conectados). Puedes ejecutarlo ahora o exportarlo a n8n (.json).`
          : `🔎 **Auditoría de "${workflowTitle}" (${missing.length} hallazgos):**\n\n${missing.join('\n')}`;

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'alexandria',
          timestamp: nowStamp(),
          styleTag: `Auditoría en vivo · ${cognitiveStyle}`,
          text: reply,
          suggestedQuickAction:
            missing.length > 0
              ? {
                  label: 'Reparar mi workflow automáticamente',
                  command: 'Repara y asegura mi workflow actual',
                }
              : undefined,
        },
      ]);
      return;
    }

    // Optional Direct Gemini Reply for open-ended questions!
    if (geminiApiKey.trim().length > 12) {
      setIsThinking(true);
      try {
        const canvasSummary = nodes
          .map((n) => `${n.label} (${n.kind}, ${n.enabled ? 'ON' : 'OFF'})`)
          .join(', ');
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey.trim())}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [
                  {
                    text: `Eres Alexandr.ia (Scroll_v2), tutor experto en diseño de workflows de agentes de IA para Corporativo Grupo Carso.
Estilo cognitivo del usuario (Honey & Alonso): ${cognitiveStyle} (${COGNITIVE_STYLE_NOTES[cognitiveStyle]}).
Workflow actual en el canvas ("${workflowTitle}"): ${canvasSummary}.
Responde en español claro, conciso (máximo 130 palabras) y práctico, orientando qué nodos usar y por qué.`,
                  },
                ],
              },
              contents: [{ role: 'user', parts: [{ text }] }],
              generationConfig: { temperature: 0.35, maxOutputTokens: 320 },
            }),
          }
        );
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const aiText =
          data.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? '')
            .join('')
            .trim() || 'No recibí respuesta del modelo.';
        setIsThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now() + 1}`,
            sender: 'alexandria',
            timestamp: nowStamp(),
            styleTag: `Alexandr.ia + Gemini 2.5 · ${cognitiveStyle}`,
            text: aiText,
          },
        ]);
        return;
      } catch {
        setIsThinking(false);
      }
    }

    // Smart Local Pedagogical Answers (Zero API Key required!)
    let answer = '';
    let quickAction: CopilotMessage['suggestedQuickAction'];

    if (lower.includes('qué nodos') || lower.includes('que nodos') || lower.includes('empezar') || lower.includes('cómo constru')) {
      answer = `Para construir un agente corporativo confiable en Grupo Carso necesitas **5 piezas clave**:\n\n1. **Trigger:** recibe la consulta.\n2. **Model Armor + DLP:** frena ataques y redacta RFC/CURP.\n3. **AI Agent** conectado a **Vertex Gemini** (cerebro) + **RAG Políticas** (cero alucinaciones).\n4. **Aprobación Humana:** pausa decisiones críticas.\n5. **Salida Auditada.**`;
      quickAction = {
        label: 'Construir flujo completo de Legal',
        command: 'Construye un workflow para revisar contratos de Legal',
      };
    } else if (lower.includes('google') || lower.includes('cloud') || lower.includes('n8n')) {
      answer = `**Regla simple:**\n• Para **aprender y demos**, ejecutas el workflow visual aquí mismo sin instalar nada.\n• Para **producción en Carso**, exportas el \`.json\` a **n8n en Google Cloud Run + Vertex AI** para tener privacidad contractual, cero entrenamiento con datos de Carso y cumplimiento LFPDPPP.`;
    } else if (lower.includes('agente') && (lower.includes('automat') || lower.includes('diferencia') || lower.includes('cuándo'))) {
      answer = `**Criterio clave de eficiencia:**\n• Usa **automatización fija** cuando las reglas nunca cambian (sumar facturas, validar XML).\n• Usa un nodo **AI Agent** cuando hay texto ambiguo (leer un contrato, comparar cotizaciones distintas, diagnosticar variaciones) y necesitas que decida qué manual consultar.`;
    } else {
      answer = `Desde un enfoque **${cognitiveStyle}** (*${COGNITIVE_STYLE_NOTES[cognitiveStyle]}*): tu canvas actual (**${workflowTitle}**) tiene **${nodes.length} nodos**.\n\nSi quieres, puedo **auditar qué nodos te faltan**, agregar **Model Armor / RAG / Aprobación Humana** directo al lienzo, o armarte una plantilla completa de **Finanzas, Legal, Compras o RH**.`;
      quickAction = {
        label: 'Auditar mi workflow actual',
        command: 'Audita mi workflow actual',
      };
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now() + 1}`,
        sender: 'alexandria',
        timestamp: nowStamp(),
        styleTag: `Scroll_v2 · ${cognitiveStyle}`,
        text: answer,
        suggestedQuickAction: quickAction,
      },
    ]);
  };

  return (
    <aside
      aria-label="Asistente de IA Alexandr.ia"
      className="z-20 flex h-full w-full max-w-[380px] shrink-0 flex-col border-l border-[#242a38] bg-[#11151e]/98 shadow-2xl"
    >
      {/* Alexandr.ia Branded Copilot Header */}
      <div className="border-b border-[#242a38] bg-gradient-to-r from-[#80e0be]/10 via-[#11151e] to-[#11151e] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <AlexandriaLogoBadge />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-sm font-bold tracking-tight text-white">
                  Alexandr<span className="text-[#80e0be]">.ia</span>
                </span>
                <span className="rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2 py-0.5 font-mono-code text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                  Scroll_v2
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Copiloto de Workflows · Pregunta o construye
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-expanded={showKeyConfig}
              aria-label="Configurar API Key opcional de Gemini"
              title="Conectar Gemini 2.5 Flash en vivo (opcional)"
              onClick={() => setShowKeyConfig((v) => !v)}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                geminiApiKey.trim().length > 12
                  ? 'border-blue-400/60 bg-blue-500/20 text-blue-200'
                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            {onClose && (
              <button
                type="button"
                aria-label="Ocultar chat Alexandr.ia"
                onClick={onClose}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Scroll_v2 Cognitive Style Strip */}
        <div className="mt-2.5 flex items-center justify-between gap-1">
          <span className="text-[10px] font-medium text-slate-400">Estilo:</span>
          <div className="flex gap-1">
            {(
              ['Pragmático', 'Teórico', 'Reflexivo', 'Activo'] as CognitiveStyle[]
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => onChangeCognitiveStyle(st)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  cognitiveStyle === st
                    ? 'bg-[#80e0be] text-slate-950 font-bold'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Gemini API Key Drawer (no server required) */}
        {showKeyConfig && (
          <div className="mt-2.5 rounded-xl border border-blue-400/35 bg-blue-950/35 p-2.5">
            <label
              htmlFor="copilot-gemini-key"
              className="block text-[11px] font-semibold text-blue-200"
            >
              Gemini API Key opcional (para respuestas abiertas en vivo)
            </label>
            <div className="mt-1.5 flex gap-1.5">
              <input
                id="copilot-gemini-key"
                name="geminiApiKey"
                type={revealKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => onChangeGeminiApiKey(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="AIzaSy... (opcional)"
                className="font-mono-code w-full rounded-lg border border-blue-400/35 bg-slate-950 px-2.5 py-1.5 text-[11px] text-white focus-visible:outline-2 focus-visible:outline-blue-400"
              />
              <button
                type="button"
                aria-pressed={revealKey}
                aria-label={
                  revealKey ? 'Ocultar Gemini API Key' : 'Mostrar Gemini API Key'
                }
                onClick={() => setRevealKey((v) => !v)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-400/35 bg-slate-950 text-blue-200 hover:text-white"
              >
                {revealKey ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-blue-200/75">
              Sin clave funciona 100% con el motor local integrado; con clave activa Gemini 2.5 Flash tanto aquí como al ejecutar el workflow.
            </p>
          </div>
        )}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
        {messages.map((msg) => {
          const isAlx = msg.sender === 'alexandria';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAlx ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[94%] rounded-2xl border p-3 text-xs leading-relaxed ${
                  isAlx
                    ? 'border-[#252c3c] bg-[#171c28] text-slate-200'
                    : 'border-emerald-400/35 bg-emerald-400/12 text-emerald-50'
                }`}
              >
                {isAlx && msg.styleTag && (
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
                    <span className="font-semibold text-[#80e0be]">
                      {msg.styleTag}
                    </span>
                    <span className="text-slate-500">{msg.timestamp}</span>
                  </div>
                )}

                {msg.actionBadge && (
                  <div
                    className={`mb-2 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10.5px] font-semibold ${
                      msg.actionBadge.tone === 'mint'
                        ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
                        : msg.actionBadge.tone === 'amber'
                          ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
                          : 'border-blue-400/40 bg-blue-500/15 text-blue-200'
                    }`}
                  >
                    <Wand2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {msg.actionBadge.label}
                  </div>
                )}

                <div className="whitespace-pre-line">
                  {msg.text.split('**').map((part, i) =>
                    i % 2 === 1 ? (
                      <strong key={i} className="font-semibold text-white">
                        {part}
                      </strong>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>

                {msg.suggestedQuickAction && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleUserCommand(msg.suggestedQuickAction!.command)
                    }
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#80e0be] px-2.5 py-1.5 text-[11px] font-bold text-slate-950 transition-colors hover:bg-emerald-300"
                  >
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {msg.suggestedQuickAction.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Alexandr.ia está razonando...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompt Chips + Input */}
      <div className="border-t border-[#242a38] bg-[#0e1118] p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {[
            {
              label: '✨ Construir flujo Legal',
              cmd: 'Construye un workflow para revisar contratos de Legal',
            },
            {
              label: '🔎 Auditar mi workflow',
              cmd: 'Audita mi workflow actual',
            },
            {
              label: '🛡 + Model Armor / DLP',
              cmd: 'Agrega protección Model Armor y DLP al workflow',
            },
            {
              label: '❓ ¿Qué nodos usar?',
              cmd: '¿Qué nodos necesito para crear un agente seguro?',
            },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => void handleUserCommand(chip.cmd)}
              className="rounded-lg border border-slate-800 bg-[#171c28] px-2 py-1 text-[10.5px] font-medium text-slate-300 transition-colors hover:border-[#80e0be]/50 hover:text-white"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <form
          aria-label="Chatear con Alexandr.ia"
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleUserCommand(input);
          }}
        >
          <label htmlFor="alexandria-chat-input" className="sr-only">
            Pregunta a Alexandr.ia o pídele construir nodos
          </label>
          <input
            id="alexandria-chat-input"
            name="copilotMessage"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.nativeEvent.isComposing) {
                e.preventDefault();
              }
            }}
            placeholder="Pregunta o pide: 'Construye un flujo de Compras'..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-[#80e0be]"
          />
          <button
            type="submit"
            disabled={isThinking}
            aria-label="Enviar mensaje a Alexandr.ia"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#80e0be] text-slate-950 transition-colors hover:bg-emerald-300 disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </aside>
  );
}

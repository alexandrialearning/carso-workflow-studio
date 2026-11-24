# Grupo Carso · Workflow Studio (`Alexandr.ia Scroll_v2`)

Prototipo interactivo de **construcción y ejecución visual de workflows de agentes de IA** (estilo n8n) con **Alexandr.ia AI Copilot** integrado, diseñado para Corporativo Grupo Carso.

## Características principales

- **Lienzo visual estilo n8n a pantalla completa:** nodos arrastrables, cables SVG Bezier animados, puertos para sub-nodos de `AI Agent` (`Chat Model`, `Memory`, `RAG`, `Tools`) y catálogo `+ Agregar Nodo`.
- **Copiloto IA Alexandr.ia (`Scroll_v2`):** responde dudas sobre qué nodos usar según estilo cognitivo (Honey & Alonso) y construye, audita o corrige workflows directamente en el lienzo.
- **Motor de ejecución integrado (sin servidor n8n requerido para demo):**
  - Detección y redacción en vivo de datos sensibles mexicanos (`RFC`, `CURP`, `CLABE`, correos y teléfonos — cumplimiento LFPDPPP).
  - Intercepción de *Prompt Injection* (Model Armor).
  - Búsqueda RAG sobre políticas corporativas sintéticas.
  - Pausa interactiva de **Aprobación Humana (Human-in-the-Loop)**.
  - Conexión opcional directa a **Gemini 2.5 Flash** desde el navegador.
- **Exportación `.json` compatible con n8n:** puente directo para despliegue productivo en **n8n sobre Google Cloud Run + Vertex AI**.

## Ejecución local

```bash
npm install
npm run dev
```

Compilación de producción:

```bash
npm run build
```

Para pruebas opcionales con un servidor local de n8n o despliegue en Google Cloud Run, consulta [`N8N_GCP_SETUP.md`](./N8N_GCP_SETUP.md).

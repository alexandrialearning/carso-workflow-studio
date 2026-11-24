# Integración real: Alexandr.ia Scroll_v2 + n8n + Google Cloud

Este prototipo incluye integración real con **n8n** en dos niveles:
1. **Exportación e importación nativa de workflows (`.json`):** cualquier agente diseñado en el *Agent Studio* se descarga como un archivo JSON compatible con n8n (`Webhook` → `Google Cloud Model Armor/DLP` → `AI Agent` + `Google Vertex Chat Model` + `Memory` + `RAG` + `Human Approval` → `Respond to Webhook`).
2. **Ejecución en vivo contra un Webhook real de n8n** y envío directo vía **n8n REST API (`POST /api/v1/workflows`)**.

---

## Opción 1: Probar con n8n local en 2 minutos (para demos)

```bash
docker compose -f docker-compose.n8n.yml up -d
```

1. Abre `http://localhost:5678` y crea tu cuenta local de n8n.
2. En el **Agent Studio** de Scroll_v2 (`http://127.0.0.1:5173`), entra a la pestaña **Exportar / Enviar a n8n** y haz clic en **Descargar workflow (.json)**.
3. En n8n, haz clic en **⋯ → Import from File** y selecciona el archivo descargado.
4. Configura tu credencial de **Google Vertex AI** (o cambia temporalmente el nodo Chat Model a Gemini API para pruebas locales) y activa el workflow (o haz clic en *Test Workflow*).
5. Copia la **Webhook URL** del primer nodo en n8n, pégala en el panel **Conexión n8n Real** del Agent Studio y activa **Modo n8n Real**.

---

## Opción 2: Despliegue Corporativo para Piloto Grupo Carso (Google Cloud Run)

La arquitectura más sencilla y auditable para Corporativo Grupo Carso consiste en correr **n8n *self-hosted*** dentro del proyecto privado de Google Cloud del Grupo:

```bash
gcloud run deploy carso-n8n-studio \
  --image=docker.n8n.io/n8nio/n8n:latest \
  --region=us-central1 \
  --port=5678 \
  --memory=2Gi \
  --set-env-vars="GENERIC_TIMEZONE=America/Mexico_City,N8N_EDITOR_BASE_URL=https://<tu-url-cloud-run>,WEBHOOK_URL=https://<tu-url-cloud-run>/"
```

**Servicios Google Cloud conectados (bóveda privada Carso):**
* **Cloud Run:** aloja n8n de forma privada y *serverless*.
* **Vertex AI (Gemini 2.5 Flash / Pro):** motor LLM empresarial con garantía contractual de cero entrenamiento sobre datos de Carso.
* **Model Armor + Sensitive Data Protection (Cloud DLP):** filtrado de *Prompt Injection* y enmascaramiento PII (LFPDPPP).
* **Cloud SQL (PostgreSQL) + Secret Manager:** memoria persistente, flujos versionados y llaves seguras bajo IAM.

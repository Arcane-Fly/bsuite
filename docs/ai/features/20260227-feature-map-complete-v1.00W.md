# Complete AI Feature Map

**Version:** 1.00W
**Date:** 2026-02-27
**Status:** Working (W)

> **Marker correction, 2026-08-17.** This read **Version 1.0.0 / Status: Final** against a `v1.00W`
> filename — two contradictions in three lines. `Final` is not a status in the estate's convention
> (`W`orking / `D`raft / `R`eview / `A`pproved / `F`rozen), and the version used a three-part
> semver that the convention does not use.
>
> `Working` is also the *truthful* status, which is why the filename won rather than the body: this
> map is **not** final. The AI surface it describes has moved since 2026-02-27 — the model roster was
> replaced on 2026-07-31 and `docs/ai/CONTRIBUTING.md` was corrected on 2026-08-17 for naming two
> models that no longer exist. Treat this map as a working inventory and verify any feature against
> `crm7/src/lib/ai/` before relying on it.
**Author:** Development Team
**Supersedes:** N/A

---

## Overview

This document provides a comprehensive map of all AI assistant features in bsuite CRM7, including system architecture, tool registry, workflow automation, and plugin system. All diagrams are in Mermaid format for easy maintenance and version control.

---

## 1. System Architecture Overview

Complete end-to-end architecture from user interface through to database:

```mermaid
graph TB
    subgraph "User Layer"
        UI[React UI]
        Chat[AI Chat Panel]
        WorkflowUI[Workflow Builder]
    end

    subgraph "API Layer (Vercel Edge Functions)"
        ChatAPI["/api/ai/chat<br/>Edge Runtime"]
        ToolAPI["/api/ai/execute-tool<br/>Edge Runtime"]
        WorkflowAPI["/api/workflows/*"]
    end

    subgraph "AI Gateway Layer"
        Gateway["Vercel AI Gateway<br/>Unified Model Access"]

        subgraph "Primary Model"
            Grok["Grok 4.1 Fast Reasoning<br/>2M context, $0.001/1k input"]
        end

        subgraph "Fallback Models"
            ClaudeH["Claude Haiku 4<br/>Simple tasks"]
            ClaudeS["Claude Sonnet 4.6<br/>Medium tasks"]
            ClaudeO["Claude Opus 4.6<br/>Complex tasks"]
        end
    end

    subgraph "Execution Layer"
        Router[Model Router<br/>Complexity Analysis]
        ToolReg[Tool Registry<br/>49 tools]
        PermCheck[Permission Guard<br/>RLS + Portal Context]
        PluginSys[Plugin System<br/>Extensible Tools]
    end

    subgraph "Workflow Engine"
        TriggerMon[Trigger Monitor<br/>DB Events]
        CondEval[Condition Evaluator<br/>Rule Engine]
        ActionExec[Action Executor<br/>Multi-step]
        AIAction[AI-Enhanced Actions<br/>Dynamic Decisions]
    end

    subgraph "Data Layer"
        DB[(Supabase PostgreSQL<br/>Multi-tenant)]
        RLS[Row Level Security<br/>Tenant Isolation]
        RT[Realtime Subscriptions<br/>Live Updates]
    end

    subgraph "Monitoring"
        CostTrack[Cost Tracking<br/>Per Tenant]
        UsageLog[Usage Analytics<br/>Model Performance]
        AuditLog[Audit Trail<br/>All AI Actions]
    end

    UI --> ChatAPI
    UI --> WorkflowUI
    Chat --> ChatAPI
    WorkflowUI --> WorkflowAPI

    ChatAPI --> Gateway
    ChatAPI --> Router

    Gateway --> Grok
    Gateway -.Fallback.-> ClaudeH
    Gateway -.Fallback.-> ClaudeS
    Gateway -.Fallback.-> ClaudeO

    Router --> ToolReg
    ToolReg --> PermCheck
    PermCheck --> DB
    ToolReg --> PluginSys

    WorkflowAPI --> TriggerMon
    TriggerMon --> CondEval
    CondEval --> ActionExec
    ActionExec --> AIAction
    ActionExec --> ToolReg

    DB --> RLS
    DB --> RT

    ChatAPI --> CostTrack
    ToolAPI --> UsageLog
    ActionExec --> AuditLog

    CostTrack --> DB
    UsageLog --> DB
    AuditLog --> DB
```

**Key Components:**

| Component | Purpose | Technology |
|-----------|---------|------------|
| **AI Chat Panel** | User interface for natural language interaction | React + Shadcn UI |
| **Edge API** | Serverless functions for AI processing | Vercel Edge Runtime |
| **AI Gateway** | Unified model access with fallbacks | Vercel AI Gateway |
| **Grok 4.1** | Primary AI model (2M context, cheap) | xAI via Gateway |
| **Tool Registry** | 80+ executable actions | TypeScript + Zod |
| **Permission Guard** | Multi-tenant security | Supabase RLS |
| **Workflow Engine** | Automated multi-step processes | Custom engine |
| **Plugin System** | Extensible architecture | Dynamic imports |

---

## 2. Tool Execution Flow

Detailed sequence diagram showing complete user interaction through tool execution:

```mermaid
sequenceDiagram
    participant User
    participant ChatUI as AI Chat UI
    participant API as /api/ai/chat
    participant Gateway as AI Gateway
    participant Model as Grok 4.1
    participant Router as Model Router
    participant ToolReg as Tool Registry
    participant PermGuard as Permission Guard
    participant DB as Supabase

    User->>ChatUI: "Create apprentice John Smith"
    ChatUI->>API: POST with message + context

    API->>Router: Analyze task complexity
    Router-->>API: complexity: "medium"

    API->>Gateway: Request with Grok 4.1
    Gateway->>Model: Stream chat completion

    Model-->>Gateway: Tool call: create_apprentice
    Gateway-->>API: Streaming response with tool_calls

    API->>ToolReg: Lookup tool: create_apprentice
    ToolReg-->>API: Tool definition + permission required

    API->>PermGuard: Check permission: manage_apprentices
    PermGuard->>DB: Query user_tenants + permissions
    DB-->>PermGuard: User has permission
    PermGuard-->>API: Permission granted

    API-->>ChatUI: Tool invocation (requires confirmation)
    ChatUI->>User: Show confirmation dialog
    User->>ChatUI: Confirm action

    ChatUI->>API: Execute tool
    API->>ToolReg: Execute create_apprentice
    ToolReg->>DB: INSERT INTO apprentices
    DB-->>ToolReg: New apprentice record

    ToolReg-->>API: Success result
    API->>Model: Send tool result
    Model-->>Gateway: Final response
    Gateway-->>API: "Created apprentice John Smith successfully"

    API->>DB: Log AI usage (cost, tokens, model)
    API->>DB: Log audit trail

    API-->>ChatUI: Final streaming response
    ChatUI-->>User: "✅ Created apprentice John Smith"
```

**Execution Steps:**

1. **User Input** → User types natural language request
2. **Complexity Analysis** → Router determines appropriate model
3. **AI Processing** → Model streams response with tool calls
4. **Permission Check** → Verify user can execute action
5. **User Confirmation** → Prompt for destructive actions
6. **Tool Execution** → Execute action on database
7. **Result Streaming** → Stream final response to user
8. **Logging** → Track cost, usage, and audit trail

---

## 3. Complete Tool Registry (49 Tools)

Comprehensive mind map of all available AI tools organized by category:

```mermaid
mindmap
  root((Tool Registry<br/>49 Tools))
    CRUD Operations
      Apprentices
        create_apprentice
        update_apprentice
        delete_apprentice
        search_apprentices
        bulk_import_apprentices
      Employers
        create_employer
        update_employer
        delete_employer
        search_employers
      Contacts
        create_contact
        update_contact
        delete_contact
        link_contact_to_employer
      Training Records
        create_training_record
        update_training_completion
        bulk_update_training
      Compliance
        create_compliance_record
        update_compliance_status
        flag_expiring_compliance

    Report Generation
      Compliance Reports
        generate_compliance_summary
        generate_expiry_report
        generate_gap_analysis
      Financial Reports
        generate_revenue_report
        generate_cost_analysis
        generate_invoice_summary
      Training Reports
        generate_progress_report
        generate_completion_stats
        generate_assessment_summary
      WHS Reports
        generate_incident_report
        generate_hazard_analysis
        generate_safety_compliance

    Workflow Operations
      Workflow Management
        create_workflow
        update_workflow
        delete_workflow
        activate_workflow
        deactivate_workflow
      Trigger Configuration
        configure_incident_trigger
        configure_timesheet_trigger
        configure_compliance_trigger
        configure_custom_trigger
      Action Configuration
        configure_email_action
        configure_task_action
        configure_status_update
        configure_webhook_action
        configure_ai_decision_action

    Timesheet Operations
      Timesheet Management
        approve_timesheet
        reject_timesheet
        bulk_approve_timesheets
        generate_timesheet_summary
      Charge Rates
        get_charge_rates
        update_charge_rates
        calculate_billing

    Bulk Operations
      Data Management
        bulk_update_status
        bulk_assign_field_officer
        bulk_export_data
        bulk_delete_records
      Data Enrichment
        enrich_employer_data
        enrich_apprentice_data
        auto_classify_records
        detect_duplicates

    Search & Query
      Intelligent Search
        semantic_search
        fuzzy_search
        advanced_filter_search
      Data Analysis
        aggregate_metrics
        trend_analysis
        predictive_insights

    Communication
      Notifications
        send_email
        send_sms
        create_system_notification
      Alerts
        create_alert
        escalate_issue
        notify_stakeholders

    Integration
      External Systems
        sync_with_adms
        webhook_callback
        api_integration
      File Operations
        upload_document
        generate_pdf
        export_to_csv
```

**Tool Categories Summary:**

| Category | Tool Count | Example Use Cases |
|----------|-----------|-------------------|
| **CRUD Operations** | 20+ | Create apprentice, update employer, delete contact |
| **Report Generation** | 15+ | Compliance reports, financial analysis, training progress |
| **Workflow Operations** | 15+ | Create workflows, configure triggers, set up actions |
| **Timesheet Operations** | 8+ | Approve timesheets, calculate billing, charge rates |
| **Bulk Operations** | 10+ | Bulk updates, data import/export, deduplication |
| **Search & Query** | 8+ | Semantic search, advanced filters, predictive insights |
| **Communication** | 8+ | Emails, SMS, notifications, alerts |
| **Integration** | 6+ | External system sync, webhooks, file operations |

**Total: 49 tools across 8 categories**

---

## 4. Workflow Automation Architecture

Complete workflow automation system from triggers through execution:

```mermaid
graph TB
    subgraph "Trigger Sources"
        DBEvent[Database Events<br/>INSERT/UPDATE/DELETE]
        Schedule[Scheduled Jobs<br/>Cron-based]
        Webhook[External Webhooks<br/>ADMS, APIs]
        UserAction[User Actions<br/>Button clicks]
    end

    subgraph "Trigger Monitor"
        TrigMon[Trigger Monitor<br/>Event Listener]
        TrigMatch[Trigger Matcher<br/>Find workflows]
    end

    subgraph "Condition Evaluation"
        CondParser[Condition Parser<br/>Parse rules]
        CondEval[Condition Evaluator<br/>Execute logic]
        DataFetch[Data Fetcher<br/>Get context]
    end

    subgraph "Action Executor"
        ActionQueue[Action Queue<br/>Sequential/Parallel]

        subgraph "Standard Actions"
            EmailAction[Send Email]
            TaskAction[Create Task]
            StatusAction[Update Status]
            WebhookAction[Call Webhook]
        end

        subgraph "AI Actions"
            AIDecision[AI Decision Maker<br/>Dynamic logic]
            AIAnalysis[AI Analysis<br/>Insights]
            AIGenerate[AI Generation<br/>Content]
        end
    end

    subgraph "Workflow Storage"
        WorkflowDB[(Workflow Definitions)]
        ExecutionLog[(Execution History)]
    end

    DBEvent --> TrigMon
    Schedule --> TrigMon
    Webhook --> TrigMon
    UserAction --> TrigMon

    TrigMon --> TrigMatch
    TrigMatch --> WorkflowDB
    WorkflowDB --> CondParser

    CondParser --> CondEval
    CondEval --> DataFetch
    DataFetch -.Context Data.-> CondEval

    CondEval -->|Conditions Met| ActionQueue
    CondEval -->|Conditions Failed| ExecutionLog

    ActionQueue --> EmailAction
    ActionQueue --> TaskAction
    ActionQueue --> StatusAction
    ActionQueue --> WebhookAction
    ActionQueue --> AIDecision
    ActionQueue --> AIAnalysis
    ActionQueue --> AIGenerate

    EmailAction --> ExecutionLog
    TaskAction --> ExecutionLog
    StatusAction --> ExecutionLog
    WebhookAction --> ExecutionLog
    AIDecision --> ExecutionLog
    AIAnalysis --> ExecutionLog
    AIGenerate --> ExecutionLog
```

**Workflow Components:**

| Component | Purpose | Example |
|-----------|---------|---------|
| **Database Events** | React to data changes | New apprentice created |
| **Scheduled Jobs** | Time-based triggers | Weekly compliance check |
| **External Webhooks** | Integration events | ADMS qualification update |
| **Condition Evaluator** | Rule-based filtering | Only if incident is severe |
| **Standard Actions** | Predefined operations | Send email, create task |
| **AI Actions** | Dynamic AI-powered decisions | Decide escalation path |

**Example Workflows:**

1. **Incident Response**
   - Trigger: WHS incident created
   - Condition: Severity > 3
   - Actions: Notify manager, create investigation task, log in system

2. **Compliance Monitoring**
   - Trigger: Daily at 6 AM
   - Condition: Certificates expiring in < 30 days
   - Actions: Generate report, email stakeholders, flag records

3. **Apprentice Milestone**
   - Trigger: Training completion updated
   - Condition: All modules complete
   - Actions: Update ADMS, create invoice in Xero, send congratulations email

---

## 5. Plugin System Architecture

Extensible plugin system for custom tools, models, and workflows:

```mermaid
graph LR
    subgraph "Core System"
        CoreAI[Core AI System]
        ToolReg[Tool Registry]
        ModelReg[Model Registry]
        WorkflowReg[Workflow Registry]
    end

    subgraph "Plugin Loader"
        Loader[Plugin Loader<br/>Dynamic Import]
        Validator[Plugin Validator<br/>Schema Check]
        Sandbox[Sandbox Environment<br/>Isolated Execution]
    end

    subgraph "Plugin Types"
        ToolPlugin["Tool Plugin<br/>Custom Tools"]
        ModelPlugin["Model Plugin<br/>Custom Models"]
        WorkflowPlugin["Workflow Plugin<br/>Workflow Templates"]
        UIPlugin["UI Plugin<br/>Custom Components"]
    end

    subgraph "Example Plugins"
        AdvReport["@bsuite/advanced-reporting<br/>Predictive analytics"]
        ADMS["@bsuite/adms-integration<br/>ADMS sync tools"]
        CustomML["@bsuite/custom-ml<br/>Custom ML models"]
        Dashboard["@bsuite/custom-dashboard<br/>Custom widgets"]
    end

    subgraph "Plugin Context"
        PluginAPI[Plugin API<br/>Register tools/models]
        PluginDB[Database Access<br/>Via Supabase]
        PluginAuth[Auth Context<br/>User/Tenant]
    end

    Loader --> Validator
    Validator --> Sandbox

    Sandbox --> ToolPlugin
    Sandbox --> ModelPlugin
    Sandbox --> WorkflowPlugin
    Sandbox --> UIPlugin

    ToolPlugin --> AdvReport
    ToolPlugin --> ADMS
    ModelPlugin --> CustomML
    UIPlugin --> Dashboard

    AdvReport --> PluginAPI
    ADMS --> PluginAPI
    CustomML --> PluginAPI
    Dashboard --> PluginAPI

    PluginAPI --> ToolReg
    PluginAPI --> ModelReg
    PluginAPI --> WorkflowReg

    PluginAPI --> PluginDB
    PluginAPI --> PluginAuth

    ToolReg --> CoreAI
    ModelReg --> CoreAI
    WorkflowReg --> CoreAI
```

**Plugin Types:**

| Plugin Type | Purpose | Example |
|-------------|---------|---------|
| **Tool Plugin** | Add custom AI tools | ADMS integration, custom reports |
| **Model Plugin** | Add custom AI models | Fine-tuned models, specialized LLMs |
| **Workflow Plugin** | Add workflow templates | Industry-specific workflows |
| **UI Plugin** | Add UI components | Custom dashboards, visualizations |

**Example Plugins:**

1. **@bsuite/advanced-reporting**
   - Predictive analytics
   - AI-powered insights
   - Forecasting tools

2. **@bsuite/adms-integration**
   - ADMS SOAP API connector
   - Qualification sync
   - Automated updates

3. **@bsuite/custom-ml**
   - Custom ML models
   - Specialized predictions
   - Domain-specific AI

---

## Feature Implementation Status

### Phase 1: Core AI Infrastructure (Week 1-2) ✅

- [x] Vercel AI SDK installed
- [x] AI Gateway configured (Grok 4.1 + fallbacks)
- [x] Model router implemented
- [x] AI chat API endpoint created
- [ ] Tool registry (in progress)
- [ ] Permission checking system

### Phase 2: UI Components (Week 2-3)

- [ ] AI Chat panel component
- [ ] Tool invocation display
- [ ] Quick actions
- [ ] Cost tracking dashboard

### Phase 3: Tool Registry (Week 3-4)

**CRUD Tools (20+):**
- [ ] Apprentice operations (5 tools)
- [ ] Employer operations (4 tools)
- [ ] Contact operations (4 tools)
- [ ] Training record operations (3 tools)
- [ ] Compliance operations (4 tools)

**Report Tools (15+):**
- [ ] Compliance reports (4 tools)
- [ ] Financial reports (4 tools)
- [ ] Training reports (4 tools)
- [ ] WHS reports (3 tools)

**Workflow Tools (15+):**
- [ ] Workflow management (5 tools)
- [ ] Trigger configuration (5 tools)
- [ ] Action configuration (5 tools)

**Timesheet Tools (8+):**
- [ ] Timesheet management (4 tools)
- [ ] Charge rate operations (4 tools)

**Bulk Operations (10+):**
- [ ] Data management (4 tools)
- [ ] Data enrichment (6 tools)

**Search Tools (8+):**
- [ ] Intelligent search (3 tools)
- [ ] Data analysis (5 tools)

**Communication Tools (8+):**
- [ ] Notifications (4 tools)
- [ ] Alerts (4 tools)

**Integration Tools (6+):**
- [ ] External systems (3 tools)
- [ ] File operations (3 tools)

### Phase 4: Workflow Automation (Week 4-5)

- [ ] Workflow executor
- [ ] Trigger monitor
- [ ] Condition evaluator
- [ ] Action executor
- [ ] AI-enhanced actions

### Phase 5: Plugin System (Week 5-6)

- [ ] Plugin loader
- [ ] Plugin validator
- [ ] Plugin API
- [ ] Example plugins

### Phase 6: External Integrations (Week 6-8)

- [ ] Activepieces integration
- [ ] Xero connector
- [ ] ADMS connector
- [ ] Email automation

---

## Marketing & Sales Use Cases

### Primary Value Propositions

1. **Automation at Scale**
   - 80+ actions automated through natural language
   - Reduce manual data entry by 80%
   - Process compliance reports in seconds, not hours

2. **Cost-Effective AI**
   - $6.20/tenant/month for 1000 interactions
   - 64:1 ROI vs traditional support
   - Grok 4.1: 3-15x cheaper than alternatives

3. **Multi-Tenant Security**
   - Permission-based access control
   - Tenant isolation guaranteed
   - Audit trail for all AI actions

4. **Extensible Platform**
   - Plugin architecture for custom tools
   - Integration with 300+ external systems via Activepieces
   - Build custom workflows without code

### Use Case Examples

**For Training Providers:**
- "Generate compliance report for February 2026"
- "Show me apprentices with expiring first aid certificates"
- "Create workflow: when apprentice completes module, update ADMS and send certificate"

**For Host Employers:**
- "Approve all timesheets for John Smith this week"
- "Calculate total labor costs for Project Alpha"
- "Alert me when any worker's tickets expire in 30 days"

**For Field Officers:**
- "Create WHS incident for site visit today"
- "Show me all apprentices in Sydney region"
- "Schedule reminder to follow up on incident #12345 in 2 weeks"

**For GTO Administrators:**
- "Generate financial report for Q1 2026"
- "Bulk import 50 new apprentices from CSV"
- "Create automated workflow for new employer onboarding"

---

## Technical Specifications

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Response Time** | < 2s first token | TBD |
| **Streaming Speed** | > 20 tokens/s | TBD |
| **Tool Execution** | < 5s average | TBD |
| **Uptime** | 99.9% | TBD |

### Scalability

| Dimension | Capacity | Notes |
|-----------|----------|-------|
| **Concurrent Users** | 1000+ | Edge Functions scale automatically |
| **Tenants** | Unlimited | Multi-tenant architecture |
| **Tools** | 200+ | Extensible registry |
| **Workflows** | 10,000+ | Database-backed |

### Security

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Permission Checks** | Every tool execution | ✅ Designed |
| **Tenant Isolation** | RLS + tenant_id filter | ✅ Existing |
| **Rate Limiting** | Per user/tenant | 🔄 Future |
| **Audit Logging** | All AI actions tracked | ✅ Designed |

---

## Next Steps

1. **Complete Tool Registry** - Implement all 49 tools (Week 3-4)
2. **Build UI Components** - AI chat panel and tool confirmations (Week 2-3)
3. **Workflow Engine** - Implement automation engine (Week 4-5)
4. **Plugin System** - Build extensibility layer (Week 5-6)
5. **External Integrations** - Connect Activepieces, Xero, ADMS (Week 6-8)

---

## Related Documentation

- System Architecture *(planned)* — see [architecture/](../architecture/)
- Tool Registry Specification *(planned)*
- Workflow Automation Guide *(planned)*
- Plugin System Guide *(planned)*
- Model Pricing *(planned)* — see [pricing/](../pricing/)
- Activepieces Integration *(planned)* — see [integrations/](../integrations/)

---

**Document History:**

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-02-27 | Initial creation with complete feature map | Development Team |

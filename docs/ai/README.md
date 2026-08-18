# bsuite CRM7 AI Assistant Documentation

**Version:** 1.0.0
**Date:** 2026-02-27
**Status:** In Development
**Author:** Development Team

---

## Overview

The bsuite CRM7 AI Assistant is an intelligent automation system that enables users to perform any action in the system through natural language. Built on Vercel AI SDK with AI Gateway for unified model access.

### Key Capabilities

- **CRUD Operations**: Create, update, delete any entity through conversation
- **Report Generation**: Generate compliance, financial, training, and WHS reports on demand
- **Workflow Automation**: Create and execute multi-step workflows with AI-enhanced logic
- **Bulk Operations**: Process multiple records efficiently
- **Permission-Aware**: Respects user roles and tenant isolation
- **Plugin System**: Extensible architecture for custom tools and integrations

### Architecture

```
User → AI Chat UI → Edge API → AI Gateway → Grok 4.1 (Primary)
                                         ├─→ Claude Sonnet 4.6 (Fallback)
                                         └─→ Claude Opus 4.6 (Complex)
        ↓
    Tool Registry (49 tools) → Permission Guard → Supabase
```

### Primary Model: Grok 4.1 Fast Reasoning

- **Context Window**: 2M tokens (2x larger than Claude)
- **Cost**: $0.001/1k input tokens (3-15x cheaper)
- **Provider**: xAI via Vercel AI Gateway
- **Fallbacks**: Claude Haiku 4, Sonnet 4.6, Opus 4.6

### Cost Efficiency

- **Per tenant**: $6.20/month (1000 interactions)
- **100 tenants**: $620/month
- **ROI**: 64:1 ($39,380 savings vs $620 cost)

---

## Quick Start

### For Users

1. Click the AI Assistant button (floating bot icon)
2. Type your request in natural language
3. Confirm any actions that modify data
4. View results and continue conversation

**Example queries:**

- "Create a new apprentice named John Smith"
- "Generate compliance report for February 2026"
- "Show me all pending timesheets"
- "Approve timesheet #12345"

### For Developers

See the Development Guide *(planned)* for:

- Local setup instructions
- Creating custom tools
- Building plugins
- Testing AI features

---

## Documentation Structure

```
docs/ai/
├── README.md              # This file
├── CONTRIBUTING.md        # Development standards and guidelines
├── architecture/          # System architecture and design (planned)
│   └── README.md
├── pricing/               # Cost analysis and ROI (planned)
│   └── README.md
├── features/              # Feature specifications
│   ├── README.md
│   └── 20260227-feature-map-complete-v1.0.0.md
├── development/           # Developer guides (planned)
│   └── README.md
├── integrations/          # External integrations (planned)
│   └── README.md
├── diagrams/              # Mermaid diagrams (planned)
│   └── README.md
└── reference/             # Reference documentation (planned)
    └── README.md
```

---

## Key Documents

### Getting Started

- [CONTRIBUTING.md](CONTRIBUTING.md) - Development standards and guidelines
- Setup Guide *(planned)* - Local development setup

### Architecture *(planned)*

- System Overview - Complete system architecture
- Model Selection - How models are chosen
- Security Architecture - Permission system

### Features

- [Feature Map](features/20260227-feature-map-complete-v1.00W.md) - All AI capabilities with diagrams
- Tool Registry *(planned)* - Complete tool documentation
- Workflow Automation *(planned)* - Workflow system guide

### Integration *(planned)*

- Activepieces Integration - External workflow platform
- Vercel AI Gateway - Model access configuration

### Pricing *(planned)*

- Model Pricing - Verified costs and projections
- ROI Analysis - Cost-benefit analysis

---

## Implementation Status

### Phase 1: Core AI Infrastructure ✅ (Week 1-2)

- [x] Vercel AI SDK installed
- [x] AI Gateway configured (Grok 4.1 primary + Claude fallbacks)
- [x] Model router implemented
- [x] AI chat API endpoint created
- [ ] Tool registry with core CRUD tools
- [ ] Permission checking system

### Phase 2: UI Components (Week 2-3)

- [x] AI Chat panel component (CRM7 + Conduit)
- [x] Tool invocation display
- [x] Quick actions
- [ ] Cost tracking dashboard

### Phase 3: Model Integration (Week 3)

- [x] Grok 4.1 integration
- [x] Claude fallback configuration
- [ ] Cost tracking implementation
- [ ] Usage analytics

### Phase 4: Plugin System (Week 4-5)

- [ ] Plugin loader
- [ ] Plugin API
- [ ] Example plugins
- [ ] Plugin marketplace

### Phase 5: Workflow Automation (Week 5-6)

- [ ] Workflow executor
- [ ] Trigger system
- [ ] Workflow builder UI
- [ ] AI-enhanced workflows

### Phase 6: External Integrations (Week 6-8)

- [ ] Activepieces integration
- [ ] Xero connector
- [ ] ADMS connector
- [ ] Gmail/email automation

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process
- Documentation standards

---

## Support

- **Documentation**: Browse this docs directory
- **Issues**: Create GitHub issue with `ai-assistant` label
- **Questions**: Ask in #ai-development Slack channel

---

## License

MIT License - See root LICENSE file for details

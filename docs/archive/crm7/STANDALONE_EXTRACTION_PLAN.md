# bsuite CRM7 - Standalone Repository Extraction Plan

- Note: **abandoned in favour of inbuilt ai**

**Created:** 2026-02-27
**Purpose:** Extract crm7 as standalone repo with plugin architecture for monkey-projects integration
**Status:** Draft Implementation Plan

---

## Executive Summary

Extract the current bsuite/crm7 into a standalone repository (`bsuite-crm`) with a modular plugin architecture that allows other projects (like monkey-projects/*) to integrate as extensions or consume as a platform.

**Key Goals:**
1. Independent versioning and deployment
2. Plugin/extension architecture for modularity
3. Clean API boundaries for external integrations
4. Maintain existing functionality while enabling expansion
5. Enable monkey-projects to consume as a base platform

---

## Current State Analysis

### Directory Structure
```
/home/braden/Desktop/Dev/bsuite/crm7/
├── src/                          # 500+ source files
├── supabase/                     # 18+ migrations
├── docs/                         # Documentation
├── node_modules/                 # 131 dependencies
└── [38 config files]            # vite, tsconfig, etc.

Size: ~[TBD] MB
```

### Dependencies (package.json)
- **Core Framework:** React 18.3.1, Vite 6.3.6
- **Database:** Supabase 2.75.0
- **UI:** Radix UI, Tailwind CSS, shadcn/ui
- **State:** Zustand, TanStack Query
- **130+ total dependencies**

### Existing Architecture
```
┌─────────────────────────────────────────┐
│         bsuite/crm7 (Monolith)         │
├─────────────────────────────────────────┤
│ • Portal System (4 portals)            │
│ • Apprentice Management                │
│ • Document Storage                     │
│ • Financial/Payroll                    │
│ • Compliance/WHS                       │
│ • Training (VET)                       │
│ • Field Officer Tools                  │
└─────────────────────────────────────────┘
```

---

## Target Architecture

### Standalone Repository: `bsuite-crm`

```
github.com/your-org/bsuite-crm
├── core/                         # Core CRM platform
│   ├── auth/                     # Authentication system
│   ├── multi-tenancy/           # Tenant isolation
│   ├── permissions/             # Role-based access
│   ├── database/                # Supabase integration
│   └── api/                     # Core API layer
├── plugins/                      # Plugin system
│   ├── @bsuite/plugin-api/      # Plugin SDK
│   ├── @bsuite/plugin-hooks/    # Hook system
│   └── @bsuite/plugin-loader/   # Dynamic loading
├── modules/                      # Built-in modules (can be extracted later)
│   ├── apprentices/             # Apprentice management
│   ├── training-provider/       # RTO portal
│   ├── host-employer/           # Host portal
│   ├── workplace/               # Workplace portal
│   ├── compliance/              # GTO compliance
│   └── documents/               # Document storage
├── shared/                       # Shared components
│   ├── ui/                      # shadcn/ui components
│   ├── hooks/                   # Shared hooks
│   └── utils/                   # Utilities
└── examples/                     # Integration examples
    └── monkey-integration/      # Example plugin
```

---

## Plugin Architecture Design

### 1. Plugin API (`@bsuite/plugin-api`)

```typescript
// packages/plugin-api/src/types.ts

export interface BsuitePlugin {
  name: string;
  version: string;
  author: string;
  description: string;

  // Lifecycle hooks
  onLoad?: (context: PluginContext) => Promise<void>;
  onUnload?: () => Promise<void>;

  // Extension points
  routes?: PluginRoute[];
  components?: PluginComponent[];
  hooks?: PluginHook[];
  services?: PluginService[];

  // Permissions required
  permissions?: string[];

  // Dependencies
  dependencies?: {
    core?: string;  // Minimum bsuite-crm version
    plugins?: Record<string, string>;
  };
}

export interface PluginContext {
  // Core APIs available to plugins
  auth: AuthAPI;
  database: DatabaseAPI;
  permissions: PermissionsAPI;
  ui: UIAPI;
  navigation: NavigationAPI;
  events: EventBus;
}

export interface PluginRoute {
  path: string;
  component: React.ComponentType;
  permissions?: string[];
  layout?: 'dashboard' | 'portal' | 'public';
}
```

### 2. Example Plugin Structure

```typescript
// plugins/monkey-integration/src/index.ts

import { BsuitePlugin, PluginContext } from '@bsuite/plugin-api';
import { MonkeyDashboard } from './components/MonkeyDashboard';
import { monkeyService } from './services/monkeyService';

export default {
  name: '@monkey/bsuite-integration',
  version: '1.0.0',
  author: 'Monkey Projects',
  description: 'Integration between Monkey Coder and bsuite CRM',

  async onLoad(context: PluginContext) {
    // Register monkey-specific services
    context.services.register('monkey', monkeyService);

    // Add custom navigation item
    context.navigation.addMenuItem({
      label: 'Monkey Tools',
      icon: 'monkey',
      path: '/monkey',
      permissions: ['use_monkey_tools']
    });
  },

  routes: [
    {
      path: '/monkey',
      component: MonkeyDashboard,
      permissions: ['use_monkey_tools'],
      layout: 'dashboard'
    }
  ],

  // Hook into existing bsuite events
  hooks: [
    {
      event: 'apprentice:created',
      handler: async (apprentice) => {
        // Sync to Monkey system
        await monkeyService.syncApprentice(apprentice);
      }
    }
  ],

  permissions: ['use_monkey_tools', 'sync_to_monkey'],

  dependencies: {
    core: '^1.0.0'
  }
} satisfies BsuitePlugin;
```

---

## Implementation Phases

### Phase 1: Repository Setup (Week 1)

**Tasks:**
1. Create new repository `bsuite-crm`
2. Extract crm7 code to new repo
3. Update all import paths
4. Configure GitHub Actions CI/CD
5. Set up versioning (semantic-release)

**Deliverables:**
- ✅ New repo at `github.com/[org]/bsuite-crm`
- ✅ All existing tests passing
- ✅ Deploy to staging environment
- ✅ Documentation updated

---

### Phase 2: Core/Modules Separation (Week 2-3)

**Refactor into modular structure:**

```
src/
├── core/                         # NEW: Core platform
│   ├── auth/                     # Extract from contexts/
│   ├── permissions/             # Extract from hooks/
│   ├── multi-tenancy/           # Extract tenant logic
│   └── database/                # Supabase client
├── modules/                      # NEW: Feature modules
│   ├── apprentices/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── training-provider/
│   ├── host-employer/
│   └── workplace/
└── shared/                       # Shared across modules
    ├── ui/
    ├── hooks/
    └── utils/
```

**Module Interface:**

```typescript
// src/modules/apprentices/module.ts

export const apprenticesModule: BsuiteModule = {
  name: 'apprentices',
  version: '1.0.0',

  routes: [
    { path: '/apprentices', component: ApprenticesList },
    { path: '/apprentices/:id', component: ApprenticeDetail }
  ],

  navigation: {
    label: 'Apprentices',
    icon: GraduationCap,
    path: '/apprentices',
    permissions: ['manage_apprentices']
  },

  services: {
    apprenticeService: () => import('./services/apprenticeService')
  },

  permissions: ['manage_apprentices', 'view_apprentices']
};
```

---

### Phase 3: Plugin System Implementation (Week 4-5)

**Build Plugin SDK:**

```typescript
// packages/plugin-api/src/index.ts

export { BsuitePlugin, PluginContext } from './types';
export { createPlugin } from './createPlugin';
export { usePluginContext } from './hooks';

// Core APIs exposed to plugins
export interface AuthAPI {
  getCurrentUser(): User | null;
  hasPermission(permission: string): boolean;
  login(credentials: Credentials): Promise<void>;
  logout(): Promise<void>;
}

export interface DatabaseAPI {
  query<T>(table: string): QueryBuilder<T>;
  insert<T>(table: string, data: T): Promise<T>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>;
  delete(table: string, id: string): Promise<void>;
}

export interface UIAPI {
  showToast(message: string, type: 'success' | 'error' | 'info'): void;
  showDialog(component: React.ComponentType): Promise<void>;
  registerComponent(slot: string, component: React.ComponentType): void;
}

export interface EventBus {
  on<T>(event: string, handler: (data: T) => void): () => void;
  emit<T>(event: string, data: T): void;
}
```

**Plugin Loader:**

```typescript
// src/core/plugins/PluginLoader.ts

export class PluginLoader {
  private plugins: Map<string, BsuitePlugin> = new Map();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async loadPlugin(plugin: BsuitePlugin): Promise<void> {
    // Validate dependencies
    this.validateDependencies(plugin);

    // Check permissions
    this.validatePermissions(plugin);

    // Call onLoad hook
    await plugin.onLoad?.(this.context);

    // Register routes
    plugin.routes?.forEach(route => {
      this.context.navigation.registerRoute(route);
    });

    // Register services
    Object.entries(plugin.services || {}).forEach(([name, service]) => {
      this.context.services.register(name, service);
    });

    // Register event handlers
    plugin.hooks?.forEach(hook => {
      this.context.events.on(hook.event, hook.handler);
    });

    this.plugins.set(plugin.name, plugin);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return;

    await plugin.onUnload?.();
    this.plugins.delete(pluginName);
  }

  getLoadedPlugins(): BsuitePlugin[] {
    return Array.from(this.plugins.values());
  }
}
```

---

### Phase 4: Monkey-Projects Integration Examples (Week 6)

**Create example integrations:**

#### Example 1: Monkey Coder Integration

```typescript
// plugins/monkey-coder-integration/src/index.ts

import { BsuitePlugin } from '@bsuite/plugin-api';
import { MonkeyCoderPanel } from './components/MonkeyCoderPanel';
import { monkeyCoderService } from './services/monkeyCoderService';

export default {
  name: '@monkey/coder-integration',
  version: '1.0.0',

  async onLoad(context) {
    // Initialize Monkey Coder connection
    await monkeyCoderService.connect({
      apiKey: process.env.MONKEY_API_KEY
    });

    // Add to sidebar
    context.navigation.addMenuItem({
      label: 'AI Coding Assistant',
      icon: 'code',
      path: '/monkey-coder',
      badge: 'AI',
      permissions: ['use_ai_assistant']
    });
  },

  routes: [
    {
      path: '/monkey-coder',
      component: MonkeyCoderPanel,
      layout: 'dashboard'
    }
  ],

  hooks: [
    {
      // Auto-generate code when creating apprentice records
      event: 'apprentice:creating',
      handler: async (apprentice) => {
        const validation = await monkeyCoderService.validateRecord(apprentice);
        return validation;
      }
    }
  ]
} satisfies BsuitePlugin;
```

#### Example 2: FastMonkey Platform Integration

```typescript
// plugins/fastmonkey-integration/src/index.ts

export default {
  name: '@monkey/fastmonkey-integration',
  version: '1.0.0',

  services: {
    fastmonkey: () => ({
      async deployToFastMonkey(data: any) {
        // Deploy data to FastMonkey platform
      },
      async syncFromFastMonkey() {
        // Sync data from FastMonkey
      }
    })
  },

  hooks: [
    {
      event: 'document:uploaded',
      handler: async (document) => {
        // Auto-process with FastMonkey
        await context.services.get('fastmonkey').processDocument(document);
      }
    }
  ]
} satisfies BsuitePlugin;
```

---

### Phase 5: Documentation & Examples (Week 7)

**Create comprehensive docs:**

```
docs/
├── getting-started/
│   ├── installation.md
│   ├── configuration.md
│   └── first-plugin.md
├── plugin-development/
│   ├── plugin-api-reference.md
│   ├── lifecycle-hooks.md
│   ├── best-practices.md
│   └── testing-plugins.md
├── core-apis/
│   ├── auth-api.md
│   ├── database-api.md
│   ├── permissions-api.md
│   └── ui-api.md
├── examples/
│   ├── simple-plugin/
│   ├── monkey-integration/
│   └── custom-portal/
└── deployment/
    ├── standalone.md
    ├── with-plugins.md
    └── production.md
```

---

## Plugin Discovery & Marketplace (Future)

### Plugin Registry Structure

```typescript
// packages/plugin-registry/src/types.ts

export interface PluginMetadata {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: {
    name: string;
    email: string;
    url?: string;
  };
  repository: string;
  homepage?: string;
  license: string;
  keywords: string[];
  category: 'integration' | 'portal' | 'feature' | 'ui' | 'utility';

  // Installation
  installCommand: string;
  configRequired: boolean;

  // Compatibility
  bsuiteVersion: string;
  requiresPlugins?: string[];

  // Stats (for marketplace)
  downloads?: number;
  stars?: number;
  rating?: number;

  // Screenshots
  screenshots?: string[];
  icon?: string;
}
```

### Plugin Marketplace UI

```
/plugins (route in bsuite-crm)
├── Browse Plugins
│   ├── Search & Filter
│   ├── Categories (Integration, Portal, Feature)
│   ├── Plugin Cards (with install button)
│   └── Plugin Details Page
├── Installed Plugins
│   ├── List of active plugins
│   ├── Enable/Disable toggle
│   ├── Settings for each plugin
│   └── Uninstall option
└── Developer Tools
    ├── Create New Plugin (scaffold)
    ├── Test Plugin Locally
    └── Publish to Registry
```

---

## Migration Strategy

### For Existing bsuite/crm7 Users

**Option A: In-place Migration**
```bash
# Update git remote
git remote set-url origin https://github.com/[org]/bsuite-crm.git

# Pull latest changes
git pull origin main

# Update dependencies
pnpm install

# Run migration script
pnpm run migrate:standalone
```

**Option B: Fresh Install**
```bash
# Clone new repo
git clone https://github.com/[org]/bsuite-crm.git
cd bsuite-crm

# Install dependencies
pnpm install

# Copy existing .env
cp /path/to/old/crm7/.env .env

# Migrate database (if schema changes)
pnpm supabase db push

# Start dev server
pnpm dev
```

---

## Monkey-Projects Integration Guide

### Quick Start for Monkey Projects

```bash
# In your monkey project
npm install @bsuite/plugin-api

# Create plugin
mkdir -p plugins/my-monkey-plugin
cd plugins/my-monkey-plugin
npm init @bsuite/plugin

# Develop
npm run dev

# Build
npm run build

# Test with bsuite-crm
cd ../../bsuite-crm
pnpm link ../monkey-projects/plugins/my-monkey-plugin
pnpm dev
```

### Integration Patterns

**Pattern 1: Data Sync**
```typescript
// Sync apprentice data to Monkey system
export const monkeyDataSyncPlugin = {
  name: '@monkey/data-sync',
  hooks: [
    {
      event: 'apprentice:updated',
      handler: async (apprentice) => {
        await fetch('https://monkey-api.com/sync', {
          method: 'POST',
          body: JSON.stringify(apprentice)
        });
      }
    }
  ]
};
```

**Pattern 2: UI Extension**
```typescript
// Add Monkey tools to bsuite UI
export const monkeyUIPlugin = {
  name: '@monkey/ui-extension',
  components: [
    {
      slot: 'apprentice-detail-sidebar',
      component: MonkeyInsightsPanel
    }
  ]
};
```

**Pattern 3: Service Provider**
```typescript
// Provide Monkey services to bsuite
export const monkeyServicesPlugin = {
  name: '@monkey/services',
  services: {
    ai: monkeyAIService,
    automation: monkeyAutomationService,
    analytics: monkeyAnalyticsService
  }
};
```

---

## Success Metrics

### Technical Metrics
- ✅ Plugin load time < 500ms
- ✅ Plugin API surface < 50 methods
- ✅ Core bundle size increase < 10%
- ✅ All existing tests passing
- ✅ Plugin SDK fully typed (TypeScript)

### Adoption Metrics
- 🎯 3+ monkey-projects plugins within 3 months
- 🎯 10+ community plugins within 6 months
- 🎯 Documentation coverage > 90%
- 🎯 Plugin API stability (no breaking changes for 6 months)

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking changes during extraction | High | Medium | Comprehensive test suite, gradual migration |
| Plugin security vulnerabilities | High | Medium | Plugin sandboxing, permission system, code review |
| Performance degradation with plugins | Medium | Low | Lazy loading, plugin metrics, performance budget |
| Fragmentation across plugin versions | Medium | High | Semantic versioning, compatibility matrix, deprecation policy |
| Maintenance burden | High | Medium | Clear API contracts, automated tests, community contributions |

---

## Timeline

```
Week 1-2:   Repository setup & core extraction
Week 3-4:   Module separation & cleanup
Week 5-6:   Plugin system implementation
Week 7-8:   Documentation & examples
Week 9-10:  Monkey-projects integration
Week 11-12: Beta testing & refinement

Total: 12 weeks (3 months)
```

---

## Next Steps

1. **Review & Approve Plan**
   - Stakeholder review
   - Technical architecture review
   - Resource allocation

2. **Set Up Infrastructure**
   - Create GitHub repo
   - Configure CI/CD
   - Set up staging environment

3. **Begin Phase 1**
   - Extract code to new repo
   - Update documentation
   - Run test suite

---

## Questions to Answer

- [ ] What's the target name for the new repo? (`bsuite-crm` or `bsuite-platform`?)
- [ ] Public or private repository?
- [ ] Which monkey-projects should integrate first?
- [ ] Self-hosted plugins or marketplace?
- [ ] License type (MIT, Apache 2.0, proprietary)?
- [ ] Versioning strategy (semver, calver)?

---

**Created by:** Claude Sonnet 4.5
**Date:** 2026-02-27
**Status:** Draft - Awaiting Review

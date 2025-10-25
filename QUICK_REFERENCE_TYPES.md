# Quick Reference: Admin Component Types

## Import Statement

```typescript
import type { AdminStats, AdminTool, QuickAction } from '@/types/admin-components';
```

## Type Definitions

### AdminStats
Statistics for admin dashboard display.

```typescript
interface AdminStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  recentRoleChanges: number;
  activeAgents: number;
}
```

**Usage:**
```typescript
const stats: AdminStats = {
  totalUsers: 100,
  usersByRole: { admin: 5, user: 95 },
  recentRoleChanges: 3,
  activeAgents: 2,
};
```

---

### AdminTool
Configuration for admin tool cards.

```typescript
interface AdminTool {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isPremium?: boolean;
  requiresSuperAdmin?: boolean;
}
```

**Usage:**
```typescript
import { Bot } from 'lucide-react';

const tool: AdminTool = {
  title: 'AI Agents',
  description: 'Configure autonomous AI agents',
  href: '/admin/agents',
  icon: Bot,
  badge: 'New',
  isPremium: true,
};
```

---

### QuickAction
Configuration for quick action buttons.

```typescript
interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}
```

**Usage:**
```typescript
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

const router = useRouter();

const action: QuickAction = {
  title: 'Assign Roles',
  description: 'Manage team permissions',
  icon: ShieldCheck,
  action: () => router.push('/admin/roles'),
};
```

---

## Component Props

### AdminStatsGridProps
```typescript
interface AdminStatsGridProps {
  stats: AdminStats | null;
  refreshing?: boolean;
}
```

### AdminToolsGridProps
```typescript
interface AdminToolsGridProps {
  tools: AdminTool[];
  isSuperAdmin?: boolean;
}
```

### QuickActionsGridProps
```typescript
interface QuickActionsGridProps {
  actions?: QuickAction[];
}
```

---

## Complete Example

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminStatsGrid } from '@/components/admin/admin-stats-grid';
import { AdminToolsGrid } from '@/components/admin/admin-tools-grid';
import { QuickActionsGrid } from '@/components/admin/quick-actions-grid';
import type { AdminStats, AdminTool, QuickAction } from '@/types/admin-components';
import { Bot, Upload, ShieldCheck } from 'lucide-react';

export default function MyAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 150,
    usersByRole: { admin: 10, user: 140 },
    recentRoleChanges: 5,
    activeAgents: 3,
  });

  const tools: AdminTool[] = [
    {
      title: 'AI Agents',
      description: 'Configure autonomous AI agents',
      href: '/admin/agents',
      icon: Bot,
      isPremium: true,
    },
    {
      title: 'Import Data',
      description: 'Bulk import business data',
      href: '/admin/import',
      icon: Upload,
    },
  ];

  const actions: QuickAction[] = [
    {
      title: 'Assign Roles',
      description: 'Manage team permissions',
      icon: ShieldCheck,
      action: () => router.push('/admin/roles'),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminStatsGrid stats={stats} />
      <AdminToolsGrid tools={tools} />
      <QuickActionsGrid actions={actions} />
    </div>
  );
}
```

---

## Backward Compatibility

Old import paths still work:

```typescript
// Still works (re-exported)
import type { AdminTool } from '@/components/admin/admin-tools-grid';
import type { QuickAction } from '@/components/admin/quick-actions-grid';

// Preferred (new)
import type { AdminTool, QuickAction } from '@/types/admin-components';
```

---

## See Also

- 📄 **Full Documentation**: `docs/TYPE_DEFINITIONS_REFACTORING.md`
- 📄 **Component Guide**: `docs/COMPONENT_REFACTORING.md`
- 📄 **Type Definitions**: `types/admin-components.ts`

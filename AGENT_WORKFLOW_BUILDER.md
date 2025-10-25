# Agent Workflow Builder

A visual workflow builder for chaining multiple AI agents together in oppSpot. Build complex, multi-step workflows with drag-and-drop simplicity.

## 🎯 Features

### Visual Workflow Editor
- **Drag-and-Drop Interface**: React Flow-powered canvas for building workflows
- **Node Types**:
  - **Trigger**: Workflow start point (accepts input data)
  - **Agent**: Execute AI agents (Enrichment, Scoring, Research, Financial, Legal, Market, Technical, Contacts)
  - **Condition**: Conditional branching based on data
  - **Transform**: Data transformation (JavaScript or template-based)
  - **Delay**: Time-based delays
  - **Parallel**: Execute multiple branches in parallel
  - **Merge**: Merge results from parallel branches
  - **Output**: Final workflow output

### Workflow Execution
- **DAG (Directed Acyclic Graph) Execution**: Automatic topological sorting
- **Real-time Monitoring**: Live execution progress with logs
- **Error Handling**: Retry logic and error recovery
- **Node-level Results**: View output from each node
- **Execution History**: Track all workflow runs

### Validation
- **Pre-execution Validation**: Detect errors before running
- **Structure Validation**: Check for cycles, disconnected nodes, missing configurations
- **Agent Validation**: Verify agent types and configurations
- **Visual Feedback**: Real-time validation errors in UI

## 📁 File Structure

```
/supabase/migrations/
  └── 20251023000001_agent_workflow_builder.sql    # Database schema

/types/
  └── agent-workflow.ts                             # TypeScript types

/lib/agents/workflow-builder/
  ├── workflow-engine.ts                            # Execution engine
  └── workflow-validator.ts                         # Validation logic

/app/api/agent-workflows/
  ├── route.ts                                      # List/Create workflows
  ├── [id]/route.ts                                 # Get/Update/Delete workflow
  ├── [id]/execute/route.ts                         # Execute workflow
  ├── [id]/validate/route.ts                        # Validate workflow
  └── executions/[executionId]/route.ts             # Execution details

/components/agents/workflow-builder/
  ├── workflow-canvas.tsx                           # Main canvas component
  ├── node-palette.tsx                              # Draggable node types
  ├── node-config-panel.tsx                         # Node configuration
  └── nodes/
      ├── agent-node.tsx                            # Agent node component
      ├── trigger-node.tsx                          # Trigger node component
      ├── condition-node.tsx                        # Condition node component
      ├── transform-node.tsx                        # Transform node component
      └── output-node.tsx                           # Output node component

/app/agent-workflows/
  ├── page.tsx                                      # Workflow list
  ├── [id]/page.tsx                                 # Workflow builder/editor
  └── executions/[executionId]/page.tsx             # Execution monitor
```

## 🗄️ Database Schema

### Tables

#### `agent_workflows`
Stores workflow definitions with visual structure.

```sql
CREATE TABLE agent_workflows (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB,                    -- Full workflow config
  nodes JSONB,                     -- Workflow nodes
  edges JSONB,                     -- Node connections
  is_template BOOLEAN,
  tags TEXT[],
  organization_id UUID,
  created_by UUID,
  status TEXT,                     -- 'draft', 'active', 'archived'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `agent_workflow_executions`
Tracks workflow execution runs and results.

```sql
CREATE TABLE agent_workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES agent_workflows(id),
  triggered_by UUID,
  trigger_type TEXT,               -- 'manual', 'scheduled', 'event', 'api'
  input_data JSONB,
  output_data JSONB,
  status TEXT,                     -- 'pending', 'running', 'completed', 'failed'
  current_node_id TEXT,
  node_results JSONB,              -- Results from each node
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ
);
```

#### `agent_workflow_logs`
Real-time execution logs for monitoring.

```sql
CREATE TABLE agent_workflow_logs (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES agent_workflow_executions(id),
  node_id TEXT,
  level TEXT,                      -- 'debug', 'info', 'warn', 'error'
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

#### `agent_workflow_templates`
Reusable workflow templates.

```sql
CREATE TABLE agent_workflow_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                   -- 'research', 'enrichment', 'scoring', etc.
  workflow_config JSONB,
  is_public BOOLEAN,
  created_by UUID,
  usage_count INTEGER,
  created_at TIMESTAMPTZ
);
```

## 🚀 Usage

### 1. Access Workflow Builder

Navigate to **Admin → Workflow Builder** in the sidebar (admin-only).

### 2. Create a New Workflow

1. Click **"Create Workflow"**
2. Give it a name and description
3. Drag nodes from the palette onto the canvas
4. Connect nodes by dragging from output handles to input handles
5. Click nodes to configure them
6. Validate the workflow
7. Save the workflow

### 3. Configure Nodes

**Agent Node Example:**
```json
{
  "label": "Enrich Company Data",
  "agentType": "enrichment",
  "agentConfig": {
    "dataSources": ["companiesHouse", "linkedin"],
    "fields": ["revenue", "employees", "technologies"]
  }
}
```

**Condition Node Example:**
```json
{
  "label": "Check Company Size",
  "condition": {
    "field": "data.employees",
    "operator": "gte",
    "value": 50
  }
}
```

**Transform Node Example:**
```json
{
  "label": "Format Output",
  "transformType": "javascript",
  "transformScript": "return { ...input, score: input.score * 100 }"
}
```

### 4. Execute Workflow

1. Click **"Execute"** button
2. Provide input data (optional)
3. Monitor real-time execution progress
4. View node-level results
5. Check execution logs

### 5. View Execution History

- Click **"Run"** on any workflow to see execution history
- View detailed logs and node outputs
- Monitor real-time progress for running executions

## 📊 Example Workflows

### Example 1: Company Research Pipeline

```
Trigger (Company ID)
  → Enrichment Agent (Get company data)
    → Financial Agent (Analyze financials)
      → Scoring Agent (Calculate fit score)
        → Condition (Score > 70?)
          → [Yes] Insight Generator (Generate report)
          → [No] Output (Low priority)
```

### Example 2: Multi-Source Intelligence

```
Trigger (Company ID)
  → Parallel:
      Branch 1: Legal Agent (Legal research)
      Branch 2: Market Agent (Market analysis)
      Branch 3: Technical Agent (Tech stack analysis)
  → Merge (Combine results)
    → Insight Generator (Synthesize insights)
      → Output (Comprehensive report)
```

### Example 3: Automated Lead Scoring

```
Trigger (Lead data)
  → Enrichment Agent (Enrich with external data)
    → Transform (Normalize data)
      → Scoring Agent (Calculate lead score)
        → Condition (Score > 80?)
          → [Yes] Contacts Agent (Find decision makers)
          → [No] Output (Nurture list)
```

## 🔌 API Reference

### List Workflows
```
GET /api/agent-workflows
Query params: status, tag, limit, offset
```

### Create Workflow
```
POST /api/agent-workflows
Body: { name, description, config, tags, isTemplate }
```

### Get Workflow
```
GET /api/agent-workflows/[id]
```

### Update Workflow
```
PUT /api/agent-workflows/[id]
Body: { name, description, config, tags, status }
```

### Delete Workflow
```
DELETE /api/agent-workflows/[id]
```

### Execute Workflow
```
POST /api/agent-workflows/[id]/execute
Body: { inputData, options }
```

### Validate Workflow
```
POST /api/agent-workflows/[id]/validate
```

### Get Execution Details
```
GET /api/agent-workflows/executions/[executionId]
```

## 🔐 Security

- **Row-Level Security (RLS)**: All workflows are organization-scoped
- **RBAC**: Admin-only access to workflow builder
- **Validation**: Pre-execution validation prevents malicious code
- **Audit Logs**: All executions and changes are logged

## 🎨 UI Components

### WorkflowCanvas
Main visual editor component using React Flow.

```tsx
<WorkflowCanvas
  workflowId="uuid"
  initialConfig={config}
  onSave={handleSave}
  onExecute={handleExecute}
  readonly={false}
/>
```

### NodePalette
Draggable node types sidebar.

### NodeConfigPanel
Right-side panel for configuring selected nodes.

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create a new workflow
- [ ] Add and configure each node type
- [ ] Connect nodes with edges
- [ ] Validate workflow (should catch errors)
- [ ] Fix validation errors
- [ ] Save workflow
- [ ] Execute workflow with sample data
- [ ] Monitor real-time execution
- [ ] View execution logs
- [ ] Check node-level results
- [ ] View execution history

### Example Test Workflow

Create a simple test workflow:

1. **Trigger Node**: Accepts `{ companyId: "123" }`
2. **Agent Node**: Enrichment Agent (get company data)
3. **Transform Node**: Extract company name
4. **Output Node**: Return formatted result

Execute and verify:
- Execution status updates
- Logs are recorded
- Node results are stored
- Output data is correct

## 🛠️ Development

### Adding New Node Types

1. Create node component in `/components/agents/workflow-builder/nodes/`
2. Add to `nodeTypes` in `workflow-canvas.tsx`
3. Add to palette in `node-palette.tsx`
4. Add execution logic in `workflow-engine.ts`
5. Add configuration form in `node-config-panel.tsx`

### Adding New Agent Types

1. Create agent class extending `BaseAgent`
2. Add to `agentTypes` list in `node-config-panel.tsx`
3. Add to `createAgent` method in `workflow-engine.ts`

## 📝 Future Enhancements

- [ ] **Workflow Versioning**: Track changes and allow rollback
- [ ] **Scheduled Execution**: Run workflows on a schedule
- [ ] **Event Triggers**: Trigger workflows from system events
- [ ] **Workflow Templates**: Pre-built templates for common use cases
- [ ] **Collaborative Editing**: Multiple users editing simultaneously
- [ ] **Workflow Marketplace**: Share and discover community workflows
- [ ] **Visual Debugging**: Step-through execution with breakpoints
- [ ] **Performance Metrics**: Track workflow execution performance
- [ ] **Cost Tracking**: Monitor LLM API costs per workflow
- [ ] **A/B Testing**: Run multiple workflow versions

## 🐛 Known Issues

- React Flow requires `npm install --legacy-peer-deps`
- Workflow execution is currently synchronous (should use Inngest for background jobs)
- No automatic retry on transient failures
- Limited error recovery options

## 📚 References

- [React Flow Documentation](https://reactflow.dev/)
- [Workflow Engine Pattern](https://en.wikipedia.org/wiki/Workflow_engine)
- [DAG Execution](https://en.wikipedia.org/wiki/Directed_acyclic_graph)

---

**Version**: 1.0.0
**Last Updated**: 2025-10-23
**Author**: oppSpot Development Team

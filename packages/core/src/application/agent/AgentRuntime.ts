/**
 * Represents the current execution state of an Autonomous Agent.
 */
export type AgentState =
  'INITIALIZED' | 'PLANNING' | 'EXECUTING' | 'SUSPENDED_FOR_APPROVAL' | 'COMPLETED' | 'FAILED';

/**
 * Standardized definition of a Tool Call, specifically mapping to MCP protocols.
 */
export interface ToolCall {
  readonly callId: string;
  readonly toolName: string;
  readonly mcpServerId: string;
  readonly arguments: Record<string, any>;
}

export interface AgentExecutionContext {
  readonly executionId: string;
  readonly agentId: string;
  readonly tenantId: string;
  state: AgentState;
  readonly memory: Array<{ role: string; content: string }>;
  pendingToolCall?: ToolCall;
}

/**
 * Interface for the Enterprise Tool Registry (Task 4)
 */
export interface IToolRegistry {
  isAuthorized(toolName: string, tenantId: string): boolean;
  requiresHumanApproval(toolName: string): boolean;
  executeTool(call: ToolCall): Promise<any>;
}

/**
 * Interface for the Human Approval Engine (Task 8)
 */
export interface IApprovalEngine {
  requestApproval(context: AgentExecutionContext, call: ToolCall): Promise<void>;
}

/**
 * AGENT-001: Enterprise Agent Runtime
 *
 * Architecture:
 * The Runtime acts as a deterministic state machine wrapping the non-deterministic LLM.
 * It is responsible for the "ReAct" (Reason + Act) loop. Crucially, it intercepts
 * every single tool call and validates it against the Enterprise Tool Registry.
 * If a tool requires human approval, the runtime suspends execution and hands off
 * to the HumanApprovalEngine, allowing the process to be rehydrated hours later.
 */
export class AgentRuntime {
  constructor(
    private readonly toolRegistry: IToolRegistry,
    private readonly approvalEngine: IApprovalEngine,
    // In production, this interacts with the LLM via the core Gateway Decision Engine
    private readonly llmInvoker: any,
  ) {}

  /**
   * Begins or resumes the execution of an agent workflow.
   */
  public async execute(context: AgentExecutionContext): Promise<AgentExecutionContext> {
    if (context.state === 'COMPLETED' || context.state === 'FAILED') {
      return context;
    }

    try {
      // Main ReAct Loop
      while (context.state !== 'COMPLETED' && context.state !== 'SUSPENDED_FOR_APPROVAL') {
        context.state = 'PLANNING';

        // 1. Ask LLM what to do next based on current memory
        const llmResponse = await this.llmInvoker.invoke(context.memory);
        context.memory.push({ role: 'assistant', content: JSON.stringify(llmResponse) });

        if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
          // Agent is finished
          context.state = 'COMPLETED';
          break;
        }

        // 2. Intercept and Execute Tools
        context.state = 'EXECUTING';
        for (const call of llmResponse.toolCalls as ToolCall[]) {
          // Zero-Trust Authorization Check
          if (!this.toolRegistry.isAuthorized(call.toolName, context.tenantId)) {
            throw new Error(`[SECURITY] Agent attempted unauthorized tool call: ${call.toolName}`);
          }

          // Human-in-the-loop (HITL) Check
          if (this.toolRegistry.requiresHumanApproval(call.toolName)) {
            context.state = 'SUSPENDED_FOR_APPROVAL';
            context.pendingToolCall = call;

            // Trigger webhook/notification to SRE team
            await this.approvalEngine.requestApproval(context, call);

            // Suspend execution loop. State will be saved to DynamoDB by caller.
            return context;
          }

          // Execute allowed tool
          const toolResult = await this.toolRegistry.executeTool(call);

          // Add result to Agent Memory for the next reasoning cycle
          context.memory.push({ role: 'tool', content: JSON.stringify(toolResult) });
        }
      }
    } catch (error) {
      context.state = 'FAILED';
      context.memory.push({ role: 'system', content: `Execution Error: ${error}` });
    }

    return context;
  }
}

# LangGraph: Two Approaches to Building Agents

**Date:** December 7, 2025  
**Topic:** Understanding `createAgent()` vs Manual `StateGraph` in LangGraph

---

## Overview

When building AI agents with LangGraph (JavaScript/TypeScript), there are **two main approaches**:

1. **High-Level**: Using `createAgent()` - Fast, simple, production-ready
2. **Low-Level**: Using `StateGraph` - Full control, custom workflows, learning-oriented

Both accomplish the same goal (building tool-calling agents), but with different levels of abstraction.

---

## Approach 1: `createAgent()` - The Express Way 🚀

### What It Is

`createAgent()` is a **high-level abstraction** provided by LangChain that automatically sets up a complete agent with tool-calling capabilities.

### Code Example

```typescript
import { createAgent } from "langchain";
import { ChatGroq } from "@langchain/groq";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
});

const tools = [
  webSearchTool,
  documentSearchTool,
  createEventTool,
];

// That's it! One function call creates a complete agent
const agent = createAgent({
  model,
  tools,
});

// Use it
const result = await agent.invoke({
  messages: [{ role: "user", content: "Search the web for AI news" }]
});
```

### What Happens Under the Hood

When you call `createAgent()`, LangChain automatically:

1. **Binds tools to your model** (so the model knows what tools exist)
2. **Creates a StateGraph** with standard nodes:
   - `assistant` node (runs the LLM)
   - `tools` node (executes tool calls)
3. **Sets up conditional routing** (if tool called → execute tool → loop back)
4. **Compiles the graph** into a runnable agent

### Pros ✅

- **Simple**: 3 lines of code vs 30+ lines
- **Standard pattern**: Works for 90% of agent use cases
- **Maintained**: Updates automatically when LangChain improves
- **Production-ready**: Battle-tested, optimized
- **Less to debug**: Framework handles complexity

### Cons ❌

- **Limited customization**: Can't change the internal flow
- **Black box**: Harder to understand what's happening
- **Fixed routing**: LLM decides tool usage, you can't override routing logic

### When to Use

- ✅ Building a standard tool-calling agent
- ✅ You want fast development
- ✅ You trust the framework to handle routing
- ✅ Your use case fits the standard pattern: ask → think → use tools → answer

---

## Approach 2: Manual `StateGraph` - The Custom Way 🛠️

### What It Is

`StateGraph` is the **low-level building block** that lets you manually construct the agent's workflow graph, giving you full control over every node and edge.

### Code Example

```typescript
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage } from "@langchain/core/messages";

// Step 1: Define the assistant node
async function callModel(state: typeof MessagesAnnotation.State) {
  const modelWithTools = model.bindTools(tools);
  const response = await modelWithTools.invoke(state.messages);
  return { messages: [response] };
}

// Step 2: Define routing logic
function shouldContinue(state: typeof MessagesAnnotation.State): "tools" | typeof END {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    console.log("🔧 Routing to tools:", lastMessage.tool_calls.map(tc => tc.name));
    return "tools"; // Go to tools node
  }
  
  console.log("✅ Ending - final answer ready");
  return END; // Conversation complete
}

// Step 3: Create tool node
const toolNode = new ToolNode(tools);

// Step 4: Build the graph
const graph = new StateGraph(MessagesAnnotation)
  .addNode("assistant", callModel)        // Add LLM node
  .addNode("tools", toolNode)             // Add tools node
  .addEdge(START, "assistant")            // Start → assistant
  .addConditionalEdges("assistant", shouldContinue) // assistant → tools OR END
  .addEdge("tools", "assistant")          // tools → assistant (loop)
  .compile();

// Use it (same interface as createAgent)
const result = await graph.invoke({
  messages: [{ role: "user", content: "Search the web for AI news" }]
});
```

### Graph Flow Visualization

```
┌─────────┐
│  START  │ User sends message
└────┬────┘
     │
     ▼
┌──────────────┐
│  assistant   │ LLM thinks, decides if tools needed
│    node      │
└──────┬───────┘
       │
   ┌───┴─────────── shouldContinue() checks ─────────┐
   │                                                  │
   ▼                                                  ▼
┌──────┐                                          ┌─────┐
│tools │ Execute tool calls                       │ END │ Direct answer
│node  │                                          └─────┘
└──┬───┘
   │
   └──► Loop back to assistant with tool results
```

### Key Components Explained

#### 1. **State** (`MessagesAnnotation`)
Tracks the conversation history. Every node reads/writes to this shared state.

```typescript
// State structure (simplified)
{
  messages: [
    { role: "user", content: "..." },
    { role: "assistant", content: "...", tool_calls: [...] },
    { role: "tool", content: "..." }
  ]
}
```

#### 2. **Nodes** (Processing Steps)
Each node is a function that takes state and returns updated state.

```typescript
async function callModel(state) {
  // Do work (call LLM, etc.)
  return { messages: [newMessage] }; // Update state
}
```

#### 3. **Edges** (Transitions)
Define how to move between nodes.

- **Simple edge**: Always go to a specific node
  ```typescript
  .addEdge("tools", "assistant") // Always go from tools → assistant
  ```

- **Conditional edge**: Route based on logic
  ```typescript
  .addConditionalEdges("assistant", shouldContinue)
  // Calls shouldContinue() to decide next node
  ```

#### 4. **Routing Functions**
Functions that return the name of the next node or `END`.

```typescript
function shouldContinue(state): "tools" | typeof END {
  // Your custom logic here
  if (someCondition) return "tools";
  return END;
}
```

### Pros ✅

- **Full control**: You decide the exact flow
- **Custom routing**: Implement complex decision logic
- **Multi-agent support**: Create specialized agents for different tasks
- **Learning**: Understand how agents work internally
- **Advanced features**:
  - Human-in-the-loop (pause for approval)
  - Parallel tool execution
  - Error recovery nodes
  - Custom state management

### Cons ❌

- **More code**: 30+ lines vs 3 lines
- **More complexity**: You manage the graph structure
- **More debugging**: You're responsible for routing bugs
- **Maintenance**: You need to update when patterns change

### When to Use

- ✅ You need custom routing logic the LLM can't handle
- ✅ Building multi-agent systems with specialized roles
- ✅ You want features like human-in-the-loop
- ✅ Learning how agents work internally
- ✅ Your workflow doesn't fit the standard pattern

---

## Real-World Comparison

### Scenario: RAG Chatbot with Tools

**With `createAgent()`:**
```typescript
// The LLM decides when to search documents vs web vs calendar
const agent = createAgent({
  model,
  tools: [documentSearchTool, webSearchTool, calendarTool],
});

// LLM automatically chooses the right tool based on user query
```

**With Manual Graph:**
```typescript
// YOU can control when document search happens
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  const userQuery = state.messages[0].content;
  
  // Custom logic: Always search docs first if they exist
  if (!state.checkedDocuments && hasUploadedFiles) {
    return "document_search_node"; // Force doc search first
  }
  
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  
  return END;
}
```

---

## Decision Matrix: Which One to Use?

| Criteria | `createAgent()` | Manual `StateGraph` |
|----------|----------------|-------------------|
| **Time to implement** | 5 minutes | 30-60 minutes |
| **Code complexity** | Very low | Medium-High |
| **Customization** | Limited | Full control |
| **Learning curve** | Easy | Moderate |
| **Production use** | ✅ Recommended | Advanced cases only |
| **Debugging** | Framework handles | You debug |
| **Custom routing** | ❌ LLM decides | ✅ You decide |
| **Multi-agent** | ❌ Not supported | ✅ Supported |
| **Human-in-loop** | ❌ Not supported | ✅ Supported |

---

## My Current Project: Using Both! 🎓

In my `lib/graph.ts`, I have both implementations:

```typescript
// For production - simple and reliable
export { agent } from "./agent"; // Created with createAgent()

// For learning - understanding internals
export const graph = new StateGraph(...)
  .addNode(...)
  .addConditionalEdges(...)
  .compile();
```

**Current usage:** API route uses `agent` (production), but I can switch to `graph` to debug or learn.

---

## Key Takeaway 💡

- **`createAgent()`** = Like using a restaurant's set menu (fast, reliable, limited choices)
- **Manual `StateGraph`** = Like being the chef (more work, full control, any recipe)

**For most projects**, start with `createAgent()`. Only use manual graphs when you need custom routing, multi-agent systems, or want to learn the internals.

Both produce **identical behavior** for standard tool-calling agents - just different levels of abstraction!

---

## Next Learning Goals 📚

- [ ] Understand `MessagesAnnotation` state structure
- [ ] Learn about persistent state (checkpoints)
- [ ] Explore streaming responses with graphs
- [ ] Study multi-agent patterns
- [ ] Implement human-in-the-loop workflows

---

## References

- [LangGraph JS Docs](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [createAgent API](https://docs.langchain.com/oss/javascript/langchain/agents)
- [StateGraph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api)

# LangChain Tools: `tool` vs `DynamicStructuredTool`

In LangChain, you can create tools for agents in two main ways. Here's a crisp guide on which one to choose.

## 1. `tool` (Functional Approach)
The `tool` function is a higher-order helper that wraps a standard JavaScript/TypeScript function.

**When to use:**
- **Simplicity:** You have a simple function and want to quickly expose it as a tool.
- **Type Inference:** You want Zod schema to be inferred automatically (in some implementations) or defined minimally.
- **Less Boilerplate:** You prefer a functional style without creating class instances.

**Example:**
```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const addTool = tool(
  async ({ a, b }) => a + b,
  {
    name: "add",
    description: "Adds two numbers",
    schema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  }
);
```

## 2. `DynamicStructuredTool` (Class-based Approach)
`DynamicStructuredTool` is a class that you instantiate to define a tool. It offers more explicit control.

**When to use:**
- **Explicit Control:** You need full control over the tool's properties (name, description, schema) in a structured way.
- **Complex Logic:** Your tool involves complex setup or dependencies that fit better in a class structure (though `DynamicStructuredTool` itself is just a wrapper).
- **Legacy/Standard Patterns:** You are following a codebase that consistently uses the class-based pattern for all tools.
- **Metadata:** You need to attach specific metadata or callbacks explicitly at instantiation.

**Example:**
```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const addTool = new DynamicStructuredTool({
  name: "add",
  description: "Adds two numbers",
  schema: z.object({
    a: z.number(),
    b: z.number(),
  }),
  func: async ({ a, b }) => {
    return a + b;
  },
});
```

## Summary
| Feature | `tool` | `DynamicStructuredTool` |
| :--- | :--- | :--- |
| **Syntax** | Functional wrapper | Class instantiation |
| **Boilerplate** | Low | Medium |
| **Use Case** | Quick, simple tools | Explicit, structured definitions |
| **Recommendation** | **Preferred for modern code** | Use for consistency in existing class-based code |

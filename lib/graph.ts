/**
 * LangGraph Agent
 * 
 * This module exports a unified agent that intelligently routes between:
 * - Simple conversation (direct LLM response)
 * - Document search (RAG retrieval from uploaded PDFs)
 * - Web search (Tavily API)
 * - Calendar operations (Google Calendar)
 * 
 * The agent automatically decides which tool(s) to use based on the user's query.
 */

// Export the agent created with modern LangChain API
export { agent } from "./agent";
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage } from "@langchain/core/messages";
import { model, tools } from "./agent";
import { MemorySaver } from "@langchain/langgraph";

import { RunnableConfig } from "@langchain/core/runnables";
import { SystemMessage, RemoveMessage } from "@langchain/core/messages";

/**
 * Assistant node - invokes the LLM with tools
 * This is called at the start and after each tool execution
 */
async function callModel(state: typeof MessagesAnnotation.State, config: RunnableConfig) {
    const sessionId = config.configurable?.thread_id || "NOT_AUTHENTICATED";

    const currentDateTime = new Date().toLocaleString('sv-SE').replace(' ', 'T');
    const timeZoneString = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const systemMessageContent = `You are DocuChat AI, a helpful AI assistant.

You have access to several tools:
- document_search: Search the user's uploaded PDF documents (IMPORTANT: always pass sessionId: "${sessionId}")
- web_search: Search the internet for current information
- create_calendar_event: Create calendar events with Google Meet links
- get-events: List calendar events
- delete_calendar_event: Delete calendar events
- add_expense: Add a new expense (amount, category, description)
- get_expenses: List expenses (supports date range and category filtering)
- delete_expense: Delete an expense by ID

Guidelines:
- When the user asks about uploaded documents or PDFs, use the document_search tool
- When asked about current events or information you don't know, use web_search
- For calendar requests, use the appropriate calendar tools and ALWAYS pass the sessionId "${sessionId}"
- For expense requests, use the expense tools and ALWAYS pass the sessionId "${sessionId}"
- Always pass the sessionId "${sessionId}" when using document_search
- Be concise, helpful, and accurate

EXPENSE LISTING INSTRUCTIONS:
When listing expenses, ALWAYS format them as a clean Markdown table.
- Do NOT include the "ID" column unless specifically asked.
- Columns should be: **Date** | **Category** | **Amount** | **Description**
- Format the date as YYYY-MM-DD.
- Example:
| Date | Category | Amount | Description |
|---|---|---|---|
| 2025-12-09 | Food | $20 | Lunch |

VISUALIZATION INSTRUCTIONS:
If the user asks to visualize expenses, show a graph, or see a breakdown, YOU MUST output the data in a specific JSON format wrapped in <expense-chart> tags.
Do NOT output the JSON inside a code block. Output it directly.

Format:
<expense-chart>
{
  "type": "bar" | "pie",
  "title": "Expense Breakdown",
  "data": [
    { "name": "Category Name", "value": 100, "fill": "#hexcolor" },
    ...
  ]
}
</expense-chart>

Example:
<expense-chart>
{
  "type": "pie",
  "title": "Expenses by Category",
  "data": [
    { "name": "Food", "value": 50, "fill": "#FF8042" },
    { "name": "Transport", "value": 30, "fill": "#0088FE" }
  ]
}
</expense-chart>

Current datetime: ${currentDateTime}
Current timezone string: ${timeZoneString}`;

    // Logic to trim history: keep only the last 20 messages to avoid token limits
    // We filter out the messages to be removed
    const messages = state.messages;
    const messagesToKeep = 10;

    if (messages.length > messagesToKeep) {
        // Calculate how many messages to remove from the beginning
        // We don't want to remove the very last message as it's the current input
        const numToRemove = messages.length - messagesToKeep;
        // Create RemoveMessage instances for the messages to be deleted
        // This is how LangGraph handles message deletion
        const messagesToRemove = messages.slice(0, numToRemove).map(m => new RemoveMessage({ id: m.id as string }));
        // We don't return these here, but we could if we wanted to clean up state explicitly. 
        // For now, we just slice the array we pass to the model.
    }

    // We only pass the recent messages to the model + the system message
    // The system message is NOT added to the state, it's just for this inference call
    const recentMessages = messages.slice(-messagesToKeep);

    const modelWithTools = model.bindTools(tools);
    const response = await modelWithTools.invoke([
        new SystemMessage(systemMessageContent),
        ...recentMessages
    ]);

    return { messages: [response] };
}

/**
 * Routing function - decides whether to continue to tools or end
 * This is the "brain" of the graph that makes routing decisions
 */
function shouldContinue(state: typeof MessagesAnnotation.State): "tools" | typeof END {
    const lastMessage = state.messages[state.messages.length - 1];

    // If the LLM makes a tool call, route to tools node
    if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
        console.log("🔧 Agent calling tools:", lastMessage.tool_calls.map(tc => tc.name).join(", "));
        return "tools";
    }

    // Otherwise, end the graph (LLM provided final answer)
    console.log("✅ Agent providing final response");
    return END;
}

/**
 * Tool execution node - runs the tools requested by the LLM
 */
const toolNode = new ToolNode(tools);


const checkpointer = new MemorySaver();

/**
 * Build and compile the graph
 * This is the manual version of what createAgent() does automatically
 */
export const graph = new StateGraph(MessagesAnnotation)
    .addNode("assistant", callModel)
    .addNode("tools", toolNode)
    .addEdge(START, "assistant")
    .addConditionalEdges("assistant", shouldContinue)
    .addEdge("tools", "assistant")
    .compile({ checkpointer });

// Export as 'agent' for compatibility with API route
export const graphAgent = graph;

console.log("LangGraph agent compiled successfully!");
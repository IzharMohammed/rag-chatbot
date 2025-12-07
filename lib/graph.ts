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

/**
 * Assistant node - invokes the LLM with tools
 * This is called at the start and after each tool execution
 */
async function callModel(state: typeof MessagesAnnotation.State) {
    const modelWithTools = model.bindTools(tools);
    const response = await modelWithTools.invoke(state.messages);
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
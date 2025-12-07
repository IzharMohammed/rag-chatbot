import { ChatGroq } from "@langchain/groq";
import { webSearchTool } from "../tools/web-search";
import { createEventTool, listEventsTool, deleteEventTool } from "../tools/calendar";
import { documentSearchTool } from "../tools/document-search";
import { createAgent } from "langchain";

// Initialize the model
export const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
    temperature: 0,
});

// Define all tools including document search
export const tools = [
    webSearchTool,
    createEventTool,
    listEventsTool,
    deleteEventTool,
    documentSearchTool, // RAG as a tool - agent decides when to use it
];

// Create the agent using modern LangChain API
// This automatically sets up the graph, routing, and tool execution
console.log("Creating Agent with tools:", tools.map(t => t.name).join(", "));
export const agent = createAgent({
    model,
    tools,
});
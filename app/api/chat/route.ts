import { NextResponse } from "next/server";
import { agent, graphAgent } from "@/lib/graph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CallbackHandler } from "@langfuse/langchain";
import { cookies } from "next/headers";

// Constants
const MAX_MESSAGE_LENGTH = 10000;

/**
 * Validates the incoming message
 * @param message - The user's message
 * @throws Error if validation fails
 */
function validateMessage(message: string): void {
    if (!message || typeof message !== 'string') {
        throw new Error("Message is required and must be a string");
    }

    if (message.trim().length === 0) {
        throw new Error("Message cannot be empty");
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }
}

export async function POST(req: Request) {
    try {
        // Parse and validate request
        const body = await req.json();
        const { message, sessionId } = body;

        validateMessage(message);

        // Validate sessionId
        if (!sessionId || sessionId.trim().length === 0) {
            throw new Error("Session ID is required for data isolation");
        }

        // Initialize Langfuse callback handler with dynamic session ID
        const langfuseHandler = new CallbackHandler({
            sessionId,
            userId: sessionId,
            tags: ["rag-chatbot", "production"],
        });

        const currentDateTime = new Date().toLocaleString('sv-SE').replace(' ', 'T');
        const timeZoneString = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // System message with tool instructions and sessionId context
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
- For calendar requests, use the appropriate calendar tools and ALWAYS pass the sessionId "${sessionId || 'NOT_AUTHENTICATED'}"
- For expense requests, use the expense tools and ALWAYS pass the sessionId "${sessionId || 'NOT_AUTHENTICATED'}"
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

        // Invoke the unified agent with Langfuse tracing
        const result = await graphAgent.invoke(
            {
                messages: [
                    new HumanMessage(message),
                ],
            },
            {
                configurable: { thread_id: sessionId },
                callbacks: [langfuseHandler], // Correct placement of callbacks
            },
        );

        const lastMessage = result.messages[result.messages.length - 1];

        return NextResponse.json({
            success: true,
            message: lastMessage.content,
        });

    } catch (error) {
        console.error("Error in chat endpoint:", error);

        // Determine appropriate status code and message
        let errorMessage = "An unexpected error occurred";
        let statusCode = 500;

        if (error instanceof Error) {
            errorMessage = error.message;

            // Check for rate limits or quota exceeded
            if (
                errorMessage.includes("413") ||
                errorMessage.includes("rate_limit_exceeded") ||
                errorMessage.includes("Request too large")
            ) {
                statusCode = 429; // Too Many Requests
                errorMessage = "Daily token limit exceeded or request too large. Please try again later or reduce message size.";
            } else if (
                errorMessage.includes("required") ||
                errorMessage.includes("cannot be empty") ||
                errorMessage.includes("exceeds maximum")
            ) {
                statusCode = 400;
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                message: errorMessage // Send the specific error message to frontend
            },
            { status: statusCode }
        );
    }
}


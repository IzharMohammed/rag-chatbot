import { NextResponse } from "next/server";
import { agent, graphAgent } from "@/lib/graph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CallbackHandler } from "@langfuse/langchain";

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

        console.log(`User message from session ${sessionId}:`, message);

        // Initialize Langfuse callback handler with dynamic session ID
        const langfuseHandler = new CallbackHandler({
            sessionId,
            userId: sessionId,
            tags: ["rag-chatbot", "production"],
        });

        // System message with tool instructions and sessionId context
        const systemMessageContent = `You are DocuChat AI, a helpful AI assistant.

You have access to several tools:
- document_search: Search the user's uploaded PDF documents (IMPORTANT: always pass sessionId: "${sessionId}")
- web_search: Search the internet for current information
- create_calendar_event: Create calendar events with Google Meet links
- get-events: List calendar events
- delete_calendar_event: Delete calendar events

Guidelines:
- When the user asks about uploaded documents or PDFs, use the document_search tool
- When asked about current events or information you don't know, use web_search
- For calendar requests, use the appropriate calendar tools
- Always pass the sessionId "${sessionId}" when using document_search
- Be concise, helpful, and accurate`;

        // Invoke the unified agent with Langfuse tracing
        const result = await graphAgent.invoke(
            {
                messages: [
                    new SystemMessage(systemMessageContent),
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

        // Determine appropriate status code
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        const statusCode =
            errorMessage.includes("required") ||
                errorMessage.includes("cannot be empty") ||
                errorMessage.includes("exceeds maximum") ? 400 : 500;

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                message: "Sorry, I encountered an error while processing your message. Please try again."
            },
            { status: statusCode }
        );
    }
}


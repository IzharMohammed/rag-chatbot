import { webSearch } from "@/lib/tools";
import { NextResponse } from "next/server";
import { baseMessages } from "@/lib/constant";
import { getGroqChatCompletion } from "@/lib/groq";
import { getVectorStore } from "@/lib/vectorstore";
import type { Document } from "@langchain/core/documents";

// Constants
const MAX_CONTEXT_CHUNKS = 4;
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

/**
 * Retrieves relevant context from Pinecone based on user query
 * Only searches within the specified namespace (user's documents)
 * @param query - The user's query
 * @param sessionId - Session ID for namespace isolation
 * @returns Contextualized message or original query
 */
async function getContextualizedMessage(query: string, sessionId: string): Promise<string> {
    try {
        const vectorStore = getVectorStore(sessionId); // User-specific namespace
        const relevantDocs: Document[] = await vectorStore.similaritySearch(query, MAX_CONTEXT_CHUNKS);

        if (relevantDocs.length > 0) {
            const context = relevantDocs
                .map((doc, index) => `[Document ${index + 1}]\\n${doc.pageContent}`)
                .join("\\n\\n");

            console.log(`Retrieved ${relevantDocs.length} relevant documents from Pinecone namespace: ${sessionId}`);
            console.log("Context preview:", context.substring(0, 200) + "...");

            // Augment the user's message with retrieved context
            return `Context from uploaded documents:
${context}

User Question: ${query}

Please answer the user's question based on the context provided above. If the context doesn't contain relevant information, let the user know.`;
        } else {
            console.log(`No relevant documents found in Pinecone namespace: ${sessionId}`);
            return query;
        }
    } catch (error) {
        console.error("Error retrieving from Pinecone:", error);
        // If retrieval fails, continue with original query
        return query;
    }
}

export async function POST(req: Request) {
    try {
        // Parse and validate request
        const body = await req.json();
        const { message, sessionId, useRAG } = body;

        validateMessage(message);

        // Validate sessionId
        if (!sessionId || sessionId.trim().length === 0) {
            throw new Error("Session ID is required for data isolation");
        }

        console.log(`User message from session ${sessionId}:`, message);
        console.log(`RAG Mode: ${useRAG}`);

        let contextualizedMessage = message;

        // Retrieve relevant context from Pinecone (user's namespace only) IF RAG mode is enabled
        if (useRAG) {
            contextualizedMessage = await getContextualizedMessage(message, sessionId);
        }

        // Add contextualized message to conversation history
        baseMessages.push({ role: 'user', content: contextualizedMessage });

        // Get initial response from LLM
        const chatCompletion = await getGroqChatCompletion(baseMessages);
        const aiMessage = chatCompletion.choices[0].message;

        if (!aiMessage || !aiMessage.content) {
            throw new Error("Invalid response from LLM");
        }

        console.log("AI response received");

        // Add AI response to conversation history
        baseMessages.push({
            role: 'assistant',
            content: aiMessage.content,
            tool_calls: aiMessage.tool_calls
        });

        // Handle tool calls (e.g., web search)
        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            for (const toolCall of aiMessage.tool_calls) {
                if (toolCall.function.name === "webSearch") {
                    const args = JSON.parse(toolCall.function.arguments);
                    console.log(`Tool call: webSearch with args:`, args);

                    let toolResult = "";
                    let attempts = 0;
                    const maxRetries = 3;

                    // Retry logic for web search
                    while (attempts < maxRetries) {
                        try {
                            toolResult = await webSearch(args);
                            console.log("Web search successful");
                            break;
                        } catch (error) {
                            attempts++;
                            console.error(`Web search failed (attempt ${attempts}/${maxRetries}):`, error);
                            if (attempts === maxRetries) {
                                toolResult = "Error: Failed to perform web search after multiple attempts.";
                            }
                        }
                    }

                    // Add tool result to conversation
                    baseMessages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        content: toolResult,
                    });
                }
            }

            // Get second response with tool results
            const secondChatCompletion = await getGroqChatCompletion(baseMessages);
            const secondAiMessage = secondChatCompletion.choices[0].message;

            if (!secondAiMessage || !secondAiMessage.content) {
                throw new Error("Invalid second response from LLM");
            }

            baseMessages.push({ role: 'assistant', content: secondAiMessage.content });

            return NextResponse.json({
                success: true,
                message: secondAiMessage.content,
                usage: secondChatCompletion.usage
            });
        }

        // Return initial response if no tool calls
        return NextResponse.json({
            success: true,
            message: aiMessage.content,
            usage: chatCompletion.usage
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


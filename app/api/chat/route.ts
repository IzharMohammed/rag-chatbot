
import { webSearch } from "@/lib/tools";
import { NextResponse } from "next/server";
import { baseMessages } from "@/lib/constant";
import { getGroqChatCompletion } from "@/lib/groq";
import { vectorStore } from "../upload-pdf/route";

export async function POST(req: Request) {
    const { message } = await req.json();
    console.log("message from frontend:-", message);

    // Retrieve relevant context from Pinecone
    let contextualizedMessage = message;
    try {
        console.log("calling similarity search");

        const relevantDocs = await vectorStore.similaritySearch(message, 4); // Get top 4 most relevant chunks

        if (relevantDocs.length > 0) {
            const context = relevantDocs
                .map((doc, index) => `[Document ${index + 1}]\n${doc.pageContent}`)
                .join("\n\n");

            console.log("Retrieved context from Pinecone:", context.substring(0, 200) + "...");

            // Augment the user's message with retrieved context
            contextualizedMessage = `Context from uploaded documents:
${context}

User Question: ${message}

Please answer the user's question based on the context provided above. If the context doesn't contain relevant information, let the user know.`;
        } else {
            console.log("No relevant documents found in Pinecone");
        }
    } catch (error) {
        console.error("Error retrieving from Pinecone:", error);
        // Continue without context if retrieval fails
    }

    baseMessages.push({ role: 'user', content: contextualizedMessage });

    const chatCompletion = await getGroqChatCompletion(baseMessages);
    const aiMessage = chatCompletion.choices[0].message;
    console.log("ai message:-", aiMessage);

    baseMessages.push({ role: 'assistant', content: aiMessage.content, tool_calls: aiMessage.tool_calls });

    if (aiMessage.tool_calls) {
        for (const toolCall of aiMessage.tool_calls) {
            if (toolCall.function.name === "webSearch") {
                const args = JSON.parse(toolCall.function.arguments);
                console.log(`Tool call received: webSearch with args: ${JSON.stringify(args)}`);

                let toolResult = "";
                let attempts = 0;
                const maxRetries = 3;

                while (attempts < maxRetries) {
                    try {
                        toolResult = await webSearch(args);
                        break; // Success, exit loop
                    } catch (error) {
                        attempts++;
                        console.error(`webSearch failed (attempt ${attempts}/${maxRetries}):`, error);
                        if (attempts === maxRetries) {
                            toolResult = "Error: Failed to perform web search after multiple attempts.";
                        }
                    }
                }

                baseMessages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    content: toolResult,
                });
            }
        }

        // Second call to LLM with tool results
        const secondChatCompletion = await getGroqChatCompletion(baseMessages);
        const secondAiMessage = secondChatCompletion.choices[0].message;

        baseMessages.push({ role: 'assistant', content: secondAiMessage.content });
        return NextResponse.json({
            message: secondAiMessage.content,
            usage: secondChatCompletion.usage
        });
    }

    return NextResponse.json({
        message: aiMessage.content,
        usage: chatCompletion.usage
    });
}
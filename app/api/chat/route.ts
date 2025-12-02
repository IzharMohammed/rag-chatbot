
import { webSearch } from "@/lib/tools";
import { NextResponse } from "next/server";
import { baseMessages } from "@/lib/constant";
import { getGroqChatCompletion } from "@/lib/groq";

export async function POST(req: Request) {
    const { message } = await req.json();
    console.log("message from frontend:-", message);

    baseMessages.push({ role: 'user', content: message });

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
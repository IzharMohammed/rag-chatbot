import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function getGroqChatCompletion(messages: any) {
    return groq.chat.completions.create({
        messages: messages,
        model: "moonshotai/kimi-k2-instruct-0905",
        tools: [
            {
                type: "function",
                function: {
                    name: "webSearch",
                    description: "Search the web for information.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "The search query.",
                            },
                        },
                        required: ["query"],
                    },
                },
            },
        ],
        tool_choice: "auto",
    });
}



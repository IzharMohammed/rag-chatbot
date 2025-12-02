import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
export const SUPPORTED_FILE_TYPES = {
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ANIMATION_DURATION = {
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
};

export const APP_NAME = 'DocuChat AI';
export const APP_DESCRIPTION = 'Intelligent document conversations powered by AI';


export const baseMessages = [
    {
        role: 'system',
        content: `You are a smart personal assistant.
                    If you know the answer to a question, answer it directly in plain English.
                    If the answer requires real-time, local, or up-to-date information, or if you don’t know the answer, use the available tools to find it.
                    You have access to the following tool:
                    webSearch(query: string): Use this to search the internet for current or unknown information.
                    Decide when to use your own knowledge and when to use the tool.
                    Do not mention the tool unless needed.

                    Examples:
                    Q: What is the capital of France?
                    A: The capital of France is Paris.

                    Q: What’s the weather in Mumbai right now?
                    A: (use the search tool to find the latest weather)

                    Q: Who is the Prime Minister of India?
                    A: The current Prime Minister of India is Narendra Modi.

                    Q: Tell me the latest IT news.
                    A: (use the search tool to get the latest news)

                    current date and time: ${new Date().toUTCString()}
                    
                    `,
    },
] as ChatCompletionMessageParam[];
export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface UploadedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    uploadedAt: Date;
}

export interface ChatSession {
    id: string;
    name: string;
    createdAt: Date;
    messages: Message[];
    files: UploadedFile[];
}

export interface TokenUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface DetailedTokenUsage {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
}

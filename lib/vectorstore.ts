import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

/**
 * Validates required environment variables for Pinecone and Google AI
 * @throws Error if required environment variables are missing
 */
function validateEnvVars(): void {
    const requiredVars = {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
    };

    const missingVars = Object.entries(requiredVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missingVars.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingVars.join(", ")}`
        );
    }
}

/**
 * Initialize and return the Pinecone vector store instance with namespace support
 * Each namespace provides complete data isolation (e.g., per-user storage)
 * @param namespace - Unique identifier for data isolation (e.g., userId or sessionId)
 * @returns PineconeStore instance configured for the specified namespace
 */
export function getVectorStore(namespace: string): PineconeStore {
    // Validate environment variables
    validateEnvVars();

    // Validate namespace
    if (!namespace || namespace.trim().length === 0) {
        throw new Error("Namespace is required for vector store isolation");
    }

    // Initialize embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY!,
        model: "text-embedding-004",
    });

    // Initialize Pinecone client
    const pinecone = new PineconeClient();
    const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Create vector store with namespace for data isolation
    const vectorStore = new PineconeStore(embeddings, {
        pineconeIndex,
        namespace, // ✅ Each user gets their own isolated namespace
        maxConcurrency: 5,
    });

    console.log(`Vector store initialized for namespace: ${namespace}`);

    return vectorStore;
}

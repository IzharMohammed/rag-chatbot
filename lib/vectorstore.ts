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
 * Initialize and return the Pinecone vector store instance
 * Singleton pattern to ensure only one instance is created
 */
let vectorStoreInstance: PineconeStore | null = null;

export function getVectorStore(): PineconeStore {
    if (vectorStoreInstance) {
        return vectorStoreInstance;
    }

    // Validate environment variables
    validateEnvVars();

    // Initialize embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY!,
        model: "text-embedding-004",
    });

    // Initialize Pinecone client
    const pinecone = new PineconeClient();
    const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Create vector store
    vectorStoreInstance = new PineconeStore(embeddings, {
        pineconeIndex,
        maxConcurrency: 5,
    });

    return vectorStoreInstance;
}

/**
 * Reset the vector store instance (useful for testing)
 */
export function resetVectorStore(): void {
    vectorStoreInstance = null;
}

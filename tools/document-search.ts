import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getVectorStore } from "@/lib/vectorstore";

/**
 * Document Search Tool
 * Searches through user's uploaded PDF documents using RAG
 * Automatically invoked by the agent when user asks about uploaded documents
 */
export const documentSearchTool = tool(
    async ({ query, sessionId }) => {
        try {
            const vectorStore = getVectorStore(sessionId);
            const relevantDocs = await vectorStore.similaritySearch(query, 4);

            if (relevantDocs.length === 0) {
                return "No relevant documents found in the uploaded files. The user may not have uploaded any documents yet, or the query doesn't match the document content.";
            }

            const context = relevantDocs
                .map((doc, index) => `[Document ${index + 1}]\n${doc.pageContent}`)
                .join("\n\n");

            return `Found ${relevantDocs.length} relevant document chunks:\n\n${context}`;
        } catch (error) {
            console.error("Error in document search:", error);
            return `Error searching documents: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
    {
        name: "document_search",
        description: "Search through the user's uploaded PDF documents to find relevant information. Use this tool when the user asks questions about their uploaded files, references specific documents, or asks 'what does the document say'. This tool performs semantic search across all documents in the user's session.",
        schema: z.object({
            query: z.string().describe("The search query to find relevant document chunks. Should be specific and related to what the user is asking about."),
            sessionId: z.string().describe("The user's session ID for namespace isolation. This ensures each user only searches their own documents."),
        }),
    }
);

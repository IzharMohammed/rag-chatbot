import { NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getVectorStore } from "@/lib/vectorstore";

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ["application/pdf"];
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MAX_CHUNKS_TO_RETURN = 5;

/**
 * Validates the uploaded file
 * @param file - The uploaded file
 * @throws Error if validation fails
 */
function validateFile(file: File): void {
    if (!file) {
        throw new Error("No file provided");
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error(`Invalid file type. Only PDF files are supported. Got: ${file.type}`);
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (file.size === 0) {
        throw new Error("File is empty");
    }
}

export async function POST(req: Request) {
    let filePath: string | null = null;

    try {
        // Parse form data
        const formData = await req.formData();
        const file = formData.get("file") as File;

        // Validate file
        validateFile(file);

        // Create uploads directory in /tmp (Vercel-compatible)
        const uploadsDir = "/tmp/uploads";
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Save file temporarily with sanitized filename
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        filePath = join(uploadsDir, `${Date.now()}_${sanitizedFileName}`);
        await writeFile(filePath, buffer);

        console.log(`File saved temporarily: ${filePath}`);

        // Load PDF using LangChain
        const loader = new PDFLoader(filePath, { splitPages: false });
        const docs = await loader.load();

        if (!docs || docs.length === 0) {
            throw new Error("Failed to load PDF or PDF is empty");
        }

        console.log(`Loaded ${docs.length} document(s) from PDF`);

        // Split documents into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP,
        });

        const splitDocs = await textSplitter.splitDocuments(docs);

        if (splitDocs.length === 0) {
            throw new Error("No text content found in PDF");
        }

        console.log(`Split into ${splitDocs.length} chunks`);

        // Add custom metadata
        const docsWithMetadata = splitDocs.map((doc, index) => ({
            ...doc,
            metadata: {
                ...doc.metadata,
                fileName: file.name,
                uploadDate: new Date().toISOString(),
                chunkIndex: index,
                totalChunks: splitDocs.length,
            }
        }));

        // Store embeddings in Pinecone vector database
        try {
            const vectorStore = getVectorStore();
            await vectorStore.addDocuments(docsWithMetadata);
            console.log(`Successfully stored ${splitDocs.length} chunks in Pinecone`);
        } catch (vectorError) {
            console.error("Error storing in Pinecone:", vectorError);
            throw new Error(`Failed to store vectors in Pinecone: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
        }

        // Clean up: Delete the temporary file
        if (filePath) {
            await unlink(filePath);
            console.log(`Temporary file deleted: ${filePath}`);
        }

        // Prepare response with preview chunks
        const chunks = splitDocs.map((doc, index) => ({
            id: `${file.name}-chunk-${index}`,
            content: doc.pageContent.substring(0, 200) + (doc.pageContent.length > 200 ? '...' : ''),
            metadata: docsWithMetadata[index].metadata,
        }));

        return NextResponse.json({
            success: true,
            fileName: file.name,
            fileSize: file.size,
            totalPages: docs.length,
            totalChunks: splitDocs.length,
            chunks: chunks.slice(0, MAX_CHUNKS_TO_RETURN),
            message: `Successfully processed and stored ${splitDocs.length} chunks from ${file.name}`,
        });

    } catch (error) {
        console.error("Error processing PDF:", error);

        // Clean up file if it exists
        if (filePath) {
            try {
                await unlink(filePath);
                console.log(`Cleaned up temporary file after error: ${filePath}`);
            } catch (unlinkError) {
                console.error("Failed to clean up temporary file:", unlinkError);
            }
        }

        // Return appropriate error message
        const errorMessage = error instanceof Error ? error.message : "Failed to process PDF";
        const statusCode = errorMessage.includes("No file provided") ||
            errorMessage.includes("Invalid file type") ||
            errorMessage.includes("File size exceeds") ||
            errorMessage.includes("File is empty") ? 400 : 500;

        return NextResponse.json(
            {
                success: false,
                error: errorMessage
            },
            { status: statusCode }
        );
    }
}

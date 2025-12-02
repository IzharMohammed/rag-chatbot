import { NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), "uploads");
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Save file temporarily
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = join(uploadsDir, file.name);
        await writeFile(filePath, buffer);

        // Load PDF using LangChain
        const loader = new PDFLoader(filePath);
        const docs = await loader.load();

        console.log(`Loaded ${docs.length} pages from PDF`);

        // Split documents into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const splitDocs = await textSplitter.splitDocuments(docs);
        console.log(`Split into ${splitDocs.length} chunks`);

        // TODO: Store embeddings in vector database
        // For now, just return the chunks
        const chunks = splitDocs.map((doc: any, index: number) => ({
            id: `${file.name}-chunk-${index}`,
            content: doc.pageContent,
            metadata: doc.metadata,
        }));

        return NextResponse.json({
            success: true,
            fileName: file.name,
            totalPages: docs.length,
            totalChunks: chunks.length,
            chunks: chunks.slice(0, 5), // Return first 5 chunks as preview
        });
    } catch (error) {
        console.error("Error processing PDF:", error);
        return NextResponse.json(
            { error: "Failed to process PDF" },
            { status: 500 }
        );
    }
}

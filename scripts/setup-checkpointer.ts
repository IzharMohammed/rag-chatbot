
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Initializing Postgres Checkpointer tables...");

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const checkpointer = new PostgresSaver(pool);
        await checkpointer.setup();
        console.log("✅ Checkpointer tables created successfully.");
    } catch (error) {
        console.error("❌ Error setting up checkpointer:", error);
    } finally {
        await pool.end();
    }
}

main().catch(console.error);

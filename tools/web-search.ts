import { tavily } from "@tavily/core";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Original function (kept for backward compatibility if needed, though we will use the tool)
async function webSearchFunction({ query }: { query: string }) {
    const response = await tvly.search(query, {
        limit: 3,
    });
    console.log("response", response);

    const finalResult = response.results.map(res => res.content).join("\n\n");

    return finalResult;
}

export const webSearchTool = tool(
    async ({ query }) => {
        return await webSearchFunction({ query });
    },
    {
        name: "web_search",
        description: "Search the web for information",
        schema: z.object({
            query: z.string().describe("The search query"),
        }),
    }
);

export { webSearchFunction as webSearch };
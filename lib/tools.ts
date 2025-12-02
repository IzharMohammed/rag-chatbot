import { tavily } from "@tavily/core";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

export async function webSearch({ query }: { query: string }) {
    const response = await tvly.search(query, {
        limit: 10,
    });

    const finalResult = response.results.map(res => res.content).join("\n\n");

    return finalResult;
}
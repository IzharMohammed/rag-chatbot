/**
 * Next.js Instrumentation
 * This file is automatically loaded by Next.js when the app starts
 * Used for OpenTelemetry and Langfuse observability
 */

export async function register() {
    // Only run on server-side
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { NodeSDK } = await import('@opentelemetry/sdk-node');
        const { LangfuseSpanProcessor } = await import('@langfuse/otel');

        const sdk = new NodeSDK({
            spanProcessors: [new LangfuseSpanProcessor()],
        });

        sdk.start();

        console.log('✅ OpenTelemetry initialized with Langfuse');
    }
}
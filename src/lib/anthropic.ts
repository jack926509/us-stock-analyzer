import Anthropic from "@anthropic-ai/sdk"

// Single shared client across API routes. The SDK is safe to reuse and
// routes are short-lived per request, but instantiating it module-scope
// lets us keep HTTP connection pools warm across invocations.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

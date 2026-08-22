# Verified Provider API Specifications (2026-02-10)

> # VERDICT: REFERENCE — recorded 2026-08-22
>
> Provider API specifications verified on **2026-02-10**. Received knowledge about third-party
> APIs, six months old and never re-verified — treat every version and endpoint in it as a
> claim about February, not about now. Useful as a starting point, never as ground truth.
>
> The original document is unchanged below this banner.


All specs sourced from official documentation fetched live. Each section notes the documentation URL and last-verified date.

---

## 1. Anthropic Messages API

**Source**: https://platform.claude.com/docs/en/api/messages (redirected from docs.anthropic.com)
**Verified**: 2026-02-10

### Endpoint
```
POST https://api.anthropic.com/v1/messages
```

### Required Headers
```http
Content-Type: application/json
anthropic-version: 2023-06-01
X-Api-Key: $ANTHROPIC_API_KEY
```

### Optional/Beta Headers
```http
anthropic-beta: prompt-caching-2024-07-16     # For prompt caching
anthropic-beta: compact-2026-01-12            # For compaction feature
```

### Request Body Schema (Full)
```typescript
{
  // REQUIRED
  model: string,                    // e.g. "claude-opus-4-6", "claude-sonnet-4-5-20250514"
  max_tokens: number,               // Model-dependent maximum
  messages: MessageParam[],         // Conversation turns

  // OPTIONAL - System & Config
  system?: string | TextBlockParam[],  // System prompt (NOT role:"system")
  temperature?: number,             // 0.0-1.0, default 1.0
  top_p?: number,                   // Nucleus sampling
  top_k?: number,                   // Top-K sampling
  stop_sequences?: string[],        // Custom stop triggers

  // OPTIONAL - Advanced
  stream?: boolean,                 // Enable SSE streaming
  thinking?: ThinkingConfigParam,   // Extended thinking
  output_config?: {                 // Output format
    effort?: "low" | "medium" | "high" | "max",
    format?: { type: "json_schema", schema: object }
  },
  service_tier?: "auto" | "standard_only",
  inference_geo?: string,           // Geographic region

  // OPTIONAL - Tools
  tools?: ToolUnion[],              // Tool definitions
  tool_choice?: ToolChoice,         // How to use tools

  // OPTIONAL - Compaction (BETA)
  context_management?: {
    edits: [
      {
        type: "compact_20260112",
        trigger?: { type: "input_tokens", value: number }  // e.g. 100000
      }
    ]
  },

  // OPTIONAL - Metadata
  metadata?: { user_id?: string }   // UUID/hash, no PII
}
```

### Message Format
```typescript
interface MessageParam {
  role: "user" | "assistant",
  content: string | ContentBlockParam[]
}

// Content block types:
// TextBlockParam, ImageBlockParam, DocumentBlockParam,
// ToolUseBlockParam, ToolResultBlockParam, ThinkingBlockParam,
// RedactedThinkingBlockParam, ServerToolUseBlockParam,
// WebSearchToolResultBlockParam, SearchResultBlockParam
```

### Tool Definition Format
```typescript
// Custom tool
{
  type: "custom",        // NOTE: type field exists but is often omitted in older docs
  name: string,
  description: string,   // Strongly recommended
  input_schema: {
    type: "object",
    properties: { /* JSON Schema */ },
    required: string[]
  },
  cache_control?: { type: "ephemeral", ttl?: "5m" | "1h" },
  strict?: boolean       // Enforce schema validation
}

// Server tools (pre-built)
{ type: "bash_20250124", name: "bash" }
{ type: "text_editor_20250124", name: "str_replace_editor" }
{ type: "text_editor_20250429", name: "str_replace_based_edit_tool" }
{ type: "text_editor_20250728", name: "str_replace_based_edit_tool", max_characters?: number }
{ type: "web_search_20250305", name: "web_search", max_uses?: number, allowed_domains?: string[], blocked_domains?: string[] }
```

### Tool Choice
```typescript
type ToolChoice =
  | { type: "auto", disable_parallel_tool_use?: boolean }   // Default
  | { type: "any", disable_parallel_tool_use?: boolean }
  | { type: "tool", name: string, disable_parallel_tool_use?: boolean }
  | { type: "none" }
```

### Thinking Configuration
```typescript
type ThinkingConfigParam =
  | { type: "enabled", budget_tokens: number }   // Min 1024, < max_tokens
  | { type: "disabled" }
  | { type: "adaptive" }                         // NEW in Opus 4.6
```

### Response Body Schema
```typescript
{
  id: string,
  type: "message",
  role: "assistant",
  model: string,
  content: ContentBlock[],           // text, thinking, tool_use, etc.
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | "pause_turn" | "refusal",
  stop_sequence?: string,
  usage: {
    input_tokens: number,
    output_tokens: number,
    cache_creation_input_tokens: number,   // Tokens used to CREATE cache
    cache_read_input_tokens: number,       // Tokens READ from cache (90% cheaper)
    cache_creation?: {
      ephemeral_5m_input_tokens: number,
      ephemeral_1h_input_tokens: number
    },
    server_tool_use?: {
      web_search_requests: number
    },
    inference_geo?: string,
    service_tier?: "standard" | "priority" | "batch"
  }
}
```

**IMPORTANT**: Total input = `input_tokens` + `cache_creation_input_tokens` + `cache_read_input_tokens`

### Content Block Types in Response
```typescript
// Text
{ type: "text", text: string, citations?: TextCitation[] }

// Thinking (extended thinking)
{ type: "thinking", thinking: string, signature: string }

// Redacted thinking
{ type: "redacted_thinking", data: string }

// Tool use
{ type: "tool_use", id: string, name: string, input: object }

// Server tool use (web search)
{ type: "server_tool_use", id: string, name: "web_search", input: object }

// Compaction (when compaction triggers)
{ type: "compaction", summary: string }
```

### Tool Result Format (user turn)
```typescript
{
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: string,        // Must match tool_use.id
      content: string | ContentBlockParam[],
      is_error?: boolean
    }
  ]
}
```

### Prompt Caching
- Add `cache_control: { type: "ephemeral", ttl?: "5m" | "1h" }` to any text/image/document block
- Minimum prefix: varies by model (typically 1024+ tokens)
- Cache hits billed at **10% of input token price** (90% savings)
- TTL: 5 minutes default, optionally 1 hour
- Requires header: `anthropic-beta: prompt-caching-2024-07-16`

### Compaction (Beta)
- **Header**: `anthropic-beta: compact-2026-01-12`
- **Request field**: `context_management.edits: [{ type: "compact_20260112", trigger?: { type: "input_tokens", value: 100000 } }]`
- **How it works**: When input tokens exceed trigger threshold, Claude auto-summarizes conversation. Returns a `compaction` content block. On next request, API drops all message blocks before the compaction block.
- **Supported models**: Claude Opus 4.6 (confirmed), Claude Sonnet 4.5 (confirmed in context editing docs)
- **Cost**: Compaction itself generates output tokens (the summary). Subsequent requests use fewer input tokens.

### Streaming (SSE)
Events in order: `message_start` -> `content_block_start` -> `content_block_delta` -> `content_block_stop` -> `message_delta` (usage) -> `message_stop`

### Token Counting Endpoint
```
POST https://api.anthropic.com/v1/messages/count_tokens
```
Same request body as Messages. Returns `{ input_tokens, cache_creation_input_tokens?, cache_read_input_tokens? }`

---

## 2. OpenAI Chat Completions API

**Source**: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
**Verified**: 2026-02-10

### Endpoint
```
POST https://api.openai.com/v1/chat/completions
```

### Required Headers
```http
Content-Type: application/json
Authorization: Bearer $OPENAI_API_KEY
```

### Request Body Schema (Full)
```typescript
{
  // REQUIRED
  model: string,                    // e.g. "gpt-5.2", "gpt-4o", "o4-mini"
  messages: ChatCompletionMessage[], // Conversation turns

  // OPTIONAL - Generation
  temperature?: number,             // 0-2, default 1
  top_p?: number,                   // Nucleus sampling
  n?: number,                       // Number of completions (usually 1)
  max_completion_tokens?: number,   // Max output tokens (preferred over max_tokens)
  max_tokens?: number,              // Deprecated, use max_completion_tokens
  stop?: string | string[],         // Stop sequences
  presence_penalty?: number,        // -2.0 to 2.0
  frequency_penalty?: number,       // -2.0 to 2.0
  logit_bias?: Record<string, number>,
  logprobs?: boolean,
  top_logprobs?: number,            // 0-20

  // OPTIONAL - Tools
  tools?: ChatCompletionTool[],
  tool_choice?: "auto" | "none" | "required" | { type: "function", function: { name: string } },
  parallel_tool_calls?: boolean,    // Default: true

  // OPTIONAL - Output Format
  response_format?: { type: "text" } | { type: "json_object" } | { type: "json_schema", json_schema: { name: string, strict?: boolean, schema: object } },
  verbosity?: "low" | "medium" | "high",  // NEW: controls response verbosity

  // OPTIONAL - Streaming
  stream?: boolean,
  stream_options?: {
    include_usage?: boolean,        // If true, final SSE chunk includes usage
    include_obfuscation?: boolean   // Normalizes traffic
  },

  // OPTIONAL - Caching & Cost Optimization
  prompt_cache_key?: string,        // Routes to same server for cache matching (replaces "user")
  prompt_cache_retention?: "in-memory" | "24h",  // Extended caching up to 24h
  service_tier?: "auto" | "default" | "flex" | "scale" | "priority",

  // OPTIONAL - Reasoning (for o-series models)
  reasoning_effort?: "low" | "medium" | "high",

  // OPTIONAL - Prediction
  prediction?: {
    type: "content",
    content: string | ContentPart[]
  },

  // OPTIONAL - Modalities
  modalities?: ("text" | "audio")[],
  audio?: { voice: string, format: string },

  // OPTIONAL - Web Search
  web_search_options?: { /* web search config */ },

  // OPTIONAL - Metadata
  safety_identifier?: string,       // End-user ID (replaces deprecated "user")
  user?: string,                    // DEPRECATED, use safety_identifier + prompt_cache_key
  store?: boolean,                  // Server-side retention
  metadata?: Record<string, string>,
  seed?: number
}
```

### Message Format
```typescript
// System message
{ role: "system", content: string | ContentPart[] }

// User message
{ role: "user", content: string | ContentPart[] }

// Assistant message
{ role: "assistant", content: string | null, tool_calls?: ToolCall[] }

// Tool result message
{ role: "tool", tool_call_id: string, content: string }

// Developer message (newer alternative to system)
{ role: "developer", content: string | ContentPart[] }
```

### Tool Definition Format
```typescript
// Function tool
{
  type: "function",
  function: {
    name: string,                    // a-z, A-Z, 0-9, underscores, dashes, max 64
    description?: string,
    parameters?: object,             // JSON Schema
    strict?: boolean                 // Enforce schema validation
  }
}

// Custom tool (newer)
{
  type: "custom",
  custom: { name: string }
}
```

### Response Body Schema
```typescript
{
  id: string,                        // e.g. "chatcmpl-..."
  object: "chat.completion",
  created: number,                   // Unix timestamp
  model: string,
  choices: [{
    index: number,
    message: {
      role: "assistant",
      content: string | null,
      refusal?: string | null,
      tool_calls?: [{
        id: string,
        type: "function",
        function: {
          name: string,
          arguments: string           // JSON string
        }
      }]
    },
    finish_reason: "stop" | "length" | "tool_calls" | "content_filter"
  }],
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number,
    prompt_tokens_details: {
      cached_tokens: number          // AUTOMATIC - tokens served from cache
    },
    completion_tokens_details: {
      reasoning_tokens: number,      // For o-series models
      accepted_prediction_tokens: number,
      rejected_prediction_tokens: number
    }
  },
  system_fingerprint?: string,
  service_tier?: string
}
```

### Prompt Caching (AUTOMATIC)
- **No configuration required** - works automatically on all requests for gpt-4o and newer
- Minimum prefix: **1024 tokens**
- Cache matches based on identical prompt prefix
- `prompt_cache_key`: Optional string to route requests to same server for higher cache hit rate
- `prompt_cache_retention`: `"in-memory"` (default, ~5-10 min) or `"24h"` (extended)
- **Discount**: 50% off cached input tokens (NOT 90% like Anthropic)
- **Visible in response**: `usage.prompt_tokens_details.cached_tokens`
- **No extra headers needed** - fully automatic

### Streaming
- Enable with `stream: true`
- Use `stream_options: { include_usage: true }` to get token usage in the final SSE chunk
- SSE format: `data: {chunk_json}\n\n` then `data: [DONE]\n\n`

### Key Differences from Anthropic
1. System prompt via `role: "system"` message (not top-level `system` param)
2. Tool results via `role: "tool"` message with `tool_call_id` (not `tool_result` content block)
3. `tool_calls[].function.arguments` is a JSON **string** (must parse)
4. `finish_reason: "tool_calls"` (not `stop_reason: "tool_use"`)
5. Caching is automatic, no explicit `cache_control` blocks needed
6. No separate `cache_creation_input_tokens` / `cache_read_input_tokens` - just `cached_tokens`

---

## 3. Google Gemini generateContent API

**Source**: https://ai.google.dev/api/generate-content, https://ai.google.dev/gemini-api/docs/text-generation
**Verified**: 2026-02-10

### Endpoints
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent
```

### Authentication
```http
# Option 1: API Key as query param
?key={API_KEY}

# Option 2: API Key as header
x-goog-api-key: {API_KEY}

# Option 3: OAuth2 Bearer token
Authorization: Bearer {ACCESS_TOKEN}
```

### Request Body Schema
```typescript
{
  contents: Content[],               // Conversation turns
  systemInstruction?: Content,       // System instruction (text only)
  generationConfig?: GenerationConfig,
  tools?: Tool[],                    // Function declarations
  toolConfig?: ToolConfig,           // Tool use configuration
  cachedContent?: string,            // Format: "cachedContents/{id}"
  safetySettings?: SafetySetting[]
}

interface Content {
  role: "user" | "model",            // NOTE: "model" not "assistant"
  parts: Part[]
}

interface Part {
  // One of:
  text?: string,
  inlineData?: { mimeType: string, data: string },  // Base64
  fileData?: { mimeType: string, fileUri: string },
  functionCall?: { name: string, args: object },
  functionResponse?: { name: string, response: object },

  // Thinking-specific (output only)
  thought?: boolean,                 // Indicates thought part
  thoughtSignature?: string          // Opaque, base64-encoded, for multi-turn
}

interface GenerationConfig {
  temperature?: number,              // 0.0-2.0
  topP?: number,
  topK?: number,
  maxOutputTokens?: number,
  stopSequences?: string[],
  candidateCount?: number,
  responseMimeType?: string,         // "application/json" for JSON mode
  responseSchema?: object,           // JSON Schema for structured output
  thinkingConfig?: {
    thinkingBudget?: number          // Min 0 (off), -1 (dynamic), or positive int
  }
}
```

### Tool/Function Calling Format
```typescript
interface Tool {
  functionDeclarations?: FunctionDeclaration[]
}

interface FunctionDeclaration {
  name: string,
  description: string,
  parameters?: {                     // OpenAPI schema subset
    type: string,
    properties: Record<string, { type: string, description?: string, enum?: string[] }>,
    required?: string[]
  }
}

interface ToolConfig {
  functionCallingConfig?: {
    mode: "AUTO" | "ANY" | "NONE",   // AUTO=default, ANY=force, NONE=disable
    allowedFunctionNames?: string[]  // Only with mode=ANY
  }
}
```

### Response Body Schema
```typescript
{
  candidates: [{
    content: {
      role: "model",
      parts: Part[]                  // text, functionCall, thought parts
    },
    finishReason: "STOP" | "MAX_TOKENS" | "SAFETY" | "RECITATION" | "OTHER" | "BLOCKLIST" | "PROHIBITED_CONTENT",
    safetyRatings: SafetyRating[],
    index: number,
    groundingMetadata?: object,
    avgLogprobs?: number
  }],
  usageMetadata: {
    promptTokenCount: number,
    candidatesTokenCount: number,    // Output tokens
    totalTokenCount: number,
    cachedContentTokenCount?: number, // Tokens from explicit cache
    thoughtsTokenCount?: number       // Thinking tokens (when thinking enabled)
  },
  modelVersion?: string,
  promptFeedback?: { blockReason?: string, safetyRatings: SafetyRating[] }
}
```

### Function Call Response (model output)
```typescript
// Model returns:
{ functionCall: { name: "get_weather", args: { location: "London" } } }

// You respond with:
{
  role: "user",    // NOTE: function responses go in user turn (or model turn depending on SDK)
  parts: [{
    functionResponse: {
      name: "get_weather",
      response: { temperature: 15, condition: "cloudy" }
    }
  }]
}
```

### Thinking / Thought Signatures
- Enable via `generationConfig.thinkingConfig.thinkingBudget`
- `thinkingBudget: 0` = off, `-1` = dynamic, positive int = token budget
- Response `parts` include `{ thought: true, text: "...", thoughtSignature: "base64..." }`
- **CRITICAL**: `thoughtSignature` must be echoed back in multi-turn conversations
- Thought parts appear BEFORE the regular text parts in the response
- `usageMetadata.thoughtsTokenCount` tracks thinking tokens
- **Known issue (2026-02-09)**: "Thought signature is not valid" errors in Gemini 3 multi-turn tool calling

### Context Caching (Explicit)
- **Create cache**: `POST /v1beta/cachedContents`
- **Use cache**: Include `cachedContent: "cachedContents/{id}"` in generateContent request
- **TTL**: Configurable, defaults to 1 hour. No min/max bounds.
- **Min tokens**: 1024 (Gemini 3 Flash), 4096 (Gemini 3 Pro, 2.5 Pro)
- **Pricing**: Cached tokens billed at reduced rate. Storage charged based on TTL * token count.
- **Implicit caching**: Also available automatically for repeated prefixes (similar to OpenAI). Visible in `usage_metadata` response.

### Key Differences from OpenAI/Anthropic
1. Role names: `"model"` instead of `"assistant"`
2. Content structure: `parts[]` array (not `content` string)
3. Function calls are `Part` objects within `content.parts`, not separate structures
4. No `tool_call_id` - function responses matched by `name` field
5. Auth via API key header `x-goog-api-key` or query param `?key=`
6. Usage fields are camelCase: `promptTokenCount`, `candidatesTokenCount`
7. Explicit cache management API (create/get/list/delete caches)
8. `thoughtSignature` must be preserved and echoed for multi-turn thinking

---

## 4. xAI Chat Completions API

**Source**: https://docs.x.ai/developers/api-reference, https://docs.x.ai/docs/key-information/consumption-and-rate-limits
**Verified**: 2026-02-10

### Endpoint
```
POST https://api.x.ai/v1/chat/completions
```

**Note**: xAI also has a newer **Responses API** at `/v1/responses` which supports `previous_response_id` for stateful conversations. The Chat Completions endpoint is now labeled "legacy" by xAI but remains fully functional.

### Required Headers
```http
Content-Type: application/json
Authorization: Bearer $XAI_API_KEY
```

### Optional Caching Header
```http
x-grok-conv-id: {conversation_id}
```
This **increases the likelihood of cache hits** by routing requests to the same cluster. It does NOT guarantee caching - caching is automatic via prefix matching regardless. The header just improves hit rates.

### Request Body Schema
**Fully OpenAI-compatible**. Same schema as OpenAI Chat Completions:
```typescript
{
  model: string,                     // e.g. "grok-4", "grok-4-0709", "grok-4-1-fast"
  messages: Message[],               // Same format as OpenAI
  temperature?: number,
  top_p?: number,
  max_tokens?: number,
  stop?: string | string[],
  stream?: boolean,
  tools?: Tool[],                    // Same format as OpenAI function tools
  tool_choice?: string | object,     // Same as OpenAI
  response_format?: object,          // JSON mode support
  n?: number,                        // Must be 1
  // ... all other OpenAI-compatible params
}
```

### Response Body Schema
```typescript
{
  id: string,
  object: "chat.completion",
  created: number,
  model: string,
  choices: [{
    index: number,
    message: {
      role: "assistant",
      content: string | null,
      refusal: null,
      tool_calls?: [{                // Same format as OpenAI
        id: string,
        type: "function",
        function: { name: string, arguments: string }
      }]
    },
    finish_reason: "stop" | "length" | "tool_calls"
  }],
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number,
    prompt_tokens_details: {
      text_tokens: number,
      audio_tokens: number,          // Always 0 currently
      image_tokens: number,
      cached_tokens: number          // AUTOMATIC cached tokens
    },
    completion_tokens_details: {
      reasoning_tokens: number,      // For reasoning models (grok-4)
      audio_tokens: number,
      accepted_prediction_tokens: number,
      rejected_prediction_tokens: number
    },
    num_sources_used?: number        // For web search
  },
  system_fingerprint?: string
}
```

### Prompt Caching
- **Automatic**: Enabled for all requests without user configuration
- **Mechanism**: Prefix matching on prompt tokens
- **Header `x-grok-conv-id`**: Optional, increases cache hit likelihood by routing to same cluster
- **Cache duration**: ~5 minutes (similar to OpenAI)
- **Discount**: 50-75% on cached prompt tokens (varies by model)
- **Visible in response**: `usage.prompt_tokens_details.cached_tokens`

### Responses API (Newer, Stateful)
```
POST https://api.x.ai/v1/responses
```
- Supports `previous_response_id` for server-side conversation state
- Responses stored for 30 days
- Automatic caching of conversation history
- Encrypted thinking content support for reasoning models

### Key Differences from OpenAI
1. Base URL: `https://api.x.ai` (not `https://api.openai.com`)
2. `usage.prompt_tokens_details` includes `text_tokens`, `image_tokens` breakdown (OpenAI only has `cached_tokens`)
3. `num_sources_used` field for web search queries
4. `x-grok-conv-id` header for cache routing (OpenAI uses `prompt_cache_key`)
5. Chat Completions labeled "legacy" - Responses API is preferred
6. Reasoning tokens visible in `completion_tokens_details.reasoning_tokens` for Grok 4
7. `total_tokens` can be > prompt_tokens + completion_tokens (includes reasoning tokens)

---

## 5. Groq API

**Source**: https://console.groq.com/docs/api-reference, https://console.groq.com/docs/openai
**Verified**: 2026-02-10

### Endpoint
```
POST https://api.groq.com/openai/v1/chat/completions
```
Note the `/openai/` path prefix - this is intentional for OpenAI SDK compatibility.

### Required Headers
```http
Content-Type: application/json
Authorization: Bearer $GROQ_API_KEY
```

### Request Body Schema
Mostly OpenAI-compatible with some additions:
```typescript
{
  // REQUIRED
  model: string,                     // e.g. "llama-3.3-70b-versatile", "openai/gpt-oss-120b"
  messages: Message[],               // OpenAI format

  // OPTIONAL - Standard
  temperature?: number,              // Must be > 0 (0 auto-converts to 1e-8)
  top_p?: number,
  max_tokens?: number,
  max_completion_tokens?: number,
  stop?: string | string[],
  stream?: boolean,
  n?: number,                        // Must be 1

  // OPTIONAL - Tools
  tools?: Tool[],                    // OpenAI function tool format
  tool_choice?: string | object,
  parallel_tool_calls?: boolean,
  disable_tool_validation?: boolean, // Groq-specific: default false

  // OPTIONAL - Output Format
  response_format?: object,          // JSON mode / JSON schema

  // OPTIONAL - Groq-Specific
  citation_options?: "enabled" | "disabled",  // Default: enabled
  compound_custom?: object,          // Custom config for Compound models
  include_reasoning?: boolean,       // Return reasoning in response
  reasoning_effort?: "low" | "medium" | "high",  // For GPT-OSS models
  reasoning_format?: "parsed" | "raw" | "hidden",

  // OPTIONAL - Streaming
  stream_options?: { include_usage?: boolean },

  // OPTIONAL - Metadata
  user?: string,
  seed?: number
}
```

### Response Body Schema
```typescript
{
  id: string,
  object: "chat.completion",
  created: number,
  model: string,
  choices: [{
    index: number,
    message: {
      role: "assistant",
      content: string | null,
      tool_calls?: [{                // Same as OpenAI format
        id: string,
        type: "function",
        function: { name: string, arguments: string }
      }]
    },
    finish_reason: "stop" | "length" | "tool_calls"
  }],
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number,
    prompt_time: number,             // GROQ-SPECIFIC: seconds
    completion_time: number,         // GROQ-SPECIFIC: seconds
    queue_time: number,              // GROQ-SPECIFIC: seconds
    total_time: number               // GROQ-SPECIFIC: seconds
  },
  system_fingerprint?: string,
  x_groq?: {                        // GROQ-SPECIFIC metadata
    id: string
  }
}
```

### Responses API (Also supported)
```
POST https://api.groq.com/openai/v1/responses
```
- OpenAI Responses API compatible
- Usage includes `input_tokens_details.cached_tokens` and `output_tokens_details.reasoning_tokens`

### Prompt Caching
- **Automatic for GPT-OSS models**: `openai/gpt-oss-120b` has automatic prompt caching
- **Discount**: 50% on cached input tokens ($0.075/M vs $0.15/M for gpt-oss-120b)
- **Latency benefit**: Lower latency + cached tokens don't count toward rate limits
- **Zero setup**: Automatic when requests share common prefixes
- **Visible in**: Responses API `usage.input_tokens_details.cached_tokens`
- **NOT available**: For most Llama/Mixtral models (only GPT-OSS currently)

### Tool Use (Function Calling)
- **Format**: Identical to OpenAI (`type: "function"`, `function: { name, description, parameters }`)
- **Built-in tools**: Groq offers `browser_search` and `code_interpreter` as server-side tool types
- **Supported models**: Most LLaMA 3+ models, GPT-OSS models, Qwen models

### Key Differences from OpenAI
1. **Base URL**: `https://api.groq.com/openai/v1/` (note `/openai/` prefix)
2. **Temperature**: Cannot be exactly 0 (auto-converts to 1e-8)
3. **n parameter**: Must be 1 (no multiple completions)
4. **Usage includes timing**: `prompt_time`, `completion_time`, `queue_time`, `total_time` in seconds
5. **x_groq metadata**: Extra Groq-specific metadata object in response
6. **Groq-specific params**: `citation_options`, `compound_custom`, `include_reasoning`, `reasoning_format`, `disable_tool_validation`
7. **No `prompt_cache_key`**: No equivalent to OpenAI's cache routing
8. **Speed metrics**: Can calculate tokens/second from `usage.completion_tokens / usage.completion_time`
9. **Unsupported OpenAI features**: Some response formats, audio modalities, certain streaming options

---

## Cross-Provider Comparison Matrix

### Endpoint URLs
| Provider | URL |
|----------|-----|
| Anthropic | `POST https://api.anthropic.com/v1/messages` |
| OpenAI | `POST https://api.openai.com/v1/chat/completions` |
| Gemini | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| xAI | `POST https://api.x.ai/v1/chat/completions` |
| Groq | `POST https://api.groq.com/openai/v1/chat/completions` |

### Authentication
| Provider | Method |
|----------|--------|
| Anthropic | `X-Api-Key: {key}` + `anthropic-version: 2023-06-01` |
| OpenAI | `Authorization: Bearer {key}` |
| Gemini | `x-goog-api-key: {key}` OR `?key={key}` OR `Authorization: Bearer {oauth_token}` |
| xAI | `Authorization: Bearer {key}` |
| Groq | `Authorization: Bearer {key}` |

### Caching Mechanisms
| Provider | Type | Discount | Min Tokens | TTL | Config |
|----------|------|----------|------------|-----|--------|
| Anthropic | Explicit (`cache_control` blocks) | 90% on reads | ~1024+ | 5min or 1hr | `anthropic-beta` header + `cache_control` on blocks |
| OpenAI | Automatic (prefix matching) | 50% | 1024 | ~5-10min or 24h | `prompt_cache_key` (optional), `prompt_cache_retention` |
| Gemini | Explicit (create cached content) + Implicit | Reduced rate + storage cost | 1024-4096 | Configurable TTL | `cachedContent` field in request |
| xAI | Automatic (prefix matching) | 50-75% | Varies | ~5min | `x-grok-conv-id` header (optional, improves hit rate) |
| Groq | Automatic (GPT-OSS only) | 50% | Varies | Unknown | None needed |

### Token Usage Fields
| Provider | Input | Output | Cached | Thinking/Reasoning |
|----------|-------|--------|--------|-------------------|
| Anthropic | `input_tokens` | `output_tokens` | `cache_read_input_tokens`, `cache_creation_input_tokens` | N/A (thinking included in output_tokens) |
| OpenAI | `prompt_tokens` | `completion_tokens` | `prompt_tokens_details.cached_tokens` | `completion_tokens_details.reasoning_tokens` |
| Gemini | `promptTokenCount` | `candidatesTokenCount` | `cachedContentTokenCount` | `thoughtsTokenCount` |
| xAI | `prompt_tokens` | `completion_tokens` | `prompt_tokens_details.cached_tokens` | `completion_tokens_details.reasoning_tokens` |
| Groq | `prompt_tokens` | `completion_tokens` | `input_tokens_details.cached_tokens` (Responses API) | `reasoning_tokens` |

### Tool/Function Calling Format
| Provider | Tool Definition | Tool Call (model output) | Tool Result (user sends) |
|----------|----------------|-------------------------|--------------------------|
| Anthropic | `{ name, description, input_schema }` | `{ type: "tool_use", id, name, input }` content block | `{ type: "tool_result", tool_use_id, content }` content block in user message |
| OpenAI | `{ type: "function", function: { name, description, parameters } }` | `message.tool_calls[{ id, type: "function", function: { name, arguments } }]` | `{ role: "tool", tool_call_id, content }` message |
| Gemini | `{ functionDeclarations: [{ name, description, parameters }] }` in `tools` | `{ functionCall: { name, args } }` as Part | `{ functionResponse: { name, response } }` as Part |
| xAI | Same as OpenAI | Same as OpenAI | Same as OpenAI |
| Groq | Same as OpenAI | Same as OpenAI | Same as OpenAI |

### Key Normalization Notes for Multi-Provider Implementation
1. **Input tokens**: Anthropic=`input_tokens`, OpenAI/xAI/Groq=`prompt_tokens`, Gemini=`promptTokenCount`
2. **Output tokens**: Anthropic=`output_tokens`, OpenAI/xAI/Groq=`completion_tokens`, Gemini=`candidatesTokenCount`
3. **Cached tokens**: Each provider reports differently (see table above)
4. **Tool call arguments**: Anthropic=parsed object (`input`), OpenAI/xAI/Groq=JSON string (`arguments`), Gemini=parsed object (`args`)
5. **Stop reasons**: Anthropic=`stop_reason` on message, OpenAI/xAI/Groq=`finish_reason` on choice, Gemini=`finishReason` on candidate
6. **System prompt**: Anthropic=top-level `system` param, OpenAI/xAI/Groq=`role: "system"` message, Gemini=`systemInstruction` field
7. **Assistant role name**: Anthropic/OpenAI/xAI/Groq=`"assistant"`, Gemini=`"model"`

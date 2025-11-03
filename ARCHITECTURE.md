# LLM WebUI Architecture

## Overview

This document provides a detailed technical overview of the LLM WebUI architecture, design decisions, and implementation details.

## Design Philosophy

### Core Principles

1. **Simplicity** - No build tools, no complex dependencies
2. **Performance** - Minimal overhead, fast rendering
3. **Extensibility** - Easy to add features without major refactoring
4. **Standards** - Use web standards and ES6+ features
5. **Maintainability** - Clear code structure with good documentation

### Why Vanilla JavaScript?

- **Zero Build Step** - No webpack, vite, or other bundlers needed
- **Direct Debugging** - Debug actual code, not transpiled output
- **Fast Development** - No compilation wait times
- **Small Footprint** - Only load what you need
- **Future-Proof** - Modern browsers support ES6 modules natively
- **Easy to Understand** - No framework-specific patterns to learn

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser (UI)                    │
│  ┌────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │   Chat     │  │ Settings │  │  Sidebar    │ │
│  │ Interface  │  │  Panel   │  │(Conv. List) │ │
│  └────────────┘  └──────────┘  └─────────────┘ │
│         │              │              │         │
│  ┌──────▼──────────────▼──────────────▼──────┐ │
│  │          Main Application (main.js)         │ │
│  └──────┬──────────────┬──────────────┬──────┘ │
│         │              │              │         │
│  ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐ │
│  │   API       │ │ Storage  │ │    Utils    │ │
│  │  Client     │ │  Layer   │ │  (Markdown) │ │
│  └──────┬──────┘ └────┬─────┘ └─────────────┘ │
└─────────┼─────────────┼─────────────────────────┘
          │             │
          │             ▼
          │      localStorage
          │
          ▼
┌─────────────────────────────────────────────────┐
│         OpenAI-Compatible API Endpoint          │
│  (llama.cpp, llama-swap, text-gen-webui, etc)   │
└─────────────────────────────────────────────────┘
```

### Module Breakdown

#### 1. API Client (`api.js`)

**Purpose**: Abstract layer for communicating with OpenAI-compatible APIs

**Key Features**:
- Support for multiple endpoints (configurable)
- Streaming response handling (Server-Sent Events)
- Model listing from `/v1/models`
- Chat completion requests to `/v1/chat/completions`
- Token counting and performance metrics
- Error handling and retry logic

**API Methods**:
```javascript
class APIClient {
  constructor(endpoint)
  async getModels()
  async sendMessage(messages, options, onChunk)
  async testConnection()
}
```

**Streaming Implementation**:
- Uses `fetch()` with `ReadableStream`
- Parses Server-Sent Events (SSE) format
- Handles `data: [DONE]` termination
- Real-time token-by-token display

#### 2. Storage Layer (`storage.js`)

**Purpose**: Manage data persistence using localStorage

**Data Structure**:
```javascript
{
  conversations: [
    {
      id: "uuid-v4",
      title: "Conversation Title",
      created: timestamp,
      updated: timestamp,
      model: "model-name",
      systemPrompt: "prompt text",
      messages: [
        {
          role: "user|assistant|system",
          content: "message text",
          timestamp: timestamp,
          tokens: number
        }
      ]
    }
  ],
  settings: {
    endpoints: [
      {
        id: "uuid-v4",
        name: "My Endpoint",
        url: "http://...",
        active: boolean
      }
    ],
    theme: "dark|light",
    defaultModel: "model-name",
    systemPrompts: {
      "model-name": "prompt text"
    },
    preferences: {
      streamingEnabled: boolean,
      temperature: number,
      maxTokens: number,
      topP: number
    }
  }
}
```

**Storage Methods**:
```javascript
class Storage {
  saveConversation(conversation)
  getConversation(id)
  getAllConversations()
  deleteConversation(id)
  saveSettings(settings)
  getSettings()
  exportData()
  importData(data)
}
```

#### 3. Chat Interface (`chat.js`)

**Purpose**: Handle chat UI interactions and message rendering

**Components**:
- Message list display
- Input field with send button
- Streaming response rendering
- Markdown formatting
- Code syntax highlighting
- Message actions (copy, regenerate, edit)

**Event Handling**:
```javascript
- onSendMessage(text)
- onStreamChunk(chunk)
- onStreamComplete(message)
- onRegenerateMessage(messageId)
- onEditMessage(messageId, newText)
```

#### 4. Settings Panel (`settings.js`)

**Purpose**: Manage application configuration

**Features**:
- Endpoint management (add, edit, delete, select)
- Model selection dropdown
- System prompt editor
- Parameter controls (temperature, top_p, max_tokens)
- Theme toggle
- Export/import functionality

#### 5. Stats Display (`stats.js`)

**Purpose**: Track and display performance metrics

**Metrics Tracked**:
- Context window usage (tokens used / total)
- Token generation speed (tokens/second)
- Time to first token (TTFT)
- Total generation time
- Request latency

**Display Format**:
```
Context: 1,234 / 4,096 tokens (30%)
Speed: 45.2 tokens/sec
TTFT: 234ms | Total: 5.2s
```

#### 6. Markdown Utilities (`markdown.js`)

**Purpose**: Render markdown and code highlighting

**Features**:
- Full markdown support (via marked.js)
- Code syntax highlighting (via highlight.js)
- LaTeX math rendering (future)
- Sanitization for security

#### 7. Main Application (`main.js`)

**Purpose**: Application initialization and coordination

**Responsibilities**:
- Initialize all modules
- Set up event listeners
- Handle routing/navigation
- Coordinate module interactions
- Global error handling

## Data Flow

### Sending a Message

```
1. User types message ──────────┐
                                │
2. chat.js captures input ──────▼
                                │
3. Validate & format ───────────▼
                                │
4. storage.js saves to history ─▼
                                │
5. api.js sends to endpoint ────▼
                                │
6. Stream response chunks ◄─────┘
   │
   ├─► stats.js updates metrics
   │
   └─► chat.js renders to UI
```

### Loading a Conversation

```
1. User clicks conversation ────┐
                                │
2. main.js handles event ───────▼
                                │
3. storage.js loads data ───────▼
                                │
4. chat.js renders messages ────▼
                                │
5. UI updates complete ─────────┘
```

## API Integration

### OpenAI-Compatible Endpoints

The application uses the standard OpenAI API format:

**List Models**:
```http
GET /v1/models
```

**Chat Completion** (Streaming):
```http
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "model-name",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Response Format** (SSE):
```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":"!"}}]}

data: [DONE]
```

### Abstraction Layer

The API client is designed to support multiple backends:

```javascript
// Current: OpenAI-compatible
const client = new OpenAIClient(endpoint);

// Future: Direct integration
const client = new DirectClient(config);

// Future: Custom backends
const client = new CustomClient(adapter);
```

## Performance Optimizations

### 1. Lazy Loading
- Load markdown renderer only when needed
- Defer code highlighting until visible
- Virtual scrolling for long conversations

### 2. Efficient Rendering
- DOM updates batched during streaming
- Use DocumentFragment for bulk operations
- CSS transforms for smooth animations

### 3. Memory Management
- Conversation pagination
- Automatic cleanup of old messages
- Compressed storage format

### 4. Network Optimization
- Request debouncing
- Connection pooling
- Automatic retry with exponential backoff

## Security Considerations

### 1. XSS Prevention
- Sanitize all user input
- Use textContent for untrusted data
- Markdown renderer configured for safety

### 2. CORS Handling
- Proper CORS headers required on API
- Support for authentication tokens
- Secure credential storage

### 3. Data Privacy
- All data stored locally
- No analytics or tracking
- Optional encryption for conversations

## Extensibility Points

### 1. Plugin System (Future)

```javascript
class Plugin {
  constructor(api) {
    this.api = api;
  }
  
  async onMessage(message) {
    // Transform or augment message
  }
  
  async onResponse(response) {
    // Process response
  }
}
```

### 2. Custom Backends

```javascript
class CustomBackend {
  async chat(messages, options) {
    // Implement custom logic
  }
}
```

### 3. Tool Integration

```javascript
const tools = {
  webSearch: async (query) => { /* ... */ },
  rag: async (query) => { /* ... */ },
  calculator: async (expr) => { /* ... */ }
};
```

## Testing Strategy

### Unit Tests
- API client methods
- Storage operations
- Markdown rendering
- Utility functions

### Integration Tests
- End-to-end message flow
- Settings persistence
- Conversation management

### Manual Testing
- Cross-browser compatibility
- API endpoint variations
- Edge cases and error handling

## Deployment

### Static Hosting
- GitHub Pages
- Netlify
- Vercel
- Any static file server

### Local Development
```bash
python -m http.server 8000
# or
npx serve
```

### CORS Proxy (if needed)
For development, a CORS proxy may be needed:
```javascript
const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
const apiUrl = proxyUrl + actualEndpoint;
```

## Future Architecture (Phase 2)

### Backend Service

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  WebSocket Server   │
│  (Node.js/FastAPI)  │
└──────┬──────────────┘
       │
       ├─► Model Management
       ├─► Direct llama.cpp
       └─► Advanced Features
```

### Features
- Model download/installation
- Parameter optimization
- Batch processing
- Advanced analytics
- Multi-user support

## Performance Benchmarks

### Target Metrics
- Initial load: < 50ms
- Time to interactive: < 100ms
- Streaming latency: < 100ms
- Memory usage: < 10MB
- CPU usage: < 5% idle

### Actual Performance
(To be measured after implementation)

## Conclusion

This architecture balances simplicity with extensibility, providing a solid foundation for a lightweight LLM web interface while allowing for future expansion into more advanced features.

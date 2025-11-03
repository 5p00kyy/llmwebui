# LLM WebUI - Features Guide

## Complete Feature Set

### 🎨 **Visual Design**
- **Pure Black/Grey Monochrome Theme** - Professional, distraction-free interface
- **Three Theme Variants** - Black (default), Dark (charcoal), Light
- **Smooth Animations** - Subtle transitions and hover effects
- **Responsive Design** - Works seamlessly on desktop and mobile
- **High Contrast** - Excellent readability with carefully chosen grey tones

### 🤖 **Model Management**

**Model Selection**
- Quick-access model switcher in header (⚡ icon)
- Switch between different AI models on the fly
- Automatic model discovery from your API endpoint
- Displays clean model names with full model ID details

**How to Use:**
1. Click the ⚡ button in the header
2. Select from available models
3. Current model persists across sessions

### ⚙️ **Advanced Parameters**

Control every aspect of AI generation:

**Temperature (0-2)**
- Controls randomness and creativity
- Lower = More focused and deterministic
- Higher = More creative and varied
- Default: 0.7

**Top P (0-1)**
- Nucleus sampling for diversity control
- Lower = More focused on likely tokens
- Higher = More diverse vocabulary
- Default: 0.9

**Max Tokens (128-8192)**
- Maximum length of AI responses
- Adjust based on your needs
- Default: 2048

**Presence Penalty (-2 to 2)**
- Encourages new topics
- Positive values = more likely to discuss new subjects
- Default: 0

**Frequency Penalty (-2 to 2)**
- Reduces repetition
- Positive values = less likely to repeat phrases
- Default: 0

**System Prompt**
- Custom instructions for AI behavior
- Use templates or write your own
- Templates include: Default Assistant, Code Expert, Creative Writer, Technical Educator

### 📄 **RAG (Retrieval-Augmented Generation)**

**Document Upload**
- Click 📎 icon next to send button
- Upload text files, markdown, JSON, CSV
- Multiple file support
- Automatic text chunking for optimal retrieval

**Document Management**
- View all uploaded documents in Settings
- Toggle documents active/inactive
- See chunk count and file size
- Delete individual documents or clear all

**Smart Context Retrieval**
- Automatically finds relevant document sections
- Injects context before your query
- Keyword-based search (expandable to vector similarity)
- Top 3 most relevant chunks included

**Supported Formats:**
- ✅ Plain text (.txt)
- ✅ Markdown (.md)
- ✅ JSON (.json)
- ✅ CSV (.csv)
- 🔄 PDF (coming soon - requires PDF.js integration)
- 🔄 DOCX (coming soon - requires mammoth.js integration)

### 💬 **Chat Features**

**Conversation Management**
- Unlimited conversations
- Auto-generated titles from first message
- Search conversations
- Conversation preview in sidebar
- Active conversation highlighting

**Message Features**
- Real-time streaming responses
- Markdown rendering with syntax highlighting
- Code block copy buttons
- Message actions (copy, etc.)
- Fade-in animations for new messages

**Keyboard Shortcuts**
- `Enter` - Send message
- `Shift+Enter` - New line in message
- `Ctrl/Cmd+N` - New conversation
- `Ctrl/Cmd+,` - Open settings
- `Escape` - Close settings panel

### 📊 **Statistics & Monitoring**

Real-time generation statistics:
- Tokens per second
- Total tokens used
- Time to first token
- Total generation time
- Context window usage

### 💾 **Data Management**

**Export/Import**
- Export all conversations and settings as JSON
- Import from backup files
- Timestamped export files
- Complete data portability

**Storage**
- All data stored in browser localStorage
- Automatic saving after each message
- No server-side storage required
- Complete privacy

### 🎯 **API Compatibility**

Works with any OpenAI-compatible endpoint:
- ✅ Ollama (http://localhost:11434/v1)
- ✅ llama.cpp server
- ✅ llama-swap
- ✅ Text Generation WebUI
- ✅ LM Studio
- ✅ OpenAI API
- ✅ Any other OpenAI-compatible API

### 🔧 **Customization**

**Themes**
- Black - Pure black background for OLED screens
- Dark - Charcoal grey for reduced eye strain
- Light - Clean white theme for daytime use

**Preferences**
- Streaming enabled/disabled
- Default model selection
- Per-model system prompts
- Generation parameters

### 🚀 **Performance**

- Lightweight - Pure JavaScript, no frameworks
- Fast - Minimal dependencies
- Efficient - Smart rendering and updates
- Smooth - Hardware-accelerated animations

## Quick Start Guide

1. **Configure Endpoint**
   - Open Settings (⚙️ icon or Ctrl+,)
   - Add your API endpoint (e.g., http://localhost:11434/v1)
   - Set as active

2. **Select Model**
   - Click ⚡ icon in header
   - Choose your preferred model

3. **Customize Behavior (Optional)**
   - Set system prompt in Settings
   - Adjust temperature and other parameters
   - Upload documents for RAG

4. **Start Chatting**
   - Type your message
   - Press Enter to send
   - Watch AI respond in real-time

## Advanced Usage

### Using RAG Effectively

1. Upload relevant documents (📎 button)
2. Documents are automatically chunked
3. When you ask a question, relevant sections are retrieved
4. Context is injected into your query automatically
5. AI responds with document-aware answers

### Parameter Tuning

**For Creative Writing:**
- Temperature: 1.0-1.5
- Top P: 0.9-0.95
- Presence Penalty: 0.5-1.0

**For Code/Technical:**
- Temperature: 0.3-0.7
- Top P: 0.8-0.9
- Presence Penalty: 0

**For Factual Q&A:**
- Temperature: 0.1-0.5
- Top P: 0.7-0.85
- Frequency Penalty: 0.3-0.6

### System Prompt Examples

**Code Assistant:**
```
You are an expert programmer. Provide detailed code examples with comments. 
Always explain your reasoning and suggest best practices.
```

**Research Helper:**
```
You are a research assistant. Provide well-structured, cited information.
Break down complex topics into understandable explanations.
```

## Troubleshooting

**Models not loading?**
- Check your endpoint URL is correct
- Verify the API server is running
- Click "🔄 Refresh Models" in settings

**RAG not working?**
- Check documents are marked as active (✓)
- Ensure documents contain relevant content
- Try uploading .txt or .md files first

**Streaming issues?**
- Check "Enable Streaming" in settings
- Some endpoints may not support streaming
- Fallback to non-streaming will happen automatically

## Future Enhancements

- 🔄 Vector embeddings for better RAG retrieval
- 🔄 PDF and DOCX parsing
- 🔄 Image generation support
- 🔄 Multi-modal inputs
- 🔄 Conversation branching
- 🔄 Export to PDF/Markdown
- 🔄 Web search integration
- 🔄 Plugin system

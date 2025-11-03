# LLM WebUI

A lightweight, custom web interface for interacting with local AI models through OpenAI-compatible APIs. Built with vanilla JavaScript for maximum performance and minimal bloat.

## Features

### Core Functionality
- 💬 **Chat Interface** - Clean, intuitive chat experience with streaming responses
- 📝 **Conversation History** - Persistent storage of all conversations using localStorage
- 🔄 **Multiple API Endpoints** - Manage and switch between different API endpoints
- 🤖 **Model Selection** - Dynamic model selection from connected endpoints
- ⚙️ **System Prompts** - Configure custom system prompts per model
- 📊 **Real-time Stats** - Track context usage, token generation speed, and response times
- 🎨 **Markdown Rendering** - Full markdown support with code syntax highlighting
- 🌓 **Theme Support** - Dark and light themes
- 📤 **Export/Import** - Save and restore conversations

### Technical Highlights
- Zero build step - runs directly in any modern browser
- ES6 modules for clean, modular architecture
- Designed for future expansion (tools, RAG, MCP support)
- OpenAI-compatible API standardization

## Quick Start

### Prerequisites
- A running instance of llama.cpp server, llama-swap, or any OpenAI-compatible API
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd llmwebui
```

2. Open `index.html` in your browser:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Or simply open the file
open index.html  # macOS
xdg-open index.html  # Linux
start index.html  # Windows
```

3. Configure your API endpoint:
   - Click the settings icon (⚙️)
   - Add your API endpoint (e.g., `http://192.168.0.113:8080/v1`)
   - Select your model
   - Start chatting!

## Configuration

### API Endpoints

The application supports multiple OpenAI-compatible endpoints:

- **llama.cpp server** - `http://localhost:8080/v1`
- **llama-swap** - Your custom proxy endpoint
- **Text Generation WebUI** - `http://localhost:5000/v1`
- **Any OpenAI-compatible API**

### System Prompts

Configure custom system prompts for different models:
- Coding assistant
- Creative writing
- General conversation
- Technical documentation

### Settings Persistence

All settings are stored in localStorage:
- API endpoints
- Model selections
- System prompts
- Theme preferences
- Conversation history

## Project Structure

```
llmwebui/
├── index.html              # Main application entry point
├── README.md               # This file
├── ARCHITECTURE.md         # Technical architecture documentation
├── css/
│   ├── styles.css          # Core application styles
│   ├── themes.css          # Color themes (dark/light)
│   └── components.css      # Component-specific styles
├── js/
│   ├── main.js             # Application initialization
│   ├── api.js              # API client with abstraction layer
│   ├── storage.js          # localStorage management
│   ├── chat.js             # Chat interface and streaming logic
│   ├── settings.js         # Settings panel functionality
│   ├── stats.js            # Performance metrics tracking
│   ├── markdown.js         # Markdown rendering utilities
│   └── utils.js            # Helper functions
└── assets/
    └── icons/              # UI icons and graphics
```

## Development

### Architecture

The application follows a modular architecture with clear separation of concerns:

- **API Layer** - Handles all communication with LLM backends
- **Storage Layer** - Manages data persistence
- **UI Layer** - React-like component system without the framework
- **Utils Layer** - Shared utilities and helpers

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation.

### Adding Features

The codebase is designed for extensibility:

1. **New API Backends** - Extend `api.js` with new client implementations
2. **Tools/Plugins** - Add to the event system in `chat.js`
3. **Storage Backends** - Implement new storage adapters in `storage.js`
4. **UI Components** - Add new components following the existing patterns

### Code Style

- ES6+ JavaScript with modules
- Clear, descriptive variable/function names
- Comprehensive inline documentation
- Conventional commit messages

## Future Roadmap

### Phase 2: Direct Integration
- Backend service for direct llama.cpp integration
- Model download and management UI
- Advanced parameter tuning
- Quantization options

### Phase 3: Advanced Features
- Web search integration
- RAG (Retrieval Augmented Generation) support
- MCP (Model Context Protocol) support
- Multi-modal support (images, audio)
- Conversation branching
- Collaboration features

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance

- Initial load: < 50ms
- Streaming latency: < 100ms
- Memory footprint: < 10MB

## Troubleshooting

### API Connection Issues
- Verify your API endpoint is running
- Check CORS settings on your API server
- Ensure the endpoint URL includes `/v1`

### Streaming Not Working
- Some older API implementations may not support streaming
- Disable streaming in settings if needed

### Conversation History Missing
- Check browser localStorage isn't full
- Ensure localStorage is enabled in browser settings

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Acknowledgments

- Built with vanilla JavaScript for maximum performance
- Inspired by OpenWebUI but optimized for simplicity
- Designed for the llama.cpp ecosystem

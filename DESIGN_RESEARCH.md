# UI/UX Research & Redesign Plan

## Research Summary

### Analyzed Interfaces

#### 1. ChatGPT (OpenAI)
**Key Design Elements:**
- **Layout**: Collapsible sidebar (260px), centered chat container (max-width: 768px)
- **Settings**: Gear icon in sidebar header → Modal/slide-over panel
- **Input**: Floating, centered with rounded corners and shadow
- **Messages**: Clean bubbles with subtle backgrounds, user messages right-aligned
- **Model Switcher**: Dropdown at top of chat
- **Actions**: Hover-revealed buttons (copy, regenerate, edit)

**Design Principles:**
- Maximum content visibility
- Minimal chrome/UI elements
- Contextual controls (show when needed)
- Spacious padding (2rem+ between messages)

#### 2. Claude (Anthropic)
**Key Design Elements:**
- **Layout**: Clean, minimal sidebar, generous whitespace
- **Typography**: Excellent hierarchy, larger base font (16px)
- **Conversations**: Simple list, clear active state
- **Messages**: Elegant spacing, clear visual separation
- **Settings**: Slide-in panel from right side

**Design Principles:**
- Elegance through simplicity
- Premium feel with refined spacing
- Subtle interactions
- Focus on content readability

#### 3. OpenWebUI Architecture
**Key Features for Future:**
- **Plugin System**: Tools, functions, actions extensible
- **Multi-model**: Support multiple providers simultaneously
- **Tool Integration**: Web search, RAG, code execution
- **Admin Panel**: Advanced configuration management
- **API Keys**: Secure per-provider authentication

**Extensibility Patterns:**
- Tool registration system
- Hook-based architecture
- Modular components
- Event-driven communication

## Proposed Redesign

### 1. Layout Architecture

#### New Structure
```
┌─────────────────────────────────────────────┐
│  [☰] LLM WebUI        [Model ▼] [⚙️]       │ Header (60px)
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │      Chat Container             │
│ (280px)  │      (max-width: 800px)         │
│          │      Centered                   │
│          │                                  │
│ [+ New]  │   User Message (right-aligned)  │
│          │   Assistant (left-aligned)      │
│ Conv 1   │                                  │
│ Conv 2   │                                  │
│ Conv 3   │                                  │
│          │                                  │
│          │                                  │
│ [⚙️] Set │                                  │
└──────────┴──────────────────────────────────┘
                                              │
                    [Input Area - Floating]  │
                    ─────────────────────────┘
```

#### Collapsible Sidebar
- Button: Hamburger menu (☰) in header
- Collapsed: 60px icon bar
- Expanded: 280px full sidebar
- Smooth animation (300ms cubic-bezier)
- Persist state in localStorage

### 2. Settings Menu Redesign

#### Current Problems
- Right-side slide panel gets cramped
- Hard to navigate multiple sections
- Parameter controls need more room

#### New Design: Modal Overlay
```
╔═══════════════════════════════════════════╗
║  Settings                            [✕]  ║
╠═══════════════╤═══════════════════════════╣
║               │                           ║
║ ▸ General     │  [Content Area]           ║
║ ▸ Endpoints   │                           ║
║ ▾ Parameters  │  Temperature: [====] 0.7  ║
║   └ Presets   │  Max Tokens:  [====] 2048 ║
║ ▸ RAG Docs    │                           ║
║ ▸ Appearance  │  [Use Server Default]     ║
║ ▸ Data        │                           ║
║ ▸ Advanced    │                           ║
║               │                           ║
╚═══════════════╧═══════════════════════════╝
```

**Features:**
- Tabbed navigation on left (200px)
- Large content area (600px+)
- Expandable sections (accordion style)
- Preset management (save/load parameter sets)
- Search functionality
- Import/Export per section

### 3. Enhanced Message UI

#### Message Bubbles
```
┌─────────────────────────────────────┐
│ YOU                          [Copy] │
│                                     │
│ Your message here                   │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ASSISTANT                    [Copy] │
│                          [Regenerate]│
│                              [Edit] │
│ Response text here...               │
│                                     │
└─────────────────────────────────────┘
```

**Improvements:**
- Rounded corners (8px)
- Subtle box-shadow on hover
- Inline action buttons (reveal on hover)
- Branch indicators for regenerations
- Token count per message
- Collapsible timestamps

### 4. Tool/Plugin Architecture (Future)

#### Design Pattern
```javascript
// Tool Registration
tools.register({
  id: 'web-search',
  name: 'Web Search',
  icon: '🔍',
  description: 'Search the web',
  execute: async (query) => { /* ... */ },
  settings: { /* ... */ }
});

// Hook System
hooks.on('message:before-send', async (message) => {
  // Modify message before sending
  return message;
});

hooks.on('message:received', async (message) => {
  // Process received message
  return message;
});
```

#### Tool Types
1. **Pre-processors**: RAG, context injection
2. **Post-processors**: Formatting, enhancement
3. **Actions**: Web search, code execution
4. **Integrations**: External APIs, webhooks
5. **UI Extensions**: Custom panels, widgets

#### Tool UI Integration
- Toolbar above input (when tools enabled)
- Tool selection dropdown
- Per-tool settings in settings menu
- Tool usage indicators in messages
- Tool execution logs (debug mode)

### 5. Dark Theme Refinement

#### Color Palette
```css
/* True Blacks */
--bg-deepest: #000000;
--bg-deeper: #0a0a0a;
--bg-deep: #111111;
--bg-base: #1a1a1a;
--bg-elevated: #222222;

/* Greys */
--grey-900: #2a2a2a;
--grey-800: #3a3a3a;
--grey-700: #4a4a4a;
--grey-600: #606060;
--grey-500: #808080;

/* Text */
--text-primary: #ffffff;
--text-secondary: #b0b0b0;
--text-tertiary: #808080;
--text-disabled: #606060;

/* Accents */
--accent-primary: #ffffff;
--accent-hover: #e5e5e5;
--border-subtle: #2a2a2a;
--border-default: #3a3a3a;
```

#### Visual Effects
- Subtle luminosity: `box-shadow: 0 0 20px rgba(255,255,255,0.03)`
- No color glows (pure monochrome)
- Precise 1px borders
- Minimal gradients (black → grey)

### 6. Advanced Features

#### Command Palette (Cmd/Ctrl+K)
```
┌─────────────────────────────────────┐
│ ⌘ Commands                          │
├─────────────────────────────────────┤
│ > [Search query]                    │
├─────────────────────────────────────┤
│ New Conversation              Cmd+N │
│ Search Conversations          Cmd+F │
│ Switch Model                  Cmd+M │
│ Toggle Sidebar               Cmd+B │
│ Settings                     Cmd+, │
└─────────────────────────────────────┘
```

#### Conversation Search
- Full-text search across all conversations
- Fuzzy matching
- Filter by date, model, tags
- Search within conversation

#### Presets System
```javascript
presets: {
  'creative': {
    temperature: 1.2,
    topP: 0.95,
    systemPrompt: 'You are a creative...'
  },
  'precise': {
    temperature: 0.3,
    topP: 0.9,
    systemPrompt: 'You are precise...'
  }
}
```

#### Export Options
- Markdown with proper formatting
- PDF with styling
- JSON (raw data)
- HTML (standalone)
- Per-conversation or bulk export

### 7. Responsive Design

#### Breakpoints
```css
/* Mobile: 0-767px */
- Sidebar overlay (full-screen)
- Stacked layout
- Simplified controls

/* Tablet: 768-1023px */
- Collapsible sidebar
- Adjusted padding
- Touch-friendly targets

/* Desktop: 1024px+ */
- Full layout
- Keyboard shortcuts
- Advanced features visible
```

## Implementation Priority

### Phase 1: Core Layout (Week 1)
- [ ] Collapsible sidebar
- [ ] Centered chat container
- [ ] Floating input area
- [ ] New header design

### Phase 2: Settings Redesign (Week 1-2)
- [ ] Modal settings panel
- [ ] Tabbed navigation
- [ ] Preset system
- [ ] Enhanced parameter controls

### Phase 3: Message Improvements (Week 2)
- [ ] New message bubbles
- [ ] Inline actions
- [ ] Branch indicators
- [ ] Token counts

### Phase 4: Advanced Features (Week 3)
- [ ] Command palette
- [ ] Conversation search
- [ ] Export system
- [ ] Keyboard shortcuts

### Phase 5: Tool Architecture (Week 4+)
- [ ] Plugin registration system
- [ ] Hook architecture
- [ ] Tool UI integration
- [ ] Example tools (web search, etc.)

## Design Principles

1. **Content First**: Maximize chat visibility
2. **Progressive Disclosure**: Show complexity when needed
3. **Keyboard Friendly**: Power users get shortcuts
4. **Extensible**: Plugin architecture from the start
5. **Performance**: Fast, responsive, smooth animations
6. **Accessibility**: ARIA labels, keyboard navigation
7. **Dark Native**: Designed for dark theme first

## Typography System

```css
/* Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */

/* Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
--leading-loose: 2;
```

## Spacing System

```css
/* 4px base unit */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

## Animation System

```css
/* Duration */
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;

/* Easing */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

## Next Steps

1. Review and approve this design document
2. Create detailed component mockups
3. Implement Phase 1 (core layout changes)
4. Iterate based on feedback
5. Continue with subsequent phases

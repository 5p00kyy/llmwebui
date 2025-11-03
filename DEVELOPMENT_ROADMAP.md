# LLM WebUI - Development Roadmap

## Project Status Overview

This document tracks the development progress of new features and improvements for the LLM WebUI project.

**Last Updated:** 2025-11-03

---

## 🎯 Current Sprint: Settings System Redesign

### Phase 1: Foundation (In Progress)

#### ✅ Completed
- [x] **Settings Registry System** (`js/settingsRegistry.js`)
  - Centralized settings definition
  - Category management
  - Setting validation
  - Search functionality
  - Value caching

- [x] **Component-Based UI** (`js/settingsComponents.js`)
  - BaseSettingComponent abstract class
  - ToggleComponent
  - SelectComponent
  - SliderComponent
  - TextInputComponent
  - TextAreaComponent
  - SettingComponentFactory

- [x] **Component Styles** (`css/components.css`)
  - Setting item layouts
  - Toggle switch styling
  - Slider controls
  - Validation states
  - Search interface styles

#### ✅ Completed (Continued)
- [x] **Refactor Settings Manager** (`js/settings.js`)
  - Integrated with SettingsRegistry
  - Using component factory for General and Appearance sections
  - Added settings search functionality with real-time results
  - Implemented validation display and highlight navigation
  - Added smooth scroll and animation to found settings

#### 📋 Next Steps
- [ ] Add more settings to registry (font size, compact mode, auto-save)
- [ ] Migrate remaining sections to component factory (optional)
- [ ] Add inline help and tooltips for complex settings
- [ ] Implement settings profiles/presets
- [ ] Add settings history/undo functionality
- [ ] Handle edge cases and add comprehensive error handling

---

## 📅 Feature Backlog

### Priority 1: Core Missing Features

#### 1. Per-Model Parameter Configuration
**Status:** Not Started  
**Estimated Effort:** Medium (3-4 days)

**Requirements:**
- [ ] Extend storage structure for model-specific configs
- [ ] Add `getModelConfig()` and `saveModelConfig()` to storage
- [ ] Add model-awareness to ParameterManager
- [ ] Create "Model Configs" settings tab
- [ ] UI for selecting and configuring models
- [ ] Auto-load parameters on model switch
- [ ] Per-model system prompts

**Technical Details:**
```javascript
modelConfigs: {
  'llama-3.2-3b': {
    temperature: 0.5,
    systemPrompt: '...',
    useServerDefaults: {...}
  }
}
```

#### 2. Tag UI Integration
**Status:** Backend Complete, UI Needed  
**Estimated Effort:** Medium (2-3 days)

**Requirements:**
- [ ] Tag badges in sidebar conversation list
- [ ] Tag filter dropdown in sidebar
- [ ] Tag management modal (create, edit color, delete)
- [ ] Quick tag assignment on conversations
- [ ] Tag color picker component
- [ ] Bulk tag operations

**Files to Modify:**
- `js/sidebar.js` - Add tag display and filtering
- `css/components.css` - Tag badge styles
- New: `js/tagManager.js` - Tag management UI

#### 3. Preset UI Enhancement
**Status:** Backend Complete, UI Good  
**Estimated Effort:** Small (1-2 days)

**Requirements:**
- [ ] Verify current preset selector UI
- [ ] Add preset deletion confirmation
- [ ] Improve preset card hover states
- [ ] Add preset duplication feature
- [ ] Better error messages for import

---

### Priority 2: Search & Discovery

#### 4. Enhanced Conversation Search
**Status:** Not Started  
**Estimated Effort:** Medium (2-3 days)

**Requirements:**
- [ ] Full-text search across message content
- [ ] Search result highlighting
- [ ] Filter by date range
- [ ] Filter by model used
- [ ] Filter by tags
- [ ] Search-as-you-type with debouncing
- [ ] Keyboard navigation in results

**Technical Approach:**
- Use existing `searchConversations()` in storage
- Add advanced filtering options
- Highlight matching text in results
- Show match context (surrounding text)

---

### Priority 3: Polish & User Experience

#### 5. Loading States & Skeletons
**Status:** Not Started  
**Estimated Effort:** Small (1-2 days)

**Requirements:**
- [ ] Skeleton screens for conversation list
- [ ] Better streaming indicators
- [ ] Model switch loading state
- [ ] RAG document upload progress bar
- [ ] API connection testing feedback

**Visual Examples:**
- Pulsing gray boxes for loading conversations
- Animated dots for streaming
- Progress bars for uploads

#### 6. Message Actions Enhancement
**Status:** Partial (copy exists)  
**Estimated Effort:** Medium (2-3 days)

**Requirements:**
- [ ] Edit message functionality
- [ ] Delete individual messages
- [ ] Pin/bookmark important messages
- [ ] Better copy button visibility
- [ ] Regenerate button improvements
- [ ] Message action menu

**UI Approach:**
- Hover to reveal action buttons
- Right-click context menu
- Confirmation for destructive actions

---

### Priority 4: Advanced Features

#### 7. Message Branching System
**Status:** Not Started  
**Estimated Effort:** Large (5-7 days)

**Requirements:**
- [ ] Store alternative responses
- [ ] Branch conversation at any point
- [ ] UI for viewing branches
- [ ] Branch navigation controls
- [ ] Merge branches (optional)
- [ ] Conversation tree visualization

**Data Structure:**
```javascript
{
  branches: {
    'branch-id-1': {
      parentMessageId: 'msg-123',
      messages: [...]
    }
  }
}
```

#### 8. MCP/Plugin Architecture
**Status:** Not Started  
**Estimated Effort:** Extra Large (7-10 days)

**Requirements:**
- [ ] Define plugin API
- [ ] Plugin registry system
- [ ] Tool registration (web search, code exec, etc.)
- [ ] Plugin sandboxing/security
- [ ] Plugin marketplace (future)
- [ ] Example plugins

---

## 🔧 Technical Improvements

### Code Quality
- [ ] Add JSDoc comments to all functions
- [ ] Create unit tests for core modules
- [ ] Add end-to-end tests
- [ ] Improve error handling
- [ ] Add logging system

### Performance
- [ ] Optimize conversation rendering
- [ ] Implement virtual scrolling for large lists
- [ ] Lazy load images
- [ ] Cache commonly used data
- [ ] Minimize DOM manipulations

### Accessibility
- [ ] Add ARIA labels
- [ ] Improve keyboard navigation
- [ ] Screen reader support
- [ ] High contrast mode
- [ ] Focus indicators

---

## 📊 Progress Tracking

### Current Sprint Completion
**Settings System Redesign:** 85% Complete

- Registry: ✅ 100%
- Components: ✅ 100%
- Styles: ✅ 100%
- Integration: ✅ 80% (General and Appearance sections complete)
- Search & Navigation: ✅ 100%
- Testing: 🔄 In Progress

### Overall Project Completion
**Total Features:** 8 major features planned  
**Completed:** 0  
**In Progress:** 1 (Settings System)  
**Not Started:** 7

---

## 🎨 Design Principles

1. **Content First** - Maximize chat visibility
2. **Progressive Disclosure** - Show complexity when needed
3. **Keyboard Friendly** - Power users get shortcuts
4. **Dark Native** - Designed for dark theme first
5. **Performance** - Smooth 60fps animations
6. **Accessibility** - Proper contrast, keyboard navigation

---

## 📝 Implementation Notes

### Settings System Architecture

The new settings system uses a **registry-based** approach:

1. **SettingsRegistry** - Central definition of all settings
2. **Components** - Reusable UI widgets for each setting type
3. **Validation** - Built-in validation rules
4. **Search** - Settings are searchable by name/description
5. **Events** - Setting changes emit events

**Benefits:**
- Easy to add new settings
- Consistent UI patterns
- Type-safe with validation
- Self-documenting
- Scalable

### Per-Model Configuration Design

Each model can have its own:
- Parameter values (temperature, top-p, etc.)
- System prompt
- Server default toggles

**Flow:**
1. User selects model
2. System checks for model-specific config
3. If exists, load those parameters
4. If not, use global defaults
5. User can create new model config anytime

---

## 🚀 Release Planning

### Version 1.1 (Estimated: 2 weeks)
- ✅ Settings System Redesign
- ✅ Per-Model Configuration
- ✅ Tag UI Integration
- ✅ Enhanced Search

### Version 1.2 (Estimated: 4 weeks)
- ✅ Loading States
- ✅ Message Actions
- ✅ Preset Improvements

### Version 2.0 (Estimated: 8 weeks)
- ✅ Message Branching
- ✅ MCP/Plugin Architecture
- ✅ Advanced Analytics

---

## 📞 Contributing

To contribute to development:

1. Check this roadmap for planned features
2. Discuss major changes before implementing
3. Follow the established code patterns
4. Test thoroughly before committing
5. Update documentation

---

## 🔮 Future Ideas (Not Prioritized)

- Multi-tab conversations
- Split view for comparing responses
- Voice input/output
- Image generation support
- Conversation sharing/export to PDF
- Collaborative features
- Cloud sync (optional)
- Mobile app
- Browser extension

---

**Document Version:** 1.0  
**Maintained By:** Development Team  
**Next Review:** After Settings System completion

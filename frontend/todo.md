# Visual Workspace - Development Plan

## Design Guidelines

### Design References
- **Miro.com**: Clean canvas, minimal UI, drag-and-drop interactions
- **Notion.so**: Card-based layout, emoji usage, hierarchical navigation
- **Trello.com**: Board and card system, color coding
- **Style**: Modern Minimalism + Light Mode + Clean Workspace

### Color Palette
- Primary: #FFFFFF (White - background)
- Secondary: #F7F7F7 (Light Gray - canvas)
- Accent: #6366F1 (Indigo - primary actions)
- Note Colors: #FEF3C7 (Yellow), #DBEAFE (Blue), #D1FAE5 (Green), #FED7D7 (Red), #E9D5FF (Purple)
- Text: #1F2937 (Dark Gray), #6B7280 (Medium Gray)
- Border: #E5E7EB (Light Border)

### Typography
- Heading1: Inter font-weight 600 (24px)
- Heading2: Inter font-weight 600 (18px)
- Body: Inter font-weight 400 (14px)
- Small: Inter font-weight 400 (12px)

### Key Component Styles
- **Notes**: Rounded corners (8px), shadow on hover, resize handle bottom-right
- **Boards**: Rounded corners (12px), hover lift effect, emoji + title layout
- **Toolbar**: Fixed left sidebar, icon buttons with tooltips
- **Selection**: Dashed border (#6366F1), semi-transparent lasso rectangle

### Layout & Spacing
- Canvas: Full viewport with grid background (20px grid)
- Toolbar: 64px width, left-aligned
- Top bar: 56px height
- Note default: 200x150px
- Board card: 180x120px
- Grid snap: 20px

### Images to Generate
1. **empty-workspace-illustration.svg** - Illustration for empty board state (Style: minimalist line art)
2. **logo-workspace.png** - App logo with workspace icon (Style: modern, simple)

---

## Project Structure

### Frontend (Vue 3 + Vite)
- **index.html** - Main HTML entry point
- **src/main.js** - Vue app initialization
- **src/App.vue** - Root component with router-view
- **src/router/index.js** - Vue Router configuration
- **src/store/workspace.js** - Pinia store for workspace state
- **src/components/Canvas.vue** - Main canvas component
- **src/components/Note.vue** - Sticky note component
- **src/components/Board.vue** - Board card component
- **src/components/Toolbar.vue** - Left toolbar component
- **src/components/TopBar.vue** - Top navigation bar with breadcrumbs
- **src/components/ColorPicker.vue** - Color picker for notes
- **src/components/EmojiPicker.vue** - Emoji picker for boards
- **src/components/LassoSelection.vue** - Lasso selection overlay
- **src/composables/useDragDrop.js** - Drag and drop logic
- **src/composables/useSelection.js** - Selection logic
- **src/services/api.js** - API service for backend communication
- **src/assets/styles.css** - Global styles and Tailwind imports
- **package.json** - Dependencies
- **vite.config.js** - Vite configuration
- **tailwind.config.js** - Tailwind CSS configuration

### Backend (Python Django)
- **backend/manage.py** - Django management script
- **backend/workspace_api/settings.py** - Django settings with CORS
- **backend/workspace_api/urls.py** - Main URL configuration
- **backend/workspace/models.py** - Board and Note models
- **backend/workspace/serializers.py** - DRF serializers
- **backend/workspace/views.py** - API viewsets
- **backend/workspace/urls.py** - Workspace app URLs
- **backend/requirements.txt** - Python dependencies

---

## Development Tasks

1. ✅ Setup project structure
2. ✅ Generate images
3. Frontend Vue components
4. Drag and drop system
5. Selection system
6. Backend Django API
7. Frontend-Backend integration
8. Testing and polish
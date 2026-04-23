# Visual Workspace

A visual, interactive workspace combining features from Miro, Notion, and Trello. Create and organize notes and boards on a free-form canvas with drag-and-drop, multi-select, and lasso selection.

## Features

- **Free-positioned Notes**: Create sticky notes anywhere on the canvas
- **Hierarchical Boards**: Organize content in nested boards
- **Drag & Drop**: Move single or multiple items with grid snapping
- **Multi-select**: Select multiple items with Ctrl/Cmd+click or lasso selection
- **Customization**: Change note colors, board emojis, and content
- **Navigation**: Breadcrumb trail for easy board navigation
- **Keyboard Shortcuts**: Delete items with Delete/Backspace key

## Tech Stack

### Frontend
- Vue 3 with Composition API
- Vue Router for navigation
- Pinia for state management
- Tailwind CSS for styling
- Vite for build tooling

### Backend
- Python Django
- Django REST Framework
- SQLite database
- CORS enabled

## Setup Instructions

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd /workspace/app/frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm run dev
```

The frontend will be available at http://localhost:5173

### Backend Setup

1. Navigate to the backend directory:
```bash
cd /workspace/app/backend
```

2. Create a virtual environment (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in `app/backend/` and set the Google client ID:
```bash
cp .env.example .env
# Then edit .env and set GOOGLE_CLIENT_ID
```

5. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

6. Create a superuser (optional, for admin access):
```bash
python manage.py createsuperuser
```

7. Start the Django server:
```bash
python manage.py runserver
```

The backend API will be available at http://localhost:8000

## Google Authentication Setup

The app supports Google login on the frontend. To enable it:

1. Create a Google OAuth 2.0 Client ID for a web application.
2. Set the redirect origin to `http://localhost:5173` in the Google Cloud Console.
3. Add the client ID and secret to frontend and backend configuration:
   - `app/frontend/.env.local` → `VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID`
   - `app/backend/.env` → `GOOGLE_CLIENT_ID=YOUR_CLIENT_ID`
   - `app/backend/.env` → `GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET`
4. Start backend and frontend, then open `/login` in the browser.

## Usage

1. **Create Notes**: Click the note icon in the left toolbar
2. **Create Boards**: Click the board icon in the left toolbar
3. **Edit Content**: Double-click on notes or board titles to edit
4. **Select Items**: Click to select, Ctrl/Cmd+click for multi-select, or drag to lasso
5. **Move Items**: Drag selected items to reposition (snaps to 20px grid)
6. **Change Colors**: Select notes and use the color picker in the toolbar
7. **Change Emoji**: Select boards and use the emoji picker in the toolbar
8. **Navigate Boards**: Double-click a board to open it, use breadcrumbs to go back
9. **Delete Items**: Select items and press Delete or Backspace

## API Endpoints

### Boards
- `GET /api/boards/` - List all boards
- `GET /api/boards/?parent=<id>` - List boards by parent
- `POST /api/boards/` - Create a board
- `GET /api/boards/<id>/` - Get a board
- `PATCH /api/boards/<id>/` - Update a board
- `DELETE /api/boards/<id>/` - Delete a board

### Notes
- `GET /api/notes/` - List all notes
- `GET /api/notes/?board=<id>` - List notes by board
- `POST /api/notes/` - Create a note
- `GET /api/notes/<id>/` - Get a note
- `PATCH /api/notes/<id>/` - Update a note
- `DELETE /api/notes/<id>/` - Delete a note

## Project Structure

```
/workspace/app/
├── frontend/               # Vue 3 frontend
│   ├── src/
│   │   ├── components/    # Vue components
│   │   ├── views/         # View components
│   │   ├── store/         # Pinia stores
│   │   ├── services/      # API services
│   │   └── router/        # Vue Router
│   └── package.json
├── backend/               # Django backend
│   ├── workspace_api/     # Django project
│   ├── workspace/         # Django app
│   └── requirements.txt
└── README.md
```

## Development Notes

- The frontend proxies API requests to the backend at `/api`
- All positions snap to a 20px grid for clean alignment
- The root board (id: 'root') is created by default in the frontend
- CORS is enabled for development (disable in production)
- SQLite is used for simplicity (consider PostgreSQL for production)

## Future Enhancements

- Real-time collaboration with WebSockets
- File attachments
- Rich text editor for notes
- Zoom and pan controls
- Undo/redo functionality
- Search and filtering
- Export/import functionality
- User authentication and permissions
# Quick Start Guide

## Option 1: Automatic Startup (Recommended)

Run the startup script that handles both frontend and backend:

```bash
cd /workspace/app
./start.sh
```

This will:
1. Set up the Django database
2. Start the backend server on port 8000
3. Start the frontend dev server on port 5173

## Option 2: Manual Startup

### Start Backend (Terminal 1)
```bash
cd /workspace/app/backend
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

### Start Frontend (Terminal 2)
```bash
cd /workspace/app/frontend
pnpm install  # if not already installed
pnpm run dev
```

## First Steps

1. Open http://localhost:5173 in your browser
2. Click the note icon (📄) in the left toolbar to create a note
3. Click the board icon (📋) to create a board
4. Double-click items to edit them
5. Drag items to move them around
6. Use Ctrl/Cmd+click to select multiple items
7. Press Delete to remove selected items

## Tips

- **Lasso Selection**: Click and drag on empty space to select multiple items
- **Grid Snapping**: Items automatically snap to a 20px grid
- **Color Customization**: Select notes and use the color picker in the toolbar
- **Board Navigation**: Double-click a board to open it, use breadcrumbs to navigate back
- **Keyboard Shortcuts**: Delete/Backspace to remove items

Enjoy your visual workspace! 🎨
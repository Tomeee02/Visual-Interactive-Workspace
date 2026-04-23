#!/bin/bash

# Visual Workspace Startup Script

echo "🚀 Starting Visual Workspace..."

# Start backend
echo "📦 Starting Django backend..."
cd /workspace/app/backend
python manage.py makemigrations --noinput
python manage.py migrate --noinput
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🎨 Starting Vue frontend..."
cd /workspace/app/frontend
pnpm run dev &
FRONTEND_PID=$!

echo "✅ Visual Workspace is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend: http://localhost:8000"
echo "   Admin: http://localhost:8000/admin"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
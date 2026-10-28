<template>
  <div 
    ref="canvasRef"
    class="canvas-container grid-background"
    :class="{ 'drag-over': isDragOver }"
    :style="{ backgroundPosition: `${-scrollX}px ${-scrollY}px` }"
    @mousedown="handleCanvasMouseDown"
    @mousemove="handleCanvasMouseMove"
    @mouseup="handleCanvasMouseUp"
    @contextmenu.prevent
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleFileDrop"
    @scroll="handleScroll"
  >
    <!-- Drop overlay -->
    <div v-if="isFileDragOver" class="drop-overlay">
      <div class="drop-overlay-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p>Húzd ide a fájlokat</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="(store.currentBoard?.items || []).length === 0 && !isDragOver" class="empty-state">
      <img :src="emptyStateImage" alt="Empty workspace" />
      <h2>Empty Board</h2>
      <p>Create notes or boards to get started, or drag files here</p>
    </div>

    <!-- Notes -->
    <Note
      v-for="noteId in noteIds"
      :key="noteId"
      :note="store.notes[noteId]"
      :selected="store.selectedItems.has(noteId)"
      @select="handleItemSelect(noteId, $event)"
      @drag-start="handleDragStart(noteId, $event)"
      @drag="handleDrag"
      @drag-end="handleDragEnd"
    />

    <Checklist
      v-for="checklistId in checklistIds"
      :key="checklistId"
      :checklist="store.notes[checklistId]"
      :selected="store.selectedItems.has(checklistId)"
      @select="handleItemSelect(checklistId, $event)"
      @drag-start="handleDragStart(checklistId, $event)"
      @drag="handleDrag"
      @drag-end="handleDragEnd"
    />

    <Table
      v-for="tableId in tableIds"
      :key="tableId"
      :table="store.notes[tableId]"
      :selected="store.selectedItems.has(tableId)"
      @select="handleItemSelect(tableId, $event)"
      @drag-start="handleDragStart(tableId, $event)"
      @drag="handleDrag"
      @drag-end="handleDragEnd"
    />

    <!-- Boards -->
    <Board
      v-for="boardId in boardIds"
      :key="boardId"
      :board="store.boards[boardId]"
      :selected="store.selectedItems.has(boardId)"
      :dropTarget="dropTargetBoardId === boardId"
      @select="handleItemSelect(boardId, $event)"
      @drag-start="handleDragStart(boardId, $event)"
      @drag="handleDrag"
      @drag-end="handleDragEnd"
      @open="handleBoardOpen(boardId)"
    />

    <!-- Files -->
    <FileItem
      v-for="fileId in fileIds"
      :key="fileId"
      :file="store.files[fileId]"
      :selected="store.selectedItems.has(fileId)"
      @select="handleItemSelect(fileId, $event)"
      @drag-start="handleDragStart(fileId, $event)"
      @drag="handleDrag"
      @drag-end="handleDragEnd"
    />

    <!-- Lasso Selection -->
    <div
      v-if="isLassoing && store.isLassoActive && store.lassoRect"
      class="lasso-selection"
      :style="{
        left: store.lassoRect.x + 'px',
        top: store.lassoRect.y + 'px',
        width: store.lassoRect.width + 'px',
        height: store.lassoRect.height + 'px'
      }"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '../store/workspace'
import Note from './Note.vue'
import Checklist from './Checklist.vue'
import Table from './Table.vue'
import Board from './Board.vue'
import FileItem from './FileItem.vue'

const router = useRouter()
const store = useWorkspaceStore()
const canvasRef = ref(null)

const emptyStateImage = 'https://mgx-backend-cdn.metadl.com/generate/images/901079/2026-01-14/f49054b2-0612-4d02-bbf1-49849cfe62e2.png'

// File drag-and-drop state
const isDragOver = ref(false)
const isFileDragOver = ref(false)
let dragOverTimeout = null
const lastDragPoint = ref(null)

// Item drop-onto-board state
const dropTargetBoardId = ref(null)

// Scroll state for background sync
const scrollX = ref(0)
const scrollY = ref(0)

const noteIds = computed(() => {
  return (store.currentBoard?.items || []).filter(id => store.notes[id] && store.notes[id].type === 'note' && !['checklist', 'table'].includes(store.notes[id].itemType))
})

const checklistIds = computed(() => {
  return (store.currentBoard?.items || []).filter(id => store.notes[id] && store.notes[id].itemType === 'checklist')
})

const tableIds = computed(() => {
  return (store.currentBoard?.items || []).filter(id => store.notes[id] && store.notes[id].itemType === 'table')
})

const boardIds = computed(() => {
  return (store.currentBoard?.items || []).filter(id => store.boards[id])
})

const fileIds = computed(() => {
  return (store.currentBoard?.items || []).filter(id => store.files[id])
})

// Drag state
const isDragging = ref(false)
const hasDragged = ref(false)
const draggedItemId = ref(null)
const dragMouseStart = ref({ x: 0, y: 0 })
// Store the original positions of all selected items at drag start
const dragItemStartPositions = ref(new Map())
const dragUndoSnapshot = ref(null)

// Minimum drag distance (in pixels) before considering it a real drag
const DRAG_THRESHOLD = 3

// Lasso state
const isLassoing = ref(false)
const lassoStart = ref({ x: 0, y: 0 })

function getCanvasPoint(e, rect = canvasRef.value.getBoundingClientRect()) {
  return {
    x: e.clientX - rect.left + canvasRef.value.scrollLeft,
    y: e.clientY - rect.top + canvasRef.value.scrollTop
  }
}

function handleCanvasMouseDown(e) {
  if (e.button !== 0) return // Only left click

  // Only start lasso if clicking directly on the canvas background,
  // not on a child element (note, board, or file)
  if (e.target !== canvasRef.value && !e.target.classList.contains('grid-background')) {
    return
  }

  const rect = canvasRef.value.getBoundingClientRect()
  const { x, y } = getCanvasPoint(e, rect)

  // Start lasso selection
  isLassoing.value = true
  lassoStart.value = { x, y }
  store.clearSelection()
}

function handleCanvasMouseMove(e) {
  // Don't show lasso while dragging items
  if (!isLassoing.value || isDragging.value) return

  const canvasRect = canvasRef.value.getBoundingClientRect()
  const { x, y } = getCanvasPoint(e, canvasRect)

  const lassoRect = {
    x: Math.min(lassoStart.value.x, x),
    y: Math.min(lassoStart.value.y, y),
    width: Math.abs(x - lassoStart.value.x),
    height: Math.abs(y - lassoStart.value.y)
  }

  store.setLassoRect(lassoRect)
  
  // Select items based on actual DOM element positions and sizes
  selectItemsByDOM(lassoRect, canvasRect)
}

function selectItemsByDOM(lassoRect, canvasRect) {
  // Find all items with data-item-id in the canvas
  const itemElements = canvasRef.value.querySelectorAll('[data-item-id]')
  const selectedIds = []
  
  itemElements.forEach(el => {
    const itemId = el.getAttribute('data-item-id')
    const elRect = el.getBoundingClientRect()
    
    // Convert element rect to canvas-relative coordinates
    const itemRect = {
      x: elRect.left - canvasRect.left + canvasRef.value.scrollLeft,
      y: elRect.top - canvasRect.top + canvasRef.value.scrollTop,
      width: elRect.width,
      height: elRect.height
    }
    
    // Check if lasso intersects with item
    if (
      lassoRect.x < itemRect.x + itemRect.width &&
      lassoRect.x + lassoRect.width > itemRect.x &&
      lassoRect.y < itemRect.y + itemRect.height &&
      lassoRect.y + lassoRect.height > itemRect.y
    ) {
      selectedIds.push(itemId)
    }
  })
  
  // Update selection in store
  store.selectedItems.clear()
  selectedIds.forEach(id => store.selectedItems.add(id))
}

function handleCanvasMouseUp() {
  if (isLassoing.value) {
    isLassoing.value = false
    store.setLassoRect(null)
  }
}

function handleItemSelect(itemId, event) {
  // Cancel any lasso that might have started from event bubbling
  isLassoing.value = false
  store.setLassoRect(null)

  const isCtrlOrCmd = event.ctrlKey || event.metaKey

  if (isCtrlOrCmd) {
    store.toggleSelection(itemId)
  } else {
    if (!store.selectedItems.has(itemId)) {
      store.selectItem(itemId, false)
    }
  }
}

function handleDragStart(itemId, event) {
  // Cancel any lasso when starting a drag
  isLassoing.value = false
  store.setLassoRect(null)

  isDragging.value = true
  hasDragged.value = false
  draggedItemId.value = itemId

  // Record the mouse start position
  dragMouseStart.value = { x: event.clientX, y: event.clientY }

  // If dragging an unselected item, select only that item
  if (!store.selectedItems.has(itemId)) {
    store.selectItem(itemId, false)
  }

  // Record original positions of ALL selected items
  dragItemStartPositions.value = new Map()
  const selectedIds = Array.from(store.selectedItems)
  dragUndoSnapshot.value = store.captureUndoSnapshot(selectedIds)
  selectedIds.forEach(id => {
    const item = store.notes[id] || store.boards[id] || store.files[id]
    if (item) {
      dragItemStartPositions.value.set(id, { x: item.x, y: item.y })
    }
  })
}

function handleDrag(event) {
  if (!isDragging.value) return

  // Calculate how far the mouse has moved from drag start
  const deltaX = event.clientX - dragMouseStart.value.x
  const deltaY = event.clientY - dragMouseStart.value.y

  // Only start moving after exceeding the drag threshold
  if (!hasDragged.value) {
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (distance < DRAG_THRESHOLD) return
    hasDragged.value = true
  }

  // Move all selected items by the same delta from their original positions
  dragItemStartPositions.value.forEach((startPos, id) => {
    const item = store.notes[id] || store.boards[id] || store.files[id]
    if (item) {
      item.x = startPos.x + deltaX
      item.y = startPos.y + deltaY
    }
  })

  // Detect if hovering over a board (for drop-into-board functionality)
  detectDropTargetBoard(event)
}

function detectDropTargetBoard(event) {
  const selectedIds = Array.from(store.selectedItems)
  
  // Find board elements under the cursor
  const boardElements = canvasRef.value?.querySelectorAll('[data-item-id]') || []
  let foundTarget = null
  
  for (const el of boardElements) {
    const itemId = el.getAttribute('data-item-id')
    // Skip if this is a selected item or not a board
    if (selectedIds.includes(itemId) || !store.boards[itemId]) continue
    
    const rect = el.getBoundingClientRect()
    if (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    ) {
      foundTarget = itemId
      break
    }
  }
  
  dropTargetBoardId.value = foundTarget
}

function handleDragEnd() {
  if (!isDragging.value) return

  // Check if dropping onto a board
  if (hasDragged.value && dropTargetBoardId.value) {
    const selectedIds = Array.from(store.selectedItems)
    // Restore original positions before moving (items will get new positions in target board)
    dragItemStartPositions.value.forEach((startPos, id) => {
      const item = store.notes[id] || store.boards[id] || store.files[id]
      if (item) {
        item.x = startPos.x
        item.y = startPos.y
      }
    })
    // Move items to target board
    store.moveItemsToBoard(selectedIds, dropTargetBoardId.value)
  } else if (hasDragged.value) {
    // Only save positions if the user actually dragged (not just clicked)
    const selectedIds = Array.from(store.selectedItems)
    const movedTable = store.notes[draggedItemId.value]?.itemType === 'table'
    selectedIds.forEach(id => {
      const item = store.notes[id] || store.boards[id] || store.files[id]
      if (item) {
        let snappedX = Math.round(item.x / 10) * 10
        let snappedY = Math.round(item.y / 10) * 10
        
        // Notes get 3px offset to the right
        if (item.type === 'note') {
          snappedX += 2
        }
        
        item.x = snappedX
        item.y = snappedY

        // Save to backend based on item type
        const position = { x: item.x, y: item.y }
        if (item.type === 'note') {
          store.updateNote(id, position)
        } else if (item.type === 'board') {
          store.updateBoard(id, position)
        } else if (item.type === 'file') {
          store.updateFile(id, position)
        }
      }
    })
    if (movedTable) {
      store.clearSelection()
    }
  }

  if (dragUndoSnapshot.value) store.commitUndoSnapshot(dragUndoSnapshot.value)

  isDragging.value = false
  hasDragged.value = false
  draggedItemId.value = null
  dragItemStartPositions.value.clear()
  dragUndoSnapshot.value = null
  dropTargetBoardId.value = null
}

function handleBoardOpen(boardId) {
  router.push(`/board/${boardId}`)
}

// File drag-and-drop handlers
function handleDragOver(e) {
  if (e.dataTransfer && e.dataTransfer.types.includes('application/x-pending-item')) {
    lastDragPoint.value = getCanvasPoint(e)
  }

  // React to external file drags (from OS) or toolbar item creation drags
  if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
    isDragOver.value = true
    isFileDragOver.value = true
    clearTimeout(dragOverTimeout)
  } else if (e.dataTransfer && e.dataTransfer.types.includes('application/x-create-item')) {
    isDragOver.value = true
    isFileDragOver.value = false
    clearTimeout(dragOverTimeout)
  } else if (e.dataTransfer && e.dataTransfer.types.includes('application/x-pending-item')) {
    isDragOver.value = true
    isFileDragOver.value = false
    clearTimeout(dragOverTimeout)
  }
}

function handleDragLeave(e) {
  // Use timeout to prevent flicker when moving between child elements
  dragOverTimeout = setTimeout(() => {
    isDragOver.value = false
    isFileDragOver.value = false
  }, 50)
}

function handleFileDrop(e) {
  isDragOver.value = false
  isFileDragOver.value = false
  clearTimeout(dragOverTimeout)

  const rect = canvasRef.value.getBoundingClientRect()
  const dropPoint = lastDragPoint.value || getCanvasPoint(e, rect)
  lastDragPoint.value = null

  // Check if this is a pending item from staging sidebar
  const pendingItemId = e.dataTransfer?.getData('application/x-pending-item')
  if (pendingItemId) {
    let x = dropPoint.x
    let y = dropPoint.y
    const pendingItem = store.boards[pendingItemId]

    if (pendingItem) {
      // The board icon is centered in the 140px card, so its left edge is 35px in.
      x -= 35
    }

    store.placeItemFromPending(
      pendingItemId,
      Math.round(x),
      Math.round(y)
    )
    return
  }

  const dropX = Math.round(dropPoint.x / 10) * 10
  const dropY = Math.round(dropPoint.y / 10) * 10

  // Check if this is a toolbar item creation drag
  const createItemType = e.dataTransfer?.getData('application/x-create-item') || e.dataTransfer?.getData('text/plain')
  if (['note', 'checklist', 'table', 'board'].includes(createItemType)) {
    if (createItemType === 'note') {
      store.createNote(dropX, dropY)
    } else if (createItemType === 'checklist') {
      store.createChecklist(dropX, dropY)
    } else if (createItemType === 'table') {
      store.createTable(dropX, dropY)
    } else if (createItemType === 'board') {
      store.createBoard(dropX, dropY)
    }
    return
  }

  // Handle file drops
  const droppedFiles = e.dataTransfer?.files
  if (!droppedFiles || droppedFiles.length === 0) return

  // Upload each file, offset each one slightly so they don't stack
  Array.from(droppedFiles).forEach((file, index) => {
    const x = Math.round((dropX + index * 140) / 10) * 10
    const y = dropY
    store.createFileItem(file, x, y)
  })
}

// Keyboard shortcuts
function handleKeyDown(e) {
  // Don't handle if user is typing in an input/textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
    return
  }

  // Undo the last workspace action
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    if (store.undoLastAction()) e.preventDefault()
    return
  }

  // Delete selected items
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedItems.size > 0) {
      const selectedIds = Array.from(store.selectedItems)
      store.deleteItems(selectedIds)
    }
  }

  // Copy (Ctrl+C)
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    if (store.selectedItems.size > 0) {
      const selectedIds = Array.from(store.selectedItems)
      store.copyItems(selectedIds)
      e.preventDefault()
    }
  }

  // Cut (Ctrl+X)
  if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
    if (store.selectedItems.size > 0) {
      const selectedIds = Array.from(store.selectedItems)
      store.cutItems(selectedIds)
      e.preventDefault()
    }
  }

  // Paste (Ctrl+V)
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    // Calculate paste position - center of visible viewport
    const canvas = canvasRef.value
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const x = Math.round((canvas.scrollLeft + rect.width / 2 - 100) / 10) * 10
      const y = Math.round((canvas.scrollTop + rect.height / 2 - 100) / 10) * 10
      store.pasteItems(x, y)
      e.preventDefault()
    }
  }

  // Select all (Ctrl+A)
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    if (store.currentBoard?.items) {
      store.currentBoard.items.forEach(id => {
        store.selectedItems.add(id)
      })
      e.preventDefault()
    }
  }
}

function handleScroll() {
  if (canvasRef.value) {
    scrollX.value = canvasRef.value.scrollLeft
    scrollY.value = canvasRef.value.scrollTop
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  // Initialize scroll position
  if (canvasRef.value) {
    scrollX.value = canvasRef.value.scrollLeft
    scrollY.value = canvasRef.value.scrollTop
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  clearTimeout(dragOverTimeout)
})
</script>

<style scoped>
.canvas-container {
  flex: 1;
  position: relative;
  overflow: auto;
  cursor: default;
}

.canvas-container.drag-over {
  background-color: rgba(99, 102, 241, 0.03);
}

.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 60px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px dashed #6366F1;
  border-radius: 16px;
}

.drop-overlay-content p {
  font-size: 16px;
  font-weight: 500;
  color: #6366F1;
  margin: 0;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.lasso-selection {
  position: absolute;
  border: 1px solid #6366F1;
  background: rgba(99, 102, 241, 0.08);
  pointer-events: none;
  z-index: 150;
}
</style>
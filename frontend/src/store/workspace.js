import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useWorkspaceStore = defineStore('workspace', () => {
  // State
  const currentBoardId = ref('root')
  const boards = ref({
    root: {
      id: 'root',
      title: 'Home',
      emoji: '🏠',
      parentId: null,
      items: [],
      boardCount: 0,
      noteCount: 0,
      fileCount: 0
    }
  })
  const notes = ref({})
  const files = ref({})
  const selectedItems = ref(new Set())
  const isLassoActive = ref(false)
  const lassoRect = ref(null)
  const isLoading = ref(false)
  const pendingPlacements = ref({}) // boardId -> [itemIds] that need to be placed
  const clipboard = ref({ items: [], isCut: false }) // items: [{type, data}], isCut: boolean
  const cutFileIds = ref(new Set()) // Track cut files (files can't be deleted, only moved on paste)

  // Computed
  const currentBoard = computed(() => boards.value[currentBoardId.value])
  
  const breadcrumbs = computed(() => {
    const crumbs = []
    let boardId = currentBoardId.value
    while (boardId) {
      const board = boards.value[boardId]
      if (board) {
        crumbs.unshift({ id: board.id, title: board.title, emoji: board.emoji })
        boardId = board.parentId
      } else {
        break
      }
    }
    return crumbs
  })

  const selectedNotes = computed(() => {
    return Array.from(selectedItems.value)
      .filter(id => notes.value[id])
      .map(id => notes.value[id])
  })

  const selectedBoards = computed(() => {
    return Array.from(selectedItems.value)
      .filter(id => boards.value[id] && id !== 'root')
      .map(id => boards.value[id])
  })

  const selectedFiles = computed(() => {
    return Array.from(selectedItems.value)
      .filter(id => files.value[id])
      .map(id => files.value[id])
  })

  // Helper: convert camelCase keys to snake_case
  function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }

  // Helper: snap value to 10px grid
  function snapToGrid(value) {
    return Math.round(value / 10) * 10
  }

  // Helper: convert an updates object's keys from camelCase to snake_case for API
  function updatesToApi(updates) {
    const result = {}
    for (const [key, value] of Object.entries(updates)) {
      result[camelToSnake(key)] = value
    }
    return result
  }

  // Helper: convert note to snake_case for API (used for create)
  function noteToApi(note) {
    return {
      id: note.id,
      board_id: note.boardId,
      x: note.x,
      y: note.y,
      width: note.width,
      height: note.height,
      content: note.content,
      bg_color: note.bgColor,
      text_color: note.textColor
    }
  }

  // Helper: convert board to snake_case for API (used for create)
  function boardToApi(board) {
    return {
      id: board.id,
      title: board.title,
      emoji: board.emoji,
      bg_color: board.bgColor,
      emoji_grayscale: board.emojiGrayscale,
      parent_id: board.parentId,
      x: board.x,
      y: board.y
    }
  }

  // Helper: convert file updates to snake_case for API (used for create)
  function fileToApi(file) {
    return {
      id: file.id,
      board_id: file.boardId,
      filename: file.filename,
      file_size: file.fileSize,
      x: file.x,
      y: file.y
    }
  }

  // Actions
  function setCurrentBoard(boardId) {
    currentBoardId.value = boardId
    selectedItems.value.clear()
  }

  async function loadBoardAncestors(boardId) {
    // Load the ancestor chain for breadcrumbs when directly navigating to a board URL
    let currentId = boardId
    
    while (currentId && currentId !== 'root') {
      // Skip if we already have this board loaded
      if (boards.value[currentId]) {
        currentId = boards.value[currentId].parentId
        continue
      }
      
      try {
        const b = await api.getBoard(currentId)
        const board = {
          id: b.id,
          type: 'board',
          title: b.title,
          emoji: b.emoji,
          bgColor: b.bg_color || '#F3F4F6',
          emojiGrayscale: b.emoji_grayscale !== undefined ? b.emoji_grayscale : false,
          parentId: b.parent_id,
          x: b.x,
          y: b.y,
          items: b.items || [],
          boardCount: b.board_count || 0,
          noteCount: b.note_count || 0,
          fileCount: b.file_count || 0
        }
        boards.value[b.id] = board
        currentId = b.parent_id
      } catch (err) {
        console.error('Failed to load board ancestor:', err)
        break
      }
    }
  }

  async function loadBoardData(boardId) {
    isLoading.value = true
    try {
      // Fetch notes, child boards, and files for this board in parallel
      const [notesRes, boardsRes, filesRes] = await Promise.all([
        api.getNotes(boardId),
        api.getBoards(boardId),
        api.getFiles(boardId)
      ])

      // Extract results from paginated response
      const notesList = Array.isArray(notesRes) ? notesRes : (notesRes.results || [])
      const boardsList = Array.isArray(boardsRes) ? boardsRes : (boardsRes.results || [])
      const filesList = Array.isArray(filesRes) ? filesRes : (filesRes.results || [])

      const itemIds = []

      // Map notes from API (snake_case) to store (camelCase)
      notesList.forEach(n => {
        const note = {
          id: n.id,
          type: 'note',
          boardId: n.board_id,
          x: snapToGrid(n.x),
          y: snapToGrid(n.y),
          width: n.width,
          height: n.height,
          content: n.content,
          bgColor: n.bg_color,
          textColor: n.text_color
        }
        notes.value[n.id] = note
        itemIds.push(n.id)
      })

      // Map child boards from API
      boardsList.forEach(b => {
        const board = {
          id: b.id,
          type: 'board',
          title: b.title,
          emoji: b.emoji,
          bgColor: b.bg_color || '#F3F4F6',
          emojiGrayscale: b.emoji_grayscale !== undefined ? b.emoji_grayscale : false,
          parentId: b.parent_id,
          x: snapToGrid(b.x),
          y: snapToGrid(b.y),
          items: b.items || [],
          boardCount: b.board_count || 0,
          noteCount: b.note_count || 0,
          fileCount: b.file_count || 0
        }
        boards.value[b.id] = board
        itemIds.push(b.id)
      })

      // Map files from API
      filesList.forEach(f => {
        // Skip cut files (they're pending move, not deleted from backend)
        if (cutFileIds.value.has(f.id)) return
        
        const fileItem = {
          id: f.id,
          type: 'file',
          boardId: f.board_id,
          filename: f.filename,
          fileSize: f.file_size,
          fileUrl: f.file_url,
          thumbnailUrl: f.thumbnail_url,
          x: snapToGrid(f.x),
          y: snapToGrid(f.y)
        }
        files.value[f.id] = fileItem
        itemIds.push(f.id)
      })

      // Also preserve any files that are currently uploading (optimistic updates)
      // so they don't disappear if loadBoardData is called during upload
      if (boards.value[boardId]) {
        const existingItems = boards.value[boardId].items || []
        existingItems.forEach(existingId => {
          if (files.value[existingId] && !itemIds.includes(existingId)) {
            // This is a file that exists in the store but not yet in the API
            // (still uploading) - keep it
            itemIds.push(existingId)
          }
        })
      }

      // Ensure the board exists in the store and update its items
      if (!boards.value[boardId]) {
        boards.value[boardId] = {
          id: boardId,
          title: boardId === 'root' ? 'Home' : 'Board',
          emoji: boardId === 'root' ? '🏠' : '📋',
          parentId: null,
          items: itemIds,
          boardCount: 0,
          noteCount: 0,
          fileCount: 0
        }
      } else {
        boards.value[boardId].items = itemIds
      }
    } catch (err) {
      console.error('Failed to load board data:', err)
    } finally {
      isLoading.value = false
    }
  }

  function createNote(x, y) {
    const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const note = {
      id,
      type: 'note',
      boardId: currentBoardId.value,
      x,
      y,
      width: 277,
      height: 150,
      content: '',
      bgColor: '#FEF3C7',
      textColor: '#1F2937'
    }
    notes.value[id] = note
    if (currentBoard.value) {
      currentBoard.value.items.push(id)
    }
    
    // Save to backend (convert to snake_case)
    api.createNote(noteToApi(note)).catch(err => {
      console.error('Failed to create note:', err)
    })
    
    return note
  }

  function createBoard(x, y) {
    const id = `board-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const board = {
      id,
      type: 'board',
      title: 'New Board',
      emoji: '📋',
      bgColor: '#F3F4F6',
      emojiGrayscale: false,
      parentId: currentBoardId.value,
      x,
      y,
      items: [],
      boardCount: 0,
      noteCount: 0,
      fileCount: 0
    }
    boards.value[id] = board
    if (currentBoard.value) {
      currentBoard.value.items.push(id)
    }
    
    // Save to backend (convert to snake_case)
    api.createBoard(boardToApi(board)).catch(err => {
      console.error('Failed to create board:', err)
    })
    
    return board
  }

  async function createFileItem(file, x, y) {
    const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const boardId = currentBoardId.value
    
    // Optimistic local update - add file to store immediately
    const fileItem = {
      id,
      type: 'file',
      boardId,
      filename: file.name,
      fileSize: file.size,
      fileUrl: null,
      thumbnailUrl: null,
      uploading: true,
      uploadError: false,
      x: Math.round(x),
      y: Math.round(y)
    }
    files.value[id] = fileItem
    if (currentBoard.value && !currentBoard.value.items.includes(id)) {
      currentBoard.value.items.push(id)
    }

    // Build FormData for upload
    const formData = new FormData()
    formData.append('id', id)
    formData.append('board_id', boardId)
    formData.append('filename', file.name)
    formData.append('file', file)
    formData.append('file_size', String(file.size))
    formData.append('x', String(Math.round(x)))
    formData.append('y', String(Math.round(y)))

    try {
      const response = await api.uploadFile(formData)
      // Update the file with server response data (file_url, thumbnail_url)
      if (files.value[id]) {
        Object.assign(files.value[id], {
          fileUrl: response.file_url || null,
          thumbnailUrl: response.thumbnail_url || null,
          uploading: false,
          uploadError: false
        })
      }
    } catch (err) {
      console.error('File upload failed:', err)
      console.error('Error details:', err.response?.status, err.response?.data)
      // DON'T remove the file - just mark it as failed so user can see it
      if (files.value[id]) {
        Object.assign(files.value[id], {
          uploading: false,
          uploadError: true
        })
      }
    }

    return files.value[id]
  }

  function updateNote(id, updates) {
    if (notes.value[id]) {
      Object.assign(notes.value[id], updates)
      // Save only changed fields to backend (convert keys to snake_case)
      const apiUpdates = updatesToApi(updates)
      api.updateNote(id, apiUpdates).catch(err => {
        console.error('Failed to update note:', err, 'Data:', apiUpdates)
      })
    }
  }

  function updateBoard(id, updates) {
    if (boards.value[id]) {
      Object.assign(boards.value[id], updates)
      // Save only changed fields to backend (convert keys to snake_case)
      const apiUpdates = updatesToApi(updates)
      api.updateBoard(id, apiUpdates).catch(err => {
        console.error('Failed to update board:', err, 'Data:', apiUpdates)
      })
    }
  }

  function updateFile(id, updates) {
    if (files.value[id]) {
      Object.assign(files.value[id], updates)
      // Save only changed fields to backend (convert keys to snake_case)
      const apiUpdates = updatesToApi(updates)
      api.updateFile(id, apiUpdates).catch(err => {
        console.error('Failed to update file:', err, 'Data:', apiUpdates)
      })
    }
  }

  function deleteItems(itemIds) {
    itemIds.forEach(id => {
      if (notes.value[id]) {
        const board = currentBoard.value
        if (board) {
          board.items = board.items.filter(itemId => itemId !== id)
        }
        delete notes.value[id]
        api.deleteNote(id).catch(console.error)
      } else if (files.value[id]) {
        const board = currentBoard.value
        if (board) {
          board.items = board.items.filter(itemId => itemId !== id)
        }
        delete files.value[id]
        api.deleteFile(id).catch(console.error)
      } else if (boards.value[id] && id !== 'root') {
        const board = boards.value[id]
        const parentBoard = boards.value[board.parentId]
        if (parentBoard) {
          parentBoard.items = parentBoard.items.filter(itemId => itemId !== id)
        }
        deleteBoard(id)
      }
    })
    selectedItems.value.clear()
  }

  function deleteBoard(boardId) {
    const board = boards.value[boardId]
    if (!board) return

    board.items.forEach(itemId => {
      if (notes.value[itemId]) {
        delete notes.value[itemId]
        api.deleteNote(itemId).catch(console.error)
      } else if (files.value[itemId]) {
        delete files.value[itemId]
        api.deleteFile(itemId).catch(console.error)
      } else if (boards.value[itemId]) {
        deleteBoard(itemId)
      }
    })

    delete boards.value[boardId]
    api.deleteBoard(boardId).catch(console.error)
  }

  function selectItem(id, addToSelection = false) {
    if (!addToSelection) {
      selectedItems.value.clear()
    }
    selectedItems.value.add(id)
  }

  function deselectItem(id) {
    selectedItems.value.delete(id)
  }

  function clearSelection() {
    selectedItems.value.clear()
  }

  function toggleSelection(id) {
    if (selectedItems.value.has(id)) {
      selectedItems.value.delete(id)
    } else {
      selectedItems.value.add(id)
    }
  }

  function setLassoRect(rect) {
    lassoRect.value = rect
    isLassoActive.value = !!rect
  }

  function selectItemsInLasso(rect) {
    if (!rect) return

    const board = currentBoard.value
    if (!board) return

    const items = board.items
    selectedItems.value.clear()

    items.forEach(itemId => {
      const item = notes.value[itemId] || boards.value[itemId] || files.value[itemId]
      if (!item) return

      let itemWidth, itemHeight

      if (boards.value[itemId]) {
        // Board: 140px wide, 105px tall (icon 80px - 10px margin + title ~20px + stats ~15px)
        itemWidth = 140
        itemHeight = 105
      } else if (files.value[itemId]) {
        const file = files.value[itemId]
        const ext = file.filename?.split('.').pop()?.toLowerCase() || ''
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'avif']
        const isImage = imageExts.includes(ext)
        
        if (file.thumbnailUrl) {
          // PDF/DOCX with thumbnail: 284px x 410px
          itemWidth = 284
          itemHeight = 410
        } else if (isImage && file.fileUrl) {
          // Image: 284px wide, variable height (use container max)
          itemWidth = 284
          itemHeight = 360
        } else {
          // Icon file: 120px wide, ~88px tall (icon 56px + name + size)
          itemWidth = 120
          itemHeight = 88
        }
      } else {
        // Note: use actual width/height from the note
        itemWidth = item.width || 280
        itemHeight = item.height || 150
      }

      const itemRect = {
        x: item.x,
        y: item.y,
        width: itemWidth,
        height: itemHeight
      }

      if (
        rect.x < itemRect.x + itemRect.width &&
        rect.x + rect.width > itemRect.x &&
        rect.y < itemRect.y + itemRect.height &&
        rect.y + rect.height > itemRect.y
      ) {
        selectedItems.value.add(itemId)
      }
    })
  }

  function moveItems(itemIds, deltaX, deltaY) {
    itemIds.forEach(id => {
      const item = notes.value[id] || boards.value[id] || files.value[id]
      if (item) {
        item.x = Math.round((item.x + deltaX) / 10) * 10
        item.y = Math.round((item.y + deltaY) / 10) * 10
        
        const position = { x: item.x, y: item.y }
        if (item.type === 'note') {
          api.updateNote(id, position).catch(console.error)
        } else if (item.type === 'board') {
          api.updateBoard(id, position).catch(console.error)
        } else if (item.type === 'file') {
          api.updateFile(id, position).catch(console.error)
        }
      }
    })
  }

  function moveItemsToBoard(itemIds, targetBoardId) {
    const targetBoard = boards.value[targetBoardId]
    if (!targetBoard) return

    // Initialize pending placements for target board if needed
    if (!pendingPlacements.value[targetBoardId]) {
      pendingPlacements.value[targetBoardId] = []
    }

    itemIds.forEach(id => {
      const note = notes.value[id]
      const file = files.value[id]
      const board = boards.value[id]
      
      if (note) {
        // Remove from current board's items
        const srcBoard = boards.value[note.boardId]
        if (srcBoard) {
          srcBoard.items = srcBoard.items.filter(itemId => itemId !== id)
        }
        // Add to target board
        if (!targetBoard.items.includes(id)) {
          targetBoard.items.push(id)
        }
        // Update note's boardId and set off-screen position
        note.boardId = targetBoardId
        note.x = -9999
        note.y = -9999
        api.updateNote(id, { board_id: targetBoardId, x: -9999, y: -9999 }).catch(console.error)
        // Add to pending placements
        if (!pendingPlacements.value[targetBoardId].includes(id)) {
          pendingPlacements.value[targetBoardId].push(id)
        }
      } else if (file) {
        // Remove from current board's items
        const srcBoard = boards.value[file.boardId]
        if (srcBoard) {
          srcBoard.items = srcBoard.items.filter(itemId => itemId !== id)
        }
        // Add to target board
        if (!targetBoard.items.includes(id)) {
          targetBoard.items.push(id)
        }
        // Update file's boardId and set off-screen position
        file.boardId = targetBoardId
        file.x = -9999
        file.y = -9999
        api.updateFile(id, { board_id: targetBoardId, x: -9999, y: -9999 }).catch(console.error)
        // Add to pending placements
        if (!pendingPlacements.value[targetBoardId].includes(id)) {
          pendingPlacements.value[targetBoardId].push(id)
        }
      } else if (board && id !== 'root' && id !== targetBoardId) {
        // Don't allow moving a board into itself or root
        // Remove from current parent's items
        const parentBoard = boards.value[board.parentId]
        if (parentBoard) {
          parentBoard.items = parentBoard.items.filter(itemId => itemId !== id)
        }
        // Add to target board
        if (!targetBoard.items.includes(id)) {
          targetBoard.items.push(id)
        }
        // Update board's parentId and set off-screen position
        board.parentId = targetBoardId
        board.x = -9999
        board.y = -9999
        api.updateBoard(id, { parent_id: targetBoardId, x: -9999, y: -9999 }).catch(console.error)
        // Add to pending placements
        if (!pendingPlacements.value[targetBoardId].includes(id)) {
          pendingPlacements.value[targetBoardId].push(id)
        }
      }
    })
    
    // Clear selection after moving
    selectedItems.value.clear()
  }

  function placeItemFromPending(itemId, x, y) {
    const item = notes.value[itemId] || boards.value[itemId] || files.value[itemId]
    if (!item) return

    const boardId = item.boardId || item.parentId
    
    // Update position
    item.x = x
    item.y = y

    // Save to backend
    const position = { x, y }
    if (item.type === 'note') {
      api.updateNote(itemId, position).catch(console.error)
    } else if (item.type === 'board') {
      api.updateBoard(itemId, position).catch(console.error)
    } else if (item.type === 'file') {
      api.updateFile(itemId, position).catch(console.error)
    }

    // Remove from pending placements
    if (pendingPlacements.value[boardId]) {
      pendingPlacements.value[boardId] = pendingPlacements.value[boardId].filter(id => id !== itemId)
      if (pendingPlacements.value[boardId].length === 0) {
        delete pendingPlacements.value[boardId]
      }
    }
  }

  function clearPendingPlacements(boardId) {
    if (pendingPlacements.value[boardId]) {
      // Place all pending items at default positions
      const items = [...pendingPlacements.value[boardId]]
      let offsetY = 100
      items.forEach((itemId, index) => {
        const item = notes.value[itemId] || boards.value[itemId] || files.value[itemId]
        if (item) {
          const x = 100
          const y = offsetY + (index * 160)
          item.x = x
          item.y = y
          const position = { x, y }
          if (item.type === 'note') {
            api.updateNote(itemId, position).catch(console.error)
          } else if (item.type === 'board') {
            api.updateBoard(itemId, position).catch(console.error)
          } else if (item.type === 'file') {
            api.updateFile(itemId, position).catch(console.error)
          }
        }
      })
      delete pendingPlacements.value[boardId]
    }
  }

  function copyItems(itemIds) {
    const copiedItems = []
    itemIds.forEach(id => {
      const note = notes.value[id]
      const board = boards.value[id]
      const file = files.value[id]
      
      if (note) {
        copiedItems.push({
          type: 'note',
          data: { ...note }
        })
      } else if (board && id !== 'root') {
        copiedItems.push({
          type: 'board',
          data: { ...board }
        })
      } else if (file) {
        copiedItems.push({
          type: 'file',
          data: { ...file }
        })
      }
    })
    clipboard.value = { items: copiedItems, isCut: false }
  }

  function cutItems(itemIds) {
    // Clear any previous cut files tracking
    cutFileIds.value.clear()
    
    // First copy the items to clipboard
    copyItems(itemIds)
    clipboard.value.isCut = true
    
    // Delete notes/boards immediately, move files to "null" board in backend
    const idsToProcess = [...itemIds]
    idsToProcess.forEach(id => {
      if (notes.value[id]) {
        const board = boards.value[notes.value[id].boardId]
        if (board) {
          board.items = board.items.filter(itemId => itemId !== id)
        }
        delete notes.value[id]
        api.deleteNote(id).catch(console.error)
      } else if (files.value[id]) {
        // For files: set board to null in backend so they won't appear on any board
        // (even after page reload)
        cutFileIds.value.add(id)
        const board = boards.value[files.value[id].boardId]
        if (board) {
          board.items = board.items.filter(itemId => itemId !== id)
        }
        delete files.value[id]
        // Set board to null in backend - file is now in "clipboard"
        api.updateFile(id, { board_id: null }).catch(console.error)
      } else if (boards.value[id] && id !== 'root') {
        const board = boards.value[id]
        const parentBoard = boards.value[board.parentId]
        if (parentBoard) {
          parentBoard.items = parentBoard.items.filter(itemId => itemId !== id)
        }
        deleteBoard(id)
      }
    })
    selectedItems.value.clear()
  }

  function pasteItems(x = 100, y = 100) {
    if (clipboard.value.items.length === 0) return

    const offsetX = 20
    const offsetY = 20
    let pasteIndex = 0

    clipboard.value.items.forEach(item => {
      const newId = `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newX = x + (pasteIndex * offsetX)
      const newY = y + (pasteIndex * offsetY)
      const origId = item.data.id
      
      if (item.type === 'note') {
        // Notes: always create new (originals already deleted if cut)
        const newNote = {
          ...item.data,
          id: newId,
          boardId: currentBoardId.value,
          x: newX,
          y: newY
        }
        notes.value[newId] = newNote
        if (currentBoard.value) {
          currentBoard.value.items.push(newId)
        }
        api.createNote(noteToApi(newNote)).catch(console.error)
      } else if (item.type === 'board') {
        // Boards: always create new (originals already deleted if cut)
        const newBoard = {
          ...item.data,
          id: newId,
          parentId: currentBoardId.value,
          x: newX,
          y: newY,
          items: [], // Don't copy child items
          boardCount: 0,
          noteCount: 0,
          fileCount: 0
        }
        boards.value[newId] = newBoard
        if (currentBoard.value) {
          currentBoard.value.items.push(newId)
        }
        api.createBoard(boardToApi(newBoard)).catch(console.error)
      } else if (item.type === 'file') {
        if (clipboard.value.isCut) {
          // For cut files: move the original to new board/position
          const movedFile = {
            ...item.data,
            boardId: currentBoardId.value,
            x: newX,
            y: newY
          }
          files.value[origId] = movedFile
          if (currentBoard.value) {
            currentBoard.value.items.push(origId)
          }
          // Remove from cut tracking
          cutFileIds.value.delete(origId)
          api.updateFile(origId, {
            board_id: currentBoardId.value,
            x: newX,
            y: newY
          }).catch(console.error)
        } else {
          // For copied files: create local reference only (can't duplicate in backend)
          const newFile = {
            ...item.data,
            id: newId,
            boardId: currentBoardId.value,
            x: newX,
            y: newY
          }
          files.value[newId] = newFile
          if (currentBoard.value) {
            currentBoard.value.items.push(newId)
          }
        }
      }
      
      pasteIndex++
    })

    // Clear clipboard if it was a cut operation
    if (clipboard.value.isCut) {
      clipboard.value = { items: [], isCut: false }
    }
    
    // Clear selection
    selectedItems.value.clear()
  }

  return {
    // State
    currentBoardId,
    boards,
    notes,
    files,
    selectedItems,
    isLassoActive,
    lassoRect,
    isLoading,
    // Computed
    currentBoard,
    breadcrumbs,
    selectedNotes,
    selectedBoards,
    selectedFiles,
    // Actions
    setCurrentBoard,
    loadBoardAncestors,
    loadBoardData,
    createNote,
    createBoard,
    createFileItem,
    updateNote,
    updateBoard,
    updateFile,
    deleteItems,
    selectItem,
    deselectItem,
    clearSelection,
    toggleSelection,
    setLassoRect,
    selectItemsInLasso,
    moveItems,
    moveItemsToBoard,
    placeItemFromPending,
    clearPendingPlacements,
    pendingPlacements,
    clipboard,
    copyItems,
    cutItems,
    pasteItems
  }
})
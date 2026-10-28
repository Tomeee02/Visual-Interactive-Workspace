import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import { BOARD_TEMPLATES } from '../boardTemplates'

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
  const pendingTemplateBoards = ref(new Set())
  const templateChooserBoardId = ref(null)
  const clipboard = ref({ items: [], isCut: false }) // items: [{type, data}], isCut: boolean
  const cutFileIds = ref(new Set()) // Track cut files (files can't be deleted, only moved on paste)
  const undoStack = []
  let undoGroupActive = false
  let pendingUndoRestore = Promise.resolve()

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
      result[key === 'tableData' ? 'checklist_items' : camelToSnake(key)] = value
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
      item_type: note.itemType || 'note',
      checklist_items: note.checklistItems || [],
      title: note.title || 'New checklist',
      show_title: note.showTitle || false,
      accent_color: note.accentColor || '#FFFFFF',
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
      show_preview: file.showPreview !== false,
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
    await pendingUndoRestore
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
      const pendingItemIds = []

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
          itemType: n.item_type || 'note',
          checklistItems: n.checklist_items || [],
          tableData: n.checklist_items || [],
          title: n.title || 'New checklist',
          showTitle: n.show_title || false,
          accentColor: n.accent_color || '#FFFFFF',
          bgColor: n.bg_color,
          textColor: n.item_type === 'checklist' ? '#000000' : n.text_color
        }
        notes.value[n.id] = note
        itemIds.push(n.id)
        if (n.x <= -9000 && n.y <= -9000) pendingItemIds.push(n.id)
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
        if (b.x <= -9000 && b.y <= -9000) pendingItemIds.push(b.id)
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
          showPreview: f.show_preview !== false,
          x: snapToGrid(f.x),
          y: snapToGrid(f.y)
        }
        files.value[f.id] = fileItem
        itemIds.push(f.id)
        if (f.x <= -9000 && f.y <= -9000) pendingItemIds.push(f.id)
      })

      if (pendingItemIds.length > 0) {
        pendingPlacements.value[boardId] = [
          ...new Set([...(pendingPlacements.value[boardId] || []), ...pendingItemIds])
        ]
      }

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

  function createNote(x, y, overrides = {}) {
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
      accentColor: '#FFFFFF',
      bgColor: '#FEF3C7',
      textColor: '#000000',
      ...overrides
    }
    notes.value[id] = note
    if (currentBoard.value) {
      currentBoard.value.items.push(id)
    }
    
    // Save to backend (convert to snake_case)
    api.createNote(noteToApi(note)).catch(err => {
      console.error('Failed to create note:', err)
    })
    recordCreateUndo('note', id)
    
    return note
  }

  function showTemplateChooserForNewBoard(boardId) {
    if (!pendingTemplateBoards.value.has(boardId)) return

    pendingTemplateBoards.value.delete(boardId)
    if (boards.value[boardId]?.items?.length === 0) {
      templateChooserBoardId.value = boardId
    }
  }

  function dismissTemplateChooser() {
    templateChooserBoardId.value = null
  }

  function applyBoardTemplate(templateId, keepExamples = false) {
    const boardId = templateChooserBoardId.value
    const template = BOARD_TEMPLATES.find(item => item.id === templateId)
    if (!boardId || boardId !== currentBoardId.value || !template) return

    template.items.forEach(item => {
      createNote(item.x, item.y, {
        width: item.width,
        height: item.height,
        bgColor: item.bgColor,
        content: keepExamples ? item.example : item.placeholder
      })
    })
    dismissTemplateChooser()
  }

  function createChecklist(x, y) {
    const id = `checklist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const checklist = {
      id,
      type: 'note',
      itemType: 'checklist',
      boardId: currentBoardId.value,
      x,
      y,
      width: 277,
      height: 190,
      content: '',
      checklistItems: [{ text: '', checked: false }],
      title: 'New checklist',
      showTitle: false,
      accentColor: '#FFFFFF',
      bgColor: '#FFFFFF',
      textColor: '#1F2937'
    }
    notes.value[id] = checklist
    if (currentBoard.value) currentBoard.value.items.push(id)
    api.createNote(noteToApi(checklist)).catch(err => {
      console.error('Failed to create checklist:', err)
    })
    recordCreateUndo('note', id)
    return checklist
  }

  function createTable(x, y) {
    const id = `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const table = {
      id, type: 'note', itemType: 'table', boardId: currentBoardId.value,
      x, y, width: 300, height: 140, content: '',
      tableData: Array.from({ length: 4 }, () => Array(3).fill('')),
      checklistItems: Array.from({ length: 4 }, () => Array(3).fill('')),
      bgColor: '#FFFFFF', textColor: '#1F2937'
    }
    notes.value[id] = table
    if (currentBoard.value) currentBoard.value.items.push(id)
    api.createNote(noteToApi(table)).catch(err => console.error('Failed to create table:', err))
    recordCreateUndo('note', id)
    return table
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
    pendingTemplateBoards.value.add(id)
    if (currentBoard.value) {
      currentBoard.value.items.push(id)
    }
    
    // Save to backend (convert to snake_case)
    api.createBoard(boardToApi(board)).catch(err => {
      console.error('Failed to create board:', err)
    })
    recordCreateUndo('board', id)
    
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
      showPreview: true,
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
        recordCreateUndo('file', id)
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
      recordFieldUndo('note', id, notes.value[id], updates)
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
      recordFieldUndo('board', id, boards.value[id], updates)
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
      recordFieldUndo('file', id, files.value[id], updates)
      Object.assign(files.value[id], updates)
      // Save only changed fields to backend (convert keys to snake_case)
      const apiUpdates = updatesToApi(updates)
      api.updateFile(id, apiUpdates).catch(err => {
        console.error('Failed to update file:', err, 'Data:', apiUpdates)
      })
    }
  }

  async function captureDeletionSnapshot(itemIds) {
    const boardQueue = itemIds.filter(id => boards.value[id] && id !== 'root')
    const loadedBoards = new Set()

    while (boardQueue.length > 0) {
      const boardId = boardQueue.shift()
      if (loadedBoards.has(boardId)) continue
      loadedBoards.add(boardId)

      await loadBoardData(boardId)
      const board = boards.value[boardId]
      if (!board) continue

      const missingItems = board.items.filter(id => !notes.value[id] && !files.value[id] && !boards.value[id])
      if (missingItems.length > 0) {
        throw new Error(`Cannot snapshot unloaded items for board ${boardId}`)
      }
      board.items.forEach(id => {
        if (boards.value[id] && id !== 'root') boardQueue.push(id)
      })
    }

    const entities = []
    const visited = new Set()

    function collect(id) {
      if (visited.has(id)) return
      visited.add(id)

      if (notes.value[id]) {
        entities.push({ id, type: 'note', data: { ...notes.value[id] } })
      } else if (files.value[id]) {
        entities.push({ id, type: 'file', data: { ...files.value[id] } })
      } else if (boards.value[id] && id !== 'root') {
        const board = boards.value[id]
        entities.push({ id, type: 'board', data: { ...board, items: [...board.items] } })
        board.items.forEach(collect)
      }
    }

    itemIds.forEach(collect)
    return {
      kind: 'delete',
      entities,
      selectedIds: [...itemIds],
      boardItems: Object.fromEntries(
        Object.entries(boards.value).map(([id, board]) => [id, [...board.items]])
      ),
      pendingPlacements: Object.fromEntries(
        Object.entries(pendingPlacements.value).map(([id, placements]) => [id, [...placements]])
      )
    }
  }

  async function deleteItems(itemIds) {
    let deletionSnapshot
    try {
      deletionSnapshot = await captureDeletionSnapshot(itemIds)
    } catch (error) {
      console.error('Failed to snapshot deleted items:', error)
      return
    }
    if (deletionSnapshot.entities.length === 0) return

    await Promise.all(deletionSnapshot.entities
      .filter(entity => entity.type === 'file')
      .map(async ({ data }) => {
        if (!data.fileUrl) return
        try {
          const response = await fetch(data.fileUrl, { credentials: 'include' })
          if (response.ok) data.undoBlob = await response.blob()
        } catch (error) {
          console.error('Failed to preserve file for undo:', error)
        }
      }))

    pushUndoAction(deletionSnapshot)
    const deleteRequests = []

    itemIds.forEach(id => {
      if (notes.value[id]) {
        const board = currentBoard.value
        if (board) {
          board.items = board.items.filter(itemId => itemId !== id)
        }
        delete notes.value[id]
        deleteRequests.push(api.deleteNote(id).catch(console.error))
      } else if (files.value[id]) {
        const board = currentBoard.value
        if (board) {
          board.items = board.items.filter(itemId => itemId !== id)
        }
        delete files.value[id]
        deleteRequests.push(api.deleteFile(id).catch(console.error))
      } else if (boards.value[id] && id !== 'root') {
        const board = boards.value[id]
        const parentBoard = boards.value[board.parentId]
        if (parentBoard) {
          parentBoard.items = parentBoard.items.filter(itemId => itemId !== id)
        }
        deleteBoard(id, deleteRequests)
      }
    })
    deletionSnapshot.deletePromise = Promise.all(deleteRequests)
    selectedItems.value.clear()
    await deletionSnapshot.deletePromise
  }

  function deleteBoard(boardId, deleteRequests = []) {
    const board = boards.value[boardId]
    if (!board) return

    board.items.forEach(itemId => {
      if (notes.value[itemId]) {
        delete notes.value[itemId]
        deleteRequests.push(api.deleteNote(itemId).catch(console.error))
      } else if (files.value[itemId]) {
        delete files.value[itemId]
        deleteRequests.push(api.deleteFile(itemId).catch(console.error))
      } else if (boards.value[itemId]) {
        deleteBoard(itemId, deleteRequests)
      }
    })

    delete boards.value[boardId]
    deleteRequests.push(api.deleteBoard(boardId).catch(console.error))
    return deleteRequests
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
        
        if (file.showPreview !== false && !isImage && file.thumbnailUrl) {
          // PDF/DOCX with thumbnail: 284px x 410px
          itemWidth = 284
          itemHeight = 410
        } else if (file.showPreview !== false && isImage && file.fileUrl) {
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

  function pushUndoAction(action) {
    undoStack.push(action)
    if (undoStack.length > 100) undoStack.shift()
  }

  function recordCreateUndo(type, id) {
    pushUndoAction({ kind: 'create', type, id })
  }

  function recordFieldUndo(type, id, item, updates) {
    if (undoGroupActive) return
    const previousValues = {}
    Object.keys(updates).forEach(key => {
      if (item[key] !== updates[key]) previousValues[key] = item[key]
    })
    if (Object.keys(previousValues).length > 0) {
      pushUndoAction({ kind: 'fields', type, id, values: previousValues })
    }
  }

  function captureUndoSnapshot(itemIds) {
    undoGroupActive = true
    const entities = itemIds.flatMap(id => {
      if (notes.value[id]) return [{ id, type: 'note', data: { ...notes.value[id] } }]
      if (boards.value[id]) return [{ id, type: 'board', data: { ...boards.value[id] } }]
      if (files.value[id]) return [{ id, type: 'file', data: { ...files.value[id] } }]
      return []
    })

    return {
      entities,
      boardItems: Object.fromEntries(
        Object.entries(boards.value).map(([id, board]) => [id, [...board.items]])
      ),
      pendingPlacements: Object.fromEntries(
        Object.entries(pendingPlacements.value).map(([id, placements]) => [id, [...placements]])
      )
    }
  }

  function commitUndoSnapshot(snapshot) {
    const currentSnapshot = captureUndoSnapshot(snapshot.entities.map(entity => entity.id))
    undoGroupActive = false
    if (
      JSON.stringify(snapshot.entities) === JSON.stringify(currentSnapshot.entities) &&
      JSON.stringify(snapshot.boardItems) === JSON.stringify(currentSnapshot.boardItems) &&
      JSON.stringify(snapshot.pendingPlacements) === JSON.stringify(currentSnapshot.pendingPlacements)
    ) return

    pushUndoAction(snapshot)
  }

  function undoLastAction() {
    const snapshot = undoStack.pop()
    if (!snapshot) return false

    if (snapshot.kind === 'delete') {
      snapshot.entities.forEach(({ id, type, data }) => {
        const restoredData = { ...data }
        if (type === 'board') boards.value[id] = restoredData
        else if (type === 'note') notes.value[id] = restoredData
        else {
          delete restoredData.undoBlob
          files.value[id] = {
            ...restoredData,
            fileUrl: data.undoBlob ? data.fileUrl : null,
            thumbnailUrl: data.undoBlob ? data.thumbnailUrl : null,
            uploading: false,
            uploadError: !data.undoBlob
          }
        }
      })
      Object.entries(snapshot.boardItems).forEach(([id, items]) => {
        if (boards.value[id]) boards.value[id].items = [...items]
      })
      pendingPlacements.value = Object.fromEntries(
        Object.entries(snapshot.pendingPlacements).map(([id, placements]) => [id, [...placements]])
      )
      snapshot.selectedIds.forEach(id => selectedItems.value.add(id))
      pendingUndoRestore = pendingUndoRestore.then(() => restoreDeletedItems(snapshot))
      return true
    }

    if (snapshot.kind === 'fields') {
      const item = snapshot.type === 'note' ? notes.value[snapshot.id] : snapshot.type === 'board' ? boards.value[snapshot.id] : files.value[snapshot.id]
      if (!item) return false
      Object.assign(item, snapshot.values)
      const update = snapshot.type === 'note' ? api.updateNote : snapshot.type === 'board' ? api.updateBoard : api.updateFile
      update(snapshot.id, updatesToApi(snapshot.values)).catch(console.error)
      return true
    }

    if (snapshot.kind === 'create') {
      const item = snapshot.type === 'note' ? notes.value[snapshot.id] : snapshot.type === 'board' ? boards.value[snapshot.id] : files.value[snapshot.id]
      if (!item) return false
      Object.values(boards.value).forEach(board => {
        board.items = board.items.filter(id => id !== snapshot.id)
      })
      if (snapshot.type === 'note') {
        delete notes.value[snapshot.id]
        api.deleteNote(snapshot.id).catch(console.error)
      } else if (snapshot.type === 'board') {
        delete boards.value[snapshot.id]
        api.deleteBoard(snapshot.id).catch(console.error)
      } else {
        delete files.value[snapshot.id]
        api.deleteFile(snapshot.id).catch(console.error)
      }
      selectedItems.value.delete(snapshot.id)
      return true
    }

    snapshot.entities.forEach(({ id, type, data }) => {
      const item = type === 'note' ? notes.value[id] : type === 'board' ? boards.value[id] : files.value[id]
      if (!item) return

      const updates = {}
      for (const key of ['x', 'y', 'boardId', 'parentId']) {
        if (item[key] !== data[key]) {
          item[key] = data[key]
          updates[key] = data[key]
        }
      }

      if (Object.keys(updates).length === 0) return
      const apiUpdates = updatesToApi(updates)
      const update = type === 'note' ? api.updateNote : type === 'board' ? api.updateBoard : api.updateFile
      update(id, apiUpdates).catch(console.error)
    })

    Object.entries(snapshot.boardItems).forEach(([id, items]) => {
      if (boards.value[id]) boards.value[id].items = [...items]
    })
    pendingPlacements.value = Object.fromEntries(
      Object.entries(snapshot.pendingPlacements).map(([id, placements]) => [id, [...placements]])
    )
    return true
  }

  async function restoreDeletedItems(snapshot) {
    await snapshot.deletePromise

    for (const { type, data } of snapshot.entities) {
      if (type === 'board') {
        await api.createBoard(boardToApi(data)).catch(console.error)
      }
    }

    for (const { type, data } of snapshot.entities) {
      if (type === 'note') {
        await api.createNote(noteToApi(data)).catch(console.error)
      }
    }

    for (const { id, type, data } of snapshot.entities) {
      if (type !== 'file' || !data.undoBlob) continue
      const upload = new FormData()
      upload.append('id', id)
      upload.append('board_id', data.boardId || '')
      upload.append('filename', data.filename)
      upload.append('file', new File([data.undoBlob], data.filename, { type: data.undoBlob.type }))
      upload.append('file_size', String(data.fileSize || data.undoBlob.size))
      upload.append('x', String(data.x || 0))
      upload.append('y', String(data.y || 0))
      upload.append('show_preview', String(data.showPreview !== false))

      try {
        const response = await api.uploadFile(upload)
        Object.assign(files.value[id], {
          fileUrl: response.file_url || null,
          thumbnailUrl: response.thumbnail_url || null,
          fileSize: response.file_size,
          uploadError: false
        })
      } catch (error) {
        console.error('Failed to restore deleted file:', error)
        if (files.value[id]) files.value[id].uploadError = true
      }
    }
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
    templateChooserBoardId,
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
    createChecklist,
    createTable,
    createBoard,
    showTemplateChooserForNewBoard,
    dismissTemplateChooser,
    applyBoardTemplate,
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
    captureUndoSnapshot,
    commitUndoSnapshot,
    undoLastAction,
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
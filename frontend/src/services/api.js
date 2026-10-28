import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: {
    'Content-Type': 'application/json'
  }
})

export default {
  async getSearchData() {
    async function getAll(resource) {
      const items = []
      let page = 1
      while (true) {
        const { data } = await api.get(`/${resource}/`, { params: { page } })
        if (Array.isArray(data)) return data
        items.push(...data.results)
        if (!data.next) return items
        page += 1
      }
    }
    const [boards, notes, files] = await Promise.all(['boards', 'notes', 'files'].map(getAll))
    return { boards, notes, files }
  },

  // Notes
  async getNotes(boardId) {
    const response = await api.get(`/notes/?board=${boardId}`)
    return response.data
  },

  async createNote(note) {
    const response = await api.post('/notes/', note)
    return response.data
  },

  async updateNote(id, note) {
    const response = await api.patch(`/notes/${id}/`, note)
    return response.data
  },

  async deleteNote(id) {
    await api.delete(`/notes/${id}/`)
  },

  // Tasks
  async getTasks(week) {
    const response = await api.get('/tasks/', { params: week ? { week } : undefined })
    return response.data.results || response.data
  },

  async createTask(task) {
    const response = await api.post('/tasks/', task)
    return response.data
  },

  async updateTask(id, task) {
    const response = await api.patch(`/tasks/${id}/`, task)
    return response.data
  },

  async deleteTask(id) {
    await api.delete(`/tasks/${id}/`)
  },

  async getLinkPreview(url) {
    const response = await api.get('/link-preview/', { params: { url } })
    return response.data
  },

  // Boards
  async getBoard(id) {
    const response = await api.get(`/boards/${id}/`)
    return response.data
  },

  async getBoards(parentId) {
    const response = await api.get(`/boards/?parent=${parentId}`)
    return response.data
  },

  async createBoard(board) {
    const response = await api.post('/boards/', board)
    return response.data
  },

  async updateBoard(id, board) {
    const response = await api.patch(`/boards/${id}/`, board)
    return response.data
  },

  async deleteBoard(id) {
    await api.delete(`/boards/${id}/`)
  },

  // Files
  async getFiles(boardId) {
    const response = await api.get(`/files/?board=${boardId}`)
    return response.data
  },

  async uploadFile(formData) {
    // Use the configured api instance with multipart/form-data content type override.
    // Previously used raw axios which bypassed the api instance configuration.
    const response = await api.post('/files/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  async updateFile(id, data) {
    const response = await api.patch(`/files/${id}/`, data)
    return response.data
  },

  async deleteFile(id) {
    await api.delete(`/files/${id}/`)
  },

  async getPreferences() {
    const response = await api.get('/preferences/')
    return response.data
  },

  async updatePreferences(preferences) {
    const response = await api.patch('/preferences/', preferences)
    return response.data
  },

  async textToSpeech(text, language) {
    const response = await api.post('/text-to-speech/', { text, language }, { responseType: 'blob' })
    return response.data
  },

  async getVault() {
    const response = await api.get('/vault/')
    return response.data
  },

  async createVault(config) {
    const response = await api.post('/vault/', config)
    return response.data
  },

  async updateVault(config) {
    const response = await api.patch('/vault/', config)
    return response.data
  },

  async getVaultEntries() {
    const entries = []
    let page = 1

    while (true) {
      const response = await api.get('/vault-entries/', { params: { page } })
      if (Array.isArray(response.data)) return response.data
      entries.push(...response.data.results)
      if (!response.data.next) return entries
      page += 1
    }
  },

  async createVaultEntry(entry) {
    const response = await api.post('/vault-entries/', entry)
    return response.data
  },

  async createVaultEntries(entries) {
    const response = await api.post('/vault-entries/bulk/', { entries })
    return response.data
  },

  async updateVaultEntry(id, entry) {
    const response = await api.patch(`/vault-entries/${id}/`, entry)
    return response.data
  },

  async deleteVaultEntry(id) {
    await api.delete(`/vault-entries/${id}/`)
  }
}
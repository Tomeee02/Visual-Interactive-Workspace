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
  }
}
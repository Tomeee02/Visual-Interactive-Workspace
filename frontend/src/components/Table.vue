<template>
  <div
    ref="root"
    class="workspace-table"
    :data-item-id="table.id"
    :class="{ selected, dragging: isDragging }"
    :style="{ left: table.x + 'px', top: table.y + 'px', width: dimensions.width + 'px', height: dimensions.height + 'px' }"
    @mousedown="handleMouseDown"
  >
    <div v-if="selected && !isDragging" class="column-labels" aria-hidden="true">
      <div v-for="(_, columnIndex) in displayData[0]" :key="columnIndex" class="column-label">
        {{ columnName(columnIndex) }}
      </div>
    </div>
    <div v-if="selected && !isDragging" class="row-labels" aria-hidden="true">
      <div v-for="(_, rowIndex) in displayData" :key="rowIndex" class="row-label">
        {{ rowIndex + 1 }}
      </div>
    </div>
    <table>
      <tbody>
        <tr v-for="(row, rowIndex) in displayData" :key="rowIndex">
          <td
            v-for="(cell, columnIndex) in row"
            :key="columnIndex"
            :class="{ header: rowIndex === 0 }"
            @dblclick.stop="startCellEditing(rowIndex, columnIndex, $event.currentTarget.querySelector('input'))"
          >
            <input
              :value="isFormula(cell) && !isEditingCell(rowIndex, columnIndex) ? displayValue(rowIndex, columnIndex) : cell"
              :readonly="isFormula(cell) && !isEditingCell(rowIndex, columnIndex)"
              :data-cell="`${rowIndex}-${columnIndex}`"
              :aria-label="`Cell ${cellName(rowIndex, columnIndex)}`"
              :aria-description="isFormula(cell) && !isEditingCell(rowIndex, columnIndex) ? `Calculated value: ${cell}` : undefined"
              @input="handleCellInput(rowIndex, columnIndex, $event)"
              @click="refreshAutocomplete(rowIndex, columnIndex, $event.target)"
              @keydown="handleCellKeydown(rowIndex, columnIndex, $event)"
              @blur="finishCellEditing"
            >
            <span
              v-if="isFormula(cell) && !isEditingCell(rowIndex, columnIndex)"
              class="formula-indicator"
              :title="cell"
              aria-hidden="true"
              @mousedown.stop.prevent="selectTable"
            >&#402;x</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div
      v-if="showAutocomplete"
      class="formula-menu"
      :style="{ left: autocomplete.column * CELL_WIDTH + 'px', top: (autocomplete.row + 1) * CELL_HEIGHT + 8 + 'px' }"
      @mousedown.stop.prevent
      @wheel.stop
    >
      <template v-if="!autocomplete.help">
        <div class="formula-options" role="listbox">
          <button
            v-for="(fn, index) in suggestions"
            :key="fn.name"
            type="button"
            role="option"
            class="formula-option"
            :class="{ active: index === autocomplete.index }"
            :aria-selected="index === autocomplete.index"
            @mouseenter="autocomplete.index = index"
            @click="applySuggestion(fn)"
          >
            {{ fn.name }}
          </button>
        </div>
        <button type="button" class="formula-help-link" @click="autocomplete.help = true">
          View formula help <span aria-hidden="true">›</span>
        </button>
      </template>
      <template v-else>
        <button type="button" class="formula-help-link back" @click="autocomplete.help = false">
          <span aria-hidden="true">‹</span> Formulas
        </button>
        <div class="formula-help">
          <div v-for="fn in FORMULA_FUNCTIONS" :key="fn.name" class="formula-help-item">
            <code>{{ fn.syntax }}</code>
            <p>{{ fn.description }}</p>
          </div>
        </div>
      </template>
    </div>
    <div v-if="selected && !isDragging" class="corner-dot" aria-hidden="true" />
    <div class="resize-handle" @mousedown.stop="startResize" />
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useWorkspaceStore } from '../store/workspace'

const props = defineProps({ table: Object, selected: Boolean })
const emit = defineEmits(['select', 'drag-start', 'drag', 'drag-end'])
const store = useWorkspaceStore()
const root = ref(null)
const isDragging = ref(false)
const isResizing = ref(false)
const CELL_WIDTH = 100
const CELL_HEIGHT = 35
const resizePreview = ref(null)
const editingCell = ref(null)

const displayData = computed(() => {
  const data = resizePreview.value || props.table.tableData || []
  const columns = Math.max(1, ...data.map(rowData => rowData.length))
  return data.map(rowData => Array.from({ length: columns }, (_, columnIndex) => rowData[columnIndex] ?? ''))
})

const dimensions = computed(() => {
  const rows = displayData.value.length || 1
  const columns = displayData.value[0]?.length || 1
  return { width: columns * CELL_WIDTH, height: rows * CELL_HEIGHT }
})

function cellName(row, column) {
  return `${columnName(column)}${row + 1}`
}

function columnName(column) {
  let name = ''
  let index = column
  do {
    name = String.fromCharCode(65 + (index % 26)) + name
    index = Math.floor(index / 26) - 1
  } while (index >= 0)
  return name
}

function columnIndex(letters) {
  return letters.toUpperCase().split('').reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1
}

function isFormula(value) {
  return typeof value === 'string' && value.trim().startsWith('=')
}

class FormulaError extends Error {
  constructor(code = '#ERROR') {
    super(code)
    this.code = code
  }
}

function cellValue(row, column, resolving) {
  const value = displayData.value?.[row]?.[column] ?? ''
  if (isFormula(value)) {
    const name = cellName(row, column)
    if (resolving.has(name)) return 0
    return evaluateFormula(value.trim().slice(1), new Set(resolving).add(name))
  }
  const text = String(value).trim()
  if (text === '') return null
  const number = Number(text)
  return Number.isFinite(number) ? number : text
}

function tokenize(source) {
  const tokens = []
  let position = 0
  while (position < source.length) {
    const rest = source.slice(position)
    let match
    if ((match = rest.match(/^\s+/))) {
      // skip whitespace
    } else if ((match = rest.match(/^(\d+\.?\d*|\.\d+)/))) {
      tokens.push({ type: 'number', value: Number(match[0]) })
    } else if ((match = rest.match(/^"([^"]*)"/))) {
      tokens.push({ type: 'string', value: match[1] })
    } else if ((match = rest.match(/^\$?([A-Za-z]+)\$?(\d+)(?![A-Za-z0-9_(])/))) {
      tokens.push({ type: 'ref', row: Number(match[2]) - 1, column: columnIndex(match[1]) })
    } else if ((match = rest.match(/^[A-Za-z_][A-Za-z0-9_.]*/))) {
      const name = match[0].toUpperCase()
      tokens.push(name === 'TRUE' || name === 'FALSE' ? { type: 'boolean', value: name === 'TRUE' } : { type: 'name', value: name })
    } else if ((match = rest.match(/^(<=|>=|<>|[-+*/()<>=,:&;])/))) {
      tokens.push({ type: 'op', value: match[0] === ';' ? ',' : match[0] })
    } else {
      throw new FormulaError()
    }
    position += match[0].length
  }
  return tokens
}

function toNumber(value) {
  if (value === null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const number = Number(value.trim())
    if (value.trim() !== '' && Number.isFinite(number)) return number
  }
  throw new FormulaError('#VALUE!')
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string' && /^(TRUE|FALSE)$/i.test(value)) return value.toUpperCase() === 'TRUE'
  return toNumber(value) !== 0
}

function compare(left, operator, right) {
  if (left === null) left = typeof right === 'string' ? '' : 0
  if (right === null) right = typeof left === 'string' ? '' : 0
  let a = left
  let b = right
  if (typeof a === 'string' || typeof b === 'string') {
    a = String(a).toLowerCase()
    b = String(b).toLowerCase()
  } else {
    a = toNumber(a)
    b = toNumber(b)
  }
  switch (operator) {
    case '=': return a === b
    case '<>': return a !== b
    case '<': return a < b
    case '>': return a > b
    case '<=': return a <= b
    default: return a >= b
  }
}

function scalar(value) {
  if (value?.type === 'range') {
    if (value.values.length === 1) return value.values[0]
    throw new FormulaError('#VALUE!')
  }
  return value
}

function numericArguments(args) {
  return args.flatMap(arg => arg?.type === 'range'
    ? arg.values.filter(value => typeof value === 'number')
    : [toNumber(arg)])
}

const formulaFunctions = {
  SUM: args => numericArguments(args).reduce((total, value) => total + value, 0),
  AVERAGE: args => {
    const values = numericArguments(args)
    if (!values.length) throw new FormulaError('#DIV/0!')
    return values.reduce((total, value) => total + value, 0) / values.length
  },
  MIN: args => {
    const values = numericArguments(args)
    return values.length ? Math.min(...values) : 0
  },
  MAX: args => {
    const values = numericArguments(args)
    return values.length ? Math.max(...values) : 0
  },
  COUNT: args => args.reduce((count, arg) => {
    if (arg?.type === 'range') return count + arg.values.filter(value => typeof value === 'number').length
    try {
      toNumber(arg)
      return count + 1
    } catch {
      return count
    }
  }, 0),
  IF: args => {
    if (args.length < 2 || args.length > 3) throw new FormulaError()
    const result = toBoolean(scalar(args[0])) ? args[1] : (args.length === 3 ? args[2] : false)
    return scalar(result)
  }
}

function evaluateFormula(expression, resolving) {
  const tokens = tokenize(expression)
  let index = 0
  const peek = () => tokens[index]
  const isOp = (...values) => peek()?.type === 'op' && values.includes(peek().value)
  const expect = value => {
    if (!isOp(value)) throw new FormulaError()
    index++
  }

  const parseComparison = () => {
    let left = parseConcat()
    while (isOp('=', '<>', '<', '>', '<=', '>=')) {
      const operator = tokens[index++].value
      left = compare(scalar(left), operator, scalar(parseConcat()))
    }
    return left
  }
  const parseConcat = () => {
    let left = parseAdditive()
    while (isOp('&')) {
      index++
      const right = scalar(parseAdditive())
      left = `${formatValue(scalar(left) ?? '')}${formatValue(right ?? '')}`
    }
    return left
  }
  const parseAdditive = () => {
    let left = parseTerm()
    while (isOp('+', '-')) {
      const operator = tokens[index++].value
      const right = toNumber(scalar(parseTerm()))
      left = operator === '+' ? toNumber(scalar(left)) + right : toNumber(scalar(left)) - right
    }
    return left
  }
  const parseTerm = () => {
    let left = parseUnary()
    while (isOp('*', '/')) {
      const operator = tokens[index++].value
      const right = toNumber(scalar(parseUnary()))
      if (operator === '/' && right === 0) throw new FormulaError('#DIV/0!')
      left = operator === '*' ? toNumber(scalar(left)) * right : toNumber(scalar(left)) / right
    }
    return left
  }
  const parseUnary = () => {
    if (isOp('-')) { index++; return -toNumber(scalar(parseUnary())) }
    if (isOp('+')) { index++; return toNumber(scalar(parseUnary())) }
    return parsePrimary()
  }
  const parsePrimary = () => {
    const token = tokens[index++]
    if (!token) throw new FormulaError()
    if (token.type === 'number' || token.type === 'string' || token.type === 'boolean') return token.value
    if (token.type === 'ref') {
      if (isOp(':')) {
        index++
        const end = tokens[index++]
        if (end?.type !== 'ref') throw new FormulaError('#REF!')
        const values = []
        for (let row = Math.min(token.row, end.row); row <= Math.max(token.row, end.row); row++) {
          for (let column = Math.min(token.column, end.column); column <= Math.max(token.column, end.column); column++) {
            values.push(cellValue(row, column, resolving))
          }
        }
        return { type: 'range', values }
      }
      return cellValue(token.row, token.column, resolving)
    }
    if (token.type === 'name') {
      const fn = formulaFunctions[token.value]
      if (!fn) throw new FormulaError('#NAME?')
      expect('(')
      const args = []
      if (!isOp(')')) {
        args.push(parseComparison())
        while (isOp(',')) {
          index++
          args.push(parseComparison())
        }
      }
      expect(')')
      return fn(args)
    }
    if (token.type === 'op' && token.value === '(') {
      const value = parseComparison()
      expect(')')
      return value
    }
    throw new FormulaError()
  }

  const result = scalar(parseComparison())
  if (index < tokens.length) throw new FormulaError()
  if (typeof result === 'number' && !Number.isFinite(result)) throw new FormulaError('#NUM!')
  return result
}

function formatValue(value) {
  if (typeof value === 'number') return String(Number(value.toFixed(6)))
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return value ?? ''
}

function displayValue(row, column) {
  try {
    return formatValue(cellValue(row, column, new Set()) ?? 0)
  } catch (error) {
    return error instanceof FormulaError ? error.code : '#ERROR'
  }
}

const FORMULA_FUNCTIONS = [
  { name: 'SUM', syntax: 'SUM(A1:A5)', description: 'Adds up the numbers in a range.' },
  { name: 'IF', syntax: 'IF(A1>10, "Yes", "No")', description: 'Returns one value if the condition is true, another if false.' },
  { name: 'MIN', syntax: 'MIN(A1:A5)', description: 'Returns the smallest number.' },
  { name: 'MAX', syntax: 'MAX(A1:A5)', description: 'Returns the largest number.' },
  { name: 'COUNT', syntax: 'COUNT(A1:A5)', description: 'Counts the cells that contain numbers.' },
  { name: 'AVERAGE', syntax: 'AVERAGE(A1:A5)', description: 'Returns the average of the numbers.' }
]

const autocomplete = ref(null)

const suggestions = computed(() => {
  if (!autocomplete.value) return []
  const query = autocomplete.value.query.toUpperCase()
  return FORMULA_FUNCTIONS.filter(fn => fn.name.startsWith(query))
})

const showAutocomplete = computed(() => Boolean(autocomplete.value && (autocomplete.value.help || suggestions.value.length)))

function refreshAutocomplete(row, column, input) {
  if (input.readOnly) {
    closeAutocomplete()
    return
  }
  const caret = input.selectionStart ?? input.value.length
  const beforeCaret = input.value.slice(0, caret)
  // Suggest right after the leading "=", or while typing a name after an operator, "(" or ","
  const match = beforeCaret.match(/^\s*=\s*([A-Za-z]*)$/) || beforeCaret.match(/[-+*/(,;<>=&]\s*([A-Za-z]+)$/)
  if (!match) {
    autocomplete.value = null
    return
  }
  const query = match[1]
  const sameCell = autocomplete.value?.row === row && autocomplete.value?.column === column
  autocomplete.value = {
    row,
    column,
    query,
    start: caret - query.length,
    end: caret,
    index: sameCell && autocomplete.value.query === query ? autocomplete.value.index : 0,
    help: false
  }
}

function closeAutocomplete() {
  autocomplete.value = null
}

function isEditingCell(row, column) {
  return editingCell.value?.row === row && editingCell.value?.column === column
}

function startCellEditing(row, column, input) {
  editingCell.value = { row, column }
  nextTick(() => {
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
    refreshAutocomplete(row, column, input)
  })
}

function finishCellEditing() {
  closeAutocomplete()
  editingCell.value = null
}

function handleCellInput(row, column, event) {
  editingCell.value = { row, column }
  updateCell(row, column, event.target.value)
  refreshAutocomplete(row, column, event.target)
}

function handleCellKeydown(row, column, event) {
  if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return
  if (showAutocomplete.value && event.key === 'Escape') {
    event.preventDefault()
    closeAutocomplete()
    return
  }
  if (showAutocomplete.value && !autocomplete.value.help) {
    const count = suggestions.value.length
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      autocomplete.value.index = (autocomplete.value.index + step + count) % count
      nextTick(() => root.value?.querySelector('.formula-option.active')?.scrollIntoView({ block: 'nearest' }))
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      applySuggestion(suggestions.value[autocomplete.value.index])
      return
    }
  }
  if (event.key !== 'Enter' && event.key !== 'Tab') return
  event.preventDefault()
  const step = event.shiftKey ? -1 : 1
  const nextRow = row + (event.key === 'Enter' ? step : 0)
  const nextColumn = column + (event.key === 'Tab' ? step : 0)
  root.value?.querySelector(`input[data-cell="${nextRow}-${nextColumn}"]`)?.focus()
}

function applySuggestion(fn) {
  if (!fn || !autocomplete.value) return
  const { row, column, start, end } = autocomplete.value
  const value = displayData.value[row][column]
  updateCell(row, column, `${value.slice(0, start)}${fn.name}(${value.slice(end)}`)
  closeAutocomplete()
  const caret = start + fn.name.length + 1
  nextTick(() => {
    const input = root.value?.querySelector(`input[data-cell="${row}-${column}"]`)
    if (!input) return
    input.focus()
    input.setSelectionRange(caret, caret)
  })
}

function updateCell(row, column, value) {
  const tableData = displayData.value.map(rowData => [...rowData])
  tableData[row][column] = value
  store.updateNote(props.table.id, { tableData })
}

function selectTable(event) {
  emit('select', event)
}

function handleMouseDown(event) {
  if (isResizing.value) return
  emit('select', event)
  isDragging.value = true
  emit('drag-start', event)
  const move = moveEvent => isDragging.value && emit('drag', moveEvent)
  const up = () => {
    if (isDragging.value) { isDragging.value = false; emit('drag-end') }
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

function startResize(event) {
  isResizing.value = true
  const startData = props.table.tableData.map(rowData => [...rowData])
  resizePreview.value = startData.map(rowData => [...rowData])
  const start = {
    x: event.clientX,
    y: event.clientY,
    rows: startData.length,
    columns: startData[0]?.length || 1
  }
  const move = moveEvent => {
    const deltaX = moveEvent.clientX - start.x
    const deltaY = moveEvent.clientY - start.y
    const nextColumns = Math.max(1, start.columns + Math.round(deltaX / CELL_WIDTH))
    const nextRows = Math.max(1, start.rows + Math.round(deltaY / CELL_HEIGHT))

    const tableData = Array.from({ length: nextRows }, (_, rowIndex) =>
      Array.from({ length: nextColumns }, (_, columnIndex) => startData[rowIndex]?.[columnIndex] ?? '')
    )
    resizePreview.value = tableData
  }
  const up = () => {
    isResizing.value = false
    if (resizePreview.value) {
      const tableData = resizePreview.value
      store.updateNote(props.table.id, {
        tableData,
        width: tableData[0].length * CELL_WIDTH,
        height: tableData.length * CELL_HEIGHT
      })
      resizePreview.value = null
    }
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
</script>

<style scoped>
.workspace-table { position: absolute; padding: 0; background: transparent; border-radius: 0; box-shadow: none; cursor: move; user-select: none; }
.workspace-table { outline: 1px solid #E5E7EB; }
.workspace-table.selected { outline: 2px solid #1F2937; outline-offset: 0; }
.workspace-table.dragging { opacity: .8; z-index: 100; }
.column-labels, .row-labels { position: absolute; display: flex; overflow: hidden; color: #6B7280; font-size: 11px; font-weight: 400; background: #fff; border: 1px solid #E5E7EB; border-radius: 6px; box-sizing: border-box; box-shadow: 0 1px 2px rgba(15, 23, 42, .05); pointer-events: none; }
.column-labels { top: -32px; left: 0; height: 24px; }
.row-labels { top: 0; left: -34px; width: 26px; flex-direction: column; }
.column-label, .row-label { display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box; }
.column-label { width: 100px; height: 100%; }
.column-label:not(:last-child) { border-right: 1px solid #E5E7EB; }
.row-label { width: 100%; height: 35px; }
.row-label:not(:last-child) { border-bottom: 1px solid #E5E7EB; }
.column-labels { margin-left: -1px; }
.row-labels { margin-top: -1px; }
.corner-dot { position: absolute; top: -5px; right: -5px; width: 8px; height: 8px; background: #fff; border: 1px solid #D1D5DB; border-radius: 50%; box-shadow: 0 1px 2px rgba(15, 23, 42, .15); pointer-events: none; }
table { display: block; width: 100%; height: auto; }
tbody { display: block; width: 100%; }
tr { display: flex; width: 100%; height: 35px; }
td { position: relative; flex: 0 0 100px; width: 100px; min-width: 100px; height: 35px; box-sizing: border-box; border: 0; border-right: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 0; background: #fff; }
td.header { background: #D1D5DB; }
tr:last-child td { border-bottom: 0; }
td:last-child { border-right: 0; }
td input { width: 100%; height: 35px; padding: 6px; border: 0; background: transparent; outline: 0; color: #1F2937; font: inherit; font-size: 13px; }
td input[readonly] { padding-right: 24px; }
.formula-indicator { position: absolute; top: 3px; right: 4px; color: #6B7280; font-size: 10px; line-height: 12px; cursor: help; }
.formula-menu { position: absolute; z-index: 200; width: 170px; padding: 4px 0; background: #fff; border: 1px solid #E5E7EB; border-radius: 6px; box-shadow: 0 8px 24px rgba(15, 23, 42, .12); cursor: default; font-size: 13px; }
.formula-menu::before { content: ''; position: absolute; top: -6px; left: 50px; width: 10px; height: 10px; background: #fff; border-top: 1px solid #E5E7EB; border-left: 1px solid #E5E7EB; transform: translateX(-50%) rotate(45deg); }
.formula-options { position: relative; max-height: 192px; overflow-y: auto; }
.formula-option { display: block; width: 100%; height: 32px; padding: 0 12px; border: 0; background: transparent; color: #374151; font: inherit; text-align: left; cursor: pointer; }
.formula-option.active { background: #F3F4F6; }
.formula-help-link { position: relative; display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 4px; padding: 8px 12px 4px; border: 0; border-top: 1px solid #E5E7EB; background: transparent; color: #9CA3AF; font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.formula-help-link:hover { color: #4B5563; }
.formula-help-link.back { justify-content: flex-start; gap: 6px; margin: 0 0 4px; padding: 4px 12px 8px; border-top: 0; border-bottom: 1px solid #E5E7EB; }
.formula-help { max-height: 220px; overflow-y: auto; padding: 0 12px; }
.formula-help-item { padding: 6px 0; }
.formula-help-item:not(:last-child) { border-bottom: 1px solid #F3F4F6; }
.formula-help-item code { color: #1F2937; font-size: 11px; font-weight: 600; }
.formula-help-item p { margin: 2px 0 0; color: #6B7280; font-size: 11px; line-height: 1.35; }
.resize-handle { position: absolute; right: 1px; bottom: 1px; width: 12px; height: 12px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 45%, #6B7280 45%, #6B7280 52%, transparent 52%, transparent 70%, #6B7280 70%, #6B7280 77%, transparent 77%); }
</style>
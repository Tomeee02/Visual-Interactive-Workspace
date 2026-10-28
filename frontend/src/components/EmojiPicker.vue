<template>
  <div class="emoji-picker" @click.stop>
    <div class="emoji-picker-header">
      <span>Select Emoji</span>
      <label class="grayscale-toggle">
        <input type="checkbox" :checked="selectedBoardGrayscale" @change="toggleGrayscale" />
        <span class="toggle-slider"></span>
        <span class="toggle-label">B&W</span>
      </label>
    </div>
    <div class="emoji-search">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search emoji..."
        class="emoji-search-input"
        ref="searchInput"
      />
      <button
        type="button"
        class="emoji-add-toggle"
        title="Add emoji"
        aria-label="Add emoji"
        :aria-expanded="showAddEmoji"
        aria-controls="custom-emoji-form"
        @click="toggleAddEmoji"
      >+</button>
    </div>
    <form v-if="showAddEmoji" id="custom-emoji-form" class="emoji-add-form" @submit.prevent="addCustomEmoji" @keydown.esc.stop.prevent="closeAddEmoji">
      <div class="emoji-add-row">
        <input
          v-model="customEmojiInput"
          ref="customEmojiField"
          type="text"
          class="emoji-search-input"
          placeholder="Paste emoji..."
          aria-label="New emoji"
          maxlength="64"
          :aria-invalid="Boolean(addEmojiError)"
          :aria-describedby="addEmojiError ? 'custom-emoji-error' : undefined"
          @input="validateCustomEmojiInput"
          @paste="pasteCustomEmoji"
        />
        <button type="submit" class="emoji-add-action">Add</button>
        <button type="button" class="emoji-add-action" @click="closeAddEmoji">Cancel</button>
      </div>
      <p v-if="addEmojiError" id="custom-emoji-error" class="emoji-add-error" role="alert">{{ addEmojiError }}</p>
    </form>
    <div class="emoji-grid" ref="emojiGrid">
      <section v-for="topic in filteredEmojiTopics" :key="topic.name" class="emoji-topic">
        <h3 class="emoji-topic-title">{{ topic.name }}</h3>
        <div class="emoji-topic-emojis">
          <div
            v-for="item in topic.emojis"
            :key="item.emoji"
            class="emoji-option"
            @click="selectEmoji(item.emoji)"
            :title="item.keywords.join(', ')"
            :class="{ grayscale: selectedBoardGrayscale }"
          >
            {{ item.emoji }}
          </div>
        </div>
      </section>
    </div>
    <div v-if="filteredEmojiTopics.length === 0" class="no-results">
      No emojis found
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import emojiRegex from 'emoji-regex'
import { useWorkspaceStore } from '../store/workspace'

const emit = defineEmits(['select', 'close'])
const store = useWorkspaceStore()

const searchQuery = ref('')
const searchInput = ref(null)
const emojiGrid = ref(null)
const showAddEmoji = ref(false)
const customEmojiInput = ref('')
const customEmojiField = ref(null)
const addEmojiError = ref('')
const customEmojiStorageKey = 'workspace-custom-emojis'
const customEmojis = ref(loadCustomEmojis())

function isSingleEmoji(value) {
  if (typeof value !== 'string' || !value || value.length > 64) {
    return false
  }
  const matches = Array.from(value.matchAll(emojiRegex()))
  return matches.length === 1 && matches[0][0] === value
}

function validateCustomEmojiInput() {
  const emoji = customEmojiInput.value.trim()
  addEmojiError.value = emoji && !isSingleEmoji(emoji) ? 'Paste a single emoji.' : ''
}

function pasteCustomEmoji(event) {
  event.preventDefault()
  const emoji = event.clipboardData?.getData('text/plain').trim() || ''
  if (!isSingleEmoji(emoji)) {
    addEmojiError.value = 'Paste a single emoji.'
    return
  }
  customEmojiInput.value = emoji
  addEmojiError.value = ''
}

function loadCustomEmojis() {
  try {
    const saved = JSON.parse(localStorage.getItem(customEmojiStorageKey) || '[]')
    return Array.isArray(saved)
      ? [...new Set(saved.filter(value => typeof value === 'string' && isSingleEmoji(value)))]
      : []
  } catch {
    return []
  }
}

async function toggleAddEmoji() {
  if (showAddEmoji.value) {
    closeAddEmoji()
    return
  }
  showAddEmoji.value = true
  await nextTick()
  customEmojiField.value?.focus()
}

function closeAddEmoji() {
  showAddEmoji.value = false
  customEmojiInput.value = ''
  addEmojiError.value = ''
  searchInput.value?.focus()
}

async function addCustomEmoji() {
  const emoji = customEmojiInput.value.trim()
  if (!isSingleEmoji(emoji)) {
    addEmojiError.value = 'Paste a single emoji.'
    return
  }
  const normalizedEmoji = emoji.replace(/\uFE0F/g, '')
  if ([...emojiData.map(item => item.emoji), ...customEmojis.value].some(value => value.replace(/\uFE0F/g, '') === normalizedEmoji)) {
    addEmojiError.value = 'This emoji is already in the picker.'
    return
  }
  const updated = [...customEmojis.value, emoji]
  try {
    localStorage.setItem(customEmojiStorageKey, JSON.stringify(updated))
  } catch {
    addEmojiError.value = 'Could not save the emoji. Check browser storage permissions.'
    return
  }
  customEmojis.value = updated
  searchQuery.value = ''
  closeAddEmoji()
  await nextTick()
  emojiGrid.value?.scrollTo({ top: emojiGrid.value.scrollHeight })
}

onMounted(() => {
  searchInput.value?.focus()
})

const selectedBoardGrayscale = computed(() => {
  const selectedBoard = store.selectedBoards[0]
  return selectedBoard?.emojiGrayscale !== undefined ? selectedBoard.emojiGrayscale : false
})

function toggleGrayscale() {
  const selectedBoard = store.selectedBoards[0]
  if (selectedBoard) {
    store.updateBoard(selectedBoard.id, { emojiGrayscale: !selectedBoard.emojiGrayscale })
  }
}

const emojiData = [
  { "emoji": "📋", "keywords": ["clipboard", "list", "task", "todo", "board"] },
  { "emoji": "☑️", "keywords": ["checkbox", "checklist", "task", "todo", "done"] },
  { "emoji": "🔔", "keywords": ["bell", "reminder", "notification", "alert"] },
  { "emoji": "📣", "keywords": ["announcement", "megaphone", "team", "news"] },
  { "emoji": "📥", "keywords": ["inbox", "incoming", "download", "receive"] },
  { "emoji": "📤", "keywords": ["outbox", "outgoing", "upload", "send"] },
  { "emoji": "👥", "keywords": ["team", "people", "group", "collaboration"] },
  { "emoji": "🧑‍🤝‍🧑", "keywords": ["teamwork", "collaboration", "people", "partnership"] },
  { "emoji": "📁", "keywords": ["folder", "file", "directory", "documents"] },
  { "emoji": "📂", "keywords": ["folder", "open", "file", "directory"] },
  { "emoji": "📄", "keywords": ["document", "page", "paper", "file"] },
  { "emoji": "📝", "keywords": ["memo", "note", "write", "edit", "pencil"] },
  { "emoji": "📊", "keywords": ["chart", "graph", "statistics", "data", "analytics", "presentation", "research", "project"] },
  { "emoji": "📈", "keywords": ["chart", "graph", "growth", "increase", "up"] },
  { "emoji": "📉", "keywords": ["chart", "graph", "decline", "decrease", "down"] },
  { "emoji": "🗂️", "keywords": ["dividers", "organize", "tabs", "files"] },
  { "emoji": "🗃️", "keywords": ["box", "archive", "storage", "files"] },
  { "emoji": "📦", "keywords": ["package", "box", "delivery", "shipping"] },
  { "emoji": "📮", "keywords": ["mailbox", "post", "mail", "inbox"] },
  { "emoji": "💼", "keywords": ["briefcase", "work", "business", "job"] },
  { "emoji": "🗓️", "keywords": ["calendar", "date", "schedule", "event"] },
  { "emoji": "📅", "keywords": ["calendar", "date", "schedule", "planning"] },
  { "emoji": "📆", "keywords": ["calendar", "date", "tear-off"] },
  { "emoji": "🗒️", "keywords": ["notepad", "spiral", "notes", "memo"] },
  { "emoji": "📒", "keywords": ["ledger", "notebook", "journal"] },
  { "emoji": "📚", "keywords": ["books", "library", "study", "learn", "reading"] },
  { "emoji": "📖", "keywords": ["book", "open", "read", "story"] },

  { "emoji": "🎯", "keywords": ["target", "goal", "aim", "dart", "focus"] },
  { "emoji": "🎨", "keywords": ["art", "paint", "palette", "creative", "design"] },
  { "emoji": "🎭", "keywords": ["theater", "drama", "masks", "acting", "performance"] },
  { "emoji": "🎪", "keywords": ["circus", "tent", "event", "show"] },
  { "emoji": "🎬", "keywords": ["movie", "film", "video", "action", "cinema"] },
  { "emoji": "🎵", "keywords": ["music", "note", "song", "sound", "audio"] },
  { "emoji": "🎶", "keywords": ["music", "notes", "melody", "song"] },
  { "emoji": "🎸", "keywords": ["guitar", "music", "rock", "instrument"] },
  { "emoji": "🎹", "keywords": ["piano", "keyboard", "music", "instrument"] },
  { "emoji": "🎤", "keywords": ["microphone", "sing", "karaoke", "voice"] },
  { "emoji": "🎧", "keywords": ["headphone", "music", "audio", "listen"] },
  { "emoji": "📷", "keywords": ["camera", "photo", "picture", "photography"] },
  { "emoji": "📸", "keywords": ["camera", "flash", "photo", "snapshot"] },
  { "emoji": "🎥", "keywords": ["camera", "movie", "video", "film"] },
  { "emoji": "🖼️", "keywords": ["frame", "picture", "art", "painting", "image"] },
  { "emoji": "✏️", "keywords": ["pencil", "write", "draw", "edit"] },
  { "emoji": "🖊️", "keywords": ["pen", "write", "sign"] },
  { "emoji": "🖌️", "keywords": ["brush", "paint", "art", "draw"] },
  { "emoji": "🖍️", "keywords": ["crayon", "draw", "color", "art"] },

  { "emoji": "🏠", "keywords": ["house", "home", "building", "residence"] },
  { "emoji": "🏡", "keywords": ["house", "garden", "home", "property"] },
  { "emoji": "🏢", "keywords": ["office", "building", "work", "business"] },
  { "emoji": "🏪", "keywords": ["store", "shop", "convenience", "retail"] },
  { "emoji": "🏫", "keywords": ["school", "education", "learn", "building"] },
  { "emoji": "🏬", "keywords": ["department", "store", "mall", "shopping"] },
  { "emoji": "🏭", "keywords": ["factory", "industry", "manufacturing", "plant"] },
  { "emoji": "🏥", "keywords": ["hospital", "health", "medical", "doctor"] },
  { "emoji": "🏦", "keywords": ["bank", "finance", "money", "building"] },
  { "emoji": "🏨", "keywords": ["hotel", "travel", "accommodation", "stay"] },
  { "emoji": "🏛️", "keywords": ["museum", "classical", "building", "government"] },
  { "emoji": "⛪", "keywords": ["church", "religion", "wedding", "building"] },
  { "emoji": "🕌", "keywords": ["mosque", "religion", "islam", "building"] },
  { "emoji": "🏰", "keywords": ["castle", "medieval", "kingdom", "fantasy"] },

  { "emoji": "💡", "keywords": ["bulb", "idea", "light", "innovation", "think"] },
  { "emoji": "🔍", "keywords": ["search", "magnify", "find", "look", "zoom"] },
  { "emoji": "🔎", "keywords": ["search", "magnify", "find", "investigate"] },
  { "emoji": "🔧", "keywords": ["wrench", "tool", "fix", "settings", "repair"] },
  { "emoji": "🔨", "keywords": ["hammer", "tool", "build", "construct"] },
  { "emoji": "⚙️", "keywords": ["gear", "settings", "config", "cog", "mechanical"] },
  { "emoji": "🔩", "keywords": ["bolt", "nut", "hardware", "tool"] },
  { "emoji": "⛏️", "keywords": ["pick", "mining", "dig", "tool"] },
  { "emoji": "🛠️", "keywords": ["tools", "hammer", "wrench", "build", "fix"] },
  { "emoji": "📱", "keywords": ["phone", "mobile", "smartphone", "device"] },
  { "emoji": "💻", "keywords": ["laptop", "computer", "work", "tech"] },
  { "emoji": "⌨️", "keywords": ["keyboard", "type", "computer", "input"] },
  { "emoji": "🖥️", "keywords": ["desktop", "computer", "monitor", "screen"] },
  { "emoji": "🖨️", "keywords": ["printer", "print", "document", "office"] },
  { "emoji": "🖱️", "keywords": ["mouse", "click", "computer", "cursor"] },
  { "emoji": "💾", "keywords": ["floppy", "save", "disk", "storage"] },
  { "emoji": "💿", "keywords": ["cd", "disk", "music", "data"] },
  { "emoji": "🔌", "keywords": ["plug", "electric", "power", "connect"] },
  { "emoji": "🔋", "keywords": ["battery", "power", "energy", "charge"] },
  { "emoji": "📡", "keywords": ["satellite", "antenna", "signal", "broadcast"] },
  { "emoji": "📺", "keywords": ["tv", "television", "screen", "watch"] },
  { "emoji": "📻", "keywords": ["radio", "music", "broadcast", "audio"] },
  { "emoji": "🎮", "keywords": ["game", "controller", "gaming", "play", "video"] },
  { "emoji": "🕹️", "keywords": ["joystick", "game", "arcade", "control"] },

  { "emoji": "🌟", "keywords": ["star", "glow", "shine", "sparkle", "favorite"] },
  { "emoji": "⭐", "keywords": ["star", "favorite", "rating", "yellow"] },
  { "emoji": "✨", "keywords": ["sparkle", "magic", "shine", "clean", "new"] },
  { "emoji": "💫", "keywords": ["dizzy", "star", "shooting", "magic"] },
  { "emoji": "🔥", "keywords": ["fire", "hot", "trending", "flame", "popular"] },
  { "emoji": "💥", "keywords": ["boom", "explosion", "collision", "impact"] },
  { "emoji": "💯", "keywords": ["hundred", "perfect", "score", "complete"] },
  { "emoji": "✅", "keywords": ["check", "done", "complete", "yes", "correct"] },
  { "emoji": "❌", "keywords": ["cross", "no", "wrong", "delete", "cancel"] },
  { "emoji": "❓", "keywords": ["question", "help", "ask", "unknown"] },
  { "emoji": "❗", "keywords": ["exclamation", "important", "urgent", "alert"] },
  { "emoji": "⚠️", "keywords": ["warning", "alert", "caution", "danger"] },
  { "emoji": "🚫", "keywords": ["prohibited", "no", "forbidden", "stop"] },
  { "emoji": "⛔", "keywords": ["stop", "no", "entry", "prohibited"] },
  { "emoji": "♻️", "keywords": ["recycle", "green", "environment", "eco"] },
  { "emoji": "🔄", "keywords": ["refresh", "reload", "sync", "repeat", "rotate"] },
  { "emoji": "🔃", "keywords": ["arrows", "cycle", "repeat", "reload"] },
  { "emoji": "➡️", "keywords": ["arrow", "right", "next", "forward"] },
  { "emoji": "⬅️", "keywords": ["arrow", "left", "back", "previous"] },
  { "emoji": "⬆️", "keywords": ["arrow", "up", "top", "increase"] },
  { "emoji": "⬇️", "keywords": ["arrow", "down", "bottom", "decrease"] },
  { "emoji": "🔗", "keywords": ["link", "chain", "connect", "url"] },
  { "emoji": "📎", "keywords": ["clip", "paperclip", "attach", "attachment"] },
  { "emoji": "🔒", "keywords": ["lock", "secure", "private", "closed"] },
  { "emoji": "🔓", "keywords": ["unlock", "open", "access"] },
  { "emoji": "🔑", "keywords": ["key", "password", "access", "unlock"] },

  { "emoji": "❤️", "keywords": ["heart", "love", "red", "like", "favorite"] },
  { "emoji": "💙", "keywords": ["heart", "blue", "love", "cold"] },
  { "emoji": "💚", "keywords": ["heart", "green", "love", "nature", "eco"] },
  { "emoji": "💛", "keywords": ["heart", "yellow", "love", "friendship"] },
  { "emoji": "🧡", "keywords": ["heart", "orange", "love", "warm"] },
  { "emoji": "💜", "keywords": ["heart", "purple", "love"] },
  { "emoji": "🖤", "keywords": ["heart", "black", "dark", "love"] },
  { "emoji": "🤍", "keywords": ["heart", "white", "pure", "love"] },
  { "emoji": "💖", "keywords": ["heart", "sparkle", "love", "pink"] },
  { "emoji": "💝", "keywords": ["heart", "ribbon", "gift", "love"] },
  { "emoji": "💗", "keywords": ["heart", "growing", "love", "beat"] },
  { "emoji": "💕", "keywords": ["hearts", "two", "love", "couple"] },

  { "emoji": "🌈", "keywords": ["rainbow", "colorful", "pride", "weather"] },
  { "emoji": "☀️", "keywords": ["sun", "sunny", "bright", "weather", "summer"] },
  { "emoji": "🌙", "keywords": ["moon", "night", "crescent", "sleep"] },
  { "emoji": "🌧️", "keywords": ["rain", "weather", "cloud", "wet"] },
  { "emoji": "⛈️", "keywords": ["storm", "thunder", "lightning", "weather"] },
  { "emoji": "❄️", "keywords": ["snow", "winter", "cold", "ice", "freeze"] },
  { "emoji": "🌊", "keywords": ["wave", "ocean", "sea", "water", "surf"] },
  { "emoji": "🌸", "keywords": ["flower", "cherry", "blossom", "spring", "pink"] },
  { "emoji": "🌺", "keywords": ["flower", "hibiscus", "tropical"] },
  { "emoji": "🌻", "keywords": ["sunflower", "flower", "yellow", "happy"] },
  { "emoji": "🌹", "keywords": ["rose", "flower", "love", "red"] },
  { "emoji": "🌷", "keywords": ["tulip", "flower", "spring", "pink"] },
  { "emoji": "🌴", "keywords": ["palm", "tree", "tropical", "beach", "vacation"] },
  { "emoji": "🌲", "keywords": ["tree", "evergreen", "pine", "forest", "nature"] },
  { "emoji": "🍀", "keywords": ["clover", "luck", "four", "leaf", "irish"] },
  { "emoji": "🌿", "keywords": ["herb", "plant", "green", "nature", "leaf"] },
  { "emoji": "🍃", "keywords": ["leaf", "wind", "nature", "green"] },

  { "emoji": "🐶", "keywords": ["dog", "puppy", "pet", "animal", "cute"] },
  { "emoji": "🐱", "keywords": ["cat", "kitten", "pet", "animal", "cute"] },
  { "emoji": "🐭", "keywords": ["mouse", "rat", "animal", "rodent"] },
  { "emoji": "🐰", "keywords": ["rabbit", "bunny", "animal", "cute", "easter"] },
  { "emoji": "🦊", "keywords": ["fox", "animal", "clever", "orange"] },
  { "emoji": "🐻", "keywords": ["bear", "animal", "teddy", "brown"] },
  { "emoji": "🐼", "keywords": ["panda", "animal", "cute", "china"] },
  { "emoji": "🦁", "keywords": ["lion", "animal", "king", "brave"] },
  { "emoji": "🐯", "keywords": ["tiger", "animal", "wild", "stripes"] },
  { "emoji": "🦄", "keywords": ["unicorn", "fantasy", "magic", "horse", "rainbow"] },
  { "emoji": "🐝", "keywords": ["bee", "insect", "honey", "buzz"] },
  { "emoji": "🦋", "keywords": ["butterfly", "insect", "pretty", "nature"] },
  { "emoji": "🐦", "keywords": ["bird", "animal", "fly", "tweet"] },
  { "emoji": "🦅", "keywords": ["eagle", "bird", "freedom", "america"] },
  { "emoji": "🐬", "keywords": ["dolphin", "ocean", "animal", "smart"] },
  { "emoji": "🐢", "keywords": ["turtle", "slow", "animal", "shell"] },
  { "emoji": "🦀", "keywords": ["crab", "ocean", "animal", "beach"] },
  { "emoji": "🐙", "keywords": ["octopus", "ocean", "animal", "tentacle"] },
  { "emoji": "🐄", "keywords": ["cow", "farm", "animal", "milk", "cattle", "beef"] },
  { "emoji": "🐮", "keywords": ["cow", "face", "farm", "animal", "moo"] },
  { "emoji": "🐷", "keywords": ["pig", "farm", "animal", "pork"] },
  { "emoji": "🐖", "keywords": ["pig", "farm", "animal", "hog", "swine"] },
  { "emoji": "🐑", "keywords": ["sheep", "farm", "animal", "wool", "lamb"] },
  { "emoji": "🐏", "keywords": ["ram", "sheep", "farm", "animal"] },
  { "emoji": "🐐", "keywords": ["goat", "farm", "animal"] },
  { "emoji": "🐓", "keywords": ["rooster", "chicken", "farm", "animal"] },
  { "emoji": "🐔", "keywords": ["chicken", "hen", "farm", "animal", "poultry"] },
  { "emoji": "🐣", "keywords": ["chick", "baby", "chicken", "farm", "hatching"] },
  { "emoji": "🐤", "keywords": ["chick", "baby", "chicken", "farm", "yellow"] },
  { "emoji": "🐥", "keywords": ["chick", "baby", "chicken", "farm", "cute"] },
  { "emoji": "🦆", "keywords": ["duck", "farm", "animal", "water", "quack"] },
  { "emoji": "🦢", "keywords": ["swan", "bird", "farm", "lake", "elegant"] },
  { "emoji": "🦃", "keywords": ["turkey", "farm", "thanksgiving", "bird"] },
  { "emoji": "🐴", "keywords": ["horse", "farm", "animal", "ride", "stable"] },
  { "emoji": "🐎", "keywords": ["horse", "race", "farm", "gallop"] },
  { "emoji": "🐂", "keywords": ["ox", "bull", "farm", "animal", "strong"] },
  { "emoji": "🐃", "keywords": ["buffalo", "water", "farm", "animal"] },
  { "emoji": "🦙", "keywords": ["llama", "alpaca", "farm", "animal", "wool"] },
  { "emoji": "🐕", "keywords": ["dog", "farm", "shepherd", "pet"] },

  { "emoji": "🌾", "keywords": ["wheat", "grain", "farm", "harvest", "crop", "agriculture"] },
  { "emoji": "🚜", "keywords": ["tractor", "farm", "agriculture", "vehicle", "field"] },
  { "emoji": "🏚️", "keywords": ["barn", "farm", "building", "derelict"] },
  { "emoji": "🌽", "keywords": ["corn", "maize", "farm", "crop", "vegetable"] },
  { "emoji": "🥕", "keywords": ["carrot", "vegetable", "farm", "orange"] },
  { "emoji": "🥔", "keywords": ["potato", "vegetable", "farm", "crop"] },
  { "emoji": "🍅", "keywords": ["tomato", "vegetable", "farm", "red"] },
  { "emoji": "🥬", "keywords": ["lettuce", "vegetable", "farm", "green", "salad"] },
  { "emoji": "🥒", "keywords": ["cucumber", "vegetable", "farm", "green"] },
  { "emoji": "🍄", "keywords": ["mushroom", "forest", "nature", "fantasy"] },

  { "emoji": "☕", "keywords": ["coffee", "drink", "hot", "cafe", "morning"] },
  { "emoji": "🍵", "keywords": ["tea", "drink", "hot", "green", "cup"] },
  { "emoji": "🍺", "keywords": ["beer", "drink", "alcohol", "cheers"] },
  { "emoji": "🍷", "keywords": ["wine", "drink", "alcohol", "glass", "red"] },
  { "emoji": "🍕", "keywords": ["pizza", "food", "italian", "slice"] },
  { "emoji": "🍔", "keywords": ["burger", "food", "fast", "hamburger"] },
  { "emoji": "🍟", "keywords": ["fries", "food", "fast", "potato"] },
  { "emoji": "🍩", "keywords": ["donut", "food", "sweet", "dessert"] },
  { "emoji": "🍪", "keywords": ["cookie", "food", "sweet", "snack"] },
  { "emoji": "🎂", "keywords": ["cake", "birthday", "celebration", "dessert"] },
  { "emoji": "🍰", "keywords": ["cake", "slice", "dessert", "sweet"] },
  { "emoji": "🍎", "keywords": ["apple", "fruit", "red", "healthy"] },
  { "emoji": "🍊", "keywords": ["orange", "fruit", "citrus"] },
  { "emoji": "🍋", "keywords": ["lemon", "fruit", "citrus", "yellow", "sour"] },
  { "emoji": "🍇", "keywords": ["grape", "fruit", "purple", "wine"] },
  { "emoji": "🍓", "keywords": ["strawberry", "fruit", "red", "sweet"] },
  { "emoji": "🥑", "keywords": ["avocado", "fruit", "green", "healthy"] },

  { "emoji": "😀", "keywords": ["smile", "happy", "face", "grin"] },
  { "emoji": "😃", "keywords": ["smile", "happy", "face", "grin", "eyes"] },
  { "emoji": "😄", "keywords": ["smile", "happy", "laugh", "face"] },
  { "emoji": "😊", "keywords": ["smile", "blush", "happy", "shy"] },
  { "emoji": "😎", "keywords": ["cool", "sunglasses", "confident"] },
  { "emoji": "🤔", "keywords": ["think", "hmm", "consider", "wonder"] },
  { "emoji": "😍", "keywords": ["love", "heart", "eyes", "crush"] },
  { "emoji": "🥳", "keywords": ["party", "celebrate", "birthday", "happy"] },
  { "emoji": "😴", "keywords": ["sleep", "tired", "zzz", "rest"] },
  { "emoji": "🤗", "keywords": ["hug", "happy", "embrace", "warm"] },
  { "emoji": "🙌", "keywords": ["hands", "celebrate", "praise", "yay"] },
  { "emoji": "👍", "keywords": ["thumbs", "up", "good", "like", "approve"] },
  { "emoji": "👎", "keywords": ["thumbs", "down", "bad", "dislike"] },
  { "emoji": "👏", "keywords": ["clap", "applause", "bravo", "congrats"] },
  { "emoji": "💪", "keywords": ["muscle", "strong", "flex", "power", "gym"] },
  { "emoji": "🙏", "keywords": ["pray", "please", "thanks", "hope", "hands"] },
  { "emoji": "👋", "keywords": ["wave", "hello", "hi", "bye", "hand"] },
  { "emoji": "✌️", "keywords": ["peace", "victory", "two", "fingers"] },
  { "emoji": "🤝", "keywords": ["handshake", "deal", "agreement", "partner"] },
  { "emoji": "👀", "keywords": ["eyes", "look", "see", "watch"] },

  { "emoji": "🚀", "keywords": ["rocket", "launch", "space", "fast", "startup"] },
  { "emoji": "✈️", "keywords": ["plane", "airplane", "travel", "flight", "fly"] },
  { "emoji": "🚗", "keywords": ["car", "drive", "vehicle", "auto"] },
  { "emoji": "🚕", "keywords": ["taxi", "car", "cab", "travel"] },
  { "emoji": "🚌", "keywords": ["bus", "transport", "travel", "public"] },
  { "emoji": "🚂", "keywords": ["train", "locomotive", "travel", "steam"] },
  { "emoji": "🚢", "keywords": ["ship", "boat", "cruise", "ocean", "travel"] },
  { "emoji": "🚲", "keywords": ["bike", "bicycle", "cycle", "ride"] },
  { "emoji": "🛵", "keywords": ["scooter", "motor", "ride", "vehicle"] },
  { "emoji": "🏍️", "keywords": ["motorcycle", "bike", "ride", "vehicle"] },
  { "emoji": "🗺️", "keywords": ["map", "world", "travel", "explore"] },
  { "emoji": "🧭", "keywords": ["compass", "direction", "navigate", "explore"] },
  { "emoji": "🏔️", "keywords": ["mountain", "snow", "nature", "hike"] },
  { "emoji": "🏖️", "keywords": ["beach", "vacation", "summer", "umbrella"] },
  { "emoji": "🏕️", "keywords": ["camping", "tent", "outdoor", "nature"] },

  { "emoji": "⚽", "keywords": ["soccer", "football", "ball", "sport"] },
  { "emoji": "🏀", "keywords": ["basketball", "ball", "sport", "nba"] },
  { "emoji": "🏈", "keywords": ["football", "american", "sport", "nfl"] },
  { "emoji": "⚾", "keywords": ["baseball", "ball", "sport", "mlb"] },
  { "emoji": "🎾", "keywords": ["tennis", "ball", "sport", "racket"] },
  { "emoji": "🏐", "keywords": ["volleyball", "ball", "sport", "beach"] },
  { "emoji": "🎱", "keywords": ["billiards", "pool", "ball", "game"] },
  { "emoji": "🏆", "keywords": ["trophy", "winner", "champion", "award", "prize"] },
  { "emoji": "🥇", "keywords": ["medal", "gold", "first", "winner", "prize"] },
  { "emoji": "🥈", "keywords": ["medal", "silver", "second", "prize"] },
  { "emoji": "🥉", "keywords": ["medal", "bronze", "third", "prize"] },

  { "emoji": "⏰", "keywords": ["alarm", "clock", "time", "wake"] },
  { "emoji": "⏱️", "keywords": ["stopwatch", "timer", "time", "fast"] },
  { "emoji": "⏳", "keywords": ["hourglass", "time", "wait", "sand"] },
  { "emoji": "🕐", "keywords": ["clock", "time", "one", "hour"] },
  { "emoji": "🔢", "keywords": ["numbers", "1234", "count", "input"] },
  { "emoji": "#️⃣", "keywords": ["hash", "number", "hashtag", "pound"] },
  { "emoji": "*️⃣", "keywords": ["asterisk", "star", "keycap"] },
  { "emoji": "0️⃣", "keywords": ["zero", "number", "keycap"] },
  { "emoji": "1️⃣", "keywords": ["one", "number", "first", "keycap"] },
  { "emoji": "2️⃣", "keywords": ["two", "number", "second", "keycap"] },
  { "emoji": "3️⃣", "keywords": ["three", "number", "third", "keycap"] },

  { "emoji": "💎", "keywords": ["diamond", "gem", "jewel", "precious", "value"] },
  { "emoji": "💰", "keywords": ["money", "bag", "cash", "dollar", "rich"] },
  { "emoji": "💵", "keywords": ["dollar", "money", "bill", "cash"] },
  { "emoji": "💸", "keywords": ["money", "cash", "expense", "spending", "payment"] },
  { "emoji": "💳", "keywords": ["card", "credit", "payment", "bank"] },
  { "emoji": "🎁", "keywords": ["gift", "present", "birthday", "wrapped"] },
  { "emoji": "🎀", "keywords": ["ribbon", "bow", "gift", "decoration"] },
  { "emoji": "🎈", "keywords": ["balloon", "party", "celebration", "birthday"] },
  { "emoji": "🎉", "keywords": ["party", "popper", "celebrate", "confetti", "tada"] },
  { "emoji": "🎊", "keywords": ["confetti", "ball", "party", "celebrate"] },
  { "emoji": "🧩", "keywords": ["puzzle", "piece", "game", "jigsaw", "problem"] },
  { "emoji": "🎲", "keywords": ["dice", "game", "random", "chance", "roll"] },
  { "emoji": "♟️", "keywords": ["chess", "pawn", "game", "strategy"] },
  { "emoji": "🧲", "keywords": ["magnet", "attract", "magnetic"] },
  { "emoji": "🔮", "keywords": ["crystal ball", "magic", "mystic", "fortune", "future"] },

  { "emoji": "💊", "keywords": ["pill", "medicine", "health", "drug"] },
  { "emoji": "🩺", "keywords": ["stethoscope", "doctor", "health", "medical"] },
  { "emoji": "🔬", "keywords": ["microscope", "science", "lab", "research"] },
  { "emoji": "🔭", "keywords": ["telescope", "space", "astronomy", "stars"] },
  { "emoji": "🧪", "keywords": ["test", "tube", "science", "lab", "experiment"] },
  { "emoji": "🧬", "keywords": ["dna", "science", "genetics", "biology"] },

  { "emoji": "🏷️", "keywords": ["tag", "label", "price", "sale"] },
  { "emoji": "🔖", "keywords": ["bookmark", "save", "mark", "tag"] },
  { "emoji": "✂️", "keywords": ["scissors", "cut", "craft"] },
  { "emoji": "📌", "keywords": ["pin", "pushpin", "location", "mark"] },
  { "emoji": "📍", "keywords": ["pin", "location", "map", "place"] },
  { "emoji": "🗑️", "keywords": ["trash", "delete", "garbage", "bin", "waste"] },

  { "emoji": "🤖", "keywords": ["robot", "ai", "automation", "future", "technology"] },
  { "emoji": "🛰️", "keywords": ["satellite", "space", "technology", "future"] },

  { "emoji": "🧑‍💻", "keywords": ["developer", "coding", "programmer", "tech"] },
  { "emoji": "🧑‍🔬", "keywords": ["scientist", "lab", "research", "experiment"] },
  { "emoji": "🧑‍🏫", "keywords": ["teacher", "education", "learning", "mentor"] },
  { "emoji": "🧑‍💼", "keywords": ["office worker", "business", "professional", "work"] },

  { "emoji": "🌍", "keywords": ["world", "global", "international", "future"] },
  { "emoji": "🌱", "keywords": ["sustainability", "eco", "green", "future"] },
  { "emoji": "⚡", "keywords": ["energy", "power", "innovation", "technology"] },
  { "emoji": "🌐", "keywords": ["internet", "digital", "online", "global"] },

  { "emoji": "🧘‍♂️", "keywords": ["meditation", "wellness", "mental health", "calm"] },
  { "emoji": "😌", "keywords": ["relax", "calm", "peace", "wellbeing"] },
  { "emoji": "🕯️", "keywords": ["relaxation", "calm", "wellness", "meditation"] },

  { "emoji": "🏃‍♀️", "keywords": ["running", "fitness", "exercise", "sport"] },
  { "emoji": "🏋️‍♂️", "keywords": ["gym", "workout", "strength", "fitness"] },
  { "emoji": "🚴‍♀️", "keywords": ["cycling", "sport", "fitness", "exercise"] },
  { "emoji": "🥗", "keywords": ["healthy food", "salad", "nutrition", "diet"] },
  { "emoji": "💧", "keywords": ["water", "hydration", "drink", "health"] },

  { "emoji": "😷", "keywords": ["sick", "mask", "illness", "health"] },

  { "emoji": "🧗", "keywords": ["climbing", "mountain", "sport", "adventure"] },
  { "emoji": "🪨", "keywords": ["rock", "boulder", "climbing", "nature"] },
  { "emoji": "🥾", "keywords": ["hiking", "boots", "outdoor", "climbing"] },
  { "emoji": "🧤", "keywords": ["gloves", "gear", "equipment", "climbing"] },

  { "emoji": "🗄️", "keywords": ["file cabinet", "storage", "archive", "documents"] },
  { "emoji": "🧾", "keywords": ["document", "paper", "receipt", "record"] },
  { "emoji": "🗳️", "keywords": ["box", "container", "storage", "archive"] },

  { "emoji": "📟", "keywords": ["pager", "device", "handheld", "communication"] },

  { "emoji": "🎓", "keywords": ["graduation", "university", "degree", "education"] },
  { "emoji": "🧑‍🎓", "keywords": ["student", "university", "graduation", "learning"] },
  { "emoji": "🧠", "keywords": ["brain", "thinking", "knowledge", "learning"] },

  { "emoji": "🪖", "keywords": ["helmet", "tactical", "gear", "protection"] },
  { "emoji": "🚧", "keywords": ["construction", "barrier", "warning", "work zone"] },
  { "emoji": "🧱", "keywords": ["brick", "construction", "building", "material"] },
  { "emoji": "🧮", "keywords": ["math", "calculation", "logic", "numbers"] },
  { "emoji": "🌪️", "keywords": ["storm", "power", "chaos", "nature"] },
  { "emoji": "🧰", "keywords": ["toolbox", "repair", "equipment", "work"] },
  { "emoji": "🪚", "keywords": ["saw", "woodwork", "craft", "tool"] },
  { "emoji": "🏅", "keywords": ["award", "achievement", "success", "sport"] },
  { "emoji": "🧳", "keywords": ["travel", "luggage", "trip", "journey"] },
  { "emoji": "⛺", "keywords": ["camping", "outdoor", "adventure", "nature"] },
  { "emoji": "🗜️", "keywords": ["clamp", "pressure", "tool", "mechanics"] },
  { "emoji": "🪵", "keywords": ["wood", "nature", "material", "outdoor"] },
  { "emoji": "🎒", "keywords": ["backpack", "gear", "travel", "outdoor"] },
  { "emoji": "🪄", "keywords": ["magic", "effect", "creativity", "spark"] },
  { "emoji": "🪅", "keywords": ["piñata", "celebration", "fun", "party"] },
  { "emoji": "🪩", "keywords": ["disco", "party", "light", "dance"] },
  { "emoji": "🪬", "keywords": ["protection", "symbol", "culture", "amulet"] },
  { "emoji": "🪭", "keywords": ["fan", "style", "accessory", "culture"] },
  { "emoji": "🪜", "keywords": ["ladder", "tool", "height", "work"] },
  { "emoji": "🪝", "keywords": ["hook", "tool", "hang", "equipment"] },
  { "emoji": "🧺", "keywords": ["basket", "storage", "container", "home"] },
  { "emoji": "🧴", "keywords": ["bottle", "care", "liquid", "container"] },
  { "emoji": "🧼", "keywords": ["soap", "clean", "hygiene", "wash"] },
  { "emoji": "🧽", "keywords": ["sponge", "cleaning", "wash", "tool"] },
  { "emoji": "🪠", "keywords": ["plunger", "tool", "repair", "plumbing"] },
  { "emoji": "🧻", "keywords": ["paper", "tissue", "hygiene", "bathroom"] },
  { "emoji": "🪣", "keywords": ["bucket", "container", "cleaning", "water"] },
  { "emoji": "🧵", "keywords": ["thread", "sewing", "craft", "textile"] },
  { "emoji": "🧶", "keywords": ["yarn", "knitting", "craft", "textile"] },
  { "emoji": "🪡", "keywords": ["needle", "sewing", "craft", "textile"] },
  { "emoji": "🧿", "keywords": ["evil eye", "symbol", "protection", "culture"] },
  { "emoji": "♾️", "keywords": ["infinity", "symbol", "abstract", "concept"] },
  { "emoji": "⚛️", "keywords": ["atom", "science", "physics", "symbol"] },
  { "emoji": "🛞", "keywords": ["wheel", "vehicle", "motion", "mechanics"] },
  { "emoji": "📓", "keywords": ["notebook", "journal", "writing", "stationery"] },
  { "emoji": "💭", "keywords": ["thought", "thinking", "idea", "mind"] },
  { "emoji": "🧘‍♀️", "keywords": ["meditation", "yoga", "relaxation", "mindfulness"] },
  { "emoji": "💌", "keywords": ["love letter", "message", "mail", "romance"] }
]

const emojiTopicStarts = [
  { emoji: "📋", name: "Planning & teamwork" },
  { emoji: "🎯", name: "Creativity & places" },
  { emoji: "💡", name: "Tools & technology" },
  { emoji: "🌟", name: "Symbols & favorites" },
  { emoji: "🌈", name: "Weather & nature" },
  { emoji: "🐶", name: "Animals & farming" },
  { emoji: "☕", name: "Food & drink" },
  { emoji: "😀", name: "People & moods" },
  { emoji: "🚀", name: "Travel & sports" },
  { emoji: "⏰", name: "Time & money" },
  { emoji: "💊", name: "Health & science" },
  { emoji: "🏷️", name: "Everyday life & interests" },
  { emoji: "🪖", name: "Tools, home & hobbies" }
]

const emojiTopicByStart = new Map(emojiTopicStarts.map(({ emoji, name }) => [emoji, name]))
let activeEmojiTopic = emojiTopicStarts[0].name
const categorizedEmojis = emojiData.map(item => {
  activeEmojiTopic = emojiTopicByStart.get(item.emoji) || activeEmojiTopic
  return { ...item, topic: activeEmojiTopic }
})

const filteredEmojiTopics = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const topics = new Map()

  const allEmojis = [
    ...categorizedEmojis,
    ...customEmojis.value.map(emoji => ({ emoji, keywords: ['custom', 'others', emoji], topic: 'Others' }))
  ]

  for (const item of allEmojis) {
    if (query && !item.emoji.includes(query) && !item.keywords.some(keyword => keyword.includes(query))) {
      continue
    }
    if (!topics.has(item.topic)) {
      topics.set(item.topic, [])
    }
    topics.get(item.topic).push(item)
  }

  return Array.from(topics, ([name, emojis]) => ({ name, emojis }))
})

function selectEmoji(emoji) {
  emit('select', emoji)
}
</script>

<style scoped>
.emoji-picker {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 1000;
  width: 380px;
  max-width: calc(100vw - 24px);
}

.emoji-picker-header {
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  margin-bottom: 8px;
  text-transform: uppercase;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grayscale-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 10px;
  text-transform: none;
}

.grayscale-toggle input {
  display: none;
}

.toggle-slider {
  width: 28px;
  height: 16px;
  background: #E5E7EB;
  border-radius: 8px;
  position: relative;
  transition: background 0.2s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.grayscale-toggle input:checked + .toggle-slider {
  background: #6366F1;
}

.grayscale-toggle input:checked + .toggle-slider::after {
  transform: translateX(12px);
}

.toggle-label {
  color: #9CA3AF;
}

.emoji-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.emoji-search > .emoji-search-input,
.emoji-add-row > .emoji-search-input {
  flex: 1;
  min-width: 0;
}

.emoji-add-toggle,
.emoji-add-action {
  flex-shrink: 0;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  background: #F9FAFB;
  color: #4B5563;
  cursor: pointer;
}

.emoji-add-toggle {
  width: 36px;
  height: 36px;
  font-size: 24px;
  line-height: 1;
}

.emoji-add-action {
  height: 36px;
  padding: 0 8px;
  font-size: 12px;
}

.emoji-add-toggle:hover,
.emoji-add-action:hover {
  background: #F3F4F6;
}

.emoji-add-toggle:focus-visible,
.emoji-add-action:focus-visible {
  outline: 2px solid #1687D2;
  outline-offset: 2px;
}

.emoji-add-form {
  margin-bottom: 10px;
}

.emoji-add-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.emoji-add-error {
  margin: 6px 0 0;
  color: #DC2626;
  font-size: 12px;
}

.emoji-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.emoji-search-input:focus {
  border-color: #9CA3AF;
}

.emoji-search-input::placeholder {
  color: #9CA3AF;
}

.emoji-grid {
  display: block;
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
}

.emoji-topic + .emoji-topic {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #E5E7EB;
}

.emoji-topic-title {
  margin: 0 2px 4px;
  color: #6B7280;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.emoji-topic-emojis {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 4px;
}

.emoji-option {
  width: 100%;
  min-width: 0;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s, transform 0.2s, filter 0.2s;
}

.emoji-option.grayscale {
  filter: grayscale(1);
}

.emoji-option:hover {
  background-color: #F3F4F6;
  transform: scale(1.15);
  filter: grayscale(0);
}

.no-results {
  text-align: center;
  color: #9CA3AF;
  padding: 20px;
  font-size: 14px;
}

:global([data-theme='dark'] .emoji-picker) {
  background: #1B232B;
  border-color: #34424D;
  color: #E5EDF2;
}

:global([data-theme='dark'] .emoji-picker-header),
:global([data-theme='dark'] .emoji-topic-title),
:global([data-theme='dark'] .toggle-label),
:global([data-theme='dark'] .no-results) {
  color: #A7B4BF;
}

:global([data-theme='dark'] .emoji-topic + .emoji-topic) {
  border-color: #34424D;
}

:global([data-theme='dark'] .toggle-slider) {
  background: #52616D;
}

:global([data-theme='dark'] .grayscale-toggle input:checked + .toggle-slider) {
  background: #1687D2;
}

:global([data-theme='dark'] .emoji-search-input),
:global([data-theme='dark'] .emoji-add-toggle),
:global([data-theme='dark'] .emoji-add-action) {
  background: #202B34;
  border-color: #34424D;
  color: #E5EDF2;
}

:global([data-theme='dark'] .emoji-search-input:focus) {
  border-color: #1687D2;
}

:global([data-theme='dark'] .emoji-search-input::placeholder) {
  color: #7F919E;
}

:global([data-theme='dark'] .emoji-option:hover),
:global([data-theme='dark'] .emoji-add-toggle:hover),
:global([data-theme='dark'] .emoji-add-action:hover) {
  background-color: #293E4D;
}

:global([data-theme='dark'] .emoji-add-error) {
  color: #FCA5A5;
}

:global([data-theme='dark'] .emoji-grid) {
  scrollbar-color: #52616D #202B34;
}
</style>
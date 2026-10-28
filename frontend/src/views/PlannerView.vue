<template>
  <div class="planner-page">
    <TopBar :planner-view="plannerView" @update:planner-view="setPlannerView" />
    <main class="planner-background">
      <section class="planner-panel planner-sidebar" aria-label="Planner navigation">
        <div class="analog-clock" aria-label="Current time">
          <span v-for="mark in 12" :key="mark" class="clock-mark" :style="{ transform: `rotate(${mark * 30}deg)` }" />
          <span class="clock-hand hour-hand" :style="{ transform: `rotate(${clockHands.hour}deg)` }" />
          <span class="clock-hand minute-hand" :style="{ transform: `rotate(${clockHands.minute}deg)` }" />
          <span class="clock-hand second-hand" :style="{ transform: `rotate(${clockHands.second}deg)` }" />
          <span class="clock-center" />
        </div>
        <div class="calendar-header">
          <button class="calendar-arrow" aria-label="Previous month" @click="goToPreviousMonth">‹</button>
          <span>{{ calendarMonthLabel }}</span>
          <button class="calendar-arrow" aria-label="Next month" @click="goToNextMonth">›</button>
        </div>
        <div class="calendar-weekdays">
          <span v-for="day in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="day">{{ day }}</span>
        </div>
        <div class="calendar-grid">
          <button v-for="(day, index) in calendarDays" :key="index" type="button" :class="{ muted: day.muted, today: day.today, selected: day.dateKey === selectedCalendarDate }" :aria-label="`Show tasks for ${day.dateKey}`" :aria-pressed="day.dateKey === selectedCalendarDate" @click="selectCalendarDay(day.dateKey)">
            <span class="calendar-day-label">{{ day.label }}</span>
            <span class="calendar-task-dots" aria-hidden="true">
              <i v-for="(priority, taskIndex) in calendarTaskPriorities(day.dateKey)" :key="taskIndex" class="calendar-task-dot" :class="`priority-${priority.toLowerCase()}`" />
            </span>
          </button>
        </div>
        <div class="calendar-task-list" aria-live="polite">
          <div class="calendar-task-list-header">
            <strong>{{ selectedCalendarDateLabel }}</strong>
            <span>{{ selectedCalendarTasks.length }} task</span>
          </div>
          <p v-if="selectedCalendarTasks.length === 0" class="calendar-task-empty">No tasks for this day</p>
          <button v-for="task in selectedCalendarTasks" :key="task.id" type="button" class="calendar-task-item" :class="{ completed: task.done }" @click="openTaskModal(task)">
            <i class="calendar-task-item-dot" :class="`priority-${task.priority.toLowerCase()}`" aria-hidden="true" />
            <span>{{ task.description || 'Untitled task' }}</span>
          </button>
        </div>
        <div class="brain-dump-card">
          <div class="brain-dump-header">
            <strong>Brain dump</strong>
          </div>
          <textarea
            v-model="brainDump"
            class="brain-dump-textarea"
            placeholder="Write down whatever's on your mind..."
            aria-label="Brain dump"
          />
        </div>
      </section>

      <section class="planner-panel planner-main" aria-label="Planner workspace">
        <div v-if="!hasVisiblePlannerModules" class="planner-empty-state">
          <strong>No modules in this view</strong>
          <span>Enable Personal or Work visibility in planner settings.</span>
        </div>
        <div v-show="moduleIsVisible('tasks')" class="tasks-panel" :style="moduleStyle('tasks')">
          <div class="tasks-header">
            <div>
              <h1>Tasks this week</h1>
              <p>{{ completedTasks }}/{{ tasks.length }} completed</p>
            </div>
            <button class="add-task-button" @click="addTask">+ New</button>
          </div>
          <div class="task-toolbar">
            <button class="task-filter" :class="{ active: taskView === 'all' }" @click="taskView = 'all'">▦ All</button>
            <button class="task-filter" :class="{ active: taskView === 'priority' }" @click="taskView = 'priority'">! By priority</button>
            <button class="task-filter" :class="{ active: taskView === 'timeline' }" @click="taskView = 'timeline'">▣ Timeline</button>
            <label class="task-finished-toggle">
              <input v-model="showFinishedTasks" type="checkbox" @change="saveShowFinishedTasks">
              <span>Show finished tasks</span>
            </label>
            <span class="task-toolbar-actions">☰　↕　⌕　↗</span>
          </div>
          <div v-if="taskView === 'all'" class="task-list">
            <div v-for="task in visibleTasks" :key="task.id" class="task-row" :class="{ completed: task.done }" @click="openTaskModal(task)">
              <input v-model="task.done" class="task-check" type="checkbox" :aria-label="`Mark ${task.description} complete`" @click.stop @change="saveTask(task)">
              <button type="button" class="task-description task-name-button">{{ task.description || 'Untitled task' }}</button>
              <div class="priority-picker" @click.stop>
                <button class="priority-badge" :class="`priority-${task.priority.toLowerCase()}`" @click.stop="togglePriorityPicker(task.id)">{{ priorityIcon(task.priority) }} {{ task.priority }} priority</button>
                <div v-if="openPriorityTask === task.id" class="priority-options">
                  <button v-for="priority in priorities" :key="priority" :class="`priority-${priority.toLowerCase()}`" @click="setPriority(task, priority)">{{ priorityIcon(priority) }} {{ priority }} priority</button>
                </div>
              </div>
              <input v-model="task.dueDate" class="task-due" type="date" aria-label="Due date" @click.stop="openDatePicker" @change="saveTask(task)">
              <select v-model="task.status" class="task-status" aria-label="Task status" @click.stop @change="saveTask(task)">
                <option>Not started</option>
                <option>In progress</option>
                <option>Done</option>
              </select>
            </div>
          </div>
          <div v-else-if="taskView === 'priority'" class="priority-columns">
            <section v-for="priority in priorities" :key="priority" class="priority-column" :class="`priority-column-${priority.toLowerCase()}`">
              <h2>{{ priority }} priority <span>{{ tasksByPriority(priority).length }}</span></h2>
              <div v-for="task in tasksByPriority(priority)" :key="task.id" class="priority-task" :class="{ completed: task.done }" @click="openTaskModal(task)">
                <input v-model="task.done" class="task-check" type="checkbox" :aria-label="`Mark ${task.description} complete`" @click.stop @change="saveTask(task)">
                <button type="button" class="priority-task-description task-name-button">{{ task.description || 'Untitled task' }}</button>
                <input v-model="task.dueDate" class="priority-task-due" type="date" aria-label="Due date" @click.stop="openDatePicker" @change="saveTask(task)">
                <select v-model="task.status" class="priority-task-status" aria-label="Task status" @click.stop @change="saveTask(task)">
                  <option>Not started</option>
                  <option>In progress</option>
                  <option>Done</option>
                </select>
              </div>
            </section>
          </div>
          <div v-else class="timeline-view">
            <div v-if="timelineTasks.length === 0" class="timeline-empty">No tasks scheduled yet</div>
            <div v-for="task in timelineTasks" :key="task.id" class="timeline-item" :class="{ completed: task.done }" @click="openTaskModal(task)">
              <div class="timeline-date">
                <strong>{{ formatTimelineDate(task.dueDate) }}</strong>
                <span>{{ task.dueDate ? 'Due date' : 'Unscheduled' }}</span>
              </div>
              <div class="timeline-rail"><span class="timeline-dot" :class="`priority-${task.priority.toLowerCase()}`" /></div>
              <div class="timeline-task">
                <input v-model="task.done" class="task-check" type="checkbox" :aria-label="`Mark ${task.description} complete`" @click.stop @change="saveTask(task)">
                <button type="button" class="timeline-task-description task-name-button">{{ task.description || 'Untitled task' }}</button>
                <div class="priority-picker" @click.stop>
                  <button class="priority-badge" :class="`priority-${task.priority.toLowerCase()}`" @click.stop="togglePriorityPicker(task.id)">{{ priorityIcon(task.priority) }} {{ task.priority }}</button>
                  <div v-if="openPriorityTask === task.id" class="priority-options">
                    <button v-for="priority in priorities" :key="priority" :class="`priority-${priority.toLowerCase()}`" @click="setPriority(task, priority)">{{ priorityIcon(priority) }} {{ priority }}</button>
                  </div>
                </div>
                <input v-model="task.dueDate" class="timeline-task-due" type="date" aria-label="Due date" @click.stop="openDatePicker" @change="saveTask(task)">
                <select v-model="task.status" class="timeline-task-status" aria-label="Task status" @click.stop @change="saveTask(task)">
                  <option>Not started</option>
                  <option>In progress</option>
                  <option>Done</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <section v-show="moduleIsVisible('readAloud')" class="read-aloud-module" aria-label="Read aloud" :style="moduleStyle('readAloud')">
          <div class="read-aloud-header">
            <div>
              <span class="module-kicker">Audio desk</span>
              <h2>Read aloud</h2>
              <p>Paste English or Hungarian text and listen with a voice installed on this device.</p>
            </div>
            <span class="read-aloud-status" :class="{ active: isReading, remote: readAloudUsesRemote }">{{ isReading ? 'Reading' : readAloudUsesRemote ? 'Neural voice' : 'Ready' }}</span>
          </div>
          <textarea
            v-model="readAloudText"
            class="read-aloud-textarea"
            placeholder="Paste text here..."
            aria-label="Text to read aloud"
          />
          <div class="read-aloud-controls">
            <label>
              <span>Language</span>
              <select v-model="readAloudLanguage" @change="refreshReadAloudVoice">
                <option value="auto">Auto detect</option>
                <option value="en-US">English</option>
                <option value="hu-HU">Magyar</option>
              </select>
            </label>
            <label class="read-aloud-voice-field">
              <span>Voice</span>
              <select v-model="readAloudVoiceName" aria-label="Reading voice">
                <option value="">Best available voice</option>
                <option v-for="voice in readAloudVoices" :key="voice.voiceURI" :value="voice.voiceURI">{{ voice.name }} ({{ voice.lang }})</option>
              </select>
            </label>
            <label class="read-aloud-rate-field">
              <span>Speed <strong>{{ readAloudRate.toFixed(1) }}x</strong></span>
              <input v-model.number="readAloudRate" type="range" min="0.6" max="1.4" step="0.1" aria-label="Reading speed">
            </label>
          </div>
          <div class="read-aloud-actions">
            <button type="button" class="read-aloud-primary" :disabled="!readAloudText.trim() || isReadAloudLoading" @click="toggleReadAloud">{{ isReadAloudLoading ? 'Preparing...' : isReading ? 'Pause' : 'Read text' }}</button>
            <button type="button" class="read-aloud-secondary" :disabled="!isReading && !isReadAloudPaused" @click="stopReadAloud">Stop</button>
            <small v-if="readAloudError" class="read-aloud-error">{{ readAloudError }}</small>
            <small v-else>{{ readAloudUsesRemote ? 'Uses a Microsoft neural voice.' : 'Uses your browser\'s native speech engine.' }}</small>
          </div>
        </section>
        <section v-show="moduleIsVisible('fourteenDayTracker')" class="habit-tracker" aria-label="14-day habit tracker" :style="moduleStyle('fourteenDayTracker')">
          <div class="tracker-header">
            <div>
              <h2>14-day habit tracker</h2>
              <p>{{ trackerCompleted }}/{{ trackerTotal }} completed</p>
            </div>
            <button type="button" class="tracker-edit-button" @click="openHabitEditor">Edit</button>
          </div>
          <div class="tracker-days-grid">
            <section v-for="day in trackerDays" :key="day.index" class="tracker-day-card">
              <div class="tracker-day-heading">
                <strong>{{ day.weekday }}</strong>
                <small>{{ day.date }}</small>
              </div>
              <label v-for="habit in scheduledHabits(day.dateKey)" :key="`${day.index}-${habit.name}`" class="tracker-habit-row">
                <span>{{ habit.name }}</span>
                <input v-model="habit.tracker[day.index]" type="checkbox" :aria-label="`${habit.name}, ${day.date}`">
              </label>
              <div class="tracker-day-progress">
                <span>{{ trackerDayCompleted(day.index) }}/{{ scheduledHabits(day.dateKey).length }}</span>
                <strong>{{ trackerDayProgress(day.index) }}%</strong>
                <span class="progress-track"><span :style="{ width: `${trackerDayProgress(day.index)}%` }" /></span>
              </div>
            </section>
          </div>
        </section>
        <section v-show="moduleIsVisible('dailyTracker')" class="month-habit-tracker" aria-label="Daily habit tracker" :style="moduleStyle('dailyTracker')">
          <div class="tracker-header">
            <div>
              <h2>Daily habit tracker</h2>
              <p>Write a short note and track your habits each day.</p>
            </div>
            <button type="button" class="tracker-edit-button" @click="openHabitEditor">Edit</button>
          </div>
          <div class="month-tracker-list">
            <div v-for="day in monthDays" :key="day.dateKey" class="month-tracker-row" :class="{ today: day.isToday }" :data-date-key="day.dateKey">
              <div class="month-tracker-date">
                <strong>{{ day.month }} {{ day.day }}</strong>
                <small>{{ day.weekday }}</small>
              </div>
              <div class="month-tracker-note-wrap">
                <input v-model="day.entry.note" class="month-tracker-note" type="text" :aria-label="`Note for ${day.date}`" placeholder="Short note for the day">
              </div>
              <div class="month-tracker-habits">
                <div
                  v-for="habit in dailyPlannerHabits()"
                  :key="`${day.index}-${habit.name}`"
                  class="habit-day-item"
                  :class="{ 'custom-habit-slot': habit.recurrence.type === 'custom', scheduled: isHabitScheduledFor(habit, day.dateKey) }"
                  :title="habit.recurrence.type === 'custom' ? `${habit.name} — right-click to plan or remove` : habit.name"
                  @contextmenu.prevent="toggleCustomHabitDate(habit, day.dateKey)"
                >
                  <span>{{ habit.name }}</span>
                  <input
                    v-model="day.entry.checks[habits.indexOf(habit)]"
                    type="checkbox"
                    :disabled="!isHabitScheduledFor(habit, day.dateKey) && !day.entry.checks[habits.indexOf(habit)]"
                    :aria-label="`${habit.name}, ${day.date}`"
                  >
                </div>
              </div>
            </div>
          </div>
        </section>
        <section v-show="moduleIsVisible('habitAnalytics')" class="habit-analytics" aria-label="Habit analytics" :style="moduleStyle('habitAnalytics')">
          <div class="tracker-header">
            <div>
              <h2>Habit analytics</h2>
              <p>{{ analyticsCompleted }}/{{ analyticsTotal }} scheduled habit days completed</p>
            </div>
            <div class="analytics-progress-ring" :style="{ '--progress': analyticsProgress }">
              <strong class="analytics-total-progress">{{ analyticsProgress }}%</strong>
            </div>
          </div>
          <div class="analytics-controls">
            <label>
              <span>From</span>
              <input v-model="analyticsStartDate" class="analytics-date-input" type="date" :min="analyticsMinDate" aria-label="Analytics start date" @click="openAnalyticsDatePicker">
            </label>
            <label>
              <span>To</span>
              <input v-model="analyticsEndDate" class="analytics-date-input" type="date" :min="analyticsMinDate" :max="analyticsToday" aria-label="Analytics end date" @click="openAnalyticsDatePicker" @change="normalizeAnalyticsEndDate">
            </label>
          </div>
          <div v-if="analyticsChartPoints.length" class="analytics-chart analytics-chart-bars">
            <div class="analytics-chart-scale" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
            <div class="analytics-chart-plot">
              <div v-for="point in analyticsChartPoints" :key="point.dateKey" class="analytics-chart-column">
                <div class="analytics-chart-value">{{ point.progress }}%</div>
                <div class="analytics-chart-bar" :style="{ height: `${Math.max(point.progress, 2)}%` }" />
                <small>{{ point.label }}</small>
              </div>
            </div>
          </div>
          <p v-else class="analytics-empty">Choose a valid date interval to see the chart.</p>
          <div v-if="habitAnalytics.length" class="analytics-habit-list">
            <div v-for="habit in habitAnalytics" :key="habit.name" class="analytics-habit-row">
              <div class="analytics-habit-copy">
                <strong>{{ habit.name }}</strong>
                <span>{{ habit.completed }}/{{ habit.total }} completed</span>
              </div>
              <div class="analytics-habit-progress">
                <span class="progress-track"><span :style="{ width: `${habit.progress}%` }" /></span>
                <strong>{{ habit.progress }}%</strong>
              </div>
            </div>
          </div>
          <p v-else class="analytics-empty">Add a habit to start tracking progress.</p>
        </section>
      </section>

      <section class="planner-panel planner-inspector" aria-label="Planner details">
        <div class="habits-card">
          <div class="habits-title"><span class="habits-icon">▥</span> Habits today <button class="habits-settings-button" aria-label="Habits settings" @click.stop="habitsMenuOpen = !habitsMenuOpen">•••</button></div>
          <div v-if="habitsMenuOpen" class="habits-settings-menu" @click.stop>
            <button @click="startEditingHabits">Edit habits</button>
            <label><input v-model="showCompletedHabits" type="checkbox"> Show completed</label>
            <button @click="resetHabits">Reset today</button>
          </div>
          <div class="habit-list">
            <div class="habit-list-title">This day</div>
            <label v-for="(habit, index) in visibleHabits" :key="index" class="habit-row">
              <input v-model="habit.done" type="checkbox">
              <input v-if="editingHabits" v-model="habit.name" class="habit-name-input" aria-label="Habit name">
              <span v-else>{{ habit.name }}</span>
              <button v-if="editingHabits" class="delete-habit-button" aria-label="Delete habit" @click.prevent="removeHabit(habit)">×</button>
            </label>
            <div class="habit-progress">
              <span>{{ completedHabits }}/{{ todayHabits.length }}</span>
              <span class="progress-track"><span :style="{ width: `${habitProgress}%` }" /></span>
            </div>
          </div>
          <div v-if="editingHabits" class="edit-habits-actions">
            <button @click="addHabit">+ Add habit</button>
            <button @click="editingHabits = false">Done</button>
          </div>
        </div>
        <div class="spotify-card">
          <audio ref="audioPlayer" :src="currentTrack.src" @timeupdate="onTimeUpdate" @ended="nextTrack" @loadedmetadata="onTimeUpdate" />
          <div class="spotify-player">
            <div class="spotify-header">
              <span class="spotify-logo">♪</span>
              <strong>Music player</strong>
            </div>
            <div class="spotify-now-playing">
              <div class="album-art">{{ currentTrack.art }}</div>
              <div class="track-copy">
                <span>Now playing</span>
                <strong>{{ currentTrack.title }}</strong>
                <small>{{ currentTrack.artist }}</small>
              </div>
            </div>
            <div class="spotify-progress">
              <span class="progress-track spotify-track"><span :style="{ width: `${playProgress}%` }" /></span>
              <span>{{ formattedTime }}</span>
            </div>
            <div class="spotify-controls">
              <button aria-label="Previous track" @click="previousTrack">|‹</button>
              <button class="play-button" :aria-label="isPlaying ? 'Pause' : 'Play'" @click="togglePlay">{{ isPlaying ? 'Ⅱ' : '▶' }}</button>
              <button aria-label="Next track" @click="nextTrack">›|</button>
            </div>
          </div>
          <div class="spotify-playlist">
            <button v-for="(track, index) in tracks" :key="track.title" class="spotify-track-row" :class="{ active: index === currentTrackIndex }" @click="selectTrack(index)">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="playlist-track-copy"><strong>{{ track.title }}</strong><small>{{ track.artist }}</small></span>
            </button>
          </div>
        </div>
      </section>
    </main>

    <div v-if="isHabitEditorOpen" class="task-modal-backdrop" role="presentation" @click.self="closeHabitEditor">
      <section class="task-modal habit-editor-modal" role="dialog" aria-modal="true" aria-labelledby="habit-editor-title">
        <button type="button" class="task-modal-close" aria-label="Close" @click="closeHabitEditor">×</button>
        <div class="task-modal-header">
          <h2 id="habit-editor-title">Edit daily habits</h2>
          <p>Choose what to track and when it repeats.</p>
        </div>
        <div class="habit-editor-list">
          <div v-for="(habit, index) in habits" :key="index" class="habit-editor-row">
            <div class="habit-editor-main">
              <input v-model="habit.name" class="habit-editor-input" type="text" aria-label="Habit name" placeholder="Habit name">
              <label class="habit-repeat-field">
                <span>Repeat</span>
                <select v-model="habit.recurrence.type" :aria-label="`Repeat schedule for ${habit.name}`">
                  <option value="daily">Every day</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <div class="habit-visibility-options" :aria-label="`Visibility for ${habit.name}`">
                <label class="habit-visibility-pill" :class="{ active: habit.visibility?.personal }">
                  <input v-model="habit.visibility.personal" type="checkbox">
                  <span>Personal</span>
                </label>
                <label class="habit-visibility-pill" :class="{ active: habit.visibility?.work }">
                  <input v-model="habit.visibility.work" type="checkbox">
                  <span>Work</span>
                </label>
              </div>
            </div>
            <button type="button" class="delete-habit-button" aria-label="Delete habit" @click="removeHabit(habit)">×</button>
          </div>
          <p v-if="habits.length === 0" class="habit-editor-empty">No habits added yet.</p>
        </div>
        <div class="habit-editor-actions">
          <button type="button" class="habit-add-button" @click="addHabit">+ Add habit</button>
          <button type="button" class="task-modal-save" @click="closeHabitEditor">Done</button>
        </div>
      </section>
    </div>

    <div v-if="isTaskModalOpen" class="task-modal-backdrop" role="presentation" @click.self="closeTaskModal">
      <form class="task-modal" role="dialog" aria-modal="true" aria-labelledby="new-task-title" @submit.prevent="saveNewTask">
        <button type="button" class="task-modal-close" aria-label="Close" @click="closeTaskModal">×</button>
        <div class="task-modal-header">
          <h2 id="new-task-title">{{ editingTaskId ? 'Edit task' : 'New task' }}</h2>
          <p>Add the important details for this task.</p>
        </div>
        <label class="task-modal-field task-modal-field-wide">
          <span>Description</span>
          <input v-model="newTask.description" type="text" placeholder="Short description" required autofocus>
        </label>
        <div class="task-modal-fields">
          <label class="task-modal-field">
            <span>Priority</span>
            <select v-model="newTask.priority">
              <option v-for="priority in priorities" :key="priority">{{ priority }}</option>
            </select>
          </label>
          <label class="task-modal-field">
            <span>Due date</span>
            <input v-model="newTask.dueDate" type="date">
          </label>
          <label class="task-modal-field">
            <span>Status</span>
            <select v-model="newTask.status">
              <option>Not started</option>
              <option>In progress</option>
              <option>Done</option>
            </select>
          </label>
        </div>
        <p v-if="tasksError" class="task-modal-error" role="alert">{{ tasksError }}</p>
        <div class="task-modal-actions">
          <button type="submit" class="task-modal-save" :disabled="isSavingTask">{{ isSavingTask ? 'Saving...' : 'Save' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import TopBar from '../components/TopBar.vue'
import api from '../services/api'

const defaultPlannerModules = [
  { id: 'tasks', visibility: { personal: true, work: true } },
  { id: 'readAloud', visibility: { personal: true, work: true } },
  { id: 'fourteenDayTracker', visibility: { personal: true, work: true } },
  { id: 'dailyTracker', visibility: { personal: true, work: true } },
  { id: 'habitAnalytics', visibility: { personal: true, work: true } }
]
const plannerModules = ref(defaultPlannerModules.map(module => ({ ...module, visibility: { ...module.visibility } })))
const plannerView = ref('personal')
const hasVisiblePlannerModules = computed(() => plannerModules.value.some(module => module.visibility?.[plannerView.value] !== false))

function normalizedVisibility(module) {
  if (module?.visibility && typeof module.visibility === 'object') {
    return {
      personal: module.visibility.personal !== false,
      work: module.visibility.work !== false
    }
  }
  const visible = module?.visible !== false
  return { personal: visible, work: visible }
}

function normalizedPlannerModules(modules) {
  if (!Array.isArray(modules)) return defaultPlannerModules.map(module => ({ ...module, visibility: { ...module.visibility } }))
  const savedById = new Map(modules.map(module => [module?.id, module]))
  const ordered = modules
    .filter(module => defaultPlannerModules.some(defaultModule => defaultModule.id === module?.id))
    .map(module => ({ id: module.id, visibility: normalizedVisibility(module) }))
  for (const defaultModule of defaultPlannerModules) {
    if (!savedById.has(defaultModule.id)) ordered.push({ ...defaultModule, visibility: { ...defaultModule.visibility } })
  }
  return ordered
}

function moduleIsVisible(id) {
  return plannerModules.value.find(module => module.id === id)?.visibility?.[plannerView.value] !== false
}

function moduleStyle(id) {
  return { order: plannerModules.value.findIndex(module => module.id === id) + 1 }
}

async function loadPlannerModules() {
  try {
    const preferences = await api.getPreferences()
    plannerModules.value = normalizedPlannerModules(preferences.plannerModules)
    plannerView.value = preferences.plannerView === 'work' ? 'work' : 'personal'
  } catch (error) {
    console.error('Could not load planner module settings:', error)
  }
}

async function setPlannerView(view) {
  if (plannerView.value === view) return
  plannerView.value = view
  try {
    await api.updatePreferences({ plannerView: view })
  } catch (error) {
    console.error('Could not save planner view:', error)
  }
}

const now = ref(new Date())
let clockTimer

const clockHands = computed(() => {
  const date = now.value
  return {
    hour: ((date.getHours() % 12) * 30) + (date.getMinutes() * 0.5),
    minute: date.getMinutes() * 6,
    second: date.getSeconds() * 6
  }
})

const calendarViewDate = ref(new Date())
const selectedCalendarDate = ref(localDateKey())

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultRecurrence() {
  return { type: 'daily', startsOn: localDateKey(), dates: [] }
}

const calendarMonthLabel = computed(() => calendarViewDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

const calendarDays = computed(() => {
  const viewYear = calendarViewDate.value.getFullYear()
  const viewMonth = calendarViewDate.value.getMonth()
  const today = now.value
  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const days = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const date = new Date(viewYear, viewMonth, -i)
    days.push({ label: date.getDate(), dateKey: localDateKey(date), muted: true })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear, viewMonth, day)
    days.push({
      label: day,
      dateKey: localDateKey(date),
      today: day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
    })
  }
  let nextDay = 1
  while (days.length % 7 !== 0) {
    const date = new Date(viewYear, viewMonth + 1, nextDay++)
    days.push({ label: date.getDate(), dateKey: localDateKey(date), muted: true })
  }
  return days
})

function calendarTaskPriorities(dateKey) {
  if (!dateKey) return []
  return tasks.value
    .filter(task => task.dueDate === dateKey)
    .slice(0, 3)
    .map(task => task.priority)
}

const selectedCalendarDateLabel = computed(() => new Date(`${selectedCalendarDate.value}T00:00:00`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric'
}))
const selectedCalendarTasks = computed(() => tasks.value.filter(task => task.dueDate === selectedCalendarDate.value))

function selectCalendarDay(dateKey) {
  selectedCalendarDate.value = dateKey
}

function goToPreviousMonth() {
  const date = calendarViewDate.value
  calendarViewDate.value = new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

function goToNextMonth() {
  const date = calendarViewDate.value
  calendarViewDate.value = new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

function defaultHabitVisibility() {
  return { personal: true, work: true }
}

function normalizeHabitVisibility(visibility) {
  if (visibility && typeof visibility === 'object') {
    return {
      personal: visibility.personal !== false,
      work: visibility.work !== false
    }
  }
  return defaultHabitVisibility()
}

function isHabitVisibleInCurrentView(habit) {
  const visibility = normalizeHabitVisibility(habit?.visibility)
  return Boolean(visibility[plannerView.value])
}

const habits = reactive([
  { name: 'Meditation 10 min', done: false, tracker: Array(14).fill(false), recurrence: defaultRecurrence(), visibility: defaultHabitVisibility() },
  { name: 'Book 10 pages', done: false, tracker: Array(14).fill(false), recurrence: defaultRecurrence(), visibility: defaultHabitVisibility() },
  { name: 'Walk 5 km', done: false, tracker: Array(14).fill(false), recurrence: defaultRecurrence(), visibility: defaultHabitVisibility() },
  { name: 'Water 2L', done: false, tracker: Array(14).fill(false), recurrence: defaultRecurrence(), visibility: defaultHabitVisibility() },
  { name: 'Day analysis', done: false, tracker: Array(14).fill(false), recurrence: defaultRecurrence(), visibility: defaultHabitVisibility() }
])

const habitsMenuOpen = ref(false)
const showCompletedHabits = ref(true)
const editingHabits = ref(false)
const isHabitEditorOpen = ref(false)
const todayHabits = computed(() => scheduledHabits(localDateKey(now.value)))
const visibleHabits = computed(() => showCompletedHabits.value ? todayHabits.value : todayHabits.value.filter(habit => !habit.done))
const completedHabits = computed(() => todayHabits.value.filter(habit => habit.done).length)
const habitProgress = computed(() => todayHabits.value.length ? Math.round((completedHabits.value / todayHabits.value.length) * 100) : 0)
const analyticsStartDate = ref(defaultAnalyticsStartDate())
const analyticsEndDate = ref(localDateKey(now.value))
const analyticsToday = computed(() => localDateKey(now.value))
const analyticsMinDate = computed(() => {
  const date = new Date(now.value)
  date.setMonth(date.getMonth() - 2)
  return localDateKey(date)
})

function defaultAnalyticsStartDate() {
  const date = new Date(now.value)
  date.setMonth(date.getMonth() - 1)
  return localDateKey(date)
}

function openAnalyticsDatePicker(event) {
  event.currentTarget?.showPicker?.()
}

function normalizeAnalyticsEndDate() {
  if (/^\d{4}-\d{2}-\d{2}$/.test(analyticsEndDate.value) && analyticsEndDate.value > analyticsToday.value) {
    analyticsEndDate.value = analyticsToday.value
  }
}
const trackerDays = computed(() => Array.from({ length: 14 }, (_, index) => {
  const date = new Date(now.value)
  date.setDate(date.getDate() + index)
  return {
    index,
    dateKey: localDateKey(date),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}))
const trackerCompleted = computed(() => trackerDays.value.reduce((total, day) => (
  total + scheduledHabits(day.dateKey).filter(habit => habit.tracker[day.index]).length
), 0))
const trackerTotal = computed(() => trackerDays.value.reduce((total, day) => total + scheduledHabits(day.dateKey).length, 0))
const analyticsDateRangeDays = computed(() => {
  const requestedStartDate = new Date(`${analyticsStartDate.value}T00:00:00`)
  const startDate = new Date(`${analyticsMinDate.value}T00:00:00`)
  if (requestedStartDate > startDate) startDate.setTime(requestedStartDate.getTime())
  const requestedEndDate = new Date(`${analyticsEndDate.value}T00:00:00`)
  const endDate = new Date(`${analyticsToday.value}T00:00:00`)
  if (requestedEndDate < endDate) endDate.setTime(requestedEndDate.getTime())
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return []
  const days = []
  for (const date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    days.push({
      dateKey: localDateKey(date),
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  }
  return days
})

function habitCompletedOnDate(habit, dateKey) {
  const trackerIndex = trackerDays.value.findIndex(day => day.dateKey === dateKey)
  if (trackerIndex >= 0) return Boolean(habit.tracker[trackerIndex])
  const habitIndex = habits.indexOf(habit)
  return Boolean(dailyEntries[dateKey]?.checks?.[habitIndex])
}

const habitAnalytics = computed(() => habits
  .filter(habit => isHabitVisibleInCurrentView(habit))
  .map(habit => {
    const scheduledDays = analyticsDateRangeDays.value.filter(day => isHabitScheduledFor(habit, day.dateKey))
    const completed = scheduledDays.filter(day => habitCompletedOnDate(habit, day.dateKey)).length
    return {
      name: habit.name || 'Unnamed habit',
      completed,
      total: scheduledDays.length,
      progress: scheduledDays.length ? Math.round((completed / scheduledDays.length) * 100) : 0
    }
  }))
const analyticsCompleted = computed(() => habitAnalytics.value.reduce((total, habit) => total + habit.completed, 0))
const analyticsTotal = computed(() => habitAnalytics.value.reduce((total, habit) => total + habit.total, 0))
const analyticsProgress = computed(() => analyticsTotal.value ? Math.round((analyticsCompleted.value / analyticsTotal.value) * 100) : 0)
const analyticsChartPoints = computed(() => analyticsDateRangeDays.value.map(day => {
  const visibleScheduledHabits = habits.filter(habit => isHabitVisibleInCurrentView(habit) && isHabitScheduledFor(habit, day.dateKey))
  const completed = visibleScheduledHabits.filter(habit => habitCompletedOnDate(habit, day.dateKey)).length
  const total = visibleScheduledHabits.length
  return { ...day, progress: total ? Math.round((completed / total) * 100) : 0 }
}))
const monthLabel = computed(() => now.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
const monthDays = computed(() => {
  const today = new Date(now.value)
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 7)
  const mondayOffset = (today.getDay() + 6) % 7
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() - mondayOffset + 13)
  const days = []

  for (const date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateKey = localDateKey(date)
    days.push({
      index: days.length,
      dateKey,
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      isToday: dateKey === localDateKey(today),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      entry: getDailyEntry(dateKey)
    })
  }
  return days
})
const dailyEntries = reactive({})
const trackerLoaded = ref(false)
let trackerSaveTimer
let trackerSaving = false
let trackerDirty = false

function getDailyEntry(dateKey) {
  if (!dailyEntries[dateKey]) dailyEntries[dateKey] = { note: '', checks: [] }
  return dailyEntries[dateKey]
}

function trackerState() {
  return {
    habits: habits.map(habit => ({
      name: habit.name,
      done: habit.done,
      tracker: [...habit.tracker],
      recurrence: { ...habit.recurrence },
      visibility: { ...normalizeHabitVisibility(habit.visibility) }
    })),
    dailyEntries: JSON.parse(JSON.stringify(dailyEntries))
  }
}

function scheduleTrackerSave() {
  if (!trackerLoaded.value) return
  trackerDirty = true
  window.clearTimeout(trackerSaveTimer)
  trackerSaveTimer = window.setTimeout(saveTracker, 400)
}

async function saveTracker() {
  if (!trackerLoaded.value || trackerSaving || !trackerDirty) return
  trackerSaving = true
  trackerDirty = false
  try {
    await api.updatePreferences({ trackerState: trackerState() })
  } catch (error) {
    console.error('Could not save daily tracker:', error)
    trackerDirty = true
  } finally {
    trackerSaving = false
    if (trackerDirty) scheduleTrackerSave()
  }
}

async function loadTracker() {
  try {
    const preferences = await api.getPreferences()
    const savedHabits = preferences.trackerState?.habits
    const savedEntries = preferences.trackerState?.dailyEntries

    if (Array.isArray(savedHabits)) {
      habits.splice(0, habits.length, ...savedHabits.map(habit => ({
        name: typeof habit.name === 'string' ? habit.name : 'New habit',
        done: Boolean(habit.done),
        tracker: Array.from({ length: 14 }, (_, index) => Boolean(habit.tracker?.[index])),
        recurrence: {
          ...defaultRecurrence(),
          ...(habit.recurrence && typeof habit.recurrence === 'object' ? habit.recurrence : {}),
          dates: Array.isArray(habit.recurrence?.dates) ? habit.recurrence.dates : []
        },
        visibility: normalizeHabitVisibility(habit.visibility)
      })))
    }
    if (savedEntries && typeof savedEntries === 'object' && !Array.isArray(savedEntries)) {
      Object.assign(dailyEntries, savedEntries)
    }
  } catch (error) {
    console.error('Could not load daily tracker:', error)
  } finally {
    trackerLoaded.value = true
  }
}

watch([habits, dailyEntries], scheduleTrackerSave, { deep: true })

const brainDump = ref('')
const brainDumpLoaded = ref(false)
let brainDumpSaveTimer
let brainDumpSaving = false
let brainDumpDirty = false

function scheduleBrainDumpSave() {
  if (!brainDumpLoaded.value) return
  brainDumpDirty = true
  window.clearTimeout(brainDumpSaveTimer)
  brainDumpSaveTimer = window.setTimeout(saveBrainDump, 500)
}

async function saveBrainDump() {
  if (!brainDumpLoaded.value || brainDumpSaving || !brainDumpDirty) return
  brainDumpSaving = true
  brainDumpDirty = false
  try {
    await api.updatePreferences({ brainDump: brainDump.value })
  } catch (error) {
    console.error('Could not save brain dump:', error)
    brainDumpDirty = true
  } finally {
    brainDumpSaving = false
    if (brainDumpDirty) scheduleBrainDumpSave()
  }
}

async function loadBrainDump() {
  try {
    const preferences = await api.getPreferences()
    if (typeof preferences.brainDump === 'string') brainDump.value = preferences.brainDump
  } catch (error) {
    console.error('Could not load brain dump:', error)
  } finally {
    brainDumpLoaded.value = true
  }
}

watch(brainDump, scheduleBrainDumpSave)

const readAloudText = ref('')
const readAloudLanguage = ref('auto')
const readAloudVoices = ref([])
const readAloudVoiceName = ref('')
const readAloudRate = ref(1)
const isReading = ref(false)
const isReadAloudPaused = ref(false)
const isReadAloudLoading = ref(false)
const readAloudError = ref('')
const readAloudAudio = ref(null)
let readAloudAudioUrl = ''
const readAloudLanguageAvailable = computed(() => {
  const language = readAloudLanguage.value === 'auto'
    ? (/[áéíóöőúüű]/i.test(readAloudText.value) ? 'hu-HU' : 'en-US')
    : readAloudLanguage.value
  const languagePrefix = language.slice(0, 2).toLowerCase()
  return ['en', 'hu'].includes(languagePrefix)
})
const readAloudUsesRemote = computed(() => {
  const languagePrefix = readAloudLocale().slice(0, 2).toLowerCase()
  return !readAloudVoices.value.some(voice => voice.lang?.toLowerCase().startsWith(languagePrefix))
})

function loadReadAloudVoices() {
  if (!('speechSynthesis' in window)) return
  readAloudVoices.value = window.speechSynthesis.getVoices()
    .filter(voice => voice.lang?.toLowerCase().startsWith('en') || voice.lang?.toLowerCase().startsWith('hu'))
    .sort((firstVoice, secondVoice) => {
      const firstLocal = firstVoice.localService ? 0 : 1
      const secondLocal = secondVoice.localService ? 0 : 1
      return firstLocal - secondLocal || firstVoice.lang.localeCompare(secondVoice.lang) || firstVoice.name.localeCompare(secondVoice.name)
    })
}

function refreshReadAloudVoice() {
  if (readAloudVoiceName.value && !readAloudVoices.value.some(voice => voice.voiceURI === readAloudVoiceName.value)) {
    readAloudVoiceName.value = ''
  }
  if (!readAloudLanguageAvailable.value || readAloudVoiceName.value && !readAloudVoiceMatchesLanguage()) {
    readAloudVoiceName.value = ''
  }
}

function readAloudVoiceMatchesLanguage() {
  const languagePrefix = readAloudLanguage.value.slice(0, 2).toLowerCase()
  const selectedVoice = readAloudVoices.value.find(voice => voice.voiceURI === readAloudVoiceName.value)
  return selectedVoice?.lang?.toLowerCase().startsWith(languagePrefix)
}

function readAloudLocale() {
  if (readAloudLanguage.value !== 'auto') return readAloudLanguage.value
  return /[áéíóöőúüű]/i.test(readAloudText.value) ? 'hu-HU' : 'en-US'
}

async function toggleReadAloud() {
  if (!('speechSynthesis' in window) || !readAloudText.value.trim() || !readAloudLanguageAvailable.value) return
  readAloudError.value = ''
  if (isReading.value && !isReadAloudPaused.value) {
    window.speechSynthesis.pause()
    isReadAloudPaused.value = true
    return
  }
  if (isReadAloudPaused.value) {
    if (readAloudUsesRemote.value && readAloudAudio.value) await readAloudAudio.value.play()
    window.speechSynthesis.resume()
    isReadAloudPaused.value = false
    return
  }
  window.speechSynthesis.cancel()
  if (readAloudUsesRemote.value) {
    isReadAloudLoading.value = true
    try {
      const audioBlob = await api.textToSpeech(readAloudText.value.trim(), readAloudLocale())
      if (readAloudAudioUrl) URL.revokeObjectURL(readAloudAudioUrl)
      readAloudAudioUrl = URL.createObjectURL(audioBlob)
      readAloudAudio.value = new Audio(readAloudAudioUrl)
      readAloudAudio.value.onplay = () => { isReading.value = true; isReadAloudPaused.value = false }
      readAloudAudio.value.onpause = () => { if (!readAloudAudio.value.ended) isReadAloudPaused.value = true }
      readAloudAudio.value.onended = () => { isReading.value = false; isReadAloudPaused.value = false }
      await readAloudAudio.value.play()
    } catch (error) {
      console.error('Could not generate speech audio:', error)
      let message = 'The Hungarian neural speech service is temporarily unavailable.'
      if (error.response?.data instanceof Blob) {
        try {
          const responseBody = JSON.parse(await error.response.data.text())
          if (responseBody.detail) message = responseBody.detail
        } catch {
          // Keep the useful fallback message when the server response is not JSON.
        }
      }
      readAloudError.value = message
    } finally {
      isReadAloudLoading.value = false
    }
    return
  }
  const utterance = new SpeechSynthesisUtterance(readAloudText.value.trim())
  utterance.lang = readAloudLocale()
  utterance.rate = readAloudRate.value
  const locale = readAloudLocale().toLowerCase()
  const selectedVoice = readAloudVoices.value.find(voice => voice.voiceURI === readAloudVoiceName.value)
    || readAloudVoices.value.find(voice => voice.lang.toLowerCase() === locale)
    || readAloudVoices.value.find(voice => voice.lang.toLowerCase().startsWith(locale.slice(0, 2)))
  if (selectedVoice) utterance.voice = selectedVoice
  utterance.onstart = () => { isReading.value = true; isReadAloudPaused.value = false }
  utterance.onpause = () => { isReadAloudPaused.value = true }
  utterance.onresume = () => { isReadAloudPaused.value = false }
  utterance.onend = () => { isReading.value = false; isReadAloudPaused.value = false }
  utterance.onerror = () => { isReading.value = false; isReadAloudPaused.value = false }
  window.speechSynthesis.speak(utterance)
}

function stopReadAloud() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  readAloudAudio.value?.pause()
  isReading.value = false
  isReadAloudPaused.value = false
}

function isHabitScheduledFor(habit, dateKey) {
  const recurrence = habit.recurrence || defaultRecurrence()
  const type = recurrence.type || 'daily'
  if (type === 'custom') return Array.isArray(recurrence.dates) && recurrence.dates.includes(dateKey)

  const targetDate = new Date(`${dateKey}T00:00:00`)
  const startDate = new Date(`${recurrence.startsOn || localDateKey()}T00:00:00`)
  if (Number.isNaN(targetDate.getTime()) || targetDate < startDate) return false

  const dayDifference = Math.round((targetDate - startDate) / 86400000)
  if (type === 'daily') return true
  if (type === 'weekly') return dayDifference % 7 === 0
  if (type === 'monthly') return targetDate.getDate() === startDate.getDate()
  if (type === 'yearly') return targetDate.getMonth() === startDate.getMonth() && targetDate.getDate() === startDate.getDate()
  return false
}

function scheduledHabits(dateKey) {
  return habits.filter(habit => isHabitVisibleInCurrentView(habit) && isHabitScheduledFor(habit, dateKey))
}

function dailyPlannerHabits() {
  return habits.filter(habit => isHabitVisibleInCurrentView(habit))
}

function toggleCustomHabitDate(habit, dateKey) {
  if (habit.recurrence.type !== 'custom') return
  if (!Array.isArray(habit.recurrence.dates)) habit.recurrence.dates = []
  const dateIndex = habit.recurrence.dates.indexOf(dateKey)
  if (dateIndex === -1) {
    habit.recurrence.dates.push(dateKey)
  } else {
    habit.recurrence.dates.splice(dateIndex, 1)
    const habitIndex = habits.indexOf(habit)
    if (dailyEntries[dateKey]?.checks) dailyEntries[dateKey].checks[habitIndex] = false
  }
}

function trackerDayCompleted(index) {
  return scheduledHabits(trackerDays.value[index].dateKey).filter(habit => habit.tracker[index]).length
}

function trackerDayProgress(index) {
  const scheduledCount = scheduledHabits(trackerDays.value[index].dateKey).length
  return scheduledCount ? Math.round((trackerDayCompleted(index) / scheduledCount) * 100) : 0
}

const tasks = ref([])
const tasksLoading = ref(true)
const tasksError = ref('')
const showFinishedTasks = ref(false)
const taskView = ref('all')
const openPriorityTask = ref(null)
const isTaskModalOpen = ref(false)
const isSavingTask = ref(false)
const editingTaskId = ref(null)
const newTask = reactive({
  description: '',
  priority: 'Medium',
  dueDate: null,
  status: 'Not started'
})
const priorities = ['High', 'Medium', 'Low']
const completedTasks = computed(() => tasks.value.filter(task => task.done).length)
const visibleTasks = computed(() => showFinishedTasks.value ? tasks.value : tasks.value.filter(task => !task.done))
const timelineTasks = computed(() => [...visibleTasks.value].sort((firstTask, secondTask) => {
  if (!firstTask.dueDate && !secondTask.dueDate) return firstTask.id - secondTask.id
  if (!firstTask.dueDate) return 1
  if (!secondTask.dueDate) return -1
  return firstTask.dueDate.localeCompare(secondTask.dueDate) || firstTask.id - secondTask.id
}))

function formatTimelineDate(dateString) {
  if (!dateString) return 'No date'
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function tasksByPriority(priority) {
  return visibleTasks.value.filter(task => task.priority === priority)
}

async function saveShowFinishedTasks() {
  try {
    await api.updatePreferences({ showFinishedTasks: showFinishedTasks.value })
  } catch (error) {
    tasksError.value = 'Unable to save task settings.'
  }
}

function togglePriorityPicker(taskId) {
  openPriorityTask.value = openPriorityTask.value === taskId ? null : taskId
}

function setPriority(task, priority) {
  task.priority = priority
  openPriorityTask.value = null
  saveTask(task)
}

async function loadTasks() {
  tasksLoading.value = true
  tasksError.value = ''
  try {
    tasks.value = await api.getTasks()
  } catch (error) {
    tasksError.value = 'Unable to load tasks.'
  } finally {
    tasksLoading.value = false
  }
}

async function loadTaskPreferences() {
  try {
    const preferences = await api.getPreferences()
    showFinishedTasks.value = preferences.showFinishedTasks === true
  } catch (error) {
    console.error('Could not load task settings:', error)
  }
}

async function saveTask(task) {
  try {
    const savedTask = await api.updateTask(task.id, { ...task, dueDate: task.dueDate || null })
    Object.assign(task, savedTask)
  } catch (error) {
    tasksError.value = 'Unable to save task.'
  }
}

function addTask() {
  editingTaskId.value = null
  Object.assign(newTask, {
    description: '',
    priority: 'Medium',
    dueDate: null,
    status: 'Not started'
  })
  tasksError.value = ''
  isTaskModalOpen.value = true
}

function openTaskModal(task) {
  editingTaskId.value = task.id
  Object.assign(newTask, {
    description: task.description || '',
    priority: task.priority,
    dueDate: task.dueDate || null,
    status: task.status
  })
  tasksError.value = ''
  isTaskModalOpen.value = true
}

function closeTaskModal() {
  if (!isSavingTask.value) isTaskModalOpen.value = false
}

async function saveNewTask() {
  isSavingTask.value = true
  tasksError.value = ''
  try {
    const taskData = {
      description: newTask.description.trim(),
      priority: newTask.priority,
      dueDate: newTask.dueDate || null,
      status: newTask.status,
      done: newTask.status === 'Done'
    }
    if (editingTaskId.value) {
      const task = tasks.value.find(item => item.id === editingTaskId.value)
      if (task) Object.assign(task, await api.updateTask(task.id, taskData))
    } else {
      const task = await api.createTask({ id: `task-${Date.now()}`, ...taskData })
      tasks.value.push(task)
    }
    isTaskModalOpen.value = false
  } catch (error) {
    tasksError.value = 'Unable to create task.'
  } finally {
    isSavingTask.value = false
  }
}

function handleTaskModalKeydown(event) {
  if (event.key === 'Escape' && isTaskModalOpen.value) closeTaskModal()
  if (event.key === 'Escape' && isHabitEditorOpen.value) closeHabitEditor()
}

function openDatePicker(event) {
  event.target.showPicker?.()
}

function priorityIcon(priority) {
  return priority === 'High' ? '▲' : priority === 'Low' ? '▼' : '◆'
}

function resetHabits() {
  habits.forEach(habit => { habit.done = false })
  habitsMenuOpen.value = false
}

function startEditingHabits() {
  habitsMenuOpen.value = false
  openHabitEditor()
}

function openHabitEditor() {
  isHabitEditorOpen.value = true
}

function closeHabitEditor() {
  isHabitEditorOpen.value = false
}

function addHabit() {
  habits.push({ name: 'New habit', done: false, tracker: Array(14).fill(false), recurrence: defaultRecurrence(), visibility: defaultHabitVisibility() })
}

function removeHabit(habit) {
  const index = habits.indexOf(habit)
  if (index !== -1) habits.splice(index, 1)
}

const tracks = [
  { title: 'Focus', artist: 'Leberch', art: 'LF', src: '/audio/leberch-focus-583076.mp3' },
  { title: 'Deep Focus', artist: 'Leberch', art: 'LD', src: '/audio/leberch-deep-focus-583153.mp3' },
  { title: 'Focus', artist: 'Atlas Audio', art: 'AF', src: '/audio/atlasaudio-focus-583151.mp3' },
  { title: 'Focus (Alt)', artist: 'Atlas Audio', art: 'AA', src: '/audio/atlasaudio-focus-583146.mp3' }
]
const audioPlayer = ref(null)
const currentTrackIndex = ref(0)
const isPlaying = ref(false)
const playProgress = ref(0)
const currentTime = ref(0)
const duration = ref(0)
const currentTrack = computed(() => tracks[currentTrackIndex.value])
const formattedTime = computed(() => {
  const seconds = Math.floor(currentTime.value)
  const mins = Math.floor(seconds / 60)
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
})

function onTimeUpdate() {
  const audio = audioPlayer.value
  if (!audio) return
  currentTime.value = audio.currentTime
  duration.value = audio.duration || 0
  playProgress.value = duration.value ? (currentTime.value / duration.value) * 100 : 0
}

function playCurrentTrack() {
  const audio = audioPlayer.value
  if (!audio) return
  audio.play()
  isPlaying.value = true
}

function togglePlay() {
  const audio = audioPlayer.value
  if (!audio) return
  if (isPlaying.value) {
    audio.pause()
    isPlaying.value = false
  } else {
    playCurrentTrack()
  }
}

function selectTrack(index) {
  currentTrackIndex.value = index
  nextTick(() => playCurrentTrack())
}

function previousTrack() {
  currentTrackIndex.value = (currentTrackIndex.value - 1 + tracks.length) % tracks.length
  nextTick(() => playCurrentTrack())
}

function nextTrack() {
  currentTrackIndex.value = (currentTrackIndex.value + 1) % tracks.length
  nextTick(() => playCurrentTrack())
}

onMounted(() => {
  clockTimer = window.setInterval(() => { now.value = new Date() }, 1000)
  loadTasks()
  loadTaskPreferences()
  loadTracker()
  loadBrainDump()
  loadPlannerModules()
  window.addEventListener('keydown', handleTaskModalKeydown)
  if ('speechSynthesis' in window) {
    loadReadAloudVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadReadAloudVoices)
  }
})

onUnmounted(() => {
  window.clearInterval(clockTimer)
  window.clearTimeout(trackerSaveTimer)
  window.clearTimeout(brainDumpSaveTimer)
  window.removeEventListener('keydown', handleTaskModalKeydown)
  stopReadAloud()
  if (readAloudAudioUrl) URL.revokeObjectURL(readAloudAudioUrl)
  if ('speechSynthesis' in window) window.speechSynthesis.removeEventListener('voiceschanged', loadReadAloudVoices)
})
</script>

<style scoped>
.planner-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #F4F6F8;
}

.planner-background {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr) 330px;
  gap: 1px;
  background: #D7DDE3;
}

.planner-panel {
  min-width: 0;
  grid-template-columns: 24px minmax(0, 1fr) 96px;
  background: #F8FAFB;
  padding: 24px;
}

.read-aloud-module {
  order: 2;
  min-width: 0;
  padding: 24px;
  border: 1px solid #D9E0E5;
  border-radius: 8px;
  background: #FFFFFF;
}

.read-aloud-header,
.read-aloud-controls,
.read-aloud-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.read-aloud-header {
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.module-kicker {
  color: #0078D4;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.read-aloud-header h2 {
  margin-top: 4px;
  color: #1F2937;
  font-size: 20px;
}

.read-aloud-header p {
  margin-top: 5px;
  color: #64748B;
  font-size: 12px;
}

.read-aloud-status {
  padding: 5px 8px;
  border: 1px solid #D9E0E5;
  border-radius: 999px;
  color: #64748B;
  font-size: 11px;
  white-space: nowrap;
}

.read-aloud-status.active {
  border-color: #B8D9EE;
  background: #EFF8FD;
  color: #0078D4;
}

.read-aloud-textarea {
  width: 100%;
  min-height: 155px;
  padding: 13px;
  border: 1px solid #D9E0E5;
  border-radius: 6px;
  background: #F8FAFB;
  color: #1F2937;
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.read-aloud-textarea:focus {
  outline: 2px solid #B8D9EE;
  border-color: #0078D4;
}

.read-aloud-controls {
  align-items: flex-end;
  margin-top: 14px;
}

.read-aloud-controls label {
  display: grid;
  gap: 5px;
  min-width: 145px;
  color: #64748B;
  font-size: 11px;
  font-weight: 600;
}

.read-aloud-controls select {
  min-height: 34px;
  padding: 0 9px;
  border: 1px solid #D9E0E5;
  border-radius: 5px;
  background: #FFFFFF;
  color: #334155;
  font: inherit;
  font-size: 12px;
}

.read-aloud-voice-field {
  flex: 1;
}

.read-aloud-rate-field {
  min-width: 145px !important;
}

.read-aloud-rate-field strong {
  color: #1F2937;
  font-weight: 700;
}

.read-aloud-rate-field input {
  accent-color: #0078D4;
}

.read-aloud-actions {
  margin-top: 16px;
}

.read-aloud-actions button {
  min-height: 35px;
  padding: 0 14px;
  border-radius: 5px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}

.read-aloud-primary {
  border: 1px solid #0078D4;
  background: #0078D4;
  color: #FFFFFF;
}

.read-aloud-primary:hover:not(:disabled) {
  background: #006AB8;
}

.read-aloud-secondary {
  border: 1px solid #D9E0E5;
  background: #FFFFFF;
  color: #475569;
}

.read-aloud-actions button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.read-aloud-actions small {
  margin-left: auto;
  color: #94A3B8;
  font-size: 11px;
}

html[data-theme='dark'] .read-aloud-module {
  border-color: #34424D;
  background: #202B34;
}

html[data-theme='dark'] .read-aloud-header h2,
html[data-theme='dark'] .read-aloud-rate-field strong {
  color: #E5EDF2;
}

html[data-theme='dark'] .read-aloud-header p,
html[data-theme='dark'] .read-aloud-controls label {
  color: #9AAAB5;
}

html[data-theme='dark'] .read-aloud-textarea,
html[data-theme='dark'] .read-aloud-controls select,
html[data-theme='dark'] .read-aloud-secondary {
  border-color: #34424D;
  background: #1B232B;
  color: #E5EDF2;
}

.planner-sidebar {
  background: #EEF2F4;
  padding: 22px 18px;
}

.brain-dump-card {
  display: flex;
  flex-direction: column;
  min-height: 180px;
  margin-top: 22px;
  padding: 10px;
  border: 1px solid #D9E0E5;
  border-radius: 7px;
  background: #FFFFFF;
}

.brain-dump-header {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 40px;
  margin: -4px -4px 8px;
  padding: 0 10px;
  border-radius: 5px;
  background: #E8EEF2;
  color: #1F2937;
  font-size: 15px;
}

.brain-dump-icon {
  font-size: 14px;
}

.brain-dump-textarea {
  flex: 1;
  min-height: 130px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  transition: border-color .15s, background-color .15s;
}

.brain-dump-textarea:hover {
  background: #F4F7F9;
}

.brain-dump-textarea:focus {
  outline: none;
  border-color: #0078D4;
  background: #FFFFFF;
}

[data-theme='dark'] .brain-dump-card {
  border-color: #33414B;
  background: #1C2731;
}

[data-theme='dark'] .brain-dump-header {
  background: #26333D;
  color: #E2E8F0;
}

[data-theme='dark'] .brain-dump-textarea {
  color: #CBD5E1;
}

[data-theme='dark'] .brain-dump-textarea:hover {
  background: #212D37;
}

[data-theme='dark'] .brain-dump-textarea:focus {
  background: #182129;
}

[data-theme='dark'] .month-habit-tracker {
  border-color: #33414B;
  background: #1C2731;
}

[data-theme='dark'] .month-tracker-row {
  border-color: #33414B;
  background: #212D37;
}

[data-theme='dark'] .month-tracker-row.today {
  border-color: #4F8BB8;
  background: #1F3B4E;
  box-shadow: inset 3px 0 0 #4F8BB8;
}

[data-theme='dark'] .month-tracker-date {
  color: #CBD5E1;
}

[data-theme='dark'] .month-tracker-row.today .month-tracker-date strong {
  color: #7FC0F5;
}

[data-theme='dark'] .month-tracker-date small {
  color: #7C8A99;
}

[data-theme='dark'] .month-tracker-note {
  color: #E2E8F0;
}

[data-theme='dark'] .month-tracker-note-wrap::after {
  background: linear-gradient(to right, rgb(33 45 55 / 0%), #212D37 85%);
}

[data-theme='dark'] .month-tracker-note:focus {
  border-color: #4F8BB8;
  background: #26333D;
}

[data-theme='dark'] .month-tracker-note:focus + .month-tracker-note-wrap::after,
[data-theme='dark'] .month-tracker-note-wrap:focus-within::after {
  background: linear-gradient(to right, rgb(38 51 61 / 0%), #26333D 85%);
}

[data-theme='dark'] .month-tracker-note::placeholder {
  color: #64748B;
}

[data-theme='dark'] .month-tracker-habits .habit-day-item {
  color: #94A3B8;
}

[data-theme='dark'] .month-tracker-habits .custom-habit-slot:not(.scheduled) {
  border-color: #47576A;
  color: #64748B;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: 30px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid #D9E0E5;
  color: #1F2937;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  text-align: left;
}

.calendar-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #64748B;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.calendar-arrow:hover {
  background: #DDE5EA;
  color: #1F2937;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
  text-align: center;
}

.calendar-weekdays {
  margin-bottom: 9px;
  color: #94A3B8;
  font-size: 11px;
  font-weight: 700;
}

.calendar-grid > button {
  display: grid;
  grid-template-rows: 1fr 5px;
  place-items: center;
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color .15s, border-color .15s;
}

.calendar-grid > button:not(.muted):not(.today):hover {
  border-color: #C6D0D8;
  background: #E7EDF1;
}

.calendar-grid > button.muted {
  color: #B8C2CA;
}

.calendar-grid > button.today {
  background: #0078D4;
  color: #FFFFFF;
  font-weight: 700;
}

.calendar-grid > button.selected:not(.today) {
  border-color: #0078D4;
}

.calendar-day-label {
  line-height: 1;
}

.calendar-task-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.calendar-task-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 5px;
}

.calendar-task-list {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #D9E0E5;
}

.calendar-task-list-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  color: #1F2937;
  font-size: 12px;
}

.calendar-task-list-header span,
.calendar-task-empty {
  color: #94A3B8;
  font-size: 11px;
}

.calendar-task-empty {
  margin: 9px 0 0;
}

.calendar-task-item {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  margin-top: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.calendar-task-item:hover {
  color: #0078D4;
}

.calendar-task-item.completed span {
  color: #94A3B8;
  text-decoration: line-through;
}

.calendar-task-item-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.analog-clock {
  position: relative;
  width: 132px;
  height: 132px;
  margin: 8px auto 0;
  border: 1px solid #CBD5DC;
  border-radius: 50%;
  background: #FFFFFF;
}

.clock-mark {
  position: absolute;
  top: 7px;
  left: 64px;
  width: 2px;
  height: 7px;
  transform-origin: 1px 59px;
  background: #94A3B8;
}

.clock-hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  width: 2px;
  border-radius: 2px;
  transform-origin: 50% 100%;
}

.hour-hand {
  height: 34px;
  background: #1F2937;
}

.minute-hand {
  height: 47px;
  background: #334155;
}

.second-hand {
  height: 51px;
  width: 1px;
  background: #0078D4;
}

.clock-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 7px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #0078D4;
}

[data-theme='dark'] .analog-clock {
  border-color: #52616D;
  background: #18232C;
  box-shadow: inset 0 0 0 5px #202B34, 0 8px 18px rgba(0, 0, 0, 0.2);
}

[data-theme='dark'] .clock-mark {
  background: #708493;
}

[data-theme='dark'] .hour-hand {
  background: #E5EDF2;
}

[data-theme='dark'] .minute-hand {
  background: #B8C9D4;
}

[data-theme='dark'] .second-hand,
[data-theme='dark'] .clock-center {
  background: #38BDF8;
}

.planner-main {
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  padding: 28px 32px;
  overflow-x: hidden;
  overflow-y: auto;
}

.planner-empty-state {
  order: 1;
  display: grid;
  gap: 6px;
  padding: 36px 24px;
  border: 1px dashed #B9C8D2;
  border-radius: 8px;
  background: #F8FAFB;
  color: #334155;
  text-align: center;
}

.planner-empty-state span {
  color: #64748B;
  font-size: 12px;
}

.tasks-panel {
  width: 100%;
  padding: 14px 20px;
  border: 1px solid #D9E0E5;
  border-radius: 8px;
  background: #F8FAFB;
}

.tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #E1E6EA;
}

.tasks-header h1 {
  color: #1F2937;
  font-size: 18px;
  font-weight: 700;
}

.tasks-header p {
  margin-top: 2px;
  color: #94A3B8;
  font-size: 12px;
}

.add-task-button {
  padding: 9px 13px;
  border: 0;
  border-radius: 6px;
  background: #0078D4;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.add-task-button:hover {
  background: #006CBF;
}

.task-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(15 23 42 / 38%);
}

.task-modal {
  position: relative;
  width: min(100%, 500px);
  padding: 28px;
  border: 1px solid #D9E0E5;
  border-radius: 10px;
  background: #FFFFFF;
  box-shadow: 0 20px 50px rgb(15 23 42 / 20%);
}

.task-modal-close {
  position: absolute;
  top: 14px;
  right: 16px;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #64748B;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.task-modal-close:hover {
  background: #EEF2F4;
  color: #1F2937;
}

.task-modal-header {
  margin-bottom: 24px;
}

.task-modal-header h2 {
  color: #1F2937;
  font-size: 20px;
  font-weight: 700;
}

.task-modal-header p {
  margin-top: 5px;
  color: #64748B;
  font-size: 12px;
}

.habit-editor-modal {
  width: min(100%, 680px);
}

.habit-editor-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.habit-editor-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border: 1px solid #E2E8F0;
  border-radius: 7px;
  background: #F8FAFC;
}

.habit-editor-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px auto;
  gap: 10px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.habit-editor-input {
  flex: 1;
  min-width: 0;
  min-height: 38px;
  padding: 9px 10px;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  background: #FFFFFF;
  color: #1F2937;
  font: inherit;
  font-size: 13px;
}

.habit-editor-input:focus {
  outline: 2px solid rgb(0 120 212 / 24%);
  border-color: #0078D4;
}

.habit-repeat-field {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #64748B;
  font-size: 11px;
  font-weight: 600;
}

.habit-repeat-field select {
  min-width: 0;
  min-height: 38px;
  padding: 8px;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  background: #FFFFFF;
  color: #1F2937;
  font: inherit;
}

.habit-repeat-field select {
  flex: 1;
}

.habit-visibility-options {
  display: flex;
  align-items: center;
  gap: 4px;
}

.habit-visibility-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  background: #FFFFFF;
  color: #64748B;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: all .15s ease;
}

.habit-visibility-pill:hover {
  border-color: #94A3B8;
  color: #1F2937;
}

.habit-visibility-pill.active {
  border-color: #0078D4;
  background: #E8F3FA;
  color: #0078D4;
}

.habit-visibility-pill input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
  margin: 0;
}

.habit-editor-row .delete-habit-button {
  width: 30px;
  height: 30px;
}

.habit-editor-empty {
  padding: 12px 0;
  color: #94A3B8;
  font-size: 12px;
}

.habit-editor-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.habit-add-button {
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: #0078D4;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.habit-add-button:hover {
  color: #006CBF;
}

.task-modal-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.task-modal-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.task-modal-field-wide {
  width: 100%;
}

.task-modal-field input,
.task-modal-field select {
  width: 100%;
  min-height: 38px;
  padding: 9px 10px;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  background: #FFFFFF;
  color: #1F2937;
  font: inherit;
  font-weight: 400;
}

.task-modal-field input:focus,
.task-modal-field select:focus {
  outline: 2px solid rgb(0 120 212 / 24%);
  border-color: #0078D4;
}

.task-modal-error {
  margin-top: 14px;
  color: #B42318;
  font-size: 12px;
}

.task-modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 28px;
}

.task-modal-save {
  min-width: 76px;
  padding: 10px 16px;
  border: 0;
  border-radius: 6px;
  background: #0078D4;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.task-modal-save:hover {
  background: #006CBF;
}

.task-modal-save:disabled {
  opacity: .65;
  cursor: wait;
}

[data-theme='dark'] .task-modal-backdrop {
  background: rgb(0 0 0 / 60%);
}

[data-theme='dark'] .task-modal {
  border-color: #34424D;
  background: #202B34;
  box-shadow: 0 20px 50px rgba(0, 0, 0, .5);
  color: #E5EDF2;
}

[data-theme='dark'] .task-modal-close {
  color: #9AAAB5;
}

[data-theme='dark'] .task-modal-close:hover {
  background: #2A3A45;
  color: #E5EDF2;
}

[data-theme='dark'] .task-modal-header h2 {
  color: #E5EDF2;
}

[data-theme='dark'] .task-modal-header p {
  color: #9AAAB5;
}

[data-theme='dark'] .habit-editor-row {
  border-color: #34424D;
  background: #1B232B;
}

[data-theme='dark'] .habit-editor-input {
  border-color: #34424D;
  background: #202B34;
  color: #E5EDF2;
}

[data-theme='dark'] .habit-editor-input:focus {
  border-color: #1687D2;
  outline: 2px solid rgb(22 135 210 / 24%);
}

[data-theme='dark'] .habit-repeat-field {
  color: #9AAAB5;
}

[data-theme='dark'] .habit-repeat-field select {
  border-color: #34424D;
  background: #202B34;
  color: #E5EDF2;
}

[data-theme='dark'] .habit-repeat-field select:focus {
  border-color: #1687D2;
  outline: 2px solid rgb(22 135 210 / 24%);
}

[data-theme='dark'] .habit-visibility-pill {
  border-color: #34424D;
  background: #202B34;
  color: #9AAAB5;
}

[data-theme='dark'] .habit-visibility-pill:hover {
  border-color: #52616D;
  color: #E5EDF2;
}

[data-theme='dark'] .habit-visibility-pill.active {
  border-color: #1687D2;
  background: #1B364A;
  color: #7FC0F5;
}

[data-theme='dark'] .habit-editor-empty {
  color: #9AAAB5;
}

[data-theme='dark'] .habit-add-button {
  color: #1687D2;
}

[data-theme='dark'] .habit-add-button:hover {
  color: #7FC0F5;
}

[data-theme='dark'] .task-modal-field {
  color: #9AAAB5;
}

[data-theme='dark'] .task-modal-field input,
[data-theme='dark'] .task-modal-field select {
  border-color: #34424D;
  background: #1B232B;
  color: #E5EDF2;
}

[data-theme='dark'] .task-modal-field input:focus,
[data-theme='dark'] .task-modal-field select:focus {
  border-color: #1687D2;
  outline: 2px solid rgb(22 135 210 / 24%);
}

[data-theme='dark'] .task-modal-error {
  color: #F87171;
}

[data-theme='dark'] .task-modal-save {
  background: #1687D2;
  color: #FFFFFF;
}

[data-theme='dark'] .task-modal-save:hover {
  background: #1476BA;
}

.task-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
}

.task-filter {
  padding: 6px 9px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: #64748B;
  font-size: 11px;
  cursor: pointer;
}

.task-filter:hover,
.task-filter.active {
  border-color: #D9E0E5;
  background: #EEF2F4;
  color: #334155;
}

.task-finished-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #64748B;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}

.task-finished-toggle input {
  accent-color: #1D78B5;
}

.task-toolbar-actions {
  margin-left: auto;
  color: #94A3B8;
  font-size: 13px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
}

.habit-tracker {
  width: 100%;
  margin-top: 8px;
  padding: 14px 20px;
  border: 1px solid #D9E0E5;
  border-radius: 8px;
  background: #F8FAFB;
}

.habit-analytics {
  width: 100%;
  margin-top: 8px;
  padding: 6px 20px 18px;
  border: 1px solid #D9E0E5;
  border-radius: 8px;
  background: #F8FAFB;
}

.analytics-total-progress {
  color: #1D78B5;
  font-size: 26px;
}

.analytics-progress-ring {
  --progress: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  flex: 0 0 auto;
  transform: translateY(20px);
  background: conic-gradient(#1D78B5 calc(var(--progress) * 1%), #E2E8F0 0);
  transition: background 0.3s ease;
}

.analytics-progress-ring::before {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: #F8FAFB;
}

.analytics-progress-ring .analytics-total-progress {
  position: relative;
  font-size: 18px;
}

[data-theme='dark'] .analytics-progress-ring::before {
  background: #1B2530;
}

.analytics-controls {
  display: grid;
  grid-template-columns: max-content max-content;
  gap: 8px 14px;
  margin-bottom: 12px;
}

.analytics-controls label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748B;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.analytics-controls label > span {
  flex: 0 0 auto;
}

.analytics-controls input,
.analytics-controls select {
  width: 100%;
  min-height: 31px;
  padding: 5px 7px;
  border: 1px solid #D9E0E5;
  border-radius: 5px;
  background: #FFFFFF;
  color: #334155;
  font-size: 12px;
  text-transform: none;
}

.analytics-date-input {
  width: 120px !important;
  min-width: 120px;
  padding: 5px 20px 5px 0;
  border: 1px solid transparent !important;
  border-radius: 4px !important;
  background: transparent !important;
  color: #3776AF !important;
  font-size: 11px !important;
  cursor: pointer;
}

.analytics-date-input::-webkit-calendar-picker-indicator {
  margin-left: 0;
  padding: 0;
  cursor: pointer;
}

.analytics-date-input:focus {
  border-color: #CBD5DC !important;
  outline: 0;
  background: #FFFFFF !important;
}

.analytics-chart {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  display: flex;
  gap: 8px;
  min-height: 170px;
  margin: 12px 0 16px;
  padding: 10px 8px 0 0;
  border-bottom: 1px solid #D9E0E5;
}

.analytics-chart-scale {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 34px;
  padding-bottom: 20px;
  color: #94A3B8;
  font-size: 10px;
  text-align: right;
}

.analytics-chart-plot {
  position: relative;
  display: flex;
  align-items: end;
  flex: 1;
  gap: 4px;
  min-width: 0;
  min-height: 160px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  padding: 0 3px;
  background: repeating-linear-gradient(to bottom, transparent 0, transparent 51px, #EAF0F3 52px);
}

.analytics-chart-column {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex: 0 0 42px;
  flex-direction: column;
  justify-content: end;
  min-width: 0;
  height: 100%;
  gap: 4px;
}

.analytics-chart-value {
  max-width: 100%;
  overflow: hidden;
  min-height: 13px;
  color: #64748B;
  font-size: 9px;
}

.analytics-chart-bar {
  width: min(22px, 70%);
  max-width: 100%;
  min-height: 3px;
  border-radius: 4px 4px 0 0;
  background: #3B82B6;
  transition: height 180ms ease;
}

.analytics-chart-column small {
  flex-shrink: 0;
  width: max-content;
  max-width: 72px;
  height: 16px;
  overflow: visible;
  color: #94A3B8;
  font-size: 9px;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}

.analytics-summary-track {
  height: 8px;
  margin: 8px 0 14px;
  overflow: hidden;
  border-radius: 8px;
  background: #E5EBEF;
}

.analytics-summary-track span,
.analytics-habit-progress .progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #1D78B5;
  transition: width 180ms ease;
}

.analytics-habit-list {
  display: grid;
  gap: 7px;
}

.analytics-habit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 11px;
  border: 1px solid #E1E7EB;
  border-radius: 6px;
  background: #FFFFFF;
}

.analytics-habit-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.analytics-habit-copy strong {
  overflow: hidden;
  color: #334155;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analytics-habit-copy span,
.analytics-habit-progress strong,
.analytics-empty {
  color: #94A3B8;
  font-size: 11px;
}

.analytics-habit-progress {
  display: flex;
  align-items: center;
  gap: 9px;
  width: min(42%, 230px);
  flex-shrink: 0;
}

.analytics-habit-progress .progress-track {
  flex: 1;
}

.analytics-habit-progress strong {
  width: 34px;
  color: #1D78B5;
  text-align: right;
}

.analytics-empty {
  margin: 0;
}

.tracker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.habit-analytics .tracker-header {
  margin-bottom: 0;
}

.habit-analytics .analytics-controls {
  margin-bottom: 0;
}

.tracker-header h2 {
  color: #1F2937;
  font-size: 18px;
  font-weight: 700;
}

.tracker-header p {
  margin-top: 2px;
  color: #94A3B8;
  font-size: 12px;
}

.tracker-edit-button {
  padding: 7px 12px;
  border: 1px solid #B8D4E5;
  border-radius: 5px;
  background: #FFFFFF;
  color: #1F5F8B;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.tracker-edit-button:hover {
  border-color: #4F8BB8;
  background: #EEF7FC;
}

.tracker-count {
  padding: 6px 9px;
  border-radius: 12px;
  background: #E8EEF2;
  color: #3776AF;
  font-size: 11px;
  font-weight: 600;
}

.tracker-days-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(110px, 1fr));
  gap: 10px;
  width: 100%;
  overflow-x: auto;
}

.tracker-day-card {
  min-width: 110px;
  overflow: hidden;
  border: 1px solid #E1E6EA;
  border-radius: 6px;
  background: #FFFFFF;
}

.tracker-day-card .tracker-day-heading {
  min-height: 48px;
  border: 0;
  border-bottom: 1px solid #E1E6EA;
}

.tracker-habit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 35px;
  padding: 5px 7px;
  border-bottom: 1px solid #EEF2F4;
  color: #64748B;
  font-size: 9px;
}

.tracker-habit-row:last-child {
  border-bottom: 0;
}

.tracker-habit-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tracker-habit-row input {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  accent-color: #0078D4;
}

.tracker-day-progress {
  display: grid;
  grid-template-columns: auto auto minmax(24px, 1fr);
  align-items: center;
  gap: 5px;
  padding: 8px 7px;
  border-top: 1px solid #E1E6EA;
  color: #64748B;
  font-size: 9px;
}

.tracker-day-progress strong {
  color: #3776AF;
  font-size: 9px;
  font-weight: 700;
}

.tracker-day-progress .progress-track {
  min-width: 0;
  width: 100%;
}

.month-habit-tracker {
  width: 100%;
  margin-top: 8px;
  padding: 14px 20px;
  border: 1px solid #D9E0E5;
  border-radius: 8px;
  background: #F8FAFB;
}

.month-tracker-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.month-tracker-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0;
  row-gap: 12px;
  min-height: 40px;
  padding: 3px 10px;
  border: 1px solid #E1E6EA;
  border-radius: 6px;
  background: #FFFFFF;
}

.month-tracker-row.today {
  border-color: #4F8BB8;
  background: #EEF7FC;
  box-shadow: inset 3px 0 0 #4F8BB8;
}

.month-tracker-date {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-right: 12px;
  color: #334155;
}

.month-tracker-date strong {
  font-size: 12px;
  white-space: nowrap;
}

.month-tracker-row.today .month-tracker-date strong {
  color: #1F5F8B;
}

.month-tracker-date small {
  color: #94A3B8;
  font-size: 9px;
}

.month-tracker-note {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: 12px;
}

.month-tracker-note-wrap {
  position: relative;
  min-width: 0;
  width: 100%;
  border-radius: 4px;
}

.month-tracker-note-wrap::after {
  position: absolute;
  top: 1px;
  right: 1px;
  bottom: 1px;
  width: 28px;
  pointer-events: none;
  background: linear-gradient(to right, rgb(248 250 251 / 0%), #F8FAFB 85%);
  content: '';
}

.month-tracker-note:focus {
  outline: 0;
  border-color: #8BBDE3;
  background: #F8FAFB;
}

.month-tracker-note:focus + .month-tracker-note-wrap::after,
.month-tracker-note-wrap:focus-within::after {
  background: linear-gradient(to right, rgb(248 250 251 / 0%), #F8FAFB 85%);
}

.month-tracker-note::placeholder {
  color: #A8B3BC;
}

.month-tracker-habits {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 2px 12px;
  min-width: 0;
  width: max-content;
}

.month-tracker-habits .habit-day-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 130px;
  padding: 3px;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #64748B;
  font-size: 10px;
}

.month-tracker-habits .habit-day-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month-tracker-habits .custom-habit-slot:not(.scheduled) {
  border-color: #CBD5E1;
  border-style: dashed;
  background: transparent;
  color: #94A3B8;
  opacity: .65;
  cursor: context-menu;
}

.month-tracker-habits .custom-habit-slot.scheduled {
  cursor: context-menu;
}

.month-tracker-habits input {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  accent-color: #0078D4;
}

.tracker-week {
  display: grid;
  grid-template-columns: minmax(150px, 1.4fr) repeat(7, minmax(48px, 1fr));
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid #E1E6EA;
  border-radius: 6px;
  background: #FFFFFF;
}

.tracker-week-label,
.tracker-day-heading,
.tracker-habit-name,
.tracker-check-cell {
  min-width: 0;
  border-right: 1px solid #E8EDF0;
  border-bottom: 1px solid #E8EDF0;
}

.tracker-week-label {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: #EEF2F4;
  color: #64748B;
  font-size: 10px;
  font-weight: 700;
}

.tracker-day-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  background: #F3F6F8;
}

.tracker-day-heading strong {
  color: #475569;
  font-size: 10px;
}

.tracker-day-heading small {
  margin-top: 2px;
  color: #94A3B8;
  font-size: 9px;
}

.tracker-habit-name {
  display: flex;
  align-items: center;
  min-height: 38px;
  padding: 7px 10px;
  overflow: hidden;
  color: #475569;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tracker-check-cell {
  display: grid;
  min-height: 38px;
  place-items: center;
  cursor: pointer;
}

.tracker-check-cell:hover {
  background: #F1F7FB;
}

.tracker-check-cell input {
  width: 15px;
  height: 15px;
  accent-color: #0078D4;
}

.tracker-week > :nth-last-child(-n + 8) {
  border-bottom: 0;
}

.tracker-week > :nth-child(8n) {
  border-right: 0;
}

.timeline-view {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  margin-top: 20px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 74px 12px minmax(0, 1fr);
  gap: 8px;
  min-height: 74px;
}

.timeline-date {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-top: 13px;
  text-align: right;
}

.timeline-date strong {
  color: #334155;
  font-size: 11px;
  white-space: nowrap;
}

.timeline-date span {
  margin-top: 3px;
  color: #A8B3BC;
  font-size: 9px;
}

.timeline-rail {
  position: relative;
  display: flex;
  justify-content: center;
  padding-top: 17px;
}

.timeline-rail::before {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #D9E0E5;
  content: '';
}

.timeline-item:first-child .timeline-rail::before {
  top: 17px;
}

.timeline-item:last-child .timeline-rail::before {
  bottom: auto;
  height: 17px;
}

.timeline-dot {
  position: relative;
  z-index: 1;
  width: 10px;
  height: 10px;
  border: 2px solid #F8FAFB;
  border-radius: 50%;
}

.timeline-task {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 96px;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 56px;
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid #E1E6EA;
  border-radius: 7px;
  background: #F8FAFB;
}

.timeline-task-description,
.timeline-task-due,
.timeline-task-status {
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: 12px;
  outline: 0;
}

.timeline-task .priority-picker,
.timeline-task .priority-badge {
  width: 96px;
}

.timeline-task .priority-picker {
  grid-column: 3;
  grid-row: 1;
}

.timeline-task-description {
  padding: 8px 0;
}

.timeline-task-due,
.timeline-task-status {
  grid-row: 2;
  color: #3776AF;
  font-size: 10px;
}

.timeline-task-due {
  grid-column: 2;
  width: 90px;
  padding: 5px 0;
  text-align: left;
}

.timeline-task-due::-webkit-calendar-picker-indicator {
  margin-left: 0;
  padding: 0;
}

.timeline-task-status {
  grid-column: 3;
  padding: 5px 4px;
  border-radius: 10px;
  background: #E6F0F9;
  text-align: right;
}

.timeline-task-due {
  cursor: pointer;
}

.timeline-task-description:focus,
.timeline-task-due:focus,
.timeline-task-status:focus {
  outline: 1px solid #8BBDE3;
  outline-offset: 2px;
}

.timeline-item.completed .timeline-task-description {
  color: #94A3B8;
}

.timeline-empty {
  padding: 36px 16px;
  border: 1px dashed #D9E0E5;
  border-radius: 7px;
  color: #94A3B8;
  font-size: 12px;
  text-align: center;
}

.priority-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  margin-top: 20px;
}

.priority-column {
  min-width: 0;
  min-height: 260px;
  padding: 10px;
  border: 1px solid #D9E0E5;
  border-radius: 7px;
  background: #F1F4F6;
}

.priority-column-high {
  border-top: 4px solid #C85B58;
}

.priority-column-medium {
  border-top: 4px solid #D29A2E;
}

.priority-column-low {
  border-top: 4px solid #4D9B7B;
}

.priority-column-high h2 {
  color: #B34D4A;
}

.priority-column-medium h2 {
  color: #A87518;
}

.priority-column-low h2 {
  color: #3D8067;
}

.priority-column h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
  color: #334155;
  font-size: 12px;
}

.priority-column h2 span {
  color: #94A3B8;
  font-size: 10px;
  font-weight: 500;
}

.priority-task {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  gap: 6px;
  align-items: center;
  margin-top: 7px;
  padding: 8px;
  border: 1px solid #E1E6EA;
  border-radius: 5px;
  background: #FFFFFF;
}

.priority-column-high .priority-task {
  border-left: 3px solid #C85B58;
}

.priority-column-medium .priority-task {
  border-left: 3px solid #D29A2E;
}

.priority-column-low .priority-task {
  border-left: 3px solid #4D9B7B;
}

.priority-task-description,
.priority-task-due,
.priority-task-status {
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 11px;
  outline: 0;
}

.priority-task-description {
  grid-column: 2;
}

.priority-task-description::placeholder,
.priority-task-due::placeholder {
  color: #A8B3BC;
}

.priority-task-due,
.priority-task-status {
  padding-top: 3px;
  color: #3776AF;
  font-size: 10px;
}

.priority-task-due {
  grid-column: 2;
  grid-row: 2;
  width: max-content;
  max-width: 100%;
  cursor: pointer;
}

.priority-task-status {
  grid-column: 3;
  grid-row: 1;
  width: max-content;
  max-width: 100%;
  justify-self: end;
  color: #64748B;
}

.priority-task.completed .priority-task-description {
  color: #94A3B8;
  text-decoration: line-through;
}

.task-row {
  display: grid;
  grid-template-columns: 24px minmax(160px, 1fr) 130px 100px 110px;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 12px;
  border: 1px solid #E1E6EA;
  border-radius: 7px;
  background: #F8FAFB;
  cursor: pointer;
}

.task-row:focus-within {
  border-color: #8BBDE3;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, .1);
}

.task-check {
  width: 17px;
  height: 17px;
  accent-color: #0078D4;
}

.priority-task,
.timeline-item {
  cursor: pointer;
}

.task-description,
.task-priority,
.task-date {
  min-width: 0;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: 13px;
}

.task-name-button {
  text-align: left;
  cursor: pointer;
  appearance: none;
}

.priority-badge {
  display: block;
  width: 130px;
  padding: 5px 7px;
  border: 0;
  border-radius: 4px;
  color: #FFFFFF;
  font-size: 11px;
  cursor: pointer;
  outline: none;
  appearance: none;
}

.priority-picker {
  position: relative;
  width: 130px;
}

.priority-options {
  position: absolute;
  z-index: 10;
  top: calc(100% + 4px);
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 130px;
  padding: 4px;
  border: 1px solid #D9E0E5;
  border-radius: 5px;
  background: #FFFFFF;
  box-shadow: 0 6px 14px rgba(15, 23, 42, .14);
}

.priority-options button {
  width: 100%;
  padding: 5px 7px;
  border: 0;
  border-radius: 3px;
  color: #FFFFFF;
  text-align: left;
  font-size: 10px;
  cursor: pointer;
}

.priority-options button:hover {
  filter: brightness(.92);
}

.priority-badge:focus,
.priority-badge:active {
  outline: none;
  box-shadow: none;
}

.priority-badge option {
  background: #FFFFFF;
  color: #334155;
}

.priority-badge option.priority-option-low {
  background: #4D9B7B;
  color: #FFFFFF;
}

.priority-badge option.priority-option-medium {
  background: #D29A2E;
  color: #FFFFFF;
}

.priority-badge option.priority-option-high {
  background: #C85B58;
  color: #FFFFFF;
}

.priority-badge option:checked {
  background: inherit;
  color: #FFFFFF;
}

.priority-low {
  background: #4D9B7B;
}

.priority-medium {
  background: #D29A2E;
}

.priority-high {
  background: #C85B58;
}

.task-due {
  width: 90px;
  padding: 5px 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #3776AF;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.task-due::-webkit-calendar-picker-indicator {
  margin-left: 0;
  padding: 0;
}

.task-due:focus {
  border-color: #CBD5DC;
  outline: 0;
  background: #FFFFFF;
}

.task-status {
  width: 110px;
  padding: 5px 6px;
  border: 0;
  border-radius: 12px;
  background: #E6F0F9;
  color: #3776AF;
  font: inherit;
  font-size: 10px;
}

.task-description::placeholder {
  color: #A8B3BC;
}

.task-description:focus,
.task-priority:focus,
.task-date:focus {
  border-color: #CBD5DC;
  outline: 0;
  background: #FFFFFF;
}

.task-priority,
.task-date {
  color: #64748B;
  font-size: 12px;
}

.task-row.completed .task-description {
  color: #94A3B8;
  text-decoration: line-through;
}

@media (max-width: 800px) {
  .priority-columns {
    grid-template-columns: 1fr;
  }

  .task-row {
    grid-template-columns: 24px minmax(0, 1fr);
  }

  .task-row .priority-picker,
  .task-due,
  .task-status {
    grid-column: 2 / -1;
    width: 100%;
  }

  .task-row .priority-picker,
  .task-row .priority-badge,
  .task-row .priority-options {
    width: 100%;
  }
}

.planner-inspector {
  background: #F1F4F6;
}

.habits-card {
  position: relative;
  padding: 0;
  border: 1px solid #D9E0E5;
  border-radius: 7px;
  background: #FFFFFF;
  color: #334155;
  font-size: 11px;
}

.habits-title {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 46px;
  margin: 0;
  padding: 0 14px;
  border-bottom: 1px solid #D9E0E5;
  border-radius: 6px 6px 0 0;
  background: #E8EEF2;
  color: #1F2937;
  font-size: 15px;
  font-weight: 700;
}

.habits-icon {
  color: #64748B;
  font-size: 14px;
}

.habits-settings-button {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: #64748B;
  letter-spacing: 1px;
  cursor: pointer;
}

.habits-settings-button:hover {
  color: #1F2937;
}

[data-theme='dark'] .habits-settings-button {
  color: #9AAAB5;
}

[data-theme='dark'] .habits-settings-button:hover {
  color: #E5EDF2;
}

.habits-settings-menu {
  position: absolute;
  z-index: 3;
  top: 42px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 145px;
  padding: 7px;
  border: 1px solid #D9E0E5;
  border-radius: 6px;
  background: #FFFFFF;
  box-shadow: 0 6px 16px rgba(15, 23, 42, .14);
  color: #475569;
  font-size: 11px;
}

[data-theme='dark'] .habits-settings-menu {
  border-color: #34424D;
  background: #202B34;
  box-shadow: 0 6px 16px rgba(0, 0, 0, .45);
  color: #E5EDF2;
}

.habits-settings-menu label,
.habits-settings-menu button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.habits-settings-menu label:hover,
.habits-settings-menu button:hover {
  background: #F1F4F6;
}

[data-theme='dark'] .habits-settings-menu label:hover,
[data-theme='dark'] .habits-settings-menu button:hover {
  background: #2A3A45;
  color: #FFFFFF;
}

.habits-settings-menu input {
  margin: 0;
  accent-color: #0078D4;
}

.habit-name-input {
  min-width: 0;
  flex: 1;
  padding: 3px 5px;
  border: 1px solid #CBD5DC;
  border-radius: 3px;
  background: #FFFFFF;
  color: #475569;
  font: inherit;
  font-size: 10px;
}

[data-theme='dark'] .habit-name-input {
  border-color: #34424D;
  background: #1B232B;
  color: #E5EDF2;
}

.delete-habit-button {
  padding: 0 3px;
  border: 0;
  background: transparent;
  color: #94A3B8;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.delete-habit-button:hover {
  color: #DC2626;
}

[data-theme='dark'] .delete-habit-button {
  color: #9AAAB5;
}

[data-theme='dark'] .delete-habit-button:hover {
  color: #F87171;
}

.edit-habits-actions {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-top: 0;
  padding: 0 14px 12px;
}

.edit-habits-actions button {
  padding: 5px 7px;
  border: 1px solid #D9E0E5;
  border-radius: 4px;
  background: #FFFFFF;
  color: #475569;
  font-size: 10px;
  cursor: pointer;
}

[data-theme='dark'] .edit-habits-actions button {
  border-color: #34424D;
  background: #202B34;
  color: #E5EDF2;
}

.edit-habits-actions button:last-child {
  background: #0078D4;
  border-color: #0078D4;
  color: #FFFFFF;
}

[data-theme='dark'] .edit-habits-actions button:last-child {
  border-color: #1687D2;
  background: #1687D2;
  color: #FFFFFF;
}

.habits-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #64748B;
}

.list-chip {
  padding: 4px 8px;
  border-radius: 12px;
  background: #EEF2F4;
  color: #475569;
}

.habits-actions {
  margin-left: auto;
  white-space: nowrap;
}

.new-habit-button {
  padding: 4px 8px;
  border: 0;
  border-radius: 4px;
  background: #0078D4;
  color: #FFFFFF;
  font-size: 11px;
  cursor: pointer;
}

.habit-list {
  padding: 12px 14px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.habit-list-title {
  margin-bottom: 9px;
  color: #64748B;
  font-size: 10px;
  font-weight: 600;
}

.habit-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 19px;
  color: #475569;
  cursor: pointer;
}

.habit-row input {
  width: 12px;
  height: 12px;
  margin: 0;
  accent-color: #0078D4;
}

.habit-progress {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 11px;
  padding-top: 10px;
  border-top: 1px solid #E8EDF1;
  color: #64748B;
  font-size: 9px;
}

.progress-track {
  flex: 1;
  height: 4px;
  overflow: hidden;
  border-radius: 3px;
  background: #DCE5EA;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0078D4;
  transition: width .2s ease;
}

.new-page-button {
  width: 100%;
  margin-top: 9px;
  padding: 8px;
  border: 1px solid #D9E0E5;
  border-radius: 5px;
  background: transparent;
  color: #64748B;
  font-size: 11px;
  cursor: pointer;
}

.new-page-button:hover {
  background: #F1F4F6;
  color: #334155;
}

.spotify-card {
  margin-top: 14px;
  padding: 11px;
  border: 1px solid #D9E0E5;
  border-radius: 7px;
  background: #FFFFFF;
  color: #334155;
  font-size: 11px;
}

.spotify-player {
  padding: 8px;
  border-radius: 6px;
}

.spotify-header,
.spotify-now-playing,
.spotify-progress,
.spotify-controls {
  display: flex;
  align-items: center;
}

.spotify-header {
  gap: 7px;
  margin-bottom: 12px;
  color: #1F2937;
  font-size: 13px;
}

.spotify-logo {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 50%;
  background: #0078D4;
  color: #FFFFFF;
  font-size: 10px;
}

.spotify-more {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: #94A3B8;
  cursor: pointer;
}

.spotify-now-playing {
  gap: 9px;
}

.album-art {
  display: grid;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 5px;
  background: linear-gradient(135deg, #0078D4, #0B4E85);
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 700;
}

.track-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.track-copy > span {
  color: #94A3B8;
  font-size: 9px;
  text-transform: uppercase;
}

.track-copy strong,
.track-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-copy strong {
  color: #1F2937;
  font-size: 12px;
}

.track-copy small {
  color: #64748B;
  font-size: 10px;
}

.spotify-progress {
  gap: 6px;
  margin-top: 12px;
  color: #94A3B8;
  font-size: 9px;
}

.spotify-track {
  height: 4px;
}

.spotify-track span {
  background: #0078D4;
}

.spotify-controls {
  justify-content: center;
  gap: 18px;
  margin: 8px 0 10px;
}

.spotify-controls button {
  border: 0;
  background: transparent;
  color: #64748B;
  font-size: 14px;
  cursor: pointer;
}

.spotify-controls button:hover {
  color: #0078D4;
}

.spotify-controls .play-button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #0078D4;
  color: #FFFFFF;
  font-size: 13px;
}

.spotify-controls .play-button:hover {
  color: #FFFFFF;
  background: #006CBF;
}

.spotify-playlist {
  border-top: 1px solid #EEF2F4;
  padding-top: 5px;
}

.spotify-track-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  padding: 6px 3px;
  border: 0;
  background: transparent;
  color: #94A3B8;
  text-align: left;
  font-size: 9px;
  cursor: pointer;
}

.spotify-track-row:hover,
.spotify-track-row.active {
  color: #0078D4;
}

.playlist-track-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.playlist-track-copy strong,
.playlist-track-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-track-copy strong {
  color: #475569;
  font-size: 10px;
  font-weight: 600;
}

.spotify-track-row.active .playlist-track-copy strong {
  color: #0078D4;
}

.playlist-track-copy small {
  color: #94A3B8;
  font-size: 9px;
}

.panel-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  margin-bottom: 32px;
  border-radius: 8px;
  background: #1F2937;
  color: #FFFFFF;
  font-size: 15px;
  font-weight: 700;
}

.panel-line {
  width: 100%;
  height: 8px;
  margin-bottom: 16px;
  border-radius: 4px;
  background: #D7DEE4;
}

.panel-line.short {
  width: 62%;
}

.planner-main-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.title-line {
  width: 28%;
  height: 14px;
  background: #B7C1CA;
}

.date-line {
  width: 14%;
}

.planner-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(90px, 1fr));
  min-height: 440px;
  border-top: 1px solid #E1E6EA;
  border-left: 1px solid #E1E6EA;
}

.planner-day {
  min-width: 0;
  border-right: 1px solid #E1E6EA;
}

.day-heading {
  height: 38px;
  border-bottom: 1px solid #E1E6EA;
  background: #F3F6F8;
}

.day-slot {
  height: 94px;
  border-bottom: 1px solid #E8EDF0;
}

.inspector-block {
  height: 96px;
  margin-top: 28px;
  border-radius: 8px;
  background: #E0E6EA;
}

.inspector-block.small {
  height: 54px;
  margin-top: 16px;
}

@media (max-width: 800px) {
  .planner-page {
    height: 100dvh;
  }

  .planner-background {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    overflow-x: hidden;
    overflow-y: auto;
    background: #E6EBEF;
    overscroll-behavior: contain;
  }

  .planner-panel {
    width: 100%;
    padding: 0;
  }

  .planner-main {
    display: contents;
  }

  .planner-inspector {
    display: contents;
  }

  .tasks-panel {
    order: 1;
    padding: 14px;
  }

  .read-aloud-module {
    order: 2;
    padding: 14px;
  }

  .read-aloud-controls {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .read-aloud-controls label,
  .read-aloud-rate-field {
    flex: 1 1 140px;
  }

  .read-aloud-voice-field {
    min-width: 180px !important;
  }

  .read-aloud-actions {
    flex-wrap: wrap;
  }

  .read-aloud-actions small {
    width: 100%;
    margin-left: 0;
  }

  .habits-card {
    order: 2;
  }

  .habit-tracker {
    order: 3;
    margin-top: 0;
    padding: 14px;
  }

  .month-habit-tracker {
    order: 4;
    margin-top: 0;
    padding: 14px;
  }

  .habit-analytics {
    order: 5;
    margin-top: 0;
    padding: 14px;
  }

  .analytics-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .planner-sidebar {
    order: 6;
    padding: 18px 16px;
    border: 1px solid #D9E0E5;
    border-radius: 8px;
    background: #F8FAFB;
  }

  .spotify-card {
    order: 7;
    margin-top: 0;
  }

  .spotify-controls button {
    width: 44px;
    height: 44px;
  }

  .spotify-controls .play-button {
    width: 48px;
    height: 48px;
  }

  .tasks-header,
  .tracker-header {
    gap: 12px;
  }

  .tasks-header h1,
  .tracker-header h2 {
    font-size: 16px;
  }

  .add-task-button,
  .tracker-edit-button {
    min-height: 40px;
    flex-shrink: 0;
  }

  .task-toolbar {
    gap: 4px;
    margin: 4px -4px 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .task-toolbar::-webkit-scrollbar {
    display: none;
  }

  .task-filter {
    min-height: 40px;
    flex-shrink: 0;
    padding-inline: 10px;
  }

  .task-toolbar-actions {
    display: none;
  }

  .task-row {
    gap: 8px 10px;
    padding: 10px;
  }

  .task-description {
    width: 100%;
    font-size: 14px;
  }

  .task-due,
  .task-status,
  .priority-badge {
    min-height: 38px;
    font-size: 12px;
  }

  .priority-options button {
    min-height: 38px;
  }

  .priority-column {
    min-height: 0;
  }

  .priority-task {
    min-height: 72px;
  }

  .timeline-item {
    grid-template-columns: 56px 10px minmax(0, 1fr);
    gap: 6px;
  }

  .timeline-task {
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 7px;
  }

  .timeline-task .priority-picker,
  .timeline-task .priority-badge,
  .timeline-task .priority-options {
    width: 100%;
  }

  .timeline-task .priority-picker,
  .timeline-task-due,
  .timeline-task-status {
    grid-column: 2;
    grid-row: auto;
    width: 100%;
  }

  .timeline-task-status {
    min-height: 36px;
    text-align: left;
  }

  .tracker-days-grid {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(140px, 72vw);
    gap: 8px;
    padding-bottom: 6px;
    scroll-snap-type: x proximity;
  }

  .tracker-day-card {
    min-width: 0;
    scroll-snap-align: start;
  }

  .tracker-habit-row {
    min-height: 40px;
    font-size: 11px;
  }

  .tracker-habit-row input,
  .month-tracker-habits input,
  .habit-row input {
    width: 18px;
    height: 18px;
  }

  .month-tracker-list {
    gap: 8px;
  }

  .month-tracker-row {
    grid-template-columns: 58px minmax(0, 1fr);
    gap: 8px;
    padding: 10px;
  }

  .month-tracker-note {
    min-height: 40px;
    padding: 8px;
    font-size: 16px;
  }

  .month-tracker-habits {
    grid-column: 1 / -1;
    justify-content: flex-start;
    gap: 12px;
    width: 100%;
    padding-top: 4px;
    overflow-x: auto;
  }

  .month-tracker-habits .habit-day-item {
    min-width: 64px;
    min-height: 42px;
    flex-shrink: 0;
    justify-content: flex-end;
  }

  .habit-row {
    min-height: 36px;
    font-size: 13px;
  }

  .habit-name-input,
  .habit-editor-input {
    min-height: 40px;
    font-size: 16px;
  }

  .habit-editor-main {
    grid-template-columns: 1fr;
  }

  .habit-visibility-options {
    width: 100%;
  }

  .habit-visibility-pill {
    flex: 1;
    min-height: 40px;
    font-size: 14px;
  }

  .habit-repeat-field select {
    min-height: 44px;
    font-size: 16px;
  }

  .habits-settings-button,
  .delete-habit-button {
    min-width: 40px;
    min-height: 40px;
  }

  .habits-settings-menu {
    right: 8px;
    min-width: 180px;
  }

  .habits-settings-menu label,
  .habits-settings-menu button,
  .edit-habits-actions button {
    min-height: 40px;
  }

  .calendar-header {
    margin-top: 22px;
  }

  .calendar-arrow {
    width: 40px;
    height: 40px;
  }

  .calendar-grid > button {
    min-height: 38px;
    aspect-ratio: auto;
  }

  .brain-dump-textarea {
    min-height: 150px;
    font-size: 16px;
  }

  .task-modal-backdrop {
    align-items: end;
    padding: 0;
  }

  .task-modal {
    width: 100%;
    max-height: 92dvh;
    padding: 24px 18px calc(18px + env(safe-area-inset-bottom));
    overflow-y: auto;
    border-radius: 12px 12px 0 0;
  }

  .task-modal-fields {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .task-modal-field input,
  .task-modal-field select {
    min-height: 44px;
    font-size: 16px;
  }

  .task-modal-save {
    min-height: 44px;
  }

  .habit-editor-actions {
    position: sticky;
    bottom: 0;
    padding-top: 12px;
    background: #FFFFFF;
  }

  .planner-grid {
    min-width: 630px;
  }
}
</style>

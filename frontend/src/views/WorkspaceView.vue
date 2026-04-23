<template>
  <div class="workspace-view">
    <TopBar />
    <div class="workspace-content">
      <Toolbar />
      <Canvas />
      <StagingSidebar />
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '../store/workspace'
import TopBar from '../components/TopBar.vue'
import Toolbar from '../components/Toolbar.vue'
import Canvas from '../components/Canvas.vue'
import StagingSidebar from '../components/StagingSidebar.vue'

const route = useRoute()
const store = useWorkspaceStore()

async function initBoard(boardId) {
  store.setCurrentBoard(boardId)
  // Load ancestor boards for breadcrumb navigation (when directly opening a board URL)
  await store.loadBoardAncestors(boardId)
  await store.loadBoardData(boardId)
}

onMounted(() => {
  const boardId = route.params.id || 'root'
  initBoard(boardId)
})

watch(() => route.params.id, (newId) => {
  if (newId) {
    initBoard(newId)
  }
})
</script>

<style scoped>
.workspace-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.workspace-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
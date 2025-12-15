<template>
  <div>
    <h2>作业区域放大图</h2>
    <div v-if="field">
      <pre>{{ field }}</pre>
      <pre>{{ terrainData }}</pre>
      <pre>{{ comprehensiveMatrix }}</pre>
      <pre>{{ contourLines }}</pre>
    </div>
    <div v-else>
      <el-alert title="未获取到地块信息，请先在地图上绘制区域并点击规划区域" type="warning" show-icon />
    </div>
    <h2>无人机列表</h2>
    <ul>
      <li v-for="drone in droneList" :key="drone.id">{{ drone.name }}</li>
    </ul>
    <h2>作业数据</h2>
    <pre>{{ workData }}</pre>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'AssignPlan',
  computed: {
    ...mapState([
      'field', 'terrainData', 'comprehensiveMatrix', 'contourLines', 'droneList', 'workData'
    ]),
    // 调试：每次数据变化时输出
    debugField() {
      console.log('[AssignPlan] computed field:', this.field)
      return this.field
    },
    debugTerrainData() {
      console.log('[AssignPlan] computed terrainData:', this.terrainData)
      return this.terrainData
    },
    debugComprehensiveMatrix() {
      console.log('[AssignPlan] computed comprehensiveMatrix:', this.comprehensiveMatrix)
      return this.comprehensiveMatrix
    },
    debugContourLines() {
      console.log('[AssignPlan] computed contourLines:', this.contourLines)
      return this.contourLines
    }
  },
  created() {
    console.log('[AssignPlan] 页面created，store内容：', this.$store.state)
    this.$store.dispatch('fetchDroneList')
    this.$store.dispatch('fetchWorkData')
    // 输出初始数据
    console.log('[AssignPlan] created field:', this.field)
    console.log('[AssignPlan] created terrainData:', this.terrainData)
    console.log('[AssignPlan] created comprehensiveMatrix:', this.comprehensiveMatrix)
    console.log('[AssignPlan] created contourLines:', this.contourLines)
  }
}
</script>

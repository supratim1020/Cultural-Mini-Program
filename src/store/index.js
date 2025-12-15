import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    // 区域相关
    field: null,              // 地块多边形
    terrainData: null,        // 地势分析数据
    comprehensiveMatrix: null,// 综合矩阵
    contourLines: [],         // 等高线
    // 无人机和作业相关
    droneList: [],
    workData: []
  },
  mutations: {
    setRegionData(state, payload) {
      state.field = payload.field
      state.terrainData = payload.terrainData
      state.comprehensiveMatrix = payload.comprehensiveMatrix
      state.contourLines = payload.contourLines
    },
    setDroneList(state, list) {
      state.droneList = list
    },
    setWorkData(state, data) {
      state.workData = data
    }
  },
  actions: {
    async fetchDroneList({ commit }) {
      const res = await fetch('http://localhost:5000/api/drones/list')
      const result = await res.json()
      if (result.code === 0) {
        commit('setDroneList', result.data)
      }
    },
    async fetchWorkData({ commit }) {
      // 这里的接口请根据你的后端实际接口调整
      const res = await fetch('http://localhost:5000/api/your_work_data_api')
      const result = await res.json()
      if (result.code === 0) {
        commit('setWorkData', result.data)
      }
    }
  }
})

<template>
  <div class="history-query-container">
    <!-- 初始状态 -->
    <template v-if="!showDetail">
      <button class="query-button" @click="goToHistoryQuery()">
        历史作业查询
      </button>
    </template>

    <!-- 点击后状态（可扩展内容） -->

  </div>
</template>

<script>
export default {
  name: 'HistoryQuery',
  data() {
    return {
      showDetail: false
    };
  },
  methods: {
    goToHistoryQuery() {
      // 这里可以添加跳转逻辑或显示详细内容
      // this.showDetail = true;
      // 或者跳转到具体页面
      this.$router.push('/query');
    }
  }
};
</script>

<style scoped>
.history-query-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-image: url('../assets/all_circle1.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.query-button {
  padding: 12px 24px;
  margin: 10px;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  background-color: #2196F3;
  color: white;
  font-size: 22px;
  letter-spacing: 1px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.query-button:hover {
  background-color: #1976D2;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
}

/* 可扩展的详细内容样式 */
.detail-content {
  color: white;
  text-align: center;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  margin: 15px;
  width: 80%;
}
</style>
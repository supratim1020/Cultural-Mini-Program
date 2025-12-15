<template>
  <div class="spray-container">
    <!-- 初始状态 -->
    <template v-if="!showDetail">
      <button class="analysis-button" @click="goToRecycle()">
        未检出虫类分析
      </button>
    </template>

    <!-- 点击后状态（可扩展内容） -->

  </div>
</template>

<script>
export default {
  name: 'Spray',
  data() {
    return {
      showDetail: false
    };
  },
  methods: {
    goToRecycle() {
      this.$router.push('/recycle');
    }
  }
};
</script>

<style scoped>
.spray-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-image: url('../assets/spray1.png'); /* 修正后的背景图路径 */
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

.analysis-button {
  padding: 12px 24px;
  margin: 10px;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  background-color: #4CAF50;
  color: white;
  font-size: 22px;
  letter-spacing: 1px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.analysis-button:hover {
  background-color: #388E3C;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
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
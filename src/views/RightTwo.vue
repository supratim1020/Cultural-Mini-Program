<template>
  <div class="path-plan-container">
    <!-- 初始状态 -->
    <template v-if="!showDetail">
      <button class="plan-button" @click="goToPathPlan()">
        农药喷洒路径规划
      </button>
    </template>

    <!-- 点击后状态 -->

  </div>
</template>

<script>
export default {
  name: 'PathPlanContainer',
  data() {
    return {
      showDetail: false
    };},
  methods: {
    goToPathPlan() {
      this.$router.push('/path-plan');
    }}


};
</script>

<style scoped>
.path-plan-container {
  position: relative;
  width: 100%; /* 屏幕宽度的1/4 */
  height: 100%; /* 屏幕高度的30% */
  max-width: 100%; /* 确保不超过1/4 */
  max-height: 100%; /* 确保不超过30% */
  background-image: url('../assets/path_plan.jpg');
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

.plan-button, .back-button {
  padding: 10px 20px;
  margin: 5px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.plan-button {
  background-color: #4CAF50;
  color: white;
  font-size: 22px;
}

.plan-button:hover {
  background-color: #45a049;
  transform: scale(1.05);
}

.back-button {
  background-color: #f44336;
  color: white;
  font-size: 14px;
  margin-top: 20px;
}

.back-button:hover {
  background-color: #d32f2f;
  transform: scale(1.05);
}

.detail-content {
  color: white;
  text-align: center;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  margin: 10px;
}
</style>
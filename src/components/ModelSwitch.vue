<template>
  <div class="model-switcher">
    <h3>检测模型切换</h3>
    <div class="button-group">
      <button
        @click="switchModel('model1')"
        :class="{ active: currentModel === 'model1' }"
      >
        水稻检测
      </button>
      <button
        @click="switchModel('model2')"
        :class="{ active: currentModel === 'model2' }"
      >
        病虫害检测
      </button>
      <button
        @click="switchModel('model3')"
        :class="{ active: currentModel === 'model3' }"
      >
        玉米病虫害检测
      </button>
      <button
        @click="switchModel('model4')"
        :class="{ active: currentModel === 'model4' }"
      >
        杂草检测
      </button>
      <button
        @click="switchModel('model5')"
        :class="{ active: currentModel === 'model5' }"
      >
        小麦检测
      </button>
      <button
        @click="switchModel('model6')"
        :class="{ active: currentModel === 'model6' }"
      >
        棉花检测
      </button>
    </div>
    <div class="status-message" v-if="message">
      {{ message }}
    </div>
  </div>
</template>

<script>
import axios from 'axios'  // 新增：导入axios

export default {
  name: 'ModelSwitch',
  data() {
    return {
      currentModel: 'model1',
      message: ''
    }
  },
  methods: {
    async switchModel(modelName) {
      try {
        // 修改：使用相对路径
        const response = await axios.post('/switch_model', {
          model_name: modelName
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.status === 'success') {
          this.currentModel = modelName;
          this.message = `已切换到${this.getModelName(modelName)}模型`;
          setTimeout(() => this.message = '', 2000);
          this.$emit('model-changed', modelName);
        } else {
          this.message = '模型切换失败: ' + (response.data.message || '未知错误');
        }
      } catch (error) {
        console.error('切换模型出错:', error);
        this.message = `切换失败: ${error.response?.data?.message || error.message}`;
      }
    },
    getModelName(modelName) {
      const names = {
        'model1': '水稻病检测',
        'model2': '病虫害检测',
        'model3':'玉米病虫害检测',
        'model4':'杂草检测',
        'model5':'小麦检测',
        'model6':'棉花检测'
      };
      return names[modelName] || modelName;
    }
  }
}
</script>

<style scoped>
.model-switcher {
  margin: 20px 0;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.button-group {
  display: flex;
  gap: 15px;
  margin-top: 10px;
}

button {
  padding: 8px 16px;
  background: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover {
  background: #d0d0d0;
}

button.active {
  background: #4CAF50;
  color: white;
}

.status-message {
  margin-top: 10px;
  color: #4CAF50;
  font-size: 14px;
}
</style>
<template>
  <div class="video-container">
    <img src="/video_feed" alt="实时视频流" class="video-feed" @error="handleImageError" />
    <ModelSwitch @model-changed="handleModelChange" />
    <button @click="startSession" class="control-button start-button" :disabled="isDetecting">开始检测</button>
    <button @click="stopSession" class="control-button stop-button" :disabled="!isDetecting">结束检测</button>
    
    <!-- 错误信息显示 -->
    <div v-if="error" class="error-message">
      <i class="el-icon-warning"></i>
      {{ error }}
    </div>
  </div>
</template>

<script>
import ModelSwitch from './ModelSwitch.vue'

export default {
  name: 'VideoStream',
  components: {
    ModelSwitch
  },
  data() {
    return {
      currentModel: 'model1',
      error: null,
      isDetecting: false,
      sessionId: null,
      gaodeApiKey: 'b9824a931dff18b4dbd6386eaec5ecb1',
      currentLocation: '获取位置中...'
    }
  },
  mounted() {
    this.getLocation();
  },
  methods: {
    async getLocation() {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000
          });
        });
        await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
      } catch (error) {
        console.error('获取位置失败:', error);
        this.currentLocation = '位置获取失败，使用默认位置';
      }
    },

    async reverseGeocode(lat, lng) {
      try {
        const response = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?key=${this.gaodeApiKey}&location=${lng},${lat}&radius=1000&extensions=base`
        );
        const data = await response.json();
        if (data.status === "1" && data.regeocode?.addressComponent) {
          const addr = data.regeocode.addressComponent;
          this.currentLocation = `${addr.province} ${addr.city} ${addr.district}`;
        }
      } catch (error) {
        console.error('逆地理编码失败:', error);
        this.currentLocation = `坐标位置: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    },

    async startSession() {
      try {
        const response = await fetch('/api/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.currentModel,
            location: this.currentLocation,
            area: 0,
            pesticide: 0
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.sessionId = data.session_id;
        this.isDetecting = true;
        this.error = null; // 清除之前的错误
        console.log('检测已启动，会话ID:', this.sessionId);
      } catch (err) {
        console.error('启动检测失败:', err);
        this.error = err.message || '无法启动检测会话，请检查后端服务是否运行';
      }
    },

    async stopSession() {
      if (!this.sessionId) return;

      try {
        const response = await fetch(`/api/session/${this.sessionId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '结束检测失败');
        }
        
        this.isDetecting = false;
        this.sessionId = null;
        console.log('检测已停止');
      } catch (err) {
        console.error('结束检测失败:', err);
        this.error = err.message || '无法结束检测会话';
      }
    },

    handleModelChange(modelName) {
      this.currentModel = modelName;
      console.log(`当前模型已切换至: ${modelName}`);
    },

    handleImageError(e) {
      console.error('视频流加载错误:', e);
      this.error = '无法加载视频流，请检查后端服务';
    }
  }
}
</script>

<style scoped>
.video-container {
  position: relative;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.video-feed {
  width: 100%;
  height: 800px;
  border: 1px solid #ddd;
  background: #000;
}

.control-button {
  position: absolute;
  bottom: 20px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.start-button {
  right: 120px;
  background-color: #4CAF50;
  color: white;
}

.stop-button {
  right: 20px;
  background-color: #f44336;
  color: white;
}

.error-message {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  padding: 12px 16px;
  background-color: rgba(244, 67, 54, 0.9);
  color: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.error-message i {
  margin-right: 8px;
  font-size: 16px;
}
</style>
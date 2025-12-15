<template>
  <div class="diagnos-container">
    <el-button
      class="back-button"
      type="primary"
      plain
      icon="el-icon-arrow-left"
      @click="goBack"
    >
      返回主页
    </el-button>

    <!-- AI分析按钮 -->
    <el-button
      class="ai-analysis-btn"
      type="success"
      size="large"
      icon="el-icon-cpu"
      @click="generateAdvice"
      :disabled="loading"
    >
      {{ loading ? 'AI分析中...' : '开始AI分析' }}
    </el-button>

    <!-- 左侧图表区 -->
    <div class="chart-column">
      <div class="chart-wrapper">
        <div ref="chartContainer" class="chart-box"></div>
      </div>
      <div class="stats-overlay">
        <div class="stats-item">
          <span class="stat-label">实时总数：</span>
          <span class="stat-value">{{ totalDetections }}</span>
        </div>
      </div>
      <!-- 新增：检测时间和已检测类别信息 -->
      <div class="chart-extra-info">
        <div class="detect-time">检测时间：{{ formattedDate }} {{ formattedTime }}</div>
        <div class="detect-categories">
          已检测类别：
          <span v-if="chartData.length === 0">暂无数据</span>
          <span v-else>
            <span v-for="(item, idx) in chartData" :key="item.name">
              {{ getCategoryLabel(item.name) }}<span v-if="idx < chartData.length - 1">，</span>
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- 右侧AI交互区 -->
    <div class="ai-column">
  <div class="ai-container">
    <div class="ai-response">
      <div class="ai-header">
        <img src="../assets/robot.png" class="robot-icon" />
        <h3>害虫防治AI助手</h3>
      </div>
      <div class="ai-content">
        <div v-if="loading" class="loading">
          <i class="el-icon-loading"></i>
          正在分析最新数据...
        </div>
        <div v-else class="diagnosis-result">
          <div class="analysis-time">分析时间：{{ formattedDate }}</div>

          <!-- 修改的建议展示区域 -->
          <div class="advice-container">
            <transition name="advice-fade" mode="out-in">
              <div
                class="advice-content"
                :key="currentAdviceIndex"
              >
                {{ displayedAdvice }}
              </div>
            </transition>
          </div>

          <div v-if="currentVoice !== 'zh-CN' && displayedAdvice !== '等待首次分析...'" class="dialect-preview">
            <div class="dialect-label">
              {{ voiceSettings[currentVoice].name }}版本：
            </div>
            <div class="dialect-text">{{ convertToDialect(displayedAdvice, currentVoice) }}</div>
          </div>

          <div class="ai-controls">
            <el-button
              type="primary"
              size="small"
              @click="generateAdvice"
              :disabled="loading">
              {{ loading ? '分析中...' : '重新分析' }}
            </el-button>
            
            <!-- 语音播报控制 -->
            <div class="voice-controls">
              <el-button
                type="success"
                size="small"
                @click="toggleVoice"
                :disabled="!displayedAdvice || displayedAdvice === '等待首次分析...'">
                <i :class="isSpeaking ? 'el-icon-video-pause' : 'el-icon-video-play'"></i>
                {{ isSpeaking ? '停止播报' : '播放语音' }}
              </el-button>
              
              <!-- 语音设置 -->
              <el-dropdown @command="changeVoice" trigger="click">
                <el-button size="small" type="info">
                  <i class="el-icon-setting"></i>
                  语音设置
                </el-button>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item v-for="(voice, vcn) in voiceSettings" :key="vcn" :command="vcn">
                    {{ voice.name }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  </div>
</template>

<script>
import axios from 'axios';
import * as echarts from 'echarts';

// pest_disease_dict: 英文类别 => 中文类别
const pest_disease_dict = {
  "Cecidomyiidae": "瘿蚊科害虫",
  "Chloropidae": "秆蝇科害虫",
  "Cicadellidae": "叶蝉科害虫",
  "Crambidae": "草螟科害虫",
  "Curculionidae": "象甲科害虫",
  "Delphacidae": "飞虱科害虫",
  "Ephydridae": "水蝇科害虫",
  "Hesperiidae": "弄蝶科害虫",
  "Noctuidae": "夜蛾科害虫",
  "Phlaeothripidae": "管蓟马科害虫",
  "Thripidae": "蓟马科害虫",
  "Blight": "玉米大斑病",
  "brown_spot": "玉米褐斑病",
  "corn_rust": "玉米锈病",
  "corn_smut": "玉米黑粉病",
  "downy_mildew": "玉米霜霉病",
  "grey_leaf_spot": "玉米灰斑病",
  "maize-streak-disease": "玉米条斑病",
  "fall-armyworm-larva": "草地贪夜蛾幼虫",
  "yellow-stem-borer": "黄茎螟成虫",
  "yellow-stem-borer-larva": "黄茎螟幼虫",
  "healthy": "健康玉米植株",
  "BrownSpot": "水稻褐斑病",
  "RiceBlast": "水稻稻瘟病",
  "BacterialBlight": "水稻白叶枯病",
  "Maize": "玉米植株",
  "Weed": "田间杂草",
  "blight": "枯萎病",
  "curl": "卷叶病",
  "grey mildew": "灰霉病",
  "leaf spot": "叶斑病",
  "wilt": "萎蔫病",
  "CrownAndRootRot": "冠根腐病",
  "DSC17": "自定义类别",
  "HealthyWheat": "健康小麦",
  "LeafRust": "叶锈病",
  "PowderyMildew": "白粉病",
  "WheatAphids": "麦蚜",
  "WheatCystNematode": "小麦胞囊线虫病",
  "WheatLooseSmut": "小麦散黑穗病",
  "WheatRedSpider": "小麦红蜘蛛",
  "WheatScab": "小麦赤霉病",
  "WheatSharpEyespot": "小麦尖眼斑病",
  "WheatStalkRot": "小麦茎基腐病",
  "WheatTake-all": "小麦全蚀病"
};

export default {
  name: 'Diagnos',
  data() {
    return {
      displayedAdvice: '等待首次分析...', // 实际显示的建议
      currentAdviceIndex: 0, // 用于过渡动画的key
      adviceQueue: [],       // 建议队列
      updateTimer: null,
      aiAdvice: '',
      totalDetections: 0,
      loading: false,
      chartInstance: null,
      eventSource: null,
      connectionStatus: 'connecting', // connecting/connected/error
      chartData: [],
      statsData: null,
      lastAnalysisTime: 0,
      // 语音播报相关
      isSpeaking: false,
      speechSynthesis: null, // 将不再使用Web Speech API, 但保留以防API失败
      currentVoice: 'x4_yezi', // 默认发音人
      audioPlayer: null, // 用于播放API返回的音频
      isApiLoading: false, // API加载状态
      voiceSettings: {
        'x4_yezi': { name: '普通话' },
        'x3_ziling': { name: '上海话' },
        'x_xiaomei': { name: '广东话' },
        'x2_xiaoqian': { name: '东北话' },
        'x2_xiaorong': { name: '四川话' }
      }
    };
  },
  computed: {
    formattedDate() {
      if (!this.lastAnalysisTime) return '尚未分析';
      const date = new Date(this.lastAnalysisTime);
      return `${date.getFullYear()}年${(date.getMonth()+1).toString().padStart(2,'0')}月${date.getDate().toString().padStart(2,'0')}日`;
    },
    formattedTime() {
    return new Date(this.lastAnalysisTime).toLocaleTimeString()
  },
    statusText() {
      return {
        connecting: '连接数据源中...',
        connected: '实时数据已连接',
        error: '连接断开，正在重试'
      }[this.connectionStatus];
    }
  },
  mounted() {
    this.initChart();
    this.loadStats();
    // 每30秒更新一次统计数据
    this.updateTimer = setInterval(() => {
      this.loadStats();
    }, 30000);
  },
  methods: {
    goBack() {
      this.$router.push({ name: 'index' });
    },
    initChart() {
      this.chartInstance = echarts.init(this.$refs.chartContainer);
      const baseOption = {
        title: {
          text: '实时虫害检测分析',
          left: 'center',
          top: 40,
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: []
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          type: 'bar',
          data: []
        }]
      };
      this.chartInstance.setOption(baseOption);
    },

    async loadStats() {
      try {
        // 从后端获取统计数据，使用/api前缀
        const response = await axios.get('/api/stats');
        const stats = response.data;
        this.statsData = stats;
        this.updateChart(stats);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      }
    },

    updateChart(stats) {
      const categories = Object.keys(stats.class_counts);
      const values = Object.values(stats.class_counts);
   this.totalDetections = stats.total_detections;
      this.chartData = categories.map((name, index) => ({
        name,
        value: values[index],
        label: pest_disease_dict[name] ? `${name}（${pest_disease_dict[name]}）` : name
      }));

      const option = {
        xAxis: { 
          data: categories.map(name => pest_disease_dict[name] ? `${name}（${pest_disease_dict[name]}）` : name)
        },
        series: [{
          data: values.map((value, index) => ({
            value,
            itemStyle: {
              color: this.getChartColor(index)
            }
          }))
        }]
      };

      this.chartInstance.setOption(option);
    },

    getChartColor(index) {
      const colorList = [
        '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107',
        '#FF9800', '#FF5722', '#F44336', '#E91E63'
      ];
      return colorList[index % colorList.length];
    },

    // 新增：类别中英文双语显示
    getCategoryLabel(name) {
      return pest_disease_dict[name] ? `${name}（${pest_disease_dict[name]}）` : name;
    },

    async generateAdvice() {
      // 节流控制：30秒内只执行一次
      const now = Date.now()
      if (now - this.lastAnalysisTime < 30000) {
        console.log('未达30秒间隔，跳过分析')
        return
      }

      if (!this.statsData) return;

      try {
        this.loading = true;
        this.lastAnalysisTime = now;

        const response = await axios.post('http://localhost:3000/api/ai-diagnosis', { chartData: this.chartData }, { timeout: 60000 });
        this.lastAnalysisTime = Date.now();
        console.log('AI分析结果：', response.data.advice);
        this.adviceQueue.push(response.data.advice);
        console.log('adviceQueue:', this.adviceQueue);

        // 立即显示最新建议
        this.showNextAdvice(true);
      } catch (error) {
        this.adviceQueue.push('分析失败：' + error.message);
        this.showNextAdvice(true);
      } finally {
        this.loading = false;
      }
    },

    showNextAdvice(force = false) {
      // force为true时立即显示最新建议
      if (this.updateTimer) {
        clearTimeout(this.updateTimer);
        this.updateTimer = null;
      }
      if (this.adviceQueue.length > 0) {
        this.stopVoice();
        this.displayedAdvice = this.adviceQueue.shift();
        this.currentAdviceIndex++;
        console.log('showNextAdvice 被调用，当前显示：', this.displayedAdvice);
        // 设置10秒后显示下一条建议（如果还有）
        if (this.adviceQueue.length > 0) {
          this.updateTimer = setTimeout(() => {
            this.showNextAdvice();
          }, 10000);
        }
      } else if (force) {
        // 如果强制刷新但队列为空，清空显示
        this.displayedAdvice = '暂无分析结果';
      }
    },

    // 开始语音播报
    async startVoice() {
      if (this.isSpeaking || this.isApiLoading) {
        this.stopVoice();
        return;
      }
      
      if (!this.displayedAdvice || this.displayedAdvice === '等待首次分析...') {
        this.$message.warning('没有可播报的内容');
        return;
      }

      // 只取"爷爷奶奶"及其后内容
      let ttsText = this.displayedAdvice;
      const idx = ttsText.indexOf('爷爷奶奶');
      if (idx !== -1) {
        ttsText = ttsText.slice(idx);
      } else {
        this.$message.warning('内容中不包含"爷爷奶奶"，无法合成');
        return;
      }

      this.isApiLoading = true;
      this.isSpeaking = true;

      try {
        const response = await axios.post('http://localhost:5000/api/xunfei-tts', {
          text: ttsText,
          vcn: this.currentVoice
        }, { timeout: 60000 });

        if (response.data && response.data.audio) {
          const audioBase64 = response.data.audio;
          const audioSrc = `data:audio/mp3;base64,${audioBase64}`;
          
          this.audioPlayer = new Audio(audioSrc);
          this.audioPlayer.play();

          this.audioPlayer.onended = () => {
            this.isSpeaking = false;
          };
          this.audioPlayer.onerror = () => {
            this.$message.error('音频播放失败');
            this.isSpeaking = false;
          };

        } else {
          this.$message.error('语音合成失败，请检查后端服务');
          this.isSpeaking = false;
        }

      } catch (error) {
        console.error('调用TTS API失败:', error);
        this.$message.error('语音服务连接失败');
        this.isSpeaking = false;
      } finally {
        this.isApiLoading = false;
      }
    },

    // 停止语音播报
    stopVoice() {
      if (this.audioPlayer) {
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;
      }
      this.isSpeaking = false;
    },

    // 切换语音设置
    changeVoice(vcn) {
      this.currentVoice = vcn;
      this.$message.success(`已切换到 ${this.voiceSettings[vcn].name}`);
      if (this.isSpeaking) {
        this.stopVoice();
        setTimeout(() => this.startVoice(), 100);
      }
    },

    // 切换语音播报
    toggleVoice() {
      if (this.isSpeaking) {
        this.stopVoice();
      } else {
        this.startVoice();
      }
    },

    // 根据方言设置转换文本
    convertToDialect(text, dialect) {
      const voiceSetting = this.voiceSettings[dialect];
      if (!voiceSetting.dialect) {
        return text; // 如果没有方言设置，返回原文本
      }

      let convertedText = text;

      switch (voiceSetting.dialect) {
        case 'shanxi': // 山西话
          convertedText = this.convertToShanxiDialect(text);
          break;
        case 'sichuan': // 四川话
          convertedText = this.convertToSichuanDialect(text);
          break;
        case 'dongbei': // 东北话
          convertedText = this.convertToDongbeiDialect(text);
          break;
        case 'henan': // 河南话
          convertedText = this.convertToHenanDialect(text);
          break;
        case 'shandong': // 山东话
          convertedText = this.convertToShandongDialect(text);
          break;
        case 'hebei': // 河北话
          convertedText = this.convertToHebeiDialect(text);
          break;
        case 'hunan': // 湖南话
          convertedText = this.convertToHunanDialect(text);
          break;
        case 'jiangxi': // 江西话
          convertedText = this.convertToJiangxiDialect(text);
          break;
        default:
          convertedText = text;
      }

      return convertedText;
    }

  },
  beforeDestroy() {
    if (this.updateTimer) clearTimeout(this.updateTimer)
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
    this.stopVoice(); // 销毁前停止播放
  }
};
</script>
<style scoped>
.back-button {
  position: absolute;
  top: 40px;
  left: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* AI分析按钮样式 */
.ai-analysis-btn {
  position: absolute;
  top: 100px;
  right: 20px;
  z-index: 1000;
  background: linear-gradient(135deg, #67C23A, #85CE61);
  border: none;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
  font-weight: bold;
  font-size: 16px;
  padding: 12px 24px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.ai-analysis-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(103, 194, 58, 0.4);
}

.ai-analysis-btn:disabled {
  background: #C0C4CC;
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.advice-container {
  position: relative;
  margin: 10px 0;
}

.advice-content {
  line-height: 1.6;
  color: #606266;
  white-space: pre-wrap;
  padding-right: 8px;
  position: static;
  width: 100%;
  transition: all 0.3s;
}

.advice-fade-enter-active,
.advice-fade-leave-active {
  transition: all 0.8s ease;
}

.advice-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.advice-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
/* 基础布局 */
.diagnos-container {
  display: flex;
  height: 100vh;
  width:100%;
 
  /* 使用新背景图并添加黑色蒙版 */
  background-image: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('../assets/bj1.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  overflow: hidden;
}

/* 左侧图表区 */
.chart-column {
  flex: 3;
  position: relative;
  padding: 20px;
  background: white;
  box-shadow: 2px 0 8px rgba(0,0,0,0.05);
  backdrop-filter: blur(8px);
}
/* 半透明背景图片叠加 */
.chart-column::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('../assets/bj3.png') no-repeat center center;
  background-size: cover;
  opacity: 0.5;
  z-index: 0;
  pointer-events: none;
}
.chart-column > * {
  position: relative;
  z-index: 1;
}

.chart-wrapper {
  height: 60vh;
  min-height: 400px;
  max-height: 650px;
  position: relative;
  margin: auto;
  width: 95%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-box {
  height: 80%;
  width: 80%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 统计浮动面板 */
.stats-overlay {
  position: absolute;
  top: 30px;
  right: 30px;
  background: rgba(255,255,255,0.9);
  padding: 15px 25px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.stats-item {
  display: flex;
  align-items: baseline;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-right: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #409EFF;
}

/* 新增：检测时间和类别信息样式 */
.chart-extra-info {
  margin-top: 18px;
  padding: 12px 18px;
  background: rgba(255,255,255,0.85);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  font-size: 15px;
  color: #333;
}
.chart-extra-info .detect-time {
  margin-bottom: 6px;
  color: #409EFF;
  font-weight: 500;
}
.chart-extra-info .detect-categories {
  color: #606266;
}

/* 右侧AI交互区 */
.ai-column {
  flex: 2;
  min-width: 450px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #ebeef5;
  backdrop-filter: blur(8px);
}

.ai-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
}

.ai-response {
  background: #f9fafc;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ai-header {
  display: flex;
  align-items: center;
  padding: 40px;
  background: linear-gradient(135deg, #409EFF, #337ecc);
}

.ai-header h3 {
  color: white;
  margin: 0 0 0 15px;
  font-size: 18px;
}

.robot-icon {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.ai-content {
  padding: 20px;
  padding-top: 50px;
  flex-grow: 1;
  overflow-y: auto;
}

.ai-content::-webkit-scrollbar {
  width: 6px;
  background: rgba(0,0,0,0.05);
}

.ai-content::-webkit-scrollbar-thumb {
  background: #409EFF;
  border-radius: 4px;
}

.analysis-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 10px;
}

.ai-controls {
  margin-top: 20px;
  text-align: right;
}

.voice-controls {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
}

.voice-controls .el-button {
  margin-left: 0;
}

.voice-controls .el-button i {
  margin-right: 4px;
}

.loading {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.original-text {
  margin-bottom: 10px;
}

.dialect-preview {
  margin-top: 15px;
  padding: 10px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 6px;
  border-left: 3px solid #409EFF;
}

.dialect-label {
  font-size: 12px;
  color: #409EFF;
  font-weight: bold;
  margin-bottom: 5px;
}

.dialect-text {
  color: #409EFF;
  font-style: italic;
  line-height: 1.5;
}

.diagnosis-result {
  padding-top: 50px;
}

/* 移除旧的装饰 */
.diagnos-container::before,
.diagnos-container::after {
  content: none;
}

/* 移除樱花飘落动画 */
@keyframes sakura-fall {
  0% { transform: translateY(-100%) rotate(0deg); }
  100% { transform: translateY(100vh) rotate(360deg); }
}

/* 移除樱花样式 */
.diagnos-container .sakura {
  display: none;
}
</style>
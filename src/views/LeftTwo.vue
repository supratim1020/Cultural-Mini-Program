<template>
  <div class="chart-container" @click="goToDiagnosPage">
    <div ref="chart" class="chart-box"></div>

    <div class="stats-panel">
      <div class="stat-item">
        <span class="stat-label">总检测数量:</span>
        <span class="stat-value">{{ totalDetections }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">最后更新时间:</span>
        <span class="stat-value">{{ lastUpdate }}</span>
      </div>
      <el-button
        size="small"
        type="danger"
        @click.stop="handleReset"
        class="reset-btn"
      >
        重置统计
      </el-button>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import axios from 'axios';
import { Message } from 'element-ui';

export default {
  name: 'DetectionChart',
  data() {
    return {
      chart: null,
      totalDetections: 0,
      lastUpdate: '-',
      updateTimer: null,
      option: {
        title: {
          text: '虫害检测统计',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: [],
          axisLabel: {
            interval: 0,
            rotate: 30
          }
        },
        yAxis: {
          type: 'value',
          name: '检测数量'
        },
        series: [{
          name: '检测数量',
          type: 'bar',
          data: [],
          itemStyle: {
            color: function(params) {
              const colorList = [
                '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107',
                '#FF9800', '#FF5722', '#F44336', '#E91E63'
              ];
              return colorList[params.dataIndex % colorList.length];
            },
            borderRadius: [5, 5, 0, 0]
          },
          label: {
            show: true,
            position: 'top'
          }
        }],
        animationDuration: 1000
      }
    };
  },
  mounted() {
    this.initChart();
    this.loadCumulativeStats();
    // 每30秒更新一次统计数据
    this.updateTimer = setInterval(() => {
      this.loadCumulativeStats();
    }, 30000);
    window.addEventListener('resize', this.resizeChart);
  },
  beforeDestroy() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    window.removeEventListener('resize', this.resizeChart);
    if (this.chart) {
      this.chart.dispose();
    }
  },
  methods: {
    goToDiagnosPage() {
      this.$router.push('/diagnos');
    },
    initChart() {
      this.chart = echarts.init(this.$refs.chart);
      this.chart.setOption(this.option);
    },
    resizeChart() {
      if (this.chart) {
        this.chart.resize();
      }
    },
    async loadCumulativeStats() {
      try {
        // 从后端获取统计数据，使用/api前缀
        const response = await axios.get('/api/stats');
        const stats = response.data;
        this.updateChart(stats);
      } catch (error) {
        console.error('获取统计数据失败:', error);
        // 如果获取失败，显示空数据
        this.updateChart({
          total_detections: 0,
          class_counts: {},
          last_update: new Date().toISOString()
        });
      }
    },
    updateChart(stats) {
      console.log('收到统计更新:', stats);

      this.totalDetections = stats.total_detections || 0;
      this.lastUpdate = stats.last_update ? new Date(stats.last_update).toLocaleString() : '-';

      const newOption = {
        ...this.option,
        xAxis: {
          ...this.option.xAxis,
          data: Object.keys(stats.class_counts || {})
        },
        series: [{
          ...this.option.series[0],
          data: Object.values(stats.class_counts || {})
        }]
      };

      if (this.chart) {
        this.chart.setOption(newOption, { notMerge: true });
        this.chart.resize();
      }
    },
    async handleReset() {
      try {
        await axios.post('/api/reset_stats');
        Message.success('统计已重置');
        // 重置后重新加载数据
        this.loadCumulativeStats();
      } catch (error) {
        console.error('重置失败:', error);
        this.$message.error('重置统计失败');
      }
    }
  }
};
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 100%; /* 关键设置：视口高度的30% */
  min-height: 300px; /* 设置最小高度避免过小 */
  cursor: pointer;
}
.chart-box {
  width: 100%;
  height: calc(100% - 70px); /* 减去统计面板的高度 */
}
.stats-panel {
    height: 60px; /* 固定统计面板高度 */
  margin-top: 10px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.stat-item {
  margin: 5px 10px;
  display: flex;
  align-items: center;
}

.stat-label {
  font-weight: bold;
  margin-right: 8px;
  color: #555;
}

.stat-value {
  color: #333;
  font-size: 16px;
}

.reset-btn {
  margin-left: auto;
}

@media (max-width: 768px) {
  .stats-panel {
    flex-direction: column;
    align-items: flex-start;
  }

  .reset-btn {
    margin-left: 0;
    margin-top: 10px;
  }
}
</style>
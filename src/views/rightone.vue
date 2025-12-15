<template>
  <dv-border-box-12>
    <div class="weather-container">
      <!-- 仪表容器 -->
      <div class="gauges-row">
        <!-- 风力油量表 -->
        <div class="gauge-container">
          <div class="gauge-title">风力等级</div>
          <div id="wind-gauge" class="gauge-chart"></div>
        </div>

        <!-- 温度计 -->
        <div class="gauge-container">
        <div class="gauge-title">当前温度</div>
          <div id="temp-gauge" class="gauge-chart"></div>
        </div>
      </div>

      <!-- 天气数据展示 -->
      <div class="weather-data">
        <div class="data-item">
          <i class="el-icon-sunny"></i>
          <span>光照强度：{{ weatherData.illuminance }}lux</span>
        </div>
        <div class="flight-status" :class="{ 'can-fly': canFly, 'cannot-fly': !canFly }">
          <i :class="canFly ? 'el-icon-success' : 'el-icon-error'"></i>
          <span>{{ flightStatusText }}</span>
        </div>
      </div>

      <el-dialog
        title="飞行警告"
        :visible.sync="showWarning"
        width="30%"
        center>
        <span>{{ warningMessage }}</span>
        <span slot="footer" class="dialog-footer">
          <el-button type="primary" @click="showWarning = false">确认</el-button>
        </span>
      </el-dialog>
      <el-dialog
  title="飞行许可"
  :visible.sync="showSuccessAlert"
  width="30%"
  center>
  <span>{{ successMessage }}</span>
  <span slot="footer" class="dialog-footer">
    <el-button type="primary" @click="showSuccessAlert = false">确认</el-button>
  </span>
</el-dialog>
    </div>
  </dv-border-box-12>
</template>

<script>
import Charts from '@jiaminghi/charts'
import { markRaw } from 'vue'
export default {
  name: 'WeatherMonitor',
  data() {
    return {
      showSuccessAlert: false,
    successMessage: '当前天气条件允许起飞！',
      weatherData: {
        illuminance: 0,
        temperature: 0,
        windPower: 0
      },
      canFly: false,
      showWarning: false,
      warningMessage: '',
      flightStatusText: '正在获取天气数据...',
      windGauge: markRaw(null),
      tempGauge: markRaw(null),
      gaodeApiKey: 'b9824a931dff18b4dbd6386eaec5ecb1',
      chartsInitialized: false // 添加图表初始化状态标志
    }
  },
  mounted() {
    this.initCharts();
    this.getLocation();
  },
  methods: {
    // 初始化图表 - 添加了更稳定的初始化逻辑
    initCharts() {
      try {
        // 确保DOM元素存在
        if (!document.getElementById('wind-gauge') || !document.getElementById('temp-gauge')) {
          setTimeout(() => this.initCharts(), 100);
          return;
        }

        this.windGauge = new Charts(document.getElementById('wind-gauge'));
        this.tempGauge = new Charts(document.getElementById('temp-gauge'));

        const initOption = {
          animation: false, // 禁用初始动画
          title: { show: false },
          series: [{
            type: 'gauge',
            min: 0,
            max: 12,
            axisLabel: { show: true },
            detail: { show: true },
            pointer: { show: true },
            animation: false
          }]
        };

        this.windGauge.setOption({
          ...initOption,

          series: [{
            ...initOption.series[0],
            data: [{ name: '风力', value: 0 }],
            axisLabel: { formatter: '{value}级' },
            color: ['#37a2da']
          }]
        });

        this.tempGauge.setOption({
          ...initOption,

          series: [{
            ...initOption.series[0],
            min: -20,
            max: 50,
            data: [{ name: '温度', value: 0 }],
            axisLabel: { formatter: '{value}°C' },
            color: ['#ff6384']
          }]
        });

        this.chartsInitialized = true;
      } catch (error) {
        console.error('图表初始化失败:', error);
        setTimeout(() => this.initCharts(), 500);
      }
    },

    // 获取地理位置
    async getLocation() {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async position => {
              await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
            },
            async error => {
              console.error('获取位置失败:', error);
              // 默认中北大学坐标);
            }
          );
        } else {
          await this.reverseGeocode(38.0189, 112.4436);
        }
      } catch (error) {
        console.error('定位流程错误:', error);
        this.handleWeatherError();
      }
    },

    // 高德逆地理编码API获取城市编码
    async reverseGeocode(lat, lng) {
      try {
        const response = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?key=${this.gaodeApiKey}&location=${lng},${lat}&radius=1000&extensions=base`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== "1" || !data.regeocode?.addressComponent) {
          throw new Error("高德逆地理编码数据格式无效");
        }

        // 获取城市编码后调用天气API
        const cityCode = data.regeocode.addressComponent.adcode;
        await this.fetchGaodeWeatherData(cityCode);
      } catch (error) {
        console.error('逆地理编码失败:', error);
        // 失败后尝试直接使用坐标获取天气
        await this.fetchGaodeWeatherByCoords(lat, lng);
      }
    },

    // 使用城市编码获取天气
    async fetchGaodeWeatherData(cityCode) {
      try {
        const response = await fetch(
          `https://restapi.amap.com/v3/weather/weatherInfo?key=${this.gaodeApiKey}&city=${cityCode}&extensions=base`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== "1" || !data.lives?.length) {
          throw new Error("高德天气数据格式无效");
        }

        const weatherInfo = data.lives[0];
        this.processWeatherData(weatherInfo);
      } catch (error) {
        console.error('获取天气数据失败:', error);
        this.handleWeatherError();
      }
    },

    // 处理天气数据
    processWeatherData(weatherInfo) {
      // 确保图表已初始化
      if (!this.chartsInitialized) {
        setTimeout(() => this.processWeatherData(weatherInfo), 100);
        return;
      }

      this.weatherData = {
        illuminance: parseInt(weatherInfo.humidity || 0) * 100,
        temperature: parseFloat(weatherInfo.temperature || 0),
        windPower: this.parseWindPowerFromGaode(weatherInfo.windpower || "0级")
      };

      this.updateCharts();
      this.checkFlightConditions();
      this.flightStatusText = '天气数据已更新';
    },

    // 更新图表数据
// 修改updateCharts方法
// 更新图表数据方法修改
updateCharts() {
  if (!this.windGauge || !this.tempGauge) {
    console.warn('图表实例未初始化');
    return;
  }

  try {
    // 创建新的配置对象（不要依赖getOption）
    const windOption = {
      animation: false,
      title: { show: false },
      series: [{
        type: 'gauge',
        min: 0,
        max: 12,
        axisLabel: {
          show: true,
          formatter: '{value}级'
        },
        detail: {
          formatter: '{value}级',
          offsetCenter: [0, '70%'],
          fontSize: 14
        },
        pointer: {
          show: true,
          length: '60%'
        },
        data: [{ value: this.weatherData.windPower }],
        color: ['#37a2da']
      }]
    };

    const tempOption = {
      animation: false,
      title: { show: false },
      series: [{
        type: 'gauge',
        min: -20,
        max: 50,
        axisLabel: {
          show: true,
          formatter: '{value}°C'
        },
        detail: {
          formatter: '{value}°C',
          offsetCenter: [0, '70%'],
          fontSize: 14
        },
        pointer: {
          show: true,
          length: '60%'
        },
        data: [{ value: this.weatherData.temperature }],
        color: ['#ff6384']
      }]
    };

    // 全量设置选项
    this.windGauge.setOption(windOption);
    this.tempGauge.setOption(tempOption);

    // 优化resize逻辑
    this.$nextTick(() => {
      this.windGauge.resize();
      this.tempGauge.resize();
    });
  } catch (error) {
    console.error('更新图表失败:', error);
    // 尝试重新初始化
    if (!this.chartsInitialized) {
      this.initCharts();
    }
  }
},
    // 其他方法保持不变...
    // parseWindPowerFromGaode, handleWeatherError, checkFlightConditions等方法保持不变


    // 处理天气数据错误
    handleWeatherError() {
      this.flightStatusText = '获取天气数据失败';

      // 设置默认值
      this.weatherData = {
        illuminance: 0,
        temperature: 0,
        windPower: 0
      };

      // 更新图表显示默认值
      this.updateCharts();
    },

    // 解析高德返回的风力描述为风力等级
    parseWindPowerFromGaode(windStr) {
      // 高德返回的风力描述如"3-4级"，我们需要提取数字
      const match = windStr.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    },

    // 检查飞行条件
    checkFlightConditions() {
  const { temperature, windPower } = this.weatherData;

  this.canFly = temperature >= 0 && temperature <= 40 && windPower < 5;

  if (this.canFly) {
    this.flightStatusText = '当前天气条件允许起飞';
    this.showSuccessAlert = true; // 新增成功弹窗状态
  } else {
    this.flightStatusText = '当前天气条件不允许起飞';
    this.showWarning = true;

    if (temperature < 0 || temperature > 40) {
      this.warningMessage = `温度超出安全范围 (${temperature}°C)，不允许起飞！`;
    } else if (windPower >= 5) {
      this.warningMessage = `风力过大 (${windPower}级)，不允许起飞！`;
    }
  }
}
  }
}
</script>

<style scoped>
.weather-container {
  padding: 5px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.gauges-row {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
}

.gauge-container {
  flex: 1;
  max-width: 50%;
  display: flex;
  flex-direction: column;
  padding: 15px;
  justify-content: flex-start; /* Add this to align content to top */
}

.gauge-title {
  text-align: center;
  font-weight: bold;
  margin-bottom: 15px; /* Increased margin for more space */
  color: black;
  margin-top: -10px; /* Move title slightly upward */
}

.gauge-chart {
  width: 100%;
  height: 150px !important;
  margin-top: 5px; /* Reduced margin to bring chart closer to title */
}

.weather-data {
  margin-top: 5px; /* Reduced margin to bring data section closer */
}

.data-item {
  display: flex;
  align-items: center;
  margin: 5px 0;
  font-size: 16px;
  color: #333; /* Darker color for text */
}

.data-item i {
  margin-right: 15px;
  font-size: 24px;
  color: #FFA500;
}

.flight-status {
  padding: 15px;
  border-radius: 4px;
  margin-top: 15px; /* Reduced margin */
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flight-status i {
  margin-right: 10px;
  font-size: 20px;
}

.can-fly {
  background-color: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

.cannot-fly {
  background-color: rgba(245, 108, 108, 0.1);
  color: #F56C6C;
}
</style>
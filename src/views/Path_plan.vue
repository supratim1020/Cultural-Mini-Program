<template>
  <div class="path-plan-page">
    <h1>农药喷洒路径规划</h1>
    <div class="control-navbar">
      <div class="control-group">
        <button @click="startManualSelection" class="control-button" :disabled="isSelecting">
          {{ isSelecting ? '选点中...' : '手动选点' }}
        </button>
        <button @click="stopManualSelection" class="control-button" :disabled="!isSelecting">结束选点</button>
      </div>
      <button
        @click="fetchPestPoints"
        class="control-button"
      >
        导入病虫害点
      </button>
      <button @click="calculatePath" class="control-button calculate-btn" :disabled="points.length < 2">计算路径</button>
      <button @click="clearPointsAndPath" class="control-button clear-btn">清除所有点</button>
      <button @click="goHome" class="control-button home-btn">返回首页</button>
      <button @click="showPestMapDialog = true" class="control-button pestmap-btn">生成病虫害地图</button>
    </div>

    <div class="info-display" v-if="flightTime">
      预计飞行时间: {{ flightTime }} 秒 (速度: 2.2 m/s) 预计作业时间：{{ Number(flightTime) +497}}秒 | 总距离: {{ totalDistance.toFixed(2) }} 米
    </div>

    <div id="map-container" ref="mapContainer">
      <div id="amap-container"></div>
    </div>

    <el-dialog title="选择要显示的虫害类型" :visible.sync="showPestMapDialog" width="400px">
      <div v-for="type in pestTypes" :key="type.class" style="display:flex;align-items:center;margin-bottom:8px;">
        <span :style="{display:'inline-block',width:'16px',height:'16px',background:type.color,borderRadius:'50%',marginRight:'8px'}"></span>
        <span style="flex:1">{{ pestTypeName(type.class) }}</span>
        <el-checkbox v-model="selectedPestTypes" :label="type.class"></el-checkbox>
      </div>
      <span slot="footer" class="dialog-footer" style="display:flex;flex-direction:column;gap:8px;">
        <el-button type="warning" @click="getSprayAdvice" style="width:100%;margin-bottom:4px;">获取喷药建议</el-button>
        <div style="display:flex;gap:8px;">
          <el-button @click="showPestMapDialog = false">取消</el-button>
          <el-button type="primary" @click="renderPestMap">生成虫害地图</el-button>
        </div>
      </span>
    </el-dialog>

    <el-dialog
      title="喷药建议"
      :visible.sync="showAdviceDialog"
      draggable
      custom-class="advice-dialog-right"
      width="480px"
      append-to-body
      :modal="false"
    >
      <div style="white-space: pre-line;">{{ adviceContent }}</div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="showAdviceDialog = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- <button class="back-button" @click="goBack">返回</button> -->
  </div>
</template>

<script>
import axios from 'axios';
export default {
  name: 'PathPlanPage',
  data() {
    return {
      points: [],
      pestPoints: [],
      pestTypes: [],
      selectedPestTypes: [],
      showPestMapDialog: false,
      flightTime: null,
      totalDistance: 0,
      isSelecting: false,
      amap: null,
      markers: [],
      pathLine: null,
      AMap: null,
      pointCount: 5,
      showAdviceDialog: false,
      adviceContent: ''
    };
  },
  async mounted() {
    try {
      await this.loadAMap();
      await this.initAMap();
      await this.fetchPestTypes();
      // 初始化完成后立即清除所有点，确保地图干净
      this.clearPointsAndPath();
    } catch (error) {
      console.error("地图初始化过程中发生严重错误，部分功能可能无法使用:", error);
    }
    window.addEventListener('resize', this.onWindowResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onWindowResize);
    if (this.amap) {
      this.amap.destroy();
    }
  },
  methods: {
    async fetchPestPoints() {
      try {
        const res = await fetch('http://localhost:5000/api/pest_points');
        if (!res.ok) {
          throw new Error('接口请求失败: ' + res.status);
        }
        const data = await res.json();
        if (!data || !Array.isArray(data)) {
          throw new Error('返回数据格式错误');
        }
        this.pestPoints = data;
        this.clearPointsAndPath();
        // 默认全部渲染
        data.forEach((p) => {
          this.addPestMarker(p);
        });
      } catch (e) {
        alert('获取病虫害点失败: ' + e.message);
        console.error('获取病虫害点错误:', e);
      }
    },
    async fetchPestTypes() {
      try {
        const res = await fetch('http://localhost:5000/api/pest_types');
        this.pestTypes = await res.json();
        this.selectedPestTypes = this.pestTypes.map(t => t.class); // 默认全选
      } catch (e) {
        this.pestTypes = [];
      }
    },
    pestTypeName(type) {
      const map = {
        'Blight': '玉米大斑病',
        'brown_spot': '玉米褐斑病',
        'corn_rust': '玉米锈病',
        'corn_smut': '玉米黑粉病',
        'downy_mildew': '玉米霜霉病',
        'grey_leaf_spot': '玉米灰斑病',
        'maize-streak-disease': '玉米条斑病',
        'fall-armyworm-larva': '草地贪夜蛾幼虫',
        'yellow-stem-borer': '黄茎螟成虫',
        'yellow-stem-borer-larva': '黄茎螟幼虫'
      };
      return map[type] || type;
    },
    renderPestMap() {
      this.clearPointsAndPath();
      const filtered = this.pestPoints.filter(p => this.selectedPestTypes.includes(p.class));
      
      // 如果有点位，先计算边界
      if (filtered.length > 0) {
        const bounds = new this.AMap.Bounds(
          [Math.min(...filtered.map(p => p.lng)), Math.min(...filtered.map(p => p.lat))],
          [Math.max(...filtered.map(p => p.lng)), Math.max(...filtered.map(p => p.lat))]
        );
        
        // 渲染点位
        filtered.forEach((p) => {
          this.addPestMarker(p);
        });

        // 设置地图视野到所有点位
        this.amap.setBounds(bounds, false, [50, 50, 50, 50]);
        
        // 确保缩放到最大
        setTimeout(() => {
          if (this.amap.getZoom() < 19) {
            this.amap.setZoom(19);
          }
        }, 100);
      }
      
      // 赋值给路径点
      this.points = filtered.map(p => ({ ...p }));
      
      this.showPestMapDialog = false;
    },
    addPestMarker(p) {
      if (!this.AMap || !this.amap) {
        console.error('地图未初始化');
        return;
      }

      const colorMap = {};
      this.pestTypes.forEach((t) => {
        colorMap[t.class] = t.color;
      });
      const color = colorMap[p.class] || '#888';
      
      // 调整点大小计算
      const minSize = 12, maxSize = 36;
      let size = minSize;
      if (p.area_cm2) {
        size = Math.round(minSize + (maxSize - minSize) * ((p.area_cm2 - 10) / (500 - 10)));
        size = Math.max(minSize, Math.min(maxSize, size));
      }

      try {
        const marker = new this.AMap.Marker({
          position: new this.AMap.LngLat(p.lng, p.lat),
          content: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.3);position:absolute;transform:translate(-50%,-50%);z-index:100;"></div>`,
          anchor: 'center',
          offset: new this.AMap.Pixel(0, 0)
        });

        marker.on('click', () => {
          this.showPestInfoWindow(p);
        });

        this.amap.add(marker);
        this.markers.push(marker);
      } catch (e) {
        console.error('添加marker出错:', e);
      }
    },
    async loadPestPoints(e) {
      const file = e.target.files[0];
      if (!file) return;

      try {
        // 读取并解析文件
        const data = JSON.parse(await this.readFile(file));
        this.validatePestData(data);

        // 转换数据格式
        const convertedPoints = this.convertAgricultureData(data);

        // 清除旧数据
        this.clearPointsAndPath();

        // 添加新数据
        convertedPoints.forEach((p) => {
          this.points.push(p);
          this.addEnhancedMarker(p);
        });

        // 自动计算路径
        if(this.points.length >= 2) {
          this.calculatePath();
        }

        this.$refs.pestFile.value = null;
      } catch (error) {
        console.error('导入失败:', error);
        this.fallbackToSampleData();  // 失败时回退示例数据
        alert(`文件导入失败: ${error.message}，已加载示例数据`);
      }
    },

    // 农业数据校验
    validatePestData(data) {
      if (!data || !data.fields) throw new Error("无效的数据格式");

      data.fields.forEach((field, index) => {
        if (!field.bounds?.northEast || !field.bounds?.southWest) {
          throw new Error(`第${index+1}个地块缺少边界坐标`);
        }
        if (typeof field.pestCount !== 'number' || field.pestCount < 0) {
          throw new Error(`第${index+1}个地块虫口数量无效`);
        }
      });
    },

    // 转换农业数据为路径点
    convertAgricultureData(data) {
      return data.fields.map(field => ({
        // 取地块中心点作为路径点
        lng: (field.bounds.southWest.lng + field.bounds.northEast.lng) / 2,
        lat: (field.bounds.southWest.lat + field.bounds.northEast.lat) / 2,
        // 携带扩展信息
        meta: {
          pestType: field.pestType || 1,
          pestCount: field.pestCount,
          dosage: Math.ceil(field.pestCount / 10)  // 计算药量
        }
      }));
    },

    // 增强型标记点
    addEnhancedMarker(point) {
      const colorMap = {
        1: '#4CAF50',  // 轻度
        2: '#FFC107',  // 中度
        3: '#F44336'   // 重度
      };

      const marker = new this.AMap.Marker({
        position: new this.AMap.LngLat(point.lng, point.lat),
        content: `
          <div class="pest-marker" style="background:${colorMap[point.meta.pestType]}">
            <div class="count">${point.meta.pestCount}</div>
            <div class="dosage">${point.meta.dosage}ml</div>
          </div>
        `,
        offset: new this.AMap.Pixel(-15, -15)
      });

      // 添加点击事件
      marker.on('click', () => {
        this.showPestInfoWindow(point);
      });

      this.amap.add(marker);
      this.markers.push(marker);
    },

    // 信息窗口显示
    showPestInfoWindow(point) {
      // 兼容不同数据结构
      const pestCount = point.meta?.pestCount ?? point.pestCount ?? point.severity ?? '未知';
      const dosage = point.meta?.dosage ?? point.dosage ?? point.area_cm2 ?? '未知';
      const pestType = point.meta?.pestType ?? point.class ?? '未知';

      const infoWindow = new this.AMap.InfoWindow({
        content: `
          <div class="pest-info">
            <h3>病虫害详情</h3>
            <p>类型: ${pestType}</p>
            <p>虫口数量/严重程度: ${pestCount}</p>
            <p>面积/建议施药量: ${dosage}</p>
            <p>坐标: ${point.lng?.toFixed(6) ?? ''}, ${point.lat?.toFixed(6) ?? ''}</p>
          </div>
        `,
        offset: new this.AMap.Pixel(0, -30)
      });
      infoWindow.open(this.amap, [point.lng, point.lat]);
    },

    // 备用示例数据
    fallbackToSampleData() {
      const sampleData = {
        fields: [
          {
            bounds: {
              northEast: { lng: 112.581800, lat: 37.950800 }, // 中北大学东北角
              southWest: { lng: 112.574500, lat: 37.946000 }  // 中北大学西南角
            },
            pestType: 2,
            pestCount: 85
          },
          {
            bounds: {
              northEast: { lng: 112.583500, lat: 37.953000 }, // 中北大学北门附近
              southWest: { lng: 112.576000, lat: 37.948500 }  // 中北大学南门附近
            },
            pestType: 3,
            pestCount: 120
          }
        ]
      };

      const points = this.convertAgricultureData(sampleData);
      points.forEach((p) => {
        this.points.push(p);
        this.addEnhancedMarker(p);
      });
    },

    // 文件读取方法
    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
      });
    },
    async loadAMap() {
      try {
        await new Promise((resolve, reject) => {
          if (window.AMap) {
            this.AMap = window.AMap;
            return resolve();
          }

          window.initAMap = () => {
            this.AMap = window.AMap;
            resolve();
          };

          const script = document.createElement('script');
          script.src = `https://webapi.amap.com/maps?v=2.0&key=9728f704bb4beee956970a9dc31857db&callback=initAMap`;
          script.onerror = (err) => {
            // 捕获脚本加载失败错误
            console.error('高德地图脚本加载失败', err);
            reject(new Error('高德地图脚本加载失败，请检查网络连接和API Key。'));
          };
          document.head.appendChild(script);
        });
      } catch (error) {
        console.error('加载高德地图API时发生错误:', error);
        alert('地图服务加载失败，请检查网络并刷新页面。');
        throw error; // 抛出错误，以便 mounted 钩子可以捕获
      }
    },

    async initAMap() {
      if (!this.AMap || typeof this.AMap.Map !== 'function') {
        console.error('AMap 核心库尚未完全加载，无法初始化地图。');
        return;
      }

      this.amap = new this.AMap.Map('amap-container', {
        viewMode: '2D',
        zoom: 19,  // 设置最大缩放级别
        zooms: [3, 20],
        center: [112.47142, 37.956898],
        features: ['bg', 'road', 'building'],
        showIndoorMap: false,
        expandZoomRange: true,
        defaultCursor: 'pointer'
      });

      this.AMap.plugin(['AMap.ToolBar', 'AMap.Scale'], () => {
        this.amap.addControl(new this.AMap.ToolBar({
          position: { right: '10px', top: '50px' }
        }));
        this.amap.addControl(new this.AMap.Scale());
      });

      // 地图加载完成后的处理
      this.amap.on('complete', () => {
        if (this.pestPoints.length > 0) {
          this.renderPestMap();
        }
      });
    },

    onWindowResize() {
      if (this.amap) {
        this.amap.resize();
      }
    },

    startManualSelection() {
      this.isSelecting = true;
      this.amap.on('click', this.handleMapClick);
      alert('请在地图上点击添加喷洒点，完成后点击"结束手动选点"');
    },

    stopManualSelection() {
      this.isSelecting = false;
      this.amap.off('click', this.handleMapClick);
    },

    handleMapClick(e) {
      if (!this.isSelecting || !this.AMap) return;

      const lnglat = e.lnglat;
      const point = {
        lng: lnglat.lng,
        lat: lnglat.lat
      };

      this.points.push(point);
      this.addMarkerToAMap(point, this.points.length);
    },

    addMarkerToAMap(point, index) {
      if (!this.AMap) return;

      const marker = new this.AMap.Marker({
        position: new this.AMap.LngLat(point.lng, point.lat),
        content: `<div class="marker">${index}</div>`,
        offset: new this.AMap.Pixel(-8, -8)
      });
      this.amap.add(marker);
      this.markers.push(marker);
    },

    generateRandomPoints() {
      this.clearPointsAndPath();

      this.points = [];
      const center = this.amap.getCenter();
      const centerLng = center.getLng();
      const centerLat = center.getLat();

      for (let i = 0; i < this.pointCount; i++) {
        const lng = centerLng + (Math.random() - 0.5) * 0.02;
        const lat = centerLat + (Math.random() - 0.5) * 0.02;

        const point = {
          lng: lng,
          lat: lat
        };

        this.points.push(point);
        this.addMarkerToAMap(point, i+1);
      }

      this.flightTime = null;
    },


    calculatePath() {
      if (this.points.length < 2 || !this.AMap) return;

      const unvisited = [...this.points];
      const path = [unvisited.shift()];

      while (unvisited.length > 0) {
        const lastPoint = path[path.length - 1];
        let closestIndex = 0;
        let closestDistance = this.calculateDistance(lastPoint, unvisited[0]);

        for (let i = 1; i < unvisited.length; i++) {
          const distance = this.calculateDistance(lastPoint, unvisited[i]);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
          }
        }

        path.push(unvisited.splice(closestIndex, 1)[0]);
      }

      this.totalDistance = 0;

      for (let i = 1; i < path.length; i++) {
        this.totalDistance += this.calculateDistance(path[i-1], path[i]);
      }
      const rowCount = this.calculateRowCount(); // 计算作业行数
     const turnTime = (rowCount - 1) * 10;     // 换行总耗时
     const flightTimeFromDistance = this.totalDistance / 2.2;
     this.flightTime = (flightTimeFromDistance + turnTime).toFixed(2);


      this.flightTime = (this.totalDistance / 2.2).toFixed(2);

      this.drawAMapPath(path);
    },
    calculateRowCount() {
    // 根据地块宽度和行宽（1米）计算
    const fieldWidth = this.calculateFieldWidth(); // 需要新增字段宽计算
    return Math.ceil(fieldWidth / 1); // 1米行宽
  },

  // 新增地块宽度计算
  calculateFieldWidth() {
    if (this.points.length < 2) return 0;

    // 获取最东和最西点经度
    const lngs = this.points.map(p => p.lng);
    const east = Math.max(...lngs);
    const west = Math.min(...lngs);

    // 转换为米距离
    const eastPoint = new this.AMap.LngLat(east, this.points[0].lat);
    const westPoint = new this.AMap.LngLat(west, this.points[0].lat);
    return eastPoint.distance(westPoint);
  },

    calculateDistance(point1, point2) {
      const p1 = new this.AMap.LngLat(point1.lng, point1.lat);
      const p2 = new this.AMap.LngLat(point2.lng, point2.lat);
      return p1.distance(p2);
    },

    drawAMapPath(path) {
      this.clearAMapPath();

      const lineArr = path.map(p => [p.lng, p.lat]);
      this.pathLine = new this.AMap.Polyline({
        path: lineArr,
        isOutline: true,
        outlineColor: '#ffeeff',
        borderWeight: 1,
        strokeColor: "#3366FF",
        strokeOpacity: 1,
        strokeWeight: 5,  // 加粗路径线
        strokeStyle: "solid",
        lineJoin: 'round',
        lineCap: 'round'
      });

      this.amap.add(this.pathLine);
      this.amap.setFitView();
    },

    clearAMapPath() {
      if (!this.amap || !this.pathLine) return;
      this.amap.remove(this.pathLine);
      this.pathLine = null;
    },

    clearPointsAndPath() {
      if (this.amap) {
        this.markers.forEach(marker => this.amap.remove(marker));
        this.markers = [];
        this.clearAMapPath();
      }

      this.points = [];
      this.flightTime = null;
      this.totalDistance = 0;
      this.isSelecting = false;
      this.amap.off('click', this.handleMapClick);
    },

    goHome() {
      this.$router.push({ name: 'index' });
    },

    async getSprayAdvice() {
      // 获取当前地图上所有已显示的虫害类型
      const visiblePests = (this.pestPoints || [])
        .filter(p => this.selectedPestTypes.includes(p.class))
        .map(p => this.pestTypeName(p.class));
      const uniquePests = Array.from(new Set(visiblePests));
      if (!uniquePests.length) {
        this.$message.warning('当前地图上没有可用的虫害点');
        return;
      }
      this.$message.info('正在获取喷药建议，请稍候...');
      try {
        const response = await axios.post('http://localhost:3000/api/pesticide-advice', {
          pestList: uniquePests
        }, { timeout: 60000 });
        const advice = response.data.advice || '未获取到建议';
        this.adviceContent = advice;
        this.showAdviceDialog = true;
      } catch (e) {
        this.$alert('获取喷药建议失败：' + (e.message || e), '错误');
      }
    }
  }
};
</script>

<style scoped>
.pest-marker {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  border: 2px solid white;
}

.pest-marker .count {
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.pest-marker .dosage {
  color: white;
  font-size: 9px;
  margin-top: -3px;
}

.pest-info {
  padding: 10px;
  min-width: 180px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.pest-info h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
  border-bottom: 1px solid #eee;
  padding-bottom: 4px;
}
.path-plan-page {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: 'Microsoft YaHei', sans-serif;
}

#map-container, #amap-container {
  width: 100%;
  height: 100vh;
  position: relative;
  z-index: 1;
}

#amap-container {
  width: 100%;
  height: 100vh;
  position: absolute;
  z-index: 0;
}

.control-navbar {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  padding: 6px 12px;
  border-radius: 8px;
  display: flex;
  gap: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  align-items: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: 2px solid #388e3c;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  white-space: nowrap;
  height: 38px;
  transition: all 0.2s;
  font-weight: bold;
}

.control-button:hover {
  background-color: #45a049;
  border-color: #2e7031;
  transform: translateY(-1px);
}

.control-button:disabled {
  background-color: #cccccc;
  border-color: #cccccc;
  cursor: not-allowed;
  transform: none;
}

.calculate-btn {
  background-color: #2196F3;
}

.calculate-btn:hover {
  background-color: #0b7dda;
}

.clear-btn {
  background-color: #f44336;
}

.clear-btn:hover {
  background-color: #d32f2f;
}

.point-count-select {
  padding: 4px;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 12px;
  height: 28px;
}

.info-display {
  position: absolute;
  top: 120px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 8px 15px;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  font-size: 13px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.back-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  padding: 8px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.back-button:hover {
  background-color: #d32f2f;
  transform: translateY(-1px);
}

.marker {
  background: #ff0000;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  text-align: center;
  line-height: 20px;
  font-weight: bold;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.advice-dialog-right {
  top: 60px !important;
  left: auto !important;
  right: 40px !important;
  margin: 0 !important;
  transform: none !important;
}
</style>
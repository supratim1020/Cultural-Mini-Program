<template>
  <dv-border-box-12>
    <div class="map-container">
      <div id="campus-map" ref="mapEl"></div>
      <div class="map-controls">
        <button @click="zoomIn" title="放大"><i class="el-icon-zoom-in"></i></button>
        <button @click="zoomOut" title="缩小"><i class="el-icon-zoom-out"></i></button>
        <button @click="locateBuilding" title="定位"><i class="el-icon-location"></i></button>
        <button @click="locateMe" title="我的位置"><i class="el-icon-user"></i></button>
      </div>
      <div v-if="loading" class="map-loading">地图加载中...</div>
      <div v-if="error" class="map-error">地图加载失败，请刷新重试</div>
      <div v-if="positionInfo" class="position-info">
        当前位置: {{ positionInfo }}
      </div>
    </div>
  </dv-border-box-12>
</template>

<script>
/* global TMap */
export default {
  name: 'LeftOne',
  data() {
    return {
      map: null,
      marker: null,
      userMarker: null,
      loading: true,
      error: false,
      buildingPosition: { lat: 38.0189, lng: 112.4498 }, // 存储原始坐标
      positionInfo: '',
      userPosition: null,
      infoWindow: null,
      userInfoWindow: null
    }
  },
  mounted() {
    if (window.TMap) {
      this.initMap();
    } else {
      this.loadMapScript();
    }
  },
  methods: {
   loadMapScript() {
  const TIMEOUT = 10000;
  const script = document.createElement('script');
  let timer;  // 保持变量声明

  window.initTMap = () => {
    clearTimeout(timer);  // ✅ 新增：加载成功时清除定时器
    this.initMap();
  };

      script.src = `https://map.qq.com/api/gljs?v=1.exp&key=VSFBZ-SDO6B-PWHU3-NBHCT-Z2U45-VIFBY&callback=initTMap`;

  timer = setTimeout(() => {
    this.loading = false;
    this.error = false;
    document.head.removeChild(script);
  }, TIMEOUT);

  // 新增错误处理
  script.onload = () => clearTimeout(timer);  // ✅ 加载成功时清除定时器
  script.onerror = () => {
    clearTimeout(timer);  // ✅ 加载失败时也清除定时器
    this.loading = false;
    this.error = false;
  };

  document.head.appendChild(script);
}



    ,createLatLng(lat, lng) {
      return new TMap.LatLng(lat, lng);
    },

    initMap() {
      try {
        // 创建地图实例
        const center = this.createLatLng(this.buildingPosition.lat, this.buildingPosition.lng);

        this.map = new TMap.Map('campus-map', {
          center: center,
          zoom: 17,
          pitch: 0,
          rotation: 0
        });

        // 添加建筑物标记
        this.marker = new TMap.MultiMarker({
          map: this.map,
          geometries: [{
            id: 'building',
            position: center,

          }]
        });

        // 添加信息窗口
        this.infoWindow = new TMap.InfoWindow({
          map: this.map,
          position: center,
          content: '<div style="padding:5px;min-width:150px;">我的位置</div>',
          offset: new TMap.Point(0, -35)
        });
        this.infoWindow.open();

        // 添加控件
        this.map.addControl(new TMap.Control.Zoom());
        this.map.addControl(new TMap.Control.Scale());

        this.loading = false;
      } catch (err) {
        console.error('地图加载失败', {
          error: err,
          TMapExists: !!window.TMap,
          containerExists: !!document.getElementById('campus-map')
        });
        this.loading = false;
        this.error = false;
      }
    },

    zoomIn() {
      this.map?.zoomTo(this.map.getZoom() + 1);
    },

    zoomOut() {
      this.map?.zoomTo(this.map.getZoom() - 1);
    },

    locateBuilding() {
      if (this.map) {
        const center = this.createLatLng(this.buildingPosition.lat, this.buildingPosition.lng);
        this.map.setCenter(center);
        this.map.setZoom(17);
      }
    },

    locateMe() {
      if (navigator.geolocation) {
        this.loading = true;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const userPos = this.createLatLng(latitude, longitude);

            this.userPosition = userPos;
            this.positionInfo = `经度: ${longitude.toFixed(6)}, 纬度: ${latitude.toFixed(6)}`;

            if (this.map) {
              // 移除旧的用户标记
              if (this.userMarker) {
                this.userMarker.setMap(null);
              }

              // 添加新的用户标记
              this.userMarker = new TMap.MultiMarker({
                map: this.map,
                geometries: [{
                  id: 'user',
                  position: userPos,
                  content: '<div style="width: 24px; height: 24px; background: url(https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerRed.png) no-repeat; background-size: cover;"></div>',
                  title: '我的位置'
                }]
              });

              // 居中显示用户位置
              this.map.setCenter(userPos);

              // 更新信息窗口
              if (this.userInfoWindow) {
                this.userInfoWindow.close();
              }
              this.userInfoWindow = new TMap.InfoWindow({
                map: this.map,
                position: userPos,
                content: `<div style="padding:5px;min-width:150px;">我的位置<br/>经度: ${longitude.toFixed(6)}<br/>纬度: ${latitude.toFixed(6)}</div>`,
                offset: new TMap.Point(0, -35)
              });
              this.userInfoWindow.open();
            }

            this.loading = false;
          },
          (error) => {
            this.handleGeoError(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        this.positionInfo = "您的浏览器不支持地理位置功能";
      }
    },

    handleGeoError(error) {
      this.loading = false;
      const errors = {
        [error.PERMISSION_DENIED]: "用户拒绝了位置请求",
        [error.POSITION_UNAVAILABLE]: "位置信息不可用",
        [error.TIMEOUT]: "获取位置请求超时",
        [error.UNKNOWN_ERROR]: "发生未知错误"
      };
      this.positionInfo = `获取位置失败: ${errors[error.code] || error.message}`;
    }
  },
  beforeDestroy() {
    if (this.map) {
      this.map.destroy();
    }
    delete window.initTMap;
  }
}
</script>

<style scoped>
/* 保持原有样式不变 */
.map-container {
  position: relative;
  height: 100%;
  width: 100%;
  max-height: 300px;
}

#campus-map {
  height: 100%;
  width: 100%;
  background: #f0f2f5;
}

.map-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 999;
  display: flex;
  gap: 8px;
}

.map-controls button {
  background: rgba(0, 150, 255, 0.8);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
}

.map-controls button:hover {
  background: rgba(0, 180, 255, 1);
  transform: scale(1.1);
}

.map-loading, .map-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  z-index: 998;
}

.map-error {
  background: rgba(255, 0, 0, 0.7);
}

.position-info {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  z-index: 999;
  font-size: 14px;
  max-width: 300px;
}
</style>
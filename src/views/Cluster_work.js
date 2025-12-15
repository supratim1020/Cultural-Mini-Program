import drawMixin from "../utils/drawMixin";
import { formatTime } from '../utils/index.js'
import { mapMutations } from 'vuex'
// 1. 顶部引入coordtransform
import coordtransform from 'coordtransform';
import polygonClipping from 'polygon-clipping';

export default {
  name: 'ClusterWork',
  mixins: [ drawMixin ],
  data() {
    return {
      timing: null,
      loading: false,
      dateDay: null,
      dateYear: null,
      dateWeek: null,
      weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      decorationColor: ['#568aea', '#000000'],
      selectedField: null, // { area: 0, center: '' }
      savedField: null, // 新增：仅用于保存本地地块信息，不用于显示弹窗
      showAddDroneDialog: false,
      showAccuracyDialog: false,
      // 无人机统计数据
      droneStats: {
        online: 5,
        working: 3,
        idle: 2
      },
      // 作业分析数据
      workAnalysis: {
        completedArea: 0, // 将初始值改为0
        estimatedTime: '--', // 初始值设为'--'
        progress: 0
      },
      // 故障模拟数据
      selectedDrone: '',
      faultType: '',
      // 地图相关数据
      clusterMap: null,
      clusterMapAPI: null,
      gaodeApiKey: 'b9824a931dff18b4dbd6386eaec5ecb1',
      selectedPolygon: null,
      drawingManager: null,
      terrainData: null,
      currentLocationMarker: null,
      // 手动绘制相关变量
      manualDrawingPoints: [],
      manualMarkers: [],
      manualPolyline: null,
      manualPolygon: null,
      isManualDrawing: false,
      // 保存的绘制数据
      savedPolygons: [], // 保存所有绘制的多边形
      savedCoordinates: [], // 保存所有坐标数据
      currentPolygonIndex: -1, // 当前选中的多边形索引
      // 其他数据如无人机列表、作业进度等
      comprehensiveMatrix: null,
      showMatrixDetails: false,
      matrixTypes: ['elevation', 'difficulty', 'workTime'],
      currentMatrixType: 'difficulty',
      // 3D地图相关
      show3DMap: false,
      showTerrainLayer: true,
      terrainLayer: null,
      map3D: null,
      map3DAPI: null,
      slopeHeatmap: null, // 坡度热力图引用
      terrainMarkers: [], // 地形标记数组
      gaodeApiKey3D: 'YOUR_GAODE_API_KEY_FOR_3D', // 替换为你的高德3D地图API Key
      map3DOptions: {
        viewMode: '3D',
        zoom: 15,
        center: [116.397428, 39.90923], // 默认北京
        features: ['bg', 'road', 'building'],
        showIndoorMap: false,
        expandZoomRange: true,
        pitch: 60, // 俯仰角
        bearing: 0, // 旋转角
        altitude: 1000 // 高度
      },
      // 新增：3D地图服务商选择
      selected3DProvider: 'gaode_3d',
      available3DProviders: [],
      // 新增：等高线数据
      contourLines: [],
      showContourLines: true, // 新增：等高线显示/隐藏状态
      // 新增：改进的难度矩阵显示
      difficultyMatrixType: 'normalized', // 'normalized' | 'raw' | 'percentage'
      matrixColorScheme: 'viridis', // 'viridis' | 'plasma' | 'inferno' | 'magma'
      terrainMesh: null,
      contourLines3D: [],
      // 无人机表单数据
      droneForm: {
        name: '',
        type: 'mavic2pro',
        endurance: 60,
        fov: 100,
        max_times: 1000,
        function: 'inspect',
        max_height: 120,
        max_speed: 10,
        focal_length: 28.0,
        pixel_size: 2.4,
        status: 'online'
      },
      // 无人机表单验证规则
      droneFormRules: {
        name: [
          { required: true, message: '请输入无人机名称', trigger: 'blur' },
          { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
        ],
        type: [
          { required: true, message: '请选择类型', trigger: 'change' }
        ],
        endurance: [
          { required: true, message: '请输入续航时间', trigger: 'blur' },
          { type: 'number', min: 1, max: 120, message: '续航时间应在 1 到 120 分钟之间', trigger: 'blur' }
        ],
        fov: [
          { required: true, message: '请输入fov视场角', trigger: 'blur' },
          { type: 'number', min: 1, max: 180, message: 'fov视场角应在 1 到 180 度之间', trigger: 'blur' }
        ],
        max_times: [
          { required: true, message: '请输入最快快门', trigger: 'blur' },
          { type: 'number', min: 1, max: 10000, message: '最快快门应在 1 到 10000 次之间', trigger: 'blur' }
        ],
        function: [
          { required: true, message: '请选择功能', trigger: 'change' }
        ],
        max_height: [
          { required: true, message: '请输入最大飞行高度', trigger: 'blur' },
          { type: 'number', min: 1, max: 121, message: '最大飞行高度应在 1 到 121 米之间', trigger: 'blur' }
        ],
        max_speed: [
          { required: true, message: '请输入最大飞行速度', trigger: 'blur' },
          { type: 'number', min: 1, max: 15, message: '最大飞行速度应在 1 到 15 m/s 之间', trigger: 'blur' }
        ],
        status: [
          { required: true, message: '请选择状态', trigger: 'change' }
        ],
        focal_length: [
          { required: true, message: '请输入焦距', trigger: 'blur' },
          { type: 'number', min: 10, max: 100, message: '焦距应在10-100mm之间', trigger: 'blur' }
        ],
        pixel_size: [
          { required: true, message: '请输入像素尺寸', trigger: 'blur' },
          { type: 'number', min: 1, max: 10, message: '像素尺寸应在1-10微米之间', trigger: 'blur' }
        ]
      },
      submittingDrone: false,
      // 无人机列表数据
      droneList: [],
      // 识别精确度相关数据
      selectedCrop: '',
      selectedPeriod: '',
      accuracyResult: null,
      storedAccuracy: null, // 存储的精确度数据
      storedHeadingOverlap: 70, // 新增：存储的航向重叠率
      cropTypes: [
        { value: '小麦', label: '小麦' },
        { value: '棉花', label: '棉花' },
        { value: '谷子', label: '谷子' },
        { value: '水稻', label: '水稻' },
        { value: '玉米', label: '玉米' }
      ],
      periodMap: {
        '小麦': [
          { value: '返青期', label: '返青期' },
          { value: '拔节期', label: '拔节期' },
          { value: '灌浆期', label: '灌浆期' }
        ],
        '棉花': [
          { value: '苗期', label: '苗期' },
          { value: '蕾铃期', label: '蕾铃期' },
          { value: '吐絮期', label: '吐絮期' }
        ],
        '谷子': [
          { value: '苗期', label: '苗期' },
          { value: '抽穗期', label: '抽穗期' },
          { value: '成熟期', label: '成熟期' }
        ],
        '水稻': [
          { value: '苗期', label: '苗期' },
          { value: '分蘖期', label: '分蘖期' },
          { value: '抽穗期', label: '抽穗期' }
        ],
        '玉米': [
          { value: '苗期', label: '苗期' },
          { value: '拔节期', label: '拔节期' },
          { value: '抽雄期', label: '抽雄期' }
        ]
      },
      showBatchDialog: false,
      batchResults: [],
      batchError: '',
      headingOverlapInput: 70, // 航向重叠率
      sideOverlapInput: 70,    // 横向重叠率，默认70
      storedSideOverlap: 70,   // 存储的横向重叠率
      assignmentResults: [],
      assignmentRounds: 1,
      assignmentMarkers: [], // 新增：分配结果可视化标记
      terrainLoading: false, // 新增：地形数据加载状态
      calculatedWorkArea: 0, // 新增：计算出的需要作业的亩数
      assignmentPolygonInfoMap: [], // 新增：分配结果多边形信息映射
      showAssignmentDialog: false, // 新增：弹窗显示状态
      assignmentDialogInfo: null,  // 新增：弹窗内容
      droneAreaMuMap: undefined, // 新增：批量作业亩数缓存
      droneColorScheme: [
        ['#FF2D00', '#CC0000', '#FF7E7E', '#FFAFAF'],
        ['#00F7FF', '#00C4CC', '#7CE8FF', '#B3F5FF'],
        ['#00FF0D', '#00CC0A', '#7EFF82', '#AFFFB1'],
        ['#CC00FF', '#9900CC', '#D97EFF', '#E6B3FF'],
        ['#FFEE00', '#CCBB00', '#FFF57E', '#FFF9B3'],
        ['#FF00B8', '#CC0093', '#FF7EDD', '#FFB3EB']
      ],
      colorSchemes: [
        // 黄色系
        ['#FFD700', '#FFC300', '#FFB300', '#FFF8DC'],
        // 蓝色系
        ['#1E90FF', '#1874CD', '#4682B4', '#B0E0E6'],
        // 红色系
        ['#FF4500', '#CD2626', '#FF6347', '#FFA07A'],
        // 绿色系
        ['#32CD32', '#228B22', '#66CDAA', '#98FB98'],
        // 紫色系
        ['#8A2BE2', '#6A5ACD', '#9370DB', '#E6E6FA'],
        // 橙色系
        ['#FFA500', '#FF8C00', '#FFDAB9', '#FFE4B5']
      ]
    };
  },
  computed: {
    availablePeriods() {
      return this.selectedCrop ? this.periodMap[this.selectedCrop] || [] : [];
    }
  },
  mounted() {
    this.timeFn();
    this.cancelLoading();
    this.get3DMapProviders();
    this.loadDroneList();
    this.updateDroneStats();
    this.loadStoredAccuracy();
    this.loadStoredHeadingOverlap();
    this.loadStoredSideOverlap();
    // 只保存，不赋值selectedField，避免页面加载弹窗
    const savedField = localStorage.getItem('selectedField');
    if (savedField) {
      this.savedField = JSON.parse(savedField); // 仅保存，不赋值selectedField
      // this.selectedField = JSON.parse(savedField); // 注释掉
      // this.calculatedWorkArea = this.selectedField.area || 0;
      // console.log('已加载本地地块:', this.selectedField);
    }
    const savedTerrain = localStorage.getItem('terrainData');
    if (savedTerrain) {
      this.terrainData = JSON.parse(savedTerrain);
      console.log('已加载本地地势:', this.terrainData);
    }
    const savedContours = localStorage.getItem('contourLines');
    if (savedContours) {
      this.contourLines = JSON.parse(savedContours);
      console.log('已加载本地等高线:', this.contourLines);
    }
    
    // 恢复等高线数据
    this.restoreContourLinesFromStorage();
  },
  beforeDestroy () {
    clearInterval(this.timing)
    // 清理地图资源
    if (this.clusterMap) {
      if (this.currentLocationMarker) {
        this.clusterMap.remove(this.currentLocationMarker);
      }
      // 清理手动绘制资源
      this.cleanupManualDrawing();
      this.clusterMap.destroy();
    }
    if (this.drawingManager) {
      this.drawingManager.close();
    }
  },
    methods: {
    ...mapMutations(['setRegionData']),
    timeFn() {
      this.timing = setInterval(() => {
        this.dateDay = formatTime(new Date(), 'HH: mm: ss')
        this.dateYear = formatTime(new Date(), 'yyyy-MM-dd')
        this.dateWeek = this.weekday[new Date().getDay()]
      }, 1000)
    },
    cancelLoading() {
      setTimeout(() => {
        this.loading = false
        // 在loading结束后初始化地图
        this.$nextTick(() => {
          setTimeout(() => {
            this.initClusterMap()
          }, 100)
        })
      }, 500)
    },
    handlePartition() {
      // TODO: 调用动态分区接口
    },
    // 取消添加无人机
    cancelAddDrone() {
      this.showAddDroneDialog = false;
      this.resetDroneForm();
    },

    // 重置无人机表单
    resetDroneForm() {
      this.droneForm = {
        name: '',
        type: 'mavic2pro',
        endurance: 60,
        fov: 100,
        max_times: 1000,
        function: 'inspect',
        max_height: 120,
        max_speed: 10,
        status: 'online'
      };
      if (this.$refs.droneForm) {
        this.$refs.droneForm.resetFields();
      }
    },

    // 提交添加无人机
    async submitAddDrone() {
      this.$refs.droneForm.validate(async (valid) => {
        if (valid) {
          this.submittingDrone = true;

          try {
            // 调用后端API添加无人机
            const response = await fetch('http://localhost:5000/api/drones/add', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(this.droneForm)
            });

            const result = await response.json();

            if (result.code === 0) {
              this.$message.success('无人机添加成功！');
              this.showAddDroneDialog = false;
              this.resetDroneForm();

              // 更新无人机统计数据
              await this.updateDroneStats();

              // 刷新无人机列表
              await this.loadDroneList();
            } else {
              this.$message.error(result.msg || '添加无人机失败');
            }
          } catch (error) {
            console.error('添加无人机失败:', error);
            this.$message.error('网络错误，请稍后重试');
          } finally {
            this.submittingDrone = false;
          }
        } else {
          this.$message.error('请填写完整信息');
        }
      });
    },

    // 更新无人机统计数据
    async updateDroneStats() {
      try {
        const response = await fetch('http://localhost:5000/api/drones/stats');
        const result = await response.json();
        if (result.code === 0) {
          this.droneStats = result.data;
        }
      } catch (error) {
        console.error('获取无人机统计失败:', error);
      }
    },

    // 加载 working 状态的无人机列表
    async loadDroneList() {
      try {
        // 修改为获取所有无人机详细参数
        const response = await fetch('http://localhost:5000/api/drones/list');
        const result = await response.json();
        if (result.code === 0) {
          // 前端筛选出 working 状态的无人机
          this.droneList = (result.data || []).filter(d => d.status === 'working');
          localStorage.setItem('droneList', JSON.stringify(this.droneList));
          console.log('已从后端获取 working 状态无人机列表:', this.droneList);
        } else {
          this.droneList = [];
          localStorage.setItem('droneList', '[]');
          console.warn('获取 working 状态无人机列表失败:', result.msg);
        }
      } catch (error) {
        this.droneList = [];
        localStorage.setItem('droneList', '[]');
        console.error('获取 working 状态无人机列表失败:', error);
      }
    },

    // 获取无人机类型名称
    getDroneTypeName(type) {
      const typeNames = {
        'mavic2pro': 'mavic2pro',
        'Phantom4RTK': 'Phantom4RTK',
        'Mavic3M': 'Mavic3M'
      };
      return typeNames[type] || type;
    },
    // 调试方法
    checkMapStatus() {
      console.log('地图状态检查:');
      console.log('- clusterMap:', !!this.clusterMap);
      console.log('- clusterMapAPI:', !!this.clusterMapAPI);
      console.log('- DrawingManager:', !!this.clusterMapAPI?.DrawingManager);
      console.log('- drawingManager:', !!this.drawingManager);

      if (this.clusterMap) {
        console.log('- 地图中心:', this.clusterMap.getCenter());
        console.log('- 地图缩放级别:', this.clusterMap.getZoom());
      }
    },

    // 地图操作按钮方法
    handleSiteSelection() {
      // 检查地图状态
      if (!this.clusterMap) {
        this.$message.error('地图未初始化，请刷新页面重试');
        return;
      }

      // 如果正在绘制，则停止绘制
      if (this.isManualDrawing) {
        this.stopManualDrawing();
        return;
      }

      this.$message.info('请点击地图上的点来绘制地块边界，右键单击完成绘制');
      this.startManualDrawing();
    },

    // 停止手动绘制
    stopManualDrawing() {
      this.isManualDrawing = false;
      this.clusterMap.off('click', this.handleMapClick);
      this.clusterMap.off('rightclick', this.handleMapRightClick);
      this.$message.info('已停止绘制模式');
    },

    // 备用绘制方法
    startManualDrawing() {
      if (!this.clusterMap) {
        this.$message.error('地图未初始化，请稍后再试');
        return;
      }

      // 清除地块信息（包括需要作业的亩数）- 重新绘制时清零
      this.clearFieldInfo();

      // 清除之前的绘制
      if (this.manualPolygon) {
        this.clusterMap.remove(this.manualPolygon);
      }
      // 清理旧的 marker（点位）
      this.manualMarkers.forEach(marker => {
        if (marker && this.clusterMap) {
          this.clusterMap.remove(marker);
        }
      });
      this.manualMarkers = [];
      this.manualDrawingPoints = [];
      this.isManualDrawing = true;
      // 监听地图点击事件
      this.clusterMap.on('click', this.handleMapClick);
      this.clusterMap.on('rightclick', this.handleMapRightClick);
    },

    handleMapClick(e) {
      if (!this.isManualDrawing) return;
      // 只用 e.lnglat，确保无偏差
      const point = e.lnglat;
      // 检查是否和上一个点重复（防止双击多点）
      const last = this.manualDrawingPoints[this.manualDrawingPoints.length - 1];
      if (last && last.lng === point.lng && last.lat === point.lat) {
        return;
      }
      this.manualDrawingPoints.push(point);
      // 添加标记点
      const marker = new this.clusterMapAPI.Marker({
        position: point,
        icon: new this.clusterMapAPI.Icon({
          size: new this.clusterMapAPI.Size(8, 8),
          image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8Y2lyY2xlIGN4PSI0IiBjeT0iNCIgcj0iNCIgZmlsbD0iI0ZGMDAwMCIvPgo8L3N2Zz4=',
          imageSize: new this.clusterMapAPI.Size(8, 8)
        })
      });
      this.clusterMap.add(marker);
      this.manualMarkers.push(marker);
      // 如果有多个点，绘制连线
      if (this.manualDrawingPoints.length > 1) {
        if (this.manualPolyline) {
          this.clusterMap.remove(this.manualPolyline);
        }
        this.manualPolyline = new this.clusterMapAPI.Polyline({
          path: this.manualDrawingPoints,
          strokeColor: '#FF0000',
          strokeWeight: 2
        });
        this.clusterMap.add(this.manualPolyline);
      }
    },
    // 新增 handleMapRightClick 作为结束绘制
    handleMapRightClick() {
      if (!this.isManualDrawing || this.manualDrawingPoints.length < 3) {
        this.$message.warning('至少需要3个点才能形成地块');
        return;
      }
      // 完成绘制
      this.isManualDrawing = false;
      this.clusterMap.off('click', this.handleMapClick);
      this.clusterMap.off('rightclick', this.handleMapRightClick);
      // 创建多边形
      this.manualPolygon = new this.clusterMapAPI.Polygon({
        path: this.manualDrawingPoints,
        strokeColor: '#FF0000',
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.3
      });
      this.clusterMap.add(this.manualPolygon);
      // 只移除 polyline，不移除 marker
      if (this.manualPolyline) {
        this.clusterMap.remove(this.manualPolyline);
      }

      // 保存绘制的多边形和坐标
      this.savePolygonData();

      // 处理绘制完成
      this.handlePolygonDrawn(this.manualPolygon);
      this.$message.success('地块绘制完成！');
    },

    // 保存多边形数据
    savePolygonData() {
      const polygonData = {
        polygon: this.manualPolygon,
        coordinates: this.manualDrawingPoints.map(point => [point.lng, point.lat]),
        markers: [...this.manualMarkers],
        area: this.calculatePolygonArea(this.manualPolygon),
        center: this.getPolygonCenter(this.manualPolygon),
        bounds: this.getPolygonBounds(this.manualPolygon),
        timestamp: new Date().getTime()
      };

      this.savedPolygons.push(polygonData);
      this.savedCoordinates.push(polygonData.coordinates);
      this.currentPolygonIndex = this.savedPolygons.length - 1;

      console.log('保存的多边形数据:', polygonData);
      console.log('所有保存的坐标:', this.savedCoordinates);
    },

    // 获取多边形中心点
    getPolygonCenter(polygon) {
      const path = polygon.getPath();
      if (path && path.length > 0) {
        const center = path[0];
        return `${center.getLng().toFixed(6)}, ${center.getLat().toFixed(6)}`;
      }
      return '';
    },

    // 获取多边形边界
    getPolygonBounds(polygon) {
      const bounds = polygon.getBounds();
      if (bounds) {
        return {
          southwest: [bounds.getSouthWest().getLng(), bounds.getSouthWest().getLat()],
          northeast: [bounds.getNorthEast().getLng(), bounds.getNorthEast().getLat()]
        };
      }
      return null;
    },

    handleAreaCalculation() {
      if (!this.selectedField) {
        this.$message.warning('请先选择地块');
        return;
      }

      this.$message.success(`当前地块面积: ${this.selectedField.area.toFixed(2)} 亩`);
    },

    // --- 智能分配算法总入口 ---
    async handleAreaPlanning() {
      // 健壮性校验
      if (
        !this.selectedField ||
        !Array.isArray(this.selectedField.coordinates) ||
        this.selectedField.coordinates.length < 3 ||
        !this.terrainData ||
        !Array.isArray(this.terrainData.difficultyMatrix) ||
        this.terrainData.difficultyMatrix.length < 10
      ) {
        this.$message.error('地块或地形数据不完整，请先绘制地块并完成地势分析');
        return;
      }
      await this.loadDroneList();
      // 区域规划前，优先用批量作业缓存的亩数
      if (this.droneAreaMuMap) {
        this.droneList.forEach(drone => {
          if (this.droneAreaMuMap[drone.id]) {
            drone.areaMu = this.droneAreaMuMap[drone.id];
            drone.maxArea = this.droneAreaMuMap[drone.id];
          }
        });
      }
      console.log('🚀 开始执行新版动态分配算法...');

      // 1. 参数检查
      if (!this.selectedField) {
        this.$message.error('无法规划：请先选定地块。');
        return;
      }
      if (!this.droneList.length) {
        this.$message.error('无法规划：无人机列表为空，请先加载无人机。');
        return;
      }
      if (!this.terrainData?.difficultyMatrix) {
        this.$message.error('无法规划：地形分析未完成，请先分析地形。');
        return;
      }

      // 2. 生成所有地块网格并计算其等效面积
      const allGrids = this.generateAllGrids();
      if (!allGrids.length) {
        this.$message.error('未能生成有效的地块网格，请检查地块边界。');
          return;
        }

      const totalEquivalentArea = allGrids.reduce((sum, grid) => sum + grid.equivalentArea, 0);
      console.log(`🗺️ 地块总等效面积: ${totalEquivalentArea.toFixed(2)} 等效亩`);

      // 3. 计算所有可用无人机的总作业能力
      const availableDrones = this.droneList.filter(d => d.status === 'working' || d.status === 'online' || d.status === 'idle');
      if (availableDrones.length === 0) {
          this.$message.error("没有可用的无人机进行作业");
          return;
        }
      // 新增：判断是否有无人机未设置作业参数，自动兜底计算
      let dronesWithoutArea = availableDrones.filter(d => !d.maxArea && !d.areaMu);
      if (dronesWithoutArea.length > 0) {
        // 自动兜底计算
        this.calculateMissingDroneAreaMu();
        // 再判断一次
        dronesWithoutArea = availableDrones.filter(d => !d.maxArea && !d.areaMu);
        if (dronesWithoutArea.length > 0) {
          this.$message.error('请先设置无人机作业参数');
          return;
        }
      }
      const totalDroneCapacity = availableDrones.reduce((sum, drone) => sum + (Number(drone.maxArea) || 0), 0); // 安全累加，避免NaN
      console.log(`🚁 无人机单轮总作业能力: ${totalDroneCapacity.toFixed(2)} 亩`);
      
      // 4. 根据无人机能力选择分配策略
      let assignmentResults;
      if (totalDroneCapacity < totalEquivalentArea) {
        console.log('⚠️ 无人机能力不足，启动【多轮次】分配策略...');
        assignmentResults = this.multiRoundAssignment(allGrids, availableDrones, totalEquivalentArea);
      } else {
        console.log('✅ 无人机能力充足，启动【单轮优化】分配策略...');
        assignmentResults = this.singleRoundOptimalAssignment(allGrids, availableDrones);
      }
      
      this.assignmentResults = assignmentResults;
      console.log('🎉 最终分配结果:', this.assignmentResults);
      
      // 5. 可视化最终结果
      this.visualizeAssignmentResults();
      this.showContourLines = false; // 区域规划时隐藏等高线
    },

    // --- 策略一：多轮次分配 ---
    multiRoundAssignment(allGrids, drones) {
      console.log(`🔄 开始多轮次分配，共 ${allGrids.length} 个网格...`);
      let unassignedGrids = [...allGrids];
      let round = 1;
      const finalAssignments = drones.map(d => ({ ...d, blocks: [], totalArea: 0, totalEquivalentArea: 0, rounds: {} }));

      while (unassignedGrids.length > 0) {
        console.log(`--- ዙ 第 ${round} 轮作业开始，剩余 ${unassignedGrids.length} 个网格 ---`);
        const roundCapacityPerDrone = drones.map(d => d.maxArea || 50);
        const roundAssignments = this.assignGridsByProximity(unassignedGrids, drones, roundCapacityPerDrone);
        let assignedInRound = new Set();
        roundAssignments.forEach(droneAssignment => {
          const droneResult = finalAssignments.find(d => d.id === droneAssignment.id);
          if (droneAssignment.grids.length > 0) {
              // 给每个grid加上droneId和roundNumber
              droneAssignment.grids.forEach(g => {
                  g.droneId = droneAssignment.id;
                  g.roundNumber = round;
              });
              droneResult.rounds[round] = droneAssignment.grids;
              droneAssignment.grids.forEach(g => {
                  droneResult.totalArea += g.area;
                  droneResult.totalEquivalentArea += g.equivalentArea;
                  assignedInRound.add(g.id);
              });
              // 输出本轮分组结果
              const area = droneAssignment.grids.reduce((s, g) => s + g.area, 0);
              const eqArea = droneAssignment.grids.reduce((s, g) => s + g.equivalentArea, 0);
              console.log(`第${round}轮 - 无人机: ${droneAssignment.name || droneAssignment.id}，分配网格数: ${droneAssignment.grids.length}，面积: ${area.toFixed(2)}，等效面积: ${eqArea.toFixed(2)}`);
          }
        });
        unassignedGrids = unassignedGrids.filter(g => !assignedInRound.has(g.id));
        if (assignedInRound.size === 0) {
            console.error("无法继续分配，剩余网格可能无法满足任何无人机的最小作业要求。");
            break;
        }
        round++;
      }
      return finalAssignments;
    },

    // --- 策略二：单轮优化分配 ---
    singleRoundOptimalAssignment(allGrids, drones) {
        console.log('🔍 开始单轮优化分配...');
        const sortedDrones = drones.sort((a, b) => (b.efficiency || 1) - (a.efficiency || 1));
        let selectedDrones = [];
        let cumulativeCapacity = 0;
        const totalEquivalentArea = allGrids.reduce((sum, grid) => sum + grid.equivalentArea, 0);
        for (const drone of sortedDrones) {
            selectedDrones.push(drone);
            cumulativeCapacity += drone.maxArea || 50;
            if (cumulativeCapacity >= totalEquivalentArea) {
                break;
            }
        }
        console.log(`🚁 选定 ${selectedDrones.length} 架最高效的无人机执行任务。`);
        const totalSelectedCapacity = selectedDrones.reduce((sum, d) => sum + (d.maxArea || 50), 0);
        const capacityRatios = selectedDrones.map(d => ({...d, ratio: (d.maxArea || 50) / totalSelectedCapacity }));
        const assignments = this.assignGridsByProximity(allGrids, capacityRatios.map(d => ({id: d.id, name: d.name})), capacityRatios.map(d => totalEquivalentArea * d.ratio));
        // 给每个grid加上droneId和roundNumber=1
        assignments.forEach(a => {
          a.grids.forEach(g => {
            g.droneId = a.id;
            g.roundNumber = 1;
          });
          // 输出单轮分组结果
          const area = a.grids.reduce((s, g) => s + g.area, 0);
          const eqArea = a.grids.reduce((s, g) => s + g.equivalentArea, 0);
          console.log(`单轮 - 无人机: ${a.name || a.id}，分配网格数: ${a.grids.length}，面积: ${area.toFixed(2)}，等效面积: ${eqArea.toFixed(2)}`);
        });
        return assignments.map(a => ({...drones.find(d => d.id === a.id), grids: a.grids, totalArea: a.grids.reduce((s,g) => s+g.area, 0), totalEquivalentArea: a.grids.reduce((s,g) => s+g.equivalentArea, 0)}));
    },
    
    // --- 辅助函数 ---
    generateAllGrids() {
      const gridSize = 10; // 或者从配置中读取
      // 健壮性校验
      if (
        !this.selectedField ||
        !Array.isArray(this.selectedField.coordinates) ||
        this.selectedField.coordinates.length < 3 ||
        !this.terrainData ||
        !Array.isArray(this.terrainData.difficultyMatrix) ||
        this.terrainData.difficultyMatrix.length < gridSize
      ) {
        if (this.$message && this.$message.error) {
          this.$message.error('地块或地形数据不完整，请先绘制地块并完成地势分析');
        }
        return [];
      }
      const bounds = this.calculateFieldBounds(this.selectedField.coordinates);
      const lngStep = (bounds.maxLng - bounds.minLng) / gridSize;
      const latStep = (bounds.maxLat - bounds.minLat) / gridSize;
      const grids = [];
      let gridId = 0;
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const center = this.getGridCenterCoordinates(i, j, bounds, gridSize);
          if (this.isPointInPolygon(center, this.selectedField.coordinates)) {
            const corners = [
              [bounds.minLng + i * lngStep, bounds.minLat + j * latStep],
              [bounds.minLng + (i + 1) * lngStep, bounds.minLat + j * latStep],
              [bounds.minLng + (i + 1) * lngStep, bounds.minLat + (j + 1) * latStep],
              [bounds.minLng + i * lngStep, bounds.minLat + (j + 1) * latStep]
            ];
            const area = this.calculateGridArea(corners[0][0], corners[0][1], corners[2][0], corners[2][1]);
            const difficulty = (this.terrainData.difficultyMatrix[i] && this.terrainData.difficultyMatrix[i][j]) || 1.0;
            grids.push({
              id: gridId++,
              i, j, center, corners, area,
              difficulty,
              equivalentArea: area * (1 + difficulty * 1.5), // 简化的等效面积计算
              assignedTo: null
            });
          }
        }
      }
      return grids;
    },

    assignGridsByProximity(grids, drones, capacities) {
      // 这是一个复杂的分配算法，这里用一个简化版实现：
      // 将地块中心作为起点，一圈圈向外分配给不同的无人机
      let assignments = drones.map((d, i) => ({ id: d.id, name: d.name, capacity: capacities[i], grids: [], currentSize: 0 }));
      let unassignedGrids = [...grids].sort((a,b) => a.i*10+a.j - (b.i*10+b.j)); // 简单排序

      unassignedGrids.forEach(grid => {
          // 找到还能装得下的，且最合适的无人机（这里简化为第一个）
          for(let i=0; i<assignments.length; i++) {
              if (assignments[i].currentSize + grid.equivalentArea <= assignments[i].capacity) {
                  assignments[i].grids.push(grid);
                  assignments[i].currentSize += grid.equivalentArea;
                  break; // 分配给第一个后就跳出
              }
          }
      });
      return assignments;
    },

    // 判断点是否在多边形内
    isPointInPolygon(point, polygonCoords) {
      if (!this.clusterMapAPI || !this.clusterMapAPI.GeometryUtil) {
        // 高德API未加载时使用简化的射线法作为备用
        let x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
          let xi = polygonCoords[i][0], yi = polygonCoords[i][1];
          let xj = polygonCoords[j][0], yj = polygonCoords[j][1];
          let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-10) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      } else {
        // 优先使用高德地图官方API，更精确
        const path = polygonCoords.map(([lng, lat]) => new this.clusterMapAPI.LngLat(lng, lat));
        const pointLngLat = new this.clusterMapAPI.LngLat(point[0], point[1]);
        return this.clusterMapAPI.GeometryUtil.isPointInRing(pointLngLat, path);
      }
    },

    // 计算预计完成时间（使用现成的中间值）
    calculateEstimatedCompletionTime() {
      const simpleTime = this.calculateSimpleEstimatedCompletionTime();
      if (simpleTime && simpleTime !== '--') return simpleTime;
      // 兜底用原有复杂算法
      return this.calculateDetailedCompletionTime();
    },

    // 详细计算预计完成时间（原来的方法作为备用）
    calculateDetailedCompletionTime() {
      if (!this.assignmentResults || this.assignmentResults.length === 0) {
        return '--';
      }

      let maxCompletionTime = 0; // 最长时间决定总完成时间

      this.assignmentResults.forEach(assignment => {
        if (!assignment.blocks || assignment.blocks.length === 0) return;

        const flightCount = assignment.blocks.length; // 架次数
        const endurance = assignment.endurance || 60; // 续航时间（分钟）
        const returnTime = 10; // 返航充电时间（分钟）

        // 计算每架次的作业时间（考虑地形难度）
        const avgDifficulty = assignment.blocks.reduce((sum, block) =>
          sum + (block.avgDifficulty || 0), 0) / assignment.blocks.length;

        // 地形难度对作业效率的影响
        const difficultyFactor = this.getDifficultyFactor(avgDifficulty);

        // 每架次的有效作业时间（考虑续航和地形）
        const effectiveFlightTime = Math.min(endurance, endurance * difficultyFactor);

        // 总作业时间 = 架次数 × (有效作业时间 + 返航充电时间)
        const totalTime = flightCount * (effectiveFlightTime + returnTime);

        console.log(`${assignment.name} 详细预计完成时间分析:`, {
          架次数: flightCount,
          续航时间: endurance + '分钟',
          平均地形难度: avgDifficulty.toFixed(2),
          难度系数: difficultyFactor.toFixed(2),
          有效作业时间: effectiveFlightTime.toFixed(1) + '分钟',
          返航充电时间: returnTime + '分钟',
          总时间: totalTime.toFixed(1) + '分钟'
        });

        maxCompletionTime = Math.max(maxCompletionTime, totalTime);
      });

      // 转换为小时和分钟格式
      const hours = Math.floor(maxCompletionTime / 60);
      const minutes = Math.round(maxCompletionTime % 60);

      let timeString = '';
      if (hours > 0) {
        timeString += `${hours}小时`;
      }
      if (minutes > 0 || hours === 0) {
        timeString += `${minutes}分钟`;
      }

      return timeString;
    },

    // 获取地形难度系数
    getDifficultyFactor(difficulty) {
      if (difficulty > 0.9) return 0.6;  // 极难地形，效率降低40%
      if (difficulty > 0.8) return 0.7;  // 困难地形，效率降低30%
      if (difficulty > 0.7) return 0.8;  // 较难地形，效率降低20%
      if (difficulty > 0.6) return 0.85; // 中等难度，效率降低15%
      if (difficulty > 0.5) return 0.9;  // 轻微难度，效率降低10%
      return 1.0;                        // 简单地形，标准效率
    },

    // 重新分配剩余面积
    redistributeRemainingArea(remainingArea, assignments) {
      // 按剩余容量排序
      const availableAssignments = assignments
        .map(a => ({
          ...a,
          remainingCapacity: a.maxArea - a.targetArea
        }))
        .filter(a => a.remainingCapacity > 0)
        .sort((a, b) => b.remainingCapacity - a.remainingCapacity);

      let areaToDistribute = remainingArea;

      for (const assignment of availableAssignments) {
        if (areaToDistribute <= 0) break;

        const canAdd = Math.min(areaToDistribute, assignment.remainingCapacity);
        assignment.targetArea += canAdd;
        areaToDistribute -= canAdd;

        console.log(`重新分配${canAdd.toFixed(2)}亩给${assignment.name}`);
      }
    },

    // 第二步：根据目标亩数创建块状区域
    createBlocksByTargetArea(targetAssignments, difficultyMatrix, areaPerGrid) {
      console.log('🧩 根据目标亩数创建块状区域...');

      const allBlocks = [];

      targetAssignments.forEach((target) => {
        console.log(`为${target.name || '未知无人机'}创建块状区域，目标面积: ${(target.targetArea || 0).toFixed(2)}亩`);

        // 计算需要的网格数
        const requiredGrids = Math.ceil((target.targetArea || 0) / areaPerGrid);

        // 创建适合的块状区域
        const blocks = this.createOptimalBlocksForTarget(requiredGrids, difficultyMatrix, areaPerGrid, target);

        // 标记目标无人机
        blocks.forEach(block => {
          block.targetDroneId = target.id || 'unknown';
          block.targetDroneName = target.name || '未知无人机';
        });

        allBlocks.push(...blocks);
      });

      console.log(`✅ 共创建${allBlocks.length}个块状区域`);
      return allBlocks;
    },

    // 为目标无人机创建最优块状区域
    createOptimalBlocksForTarget(requiredGrids, difficultyMatrix, areaPerGrid, target) {
      const gridSize = 10;
      const blocks = [];

      // 计算最优块数（考虑作业效率）
      const optimalBlockCount = Math.max(1, Math.min(4, Math.ceil(requiredGrids / 10)));

      // 计算每个块需要的网格数
      const gridsPerBlock = Math.ceil(requiredGrids / optimalBlockCount);

      console.log(`${target.name}需要${requiredGrids}个网格，分为${optimalBlockCount}个块，每块约${gridsPerBlock}个网格`);

      // 创建块状区域
      for (let blockIndex = 0; blockIndex < optimalBlockCount; blockIndex++) {
        const block = {
          id: `${target.id}_${blockIndex}`,
          targetDroneId: target.id,
          targetDroneName: target.name,
          grids: [],
          totalArea: 0,
          avgDifficulty: 0,
          maxDifficulty: 0,
          minDifficulty: 1,
          insideGrids: 0,
          outsideGrids: 0,
          centerX: 0,
          centerY: 0,
          shape: 'optimal'
        };

        // 寻找最优的连续网格区域
        const optimalRegion = this.findOptimalGridRegion(gridsPerBlock, difficultyMatrix, blockIndex, optimalBlockCount);

        // 填充块
        optimalRegion.forEach(({i, j}) => {
          const difficulty = difficultyMatrix[i][j];
          const gridCenter = this.getGridCenterCoordinates(i, j, this.calculateFieldBounds(this.selectedField.coordinates), gridSize);
          const isInside = this.isPointInPolygon(gridCenter, this.selectedField.coordinates);

          const grid = {
            i: i,
            j: j,
            difficulty: difficulty,
            area: areaPerGrid,
            isInside: isInside,
            center: gridCenter
          };

          if (isInside) {
            block.grids.push(grid);
            block.totalArea += areaPerGrid;
            block.avgDifficulty += difficulty;
            block.maxDifficulty = Math.max(block.maxDifficulty, difficulty);
            block.minDifficulty = Math.min(block.minDifficulty, difficulty);
            block.insideGrids++;
          } else {
            block.outsideGrids++;
          }
        });

        // 计算平均难度和等效面积
        if (block.grids.length > 0) {
          block.avgDifficulty /= block.grids.length;
          block.equivalentArea = this.calculateSmartEquivalentArea(block);

          // 计算中心点
          const totalCenterX = block.grids.reduce((sum, grid) => sum + grid.center[0], 0);
          const totalCenterY = block.grids.reduce((sum, grid) => sum + grid.center[1], 0);
          block.centerX = totalCenterX / block.grids.length;
          block.centerY = totalCenterY / block.grids.length;

          blocks.push(block);

          console.log(`✅ 块${block.id}: ${(block.totalArea || 0).toFixed(2)}亩, 等效${(block.equivalentArea || 0).toFixed(2)}亩, 难度${(block.avgDifficulty || 0).toFixed(3)}`);
        }
      }

      return blocks;
    },

    // 寻找最优网格区域
    findOptimalGridRegion(requiredGrids, difficultyMatrix, blockIndex, totalBlocks) {
      const gridSize = 10;
      const region = [];

      // 根据块索引确定搜索区域
      const startRow = Math.floor((blockIndex / totalBlocks) * gridSize);
      const endRow = Math.floor(((blockIndex + 1) / totalBlocks) * gridSize);

      // 在指定区域内寻找连续的低难度网格
      for (let i = startRow; i < endRow && region.length < requiredGrids; i++) {
        for (let j = 0; j < gridSize && region.length < requiredGrids; j++) {
          const difficulty = difficultyMatrix[i][j];

          // 优先选择低难度网格
          if (difficulty <= 0.6 || region.length < requiredGrids * 0.8) {
            region.push({i, j, difficulty});
          }
        }
      }

      // 如果还不够，继续搜索
      if (region.length < requiredGrids) {
        for (let i = 0; i < gridSize && region.length < requiredGrids; i++) {
          for (let j = 0; j < gridSize && region.length < requiredGrids; j++) {
            const exists = region.some(r => r.i === i && r.j === j);
            if (!exists) {
              region.push({i, j, difficulty: difficultyMatrix[i][j]});
            }
          }
        }
      }

      return region.slice(0, requiredGrids);
    },

    // 第三步：优化分配以确保均衡作业时间和架数
    optimizeForTimeAndEfficiency(blocks, targetAssignments) {
      console.log('⚡ 优化分配以确保均衡作业时间和架数...');

      // 按目标无人机分组块
      const blocksByDrone = {};
      targetAssignments.forEach(target => {
        blocksByDrone[target.id] = blocks.filter(block => block.targetDroneId === target.id);
      });

      // 计算每个无人机的实际分配
      const finalAssignments = targetAssignments.map(target => {
        const droneBlocks = blocksByDrone[target.id] || [];
        const totalArea = droneBlocks.reduce((sum, block) => sum + (block.totalArea || 0), 0);
        const totalEquivalentArea = droneBlocks.reduce((sum, block) => sum + (block.equivalentArea || 0), 0);

        return {
          id: target.id,
          name: target.name,
          targetArea: target.targetArea,
          actualArea: totalArea,
          actualEquivalentArea: totalEquivalentArea,
          blocks: droneBlocks,
          grids: droneBlocks.flatMap(block =>
            block.grids.map(grid => ({
              i: grid.i,
              j: grid.j,
              blockId: block.id,
              difficulty: grid.difficulty,
              isInside: grid.isInside,
              center: grid.center
            }))
          ),
          totalGrids: droneBlocks.flatMap(b => b.grids).length,
          estimatedFlights: Math.ceil(totalEquivalentArea / 20),
          estimatedTime: this.estimateWorkTime(totalEquivalentArea, target.efficiency),
          efficiency: target.efficiency,
          endurance: target.endurance || 60 // 添加续航时间字段
        };
      });

      // 检查作业时间均衡性
      const maxTime = Math.max(...finalAssignments.map(a => a.estimatedTime));
      const minTime = Math.min(...finalAssignments.map(a => a.estimatedTime));
      const timeDifference = maxTime - minTime;

      console.log('作业时间分析:', {
        maxTime: (maxTime || 0).toFixed(2) + '小时',
        minTime: (minTime || 0).toFixed(2) + '小时',
        timeDifference: (timeDifference || 0).toFixed(2) + '小时',
        balance: (timeDifference || 0) < 2 ? '🟢 均衡' : '🟡 需要调整'
      });

              // 如果时间差异过大，进行微调
        if (timeDifference > 2) {
          console.log('🔄 作业时间差异过大，进行微调...');
          this.balanceWorkTime(finalAssignments);
        }

      return finalAssignments;
    },

    // 平衡作业时间
    balanceWorkTime(assignments) {
      // 按作业时间排序
      const sortedAssignments = [...assignments].sort((a, b) => b.estimatedTime - a.estimatedTime);

      // 尝试从时间最长的无人机转移一些块给时间最短的无人机
      for (let i = 0; i < sortedAssignments.length - 1; i++) {
        const longTimeDrone = sortedAssignments[i];
        const shortTimeDrone = sortedAssignments[sortedAssignments.length - 1];

        if ((longTimeDrone.estimatedTime || 0) - (shortTimeDrone.estimatedTime || 0) > 1) {
          // 寻找可以转移的块
          const transferableBlocks = longTimeDrone.blocks.filter(block =>
            (block.equivalentArea || 0) <= 10 && // 小块更容易转移
            (shortTimeDrone.actualEquivalentArea || 0) + (block.equivalentArea || 0) <= (shortTimeDrone.targetArea || 0) * 1.2 // 不超过目标太多
          );

          if (transferableBlocks.length > 0) {
            const blockToTransfer = transferableBlocks[0];

            // 转移块
            longTimeDrone.blocks = longTimeDrone.blocks.filter(b => b.id !== blockToTransfer.id);
            shortTimeDrone.blocks.push(blockToTransfer);

            // 更新统计数据
            this.updateAssignmentStats(longTimeDrone);
            this.updateAssignmentStats(shortTimeDrone);

            console.log(`🔄 将块${blockToTransfer.id}从${longTimeDrone.name}转移给${shortTimeDrone.name}`);
            break;
          }
        }
      }
    },

    // 计算智能等效面积
    calculateSmartEquivalentArea(block) {
      // 改进的难度因子计算
      const getSmartDifficultyFactor = (diff) => {
        if (diff > 0.9) return 1.8;  // 极难地形
        if (diff > 0.8) return 1.6;  // 困难地形
        if (diff > 0.7) return 1.4;  // 较难地形
        if (diff > 0.6) return 1.2;  // 中等难度
        if (diff > 0.5) return 1.1;  // 轻微难度
        return 1.0;                  // 简单地形
      };

      const difficultyFactor = getSmartDifficultyFactor(block.avgDifficulty || 0);

      // 考虑块的大小和形状
      const sizeFactor = Math.min(1.2, Math.max(0.8, (block.totalArea || 0) / 20)); // 基于20亩标准化
      const shapeFactor = this.calculateShapeFactor(block);

      return (block.totalArea || 0) * difficultyFactor * sizeFactor * shapeFactor;
    },

    // 计算形状因子
    calculateShapeFactor(block) {
      if (block.grids.length === 0) return 1.0;

      // 计算块的紧凑度（越紧凑效率越高）
      const gridPositions = block.grids.map(g => [g.i, g.j]);
      const compactness = this.calculateCompactness(gridPositions);

      return 0.9 + 0.2 * compactness; // 紧凑度越高，因子越接近1.1
    },

    // 计算紧凑度
    calculateCompactness(positions) {
      if (positions.length <= 1) return 1.0;

      // 计算所有点之间的平均距离
      let totalDistance = 0;
      let count = 0;

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[i][0] - positions[j][0];
          const dy = positions[i][1] - positions[j][1];
          totalDistance += Math.sqrt(dx * dx + dy * dy);
          count++;
        }
      }

      const avgDistance = totalDistance / count;
      const maxPossibleDistance = Math.sqrt(200); // 10x10网格的最大距离

      return 1 - (avgDistance / maxPossibleDistance); // 距离越小，紧凑度越高
    },

    // 更新分配统计
    updateAssignmentStats(assignment) {
      assignment.actualArea = assignment.blocks.reduce((sum, block) => sum + (block.totalArea || 0), 0);
      assignment.actualEquivalentArea = assignment.blocks.reduce((sum, block) => sum + (block.equivalentArea || 0), 0);
      assignment.totalGrids = assignment.blocks.flatMap(b => b.grids || []).length;
      assignment.estimatedFlights = Math.ceil((assignment.actualEquivalentArea || 0) / 20);
      assignment.estimatedTime = this.estimateWorkTime(assignment.actualEquivalentArea, assignment.efficiency);
    },

    // 处理无人机数据
    processDroneData() {
      console.log('🛩️ 处理无人机数据...');

      // 检查无人机是否有作业亩数，如果没有则先计算
      const dronesWithoutAreaMu = this.droneList.filter(d => !d.areaMu && !d.maxArea);
      if (dronesWithoutAreaMu.length > 0) {
        console.warn('⚠️ 发现无人机缺少作业亩数，尝试自动计算...');
        this.calculateMissingDroneAreaMu();
      }

      const drones = this.droneList.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type || 'unknown',
        maxArea: parseFloat(d.areaMu || d.maxArea || 0),
        efficiency: this.getDroneEfficiency(d.type || 'unknown'),
        terrainCompatibility: this.getTerrainCompatibility(d.type || 'unknown')
      })).filter(d => d.maxArea > 0);

      console.log('✅ 无人机数据处理完成:', drones.map(d => ({
        name: d.name,
        maxArea: d.maxArea + '亩',
        efficiency: d.efficiency,
        compatibility: d.terrainCompatibility
      })));

      // 如果没有有效的无人机，使用默认值
      if (drones.length === 0) {
        console.warn('⚠️ 没有有效的无人机数据，使用默认配置');
        const defaultDrones = [
          { id: 1, name: '默认无人机1', type: 'spray', maxArea: 50, efficiency: 1.0, terrainCompatibility: 1.0 },
          { id: 2, name: '默认无人机2', type: 'spray', maxArea: 50, efficiency: 1.0, terrainCompatibility: 1.0 },
          { id: 3, name: '默认无人机3', type: 'spray', maxArea: 50, efficiency: 1.0, terrainCompatibility: 1.0 }
        ];
        drones.push(...defaultDrones);
      }

      return drones;
    },

    // 处理working状态的无人机数据
    async processWorkingDroneData(workingDrones) {
      console.log('🛩️ 处理working状态无人机数据...');

      // 检查无人机是否有作业亩数，如果没有则从后端获取
      const dronesWithoutAreaMu = workingDrones.filter(d => !d.areaMu && !d.maxArea);
      if (dronesWithoutAreaMu.length > 0) {
        console.log('⚠️ 发现无人机缺少作业亩数，从后端获取...');
        await this.fetchDroneAreaMuFromBackend(dronesWithoutAreaMu);
      }

      const drones = workingDrones.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type || 'unknown',
        maxArea: parseFloat(d.areaMu || d.maxArea || 0),
        efficiency: this.getDroneEfficiency(d.type || 'unknown'),
        terrainCompatibility: this.getTerrainCompatibility(d.type || 'unknown')
      })).filter(d => d.maxArea > 0);

      console.log('✅ working状态无人机数据处理完成:', drones.map(d => ({
        name: d.name,
        maxArea: d.maxArea + '亩',
        efficiency: d.efficiency,
        compatibility: d.terrainCompatibility
      })));

      // 如果没有有效的无人机，提示用户
      if (drones.length === 0) {
        throw new Error('没有有效的working状态无人机数据，请检查无人机配置');
      }

      return drones;
    },

    // 从后端获取无人机作业亩数
    async fetchDroneAreaMuFromBackend(drones) {
      try {
        // 使用新的API端点获取所有working状态无人机的作业亩数
        const response = await fetch(`http://localhost:5000/api/drones/working/area_mu`);
        const result = await response.json();

        if (result.code === 0) {
          // 创建无人机ID到作业亩数的映射
          const droneAreaMap = {};
          result.data.forEach(droneData => {
            droneAreaMap[droneData.id] = droneData.area_mu;
          });

          // 更新传入的无人机列表
          drones.forEach(drone => {
            if (droneAreaMap[drone.id]) {
              drone.areaMu = droneAreaMap[drone.id];
              console.log(`获取无人机${drone.name}的作业亩数: ${drone.areaMu}亩`);
            } else {
              console.warn(`未找到无人机${drone.name}的作业亩数，使用默认值`);
              drone.areaMu = 50;
            }
          });
        } else {
          console.warn(`获取无人机作业亩数失败: ${result.msg}`);
          // 使用默认值
          drones.forEach(drone => {
            drone.areaMu = 50;
          });
        }
      } catch (error) {
        console.error('从后端获取无人机作业亩数失败:', error);
        // 为所有无人机设置默认值
        drones.forEach(drone => {
          drone.areaMu = 50;
        });
      }
    },

    // 获取无人机效率因子
    getDroneEfficiency(type) {
      const efficiencyMap = {
        'spray': 1.0,      // 喷药无人机
        'recognition': 0.8, // 识别无人机
        'mapping': 0.9,     // 测绘无人机
        'unknown': 1.0      // 未知类型
      };
      return efficiencyMap[type] || 1.0;
    },

    // 获取地形兼容性
    getTerrainCompatibility(type) {
      const compatibilityMap = {
        'spray': 0.9,      // 喷药无人机对地形敏感
        'recognition': 1.0, // 识别无人机适应性较强
        'mapping': 1.0,     // 测绘无人机适应性较强
        'unknown': 1.0      // 未知类型
      };
      return compatibilityMap[type] || 1.0;
    },

    calculateSuggestedDrones() {
      const area = this.selectedField.area;
      const terrainAnalysis = this.terrainData?.analysis;
      const terrainType = this.terrainData?.terrain_type;

      // 基础配置
      let recognitionDrones = Math.ceil(area / 25); // 每25亩1架识别无人机
      let sprayDrones = Math.ceil(area / 15);       // 每15亩1架喷药无人机

      // 根据改进的地势分析调整
      if (terrainAnalysis) {
        const totalDifficulty = terrainAnalysis.total_difficulty;
        const avgSlope = terrainAnalysis.terrain_stats.avg_slope;
        const maxSlope = terrainAnalysis.terrain_stats.max_slope;
        const roughness = terrainAnalysis.terrain_stats.roughness;

        // 基于总难度调整
        if (totalDifficulty > 0.7) {
          recognitionDrones = Math.ceil(recognitionDrones * 1.8);  // 复杂地形增加80%
          sprayDrones = Math.ceil(sprayDrones * 1.8);
        } else if (totalDifficulty > 0.5) {
          recognitionDrones = Math.ceil(recognitionDrones * 1.4);  // 中等地形增加40%
          sprayDrones = Math.ceil(sprayDrones * 1.4);
        } else if (totalDifficulty > 0.3) {
          recognitionDrones = Math.ceil(recognitionDrones * 1.2);  // 轻微地形增加20%
          sprayDrones = Math.ceil(sprayDrones * 1.2);
        } else {
          recognitionDrones = Math.ceil(recognitionDrones * 0.9);  // 简单地形减少10%
          sprayDrones = Math.ceil(sprayDrones * 0.9);
        }

        // 基于坡度进一步调整
        if (avgSlope > 20) {
          recognitionDrones = Math.ceil(recognitionDrones * 1.2);
          sprayDrones = Math.ceil(sprayDrones * 1.2);
        } else if (avgSlope > 10) {
          recognitionDrones = Math.ceil(recognitionDrones * 1.1);
          sprayDrones = Math.ceil(sprayDrones * 1.1);
        }

        // 基于最大坡度进一步调整
        if (maxSlope > 30) {
          recognitionDrones = Math.ceil(recognitionDrones * 1.3);
          sprayDrones = Math.ceil(sprayDrones * 1.3);
        } else if (maxSlope > 20) {
          recognitionDrones = Math.ceil(recognitionDrones * 1.15);
          sprayDrones = Math.ceil(sprayDrones * 1.15);
        }

        // 基于地形粗糙度调整
        if (roughness > 30) {
          recognitionDrones = Math.ceil(recognitionDrones * 1.15);
          sprayDrones = Math.ceil(sprayDrones * 1.15);
        }
      }

      // 限制最大数量
      recognitionDrones = Math.min(recognitionDrones, 6);
      sprayDrones = Math.min(sprayDrones, 10);

      // 根据地形复杂度调整作业时间
      let baseEfficiency = 5; // 基础效率：每架无人机每小时作业5亩
      if (terrainAnalysis) {
        const totalDifficulty = terrainAnalysis.total_difficulty;
        if (totalDifficulty > 0.7) {
          baseEfficiency = 2.5; // 复杂地形效率降低
        } else if (totalDifficulty > 0.5) {
          baseEfficiency = 3.5;
        } else if (totalDifficulty > 0.3) {
          baseEfficiency = 4.2;
        }
      }

      const estimatedTime = (area / (sprayDrones * baseEfficiency)).toFixed(1);

      return {
        recognition: recognitionDrones,
        spray: sprayDrones,
        estimatedTime: estimatedTime,
        terrainFactors: terrainAnalysis ? {
          difficulty: terrainAnalysis.total_difficulty.toFixed(3),
          avgSlope: terrainAnalysis.terrain_stats.avg_slope.toFixed(1),
          maxSlope: terrainAnalysis.terrain_stats.max_slope.toFixed(1),
          roughness: terrainAnalysis.terrain_stats.roughness.toFixed(2),
          terrainType: this.getTerrainTypeName(terrainType)
        } : null
      };
    },

    // 地图相关方法
    async initClusterMap() {
      try {
        console.log('开始初始化地图...');
        await this.loadAMap();
        console.log('AMap API 加载完成');
        await this.initMap();
        console.log('地图初始化完成');
        // 注释掉绘制工具相关
        // this.setupDrawingTools();
        this.addAgriculturalLayers();
        console.log('所有组件初始化完成');
        this.checkMapStatus();
        this.$message.success('地图初始化成功');
      } catch (error) {
        console.error('地图初始化失败:', error);
        console.error('错误详情:', {
          message: error.message,
          stack: error.stack
        });
        this.$message.error(`地图初始化失败: ${error.message}`);
      }
    },

    async loadAMap() {
      return new Promise((resolve, reject) => {
        // 只判断主库，不判断 DrawingManager
        if (window.AMap) {
          this.clusterMapAPI = window.AMap;
          return resolve();
        }

        window.initClusterMap = () => {
          if (window.AMap) {
            this.clusterMapAPI = window.AMap;
            resolve();
          } else {
            reject(new Error('高德地图主库加载失败'));
          }
        };

        // 插入主库script，去掉 DrawingManager 插件
        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${this.gaodeApiKey}&callback=initClusterMap&plugin=AMap.GeometryUtil,AMap.ToolBar,AMap.Scale`;
        script.onerror = (err) => {
          console.error('高德地图脚本加载失败', err);
          reject(new Error('高德地图脚本加载失败'));
        };
        document.head.appendChild(script);
      });
    },

    async initMap() {
      if (!this.clusterMapAPI) {
        throw new Error('AMap API 未加载');
      }

      // 检查容器是否存在
      const container = document.getElementById('cluster-map-container');
      if (!container) {
        throw new Error('地图容器不存在，请检查DOM渲染');
      }

      // 获取用户位置
      let userLocation = [116.397428, 39.90923]; // 默认北京
      try {
        userLocation = await this.getUserLocation();
        console.log('获取到用户位置:', userLocation);
      } catch (error) {
        console.warn('无法获取用户位置，使用默认位置:', error);
      }

      this.clusterMap = new this.clusterMapAPI.Map('cluster-map-container', {
        viewMode: '2D',
        zoom: 15,
        center: userLocation,
        features: ['bg', 'road', 'building'],
        showIndoorMap: false,
        expandZoomRange: true
      });

      // 添加地图控件
      this.clusterMapAPI.plugin(['AMap.ToolBar', 'AMap.Scale'], () => {
        this.clusterMap.addControl(new this.clusterMapAPI.ToolBar({
          position: { right: '10px', top: '50px' }
        }));
        this.clusterMap.addControl(new this.clusterMapAPI.Scale());
      });

      // 添加当前位置标记
      this.addCurrentLocationMarker(userLocation);

      // 等待地图完全加载
      return new Promise((resolve) => {
        this.clusterMap.on('complete', () => {
          console.log('地图完全加载完成');
          resolve();
        });
      });
    },

    // 注释掉 setupDrawingTools 整个方法
    // setupDrawingTools() {
    //   try {
    //     console.log('开始初始化绘制工具...');
    //     this.drawingManager = new this.clusterMapAPI.DrawingManager(this.clusterMap, {
    //       isOpen: false,
    //       drawMode: 'polygon',
    //       polygonOptions: {
    //         strokeColor: '#FF0000',
    //         strokeWeight: 2,
    //         fillColor: '#FF0000',
    //         fillOpacity: 0.3
    //       }
    //     });
    //     this.drawingManager.on('draw', (e) => {
    //       console.log('绘制完成事件触发:', e);
    //       this.handlePolygonDrawn(e.overlay);
    //     });
    //     console.log('绘制工具初始化成功');
    //     this.$message.success('绘制工具已就绪');
    //   } catch (error) {
    //     console.error('绘制工具初始化失败:', error);
    //     this.$message.warning('绘制工具初始化失败，将使用手动绘制模式');
    //   }
    // },

    addAgriculturalLayers() {
      // 添加农业专题图层
      const agriculturalLayer = new this.clusterMapAPI.TileLayer({
        zIndex: 10,
        opacity: 0.6,
        url: 'https://webst0{1-4}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
      });

      this.clusterMap.add(agriculturalLayer);
    },

    handlePolygonDrawn(polygon) {
      // 清除之前的选中多边形
      if (this.selectedPolygon) {
        this.clusterMap.remove(this.selectedPolygon);
      }
      // 清理手动绘制状态
      this.cleanupManualDrawing();
      this.selectedPolygon = polygon;
      // 计算面积
      const area = this.calculatePolygonArea(polygon);
      // 获取中心点，兼容不同多边形对象
      let center;
      if (typeof polygon.getCenter === 'function') {
        center = polygon.getCenter();
      } else if (typeof polygon.getBounds === 'function' && polygon.getBounds()) {
        center = polygon.getBounds().getCenter();
      } else {
        const path = polygon.getPath();
        center = path && path[0];
      }
      // 获取边界
      const bounds = polygon.getBounds();
      // 更新选中地块信息（仅在用户绘制后赋值，页面加载不赋值）
      this.selectedField = {
        area: isNaN(area) ? 0 : area,
        center: center ? `${center.getLng().toFixed(6)}, ${center.getLat().toFixed(6)}` : '',
        coordinates: polygon.getPath().map(point => [point.getLng(), point.getLat()]),
        bounds: bounds ? {
          southwest: [bounds.getSouthWest().getLng(), bounds.getSouthWest().getLat()],
          northeast: [bounds.getNorthEast().getLng(), bounds.getNorthEast().getLat()]
        } : null
      };
      // 同步更新需要作业的亩数
      this.calculatedWorkArea = isNaN(area) ? 0 : area;
      localStorage.setItem('selectedField', JSON.stringify(this.selectedField));
      console.log('地块信息:', this.selectedField);
      // 获取地势数据
      this.getTerrainData(bounds);
      // 关闭绘制工具（备用模式无此操作）
      // if (this.drawingManager) {
      //   this.drawingManager.close();
      // }
      this.$message.success(`地块选择完成！面积: ${area.toFixed(2)} 亩，正在分析地势数据...`);
    },

    cleanupManualDrawing() {
      // 清理手动绘制的元素
      this.manualMarkers.forEach(marker => {
        if (marker && this.clusterMap) {
          this.clusterMap.remove(marker);
        }
      });

      if (this.manualPolyline && this.clusterMap) {
        this.clusterMap.remove(this.manualPolyline);
      }

      if (this.manualPolygon && this.clusterMap) {
        this.clusterMap.remove(this.manualPolygon);
      }

      // 重置状态
      this.manualDrawingPoints = [];
      this.manualMarkers = [];
      this.manualPolyline = null;
      this.manualPolygon = null;
      this.isManualDrawing = false;
    },

    calculatePolygonArea(polygon) {
      const path = polygon.getPath();
      console.log('polygon path:', path);
      if (!this.clusterMapAPI || !this.clusterMapAPI.GeometryUtil || typeof this.clusterMapAPI.GeometryUtil.ringArea !== 'function') {
        console.error('GeometryUtil.ringArea 未加载或不可用');
        return 0;
      }
      const area = this.clusterMapAPI.GeometryUtil.ringArea(path);
      console.log('raw area:', area);
      const areaMu = area / 666.67;
      console.log('area (mu):', areaMu);
      return isNaN(areaMu) ? 0 : areaMu;
    },

    async getTerrainData(bounds) {
      this.terrainLoading = true;
      try {
        const response = await fetch(`http://localhost:5000/api/terrain/analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bounds: {
              southwest: [bounds.getSouthWest().getLng(), bounds.getSouthWest().getLat()],
              northeast: [bounds.getNorthEast().getLng(), bounds.getNorthEast().getLat()]
            },
            apiKey: this.gaodeApiKey,
            coordinates: this.selectedField?.coordinates // 支持多边形
          })
        });
        if (!response.ok) {
          throw new Error('地势数据获取失败');
        }
        const result = await response.json();

        // 确保在访问前 this.terrainData 已被初始化
        this.terrainData = result.data || {}; 

        this.comprehensiveMatrix = this.terrainData.comprehensive_matrix;
        // 打印作业难度矩阵
        if (this.terrainData && this.terrainData.difficultyMatrix) {
          console.log('作业难度矩阵 difficultyMatrix:', this.terrainData.difficultyMatrix);
        }

        // 自动生成等高线
        await this.autoGenerateContourLines();

        // 自动生成插值数据（如果还没有的话）
        if (this.terrainData && !this.comprehensiveMatrix) {
          await this.autoGenerateInterpolationData();
        }

        // === 存储到全局store，并打印 ===
        this.setRegionData({
          field: this.selectedField, // 多边形点位
          terrainData: this.terrainData, // 100个高程点和分析
          comprehensiveMatrix: this.comprehensiveMatrix,
          contourLines: this.contourLines // 等高线数据
        });
        console.log('[地块存储] 已存入store:', {
          field: this.selectedField,
          terrainData: this.terrainData,
          comprehensiveMatrix: this.comprehensiveMatrix,
          contourLines: this.contourLines
        });

        this.$message.success('地势分析完成，已自动生成等高线和插值数据！');
        if (this.terrainData && this.terrainData.difficultyMatrix) {
          localStorage.setItem('difficultyMatrix', JSON.stringify(this.terrainData.difficultyMatrix));
          console.log('地形难度矩阵:', this.terrainData.difficultyMatrix);
        }
        localStorage.setItem('terrainData', JSON.stringify(this.terrainData));
      } catch (error) {
        console.error('获取地势数据失败:', error);
        this.$message.warning('地势数据获取失败，使用默认值');
      } finally {
        this.terrainLoading = false;
      }
    },

    // 🆕 自动生成等高线方法
    async autoGenerateContourLines() {
      if (!this.selectedField?.coordinates) {
        console.warn('没有地块坐标，跳过等高线生成');
        return;
      }

      try {
        console.log('自动生成等高线，发送前校准坐标...');

        // 坐标系校准：发送给后端前，将高德地图的 GCJ-02 坐标转换为 WGS-84
        const wgs84Coordinates = this.selectedField.coordinates.map(([lng, lat]) =>
          coordtransform.gcj02towgs84(lng, lat)
        );

        const response = await fetch('http://localhost:5000/api/terrain/contour-lines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: wgs84Coordinates // 发送WGS-84坐标
          })
        });

        const result = await response.json();
        if (result.code === 0) {
          // 坐标系转换：将后端返回的 WGS-84 坐标转换为高德地图的 GCJ-02 坐标
          this.contourLines = result.data.contour_lines.map(line => ({
            ...line,
            coordinates: line.coordinates.map(([lng, lat]) => coordtransform.wgs84togcj02(lng, lat))
          }));
          this.showContourLines = true;
          console.log(`自动生成${this.contourLines.length}条等高线，并已完成坐标校准`);

          // 如果当前在2D地图，自动显示等高线
          if (!this.show3DMap && this.clusterMap) {
            this.displayContourLines();
          }
        } else {
          console.warn('自动生成等高线失败:', result.msg);
        }
        localStorage.setItem('contourLines', JSON.stringify(this.contourLines));
      } catch (error) {
        console.error('自动生成等高线失败:', error);
      }
    },

    // 🆕 自动生成插值数据方法
    async autoGenerateInterpolationData() {
      if (!this.selectedField?.coordinates) {
        console.warn('没有地块坐标，跳过插值数据生成');
        return;
      }

      try {
        console.log('自动生成插值数据...');

        // 这里可以调用后端的插值API，或者使用已有的comprehensive_matrix
        // 如果后端有专门的插值API，可以在这里调用
        if (this.terrainData && this.terrainData.comprehensive_matrix) {
          this.comprehensiveMatrix = this.terrainData.comprehensive_matrix;
          console.log('插值数据已从地势数据中获取');
        } else {
          console.log('插值数据生成完成');
        }
      } catch (error) {
        console.error('自动生成插值数据失败:', error);
      }
    },

    async getUserLocation() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('浏览器不支持地理位置'));
          return;
        }

        const options = {
          enableHighAccuracy: true,  // 高精度
          timeout: 10000,           // 10秒超时
          maximumAge: 60000         // 缓存1分钟
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log('GPS坐标:', { latitude, longitude });

            // 转换为高德地图坐标
            this.convertToAMapCoordinates(longitude, latitude)
              .then(amapCoords => {
                resolve(amapCoords);
              })
              .catch(error => {
                console.warn('坐标转换失败，使用原始坐标:', error);
                resolve([longitude, latitude]);
              });
          },
          (error) => {
            console.error('获取位置失败:', error);
            let errorMessage = '获取位置失败';

            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = '用户拒绝了位置请求';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = '位置信息不可用';
                break;
              case error.TIMEOUT:
                errorMessage = '获取位置超时';
                break;
              default:
                errorMessage = '未知错误';
            }

            reject(new Error(errorMessage));
          },
          options
        );
      });
    },

    async convertToAMapCoordinates(lng, lat) {
      // 高德地图坐标转换API
      try {
        const response = await fetch(
          `https://restapi.amap.com/v3/assistant/coordinate/convert?key=${this.gaodeApiKey}&locations=${lng},${lat}&coordsys=gps`
        );

        if (!response.ok) {
          throw new Error('坐标转换API请求失败');
        }

        const data = await response.json();

        if (data.status === '1' && data.locations) {
          const [amapLng, amapLat] = data.locations.split(',').map(Number);
          return [amapLng, amapLat];
        } else {
          throw new Error('坐标转换失败');
        }
      } catch (error) {
        console.error('坐标转换失败:', error);
        // 如果转换失败，返回原始坐标
        return [lng, lat];
      }
    },

    addCurrentLocationMarker(location) {
      if (!this.clusterMapAPI || !this.clusterMap) return;

      // 创建当前位置标记
      const marker = new this.clusterMapAPI.Marker({
        position: new this.clusterMapAPI.LngLat(location[0], location[1]),
        title: '当前位置',
        icon: new this.clusterMapAPI.Icon({
          size: new this.clusterMapAPI.Size(32, 32),
          image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTIiIGZpbGw9IiM0Q0FGNTAiLz4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
          imageSize: new this.clusterMapAPI.Size(32, 32)
        })
      });

      // 添加信息窗口
      const infoWindow = new this.clusterMapAPI.InfoWindow({
        content: `
          <div style="padding: 10px;">
            <h4 style="margin: 0 0 5px 0; color: #4CAF50;">当前位置</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">
              经度: ${location[0].toFixed(6)}<br>
              纬度: ${location[1].toFixed(6)}
            </p>
          </div>
        `,
        offset: new this.clusterMapAPI.Pixel(0, -30)
      });

      // 点击标记显示信息窗口
      marker.on('click', () => {
        infoWindow.open(this.clusterMap, location);
      });

      this.clusterMap.add(marker);

      // 保存标记引用
      this.currentLocationMarker = marker;

      console.log('当前位置标记已添加:', location);
    },

    // 无人机管理相关方法
    handleDroneList() {
      // 跳转到无人机详情页面
      this.$router.push('/DronesDetails');
    },
    // 故障模拟相关方法
    simulateFault() {
      if (!this.selectedDrone || !this.faultType) {
        this.$message.warning('请选择无人机和故障类型');
        return;
      }
      // TODO: 实现故障模拟逻辑
      console.log(`模拟故障: ${this.selectedDrone} - ${this.faultType}`);
      this.$message.success('故障模拟已触发');
    },
    handleRelocate() {
      this.$message.info('正在获取当前位置...');
      this.getUserLocation()
        .then(location => {
          // 移除旧的当前位置标记
          if (this.currentLocationMarker) {
            this.clusterMap.remove(this.currentLocationMarker);
          }

          // 重新定位地图
          this.clusterMap.setZoomAndCenter(15, location);

          // 添加新的当前位置标记
          this.addCurrentLocationMarker(location);

          this.$message.success('已重新定位到当前位置');
        })
        .catch(error => {
          console.error('重新定位失败:', error);
          this.$message.error(`重新定位失败: ${error.message}`);
        });
    },
    closeFieldInfo() {
      // 修正：关闭弹窗时清空地块信息
      this.selectedField = null;
    },
    getTerrainTypeName(type) {
      switch (type) {
        case 'flat_plain':
          return '平原';
        case 'gentle_hills':
          return '缓坡丘陵';
        case 'moderate_hills':
          return '中等丘陵';
        case 'steep_hills':
          return '陡坡丘陵';
        case 'mountainous':
          return '山地';
        default:
          return '未知地形';
      }
    },

    // 综合分析矩阵相关方法（删除重复定义，保留后面的版本）
    getFlightHeight(avgSlope) {
      if (avgSlope > 20) return '80-100';
      if (avgSlope > 10) return '60-80';
      return '40-60';
    },

    getFlightSpeed(difficulty) {
      if (difficulty > 0.7) return '3-5';
      if (difficulty > 0.5) return '5-7';
      if (difficulty > 0.3) return '7-9';
      return '9-12';
    },

    getBatteryStrategy(difficulty) {
      if (difficulty > 0.7) return '40%储备，15分钟作业';
      if (difficulty > 0.5) return '30%储备，20分钟作业';
      if (difficulty > 0.3) return '25%储备，25分钟作业';
      return '20%储备，30分钟作业';
    },

    getSafetyDistance(maxSlope) {
      if (maxSlope > 30) return '50';
      if (maxSlope > 20) return '30';
      if (maxSlope > 10) return '20';
      return '15';
    },



    // 3D地图相关方法
    async load3DMapAPI() {
      return new Promise((resolve, reject) => {
        if (window.AMap) {
          this.map3DAPI = window.AMap;
          resolve();
          return;
        }

        // 加载高德地图3D API
        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${this.gaodeApiKey}&plugin=AMap.ToolBar,AMap.Scale,AMap.TileLayer`;
        script.onload = () => {
          if (window.AMap) {
            this.map3DAPI = window.AMap;
            resolve();
          } else {
            reject(new Error('3D地图API加载失败'));
          }
        };
        script.onerror = () => reject(new Error('3D地图API加载失败'));
        document.head.appendChild(script);
      });
    },

    async init3DMap() {
      try {
        await this.load3DMapAPI();

        const container = document.getElementById('3d-map-container');
        if (!container) {
          throw new Error('3D地图容器不存在');
        }

        // 设置3D地图选项
        const options = {
          ...this.map3DOptions,
          center: this.selectedField ? this.selectedField.center.split(',').map(Number) : this.map3DOptions.center
        };

        this.map3D = new this.map3DAPI.Map('3d-map-container', options);

        // 添加地图控件
        this.map3D.addControl(new this.map3DAPI.ToolBar({
          position: { right: '10px', top: '50px' }
        }));
        this.map3D.addControl(new this.map3DAPI.Scale());

        // 如果有选中的地块，显示地块边界
        if (this.selectedField && this.selectedPolygon) {
          this.addPolygonTo3DMap();
        }

        // 添加当前位置标记
        if (this.currentLocationMarker) {
          const position = this.currentLocationMarker.getPosition();
          this.addCurrentLocationMarker([position.getLng(), position.getLat()]);
        }

        this.$message.success('3D地图初始化成功');
      } catch (error) {
        console.error('3D地图初始化失败:', error);
        this.$message.error(`3D地图初始化失败: ${error.message}`);
      }
    },

    // 添加地块多边形到3D地图
    addPolygonTo3DMap() {
      if (!this.map3D || !this.selectedField?.coordinates) return;

      const path = this.selectedField.coordinates.map(coord =>
        new this.map3DAPI.LngLat(coord[0], coord[1])
      );

      // 创建地块边界多边形
      const polygon = new this.map3DAPI.Polygon({
        path: path,
        strokeColor: '#FF0000',
        strokeWeight: 3,
        strokeOpacity: 0.8,
        fillColor: '#FF0000',
        fillOpacity: 0.2
      });

      // 添加边界点标记
      this.selectedField.coordinates.forEach((coord, index) => {
        const marker = new this.map3DAPI.Marker({
          position: new this.map3DAPI.LngLat(coord[0], coord[1]),
          title: `边界点 ${index + 1}`,
          label: {
            content: `${index + 1}`,
            direction: 'top'
          },
          icon: new this.map3DAPI.Icon({
            size: new this.map3DAPI.Size(20, 20),
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0iI0ZGNzAwMCIvPgo8Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI0IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4=',
            imageSize: new this.map3DAPI.Size(20, 20)
          })
        });
        this.map3D.add(marker);
        this.terrainMarkers.push(marker);
      });

      this.map3D.add(polygon);
      this.terrainMarkers.push(polygon);
      this.map3D.setFitView([polygon]);

      // 调整3D视角以更好地显示地形
      this.map3D.setPitch(45);
      this.map3D.setZoom(16);
    },

    // 切换到3D地图
    async switchTo3D() {
      try {
        // 清除分配结果可视化
        this.clearAssignmentVisualization();

        this.show3DMap = true;
        await this.$nextTick();
        await this.init3DMap();
        return true;
      } catch (error) {
        console.error('切换到3D地图失败:', error);
        this.$message.error('切换到3D地图失败');
        this.show3DMap = false;
        throw error;
      }
    },

    // 切换地图模式
    switchTo2D() {
      this.show3DMap = false;



      if (this.map3D) {
        // 清理热力图
        if (this.slopeHeatmap) {
          this.map3D.remove(this.slopeHeatmap);
          this.slopeHeatmap = null;
        }

        // 清理地形标记
        if (this.terrainMarkers && this.terrainMarkers.length > 0) {
          this.terrainMarkers.forEach(marker => {
            this.map3D.remove(marker);
          });
          this.terrainMarkers = [];
        }

        this.map3D.destroy();
        this.map3D = null;
      }
      if (this.terrainLayer) {
        this.terrainLayer.destroy();
        this.terrainLayer = null;
      }

      // 切换回2D时自动显示分配结果
      this.$nextTick(() => {
        if (this.assignmentResults && this.assignmentResults.length > 0) {
          this.visualizeAssignmentResults();
        }
      });

      this.$message.success('已切换到2D地图模式');
    },

    // 重置3D视角
    reset3DView() {
      if (this.map3D) {
        this.map3D.setPitch(this.map3DOptions.pitch);
        this.map3D.setBearing(this.map3DOptions.bearing);
        this.map3D.setZoom(this.map3DOptions.zoom);
        this.$message.success('3D地图视角已重置');
      }
    },

    // 切换地形图层
    toggleTerrainLayer() {
      if (!this.terrainLayer) {
        // 添加卫星图层作为地形显示
        this.terrainLayer = new this.map3DAPI.TileLayer({
          zIndex: 10,
          opacity: 0.7,
          url: 'https://webst0{1-4}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
        });
        this.map3D.add(this.terrainLayer);
        this.showTerrainLayer = true;
        this.$message.success('已显示卫星地形图层');
      } else {
        this.map3D.remove(this.terrainLayer);
        this.terrainLayer = null;
        this.showTerrainLayer = false;
        this.$message.success('已隐藏卫星地形图层');
      }
    },

    // 获取3D地形数据
    async get3DTerrainData() {
      if (!this.selectedField || !this.selectedField.coordinates) {
        this.$message.warning('请先选择地块');
        return;
      }

      try {
        this.$message.info('正在获取3D地形数据...');

        // 调用后端API获取3D地形数据
        const response = await fetch('http://127.0.0.1:5000/api/terrain/3d', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: this.selectedField.coordinates,
            resolution: 'high' // 高分辨率
          })
        });

        const result = await response.json();
        if (result.code === 0) {
          this.terrain3DData = result.data;
          this.display3DTerrainData(result.data);
          this.$message.success('3D地形数据获取成功，已在地图上显示地形效果');
        } else {
          this.$message.error(result.msg || '3D地形数据获取失败');
        }
      } catch (error) {
        console.error('获取3D地形数据失败:', error);
        this.$message.error('3D地形数据获取失败');
      }
    },

    // 显示3D地形数据
    display3DTerrainData(terrainData) {
      if (!this.map3D) return;

      // 创建3D地形可视化
      const { elevations, coordinates, slopes, grid_data } = terrainData;

      // 清除之前的地形标记
      if (this.terrainMarkers) {
        this.terrainMarkers.forEach(marker => {
          this.map3D.remove(marker);
        });
      }
      this.terrainMarkers = [];

      // 添加高程标记点
      coordinates.forEach((coord, index) => {
        const marker = new this.map3DAPI.Marker({
          position: new this.map3DAPI.LngLat(coord[0], coord[1]),
          title: `高程: ${elevations[index].toFixed(1)}m, 坡度: ${slopes[index].toFixed(1)}°`,
          label: {
            content: `${elevations[index].toFixed(0)}m`,
            direction: 'top',
            style: {
              color: '#fff',
              fontSize: '10px',
              backgroundColor: '#333',
              border: '1px solid #fff',
              borderRadius: '2px',
              padding: '2px 4px'
            }
          },
          icon: new this.map3DAPI.Icon({
            size: new this.map3DAPI.Size(12, 12),
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjYiIGZpbGw9IiM0Q0FGNTAiLz4KPC9zdmc+',
            imageSize: new this.map3DAPI.Size(12, 12)
          })
        });
        this.map3D.add(marker);
        this.terrainMarkers.push(marker);
      });

      // 添加坡度热力图
      if (slopes && slopes.length > 0) {
        this.addSlopeHeatmap(slopes, coordinates);
      }

      // 创建3D地形网格
      if (grid_data && grid_data.elevation_grid) {
        this.create3DTerrainMesh(grid_data);
      }

      // 调整视角以更好地显示3D地形
      this.map3D.setPitch(60);
      this.map3D.setZoom(17);

      this.$message.success(`已显示${coordinates.length}个地形采样点的3D数据`);
    },

    // 添加坡度热力图
    addSlopeHeatmap(slopes, coordinates) {
      const heatmapData = coordinates.map((coord, index) => ({
        lng: coord[0],
        lat: coord[1],
        count: slopes[index] || 0
      }));

      // 创建热力图并添加到地图
      const heatmap = new this.map3DAPI.HeatMap(this.map3D, {
        dataSet: {
          data: heatmapData,
          max: Math.max(...slopes)
        },
        radius: 25,
        opacity: [0, 0.8]
      });

      // 将热力图添加到地图
      this.map3D.add(heatmap);

      // 保存热力图引用以便后续管理
      this.slopeHeatmap = heatmap;
    },

    // 绘制3D地形
    async draw3DTerrain() {
      console.log('开始绘制3D地形...');
      console.log('map3D状态:', !!this.map3D);
      console.log('terrainData状态:', !!this.terrainData);

      if (!this.map3D) {
        this.$message.error('3D地图未初始化，请重试');
        return;
      }

      if (!this.terrainData) {
        this.$message.error('地形数据未准备好，请先获取地势数据');
        return;
      }

      try {
        this.$message.info('正在绘制3D地形...');

        // 清除之前的地形标记
        this.clear3DTerrainMarkers();

        // 绘制地块边界
        this.drawPolygonBoundary();

        // 绘制高程点
        this.drawElevationPoints();

        // 绘制难度标记点
        this.drawSlopeHeatmap();

        // 绘制等高线
        this.drawContourLines();

        // 调整视角
        this.adjust3DView();

        this.$message.success('3D地形绘制完成！');
      } catch (error) {
        console.error('3D地形绘制失败:', error);
        this.$message.error('3D地形绘制失败: ' + error.message);
      }
    },

    // 清除3D地形标记
    clear3DTerrainMarkers() {
      if (this.terrainMarkers && this.terrainMarkers.length > 0) {
        this.terrainMarkers.forEach(marker => {
          if (marker && this.map3D) {
            this.map3D.remove(marker);
          }
        });
        this.terrainMarkers = [];
      }

      if (this.slopeHeatmap) {
        this.map3D.remove(this.slopeHeatmap);
        this.slopeHeatmap = null;
      }
    },

    // 绘制地块边界
    drawPolygonBoundary() {
      if (!this.selectedField?.coordinates || !this.map3D) return;

      const path = this.selectedField.coordinates.map(coord =>
        new this.map3DAPI.LngLat(coord[0], coord[1])
      );

      const polygon = new this.map3DAPI.Polygon({
        path: path,
        strokeColor: '#FF0000',
        strokeWeight: 3,
        strokeOpacity: 0.8,
        fillColor: '#FF0000',
        fillOpacity: 0.1
      });

      this.map3D.add(polygon);
      this.terrainMarkers.push(polygon);

      // 添加边界点标记
      this.selectedField.coordinates.forEach((coord, index) => {
        const marker = new this.map3DAPI.Marker({
          position: new this.map3DAPI.LngLat(coord[0], coord[1]),
          title: `边界点 ${index + 1}`,
          label: {
            content: `${index + 1}`,
            direction: 'top'
          },
          icon: new this.map3DAPI.Icon({
            size: new this.map3DAPI.Size(20, 20),
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0iI0ZGNzAwMCIvPgo8Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI0IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4=',
            imageSize: new this.map3DAPI.Size(20, 20)
          })
        });
        this.map3D.add(marker);
        this.terrainMarkers.push(marker);
      });
    },

    // 绘制高程点
    drawElevationPoints() {
      if (!this.terrainData?.elevationMatrix || !this.map3D) return;

      const elevationMatrix = this.terrainData.elevationMatrix;
      const bounds = this.selectedField.bounds;

      if (!bounds) return;

      const lngRange = bounds.northeast[0] - bounds.southwest[0];
      const latRange = bounds.northeast[1] - bounds.southwest[1];
      const lngStep = lngRange / 9;
      const latStep = latRange / 9;

      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          const lng = bounds.southwest[0] + i * lngStep;
          const lat = bounds.southwest[1] + j * latStep;
          const elevation = elevationMatrix[i][j];

          if (elevation > 0) {
            const marker = new this.map3DAPI.Marker({
              position: new this.map3DAPI.LngLat(lng, lat),
              title: `高程: ${elevation.toFixed(1)}m`,
              label: {
                content: `${elevation.toFixed(0)}m`,
                direction: 'top',
                style: {
                  color: '#fff',
                  fontSize: '10px',
                  backgroundColor: '#333',
                  border: '1px solid #fff',
                  borderRadius: '2px',
                  padding: '2px 4px'
                }
              },
              icon: new this.map3DAPI.Icon({
                size: new this.map3DAPI.Size(12, 12),
                image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjYiIGZpbGw9IiM0Q0FGNTAiLz4KPC9zdmc+',
                imageSize: new this.map3DAPI.Size(12, 12)
              })
            });
            this.map3D.add(marker);
            this.terrainMarkers.push(marker);
          }
        }
      }
    },

    // 绘制坡度热力图
    drawSlopeHeatmap() {
      if (!this.terrainData?.difficultyMatrix || !this.map3D) return;

      const difficultyMatrix = this.terrainData.difficultyMatrix;
      const bounds = this.selectedField.bounds;

      if (!bounds) return;

      const lngRange = bounds.northeast[0] - bounds.southwest[0];
      const latRange = bounds.northeast[1] - bounds.southwest[1];
      const lngStep = lngRange / 9;
      const latStep = latRange / 9;

      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          const lng = bounds.southwest[0] + i * lngStep;
          const lat = bounds.southwest[1] + j * latStep;
          const difficulty = difficultyMatrix[i][j];

          // 根据难度值选择颜色
          let color = '#00FF00'; // 绿色 - 简单
          if (difficulty > 0.7) {
            color = '#FF0000'; // 红色 - 困难
          } else if (difficulty > 0.4) {
            color = '#FF8000'; // 橙色 - 中等
          } else if (difficulty > 0.2) {
            color = '#FFFF00'; // 黄色 - 轻微
          }

          // 创建难度标记点
          const marker = new this.map3DAPI.Marker({
            position: new this.map3DAPI.LngLat(lng, lat),
            title: `难度: ${(difficulty * 100).toFixed(1)}%`,
            label: {
              content: `${(difficulty * 100).toFixed(0)}%`,
              direction: 'top',
              style: {
                color: '#fff',
                fontSize: '8px',
                backgroundColor: color,
                border: '1px solid #fff',
                borderRadius: '2px',
                padding: '1px 2px'
              }
            },
            icon: new this.map3DAPI.Icon({
              size: new this.map3DAPI.Size(8, 8),
              image: `data:image/svg+xml;base64,${btoa(`<svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="4" fill="${color}"/></svg>`)}`,
              imageSize: new this.map3DAPI.Size(8, 8)
            })
          });

          this.map3D.add(marker);
          this.terrainMarkers.push(marker);
        }
      }
    },

    // 绘制等高线
    drawContourLines() {
      if (!this.showContourLines) return;
      if (!this.terrainData?.elevationMatrix || !this.map3D) return;

      const elevationMatrix = this.terrainData.elevationMatrix;
      const bounds = this.selectedField.bounds;

      if (!bounds) return;

      const flatElevations = elevationMatrix.flat().filter(e => e > 0);
      if (flatElevations.length === 0) return;

      const minElevation = Math.min(...flatElevations);
      const maxElevation = Math.max(...flatElevations);
      const elevationRange = maxElevation - minElevation;
      const contourInterval = Math.max(5, Math.round(elevationRange / 8)); // 每5-10米一条等高线

      for (let elevation = minElevation; elevation <= maxElevation; elevation += contourInterval) {
        const contourPoints = this.findContourPoints(elevationMatrix, bounds, elevation);

        if (contourPoints.length > 2) {
          const path = contourPoints.map(point =>
            new this.map3DAPI.LngLat(point.lng, point.lat)
          );

          const polyline = new this.map3DAPI.Polyline({
            path: path,
            strokeColor: '#00FF00',
            strokeWeight: 2,
            strokeOpacity: 0.6
          });

          this.map3D.add(polyline);
          this.terrainMarkers.push(polyline);
        }
      }
    },

    // 查找等高线点
    findContourPoints(elevationMatrix, bounds, targetElevation) {
      const points = [];
      const lngRange = bounds.northeast[0] - bounds.southwest[0];
      const latRange = bounds.northeast[1] - bounds.southwest[1];
      const lngStep = lngRange / 9;
      const latStep = latRange / 9;

      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          const e1 = elevationMatrix[i][j];
          const e2 = elevationMatrix[i + 1][j];
          const e3 = elevationMatrix[i][j + 1];
          const e4 = elevationMatrix[i + 1][j + 1];

          // 检查是否与目标高程相交
          if ((e1 <= targetElevation && e2 >= targetElevation) ||
              (e1 >= targetElevation && e2 <= targetElevation) ||
              (e3 <= targetElevation && e4 >= targetElevation) ||
              (e3 >= targetElevation && e4 <= targetElevation)) {

            const lng = bounds.southwest[0] + (i + 0.5) * lngStep;
            const lat = bounds.southwest[1] + (j + 0.5) * latStep;
            points.push({ lng, lat });
          }
        }
      }

      return points;
    },

    // 调整3D视角
    adjust3DView() {
      if (!this.map3D || !this.selectedField?.bounds) return;

      const bounds = this.selectedField.bounds;
      const centerLng = (bounds.southwest[0] + bounds.northeast[0]) / 2;
      const centerLat = (bounds.southwest[1] + bounds.northeast[1]) / 2;

      this.map3D.setCenter([centerLng, centerLat]);
      this.map3D.setZoom(16);
      this.map3D.setPitch(45);
    },

    // 获取3D地图服务商信息
    async get3DMapProviders() {
      try {
        const response = await fetch('http://localhost:5000/api/terrain/3d-providers');
        const result = await response.json();
        if (result.code === 0) {
          this.available3DProviders = result.data;
        }
      } catch (error) {
        console.error('获取3D地图服务商信息失败:', error);
      }
    },

    // 生成等高线
    async generateContourLines() {
      if (!this.selectedField?.coordinates) {
        this.$message.warning('请先选择地块');
        return;
      }

      try {
        this.$message.info('正在生成等高线...');

        const response = await fetch('http://localhost:5000/api/terrain/contour-lines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: this.selectedField.coordinates
          })
        });

        const result = await response.json();
        if (result.code === 0) {
          this.contourLines = result.data.contour_lines;
          this.showContourLines = true;
          this.$message.success(`成功生成${this.contourLines.length}条等高线`);

          // 在地图上显示等高线
          this.displayContourLines();
        } else {
          this.$message.error(result.msg || '生成等高线失败');
        }
        localStorage.setItem('contourLines', JSON.stringify(this.contourLines));
      } catch (error) {
        console.error('生成等高线失败:', error);
        this.$message.error('生成等高线失败');
      }
    },

    // 在地图上显示等高线
    displayContourLines() {
      if (!this.showContourLines) return;
      if (!this.clusterMap || !this.contourLines.length) return;

      // 清除之前的等高线
      // this.clearContourLines();

      // 按海拔高度排序等高线（从低到高）
      const sortedContours = [...this.contourLines].sort((a, b) => a.elevation - b.elevation);
      // 指定的海拔颜色梯度（每20米一个梯度）
      const elevationColors = [
        '#4D9E3F', // 最低
        '#7CB069',
        '#B5C97E',
        '#E6D48A',
        '#D9B166',
        '#C68B51',
        '#A66B3A',
        '#8C4E2D',
        '#6E3D1E',
        '#5A3520'  // 最高
      ];
      // 计算高程范围
      const minElevation = Math.min(...sortedContours.map(c => c.elevation));
      const maxElevation = Math.max(...sortedContours.map(c => c.elevation));
      const elevationRange = maxElevation - minElevation;

      // === 等高线色带渲染 ===
      for (let i = 0; i < sortedContours.length - 1; i++) {
        const lower = sortedContours[i];
        const upper = sortedContours[i + 1];
        // 下层等高线坐标
        const lowerPath = this.createSmoothContourPath(lower.coordinates);
        // 上层等高线坐标（反向）
        const upperPath = this.createSmoothContourPath(upper.coordinates).slice().reverse();
        // 闭合多边形
        const polygonPath = lowerPath.concat(upperPath);

        // 根据下层等高线的高程计算颜色（与线条颜色计算方式一致）
        let elevationRatio = elevationRange > 0 ? (lower.elevation - minElevation) / elevationRange : 0;
        let colorIndex = Math.floor(elevationRatio * (elevationColors.length - 1));
        const color = elevationColors[Math.min(colorIndex, elevationColors.length - 1)];

        // 绘制色带
        const polygon = new this.clusterMapAPI.Polygon({
          path: polygonPath,
          fillColor: color,
          fillOpacity: 0.35,
          strokeColor: color,
          strokeWeight: 1,
          strokeOpacity: 0.5
        });
        this.clusterMap.add(polygon);
        this.terrainMarkers.push(polygon);
      }
      // === 等高线色带渲染 END ===

      // 线条和标签
      sortedContours.forEach((contour) => {
        // 计算颜色索引
        let elevationRatio = elevationRange > 0 ? (contour.elevation - minElevation) / elevationRange : 0;
        let colorIndex = Math.floor(elevationRatio * (elevationColors.length - 1));
        const color = elevationColors[Math.min(colorIndex, elevationColors.length - 1)];

        // 平滑路径
        const path = this.createSmoothContourPath(contour.coordinates);

        // 创建平滑等高线
        const polyline = new this.clusterMapAPI.Polyline({
          path: path,
          strokeColor: color,
          strokeWeight: 3,
          strokeOpacity: 0.9,
          strokeStyle: 'solid'
        });
        // 标签
        const label = new this.clusterMapAPI.Text({
          text: `${Math.round(contour.elevation)}m`,
          position: path[Math.floor(path.length / 2)],
          style: {
            color: color,
            fontSize: '13px',
            fontWeight: 'bold',
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: `2px solid ${color}`,
            borderRadius: '4px',
            padding: '3px 6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }
        });
        this.clusterMap.add(polyline);
        this.clusterMap.add(label);
        this.terrainMarkers.push(polyline, label);
      });

      // 保存等高线数据到localStorage
      this.saveContourLinesToStorage();
    },

    // 保存等高线数据到localStorage
    saveContourLinesToStorage() {
      try {
        localStorage.setItem('contourLines', JSON.stringify(this.contourLines));
        console.log('等高线数据已保存到localStorage');
      } catch (error) {
        console.error('保存等高线数据失败:', error);
      }
    },

    // 从localStorage恢复等高线数据
    restoreContourLinesFromStorage() {
      try {
        const savedContourLines = localStorage.getItem('contourLines');
        if (savedContourLines) {
          this.contourLines = JSON.parse(savedContourLines);
          console.log('从localStorage恢复等高线数据:', this.contourLines.length + '条');

          // 如果地图已经初始化，立即显示等高线
          if (this.clusterMap && this.contourLines.length > 0) {
            this.$nextTick(() => {
              this.displayContourLines();
            });
          }
        }
      } catch (error) {
        console.error('恢复等高线数据失败:', error);
      }
    },

    // 创建平滑的等高线路径（贝塞尔平滑）
    createSmoothContourPath(coordinates) {
      if (coordinates.length < 3) {
        return coordinates.map(coord => new this.clusterMapAPI.LngLat(coord[0], coord[1]));
      }
      const smoothedPath = [];
      const tension = 0.3; // 平滑度
      for (let i = 0; i < coordinates.length; i++) {
        const current = coordinates[i];
        const prev = coordinates[i === 0 ? coordinates.length - 1 : i - 1];
        const next = coordinates[i === coordinates.length - 1 ? 0 : i + 1];
        // 控制点
        const cp1x = current[0] + (next[0] - prev[0]) * tension;
        const cp1y = current[1] + (next[1] - prev[1]) * tension;
        const cp2x = next[0] - (next[0] - current[0]) * tension;
        const cp2y = next[1] - (next[1] - current[1]) * tension;
        // 贝塞尔插值
        const steps = 10;
        for (let t = 0; t <= 1; t += 1 / steps) {
          const x = this.bezierInterpolate(current[0], cp1x, cp2x, next[0], t);
          const y = this.bezierInterpolate(current[1], cp1y, cp2y, next[1], t);
          smoothedPath.push(new this.clusterMapAPI.LngLat(x, y));
        }
      }
      return smoothedPath;
    },

    // 贝塞尔曲线插值
    bezierInterpolate(p0, p1, p2, p3, t) {
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      return p0 * mt3 + 3 * p1 * mt2 * t + 3 * p2 * mt * t2 + p3 * t3;
    },

    // 清除等高线
    clearContourLines() {
      // 清除等高线相关数据和可视化
      this.contourLines = [];
      this.showContourLines = false;
      localStorage.removeItem('contourLines');
      // 如果有地图对象，移除等高线图层/覆盖物
      if (this.clusterMap && this.contourLineOverlays) {
        this.contourLineOverlays.forEach(overlay => {
          this.clusterMap.remove(overlay);
        });
        this.contourLineOverlays = [];
      }
      // 兼容3D等高线
      this.contourLines3D = [];
      console.log('等高线已彻底清除');
    },

    // 改进的难度矩阵颜色计算
    getMatrixColor(value, matrixType) {
      const colors = {
        viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
        plasma: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9b3a', '#fdca26', '#f0f921'],
        inferno: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d03c', '#fcffa4'],
        magma: ['#000004', '#180f3e', '#440f76', '#721f81', '#9e2f7f', '#cd4071', '#f1605d', '#f98c5a', '#fbb954', '#fcfdbf']
      };

      if (!this.comprehensiveMatrix) return '#ccc';

      const matrix = this.comprehensiveMatrix[`${matrixType}_matrix`];
      if (!matrix) return '#ccc';

      const flatMatrix = matrix.flat();
      const min = Math.min(...flatMatrix);
      const max = Math.max(...flatMatrix);
      const range = max - min;

      if (range === 0) return colors[this.matrixColorScheme][4];

      const normalizedValue = (value - min) / range;
      const colorIndex = Math.floor(normalizedValue * (colors[this.matrixColorScheme].length - 1));
      return colors[this.matrixColorScheme][colorIndex];
    },

    // 获取矩阵值（支持不同显示模式）
    getMatrixValue(row, col, matrixType) {
      if (!this.comprehensiveMatrix) return 0;

      const matrix = this.comprehensiveMatrix[`${matrixType}_matrix`];
      if (!matrix || !matrix[row] || matrix[row][col] === undefined) return 0;

      let value = matrix[row][col];

      // 根据显示模式调整值
      switch (this.difficultyMatrixType) {
        case 'percentage':
          return value * 100; // 显示为百分比
        case 'raw':
          return value; // 原始值
        case 'normalized':
        default:
          return Math.min(value, 1.0); // 归一化到0-1
      }
    },

    // 获取矩阵标题（支持不同显示模式）
    getMatrixTitle(matrixType) {
      const titles = {
        elevation: '高程矩阵 (m)',
        slope: '坡度矩阵 (°)',
        roughness: '粗糙度矩阵',
        difficulty: '综合难度矩阵',
        workTime: '作业时间系数'
      };

      let title = titles[matrixType] || matrixType;

      // 根据显示模式调整标题
      if (matrixType === 'difficulty') {
        switch (this.difficultyMatrixType) {
          case 'percentage':
            title = '综合难度矩阵 (%)';
            break;
          case 'raw':
            title = '综合难度矩阵 (原始值)';
            break;
          case 'normalized':
          default:
            title = '综合难度矩阵 (0-1)';
            break;
        }
      }

      return title;
    },

    // 切换难度矩阵显示模式
    switchDifficultyMatrixType() {
      const types = ['normalized', 'percentage', 'raw'];
      const currentIndex = types.indexOf(this.difficultyMatrixType);
      this.difficultyMatrixType = types[(currentIndex + 1) % types.length];
      this.$message.success(`已切换到${this.getMatrixTitle('difficulty')}显示模式`);
    },

    // 切换颜色方案
    switchMatrixColorScheme() {
      const schemes = ['viridis', 'plasma', 'inferno', 'magma'];
      const currentIndex = schemes.indexOf(this.matrixColorScheme);
      this.matrixColorScheme = schemes[(currentIndex + 1) % schemes.length];
      this.$message.success(`已切换到${this.matrixColorScheme}颜色方案`);
    },

    // 选择3D地图服务商
    select3DProvider(provider) {
      this.selected3DProvider = provider;
      this.$message.success(`已选择${this.available3DProviders[provider]?.name || provider}作为3D地图服务商`);
    },

    // 清理Three.js资源
    cleanupThreeJS() {
      if (this.threeRenderer) {
        this.threeRenderer.dispose();
        const container = document.getElementById('threejs-container');
        if (container) {
          container.innerHTML = '';
        }
      }

      this.threeScene = null;
      this.threeCamera = null;
      this.threeRenderer = null;
      this.threeControls = null;
      this.terrainMesh = null;
      this.contourLines3D = [];
      this.is3DInitialized = false;
    },

    // 🆕 一键生成所有地形数据
    async generateAllTerrainData() {
      if (!this.selectedField?.coordinates) {
        this.$message.warning('请先选择地块');
        return;
      }
      this.terrainLoading = true;
      try {
        this.$message.info('正在生成完整地形数据...');

        // 1. 获取基础地势数据（包含插值）
        await this.getTerrainData(this.selectedField.bounds);

        // 2. 确保等高线数据
        if (!this.contourLines || this.contourLines.length === 0) {
          await this.autoGenerateContourLines();
        }

        // 3. 确保插值数据
        if (!this.comprehensiveMatrix) {
          await this.autoGenerateInterpolationData();
        }

        // 4. 显示统计信息
        const stats = {
          elevationRange: this.terrainData?.elevationMatrix ?
            `${Math.min(...[].concat(...this.terrainData.elevationMatrix)).toFixed(1)}m ~ ${Math.max(...[].concat(...this.terrainData.elevationMatrix)).toFixed(1)}m` : '--',
          contourLines: this.contourLines.length,
          matrixTypes: this.comprehensiveMatrix ? Object.keys(this.comprehensiveMatrix).filter(k => k.endsWith('_matrix')).length : 0,
          terrainType: this.getTerrainTypeName(this.terrainData?.terrain_type)
        };

        this.$message.success(`地形数据生成完成！\n高程范围: ${stats.elevationRange}\n等高线: ${stats.contourLines}条\n矩阵类型: ${stats.matrixTypes}种\n地形类型: ${stats.terrainType}`);

        console.log('完整地形数据统计:', stats);

      } catch (error) {
        console.error('生成完整地形数据失败:', error);
        this.$message.error('生成完整地形数据失败: ' + error.message);
      } finally {
        this.terrainLoading = false;
      }
      this.terrainLoading = false;
      this.showContourLines = true; // 生成地形数据时显示等高线
    },

    // 🆕 自动生成插值数据方法
    async onTypeChange(type) {
      try {
        const res = await fetch(`http://localhost:5000/api/default_drone/${type}`);
        const result = await res.json();
        if (result.code === 0) {
          // 只填充除 type 以外的字段
          this.droneForm.endurance = result.data.endurance;
          this.droneForm.fov = result.data.fov;
          this.droneForm.max_times = result.data.max_times;
          this.droneForm.function = result.data.function;
          this.droneForm.max_speed = result.data.max_speed;
          this.droneForm.max_height = result.data.max_height;
          this.droneForm.focal_length = result.data.focal_length;
          this.droneForm.pixel_size = result.data.pixel_size;
        }
      } catch (e) {
        this.$message.error('获取默认参数失败');
      }
    },

    // 识别精确度相关方法
    loadStoredAccuracy() {
      try {
        const stored = localStorage.getItem('storedAccuracy');
        if (stored) {
          this.storedAccuracy = JSON.parse(stored);
          console.log('已加载存储的精确度数据:', this.storedAccuracy);
        }
      } catch (e) {
        console.error('加载存储的精确度数据失败:', e);
      }
    },
    loadStoredHeadingOverlap() {
      try {
        const stored = localStorage.getItem('storedHeadingOverlap');
        if (stored) {
          this.storedHeadingOverlap = Number(stored);
        }
      } catch (e) {
        this.storedHeadingOverlap = 70;
      }
    },
    loadStoredSideOverlap() {
      try {
        const stored = localStorage.getItem('storedSideOverlap');
        if (stored) {
          this.storedSideOverlap = Number(stored);
        }
      } catch (e) {
        this.storedSideOverlap = 70;
      }
    },

    onCropChange() {
      this.selectedPeriod = '';
      this.accuracyResult = null;
    },

    async confirmAccuracy() {
      if (!this.selectedCrop || !this.selectedPeriod) {
        this.$message.warning('请先选择作物类型和生长周期');
        return;
      }
      if (!this.headingOverlapInput || isNaN(this.headingOverlapInput) || this.headingOverlapInput < 0 || this.headingOverlapInput > 100) {
        this.$message.warning('请填写有效的航向重叠率（0-100）');
        return;
      }
      if (!this.sideOverlapInput || isNaN(this.sideOverlapInput) || this.sideOverlapInput < 0 || this.sideOverlapInput > 100) {
        this.$message.warning('请填写有效的横向重叠率（0-100）');
        return;
      }
      try {
        const params = new URLSearchParams({
          crop_name: this.selectedCrop,
          period: this.selectedPeriod
        });
        const response = await fetch(`http://localhost:5000/api/accuracy/query?${params}`);
        const result = await response.json();
        if (result.code === 0) {
          this.accuracyResult = result.gsd_cm_per_px;
          // 存储精确度数据
          this.storedAccuracy = {
            crop: this.selectedCrop,
            period: this.selectedPeriod,
            value: result.gsd_cm_per_px,
            timestamp: new Date().toLocaleString()
          };
          // 存储到localStorage
          localStorage.setItem('storedAccuracy', JSON.stringify(this.storedAccuracy));
          // 存储航向重叠率
          localStorage.setItem('storedHeadingOverlap', String(this.headingOverlapInput));
          this.storedHeadingOverlap = this.headingOverlapInput;
          // 存储横向重叠率
          localStorage.setItem('storedSideOverlap', String(this.sideOverlapInput));
          this.storedSideOverlap = this.sideOverlapInput;
          this.$message.success('精确度数据和航向重叠率已确认并存储，刷新页面后仍可查看');
          this.showAccuracyDialog = false;
        } else {
          this.$message.error(result.msg || '查询失败');
          this.accuracyResult = null;
        }
      } catch (e) {
        this.$message.error('网络错误，无法获取精确度数据');
        console.error('获取精确度数据错误:', e);
        this.accuracyResult = null;
      }
    },

    showBatchDialogFn() {
      this.batchError = '';
      this.batchResults = [];
      // 获取识别精度参数
      let storedAccuracy = {};
      let storedHeadingOverlap = 70;
      let storedSideOverlap = 70;
      try {
        storedAccuracy = JSON.parse(localStorage.getItem('storedAccuracy') || '{}');
        storedHeadingOverlap = Number(localStorage.getItem('storedHeadingOverlap') || 70);
        storedSideOverlap = Number(localStorage.getItem('storedSideOverlap') || 70);
      } catch (e) { /* 空实现 */ }
      const gsd = Number(storedAccuracy.value);
      const headingOverlap = Number(storedHeadingOverlap);
      const sideOverlap = Number(storedSideOverlap);
      if (!gsd || !headingOverlap || !sideOverlap) {
        this.batchError = '请先在识别精度中设置GSD和重叠率';
        this.showBatchDialog = true;
        return;
      }
      // 获取所有working无人机
      const workingDrones = (this.droneList || []).filter(d => d.status === 'working');
      if (!workingDrones.length) {
        this.batchError = '当前没有状态为"作业中(working)"的无人机';
        this.showBatchDialog = true;
        return;
      }

      // 计算参数
      this.batchResults = workingDrones.map(drone => {
        // 参数准备
        const endurance = Number(drone.endurance); // 分钟
        const fov = Number(drone.fov); // 度
        const max_times = Number(drone.max_times); // 次/秒
        const focal_length = Number(drone.focal_length); // mm
        const pixel_size = Number(drone.pixel_size); // μm
        const max_speed = Number(drone.max_speed); // m/s
        // 检查参数
        if (!endurance || !fov || !max_times || !focal_length || !pixel_size || !max_speed) {
          return {
            id: drone.id,
            name: drone.name,
            height: '参数缺失',
            width: '参数缺失',
            speed: '参数缺失',
            areaMu: '参数缺失',
            detail: '参数缺失'
          };
        }
        // 1. 飞行高度（米，最大30）
        let H = (gsd * focal_length * 10) / pixel_size;
        if (H > 30) H = 30;
        // 2. 扫描宽度（米）
        const W = 2 * H * Math.tan((fov / 2) * Math.PI / 180);
        // 3. 三重约束速度
        // 3.1 图像清晰速度（防止模糊）
        const t_exp = 1 / max_times; // 曝光间隔（秒）
        const gsd_m = gsd / 100; // cm->m
        const V_img = gsd_m / t_exp; // 图像清晰速度（m/s）
        // 3.2 重叠率速度（满足航向重叠率）
        const overlap = headingOverlap / 100;
        const V_overlap = (gsd_m / t_exp) * (1 - overlap); // 航向重叠率速度（m/s）
        // 3.3 最大飞行速度
        const V_max = max_speed; // m/s
        // 3.4 取三者最小
        const V = Math.min(V_img, V_overlap, V_max);
        // 4. 有效扫描宽度（考虑旁向重叠率）
        const widthEff = W * (1 - sideOverlap / 100);
        // 5. 路径效率
        const pathEfficiency = 0.6; // 田间转向等损耗，经验值
        // 6. 作业面积
        const totalTime = endurance * 60; // 秒
        const workTime = totalTime * 0.8; // 只用80%时间作业
        const areaMu = (workTime * widthEff * V * pathEfficiency) / 666.67;
        // 7. 详细修正说明
        const detail = `飞行高度H=${H.toFixed(2)}m，扫描宽度W=${W.toFixed(2)}m，有效宽度W_eff=${widthEff.toFixed(2)}m，三重约束速度V=${V.toFixed(2)}m/s（图像清晰${V_img.toFixed(2)}，重叠率${V_overlap.toFixed(2)}，最大${V_max.toFixed(2)}），路径效率${pathEfficiency}，作业面积=${areaMu.toFixed(2)}亩`;
        return {
          id: drone.id,
          name: drone.name,
          height: H.toFixed(2),
          width: W.toFixed(2),
          speed: V.toFixed(2),
          areaMu: areaMu.toFixed(2),
          detail
        };
      }).sort((a, b) => a.id - b.id);

      // 缓存批量作业亩数结果
      this.droneAreaMuMap = {};
      this.batchResults.forEach(item => {
        if (item.id && item.areaMu !== '参数缺失') {
          this.droneAreaMuMap[item.id] = parseFloat(item.areaMu);
        }
      });

      // 将计算结果更新到无人机列表中
      this.batchResults.forEach(result => {
        const drone = this.droneList.find(d => d.id === result.id);
        if (drone && result.areaMu !== '参数缺失') {
          drone.areaMu = parseFloat(result.areaMu);
          drone.maxArea = drone.areaMu;
          console.log(`更新无人机${drone.name}的作业亩数: ${drone.areaMu}亩`);
        }
      });

      // 保存更新后的无人机列表到本地存储
      localStorage.setItem('droneList', JSON.stringify(this.droneList));

      this.showBatchDialog = true;
    },

    onSiteSelectionClick() {
      if (this.terrainLoading) {
        this.$message.warning('正在获取海拔高度，请勿操作');
        return;
      }
      this.handleSiteSelection();
    },
    onAreaPlanningClick() {
      if (this.terrainLoading) {
        this.$message.warning('正在获取海拔高度，请勿操作');
        return;
      }

      // 添加超时保护
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('操作超时，请重试')), 30000); // 30秒超时
      });

      // 打印地亩规划相关信息到控制台
      console.log('=== 🚁 地亩规划信息打印 ===');

      // 1. 地块信息
      console.log('📍 地块信息:', this.selectedField);

      // 2. 地形数据
      console.log('🏔️ 地形数据:', this.terrainData);

      // 3. 无人机列表
      console.log('🛩️ 无人机列表:', this.droneList);

      // 4. 等高线数据
      console.log('📈 等高线数据:', this.contourLines);

      // 5. 综合矩阵数据
      console.log('📊 综合矩阵数据:', this.comprehensiveMatrix);

      // 6. 本地存储数据
      const savedField = localStorage.getItem('selectedField');
      const savedMatrix = localStorage.getItem('difficultyMatrix');
      const savedDrones = localStorage.getItem('droneList');
      console.log('💾 本地存储数据:', {
        selectedField: savedField ? JSON.parse(savedField) : null,
        difficultyMatrix: savedMatrix ? JSON.parse(savedMatrix) : null,
        droneList: savedDrones ? JSON.parse(savedDrones) : null
      });

      // 7. Vuex Store数据
      console.log('🏪 Vuex Store数据:', this.$store.state.regionData);

      // 8. 分配结果
      console.log('🎯 分配结果:', {
        assignmentResults: this.assignmentResults,
        assignmentRounds: this.assignmentRounds
      });

      console.log('=== 🚁 地亩规划信息打印完成 ===');

      // 使用Promise.race来添加超时保护
      Promise.race([
        this.handleAreaPlanning(),
        timeoutPromise
      ]).catch(error => {
        console.error('地亩规划操作失败:', error);
        this.$message.error('地亩规划操作失败: ' + error.message);
      });
    },

    // 可视化分配结果 - 支持多轮次、差异化颜色
    visualizeAssignmentResults() {
      // 1. 先清除旧的分配结果
      this.clearAssignmentVisualization();
      this.assignmentPolygonInfoMap = [];
      if (!this.clusterMap || !this.assignmentResults || this.assignmentResults.length === 0) {
        return;
      }
      console.log('🎨 正在可视化多轮次作业区域...');
      // 统计所有轮次
      let allRounds = new Set();
      this.assignmentResults.forEach(assignment => {
        if (assignment.rounds) {
          Object.keys(assignment.rounds).forEach(round => allRounds.add(Number(round)));
        } else if (assignment.grids) {
          allRounds.add(1);
        }
      });
      allRounds = Array.from(allRounds).sort((a,b)=>a-b);
      // 1. 先画每一轮的大边界（粗线，红色分界线）
      allRounds.forEach((roundNumber, idx) => {
        let roundGrids = [];
        this.assignmentResults.forEach(assignment => {
          if (assignment.rounds && assignment.rounds[roundNumber]) {
            roundGrids.push(...assignment.rounds[roundNumber]);
          } else if (assignment.grids && roundNumber === 1) {
            roundGrids.push(...assignment.grids);
          }
        });
        if (roundGrids.length > 0) {
          // 除了第1轮，所有轮次都用不同颜色分界线
          let borderColor = this.getRoundBorderColor(idx, allRounds.length);
          let borderWeight = 3;
          if (roundNumber > 1) {
            borderWeight = 5;
          }
          this.renderAssignmentPolygon(roundGrids, 'rgba(0,0,0,0)', roundNumber, borderWeight, 0, borderColor, {
            type: 'round-border',
            roundNumber,
            grids: roundGrids
          });
          // 计算中心点，添加"第X轮"label
          const centers = roundGrids.map(g => g.center);
          if (centers.length > 0) {
            const avgLng = centers.reduce((s, c) => s + c[0], 0) / centers.length;
            const avgLat = centers.reduce((s, c) => s + c[1], 0) / centers.length;
            const text = new this.clusterMapAPI.Text({
              text: `第${roundNumber}轮`,
              position: [avgLng, avgLat],
              style: {
                color: '#222',
                fontSize: '18px',
                fontWeight: 'bold',
                background: 'rgba(255,255,255,0.7)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #333',
              }
            });
            this.clusterMap.add(text);
            this.assignmentMarkers.push(text);
          }
        }
      });
      // 2. 再画每一轮每个无人机的小边界（细线，白色），并填充颜色
      this.assignmentResults.forEach(assignment => {
        if (assignment.grids && assignment.grids.length > 0) {
          const style = this.getRoundStyle(undefined, 1, assignment.id);
          this.renderAssignmentPolygon(assignment.grids, style.color, 1, style.strokeWidth, 0.4, '#FFFFFF', {
            type: 'drone',
            droneId: assignment.id,
            droneName: assignment.name,
            roundNumber: 1,
            grids: assignment.grids
          });
        }
        if (assignment.rounds) {
          Object.keys(assignment.rounds).forEach(roundNumber => {
            const roundGrids = assignment.rounds[roundNumber];
            const style = this.getRoundStyle(undefined, parseInt(roundNumber), assignment.id);
            this.renderAssignmentPolygon(roundGrids, style.color, parseInt(roundNumber), style.strokeWidth, 0.4, '#FFFFFF', {
              type: 'drone',
              droneId: assignment.id,
              droneName: assignment.name,
              roundNumber: parseInt(roundNumber),
              grids: roundGrids
            });
          });
        }
      });
      this.$message.success('多轮次作业区域可视化渲染完成');
    },

    // 辅助函数：渲染单个分配多边形
    // 新增参数：strokeWeight, fillOpacity, strokeColor, extraInfo
    renderAssignmentPolygon(grids, color, roundNumber, strokeWeight = 1, fillOpacity = 0.4, strokeColor = '#FFFFFF', extraInfo = null) {
      // 获取地块边界
      const fieldPolygon = [this.selectedField && this.selectedField.coordinates ? this.selectedField.coordinates : []];
      grids.forEach(grid => {
        const gridPolygon = [grid.corners];
        let polygonsToDraw = [];
        if (fieldPolygon[0].length > 0) {
          // 裁剪到地块内
          const clipped = polygonClipping.intersection(fieldPolygon, gridPolygon);
          if (clipped && clipped.length > 0) {
            // 递归拍平所有多边形片段
            const flatten = arr => Array.isArray(arr[0][0]) ? arr.flatMap(flatten) : [arr];
            polygonsToDraw = flatten(clipped);
          }
        } else {
          polygonsToDraw = [grid.corners];
        }
        polygonsToDraw.forEach(part => {
          // 有效性检查：必须是至少3个点的多边形，且每个点是合法经纬度
          if (!Array.isArray(part) || part.length < 3) return;
          const valid = part.every(coord =>
            Array.isArray(coord) &&
            coord.length === 2 &&
            typeof coord[0] === 'number' &&
            typeof coord[1] === 'number' &&
            !isNaN(coord[0]) &&
            !isNaN(coord[1])
          );
          if (!valid) return;
          const path = part.map(coord => new this.clusterMapAPI.LngLat(coord[0], coord[1]));
          const polygon = new this.clusterMapAPI.Polygon({
            path,
            fillColor: color,
            fillOpacity: fillOpacity,
            strokeColor: strokeColor,
            strokeWeight: strokeWeight,
            strokeStyle: 'solid'
          });
          this.clusterMap.add(polygon);
          this.assignmentMarkers.push(polygon);
          // 记录属性映射
          const info = {
            polygon,
            color,
            roundNumber,
            strokeWeight,
            strokeColor,
            ...extraInfo
          };
          this.assignmentPolygonInfoMap.push(info);
          // 绑定点击事件
          if (info.type === 'drone') {
            polygon.on('click', () => this.onAssignmentPolygonClick(info));
          }
          if (info.type === 'round-border') {
            polygon.on('click', () => this.onRoundBorderClick(info));
          }
          // 调试：输出每个格子的颜色、无人机id、轮次、格子id
          if (extraInfo && extraInfo.droneId) {
            console.log('[调试] 格子id:', grid.id, '无人机id:', extraInfo.droneId, '轮次:', extraInfo.roundNumber, '颜色:', color, '透明度:', fillOpacity);
          } else {
            console.log('[调试] 格子id:', grid.id, '颜色:', color, '透明度:', fillOpacity);
          }
        });
      });
    },

    // 辅助函数：根据轮次调整颜色
    // getRoundColor(baseColor, round, droneId) {
    //   // 推荐用getDroneColorByIndexAndRound
    //   const idx = this.getDroneIndexById(droneId);
    //   if (idx === -1) return baseColor;
    //   return this.getDroneColorByIndexAndRound(idx, round);
    // },

    // 清除分配结果的可视化
    clearAssignmentVisualization() {
      if (this.assignmentMarkers) {
        this.assignmentMarkers.forEach(marker => {
          if (marker) {
            if (this.map3D) {
              this.map3D.remove(marker);
            } else if (this.clusterMap) {
              this.clusterMap.remove(marker);
            }
          }
        });
      }
      this.assignmentMarkers = [];

      // 清除等高线
      this.clearContourLines();
    },

    // 清除地块信息（包括需要作业的亩数）- 只在重新绘制时调用
    clearFieldInfo() {
      this.selectedField = null;
      this.terrainData = null;
      this.calculatedWorkArea = 0;
      console.log('地块信息已清除，包括需要作业的亩数');
    },

    // 计算地块边界
    calculateFieldBounds(coordinates) {
      const lngs = coordinates.map(coord => coord[0]);
      const lats = coordinates.map(coord => coord[1]);

      return {
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats)
      };
    },

    // 创建无人机标记
    createDroneMarker(position, droneName, color) {
      return new this.clusterMapAPI.Marker({
        position: position,
        title: droneName,
        label: {
          content: droneName,
          direction: 'top',
          style: {
            color: '#fff',
            fontSize: '12px',
            backgroundColor: color,
            border: '1px solid #fff',
            borderRadius: '4px',
            padding: '2px 6px'
          }
        },
        icon: new this.clusterMapAPI.Icon({
          size: new this.clusterMapAPI.Size(24, 24),
          image: `data:image/svg+xml;base64,${btoa(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="${color}"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`)}`,
          imageSize: new this.clusterMapAPI.Size(24, 24)
        })
      });
    },

    // 获取无人机列表（如果本地没有数据）
    async fetchDroneList() {
      try {
        const response = await fetch('http://localhost:5000/api/drones/list');
        const result = await response.json();

        if (result.code === 0) {
          this.droneList = result.data;
          localStorage.setItem('droneList', JSON.stringify(this.droneList));
          console.log('已从后端获取无人机列表:', this.droneList);
        } else {
          console.warn('获取无人机列表失败:', result.msg);
        }
      } catch (error) {
        console.error('获取无人机列表失败:', error);
      }
    },

    // 计算缺失的无人机作业亩数
    calculateMissingDroneAreaMu() {
      // 获取识别精度参数
      let storedAccuracy = {};
      let storedHeadingOverlap = 70;
      let storedSideOverlap = 70;
      try {
        storedAccuracy = JSON.parse(localStorage.getItem('storedAccuracy') || '{}');
        storedHeadingOverlap = Number(localStorage.getItem('storedHeadingOverlap') || 70);
        storedSideOverlap = Number(localStorage.getItem('storedSideOverlap') || 70);
      } catch (e) { /* 空实现 */ }

      const gsd = Number(storedAccuracy.value);
      const headingOverlap = Number(storedHeadingOverlap);
      const sideOverlap = Number(storedSideOverlap);

      if (!gsd || !headingOverlap || !sideOverlap) {
        console.warn('缺少识别精度参数，无法计算作业亩数');
        return;
      }

      // 为每个缺少areaMu的无人机计算作业亩数
      this.droneList.forEach(drone => {
        if (!drone.areaMu && !drone.maxArea) {
          // 参数准备
          const endurance = Number(drone.endurance); // 分钟
          const fov = Number(drone.fov); // 度
          const max_times = Number(drone.max_times); // 次/秒
          const focal_length = Number(drone.focal_length); // mm
          const pixel_size = Number(drone.pixel_size); // μm
          const max_speed = Number(drone.max_speed); // m/s

          // 检查参数
          if (!endurance || !fov || !max_times || !focal_length || !pixel_size || !max_speed) {
            console.warn(`无人机${drone.name}参数不完整，无法计算作业亩数`);
            return;
          }

          // 计算作业亩数（使用与批量作业参数相同的算法）
          let H = (gsd * focal_length * 10) / pixel_size;
          if (H > 30) H = 30;

          const W = 2 * H * Math.tan((fov / 2) * Math.PI / 180);

          const t_exp = 1 / max_times;
          const gsd_m = gsd / 100;
          const V_img = gsd_m / t_exp;

          const overlap = headingOverlap / 100;
          const V_overlap = (gsd_m / t_exp) * (1 - overlap);

          const V_max = max_speed;
          const V = Math.min(V_img, V_overlap, V_max);

          const widthEff = W * (1 - sideOverlap / 100);
          const pathEfficiency = 0.6;

          const totalTime = endurance * 60;
          const workTime = totalTime * 0.8;
          const areaMu = (workTime * widthEff * V * pathEfficiency) / 666.67;

          drone.areaMu = parseFloat(areaMu.toFixed(2));
          drone.maxArea = drone.areaMu;
          console.log(`自动计算无人机${drone.name}的作业亩数: ${drone.areaMu}亩`);
        }
      });

      // 保存更新后的无人机列表
      localStorage.setItem('droneList', JSON.stringify(this.droneList));
    },

    // 获取网格中心点坐标
    getGridCenterCoordinates(i, j, bounds, gridSize) {
      const lngStep = (bounds.maxLng - bounds.minLng) / gridSize;
      const latStep = (bounds.maxLat - bounds.minLat) / gridSize;

      const lng = bounds.minLng + (i + 0.5) * lngStep;
      const lat = bounds.minLat + (j + 0.5) * latStep;

      return [lng, lat];
    },

    // 重新规划功能
    async handleReplanning() {
      // 先清空等高线和区域规划可视化
      this.clearAssignmentVisualization();
      try {
        // 确认对话框
        const confirmed = await this.$confirm(
          '确定要重新规划吗？这将清空所有已保存的参数和数据，包括：\n' +
          '• 选中的地块信息\n' +
          '• 地形分析数据\n' +
          '• 无人机列表\n' +
          '• 分配结果\n' +
          '• 等高线数据\n' +
          '• 所有本地存储的参数\n\n' +
          '清空后需要重新进行选址、地形分析和区域规划。',
          '重新规划确认',
          {
            confirmButtonText: '确定清空',
            cancelButtonText: '取消',
            type: 'warning',
            dangerouslyUseHTMLString: true
          }
        );

        if (confirmed) {
          console.log('🔄 开始重新规划流程...');

          // 清空所有本地存储
          this.clearAllLocalStorage();

          // 清空所有内存变量
          this.clearAllMemoryData();

          // 清空地图上的所有标记和图层
          this.clearAllMapData();

          // 清除地图上的等高线
          this.clearContourLines();

          // 重置界面状态
          this.resetInterfaceState();

          // 显示成功消息
          this.$message.success('所有数据已清空，请重新开始规划流程！');

          console.log('✅ 重新规划准备完成，所有数据已清空');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('重新规划失败:', error);
          this.$message.error('重新规划失败: ' + error.message);
        }
      }
      this.showContourLines = false; // 重新规划时隐藏等高线
    },

    // 清空所有本地存储
    clearAllLocalStorage() {
      console.log('🗑️ 清空本地存储...');

      // 清空所有相关的localStorage项
      const keysToRemove = [
        'selectedField',
        'difficultyMatrix',
        'droneList',
        'storedAccuracy',
        'storedHeadingOverlap',
        'storedSideOverlap',
        'terrainData',
        'assignmentResults',
        'contourLines',
        'elevationMatrix',
        'slopeMatrix',
        'roughnessMatrix',
        'comprehensiveMatrix'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`  - 已删除: ${key}`);
      });

      console.log('✅ 本地存储清空完成');
    },

    // 清空所有内存数据
    clearAllMemoryData() {
      console.log('🧹 清空内存数据...');

      // 清空主要数据变量
      this.selectedField = null;
      this.terrainData = null;
      // 不清零需要作业的亩数，保持用户之前绘制的面积
      this.droneList = [];
      this.assignmentResults = [];
      this.assignmentMarkers = [];
      this.contourLines = [];
      this.terrainMarkers = [];
      this.slopeHeatmap = null;
      this.terrainLayer = null;
      this.map3D = null;
      this.threeJSScene = null;
      this.threeJSCamera = null;
      this.threeJSRenderer = null;
      this.terrain3DData = null;
      this.is3DInitialized = false;
      this.show3DMap = false;
      this.showTerrainLayer = false;

      // 清空表单数据
      this.headingOverlapInput = 70;
      this.sideOverlapInput = 70;
      this.storedAccuracy = {};

      // 清空状态变量
      this.terrainLoading = false;
      this.assignmentRounds = 0;
      this.currentMatrixType = 'difficulty';

      console.log('✅ 内存数据清空完成');
    },

    // 清空地图数据
    clearAllMapData() {
      console.log('🗺️ 清空地图数据...');

      if (this.map) {
        // 清除所有标记
        if (this.selectedPolygon) {
          this.map.remove(this.selectedPolygon);
          this.selectedPolygon = null;
        }

        if (this.currentLocationMarker) {
          this.map.remove(this.currentLocationMarker);
          this.currentLocationMarker = null;
        }

        // 清除分配结果标记
        if (this.assignmentMarkers && this.assignmentMarkers.length > 0) {
          this.assignmentMarkers.forEach(marker => {
            if (marker.getMap()) {
              this.map.remove(marker);
            }
          });
          this.assignmentMarkers = [];
        }

        // 清除地形标记
        if (this.terrainMarkers && this.terrainMarkers.length > 0) {
          this.terrainMarkers.forEach(marker => {
            if (marker.getMap()) {
              this.map.remove(marker);
            }
          });
          this.terrainMarkers = [];
        }

        // 清除热力图
        if (this.slopeHeatmap) {
          this.map.remove(this.slopeHeatmap);
          this.slopeHeatmap = null;
        }

        // 清除地形图层
        if (this.terrainLayer) {
          this.map.remove(this.terrainLayer);
          this.terrainLayer = null;
        }

        // 重置地图视图
        this.map.setZoom(10);
        this.map.setCenter([116.397428, 39.90923]); // 默认北京中心
      }

      console.log('✅ 地图数据清空完成');
    },

    // 重置界面状态
    resetInterfaceState() {
      console.log('🔄 重置界面状态...');

      // 重置所有显示状态
      this.showFieldInfo = false;
      this.showTerrainAnalysis = false;
      this.showAssignmentResults = false;
      this.show3DMap = false;
      this.showTerrainLayer = false;

      // 重置加载状态
      this.terrainLoading = false;
      this.planningLoading = false;

      // 重置表单状态
      this.currentMatrixType = 'difficulty';

      // 强制重新渲染
      this.$forceUpdate();

      console.log('✅ 界面状态重置完成');
      this.droneAreaMuMap = undefined;
    },

    // 切换分配结果显示/隐藏
    toggleAssignmentDisplay() {
      if (this.assignmentMarkers && this.assignmentMarkers.length > 0) {
        const isVisible = this.assignmentMarkers[0].getMap() !== null;

        if (isVisible) {
          // 隐藏分配结果
          this.clearAssignmentVisualization();
          this.$message.info('已隐藏分配结果');
        } else {
          // 显示分配结果
          this.visualizeAssignmentResults();
          this.$message.info('已显示分配结果');
        }
      } else {
        this.$message.warning('暂无分配结果可显示');
      }
    },

    // 测试颜色分配
    testColorAssignment() {
      console.log('=== 🎨 颜色分配测试 ===');
      const colorSchemes = [
        // 红色系
        ['#FFE6E6', '#FFCCCC', '#FFB3B3', '#FF9999', '#FF8080', '#FF6666', '#FF4D4D', '#FF3333', '#FF1A1A', '#FF0000'],
        // 绿色系
        ['#E6FFE6', '#CCFFCC', '#B3FFB3', '#99FF99', '#80FF80', '#66FF66', '#4DFF4D', '#33FF33', '#1AFF1A', '#00FF00'],
        // 蓝色系
        ['#E6E6FF', '#CCCCFF', '#B3B3FF', '#9999FF', '#8080FF', '#6666FF', '#4D4DFF', '#3333FF', '#1A1AFF', '#0000FF'],
        // 黄色系
        ['#FFFFE6', '#FFFFCC', '#FFFFB3', '#FFFF99', '#FFFF80', '#FFFF66', '#FFFF4D', '#FFFF33', '#FFFF1A', '#FFFF00'],
        // 紫色系
        ['#FFE6FF', '#FFCCFF', '#FFB3FF', '#FF99FF', '#FF80FF', '#FF66FF', '#FF4DFF', '#FF33FF', '#FF1AFF', '#FF00FF'],
        // 青色系
        ['#E6FFFF', '#CCFFFF', '#B3FFFF', '#99FFFF', '#80FFFF', '#66FFFF', '#4DFFFF', '#33FFFF', '#1AFFFF', '#00FFFF']
      ];

      colorSchemes.forEach((scheme, index) => {
        console.log(`色系${index + 1}: ${scheme[0]} -> ${scheme[scheme.length-1]} (${scheme.length}种深浅)`);
      });

      if (this.assignmentResults && this.assignmentResults.length > 0) {
        this.assignmentResults.forEach((assignment, index) => {
          const colorScheme = colorSchemes[index % colorSchemes.length];
          console.log(`无人机${index + 1} (${assignment.name}): 色系${index + 1}, 架次数${assignment.blocks?.length || 0}`);
          if (assignment.blocks) {
            assignment.blocks.forEach((block, blockIndex) => {
              const colorIndex = Math.min(blockIndex, colorScheme.length - 1);
              console.log(`  - 第${blockIndex + 1}架次 (块${block.id}): ${colorScheme[colorIndex]} (深浅${colorIndex + 1})`);
            });
          }
        });
      } else {
        console.log('暂无分配结果');
      }
      console.log('=== 🎨 颜色分配测试完成 ===');
    },

    // 统计边界裁剪信息
    logBoundaryClippingStats(assignments) {
      let totalInsideGrids = 0;
      let totalOutsideGrids = 0;
      let totalAssignedArea = 0;

      assignments.forEach(assignment => {
        assignment.grids.forEach(grid => {
          if (grid.isInside) {
            totalInsideGrids++;
            totalAssignedArea += 1; // 假设每个网格1亩
          } else {
            totalOutsideGrids++;
          }
        });
      });

      console.log('=== 🎯 边界裁剪统计 ===');
      console.log(`总分配面积: ${totalAssignedArea}亩`);
      console.log(`边界内网格: ${totalInsideGrids}个`);
      console.log(`边界外网格: ${totalOutsideGrids}个`);
      console.log(`裁剪效率: ${((totalInsideGrids / (totalInsideGrids + totalOutsideGrids)) * 100).toFixed(1)}%`);
      console.log('=== 🎯 边界裁剪统计完成 ===');

      // 显示用户友好的消息
      if (totalOutsideGrids > 0) {
        this.$message.info(`已自动裁剪边界外区域，实际分配面积: ${totalAssignedArea}亩`);
      }
    },
    analyzeAssignmentQuality() {
      // TODO: 可在此实现分配均匀性、效率等分析，当前为空实现防止报错
    },
    /**
     * 网格化地块并分配给无人机，每个无人机分配到的格子合并为一个区域，只渲染外边界和填色
     * gridSize: 网格行列数（如10）
     */
    assignGridsAndRender(gridSize = 10) {
      if (!this.selectedField || !this.selectedField.coordinates) {
        this.$message.error('请先选中地块');
        return;
      }
      const bounds = this.calculateFieldBounds(this.selectedField.coordinates);
      const minLng = bounds.southwest[0];
      const maxLng = bounds.northeast[0];
      const minLat = bounds.southwest[1];
      const maxLat = bounds.northeast[1];
      const lngStep = (maxLng - minLng) / gridSize;
      const latStep = (maxLat - minLat) / gridSize;
      const gridList = [];
      // 生成网格
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          // 格子四个角坐标
          const lng1 = minLng + i * lngStep;
          const lng2 = minLng + (i + 1) * lngStep;
          const lat1 = minLat + j * latStep;
          const lat2 = minLat + (j + 1) * latStep;
          const corners = [
            [lng1, lat1],
            [lng2, lat1],
            [lng2, lat2],
            [lng1, lat2]
          ];
          // 格子中心
          const center = [(lng1 + lng2) / 2, (lat1 + lat2) / 2];
          // 判断中心点是否在地块内
          if (this.isPointInPolygon(center, this.selectedField.coordinates)) {
            // 计算面积（近似，1度约111km，适合小范围）
            const area = this.calculateGridArea(lng1, lat1, lng2, lat2);
            gridList.push({
              i, j, corners, center, area,
              assignedDrone: null
            });
          }
        }
      }
      // 统计总面积
      const totalArea = gridList.reduce((sum, g) => sum + g.area, 0);
      // 计算每台无人机目标面积
      const drones = this.droneList.map(d => ({...d, assignedGrids: [], targetArea: d.maxArea || totalArea / this.droneList.length}));
      // 计算每台无人机应分配的格子数
      drones.forEach(drone => {
        drone.targetGridCount = Math.round(drone.targetArea / (totalArea / gridList.length));
      });
      // 按顺序分配格子
      let gridIndex = 0;
      drones.forEach(drone => {
        let count = 0;
        while (count < drone.targetGridCount && gridIndex < gridList.length) {
          gridList[gridIndex].assignedDrone = drone.id;
          drone.assignedGrids.push(gridList[gridIndex]);
          count++;
          gridIndex++;
        }
      });
      // 剩余格子轮流分配
      let dIdx = 0;
      while (gridIndex < gridList.length) {
        gridList[gridIndex].assignedDrone = drones[dIdx % drones.length].id;
        drones[dIdx % drones.length].assignedGrids.push(gridList[gridIndex]);
        gridIndex++;
        dIdx++;
      }
      // 渲染：每个无人机的格子集合合并为一个区域，染色并只画外边界
      this.renderDroneAreas(drones);
    },

    // 计算格子面积（近似，适合小范围）
    calculateGridArea(lng1, lat1, lng2, lat2) {
      const R = 6371000; // 地球半径，米
      const toRad = deg => deg * Math.PI / 180;
      const dLng = toRad(lng2 - lng1);
      const dLat = toRad(lat2 - lat1);
      const avgLat = toRad((lat1 + lat2) / 2);
      // 近似矩形面积
      const dx = dLng * R * Math.cos(avgLat);
      const dy = dLat * R;
      return Math.abs(dx * dy) / 666.67; // 转亩
    },

    // 合并格子为区域并渲染
    renderDroneAreas(drones) {
      // 先清除原有区域
      if (this.droneAreaPolygons) {
        this.droneAreaPolygons.forEach(p => this.clusterMap && this.clusterMap.remove(p));
      }
      this.droneAreaPolygons = [];
      // 为每台无人机生成区域
      drones.forEach((drone, idx) => {
        // 合并所有格子的corners为一个多边形区域（可用凸包算法）
        const allPoints = drone.assignedGrids.flatMap(g => g.corners);
        if (allPoints.length < 3) return;
        // 计算凸包作为外边界
        const hull = this.convexHull(allPoints);
        // 生成多边形并染色
        const color = this.getDroneColor(idx);
        const polygon = new this.clusterMapAPI.Polygon({
          path: hull.map(([lng, lat]) => new this.clusterMapAPI.LngLat(lng, lat)),
          fillColor: color,
          fillOpacity: 0.5,
          strokeColor: color,
          strokeWeight: 3,
          zIndex: 20
        });
        this.clusterMap.add(polygon);
        this.droneAreaPolygons.push(polygon);
      });
    },

    // 获取无人机颜色


    // 计算二维点集的凸包（Graham扫描法，返回点的顺序）
    convexHull(points) {
      // 按x、y排序
      points = points.map(p => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lower = [];
      for (let p of points) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
      }
      const upper = [];
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
      }
      upper.pop();
      lower.pop();
      return lower.concat(upper);
    },

    // 简单预计总作业时间计算（每亩作业时间3分钟，每轮换电池10分钟）
    calculateSimpleEstimatedCompletionTime() {
      if (!this.assignmentResults || this.assignmentResults.length === 0) {
        return '--';
      }
      // 每亩作业时间（分钟）
      const timePerMu = 3;
      // 每轮换电池时间（分钟）
      const batteryChangeTime = 10;
      // 每台无人机的总作业时间（分钟）
      let maxTotalTime = 0;
      this.assignmentResults.forEach(assignment => {
        // 分配面积
        const area = assignment.actualArea || assignment.targetArea || 0;
        // 单次最大作业面积（亩）
        const maxAreaPerFlight = assignment.maxArea || 20;
        if (area <= 0 || maxAreaPerFlight <= 0) return;
        // 需要的轮次
        const rounds = Math.ceil(area / maxAreaPerFlight);
        // 每轮作业面积
        const lastRoundArea = area - maxAreaPerFlight * (rounds - 1);
        let totalTime = 0;
        for (let i = 0; i < rounds; i++) {
          const thisRoundArea = (i === rounds - 1) ? lastRoundArea : maxAreaPerFlight;
          totalTime += thisRoundArea * timePerMu;
          if (i < rounds - 1) totalTime += batteryChangeTime;
        }
        maxTotalTime = Math.max(maxTotalTime, totalTime);
      });
      // 格式化为X小时X分X秒
      const hours = Math.floor(maxTotalTime / 60);
      const minutes = Math.floor(maxTotalTime % 60);
      const seconds = Math.round((maxTotalTime - Math.floor(maxTotalTime)) * 60);
      let timeString = '';
      if (hours > 0) timeString += `${hours}小时`;
      if (minutes > 0 || hours > 0) timeString += `${minutes}分`;
      timeString += `${seconds}秒`;
      return timeString;
    },

    // 覆盖预计完成时间的渲染逻辑，优先用简单算法

    // 区域点击事件，弹窗显示详细信息
    onAssignmentPolygonClick(info) {
      // 统计面积和时间
      const totalArea = info.grids.reduce((s, g) => s + (g.area || 0), 0);
      const totalTime = this.estimateDroneTime(info.grids, info.droneId);
      this.assignmentDialogInfo = {
        droneName: info.droneName,
        roundNumber: info.roundNumber,
        totalArea: totalArea.toFixed(2),
        totalTime,
      };
      this.showAssignmentDialog = true;
    },

    // 估算无人机作业时间（可根据地形难度等）
    estimateDroneTime(grids, droneId) {
      // 简单估算：总等效面积 / 无人机效率（假设每亩1分钟）
      const totalEquivalentArea = grids.reduce((s, g) => s + (g.equivalentArea || g.area || 0), 0);
      // 可根据无人机类型查找效率
      const drone = this.droneList.find(d => d.id === droneId);
      const efficiency = drone && drone.efficiency ? drone.efficiency : 1;
      const minutes = totalEquivalentArea / efficiency;
      if (minutes > 60) {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h}小时${m}分钟`;
      } else {
        return `${Math.round(minutes)}分钟`;
      }
    },

    // 色系方案：每架无人机分配一个色系，轮次用深浅变化
    colorSchemes: [
      // 黄色系
      ['#FFD700', '#FFC300', '#FFB300', '#FFF8DC'],
      // 蓝色系
      ['#1E90FF', '#1874CD', '#4682B4', '#B0E0E6'],
      // 红色系
      ['#FF4500', '#CD2626', '#FF6347', '#FFA07A'],
      // 绿色系
      ['#32CD32', '#228B22', '#66CDAA', '#98FB98'],
      // 紫色系
      ['#8A2BE2', '#6A5ACD', '#9370DB', '#E6E6FA'],
      // 橙色系
      ['#FFA500', '#FF8C00', '#FFDAB9', '#FFE4B5']
    ],

    // 获取无人机色系颜色（按index和轮次）
    getDroneColorByIndexAndRound(droneIndex, round) {
      const schemes = this.colorSchemes;
      if (!Array.isArray(schemes) || schemes.length === 0) {
        console.log('[调试] colorSchemes无效', schemes);
        return '#CCCCCC';
      }
      if (typeof droneIndex !== 'number' || droneIndex < 0) {
        console.log('[调试] droneIndex无效', droneIndex);
        return '#CCCCCC';
      }
      const scheme = schemes[droneIndex % schemes.length];
      if (!Array.isArray(scheme) || scheme.length === 0) {
        console.log('[调试] scheme无效', scheme);
        return '#CCCCCC';
      }
      const color = scheme[(round - 1) % scheme.length] || '#CCCCCC';
      console.log('[调试] getDroneColorByIndexAndRound:', { droneIndex, round, color });
      return color;
    },

    // 获取无人机在droneList中的index
    getDroneIndexById(droneId) {
      const idx = this.droneList.findIndex(d => String(d.id) === String(droneId));
      // console.log('[调试] getDroneIndexById:', { droneId, droneList: this.droneList.map(d => d.id), idx });
      return idx;
    },

    // 辅助函数：根据轮次调整颜色（兼容旧用法）
    getRoundColor(baseColor, round, droneId) {
      // 推荐用getDroneColorByIndexAndRound
      const idx = this.getDroneIndexById(droneId);
      if (idx === -1) return baseColor;
      return this.getDroneColorByIndexAndRound(idx, round);
    },

    /**
     * 获取轮次颜色和线型
     * @param {string|undefined} baseColor - 基础颜色（可选）
     * @param {number} round - 轮次
     * @param {string|number} droneId - 无人机id
     * @returns {object} { color, lineType, strokeWidth }
     */
    getRoundStyle(baseColor, round, droneId) {
      // 线型循环
      const lineTypes = ['solid', 'dashed', 'dotted', 'solid'];
      const strokeWidths = [2, 2, 2, 4];
      const idx = (round - 1) % 4;
      // 颜色按无人机色系和轮次
      let color = baseColor;
      if (typeof droneId !== 'undefined') {
        const droneIdx = this.getDroneIndexById(droneId);
        if (typeof droneIdx === 'number' && droneIdx >= 0) {
          color = this.getDroneColorByIndexAndRound(droneIdx, round);
        } else {
          color = '#CCCCCC';
        }
      }
      return {
        color,
        lineType: lineTypes[idx],
        strokeWidth: strokeWidths[idx]
      };
    },

    // 点击分界线弹窗显示该轮所有无人机分配信息
    onRoundBorderClick(info) {
      const roundNumber = info.roundNumber;
      // 统计每架无人机的分配面积和时间
      const stats = this.assignmentResults.map(assignment => {
        let grids = [];
        if (assignment.rounds && assignment.rounds[roundNumber]) {
          grids = assignment.rounds[roundNumber];
        }
        const area = grids.reduce((s, g) => s + (g.area || 0), 0);
        const time = this.estimateDroneTime(grids, assignment.id);
        return {
          droneName: assignment.name,
          droneId: assignment.id,
          area: area.toFixed(2),
          time
        };
      }).filter(item => item.area > 0);
      this.assignmentDialogInfo = {
        roundNumber,
        stats
      };
      this.showAssignmentDialog = true;
    },

    // 新增：为不同轮次生成不同分界线颜色
    getRoundBorderColor(idx, total) {
      // 彩虹色带
      const hue = Math.round((idx / Math.max(1, total - 1)) * 300); // 0~300度色相
      return `hsl(${hue}, 90%, 45%)`;
    },

    // 获取无人机主色（色系原色），用于表格/图例
    getDroneColor(droneId) {
      const idx = this.getDroneIndexById(droneId);
      if (idx === -1 || !this.colorSchemes || !this.colorSchemes.length) return '#CCCCCC';
      const scheme = this.colorSchemes[idx % this.colorSchemes.length];
      if (!scheme || !scheme[0]) return '#CCCCCC';
      return scheme[0]; // 原色
    },
  
  }
    // ...其余 methods 内容
}


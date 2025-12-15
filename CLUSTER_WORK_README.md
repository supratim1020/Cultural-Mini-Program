# 无人机集群作业管理系统

## 功能概述

本系统实现了基于高德地图的无人机集群作业管理功能，包括：

### 1. 农业地图集成
- 高德地图官方农业数据图层
- 地块边界标注和面积计算
- 地势起伏分析

### 2. 地块选择功能
- 通过地图框选地块
- 自动计算地块面积
- 获取地块中心坐标

### 3. 地势分析功能
- 获取地块地势起伏数据
- 分析地形复杂度
- 为任务分配提供数据支持

### 4. 作业规划功能
- 根据面积和地势计算建议无人机数量
- 识别无人机和喷药无人机分别计算
- 预估作业时间

## 技术实现

### 前端 (Vue.js)
- 高德地图API集成
- 地图绘制工具
- 农业数据图层
- 地势分析API调用

### 后端 (Flask)
- 地势分析API (`/api/terrain/analysis`)
- 高德地图高程数据获取
- 地形复杂度计算

## 使用说明

### 1. 启动后端服务
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 2. 启动前端服务
```bash
cd big-screen-vue-datav-master
npm install
npm run serve
```

### 3. 使用流程
1. 点击"选址"按钮开始绘制地块
2. 在地图上绘制多边形地块边界
3. 系统自动计算面积和获取地势数据
4. 点击"计算面积范围"查看详细面积信息
5. 点击"3D地形"查看地势分析结果
6. 点击"规划区域"获取作业建议

## API接口

### 地势分析API
- **URL**: `POST /api/terrain/analysis`
- **参数**:
  ```json
  {
    "bounds": {
      "southwest": [lng, lat],
      "northeast": [lng, lat]
    },
    "apiKey": "your_gaode_api_key"
  }
  ```
- **返回**:
  ```json
  {
    "status": "success",
    "data": {
      "maxElevation": 150.5,
      "minElevation": 120.3,
      "averageElevation": 135.4,
      "elevationRange": 30.2,
      "averageSlope": 8.5,
      "complexity": "medium",
      "samplePoints": 25
    }
  }
  ```

## 配置说明

### 高德地图API Key
- 前端: `b9824a931dff18b4dbd6386eaec5ecb1`
- 后端: 使用相同Key或配置环境变量

### 地图配置
- 容器ID: `cluster-map-container`
- 农业图层: 高德地图官方农业专题数据
- 绘制工具: 多边形绘制

## 注意事项

1. 确保网络连接正常，能够访问高德地图API
2. 地块面积计算基于高德地图几何算法
3. 地势分析需要高德地图高程API支持
4. 建议无人机数量基于面积和地形复杂度计算

## 扩展功能

- 支持多地块管理
- 实时天气数据集成
- 无人机状态监控
- 作业进度跟踪
- 故障模拟和重分配 
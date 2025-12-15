<template>
  <div id="cluster-work" ref="appRef">
    <div class="bg">
      <!-- <dv-loading v-if="loading">Loading...</dv-loading> -->
      <div class="host-body">
        <!-- 第一行标题（参考index.vue） -->
        <div class="d-flex jc-center">
          <dv-decoration-10 class="dv-dec-10" />
          <div class="d-flex jc-center">
            <dv-decoration-8 class="dv-dec-8" :color="decorationColor" />
            <div class="title">
              <span class="title-text">集群作业管理</span>
              <dv-decoration-6
                class="dv-dec-6"
                :reverse="true"
                :color="['#50e3c2', '#67a1e5']"
              />
            </div>
            <dv-decoration-8
              class="dv-dec-8"
              :reverse="true"
              :color="decorationColor"
            />
          </div>
          <dv-decoration-10 class="dv-dec-10-s" />
        </div>
        <!-- 第二行信息栏（参考index.vue） -->
        <div class="d-flex jc-between px-2">
          <div class="d-flex aside-width">
            <div class="react-left ml-4 react-l-s">
              <span class="react-left"></span>
              <span class="text">作业状态监控</span>
            </div>
            <div class="react-left ml-3">
              <span class="text" @click="goToIndex" style="cursor:pointer; color:inherit; text-decoration:none;">病虫害检测平台</span>
            </div>
          </div>
          <div class="d-flex aside-width">
            <div class="react-right bg-color-blue mr-3">
              <span class="text fw-b">集群作业平台</span>
            </div>
            <div class="react-right mr-4 react-l-s">
              <span class="react-after"></span>
              <span class="text">{{ dateYear }} {{ dateWeek }} {{ dateDay }}</span>
            </div>
          </div>
        </div>
        <!-- 主体内容区域 -->
        <div class="body-box">
          <!-- 左侧地图区域 (7fr) -->
          <div class="left-column">
            <div class="grid-item">
              <dv-border-box-12>
                <div class="map-section">
                  <!-- 帮助提示 -->
                  <div class="help-tip" v-if="!selectedField">
                    <i class="el-icon-info"></i>
                    <span>点击"选址"按钮在地图上绘制地块边界，系统将自动计算面积、分析地势并规划无人机作业</span>
                  </div>
                  
                  <!-- 地图操作按钮栏 -->
                  <div class="map-controls">
                    <el-button type="primary" class="control-btn" @click="onSiteSelectionClick" :disabled="terrainLoading">
                      <i class="el-icon-location"></i>
                      选址
                    </el-button>
                    <el-button type="success" class="control-btn" @click="handleAreaCalculation">
                      <i class="el-icon-calculator"></i>
                      计算面积范围
                    </el-button>
                    <el-button type="info" class="control-btn" @click="onAreaPlanningClick" :disabled="terrainLoading">
                      <i class="el-icon-edit-outline"></i>
                      规划区域
                    </el-button>
                    <el-button type="success" class="control-btn" @click="toggleAssignmentDisplay" :disabled="!assignmentResults || assignmentResults.length === 0">
                      <i class="el-icon-view"></i>
                      切换分配显示
                    </el-button>
                    <el-button type="primary" class="control-btn" @click="handleRelocate">
                      <i class="el-icon-refresh"></i>
                      重新定位
                    </el-button>
                    <!-- 🆕 一键生成地形数据按钮 -->
                    <el-button type="success" class="control-btn" @click="generateAllTerrainData" v-if="selectedField">
                      <i class="el-icon-data-analysis"></i>
                      一键生成地形数据
                    </el-button>
                    <!-- 🆕 重新规划按钮 -->
                    <el-button type="warning" class="control-btn" @click="handleReplanning">
                      <i class="el-icon-refresh-left"></i>
                      重新规划
                    </el-button>
                  </div>
                  
                  <!-- 地图组件（高德地图+农业数据） -->
                  <div id="cluster-map-container" class="map-container" v-show="!show3DMap">
                    <div v-if="selectedField" class="field-info-box-abs" style="max-height:400px;overflow-y:auto;">
                      <span class="close-btn" @click="closeFieldInfo">×</span>
                      <h4 style="margin: 0 0 10px 0; color: #388e3c;">地块信息</h4>
                      <div class="field-info-grid">
                        <div class="info-item">
                          <span class="info-label">面积：</span>
                          <span class="info-value">{{ selectedField.area.toFixed(2) }} 亩</span>
                        </div>
                        <div class="info-item">
                          <span class="info-label">中心坐标：</span>
                          <span class="info-value">{{ selectedField.center }}</span>
                        </div>
                        <div class="info-item" v-if="terrainData">
                          <span class="info-label">地势难度：</span>
                          <span class="info-value">{{ (terrainData.difficultyMatrix && terrainData.difficultyMatrix.length) ? '已分析' : '无' }}</span>
                        </div>
                        <div class="info-item" v-if="terrainData">
                          <span class="info-label">高程范围：</span>
                          <span class="info-value">{{ terrainData.elevationMatrix ? Math.min(...[].concat(...terrainData.elevationMatrix)).toFixed(1) : '--' }} ~ {{ terrainData.elevationMatrix ? Math.max(...[].concat(...terrainData.elevationMatrix)).toFixed(1) : '--' }} 米</span>
                        </div>
                        <div class="info-item" v-if="terrainData && terrainData.analysis">
                          <span class="info-label">地形类型：</span>
                          <span class="info-value">{{ getTerrainTypeName(terrainData.terrain_type) }}</span>
                        </div>
                        <div class="info-item" v-if="terrainData && terrainData.comprehensive_matrix">
                          <span class="info-label">作业时间系数：</span>
                          <span class="info-value">{{ terrainData.comprehensive_matrix.stats.avg_work_time_factor.toFixed(2) }}</span>
                        </div>
                      </div>
                      
                      <!-- 综合分析矩阵 -->
                      <div v-if="terrainData && terrainData.comprehensive_matrix" style="margin-top:15px;">
                        <b style="color:#388e3c;">综合分析矩阵：</b>
                        <div style="margin-top:8px;">
                          <el-select v-model="currentMatrixType" size="mini" style="width:120px;margin-bottom:8px;">
                            <el-option label="高程矩阵" value="elevation"></el-option>
                            <el-option label="综合难度矩阵" value="difficulty"></el-option>
                            <el-option label="作业时间系数" value="workTime"></el-option>
                          </el-select>
                          <div style="font-size:11px;color:#666;margin-bottom:4px;">{{ getMatrixTitle(currentMatrixType) }}</div>
                          <div style="display:grid;grid-template-columns:repeat(10,8px);gap:1px;">
                            <span v-for="row in 10" :key="'row'+row">
                              <span v-for="col in 10" :key="'cell'+row+'-'+col" 
                                    :style="{
                                      display:'inline-block',
                                      width:'8px',
                                      height:'8px',
                                      background: getMatrixColor(getMatrixValue(row-1, col-1, currentMatrixType), currentMatrixType),
                                      border:'1px solid #eee',
                                      fontSize:'6px',
                                      textAlign:'center',
                                      lineHeight:'8px',
                                      color:'white',
                                      textShadow:'1px 1px 1px #000'
                                    }"
                                    :title="`${getMatrixTitle(currentMatrixType)}: ${getMatrixValue(row-1, col-1, currentMatrixType).toFixed(2)}`">
                              {{ getMatrixValue(row-1, col-1, currentMatrixType).toFixed(0) }}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      <!-- 无人机颜色图例 - 支持多轮次 -->
                      <div v-if="assignmentResults && assignmentResults.length > 0" style="margin-top: 15px;">
                        <b style="color:#388e3c;">无人机作业图例：</b>
                        <div v-for="assignment in assignmentResults" :key="assignment.id" style="margin-top: 8px;">
                          <div style="display: flex; align-items: center; font-size: 13px; font-weight: bold; margin-bottom: 5px;">
                            <span :style="{ backgroundColor: getDroneColor(assignment.id) }" class="legend-color-box"></span>
                            <span>{{ assignment.name }}</span>
                          </div>
                          <!-- 多轮次图例 -->
                          <div v-if="assignment.rounds && Object.keys(assignment.rounds).length > 1" style="padding-left: 20px; display: flex; flex-direction: column; gap: 4px;">
                            <div v-for="round in Object.keys(assignment.rounds)" :key="round" style="display: flex; align-items: center; font-size: 11px;">
                                <span :style="{ backgroundColor: getRoundColor(getDroneColor(assignment.id), round) }" class="legend-color-box-small"></span>
                                <span>第 {{ round }} 轮</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 等高线信息 -->
                      <div v-if="contourLines.length > 0" style="margin-top:10px;">
                        <b style="color:#388e3c;">等高线信息：</b>
                        <div style="margin-top:4px;font-size:12px;">
                          <div>等高线数量: {{ contourLines.length }} 条</div>
                          <div>高程范围: {{ Math.min(...contourLines.map(c => c.elevation)).toFixed(0) }}m ~ {{ Math.max(...contourLines.map(c => c.elevation)).toFixed(0) }}m</div>
                          <div>间隔: {{ contourLines.length > 1 ? Math.abs(contourLines[1].elevation - contourLines[0].elevation).toFixed(0) : '--' }}m</div>
                        </div>
                      </div>
                      
                      <div v-if="terrainData && terrainData.difficultyMatrix" style="margin-top:10px;">
                        <b style="color:#388e3c;">地势难度热力图：</b>
                        <div style="display:grid;grid-template-columns:repeat(10,12px);gap:1px;margin-top:4px;">
                          <span v-for="(row, i) in terrainData.difficultyMatrix" :key="'row'+i">
                            <span v-for="(val, j) in row" :key="'cell'+i+'-'+j" :style="{display:'inline-block',width:'12px',height:'12px',background:`rgba(255,0,0,${val})`,border:'1px solid #eee'}"></span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  

                </div>
                </div>

              </dv-border-box-12>
            </div>
          </div>
          <!-- 右侧功能区域 (3fr) -->
          <div class="right-column">
            <div class="grid-item">
              <dv-border-box-13>
                <div class="info-card">
                  <!-- 删除虫害检测平台标题和返回首页按钮 -->
                  <div class="drone-controls">
                    <el-button type="primary" size="small" @click="showAddDroneDialog = true">添加无人机</el-button>
                    <el-button type="success" size="small" @click="handleDroneList">无人机列表</el-button>
                    <el-button type="warning" size="small" @click="showAccuracyDialog = true">识别精确度</el-button>
                    <el-button type="success" size="small" @click="showBatchDialogFn">批量作业参数</el-button>
                  </div>
                  
                  <!-- 存储的精确度信息显示 -->
                  <div v-if="storedAccuracy" class="stored-accuracy-info">
                    <div class="accuracy-info-item" style="margin-bottom:2px;font-size:24px;line-height:1.1;">
                      <span class="info-label">当前作物时期：</span>
                      <span class="info-value">{{ storedAccuracy.crop }} - {{ storedAccuracy.period }}</span>
                    </div>
                    <div class="accuracy-info-item" style="margin-bottom:2px;font-size:24px;line-height:1.1;">
                      <span class="info-label">地面分辨率：</span>
                      <span class="info-value">{{ storedAccuracy.value }} cm/像素</span>
                    </div>
                  </div>
                  <div class="drone-stats">
                    <div class="stat-item">
                      <span class="stat-label">在线数量:</span>
                      <span class="stat-value">{{ droneStats.online || 0 }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">作业中:</span>
                      <span class="stat-value">{{ droneStats.working || 0 }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">待机中:</span>
                      <span class="stat-value">{{ droneStats.idle || 0 }}</span>
                    </div>
                  </div>
                </div>
              </dv-border-box-13>
            </div>
            <div class="grid-item">
              <dv-border-box-13>
                <div class="info-card">
                  <h3>作业分析</h3>
                  <div class="analysis-content">
                    <div class="analysis-item">
                      <span class="analysis-label">需要作业的亩数:</span>
                      <span class="analysis-value">{{ calculatedWorkArea.toFixed(2) }} 亩</span>
                    </div>
                    <div class="analysis-item">
                      <span class="analysis-label">已作业面积:</span>
                      <span class="analysis-value">{{ workAnalysis.completedArea || 0 }} 亩</span>
                    </div>
                    <div class="analysis-item">
                      <span class="analysis-label">预计完成时间:</span>
                      <span class="analysis-value">{{ workAnalysis.estimatedTime || '--' }}</span>
                    </div>
                    <div class="analysis-item">
                      <span class="analysis-label">作业进度:</span>
                      <el-progress :percentage="workAnalysis.progress || 0" :stroke-width="8"></el-progress>
                    </div>
                  </div>
                </div>
              </dv-border-box-13>
            </div>
            <div class="grid-item">
              <dv-border-box-13>
                <div class="info-card">
                  <h3>故障模拟</h3>
                  <div class="fault-simulation">
                    <el-select v-model="selectedDrone" placeholder="选择无人机" size="small" style="width: 100%; margin-bottom: 10px;">
                      <el-option 
                        v-for="drone in droneList" 
                        :key="drone.id" 
                        :label="drone.name" 
                        :value="drone.id"
                      >
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                          <div>
                            <span style="font-weight: 500;">{{ drone.name }}</span>
                            <br>
                            <span style="color: #8492a6; font-size: 12px;">
                              {{ getDroneTypeName(drone.type) }} | {{ drone.status === 'online' ? '在线' : drone.status === 'idle' ? '待机' : '维护中' }}
                            </span>
                          </div>
                          <div style="text-align: right; font-size: 11px; color: #909399;">
                            <div>续航: {{ drone.endurance }}分钟</div>
                            <div>高度: {{ drone.maxHeight }}米</div>
                          </div>
                        </div>
                      </el-option>
                    </el-select>
                    <el-select v-model="faultType" placeholder="故障类型" size="small" style="width: 100%; margin-bottom: 10px;">
                      <el-option label="电量不足" value="low_battery"></el-option>
                      <el-option label="信号丢失" value="signal_lost"></el-option>
                      <el-option label="机械故障" value="mechanical"></el-option>
                    </el-select>
                    <el-button type="danger" size="small" @click="simulateFault" style="width: 100%;">模拟故障</el-button>
                  </div>
                </div>
              </dv-border-box-13>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 弹窗放回.bg内部 -->
    <el-dialog
      title="添加无人机"
      :visible.sync="showAddDroneDialog"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      custom-class="drone-dialog"
      @open="loading = true"
      :z-index="5000"
      :modal="false"
    >
      <el-form
        :model="droneForm"
        :rules="droneFormRules"
        ref="droneForm"
        label-width="120px"
        class="drone-form"
      >
        <el-form-item label="无人机名称" prop="name">
          <el-input
            v-model="droneForm.name"
            placeholder="请输入无人机名称"
            maxlength="20"
            show-word-limit
          ></el-input>
        </el-form-item>

        <el-form-item label="机型" prop="type">
          <el-select v-model="droneForm.type" placeholder="请选择机型" style="width: 100%;" @change="onTypeChange">
            <el-option label="mavic2pro" value="mavic2pro"></el-option>
            <el-option label="Phantom4RTK" value="Phantom4RTK"></el-option>
            <el-option label="Mavic3M" value="Mavic3M"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="续航时间(分钟)" prop="endurance">
          <el-input-number
            v-model="droneForm.endurance"
            :min="1"
            :max="120"
            :step="1"
            style="width: 100%;"
          ></el-input-number>
          <span style="margin-left: 8px; color: #666;">分钟</span>
        </el-form-item>

        <el-form-item label="fov视场角(度)" prop="fov">
          <el-input-number
            v-model="droneForm.fov"
            :min="1"
            :max="180"
            :step="1"
            style="width: 100%;"
          ></el-input-number>
          <span style="margin-left: 8px; color: #666;">度</span>
        </el-form-item>

        <el-form-item label="最快快门(次)" prop="max_times">
          <el-input-number
            v-model="droneForm.max_times"
            :min="1"
            :max="10000"
            :step="1"
            style="width: 100%;"
          ></el-input-number>
          <span style="margin-left: 8px; color: #666;">次</span>
        </el-form-item>

        <el-form-item label="功能" prop="function">
          <el-select v-model="droneForm.function" placeholder="请选择功能" style="width: 100%;">
            <el-option label="巡检" value="inspect"></el-option>
            <el-option label="喷洒药物" value="spray"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="最大飞行高度(米)" prop="max_height">
          <el-input-number
            v-model="droneForm.max_height"
            :min="1"
            :max="121"
            :step="1"
            style="width: 100%;"
          ></el-input-number>
          <span style="margin-left: 8px; color: #666;">米</span>
        </el-form-item>

        <el-form-item label="最大飞行速度(m/s)" prop="max_speed">
          <el-input-number
            v-model="droneForm.max_speed"
            :min="1"
            :max="15"
            :step="1"
            style="width: 100%;"
          ></el-input-number>
          <span style="margin-left: 8px; color: #666;">m/s</span>
        </el-form-item>

        <el-form-item label="焦距(f)" prop="focal_length">
          <el-input-number
            v-model="droneForm.focal_length"
            :min="10"
            :max="100"
            :step="0.1"
            :precision="1"
            style="width: 100%;"
          ></el-input-number>
          <span style="margin-left: 8px; color: #666;">mm</span>
        </el-form-item>

        <el-form-item label="像素尺寸(p)" prop="pixel_size">
          <el-input-number
            v-model="droneForm.pixel_size"
            :min="1"
            :max="10"
            :step="0.1"
            :precision="1"
            style="width: 100%;"
          ></el-input-number>
          <span style="margin-left: 8px; color: #666;">微米</span>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-select v-model="droneForm.status" placeholder="请选择状态" style="width: 100%;">
            <el-option label="在线" value="online"></el-option>
            <el-option label="待机" value="idle"></el-option>
            <el-option label="维修中" value="maintenance"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="cancelAddDrone">取 消</el-button>
        <el-button type="primary" @click="submitAddDrone" :loading="submittingDrone">确 定</el-button>
      </span>
    </el-dialog>

    <!-- 识别精确度对话框 -->
    <el-dialog
      title="识别精确度设置"
      :visible.sync="showAccuracyDialog"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      custom-class="accuracy-dialog"
      :z-index="5000"
      :modal="false"
    >
      <div class="accuracy-form">
        <div class="form-tip">
          <i class="el-icon-info"></i>
          <span>请选择作物类型和生长周期，确认后将存储精确度数据</span>
        </div>
        <div class="form-item">
          <label>作物类型：</label>
          <el-select v-model="selectedCrop" placeholder="请选择作物类型" @change="onCropChange" style="width: 100%;">
            <el-option
              v-for="crop in cropTypes"
              :key="crop.value"
              :label="crop.label"
              :value="crop.value">
            </el-option>
          </el-select>
        </div>
        <div class="form-item">
          <label>生长周期：</label>
          <el-select v-model="selectedPeriod" placeholder="请选择生长周期" :disabled="!selectedCrop" style="width: 100%;">
            <el-option
              v-for="period in availablePeriods"
              :key="period.value"
              :label="period.label"
              :value="period.value">
            </el-option>
          </el-select>
        </div>
        <div class="form-item">
          <label>航向重叠率(%)：</label>
          <el-input-number v-model="headingOverlapInput" :min="0" :max="100" :step="1" style="width: 100%;" />
        </div>
        <div class="form-item">
          <label>横向重叠率(%)：</label>
          <el-input-number v-model="sideOverlapInput" :min="0" :max="100" :step="1" style="width: 100%;" />
        </div>
        <!-- 查询结果显示 -->
        <div v-if="accuracyResult !== null" class="result-display">
          <h4>当前查询结果</h4>
          <div class="result-item">
            <span class="result-label">地面分辨率：</span>
            <span class="result-value">{{ accuracyResult }} cm/像素</span>
          </div>
          <div class="result-item" v-if="storedAccuracy">
            <span class="result-label">已存储数据：</span>
            <span class="result-value">{{ storedAccuracy.crop }} - {{ storedAccuracy.period }}: {{ storedAccuracy.value }} cm/像素</span>
          </div>
          <div class="result-item">
            <span class="result-label">已存储航向重叠率：</span>
            <span class="result-value">{{ storedHeadingOverlap }}%</span>
          </div>
          <div class="result-item">
            <span class="result-label">已存储横向重叠率：</span>
            <span class="result-value">{{ storedSideOverlap }}%</span>
          </div>
        </div>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="showAccuracyDialog = false">关闭</el-button>
        <el-button type="primary" @click="confirmAccuracy" :disabled="!selectedCrop || !selectedPeriod">确认并存储</el-button>
      </span>
    </el-dialog>

    <el-dialog
      title="批量作业参数计算结果"
      :visible.sync="showBatchDialog"
      width="700px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      append-to-body
    >
      <div v-if="batchError" style="color:#f56c6c;font-weight:bold;">{{ batchError }}</div>
      
      <el-table v-else :data="batchResults" border stripe style="width:100%;margin-top:10px;">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="height" label="飞行高度(米)" width="120" />
        <el-table-column prop="width" label="扫描宽度(米)" width="120" />
        <el-table-column prop="speed" label="建议速度(m/s)" width="120" />
        <el-table-column prop="areaMu" label="作业亩数(亩)" width="120" />
      </el-table>
      <span slot="footer" class="dialog-footer">

        <el-button @click="showBatchDialog = false">关闭</el-button>
      </span>
    </el-dialog>

    <el-dialog
      title="作业分配详情"
      :visible.sync="showAssignmentDialog"
      width="400px"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      v-if="assignmentDialogInfo"
    >
      <div style="font-size:16px;line-height:2;">
        <div><b>无人机名称：</b>{{ assignmentDialogInfo.droneName }}</div>
        <div><b>轮次：</b>第{{ assignmentDialogInfo.roundNumber }}轮</div>
        <div><b>分配面积：</b>{{ assignmentDialogInfo.totalArea }} 亩</div>
        <div><b>预计作业时间：</b>{{ assignmentDialogInfo.totalTime }}</div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="showAssignmentDialog = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import ClusterWorkLogic from './Cluster_work.js';


export default {
  mixins: [ClusterWorkLogic],
  methods: {
    goToIndex() {
      if (this.$router) {
        this.$router.push({ path: '/index' });
      } else {
        window.location.href = '/index.html';
      }
    }
  }
}

</script>

<style lang="scss" scoped>
@import '../assets/scss/index.scss';

#cluster-work {
  color: #d3d6dd;
  width: 1920px;
  height: 1080px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transform-origin: left top;
  overflow: hidden;

  .bg {
    width: 100%;
    height: 100%;
    padding: 16px 16px 0 16px;
    background: url("../assets/bj2.png") no-repeat center center;
    background-size: cover;
  }

  .host-body {
    .dv-dec-10,
    .dv-dec-10-s {
      width: 33.3%;
      height: 5px;
    }
    .dv-dec-10-s {
      transform: rotateY(180deg);
    }
    .dv-dec-8 {
      width: 200px;
      height: 50px;
    }
    .title {
      position: relative;
      width: 600px;
      text-align: center;
      background-size: cover;
      background-repeat: no-repeat;

      .title-text {
        font-size: 32px;
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translate(-50%);
      }

      .dv-dec-6 {
        position: absolute;
        bottom: -30px;
        left: 50%;
        width: 250px;
        height: 8px;
        transform: translate(-50%);
      }
    }

    // 第二行
    .aside-width {
      width: 40%;
    }
    .react-r-s,
    .react-l-s {
      background-color: #0f1325;
    }

    // 平行四边形
    .react-right {
      &.react-l-s {
        text-align: right;
        width: 500px;
      }
      font-size: 18px;
      width: 300px;
      line-height: 50px;
      text-align: center;
      transform: skewX(-45deg);

      .react-after {
        position: absolute;
        right: -25px;
        top: 0;
        height: 50px;
        width: 50px;
        background-color: #0f1325;
        transform: skewX(45deg);
      }

      .text {
        display: inline-block;
        transform: skewX(45deg);
      }
    }

    .react-left {
      &.react-l-s {
        width: 500px;
        text-align: left;
      }
      font-size: 18px;
      width: 300px;
      height: 50px;
      line-height: 50px;
      text-align: center;
      transform: skewX(45deg);
      background-color: #0f1325;

      .react-left {
        position: absolute;
        left: -25px;
        top: 0;
        height: 50px;
        width: 50px;
        background-color: #0f1325;
        transform: skewX(-45deg);
      }

      .text {
        display: inline-block;
        transform: skewX(-45deg);
      }
    }

    .body-box {
      height: 950px;
      min-height: 0;
      margin-top: 16px;
      display: grid;
      grid-template-columns: 7fr 3fr;
      gap: 16px;
      overflow: hidden;
    }

    .left-column {
      display: flex;
      flex-direction: column;
      height: 950px;
      min-height: 0;
      overflow: hidden;
    }

    .right-column {
      display: grid;
      grid-template-rows: repeat(3, 1fr);
      gap: 16px;
      height: 950px;
      min-height: 500px;
      overflow: hidden;
    }

    .grid-item {
      min-height: 0;
      height: 100%;
    }

    .center-column {
      background: rgba(16, 42, 90, 0.7);
      border-radius: 8px;
      box-shadow: 0 0 20px rgba(0, 150, 255, 0.3);
      padding: 20px;
    }

    .cluster-info {
      color: #fff;
      h3 {
        margin-bottom: 20px;
        color: #50e3c2;
      }
    }
  }
}

.map-section {
  width: 100%;
  height: 100%;
  position: relative;
  background: rgba(16, 42, 90, 0.7);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 16px;
}

.help-tip {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  color: #2196f3;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 600px;
  
  i {
    font-size: 16px;
    color: #2196f3;
  }
}

.map-controls {
  width: 100%;
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 8px;
  flex-wrap: wrap;
}

.control-btn {
  flex: 1;
  min-width: 120px;
  height: 40px;
  font-size: 13px;
  border-radius: 6px;
  
  i {
    margin-right: 3px;
  }
}

.map-container {
  width: 100%;
  height: calc(100% - 120px);
  min-height: 400px;
  background: rgba(200, 230, 201, 0.3);
  border: 2px dashed #388e3c;
  border-radius: 12px;
  margin-bottom: 16px;
  position: relative;
  display: block;
  
  // 地块信息绝对定位在地图容器内
  .field-info-box-abs {
    background: rgba(255, 253, 231, 0.95);
    border: 1px solid #ffd54f;
    border-radius: 8px;
    padding: 12px 20px 12px 20px;
    color: #6d4c41;
    box-shadow: 0 2px 8px rgba(255, 213, 79, 0.1);
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 20;
    width: 340px;
    max-width: 90vw;
    min-width: 220px;
    min-height: 80px;
    .close-btn {
      position: absolute;
      top: 8px;
      right: 12px;
      font-size: 20px;
      color: #888;
      cursor: pointer;
      font-weight: bold;
      z-index: 21;
      transition: color 0.2s;
      &:hover {
        color: #d32f2f;
      }
    }
  }
  
  // 3D地图控件样式
  .map-3d-controls {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    background: rgba(255, 255, 255, 0.1);
    padding: 16px;
    border-radius: 16px;
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    
    // 状态指示器样式
    .status-indicator {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      padding: 12px;
      min-width: 180px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      
      .status-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        
        i {
          color: #409eff;
          font-size: 16px;
        }
        
        span {
          font-weight: 600;
          color: #2c3e50;
          font-size: 14px;
        }
      }
      
      .status-items {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        
        .status-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
      
          i {
            font-size: 12px;
            color: #999;
          }
          
          span {
            font-size: 11px;
            color: #666;
            font-weight: 500;
          }
          
          &.active {
            background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
            box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3);
            
            i, span {
              color: white;
            }
          }
          
          &:not(.active) {
      &:hover {
              background: rgba(0, 0, 0, 0.1);
            }
          }
        }
      }
    }
    
    .control-group {
      position: relative;
      
      .control-btn-3d {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
        border: 2px solid rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 12px 16px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        min-width: 120px;
        height: auto;
        position: relative;
        overflow: hidden;
        
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.5s;
        }
        
        &:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 100%);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          border-color: rgba(255, 255, 255, 0.5);
          
          &::before {
            left: 100%;
          }
          
          .btn-tip {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        &:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        i {
          font-size: 18px;
          margin-bottom: 4px;
          color: #2c3e50;
        }
        
        .btn-text {
          font-weight: 600;
          font-size: 13px;
          color: #2c3e50;
          text-align: center;
          line-height: 1.2;
        }
        
        .btn-tip {
          font-size: 10px;
          color: #7f8c8d;
          text-align: center;
          opacity: 0.8;
          transform: translateY(-2px);
          transition: all 0.3s ease;
          line-height: 1.2;
        }
      }
      
      // 不同按钮类型的特殊样式
      .el-button--primary {
        background: linear-gradient(135deg, rgba(64, 158, 255, 0.95) 0%, rgba(64, 158, 255, 0.85) 100%);
        border-color: rgba(64, 158, 255, 0.4);
        
        &:hover {
          background: linear-gradient(135deg, rgba(64, 158, 255, 1) 0%, rgba(64, 158, 255, 0.95) 100%);
          border-color: rgba(64, 158, 255, 0.6);
        }
        
        i, .btn-text {
          color: white;
        }
        
        .btn-tip {
          color: rgba(255, 255, 255, 0.8);
        }
      }
      
      .el-button--success {
        background: linear-gradient(135deg, rgba(103, 194, 58, 0.95) 0%, rgba(103, 194, 58, 0.85) 100%);
        border-color: rgba(103, 194, 58, 0.4);
        
        &:hover {
          background: linear-gradient(135deg, rgba(103, 194, 58, 1) 0%, rgba(103, 194, 58, 0.95) 100%);
          border-color: rgba(103, 194, 58, 0.6);
        }
        
        i, .btn-text {
          color: white;
        }
        
        .btn-tip {
          color: rgba(255, 255, 255, 0.8);
        }
      }
      
      .el-button--warning {
        background: linear-gradient(135deg, rgba(230, 162, 60, 0.95) 0%, rgba(230, 162, 60, 0.85) 100%);
        border-color: rgba(230, 162, 60, 0.4);
        
        &:hover {
          background: linear-gradient(135deg, rgba(230, 162, 60, 1) 0%, rgba(230, 162, 60, 0.95) 100%);
          border-color: rgba(230, 162, 60, 0.6);
        }
        
        i, .btn-text {
          color: white;
        }
        
        .btn-tip {
          color: rgba(255, 255, 255, 0.8);
        }
      }
      
      .el-button--info {
        background: linear-gradient(135deg, rgba(144, 147, 153, 0.95) 0%, rgba(144, 147, 153, 0.85) 100%);
        border-color: rgba(144, 147, 153, 0.4);
        
        &:hover {
          background: linear-gradient(135deg, rgba(144, 147, 153, 1) 0%, rgba(144, 147, 153, 0.95) 100%);
          border-color: rgba(144, 147, 153, 0.6);
        }
        
        i, .btn-text {
          color: white;
        }
        
        .btn-tip {
          color: rgba(255, 255, 255, 0.8);
        }
      }
      
      .el-button--danger {
        background: linear-gradient(135deg, rgba(245, 108, 108, 0.95) 0%, rgba(245, 108, 108, 0.85) 100%);
        border-color: rgba(245, 108, 108, 0.4);
        
        &:hover {
          background: linear-gradient(135deg, rgba(245, 108, 108, 1) 0%, rgba(245, 108, 108, 0.95) 100%);
          border-color: rgba(245, 108, 108, 0.6);
        }
        
        i, .btn-text {
          color: white;
        }
        
        .btn-tip {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
  }
  
  // Three.js 3D地形容器
  .threejs-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: linear-gradient(135deg, #87CEEB 0%, #98FB98 100%);
    border-radius: 8px;
    overflow: hidden;
    
    canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }
  }
  

  
  // 3D地形信息面板
  .terrain-3d-info {
    position: absolute;
    top: 80px;
    right: 10px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    min-width: 200px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    z-index: 1000;
    
    h4 {
      margin: 0 0 10px 0;
      color: #2c3e50;
      font-size: 16px;
      font-weight: bold;
    }
    
    .terrain-stats {
      .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5px 0;
        border-bottom: 1px solid #eee;
        font-size: 14px;
        
        &:last-child {
          border-bottom: none;
        }
        
        span:first-child {
          color: #666;
          font-weight: 500;
        }
        
        span:last-child {
          color: #2c3e50;
          font-weight: bold;
        }
      }
    }
  }
}

.map-placeholder {
  width: 90%;
  height: 60vh;
  background: rgba(200, 230, 201, 0.3);
  border: 2px dashed #388e3c;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #388e3c;
  font-size: 1.2em;
  margin-bottom: 16px;
}

.field-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.info-label {
  font-weight: 500;
  color: #5d4037;
  font-size: 14px;
}

.info-value {
  font-weight: bold;
  color: #388e3c;
  font-size: 14px;
}

.partition-btn {
  margin-top: 8px;
  background: #43a047;
  border: none;
}

.info-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 18px 16px;
  margin-bottom: 8px;
  color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  h3 {
    color: #50e3c2;
    margin-bottom: 15px;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(80, 227, 194, 0.3);
  }
}

.drone-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
}

.stored-accuracy-info {
  background: rgba(230, 162, 60, 0.1);
  border: 1px solid rgba(230, 162, 60, 0.3);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  
  .accuracy-info-item {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .info-label {
      color: #e6a23c;
      font-size: 13px;
      font-weight: 600;
      margin-right: 8px;
      min-width: 80px;
    }
    
    .info-value {
      color: #2c3e50;
      font-size: 13px;
      font-weight: 500;
    }
  }
}

.drone-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  /* 调整数字与汉字的距离 */
  .stat-label {
    color: #1e3a8a;
    font-size: 15px;
    font-weight: 500;
    text-shadow: 0 0 5px rgba(30, 58, 138, 0.3);
    margin-right: 4px; /* 原来可能更大，这里缩小 */
  }
  .stat-value {
    color: #000;
    font-weight: bold;
    font-size: 18px;
    margin-left: 0; /* 去掉多余间距 */
  }
}

.analysis-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.analysis-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.analysis-label {
  color: #1e3a8a;
  font-size: 15px;
  font-weight: 500;
  text-shadow: 0 0 5px rgba(30, 58, 138, 0.3);
}

.analysis-value {
  color: #50e3c2;
  font-weight: bold;
  font-size: 18px;
}

.fault-simulation {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

// 工具类
.d-flex {
  display: flex;
}

.jc-center {
  justify-content: center;
}

.jc-between {
  justify-content: space-between;
}

.px-2 {
  padding-left: 16px;
  padding-right: 16px;
}

.ml-3 {
  margin-left: 12px;
}

.ml-4 {
  margin-left: 16px;
}

.mr-3 {
  margin-right: 12px;
}

.mr-4 {
  margin-right: 16px;
}

.fw-b {
  font-weight: bold;
}

.bg-color-blue {
  background-color: #568aea;
}

// 无人机对话框样式
.drone-dialog {
  .el-dialog__header {
    background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
    color: white;
    border-radius: 8px 8px 0 0;
    
    .el-dialog__title {
      color: white;
      font-weight: 600;
    }
    
    .el-dialog__headerbtn .el-dialog__close {
      color: white;
      
      &:hover {
        color: #f0f0f0;
      }
    }
  }
  
  .el-dialog__body {
    padding: 30px;
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .drone-form {
    .el-form-item {
      margin-bottom: 24px;
      
      .el-form-item__label {
        font-weight: 600;
        color: #2c3e50;
      }
      
      .el-input-number {
        width: 100%;
      }
      
      .el-select {
        width: 100%;
      }
    }
    
    .el-form-item__content {
      .el-input__inner {
        border-radius: 6px;
        border: 1px solid #dcdfe6;
        transition: all 0.3s;
        
        &:focus {
          border-color: #409eff;
          box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
        }
      }
      
      .el-textarea__inner {
        border-radius: 6px;
        border: 1px solid #dcdfe6;
        transition: all 0.3s;
        
        &:focus {
          border-color: #409eff;
          box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
        }
      }
    }
  }
  
  .dialog-footer {
    text-align: right;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;
    
    .el-button {
      border-radius: 6px;
      padding: 10px 20px;
      font-weight: 500;
      
      &--primary {
        background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
        border: none;
        
        &:hover {
          background: linear-gradient(135deg, #66b1ff 0%, #85ce61 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
        }
      }
    }
  }
}

// 识别精确度对话框样式
.accuracy-dialog {
  .el-dialog__header {
    background: linear-gradient(135deg, #e6a23c 0%, #f56c6c 100%);
    color: white;
    border-radius: 8px 8px 0 0;
    
    .el-dialog__title {
      color: white;
      font-weight: 600;
    }
    
    .el-dialog__headerbtn .el-dialog__close {
      color: white;
      
      &:hover {
        color: #f0f0f0;
      }
    }
  }
  
  .el-dialog__body {
    padding: 30px;
  }
  
  .accuracy-form {
    .form-tip {
      background: #f0f9ff;
      border: 1px solid #b3d8ff;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      
      i {
        color: #409eff;
        font-size: 16px;
      }
      
      span {
        color: #606266;
        font-size: 13px;
      }
    }
    
    .form-item {
      margin-bottom: 20px;
      
      label {
        display: block;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 8px;
      }
      
      .el-select {
        width: 100%;
      }
    }
    
    .result-display {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid #409eff;
      
      h4 {
        margin: 0 0 10px 0;
        color: #2c3e50;
        font-size: 16px;
      }
      
      .result-item {
        display: flex;
        align-items: center;
        gap: 10px;
        
        .result-label {
          font-weight: 600;
          color: #606266;
        }
        
        .result-value {
          color: #409eff;
          font-weight: bold;
          font-size: 16px;
        }
      }
    }
  }
  
  .dialog-footer {
    text-align: right;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;
    
    .el-button {
      border-radius: 6px;
      padding: 10px 20px;
      font-weight: 500;
      
      &--primary {
        background: linear-gradient(135deg, #e6a23c 0%, #f56c6c 100%);
        border: none;
        
        &:hover {
          background: linear-gradient(135deg, #ebb563 0%, #f78989 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(230, 162, 60, 0.3);
        }
      }
    }
  }
}

.legend-color-box {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  margin-right: 6px;
  border: 1px solid rgba(0,0,0,0.2);
}
.legend-color-box-small {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 2px;
  margin-right: 5px;
  border: 1px solid rgba(0,0,0,0.1);
}

</style>


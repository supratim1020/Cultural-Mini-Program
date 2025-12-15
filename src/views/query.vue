<template>
  <div class="agri-tech-bg">
    <el-button class="back-button" type="primary" icon="el-icon-arrow-left" @click="goBack" style="position:absolute;top:25px;left:25px;z-index:10;">返回首页</el-button>
    <div class="history-container">
      <div class="page-header">
        <h1 class="main-title">智慧农业病虫害防治效果评估系统</h1>
        <div class="header-actions">
          <el-button type="success" icon="el-icon-search" @click="handleQuery">查询历史记录</el-button>
          <el-button
            type="primary"
            icon="el-icon-s-data"
            @click="handleComparison"
            :disabled="selectedSessions.length < 2"
          >
            对比分析
          </el-button>
        </div>
      </div>

      <div class="main-page-placeholder" v-if="!showData && !loading">
        <i class="el-icon-document-copy"></i>
        <p>点击"查询历史记录"以查看详细数据</p>
        <p>或勾选数据后进行"对比分析"</p>
      </div>

      <!-- 历史记录表格常驻显示 -->
      <div v-if="showData">
        <el-card class="data-card">
          <div slot="header" class="card-header">
            <span><i class="el-icon-tickets"></i> 检测数据列表</span>
          </div>
          <el-table
            ref="multipleTable"
            :data="pagedData"
            border
            style="width: 100%"
            :header-cell-style="tableHeaderStyle"
            row-class-name="compact-row"
            height="55vh"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" align="center"></el-table-column>
            <el-table-column prop="location" label="农田位置" width="120">
              <template slot-scope="{ row }">
                <el-tag size="medium" type="success">
                  <i class="el-icon-location"></i> {{ row.location }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="model" label="检测模型" width="120">
              <template slot-scope="{ row }">
                <el-tag size="medium" type="warning">
                  <i class="el-icon-cpu"></i> {{ row.model }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="病虫害统计" width="300">
              <template slot-scope="{ row }">
                <div class="pest-data">
                  <el-progress
                    v-for="(value, key) in row.counts"
                    :key="key"
                    :percentage="getPercentage(value, getTotalCount(row.counts))"
                    :format="() => key + ': ' + value"
                    :stroke-width="15"
                    :color="getProgressColor(key)"
                  ></el-progress>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="农药用量" width="120">
              <template slot-scope="{ row }">
                <div class="metric-value">
                  <i class="el-icon-water-cup"></i>
                  {{ row.pesticide }} 升
                </div>
              </template>
            </el-table-column>

            <el-table-column label="检测面积" width="120">
              <template slot-scope="{ row }">
                <div class="metric-value">
                  <i class="el-icon-crop"></i>
                  {{ row.area }} 亩
                </div>
              </template>
            </el-table-column>

            <el-table-column label="检测详情">
              <template slot-scope="{ row }">
                <div class="detection-info">
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="开始时间">
                      <i class="el-icon-time"></i> {{ formatTime(row.start_time) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="结束时间">
                      <i class="el-icon-timer"></i> {{ formatTime(row.end_time) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="总检出数">
                      <el-badge :value="getTotalCount(row.counts)" type="warning">
                        <i class="el-icon-warning-outline"></i>
                      </el-badge>
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="90">
              <template slot-scope="{ row }">
                <el-button type="danger" size="mini" icon="el-icon-delete" @click="deleteSession(row.session_id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="showData && historyData.length > pageSize"
            style="margin-top: 20px; text-align: right"
            background
            layout="prev, pager, next, jumper"
            :total="historyData.length"
            :page-size="pageSize"
            :current-page.sync="currentPage"
            @current-change="handlePageChange">
          </el-pagination>
        </el-card>
      </div>
    </div>

    <!-- AI分析弹窗 -->
    <el-dialog
      title="农技专家建议"
      :visible.sync="dialogVisible"
      width="60%"
      top="5vh"
      :close-on-click-modal="false"
      custom-class="farmer-dialog"
    >
      <div class="farmer-dialog-container">
        <div class="farmer-avatar">
          <img src="@/assets/famer.png" alt="农技专家" style="width: 90px; height: 90px; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.08); background: #fff; object-fit: cover;" />
        </div>
        <div class="speech-bubble-wrapper">
          <div class="speech-bubble" v-loading="aiLoading">
            <pre v-if="aiAdvice">{{ aiAdvice }}</pre>
            <div v-else class="ai-placeholder">
              <p>农技专家正在分析您选择的数据...</p>
              <p>请稍候片刻。</p>
            </div>
          </div>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="dialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import Vue from 'vue'
import { 
  Button, 
  Table, 
  TableColumn, 
  Loading, 
  Card, 
  Tag, 
  Progress,
  Descriptions,
  DescriptionsItem,
  Badge
} from 'element-ui'
import axios from 'axios'

// 局部注册组件
Vue.use(Loading)
;[
  Button, 
  Table, 
  TableColumn, 
  Card, 
  Tag, 
  Progress,
  Descriptions,
  DescriptionsItem,
  Badge
].forEach(component => {
  Vue.component(component.name, component)
})

export default {
  name: 'HistoryQuery',
  data() {
    return {
      showData: false,
      loading: false,
      historyData: [],
      tableHeaderStyle: {
        background: '#f0f9eb',
        color: '#67c23a',
        fontWeight: 'bold'
      },
      currentPage: 1,
      pageSize: 7,
      selectedSessions: [],
      dialogVisible: false,
      aiLoading: false,
      aiAdvice: '',
    }
  },
  computed: {
    pagedData() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.historyData.slice(start, start + this.pageSize)
    }
  },
  methods: {
    async handleQuery() {
      this.loading = true
      try {
        const response = await axios.get('http://localhost:5000/api/sessions')
        this.historyData = response.data
        this.showData = true
        this.currentPage = 1 // 查询后重置到第一页
      } catch (error) {
        console.error('获取历史数据失败:', error)
        this.$message.error('获取历史数据失败，请稍后重试')
      } finally {
        this.loading = false
      }
    },
    handlePageChange(page) {
      this.currentPage = page
    },
    formatTime(timeStr) {
      if (!timeStr) return '未结束'
      const date = new Date(timeStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    },
    getTotalCount(counts) {
      return Object.values(counts).reduce((sum, count) => sum + count, 0)
    },
    getPercentage(value, total) {
      return total ? Math.round((value / total) * 100) : 0
    },
    getProgressColor(pestName) {
      // 根据不同的病虫害类型返回不同的颜色
      const colorMap = {
        'Crambidae': '#f56c6c',    // 红色
        'Thripidae': '#e6a23c',    // 橙色
        'Noctuidae': '#f56c6c',    // 红色
        'Delphacidae': '#e6a23c',  // 橙色
        'default': '#67c23a'       // 默认绿色
      }
      return colorMap[pestName] || colorMap.default
    },
    async deleteSession(sessionId) {
      this.loading = true
      try {
        await axios.delete(`http://localhost:5000/api/session/${sessionId}`)
        this.$message.success('删除成功')
        await this.handleQuery() // 删除后刷新数据
      } catch (error) {
        this.$message.error('删除失败')
      } finally {
        this.loading = false
      }
    },
    handleSelectionChange(val) {
      this.selectedSessions = val;
    },
    async handleComparison() {
      this.dialogVisible = true;
      this.aiLoading = true;
      this.aiAdvice = '';
      try {
        const response = await axios.post('http://localhost:3000/api/ai-comparison', { records: this.selectedSessions }, { timeout: 60000 });
        this.aiAdvice = response.data.advice;
      } catch (error) {
        this.aiAdvice = '分析失败，请检查服务或稍后再试。';
        console.error('AI comparison failed:', error);
      } finally {
        this.aiLoading = false;
      }
    },
    goBack() {
      this.$router.push({ name: 'index' });
    }
  }
}
</script>

<style>
/* 全局样式 */
@import '~element-ui/lib/theme-chalk/index.css';

/* 局部样式 */
.agri-tech-bg {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  min-height: 100vh;
  padding: 20px;
}

.history-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
  margin-top: 50px;
}

.main-title {
  color: #2c5530;
  font-size: 28px;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.data-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  font-size: 18px;
  color: #2c5530;
}

.card-header i {
  margin-right: 8px;
  font-size: 20px;
}

.pest-data {
  padding: 10px;
}

.pest-data .el-progress {
  margin-bottom: 10px;
}

.pest-data .el-progress:last-child {
  margin-bottom: 0;
}

.metric-value {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #606266;
}

.metric-value i {
  margin-right: 5px;
  font-size: 16px;
  color: #67c23a;
}

.detection-info {
  padding: 5px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 10px;
}

.loading {
  text-align: center;
  margin: 40px 0;
}

/* 表格样式优化 */
.el-table {
  border-radius: 8px;
  overflow: hidden;
}

.el-table th {
  background-color: #f0f9eb !important;
}

.el-descriptions {
  margin: 0;
}

.el-descriptions__body {
  background-color: transparent;
}

.compact-row {
  height: 38px !important;
  font-size: 13px;
}

.dialog-content {
  height: 60vh;
  overflow-y: auto;
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 4px;
}
.dialog-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Microsoft YaHei', sans-serif;
  line-height: 1.8;
}
.ai-placeholder {
  text-align: center;
  color: #909399;
  padding-top: 100px;
}

.farmer-dialog .el-dialog__body {
  padding: 0;
}

.farmer-dialog-container {
  display: flex;
  padding: 20px;
  align-items: center;
}

.farmer-avatar {
  flex-shrink: 0;
  margin-right: 20px;
}

.farmer-avatar img {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  background: #fff;
  object-fit: cover;
}

.speech-bubble-wrapper {
  flex-grow: 1;
}

.speech-bubble {
  position: relative;
  background: #f0f9eb;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #c2e0c6;
  height: 60vh;
  overflow-y: auto;
  font-family: 'Microsoft YaHei', sans-serif;
  line-height: 1.8;
  color: #303133;
}

.speech-bubble::before {
  content: '';
  position: absolute;
  left: -20px;
  top: 40px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 10px 20px 10px 0;
  border-color: transparent #f0f9eb transparent transparent;
}

.speech-bubble pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
}

.ai-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
  font-size: 16px;
}

.back-button {
  position: absolute;
  top: 25px;
  left: 25px;
  z-index: 10;
}
</style>
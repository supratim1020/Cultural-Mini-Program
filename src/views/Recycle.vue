<template>
  <div class="recycle-container">
    <el-button class="back-button" type="primary" icon="el-icon-arrow-left" @click="goBack" style="position:absolute;top:25px;left:25px;z-index:10;">返回首页</el-button>
    <!-- 页面标题 -->
    <div class="page-header">
      <h2><i class="el-icon-search"></i> 未检出虫类分析</h2>
      <el-button type="primary" @click="fetchInsects" :loading="loading">
        <i class="el-icon-refresh"></i> 刷新数据
      </el-button>
    </div>

    <!-- 统计信息 -->
    <div class="stats-cards">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ totalInsects }}</div>
          <div class="stat-label">总未知昆虫数</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ statistics.sessions_with_unknown_insects || 0 }}</div>
          <div class="stat-label">涉及会话数</div>
        </div>
      </el-card>
    </div>

    <!-- 未检出虫类分析 -->
    <div class="insects-section">
      <h3>所有未知昆虫</h3>
      <div v-if="loading && unknownInsects.length === 0" class="loading-placeholder">
        <i class="el-icon-loading"></i>
        <p>正在加载...</p>
      </div>
      <div v-else-if="unknownInsects.length === 0" class="no-data">
        <i class="el-icon-info"></i>
        <p>暂无未知昆虫数据</p>
      </div>
      <div v-else class="insects-grid">
        <el-card v-for="insect in unknownInsects" :key="insect.id" class="insect-card">
          <div class="insect-image">
            <img :src="getImageUrl(insect.image_path)" :alt="insect.image_path" @click="previewImage(insect)" />
            <div class="detection-box" :style="getDetectionBoxStyle(insect.bbox)"></div>
          </div>
          <div class="insect-info">
            <div class="insect-details">
              <p><strong>ID:</strong> {{ insect.id }}</p>
              <p><strong>检测时间:</strong> {{ formatTime(insect.timestamp) }}</p>
              <p><strong>置信度:</strong> {{ (insect.confidence_score * 100).toFixed(2) }}%</p>
              <p><strong>状态:</strong> {{ insect.status }}</p>
              <p v-if="insect.pest_name"><strong>识别结果:</strong> {{ insect.pest_name }}</p>
            </div>
            <div class="insect-actions">
              <el-button size="small" type="primary" @click="analyzeInsect(insect)">
                <i class="el-icon-cpu"></i> AI分析
              </el-button>
              <el-button size="small" type="success" @click="markAsIdentified(insect)">
                标记为已识别
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
      <div class="pagination-container">
        <el-pagination
          background
          layout="prev, pager, next, total"
          :total="totalInsects"
          :page-size="pageSize"
          :current-page.sync="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </div>
    <!-- 图片预览对话框 -->
    <el-dialog :visible.sync="dialogVisible" class="image-preview-dialog">
      <img width="100%" :src="dialogImageUrl" alt="预览图片">
    </el-dialog>

    <!-- 最终版昆虫数据库管理 -->
    <div class="database-section">
      <h3>最终版昆虫数据库</h3>
      <p class="section-description">从AI分析结果自动导入的昆虫信息，包含详细的形态特征、生活习性和防治方法</p>

      <div class="database-actions">
        <el-button type="primary" @click="loadFinalInsects">
          <i class="el-icon-refresh"></i> 刷新数据
        </el-button>
        <el-button type="success" @click="showFinalInsectDialog = true">
          <i class="el-icon-plus"></i> 手动添加
        </el-button>
      </div>

      <!-- 最终版昆虫列表 -->
      <div v-if="finalInsects.length > 0" class="final-insects-list">
        <el-table :data="finalInsects" style="width: 100%">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="图片" width="120">
            <template slot-scope="scope">
              <img :src="getFinalInsectImageUrl(scope.row.image_path)" 
                   style="width: 80px; height: 80px; object-fit: cover; cursor: pointer;" 
                   @click="previewFinalInsectImage(scope.row)" />
            </template>
          </el-table-column>
          <el-table-column prop="pest_name" label="害虫名称" width="150" />
          <el-table-column prop="characteristics" label="害虫特点" width="120" />
          <el-table-column prop="life_habits" label="生活习性" width="120" />
          <el-table-column prop="control_methods" label="防治方法" width="120" />
          <el-table-column prop="confidence_score" label="置信度" width="100">
            <template slot-scope="scope">
              {{ (scope.row.confidence_score * 100).toFixed(1) }}%
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="150">
            <template slot-scope="scope">
              {{ formatTime(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template slot-scope="scope">
              <el-button size="mini" @click="editFinalInsect(scope.row)">编辑</el-button>
              <el-button size="mini" type="danger" @click="deleteFinalInsect(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页控件 -->
        <div class="pagination-container">
          <el-pagination
            background
            layout="prev, pager, next, total"
            :total="finalInsectsTotal"
            :page-size="finalInsectsPageSize"
            :current-page.sync="finalInsectsCurrentPage"
            @current-change="handleFinalInsectsPageChange"
          />
        </div>
      </div>

      <div v-else-if="!finalInsectsLoading" class="no-data">
        <i class="el-icon-info"></i>
        <p>暂无最终版昆虫数据</p>
      </div>
    </div>

    <!-- 添加/编辑最终版昆虫对话框 -->
    <el-dialog :title="finalInsectDialogTitle" :visible.sync="showFinalInsectDialog" width="700px">
      <el-form :model="finalInsectForm" :rules="finalInsectRules" ref="finalInsectForm" label-width="120px">
        <el-form-item label="害虫名称" prop="pest_name">
          <el-input v-model="finalInsectForm.pest_name" placeholder="请输入害虫名称"></el-input>
        </el-form-item>

        <el-form-item label="图片路径" prop="image_path">
          <el-input v-model="finalInsectForm.image_path" placeholder="请输入图片路径"></el-input>
        </el-form-item>

        <el-form-item label="害虫特点">
          <el-input type="textarea" v-model="finalInsectForm.characteristics" 
                    placeholder="描述害虫的形态特征" :rows="3"></el-input>
        </el-form-item>

        <el-form-item label="生活习性">
          <el-input type="textarea" v-model="finalInsectForm.life_habits" 
                    placeholder="描述害虫的生活习性" :rows="3"></el-input>
        </el-form-item>

        <el-form-item label="防治方法">
          <el-input type="textarea" v-model="finalInsectForm.control_methods" 
                    placeholder="描述防治方法" :rows="3"></el-input>
        </el-form-item>

        <el-form-item label="置信度">
          <el-input-number v-model="finalInsectForm.confidence_score" 
                          :min="0" :max="1" :step="0.01" :precision="2"></el-input-number>
        </el-form-item>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="showFinalInsectDialog = false">取消</el-button>
        <el-button type="primary" @click="saveFinalInsect">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios'

// 配置axios默认值
axios.defaults.baseURL = 'http://localhost:8001'
axios.defaults.timeout = 10000  // 10秒超时
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

export default {
  name: 'Recycle',
  data() {
    return {
      loading: false,
      unknownInsects: [],
      // 分页相关
      currentPage: 1,
      pageSize: 5,
      totalInsects: 0,
      
      // 预览相关
      dialogVisible: false,
      dialogImageUrl: '',

      // 原有功能的数据
      statistics: {},

      // 最终版昆虫数据库相关
      finalInsects: [],
      finalInsectsTotal: 0,
      finalInsectsPageSize: 10,
      finalInsectsCurrentPage: 1,
      finalInsectsLoading: false,
      showFinalInsectDialog: false,
      isEditingFinalInsect: false,
      editingFinalInsectId: null,
      finalInsectForm: {
        pest_name: '',
        image_path: '',
        characteristics: '',
        life_habits: '',
        control_methods: '',
        confidence_score: 0.5
      },
      finalInsectRules: {
        pest_name: [
          { required: true, message: '请输入害虫名称', trigger: 'blur' }
        ],
        image_path: [
          { required: true, message: '请输入图片路径', trigger: 'blur' }
        ]
      },

      // 虫害数据库管理相关
      pestList: [],
      pestTotal: 0,
      pestPageSize: 5,
      pestCurrentPage: 1,
      pestLoading: false,
      showAddPestDialog: false,
      isEditing: false,
      editingPestId: null,
      pestForm: {
        name: '',
        image: '',
        damage: '',
        outbreak_time: ''
      },
      pestRules: {
        name: [
          { required: true, message: '请输入虫害名称', trigger: 'blur' }
        ],
        image: [
          { required: true, message: '请输入图片路径', trigger: 'blur' }
        ]
      },
    }
  },
  computed: {
    dialogTitle() {
      return this.isEditing ? '编辑虫害' : '添加新虫害'
    },
    finalInsectDialogTitle() {
      return this.isEditingFinalInsect ? '编辑最终版昆虫' : '添加最终版昆虫'
    },
  },
  mounted() {
    this.fetchInsects();
    this.loadFinalInsects();
    this.loadPestDatabase();
  },
  methods: {
    goBack() {
      this.$router.push({ name: 'index' });
    },
    async fetchInsects() {
      this.loading = true;
      try {
        const response = await axios.get('/api/unknown-insects', {
          params: {
            page: this.currentPage,
            per_page: this.pageSize,
          },
        });
        this.unknownInsects = response.data.items;
        this.totalInsects = response.data.total;
      } catch (error) {
        console.error('获取未知昆虫列表失败:', error);
        this.$message.error('获取未知昆虫列表失败，请检查后端服务是否正常');
      } finally {
        this.loading = false;
      }
    },

    handlePageChange(page) {
      this.currentPage = page;
      this.fetchInsects();
    },
    
    getImageUrl(filename) {
      return `/api/unknown-insects/${filename}`;
    },

    previewImage(insect) {
        this.dialogImageUrl = this.getImageUrl(insect.image_path);
        this.dialogVisible = true;
    },
    
    formatTime(isoString) {
      if (!isoString) return 'N/A';
      return new Date(isoString).toLocaleString();
    },

    async analyzeInsect(insect) {
      try {
        this.$message.info(`正在调用AI分析昆虫 (ID: ${insect.id})...`);

        // 1. 获取图片的Base64内容
        const imageUrl = `/api/unknown-insects/${insect.image_path}`;
        const base64String = await this.getImageBase64(imageUrl);

        // 2. 调用百度动物识别API（传Base64）
        const response = await axios.post('http://localhost:3000/api/baidu-animal-recognition', {
          imageBase64: base64String
        }, { timeout: 30000 });

        if (response.data.success) {
          const result = response.data.data;
          let analysisResult = `AI分析结果 (昆虫ID: ${insect.id}):\n\n`;
          
          if (result.result && result.result.length > 0) {
            analysisResult += '识别结果:\n';
            result.result.forEach((item, index) => {
              analysisResult += `${index + 1}. ${item.name} (置信度: ${(parseFloat(item.score) * 100).toFixed(2)}%)\n`;
              
              if (item.baike_info) {
                analysisResult += `   描述: ${item.baike_info.description}\n`;
                analysisResult += `   百科链接: ${item.baike_info.baike_url}\n`;
              }
              analysisResult += '\n';
            });
          } else {
            analysisResult += '未识别到相关动物信息。';
          }
          
          // 显示分析结果，并添加导入数据库按钮
          this.$confirm(analysisResult, 'AI分析结果', {
            confirmButtonText: '自动导入数据库',
            cancelButtonText: '关闭',
            dangerouslyUseHTMLString: true,
            customClass: 'analysis-result-dialog',
            showCancelButton: true,
            beforeClose: async (action, instance, done) => {
              if (action === 'confirm') {
                // 用户点击了"自动导入数据库"按钮
                try {
                  instance.confirmButtonLoading = true;
                  instance.confirmButtonText = '导入中...';
                  
                  await this.importToDatabase(analysisResult, insect.id, insect.image_path);
                  
                  this.$message.success('成功导入到最终版昆虫数据库！');
                  done();
                } catch (error) {
                  console.error('导入失败:', error);
                  this.$message.error('导入失败: ' + (error.response?.data?.error || error.message));
                  instance.confirmButtonLoading = false;
                  instance.confirmButtonText = '自动导入数据库';
                }
              } else {
                done();
              }
            }
          });
        } else {
          this.$message.error('AI分析失败: ' + response.data.message);
        }
      } catch (error) {
        console.error('AI分析失败:', error);
        this.$message.error('AI分析失败，请稍后重试');
      }
    },

    // 新增：导入到最终版昆虫数据库的方法
    async importToDatabase(analysisResult, originalInsectId, imagePath) {
      try {
        const response = await axios.post('http://localhost:3000/api/import-from-analysis', {
          analysisResult: analysisResult,
          originalInsectId: originalInsectId,
          imagePath: imagePath
        });

        if (response.data.message === '导入成功') {
          console.log('导入成功，数据ID:', response.data.id);
          return response.data;
        } else {
          throw new Error('导入失败');
        }
      } catch (error) {
        console.error('导入到数据库失败:', error);
        throw error;
      }
    },

    // 新增一个工具方法
    async getImageBase64(url) {
      // 注意：url必须是同源或CORS允许
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // 结果格式: data:image/jpeg;base64,xxxx
          // 百度API只要逗号后面的部分
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },

    markAsIdentified(insect) {
      this.$message.info(`正在标记昆虫 (ID: ${insect.id}) 为已识别，此功能待实现。`);
    },
    
    async loadFinalInsects() {
      this.finalInsectsLoading = true;
      try {
        const response = await axios.get('http://localhost:3000/api/final-insects', {
          params: {
            page: this.finalInsectsCurrentPage,
            per_page: this.finalInsectsPageSize,
          },
        });
        this.finalInsects = response.data.items;
        this.finalInsectsTotal = response.data.total;
      } catch (error) {
        console.error('获取最终版昆虫列表失败:', error);
        this.$message.error('获取最终版昆虫列表失败，请检查后端服务是否正常');
      } finally {
        this.finalInsectsLoading = false;
      }
    },

    getFinalInsectImageUrl(imagePath) {
      return `/api/unknown-insects/${imagePath}`;
    },

    previewFinalInsectImage(insect) {
      this.dialogImageUrl = this.getFinalInsectImageUrl(insect.image_path);
      this.dialogVisible = true;
    },

    editFinalInsect(insect) {
      this.isEditingFinalInsect = true;
      this.editingFinalInsectId = insect.id;
      this.finalInsectForm = { ...insect };
      this.showFinalInsectDialog = true;
    },

    async deleteFinalInsect(insectId) {
      try {
        await this.$confirm('确定要删除这条记录吗？', '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        
        await axios.delete(`http://localhost:3000/api/final-insects/${insectId}`);
        this.$message.success('删除成功');
        this.loadFinalInsects();
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除最终版昆虫失败:', error);
          this.$message.error('删除最终版昆虫失败');
        }
      }
    },

    async saveFinalInsect() {
      this.$refs.finalInsectForm.validate(async (valid) => {
        if (valid) {
          try {
            if (this.isEditingFinalInsect) {
              await axios.put(`http://localhost:3000/api/final-insects/${this.editingFinalInsectId}`, this.finalInsectForm);
              this.$message.success('更新成功');
            } else {
              await axios.post('http://localhost:3000/api/final-insects', this.finalInsectForm);
              this.$message.success('添加成功');
            }
            this.showFinalInsectDialog = false;
            this.resetFinalInsectForm();
            this.loadFinalInsects();
          } catch (error) {
            console.error('保存最终版昆虫失败:', error);
            this.$message.error('保存失败');
          }
        }
      });
    },

    resetFinalInsectForm() {
      this.finalInsectForm = {
        pest_name: '',
        image_path: '',
        characteristics: '',
        life_habits: '',
        control_methods: '',
        confidence_score: 0.5
      };
      this.isEditingFinalInsect = false;
      this.editingFinalInsectId = null;
    },

    handleFinalInsectsPageChange(page) {
      this.finalInsectsCurrentPage = page;
      this.loadFinalInsects();
    },

    // 虫害数据库管理相关方法
    async loadPestDatabase() {
      this.pestLoading = true;
      try {
        const response = await axios.get('/api/pest-database', {
          params: {
            page: this.pestCurrentPage,
            per_page: this.pestPageSize,
          },
        });
        this.pestList = response.data.items;
        this.pestTotal = response.data.total;
      } catch (error) {
        console.error('获取虫害数据库失败:', error);
        this.$message.error('获取虫害数据库失败，请检查后端服务是否正常');
      } finally {
        this.pestLoading = false;
      }
    },
    handlePestPageChange(page) {
      this.pestCurrentPage = page;
      this.loadPestDatabase();
    },
    handleAddPest() {
      this.showAddPestDialog = true;
      this.isEditing = false;
      this.editingPestId = null;
      this.resetPestForm();
    },
    handleEditPest(pest) {
      this.isEditing = true;
      this.editingPestId = pest.id;
      this.pestForm = { ...pest };
      this.showAddPestDialog = true;
    },
    async handleDeletePest(pestId) {
      try {
        await this.$confirm('确定要删除这条记录吗？', '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        await axios.delete(`/api/pest-database/${pestId}`);
        this.$message.success('删除成功');
        this.loadPestDatabase();
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除虫害失败:', error);
          this.$message.error('删除虫害失败');
        }
      }
    },
    async savePest() {
      this.$refs.pestForm.validate(async (valid) => {
        if (valid) {
          try {
            if (this.isEditing) {
              await axios.put(`/api/pest-database/${this.editingPestId}`, this.pestForm);
              this.$message.success('更新成功');
            } else {
              await axios.post('/api/pest-database', this.pestForm);
              this.$message.success('添加成功');
            }
            this.showAddPestDialog = false;
            this.resetPestForm();
            this.loadPestDatabase();
          } catch (error) {
            console.error('保存虫害失败:', error);
            this.$message.error('保存失败');
          }
        }
      });
    },
    resetPestForm() {
      this.pestForm = {
        name: '',
        image: '',
        damage: '',
        outbreak_time: ''
      };
    },
    getDetectionBoxStyle(bbox) {
      if (!bbox) return {};
      return {
        left: bbox.x + 'px',
        top: bbox.y + 'px',
        width: bbox.width + 'px',
        height: bbox.height + 'px',
        position: 'absolute',
        border: '2px solid #41b883',
        backgroundColor: 'rgba(65, 184, 131, 0.2)',
        pointerEvents: 'none',
      };
    },
  }
}
</script>

<style scoped>
.recycle-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
  height: 100vh;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  color: #303133;
  margin: 0;
}

.stats-cards {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  max-width: 200px;
}

.stat-content {
  text-align: center;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

.insects-section h3,
.database-section h3 {
  color: #303133;
  margin-bottom: 15px;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.no-data i {
  font-size: 48px;
  margin-bottom: 10px;
}

.insects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.insect-card {
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.insect-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.insect-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
}

.detection-box {
  position: absolute;
  border: 2px solid #41b883;
  background-color: rgba(65, 184, 131, 0.2);
  pointer-events: none;
}

.insect-info {
  padding: 15px;
}

.insect-details {
  margin-bottom: 15px;
}

.insect-details p {
  margin: 5px 0;
  font-size: 14px;
}

.insect-actions {
  display: flex;
  gap: 10px;
}

.database-section {
  margin-top: 30px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.database-actions {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.final-insects-list {
  margin-top: 20px;
}

.final-insects-list .el-table {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  overflow: hidden;
}

.final-insects-list .el-table th {
  background: #409EFF;
  color: white;
  font-weight: 600;
}

.final-insects-list .el-table td {
  padding: 12px 0;
}

.final-insects-list img {
  border-radius: 4px;
  border: 2px solid #e4e7ed;
  transition: all 0.3s ease;
}

.final-insects-list img:hover {
  border-color: #409EFF;
  transform: scale(1.05);
}

/* 最终版昆虫对话框样式 */
:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
}

:deep(.el-input-number) {
  width: 100%;
}

/* AI分析结果对话框样式 */
:deep(.analysis-result-dialog) {
  max-width: 600px;
}

:deep(.analysis-result-dialog .el-message-box__content) {
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: 'Microsoft YaHei', sans-serif;
  line-height: 1.6;
}

:deep(.analysis-result-dialog .el-message-box__message) {
  text-align: left;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #409EFF;
}

/* 最终版昆虫数据库样式 */
.section-description {
  color: #606266;
  font-size: 14px;
  margin-bottom: 15px;
  font-style: italic;
}
</style>
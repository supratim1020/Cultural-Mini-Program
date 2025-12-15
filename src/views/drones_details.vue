<template>
    <div class="drones-details-page">
      <div class="header">
        <h2>无人机详细信息列表</h2>
        <el-button type="primary" @click="fetchDrones">刷新列表</el-button>
        <el-button type="default" @click="goBack">返回集群作业</el-button>
      </div>
      <div style="overflow-x:auto;">
        <el-table :data="drones" style="min-width:1200px;width:100%;" v-loading="loading" border stripe>
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="name" label="无人机名称" width="150" />
          <el-table-column prop="type" label="机型" width="120">
            <template slot-scope="scope">
              {{ getDroneTypeName(scope.row.type) }}
            </template>
          </el-table-column>
          <el-table-column prop="endurance" label="续航(分钟)" width="100" />
          <el-table-column prop="fov" label="视场角(度)" width="100" />
          <el-table-column prop="max_times" label="最快快门(次)" width="120" />
          <el-table-column prop="function" label="功能" width="100">
            <template slot-scope="scope">
              {{ getFunctionName(scope.row.function) }}
            </template>
          </el-table-column>
          <el-table-column prop="max_height" label="最大高度(米)" width="100" />
          <el-table-column prop="max_speed" label="最大速度(m/s)" width="100" />
          <el-table-column prop="focal_length" label="焦距(mm)" width="100" />
          <el-table-column prop="pixel_size" label="像素尺寸(μm)" width="120" />
          <el-table-column prop="status" label="状态" width="100">
            <template slot-scope="scope">
              {{ getStatusName(scope.row.status) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="300">
            <template slot-scope="scope">
              <div style="display: flex; flex-wrap: wrap; gap: 8px; min-width: 200px;">
                <el-button type="success" size="mini" @click="setDroneWorking(scope.row.id)">作业</el-button>
                <el-button type="info" size="mini" @click="setDroneOnline(scope.row.id)">在线</el-button>
                <el-button type="danger" size="mini" @click="deleteDrone(scope.row.id)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'DronesDetails',
    data() {
      return {
        drones: [],
        loading: false
      };
    },
    created() {
      this.fetchDrones();
    },
    methods: {
      async fetchDrones() {
        this.loading = true;
        try {
          const res = await fetch('http://localhost:5000/api/drones/list');
          const result = await res.json();
          if (result.code === 0) {
            this.drones = result.data;
          } else {
            this.$message.error(result.msg || '获取无人机列表失败');
          }
        } catch (e) {
          this.$message.error('网络错误，无法获取无人机列表');
        } finally {
          this.loading = false;
        }
      },
      async setDroneWorking(id) {
        try {
          const res = await fetch(`http://localhost:5000/api/drones/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'working' })
          });
          const result = await res.json();
          if (result.code === 0) {
            this.$message.success('状态已同步为作业中');
            this.fetchDrones();
          } else {
            this.$message.error(result.msg || '状态更新失败');
          }
        } catch (e) {
          this.$message.error('网络错误，状态更新失败');
        }
      },
      async setDroneOnline(id) {
        try {
          const res = await fetch(`http://localhost:5000/api/drones/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'online' })
          });
          const result = await res.json();
          if (result.code === 0) {
            this.$message.success('状态已同步为在线');
            this.fetchDrones();
          } else {
            this.$message.error(result.msg || '状态更新失败');
          }
        } catch (e) {
          this.$message.error('网络错误，状态更新失败');
        }
      },
      async deleteDrone(id) {
        this.$confirm('确定要删除该无人机吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          try {
            const res = await fetch(`http://localhost:5000/api/drones/${id}`, {
              method: 'DELETE'
            });
            const result = await res.json();
            if (result.code === 0) {
              this.$message.success('删除成功');
              this.fetchDrones();
            } else {
              this.$message.error(result.msg || '删除失败');
            }
          } catch (e) {
            this.$message.error('网络错误，删除失败');
          }
        }).catch(() => {});
      },
      getDroneTypeName(type) {
        const map = {
          mavic2pro: 'mavic2pro',
          Phantom4RTK: 'Phantom4RTK',
          Mavic3M: 'Mavic3M'
        };
        return map[type] || type;
      },
      getFunctionName(func) {
        const map = {
          inspect: '巡检',
          spray: '喷洒药物'
        };
        return map[func] || func;
      },
      getStatusName(status) {
        const map = {
          idle: '待机',
          online: '在线',
          maintenance: '维修中'
        };
        return map[status] || status;
      },
      goBack() {
        this.$router.push({ name: 'ClusterWork' });
      }
    }
  };
  </script>
  
  <style scoped>
  .drones-details-page {
    padding: 32px;
    background: #f5f7fa;
    min-height: 100vh;
  }
  .header {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
    gap: 16px;
  }
  </style>
  
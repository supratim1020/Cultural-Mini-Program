<template>
  <div class="login-container">
    <img class="login-background-img" src="../assets/login_bj.png" alt="背景图" />
    <div class="login-box">
      <div class="login-header">
        <h1>农业智能检测系统</h1>
        <p>Agricultural Intelligence Detection System</p>
      </div>
      
      <div class="login-form">
        <div class="form-group">
          <div class="input-wrapper">
            <i class="icon-user"></i>
            <input 
              type="text" 
              v-model="loginForm.username" 
              placeholder="请输入用户名"
              @keyup.enter="handleLogin"
            />
          </div>
        </div>
        
        <div class="form-group">
          <div class="input-wrapper">
            <i class="icon-password"></i>
            <input 
              :type="showPassword ? 'text' : 'password'" 
              v-model="loginForm.password" 
              placeholder="请输入密码"
              @keyup.enter="handleLogin"
            />
            <i 
              :class="showPassword ? 'icon-eye-open' : 'icon-eye-close'" 
              @click="togglePassword"
              class="password-toggle"
            ></i>
          </div>
        </div>
        
        <div class="form-group">
          <button 
            class="login-btn" 
            @click="handleLogin"
            :disabled="loading"
          >
            <span v-if="!loading">登录</span>
            <span v-else>登录中...</span>
          </button>
        </div>
        
        <div class="login-tips">
          <p>默认账号：admin</p>
          <p>默认密码：admin123</p>
        </div>
      </div>
    </div>
    
    <!-- 消息提示 -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'Login',
  data() {
    return {
      loginForm: {
        username: '',
        password: ''
      },
      showPassword: false,
      loading: false,
      message: '',
      messageType: 'info'
    }
  },
  computed: {
  },
  methods: {
    async handleLogin() {
      // 表单验证
      if (!this.loginForm.username.trim()) {
        this.showMessage('请输入用户名', 'error')
        return
      }
      if (!this.loginForm.password.trim()) {
        this.showMessage('请输入密码', 'error')
        return
      }
      
      this.loading = true
      this.message = ''
      
      try {
        const response = await axios.post('/api/login', {
          username: this.loginForm.username.trim(),
          password: this.loginForm.password
        })
        
        if (response.data.success) {
          this.showMessage('登录成功！', 'success')
          // 存储用户信息
          localStorage.setItem('user', JSON.stringify({
            id: response.data.user_id,
            username: this.loginForm.username
          }))
          
          // 延迟跳转到主页
          setTimeout(() => {
            this.$router.push('/Cluster')
          }, 1000)
        } else {
          this.showMessage(response.data.message || '登录失败', 'error')
        }
      } catch (error) {
        console.error('登录错误:', error)
        if (error.response && error.response.data) {
          this.showMessage(error.response.data.message || '登录失败', 'error')
        } else {
          this.showMessage('网络错误，请检查服务器连接', 'error')
        }
      } finally {
        this.loading = false
      }
    },
    
    togglePassword() {
      this.showPassword = !this.showPassword
    },
    
    showMessage(text, type = 'info') {
      this.message = text
      this.messageType = type
      
      // 3秒后自动清除消息
      setTimeout(() => {
        this.message = ''
      }, 3000)
    }
  },
  
  mounted() {
    // 检查是否已登录
    const user = localStorage.getItem('user')
    if (user) {
      this.$router.push('/Cluster')
    }
  }
}
</script>

<style >
.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.login-background-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  filter: brightness(0.8);
  z-index: -1;
}

.login-box {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px;
  width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 10px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-header p {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0;
  font-weight: 300;
}

.login-form {
  margin-top: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper i {
  position: absolute;
  left: 15px;
  color: #95a5a6;
  font-size: 18px;
  z-index: 1;
}

.input-wrapper input {
  width: 100%;
  padding: 15px 15px 15px 45px;
  border: 2px solid #ecf0f1;
  border-radius: 10px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
}

.input-wrapper input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.password-toggle {
  position: absolute;
  right: 15px;
  cursor: pointer;
  color: #95a5a6;
  transition: color 0.3s ease;
}

.password-toggle:hover {
  color: #667eea;
}

.login-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.login-btn:hover::before {
  left: 100%;
}

.login-tips {
  margin-top: 20px;
  padding: 15px;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.login-tips p {
  margin: 5px 0;
  color: #34495e;
  font-size: 14px;
  text-align: center;
}

.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.message.success {
  background: #27ae60;
}

.message.error {
  background: #e74c3c;
}

.message.info {
  background: #3498db;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 图标字体 */
.icon-user::before {
  content: '👤';
}

.icon-password::before {
  content: '🔒';
}

.icon-eye-open::before {
  content: '👁️';
}

.icon-eye-close::before {
  content: '👁️‍🗨️';
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-box {
    width: 90%;
    padding: 30px 20px;
  }
  
  .login-header h1 {
    font-size: 24px;
  }
  
  .input-wrapper input {
    font-size: 14px;
    padding: 12px 12px 12px 40px;
  }
}
</style>

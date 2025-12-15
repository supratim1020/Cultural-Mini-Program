<template>
  <div id="index" ref="appRef">
    <div class="bg">
      <dv-loading v-if="loading">Loading...</dv-loading>
      <div v-else class="host-body">
        <div class="d-flex jc-center">
          <dv-decoration-10 class="dv-dec-10" />
          <div class="d-flex jc-center">
            <dv-decoration-8 class="dv-dec-8" :color="decorationColor" />
            <div class="title">
              <span class="title-text">无人机智慧植保平台</span>
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

        <!-- 第二行 -->
        <div class="d-flex jc-between px-2">
          <div class="d-flex aside-width">
            <div class="react-left ml-4 react-l-s">
              <span class="react-left"></span>
              <span class="text">数据分析1</span>
            </div>
            <div class="react-left ml-3">
              <span class="text" style="cursor:pointer;color:#50e3c2;text-decoration:underline;" @click="goToCluster">无人机集群作业</span>
            </div>
          </div>
          <div class="d-flex aside-width">
            <div class="react-right bg-color-blue mr-3">
              <span class="text fw-b">vue-big-screen</span>
            </div>
            <div class="react-right mr-4 react-l-s">
              <span class="react-after"></span>
              <span class="text"
                >{{ dateYear }} {{ dateWeek }} {{ dateDay }}</span
              >
            </div>
          </div>
        </div>

        <div class="body-box">
          <!-- 第三行数据 -->
            <div class="left-column">
              <div class="grid-item">
                 <dv-border-box-12>
                 <LeftOne/>
                 </dv-border-box-12>
              </div>
              <div class="grid-item">
                 <dv-border-box-12>
                 <DetectionChart />
                 </dv-border-box-12>
              </div>
              <div class="grid-item">
                 <dv-border-box-12>
                 <Spray />
                 </dv-border-box-12>
              </div>
            </div>

            <div class="center-column">
              <DroneVideoStream />
<!--              <component :is=DroneVideoStream />-->
            </div>
            <div class="right-column">

               <div class="grid-item">
              <dv-border-box-13>
              <WeatherMonitor />
              </dv-border-box-13>
            </div>
              <div class="grid-item">
              <dv-border-box-13>
              <PathPlanContainer />
              </dv-border-box-13>
            </div> <div class="grid-item">
              <dv-border-box-13>
              <HistoryQuery />
              </dv-border-box-13>
            </div>

        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import drawMixin from "../utils/drawMixin";
import { formatTime } from '../utils/index.js'
import LeftOne from './leftone.vue'
import WeatherMonitor from './rightone.vue'
import DetectionChart from './LeftTwo.vue'
import PathPlanContainer from './RightTwo.vue'
import HistoryQuery from './rightThree.vue'
import Spray from './leftthree.vue'
// import centerRight1 from './centerRight1'
// import centerRight2 from './centerRight2'
// import center from './center'
// import bottomLeft from './bottomLeft'
// import bottomRight from './bottomRight'
import DroneVideoStream from '@/components/videostream.vue';

export default {
  mixins: [ drawMixin ],
  data() {
    return {
      timing: null,
      loading: true,
      dateDay: null,
      dateYear: null,
      dateWeek: null,
      weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      decorationColor: ['#568aea', '#000000']
    }
  },
  components: {
     LeftOne,
    WeatherMonitor,
    DetectionChart,
    PathPlanContainer,
    HistoryQuery,
    Spray,

    DroneVideoStream
  },
  mounted() {
    this.timeFn()
    this.cancelLoading()
  },
  beforeDestroy () {
    clearInterval(this.timing)
  },
  methods: {
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
      }, 500)
    },
    goToCluster() {
      if (this.$router) {
        this.$router.push({ path: '/Cluster' });
      } else {
        window.location.href = '/Cluster.html';
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../assets/scss/index.scss';
</style>

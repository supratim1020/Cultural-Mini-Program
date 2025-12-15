import Vue from 'vue'
import VueRouter from 'vue-router'
import PathPlanPage from '../views/Path_plan.vue'
import diagnos  from "../views/diagnos.vue";
import Query from '../views/query.vue'
import Recycle from '../views/Recycle.vue'
import ClusterWork from "../views/Cluster_work.vue";
import DronesDetails from "../views/drones_details.vue"
import Assign_plan   from "../views/Assign_plan.vue";
import index from "../views/index.vue"

Vue.use(VueRouter)

const routes = [{
  path: '/',
  name: 'index',
  component: () => import('../views/index')
},
    {
      path: '/path-plan',
      name: 'PathPlan',
      component: PathPlanPage
    },
    {
        path: '/Cluster',
      name: 'ClusterWork',
      component: ClusterWork

    },
    {
        path:'/diagnos',
        name:'diagnos',
        component:diagnos
    },
    {
        path:'/query',
        name:'Query',
        component:Query
    },
    {
        path:'/DronesDetails',
        name:'DronesDetails',
        component:DronesDetails
    },
{
        path:'/recycle',
        name:'Recycle',
        component:Recycle
    },
    {
      path: '/assign-plan',
      name: 'AssignPlan',
      component: Assign_plan
    },
    {
        path: '/index',
      name: 'index',
      component: index
    }

]
const router = new VueRouter({
  routes
})

export default router
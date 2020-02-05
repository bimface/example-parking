import 'babel-polyfill'
import 'es6-promise/auto'

import Vue from 'vue'
import axios from 'axios'
import App from './parkingManage.vue'

Vue.prototype.$http = axios;

const app = new Vue({
    el: '#app',
    render: h => h(App)
}).$mount('#app')

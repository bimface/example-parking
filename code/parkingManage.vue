<template>
  <div id="app">
    <header>
      <a href="#" class="logo"></a>
      <h2>基于BIM智慧停车的室内定位示例<i>官方示例</i></h2>
      <div class="btn-box">
        <a href="https://github.com/bimface/example-parking" target="_blank" class="btn btn-sm btn-primary">源代码</a>
      </div>
    </header>

    <section class="temp-container" :style="{'height':cHeight + 'px'}">
      <!--左侧导航-->
      <section class="side">
        <div class="title">停车位列表</div>
        <div class="tab">
          <a href="javascript:void(0)" v-for="(item,i) in tree" :class="{'cur':isFloor == item.floor}" @click="tab(item.floor)">{{item.floor}}</a>
        </div>
        <div class="list" v-if="tree">
          <dl v-for="(item,i) in tree" :class="{'show':isFloor == item.floor}">
            <dt v-for="park in item.exampleParkList" @click="showPark(park.elementId)"><span>{{park.parkNumber}}</span></dt>
          </dl>
        </div>
        <div class="park-state">
          停车位：{{total}}<br />
          已停车位：<span>{{employ}}</span>
        </div>
      </section>

      <!--主内容区域-->
      <section class="main">
        <div id="view3d"></div>
        <div class="person-state">
          车库当前人数：<span>{{personSum}}</span>人
          <template v-if="user">，当前用户：<span>{{user}}</span></template>
          <template v-if="parkNum">，车位：<span>{{parkNum}}</span></template>
        </div>
      </section>
    </section>

    <footer>
      <div class="w1200">
        <div class="copyright">
          Copyright ©2016-2020 <a href="//bimface.com" target="_blank">BIMFACE</a> 京ICP备10021606号-19 <a href="http://www.glodon.com/" target="_blank">广联达</a>旗下产品
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
  import Vue from 'vue'
  import './example-common.css'
  import './parkingManage.less'

  export default {
    data(){
      return {
        cHeight:null,
        tree:null,
        total:0,
        employ:0,
        personSum:0,
        user:null,
        parkNum:null,
        viewer3D:null,
        parkHighArr:[],
        parkEmploy:[],
        drawableContainer:null,
        tagArr: [],
        img_cur:'http://resource.bimface.com/developer/images/user_cur.png',
        img_other:'http://resource.bimface.com/developer/images/user_other.png',
        isFloor:"-1F",
        interval:null
      }
    },

    mounted(){
      var me = this;

      me.cHeight = document.documentElement.clientHeight - 105;

      me.$http.get('//bimface.com/api/console/share/preview/viewtoken?token=8d21e764').then((res)=>{
        if(res.data.code == 'success'){
          var viewToken = res.data.data;

          var options = new BimfaceSDKLoaderConfig();
          options.viewToken = viewToken;
          BimfaceSDKLoader.load(options, successCallback, failureCallback);

          function successCallback() {
            // 获取DOM元素
            var dom4Show = document.getElementById('view3d');

            // 配置参数
            var config = new Glodon.Bimface.Viewer.Viewer3DConfig();
            config.domElement = dom4Show;

            // 创建viewer3D对象
            me.viewer3D = new Glodon.Bimface.Viewer.Viewer3D(config);

            // 添加模型
            me.viewer3D.addView(viewToken);

            // 监听添加view完成的事件
            me.viewer3D.addEventListener(Glodon.Bimface.Viewer.Viewer3DEvent.ViewAdded, function() {

              me.$http.get('//bimface.com/example/park/all').then((res) => {
                me.tree = res.data;
                me.tree.forEach(function(fun){
                  me.total += fun.exampleParkList.length;
                })
              })

              me.viewer3D.isolateComponentsByObjectData([{"levelName":'-1F'}],Glodon.Bimface.Viewer.IsolateOption.HideOthers);

              me.$http.get('//bimface.com/example/park/list?valid=false').then((res)=>{
                me.employ = res.data.length;
                res.data.forEach(function(fun){
                  me.parkEmploy.push(fun.elementId);
                });
                let parkEmployColor = new Glodon.Web.Graphics.Color(255,0,0,0);
                me.viewer3D.overrideComponentsColorById(me.parkEmploy,parkEmployColor);
              })

              // 渲染3D模型
              me.viewer3D.render();

              var drawaleContainerConfig = new Glodon.Bimface.Plugins.Drawable.DrawableContainerConfig();
              drawaleContainerConfig.viewer = me.viewer3D;
              me.drawableContainer = new Glodon.Bimface.Plugins.Drawable.DrawableContainer(drawaleContainerConfig);

              me.showPerson();

            });
          }

          function failureCallback(error) {
            console.log(error);
          };
        }
      })

    },

    methods: {
      tab: function(floor){
        var me = this;
        if(floor !== this.isFloor){
          me.resetView();
          me.viewer3D.clearIsolation();
          me.viewer3D.isolateComponentsByObjectData([{"levelName":floor}],Glodon.Bimface.Viewer.IsolateOption.HideOthers);
          me.viewer3D.render();
          me.isFloor = floor;

          me.tagArr = [];
          me.user = null;
          me.parkNum = null;
          me.drawableContainer.clear()
          me.showPerson();
        }
      },
      showPark:function(parkId){
        for(var i=0; i<this.tagArr.length;i++){
          this.tagArr[i].setSrc(this.img_other);
        }
        this.user = null;
        this.parkNum = null;
        this.parkPoint(parkId);
      },

      parkPoint:function(parkId){
        this.resetView();
        this.parkHighArr.push(parkId);
        let highColor = new Glodon.Web.Graphics.Color(255,255,0,0);
        this.viewer3D.overrideComponentsColorById(this.parkHighArr,highColor);
        this.viewer3D.render();
      },

      showPerson: function(){
        var me = this;
        me.$http.get('//bimface.com/example/park/user').then((res)=>{
          //创建DrawableContainer
          me.tagArr = [];

          for(var i=0; i<res.data.length; i++){
            if(res.data[i].floor == me.isFloor){
              var imageConfig = new Glodon.Bimface.Plugins.Drawable.ImageConfig();
              imageConfig.src = me.img_other;
              imageConfig.worldPosition = res.data[i];
              var tag = new Glodon.Bimface.Plugins.Drawable.Image(imageConfig);
              if(tag.worldPosition.name == me.user){
                tag.setSrc(me.img_cur);
                me.user = tag.worldPosition.name;
                me.parkNum = tag.worldPosition.parkNumber;
              };
              me.tagArr.push(tag);
              tag.onClick(function(){
                var isClick = (this.getSrc()==me.img_other);
                for(var i=0; i<me.tagArr.length;i++){
                  me.tagArr[i].setSrc(me.img_other);
                }
                if(isClick){
                  this.setSrc(me.img_cur);
                  me.user = this.worldPosition.name;
                  me.parkNum = this.worldPosition.parkNumber;
                  me.parkPoint(this.worldPosition.parkId);
                } else {
                  this.setSrc(me.img_cur);
                }
              })
            }
          }
          me.drawableContainer.addItems(me.tagArr);
          me.personSum = res.data.length;
        })
      },

      resetView: function(){
        this.viewer3D.restoreComponentsColorById(this.parkHighArr);
        let parkEmployColor = new Glodon.Web.Graphics.Color(255,0,0,0);
        this.viewer3D.overrideComponentsColorById(this.parkEmploy,parkEmployColor);
        this.viewer3D.render();
        this.parkHighArr = [];
      }
    }
  }
</script>

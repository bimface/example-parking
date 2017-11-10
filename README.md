# 功能介绍

基于BIMFACE改变构件颜色的扩展功能，可以直观显示停车场内车库占用的比例情况。基于BIMFACE增加图片标签的扩展功能，同时结合室内定位装置读取的地下车库行人的实时坐标模拟行人的走动，点击行人的标签可以高亮显示对应的车位，实现车位引导的功能。

# 效果图
![view](resources/img/view.jpg)

# 主要逻辑

通过BIMFACE服务端API和前端JavaScript API灵活使用构建停车场应用场景。

## 逻辑#1 - 构建停车场停车位列表

1. 通过调用BIMFACE服务端"获取文件转换的构件列表"API，根据构件类型ID、族和族类型获取"停车位"构件列表：
   * "获取文件转换的构件列表"API详见[http://doc.bimface.com/book/restful/articles/api/translate/get-ele-ids.html](http://doc.bimface.com/book/restful/articles/api/translate/get-ele-ids.html?p=doc)
   * JAVA-SDK调用示例如下：
```java
BimfaceClient bimfaceClient = new BimfaceClient(appKey, appSecret);
List<String> elements = bimfaceClient.getElements(fileId, categoryId, family, familyType);
```
2. 通过调用BIMFACE服务端"获取文件转换的构件属性"API，根据fileId、elementId获取构件属性：
   * "获取文件转换的构件属性"API详见[http://doc.bimface.com/book/restful/articles/api/translate/get-ele-prop.html](http://doc.bimface.com/book/restful/articles/api/translate/get-ele-prop.html?p=doc)
   * JAVA-SDK调用示例如下：
```java
PropertyBean propertyBean = bimfaceClient.getProperty(fileId, elementId);
```
示例代码段:
```java
BimfaceClient bimfaceClient = new BimfaceClient("Y3vZC8N79ia7JMNBGNBMYuRnJkf12345", "1TrD4kG3h4X2rc3bHa69abxk6sK12345");
Long fileId = 1187125317033123L;
List<String> elements = bimfaceClient.getElements(fileId, "-2000151", "车-停车位-基于面", "车-停车位-基于面");
for (String elementId : elements) {
    PropertyBean propertyBean = bimfaceClient.getProperty(fileId, elementId);
	
	//获取楼层属性
	PropertyGroup basicGroup = propertyBean.getProperties().stream().filter(propertyGroup -> propertyGroup.getGroup().equals("基本属性")).findFirst().get();
    String floor = basicGroup.getItems().stream().filter(propertyItem -> propertyItem.getKey().equals("floor")).findFirst().get().getValue().toString();

	//获取停车位编号属性
    PropertyGroup signGroup = propertyBean.getProperties().stream().filter(propertyGroup -> propertyGroup.getGroup().equals("标识数据")).findFirst().get();
    String parkNumber = signGroup.getItems().stream().filter(propertyItem -> propertyItem.getKey().equals("编号")).findFirst().get().getValue().toString();
	
	......
}
```
通过以上两个API就可以构建出停车位业务数据（停车位楼层、编号、是否停车等），有了相关业务数据可以提供前端随意使用。

## 逻辑#2 - 构建停车场人员列表

根据真实场景，通过第三方设备实时采集停车场人员信息（人员编号、姓名、实时坐标、对应的停车位等）并提供应用使用。（此示例程序中，通过模拟构造一些人员的实时数据，供前端使用达到人员动态走动和找车位的效果）

# 前端实现
## 基本流程
1. 引用BIMFACE的JavaScript显示组件库
```javascript
<script src="https://static.bimface.com/api/BimfaceSDKLoader/BimfaceSDKLoader@latest-release.js" charset="utf-8"></script>
```
2. 定义DOM元素，用于在该DOM元素中显示模型或图纸
```javascript
<div id="view3d"></div>
```
3. 初始化JavaScript显示组件
```javascript
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
  viewer3D = new Glodon.Bimface.Viewer.Viewer3D(config);

  // 添加模型
  viewer3D.addView(viewToken);

  // 监听添加view完成的事件
  viewer3D.addEventListener(Glodon.Bimface.Viewer.Viewer3DEvent.ViewAdded, function() {
    
    // 渲染3D模型
    viewer3D.render();

    //调用viewer3D对象的Method，可以继续扩展功能

  });
}

function failureCallback(error) {
  console.log(error);
};
```
4. 人的标识处理
原理就是运用了Bmiface的批注方式，先初始化绘制器，然后在绘制器上打标签。
  * 初始化绘制器
  ```javascript
  var drawaleContainerConfig = new Glodon.Bimface.Plugins.Drawable.DrawableContainerConfig();
  drawaleContainerConfig.viewer = me.viewer3D;
  me.drawableContainer = new Glodon.Bimface.Plugins.Drawable.DrawableContainer(drawaleContainerConfig);
  ```
  * 打标签
  ```javascript
  me.tagArr = [];

  for(var i=0; i<res.data.length; i++){
    var imageConfig = new Glodon.Bimface.Plugins.Drawable.ImageConfig();
      //设置图片路径
      imageConfig.src = me.img_other;
      //设置图片坐标
      imageConfig.worldPosition = res.data[i];
      //创建标签
      var tag = new Glodon.Bimface.Plugins.Drawable.Image(imageConfig);
      //判断该标签是否当前用户
      if(tag.worldPosition.name == me.user){
        tag.setSrc(me.img_cur);
        me.user = tag.worldPosition.name;
        me.parkNum = tag.worldPosition.parkNumber;
      };
      tagArr.push(tag);
      //对标签的点击做相应处理
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
  me.drawableContainer.addItems(me.tagArr);
  ```
5. 调用API方法
  * overrideComponentsColorById(objectIds, color) 改变构件颜色（用于停车位设置高亮）
  * restoreComponentsColorById(objectIds) 恢复构件颜色（重置停车位）
  * isolateComponentsByObjectData(conditions, state) 根据筛选条件隔离构件 （用于在初始化模型时候将停车场按楼层单独隔离显示）
  * clearIsolation() 清楚隔离 （楼层切换时候先恢复到初始状态）


ps. 该Demo基于vue+webpack进行开发打包，如用jquery/React实现同上。

参考API：[http://doc.bimface.com/book/js/articles/basic/index.html](http://doc.bimface.com/book/js/articles/basic/index.html)

# 查看示例

[http://bimface.com/example/park](http://bimface.com/example/park)

---
nav:
  title: '组件'
---

# Draw 画布

Demo

```jsx
/**
 * defaultShowCode: true
 * compact: true
 */
import { WDraw } from 'w-react-label';

export default () => {
  return <WDraw drawTool="rect" rotateEnable={true} />;
};
```

## API

### props

| 参数          | 说明                                 | 类型                                                                                                                                                                      | 默认值        |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| src           | 加载的图片路径                       | string                                                                                                                                                                    | -             |
| curLabel      | 默认的 label                         | string                                                                                                                                                                    | 从 1 开始递增 |
| showLabel     | 是否显示 label                       | boolean                                                                                                                                                                   | false         |
| showGrid      | 是否显示网格                         | boolean                                                                                                                                                                   | false         |
| showCrosshair | 是否显示定位线                       | boolean                                                                                                                                                                   | false         |
| minSize       | 误触尺寸，小于它的直接删除           | Array                                                                                                                                                                     | [4, 4]        |
| drawTool      | 当前绘制工具                         | rect（拖动绘制正方形、shift 矩形）<br/> ellipse（拖动绘制椭圆形、shift 圆形） <br/> path（单击绘制多边形） <br/> move（拖动图形、选择图形）<br/> drag（抓手移动整体画布） | -             |
| scaleExtent   | 图形缩放比例阀值                     | Array                                                                                                                                                                     | [0.02, 30]    |
| -             |
| changeSize    | 尺寸、位置发生变化后获取最新标注数据 | function(size[])                                                                                                                                                          | -             |
| changeSelect  | 选中、正在编辑的图形 id              | function(id[])                                                                                                                                                            | -             |
| changeScale   | 修改画布 scale                       | function(scale)                                                                                                                                                           | -             |
| imgLoaded     | 图片加载完的回调                     | function({width, height})                                                                                                                                                 | -             |
| endDraw       | 绘制完一个图形的回调                 | function({id, label})                                                                                                                                                     | -             |
| rotateEnable  | 允许旋转图形                         | boolean                                                                                                                                                                   | false         |

### WDraw

**注：组件内使用 attrs 方式组成 json 数据，例：矩形为 x、y、width、height 组成。若导入的数据为 points 方式组成，需先调用 convertToAttrs 转为 attrs 方式。**

| 参数              | 说明                                             | 类型                                                   | 默认值 |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------ | ------ |
| getMarkData       | 获取图形数据                                     | function()                                             | -      |
| drawShapeFromSize | 根据图形数据绘制图形                             | function(size[], update=false) update 是否更新尺寸信息 | -      |
| convertToPoints   | 转换数据格式：attr 转为 points                   | function(size[])                                       | -      |
| convertToAttrs    | 转换数据格式：points 转为 attr                   | function(size[])                                       | -      |
| -                 |
| delSelectShape    | 删除选中的图形                                   | function()                                             | -      |
| clearShape        | 清空图形                                         | function(update=true) update 是否更新尺寸信息          | -      |
| selectShape       | 选中图形                                         | function(id、id[])                                     | -      |
| getSelectIds      | 获取选中、正在编辑的图形 id[]                    | function()                                             | -      |
| toggleShape       | 切换图形显示隐藏                                 | function(id)                                           | -      |
| -                 |
| undoSvg           | 撤销                                             | function()                                             | -      |
| canUndo           | 能否撤销                                         | function()                                             | -      |
| redoSvg           | 重做                                             | function()                                             | -      |
| canRedo           | 能否重做                                         | function()                                             | -      |
| -                 |
| zoomReload        | 让缩放回到初始状态                               | function()                                             | -      |
| changeScale       | 修改画布缩放                                     | function("enlarge"、"narrow"、具体数值)                | -      |
| setCanvasSize     | 变更画布尺寸为父元素尺寸                         | function()                                             | -      |
| changeColor       | 修改画框颜色（选中修改选中、未选中修改后续绘制） | function(color)                                        | -      |
| editLabel         | 修改图形的标签                                   | function(id, newLabel)                                 | -      |
| adjustImg         | 编辑图片（亮度、曝光度等）                       | function(val)                                          | -      |

# ShapeList 图形列表

Demo

```bash
import { WShapeList } from 'w-react-label';
<WShapeList />
```

```jsx
/**
 * defaultShowCode: true
 * compact: true
 */
import { WShapeList } from 'w-react-label';

export default () => {
  return <WShapeList />;
};
```

## API

### props

| 参数           | 说明                 | 类型                | 默认值 |
| -------------- | -------------------- | ------------------- | ------ |
| className      | 类名                 | string              | -      |
| title          | 标题                 | string              | -      |
| shapeList      | 图形列表             | array               | -      |
| selectShapeIds | 选中的图形 id        | array               | -      |
| topRender      | 头部插入 dom 元素    | render()            | -      |
| leftRender     | 左侧插入 dom 元素    | render(data, index) | -      |
| rightRender    | 右侧插入 dom 元素    | render(data, index) | -      |
| delFunc        | 快捷键删除           | function()          | -      |
| selectFunc     | 单击、快捷键选中事件 | function(id/ids)    | -      |

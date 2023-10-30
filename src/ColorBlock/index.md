# ColorBlock 色块

Demo

```jsx
/**
 * defaultShowCode: true
 */
import { WColorBlock } from 'w-react-label';

export default () => {
  return <WColorBlock />;
};
```

## API

| 参数        | 说明             | 类型               | 默认值                                                                 |
| ----------- | ---------------- | ------------------ | ---------------------------------------------------------------------- |
| color       | 初始默认选中颜色 | string             | 色块第一个颜色                                                         |
| colorBlocks | 色块颜色组合     | Array              | ['#f00', '#FFA500', '#ff0', '#0f0', '#0ff', '#00f', '#800080', '#fff'] |
| onChange    | 单击颜色切换     | function(color, e) | -                                                                      |

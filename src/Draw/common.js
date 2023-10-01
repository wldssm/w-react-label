// 图形及对应默认属性
export const shapeInfo = {
  color: ["#CB3D45", "#DA833C", "#2378DE"],
  svg: { width: 800, height: 600 },
  shapeCommon: { fill: 'rgba(0, 0, 0, 0)', stroke: '#CB3D45', 'stroke-width': 2, 'vector-effect': "non-scaling-stroke" }, // 绘制的图形公共属性
  rect: { x: 0, y: 0, width: 0, height: 0 },
  selectBox: { 'stroke-width': 1, fill: 'rgb(34 34 204 / 12%)', stroke: 'rgb(34 34 204 / 45%)', 'vector-effect': "non-scaling-stroke" },
  ellipse: { cx: 0, cy: 0, rx: 0, ry: 0 },
  path: { d: '' },  // 用于path、polygon，区别只在是否闭合 
  line: { d: '', fill: 'none', stroke: '#00f', 'stroke-width': 1 },  // 辅助线
  point: { cx: 0, cy: 0, r: 4, fill: 'rgba(0,0,255,.45)', stroke: 'rgba(0, 0, 0, 0)', 'stroke-width': 10 },  // 顶点circle
  grip: { width: 8, height: 8, fill: 'rgba(0,0,255,.45)', stroke: 'rgba(0, 0, 0, 0)', 'stroke-width': 10 },  // 拖拽点rect，8看着合适，但不好选中
  font: { x: 0, y: 0, fill: '#CB3D45', stroke: 'none', 'font-size': 16, 'text-anchor': 'start', 'dominant-baseline': 'text-after-edge' },
  pathAddPoint: { fill: 'none', stroke: 'rgba(0,0,0,0)', 'stroke-width': 25 }, // 添加顶点的边框
};

// 8个方向（上右下左）
export const dirArr = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

// 判断是否触摸事件
export const isTouchEvent = (e) => {
  return Boolean(e.touches && e.touches.length);
};

// 拖拽grip改变坐标、尺寸
export const dragGrip = (shapeName, isShiftKey, ...boxInfo) => {
  let finalBox = {},
    [dir, diffX, diffY, startInfo] = boxInfo;

  if (shapeName === 'rect') {
    finalBox = gripChangeRect(...boxInfo);

    if (isShiftKey) {
      // 矩形变正方形（选大的边）
      let { width, height } = startInfo,
        whGap = finalBox.width - finalBox.height,
        isUp = (dir.indexOf('n') >= 0 && diffY <= height) || (dir.indexOf('s') >= 0 && diffY <= -height),
        isLeft = (dir.indexOf('e') >= 0 && diffX <= -width) || (dir.indexOf('w') >= 0 && diffX <= width);

      if (whGap > 0) {
        // 上y减
        if (isUp) {
          finalBox.y = finalBox.y - whGap;
        }
        finalBox.height = finalBox.width;
      } else {
        // 左x减
        if (isLeft) {
          finalBox.x = finalBox.x + whGap;
        }
        finalBox.width = finalBox.height;
      }
    }
  } else if (shapeName === 'ellipse') {
    finalBox = gripChangeEllipse(...boxInfo);

    if (isShiftKey) {
      // 椭圆形变圆形（选大的边）
      let { rx, ry } = startInfo,
        whGap = finalBox.rx - finalBox.ry,
        isUp = (dir.indexOf('n') >= 0 && diffY <= ry * 2) || (dir.indexOf('s') >= 0 && diffY <= -ry * 2),
        isLeft = (dir.indexOf('e') >= 0 && diffX <= -rx * 2) || (dir.indexOf('w') >= 0 && diffX <= rx * 2);

      if (whGap > 0) {
        // 上y减
        if (isUp) {
          whGap = -whGap;
        }
        finalBox.ry = finalBox.rx;
        finalBox.cy = finalBox.cy + whGap;
      } else {
        // 左x减
        if (isLeft) {
          whGap = -whGap;
        }
        finalBox.cx = finalBox.cx - whGap;
        finalBox.rx = finalBox.ry;
      }
    }
  } else {
    // path
    finalBox = gripChangePath(isShiftKey, ...boxInfo);
  }
  return finalBox;
};
// 拖动矩形（下、右正，上、左负）
const gripChangeRect = (...boxInfo) => {
  let [dir, diffX, diffY, startInfo] = boxInfo,
    { x, y, width: initW, height: initH } = startInfo,
    width = initW,
    height = initH;

  if (dir.indexOf('n') >= 0) {
    // 上
    height = initH - diffY;
    if (height > 0) {
      y = y + diffY;
    } else {
      y = y + initH;
    }
    height = Math.abs(height);
  } else if (dir.indexOf('s') >= 0) {
    // 下
    height = initH + diffY;
    if (height < 0) {
      y = y + initH + diffY;
    }
    height = Math.abs(height);
  }
  if (dir.indexOf('w') >= 0) {
    // 左
    width = initW - diffX;
    if (width < 0) {
      x = x + initW;
    } else {
      x = x + diffX;
    }
    width = Math.abs(width);
  } else if (dir.indexOf('e') >= 0) {
    // 右
    width = initW + diffX;
    if (width < 0) {
      x = x + initW + diffX;
    }
    width = Math.abs(width);
  }
  return { x, y, width, height };
};
// 拖动椭圆形（下、右正，上、左负）
const gripChangeEllipse = (...boxInfo) => {
  let [dir, diffX, diffY, startInfo] = boxInfo,
    { cx, cy, rx, ry } = startInfo;
  diffX = diffX / 2;
  diffY = diffY / 2;

  if (dir.indexOf('n') >= 0) {
    // 上
    ry = ry - diffY;
    cy = cy + diffY;
    ry = Math.abs(ry);
  } else if (dir.indexOf('s') >= 0) {
    // 下
    ry = ry + diffY;
    cy = cy + diffY;
    ry = Math.abs(ry);
  }
  if (dir.indexOf('w') >= 0) {
    // 左
    rx = rx - diffX;
    cx = cx + diffX;
    rx = Math.abs(rx);
  } else if (dir.indexOf('e') >= 0) {
    // 右
    rx = rx + diffX;
    cx = cx + diffX;
    rx = Math.abs(rx);
  }
  return { cx, cy, rx, ry };
};
// 拖动path（下、右正，上、左负）
const gripChangePath = (isShiftKey, ...boxInfo) => {
  let [dir, diffX, diffY, startInfo] = boxInfo,
    { points, boundRect } = startInfo,
    len = points?.length || 0,
    newPoints = [],
    { x, y, width, height } = boundRect,
    ratio = width / height;

  let isUp = dir.indexOf('n') >= 0,
    isDown = dir.indexOf('s') >= 0,
    isLeft = dir.indexOf('w') >= 0,
    isRight = dir.indexOf('e') >= 0;

  let operaDir = ''; // v垂直方向，h水平方向
  if (isShiftKey) {
    // 等比例缩放
    if (dir.length === 1) {
      if (isUp || isDown) {
        diffX = diffY * ratio;
        operaDir = 'v';
      } else {
        diffY = diffX / ratio;
        operaDir = 'h';
      }
      if (isUp) {
        diffX = -diffX;
      } else if (isLeft) {
        diffY = -diffY;
      }
    } else {
      diffY = diffX / ratio;
      if ((isLeft && isDown) || (isRight && isUp)) {
        diffY = -diffY;
      }
    }
  }

  for (let i = 0; i < len; i++) {
    let curPosi = [...points[i]],
      disOriginX = Math.abs(curPosi[0] - x) / width,
      disOriginY = Math.abs(curPosi[1] - y) / height;

    if (isUp) {
      curPosi[1] += diffY * (1 - disOriginY);
    }
    if (isDown || operaDir === 'h') {
      curPosi[1] += diffY * disOriginY;
    }
    if (isLeft) {
      curPosi[0] += diffX * (1 - disOriginX);
    }
    if (isRight || operaDir === 'v') {
      curPosi[0] += diffX * disOriginX;
    }
    newPoints.push(curPosi);
  }
  return { points: newPoints };
};

// 计算点到线的距离
export const pointToLineDistance = (clickPosi, lineStart, lineEnd) => {
  let [x, y] = clickPosi,
    [startX, startY] = lineStart,
    [endX, endY] = lineEnd,
    dx = endX - startX,
    dy = endY - startY,
    t = ((x - startX) * dx + (y - startY) * dy) / (dx * dx + dy * dy);

  if (t < 0) {
    dx = x - startX;
    dy = y - startY;
  } else if (t > 1) {
    dx = x - endX;
    dy = y - endY;
  } else {
    dx = x - (startX + t * dx);
    dy = y - (startY + t * dy);
  }

  return Math.sqrt(dx * dx + dy * dy);
};
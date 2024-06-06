import _slicedToArray from "@babel/runtime/helpers/esm/slicedToArray";
import _toConsumableArray from "@babel/runtime/helpers/esm/toConsumableArray";
// 图形及对应默认属性
export var shapeInfo = {
  color: ['#CB3D45', '#DA833C', '#2378DE'],
  svg: {
    width: 800,
    height: 600
  },
  shapeCommon: {
    fill: 'rgba(0, 0, 0, 0)',
    stroke: '#CB3D45',
    'stroke-width': 2,
    'vector-effect': 'non-scaling-stroke'
  },
  // 绘制的图形公共属性
  rect: {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  },
  selectBox: {
    'stroke-width': 1,
    fill: 'rgb(34 34 204 / 12%)',
    stroke: 'rgb(34 34 204 / 45%)',
    'vector-effect': 'non-scaling-stroke'
  },
  ellipse: {
    cx: 0,
    cy: 0,
    rx: 0,
    ry: 0
  },
  path: {
    d: ''
  },
  // 用于path、polygon，区别只在是否闭合
  line: {
    d: '',
    fill: 'none',
    stroke: '#00f',
    'stroke-width': 1
  },
  // 辅助线
  point: {
    cx: 0,
    cy: 0,
    r: 4,
    fill: 'rgba(0,0,255,.45)',
    stroke: 'rgba(0, 0, 0, 0)',
    'stroke-width': 10
  },
  // 顶点circle
  grip: {
    width: 8,
    height: 8,
    fill: 'rgba(0,0,255,.45)',
    stroke: 'rgba(0, 0, 0, 0)',
    'stroke-width': 10
  },
  // 拖拽点rect，8看着合适，但不好选中
  font: {
    x: 0,
    y: 0,
    fill: '#CB3D45',
    stroke: 'none',
    'font-size': 16,
    'text-anchor': 'start',
    'dominant-baseline': 'text-after-edge'
  },
  pathAddPoint: {
    fill: 'none',
    stroke: 'rgba(0,0,0,0)',
    'stroke-width': 25
  } // 添加顶点的边框
};

var colors = ['128, 0, 0', '0, 128, 0', '128, 128, 0', '0, 0, 128', '128, 0, 128', '0, 128, 128', '128, 128, 128', '64, 0, 0', '192, 0, 0', '64, 128, 0', '192, 128, 0', '64, 0, 128', '192, 0, 128', '64, 128, 128', '192, 128, 128', '0, 64, 0', '128, 64, 0', '0, 192, 0', '128, 192, 0', '0, 64, 128', '128, 64, 128', '0, 192, 128', '128, 192, 128', '64, 64, 0', '192, 64, 0', '64, 192, 0', '192, 192, 0', '64, 64, 128', '192, 64, 128', '64, 192, 128', '192, 192, 128', '0, 0, 64', '128, 0, 64', '0, 128, 64', '128, 128, 64', '0, 0, 192', '128, 0, 192', '0, 128, 192', '128, 128, 192', '64, 0, 64', '192, 0, 64', '64, 128, 64', '192, 128, 64', '64, 0, 192', '192, 0, 192', '64, 128, 192', '192, 128, 192', '0, 64, 64', '128, 64, 64', '0, 192, 64', '128, 192, 64', '0, 64, 192', '128, 64, 192', '0, 192, 192', '128, 192, 192', '64, 64, 64', '192, 64, 64', '64, 192, 64', '192, 192, 64', '64, 64, 192', '192, 64, 192', '64, 192, 192', '192, 192, 192', '32, 0, 0', '160, 0, 0', '32, 128, 0', '160, 128, 0', '32, 0, 128', '160, 0, 128', '32, 128, 128', '160, 128, 128', '96, 0, 0', '224, 0, 0', '96, 128, 0', '224, 128, 0', '96, 0, 128', '224, 0, 128', '96, 128, 128', '224, 128, 128', '32, 64, 0', '160, 64, 0', '32, 192, 0', '160, 192, 0', '32, 64, 128', '160, 64, 128', '32, 192, 128', '160, 192, 128', '96, 64, 0', '224, 64, 0', '96, 192, 0', '224, 192, 0', '96, 64, 128', '224, 64, 128', '96, 192, 128', '224, 192, 128', '32, 0, 64', '160, 0, 64', '32, 128, 64', '160, 128, 64', '32, 0, 192', '160, 0, 192', '32, 128, 192', '160, 128, 192', '96, 0, 64', '224, 0, 64', '96, 128, 64', '224, 128, 64', '96, 0, 192', '224, 0, 192', '96, 128, 192', '224, 128, 192', '32, 64, 64', '160, 64, 64', '32, 192, 64', '160, 192, 64', '32, 64, 192', '160, 64, 192', '32, 192, 192', '160, 192, 192', '96, 64, 64', '224, 64, 64', '96, 192, 64', '224, 192, 64', '96, 64, 192', '224, 64, 192', '96, 192, 192', '224, 192, 192', '0, 32, 0', '128, 32, 0', '0, 160, 0', '128, 160, 0', '0, 32, 128', '128, 32, 128', '0, 160, 128', '128, 160, 128', '64, 32, 0', '192, 32, 0', '64, 160, 0', '192, 160, 0', '64, 32, 128', '192, 32, 128', '64, 160, 128', '192, 160, 128', '0, 96, 0', '128, 96, 0', '0, 224, 0', '128, 224, 0', '0, 96, 128', '128, 96, 128', '0, 224, 128', '128, 224, 128', '64, 96, 0', '192, 96, 0', '64, 224, 0', '192, 224, 0', '64, 96, 128', '192, 96, 128', '64, 224, 128', '192, 224, 128', '0, 32, 64', '128, 32, 64', '0, 160, 64', '128, 160, 64', '0, 32, 192', '128, 32, 192', '0, 160, 192', '128, 160, 192', '64, 32, 64', '192, 32, 64', '64, 160, 64', '192, 160, 64', '64, 32, 192', '192, 32, 192', '64, 160, 192', '192, 160, 192', '0, 96, 64', '128, 96, 64', '0, 224, 64', '128, 224, 64', '0, 96, 192', '128, 96, 192', '0, 224, 192', '128, 224, 192', '64, 96, 64', '192, 96, 64', '64, 224, 64', '192, 224, 64', '64, 96, 192', '192, 96, 192', '64, 224, 192', '192, 224, 192', '32, 32, 0', '160, 32, 0', '32, 160, 0', '160, 160, 0', '32, 32, 128', '160, 32, 128', '32, 160, 128', '160, 160, 128', '96, 32, 0', '224, 32, 0', '96, 160, 0', '224, 160, 0', '96, 32, 128', '224, 32, 128', '96, 160, 128', '224, 160, 128', '32, 96, 0', '160, 96, 0', '32, 224, 0', '160, 224, 0', '32, 96, 128', '160, 96, 128', '32, 224, 128', '160, 224, 128', '96, 96, 0', '224, 96, 0', '96, 224, 0', '224, 224, 0', '96, 96, 128', '224, 96, 128', '96, 224, 128', '224, 224, 128', '32, 32, 64', '160, 32, 64', '32, 160, 64', '160, 160, 64', '32, 32, 192', '160, 32, 192', '32, 160, 192', '160, 160, 192', '96, 32, 64', '224, 32, 64', '96, 160, 64', '224, 160, 64', '96, 32, 192', '224, 32, 192', '96, 160, 192', '224, 160, 192', '32, 96, 64', '160, 96, 64', '32, 224, 64', '160, 224, 64', '32, 96, 192', '160, 96, 192', '32, 224, 192', '160, 224, 192', '96, 96, 64', '224, 96, 64', '96, 224, 64', '224, 224, 64', '96, 96, 192', '224, 96, 192', '96, 224, 192', '224, 224, 192', '0,0,0'];
// 获取范围内的随机颜色值
// export const getRandomColor = (min = 64, max = 256) => {
//   const gap = max - min,
//     r = Math.floor(Math.random() * gap) + min,
//     g = Math.floor(Math.random() * gap) + min,
//     b = Math.floor(Math.random() * gap) + min;
//   return 'rgb(' + r + ',' + g + ',' + b + ')';
// };

// export const getRandomColor = () => {
//   const colors = [0, 32, 64, 128, 160, 192, 224],
//     r = colors[Math.floor(Math.random() * 6)],
//     g = colors[Math.floor(Math.random() * 6)],
//     b = colors[Math.floor(Math.random() * 6)];
//   return 'rgb(' + r + ',' + g + ',' + b + ')';
// };
export var getRandomColor = function getRandomColor(obj) {
  var len = Object.keys(obj).length;
  return 'rgb(' + colors[len] + ')';
};

// 8个方向（上右下左）
export var dirArr = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

// 判断是否触摸事件
export var isTouchEvent = function isTouchEvent(e) {
  return Boolean(e.touches && e.touches.length);
};

// 拖拽grip改变坐标、尺寸
export var dragGrip = function dragGrip(shapeName, isShiftKey) {
  for (var _len = arguments.length, boxInfo = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    boxInfo[_key - 2] = arguments[_key];
  }
  var finalBox = {},
    dir = boxInfo[0],
    diffX = boxInfo[1],
    diffY = boxInfo[2],
    startInfo = boxInfo[3];
  if (shapeName === 'rect') {
    finalBox = gripChangeRect.apply(void 0, boxInfo);
    if (isShiftKey) {
      // 矩形变正方形（选大的边）
      var width = startInfo.width,
        height = startInfo.height,
        whGap = finalBox.width - finalBox.height,
        isUp = dir.indexOf('n') >= 0 && diffY <= height || dir.indexOf('s') >= 0 && diffY <= -height,
        isLeft = dir.indexOf('e') >= 0 && diffX <= -width || dir.indexOf('w') >= 0 && diffX <= width;
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
    finalBox = gripChangeEllipse.apply(void 0, boxInfo);
    if (isShiftKey) {
      // 椭圆形变圆形（选大的边）
      var rx = startInfo.rx,
        ry = startInfo.ry,
        _whGap = finalBox.rx - finalBox.ry,
        _isUp = dir.indexOf('n') >= 0 && diffY <= ry * 2 || dir.indexOf('s') >= 0 && diffY <= -ry * 2,
        _isLeft = dir.indexOf('e') >= 0 && diffX <= -rx * 2 || dir.indexOf('w') >= 0 && diffX <= rx * 2;
      if (_whGap > 0) {
        // 上y减
        if (_isUp) {
          _whGap = -_whGap;
        }
        finalBox.ry = finalBox.rx;
        finalBox.cy = finalBox.cy + _whGap;
      } else {
        // 左x减
        if (_isLeft) {
          _whGap = -_whGap;
        }
        finalBox.cx = finalBox.cx - _whGap;
        finalBox.rx = finalBox.ry;
      }
    }
  } else {
    // path
    finalBox = gripChangePath.apply(void 0, [isShiftKey].concat(boxInfo));
  }
  return finalBox;
};
// 拖动矩形（下、右正，上、左负）
var gripChangeRect = function gripChangeRect() {
  for (var _len2 = arguments.length, boxInfo = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    boxInfo[_key2] = arguments[_key2];
  }
  var dir = boxInfo[0],
    diffX = boxInfo[1],
    diffY = boxInfo[2],
    startInfo = boxInfo[3],
    x = startInfo.x,
    y = startInfo.y,
    initW = startInfo.width,
    initH = startInfo.height,
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
  return {
    x: x,
    y: y,
    width: width,
    height: height
  };
};
// 拖动椭圆形（下、右正，上、左负）
var gripChangeEllipse = function gripChangeEllipse() {
  for (var _len3 = arguments.length, boxInfo = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    boxInfo[_key3] = arguments[_key3];
  }
  var dir = boxInfo[0],
    diffX = boxInfo[1],
    diffY = boxInfo[2],
    startInfo = boxInfo[3],
    cx = startInfo.cx,
    cy = startInfo.cy,
    rx = startInfo.rx,
    ry = startInfo.ry;
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
  return {
    cx: cx,
    cy: cy,
    rx: rx,
    ry: ry
  };
};
// 拖动path（下、右正，上、左负）
var gripChangePath = function gripChangePath(isShiftKey) {
  for (var _len4 = arguments.length, boxInfo = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
    boxInfo[_key4 - 1] = arguments[_key4];
  }
  var dir = boxInfo[0],
    diffX = boxInfo[1],
    diffY = boxInfo[2],
    startInfo = boxInfo[3],
    points = startInfo.points,
    boundRect = startInfo.boundRect,
    len = (points === null || points === void 0 ? void 0 : points.length) || 0,
    newPoints = [],
    x = boundRect.x,
    y = boundRect.y,
    width = boundRect.width,
    height = boundRect.height,
    ratio = width / height;
  var isUp = dir.indexOf('n') >= 0,
    isDown = dir.indexOf('s') >= 0,
    isLeft = dir.indexOf('w') >= 0,
    isRight = dir.indexOf('e') >= 0;
  var operaDir = ''; // v垂直方向，h水平方向
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
      if (isLeft && isDown || isRight && isUp) {
        diffY = -diffY;
      }
    }
  }
  for (var i = 0; i < len; i++) {
    var curPosi = _toConsumableArray(points[i]),
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
  return {
    points: newPoints
  };
};

// 计算点到线的距离
export var pointToLineDistance = function pointToLineDistance(clickPosi, lineStart, lineEnd) {
  var _clickPosi = _slicedToArray(clickPosi, 2),
    x = _clickPosi[0],
    y = _clickPosi[1],
    _lineStart = _slicedToArray(lineStart, 2),
    startX = _lineStart[0],
    startY = _lineStart[1],
    _lineEnd = _slicedToArray(lineEnd, 2),
    endX = _lineEnd[0],
    endY = _lineEnd[1],
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
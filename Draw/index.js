import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import _objectSpread from "@babel/runtime/helpers/esm/objectSpread2";
import _objectWithoutProperties from "@babel/runtime/helpers/esm/objectWithoutProperties";
import _typeof from "@babel/runtime/helpers/esm/typeof";
import _toConsumableArray from "@babel/runtime/helpers/esm/toConsumableArray";
import _toArray from "@babel/runtime/helpers/esm/toArray";
import _slicedToArray from "@babel/runtime/helpers/esm/slicedToArray";
var _excluded = ["attrs", "shape_type"],
  _excluded2 = ["points", "shape_type"];
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as d3 from 'd3';
import { dirArr, dragGrip, getRandomColor, isTouchEvent, pointToLineDistance, shapeInfo } from "./common.js";
import "./index.css";
var WDraw = /*#__PURE__*/forwardRef(function (props, ref) {
  // let { className, src, drawTool, scaleExtent } = props;
  var tempProps = useRef(props),
    // 最新的
    curDom = useRef(null),
    // 当前根dom
    // svg元素
    svgRoot = useRef(null),
    svgCont = useRef(null),
    curShape = useRef(null),
    // 正在绘制的图像，即拖拽点出现的图像，而不是蒙版出现的。因为绘制完图形可以直接拖动控制点修改。
    maskShapeId = useRef(null),
    // 有蒙版的元素id
    editPathId = useRef(null),
    // 可以编辑顶点的path的id
    selectedGripId = useRef(''),
    // 选中的grip（拖拽点）
    selectedPointId = useRef(null),
    // 选中的顶点
    lineCreater = useRef(null),
    // d3.line()，为了生成path的节点
    curTransform = useRef(null),
    // 当前缩放transform
    startInfo = useRef({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      mx: 0,
      my: 0
    }),
    // 临时初始数据
    isDrawing = useRef(false),
    // 是否绘制rect、ellipse中
    isPathing = useRef(false),
    // 是否绘制path中
    isMoving = useRef(false),
    // drag、zoom是否执行了drag\zoom方法，即是否移动，还是只有单击
    drawNumArr = useRef([]),
    // 记录已绘制的图形num编号
    curScale = useRef('1'),
    // 画布的scale
    curImgInfo = useRef({
      x: 0,
      y: 0,
      scale: 1,
      w: 0,
      h: 0
    }),
    // 图片初始展示信息
    selectShapeIds = useRef(null),
    // 多选选中的图形id
    copyIds = useRef(null),
    imgFilterStr = useRef(''),
    // 图片的调整样式
    // 按键
    isCtrlKey = useRef(false),
    // ctrl是否按下。为了兼容触摸屏touch事件的ctrl始终为false
    isShiftKey = useRef(false),
    isAltKey = useRef(false),
    // json记录(label、points、shape_type)
    allShapeJson = useRef({}),
    // 所有已绘制图形的坐标尺寸数据
    curShapePoints = useRef(null),
    // 当前正在绘制的图形的坐标尺寸数据
    labelColorJson = useRef({}),
    // 标签绑定的颜色
    // 操作记录
    undoStack = useRef([]),
    // 撤销栈
    redoStack = useRef([]); // 重做栈（重做的是最新的连续的撤销操作）

  // 删除元素蒙版、可编辑状态
  var delEditStatus = function delEditStatus() {
    var _d3$selectAll;
    (_d3$selectAll = d3.selectAll('#shape-grip-group,#path-point-group *,#shape-path-group *,#path-add-point')) === null || _d3$selectAll === void 0 ? void 0 : _d3$selectAll.attr('display', 'none');
    editPathId.current = '';
    if (maskShapeId.current) {
      d3.select('#' + maskShapeId.current).attr('fill', shapeInfo.shapeCommon.fill);
      maskShapeId.current = '';
    }
    if (selectedGripId.current) {
      d3.select('#' + selectedGripId.current).attr('fill', shapeInfo['grip'].fill);
      selectedGripId.current = '';
    }
    if (selectedPointId.current) {
      d3.select('#path-point-' + selectedPointId.current).attr('fill', shapeInfo['point'].fill);
      selectedPointId.current = '';
    }
  };

  // mouse才会触发focus，所以手动触发画布获取焦点
  var getFocus = function getFocus() {
    if (document.getElementById('svgcanvas') !== document.activeElement) {
      var _document$getElementB;
      (_document$getElementB = document.getElementById('svgcanvas')) === null || _document$getElementB === void 0 ? void 0 : _document$getElementB.focus();
    }
  };

  // 获取d3鼠标相对容器的坐标的坐标
  var getD3Posi = function getD3Posi(event) {
    var e = (event === null || event === void 0 ? void 0 : event.sourceEvent) || event;
    var posi = [];
    if (isTouchEvent(e)) {
      posi = d3.pointer(e.touches[0] || e.changedTouches[0], svgRoot.current.node());
    } else {
      posi = d3.pointer(e, svgRoot.current.node());
    }

    // 放大后鼠标位置发生偏移，需反向计算回去
    if (curTransform.current) {
      var _curTransform$current = curTransform.current,
        x = _curTransform$current.x,
        y = _curTransform$current.y,
        k = _curTransform$current.k;
      posi[0] = (posi[0] - x) / k;
      posi[1] = (posi[1] - y) / k;
    }
    return posi;
  };

  // 计算当前图形的编号，递增插入
  var getCurNum = function getCurNum() {
    var len = drawNumArr.current.length || 0,
      curNum = 0;
    for (var i = 0; i < len; i++) {
      if (+drawNumArr.current[i] !== i + 1) {
        curNum = i + 1;
        break;
      }
    }
    if (curNum === 0) curNum = len + 1;
    curNum = '' + curNum;
    drawNumArr.current.splice(curNum - 1, 0, curNum);
    return curNum;
  };

  // 获取图形属性名（ellipse、rect）
  var getShapeAttrNames = function getShapeAttrNames(type) {
    if (type === 'ellipse') {
      return {
        x: 'cx',
        y: 'cy',
        w: 'rx',
        h: 'ry'
      };
    }
    return {
      x: 'x',
      y: 'y',
      w: 'width',
      h: 'height'
    };
  };

  // 判断误操作（尺寸过小），删除图形
  var delShapeIfMini = function delShapeIfMini() {
    var drawTool = tempProps.current.drawTool,
      minSize = props.minSize,
      curW = 0,
      curH = 0;
    if (drawTool === 'rect') {
      curW = curShape.current.attr('width');
      curH = curShape.current.attr('height');
    } else if (drawTool === 'ellipse') {
      curW = curShape.current.attr('rx') * 2 || 0;
      curH = curShape.current.attr('ry') * 2 || 0;
    }
    if (+curW <= minSize[0] || +curH <= minSize[1]) {
      // 宽或高小于
      // console.log(88, 'mouseUp，尺寸过小');
      curShape.current.remove();
      curShape.current = null;
      d3.select('#shape-grip-group').attr('display', 'none');
      return true;
    }
    return false;
  };

  // 更新控制点位置（selection）
  var updateGrip = function updateGrip() {
    var _curShape$current$att, _allShapeJson$current, _curTransform$current2, _curShape$current, _curShape$current$nod2;
    if (!curShape.current || isPathing.current || editPathId.current) return false;
    var curId = (_curShape$current$att = curShape.current.attr('id')) === null || _curShape$current$att === void 0 ? void 0 : _curShape$current$att.substring(6),
      _ref = ((_allShapeJson$current = allShapeJson.current) === null || _allShapeJson$current === void 0 ? void 0 : _allShapeJson$current[curId]) || false,
      hide = _ref.hide;
    d3.select('#shape-grip-group').attr('display', hide ? 'none' : 'inline');
    if (hide) return;
    var curScale = (curTransform === null || curTransform === void 0 ? void 0 : (_curTransform$current2 = curTransform.current) === null || _curTransform$current2 === void 0 ? void 0 : _curTransform$current2.k) || 1,
      _curShape$current$nod = (_curShape$current = curShape.current) === null || _curShape$current === void 0 ? void 0 : (_curShape$current$nod2 = _curShape$current.node()) === null || _curShape$current$nod2 === void 0 ? void 0 : _curShape$current$nod2.getBBox(),
      x = _curShape$current$nod.x,
      y = _curShape$current$nod.y,
      width = _curShape$current$nod.width,
      height = _curShape$current$nod.height,
      gWidth = shapeInfo['grip'].width / 2,
      gHeight = shapeInfo['grip'].height / 2;

    // 手动调整scale
    x = x * curScale || 0;
    y = y * curScale || 0;
    width = width * curScale || 0;
    height = height * curScale || 0;

    // 线
    var points = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]],
      pointString = lineCreater.current(points);
    d3.select('#resize-path').attr('d', pointString + 'Z');
    // 点
    d3.select('#resize-grip-nw').attr('x', x - gWidth).attr('y', y - gHeight);
    d3.select('#resize-grip-n').attr('x', x + width / 2 - gWidth).attr('y', y - gHeight);
    d3.select('#resize-grip-ne').attr('x', x + width - gWidth).attr('y', y - gHeight);
    d3.select('#resize-grip-w').attr('x', x - gWidth).attr('y', y + height / 2 - gHeight);
    d3.select('#resize-grip-e').attr('x', x + width - gWidth).attr('y', y + height / 2 - gHeight);
    d3.select('#resize-grip-sw').attr('x', x - gWidth).attr('y', y + height - gHeight);
    d3.select('#resize-grip-s').attr('x', x + width / 2 - gWidth).attr('y', y + height - gHeight);
    d3.select('#resize-grip-se').attr('x', x + width - gWidth).attr('y', y + height - gHeight);
  };
  // 更新添加多边形的顶点
  var updateAddPointPath = function updateAddPointPath(curId) {
    var _allShapeJson$current3, _curTransform$current3;
    if (curShapePoints.current) return; // 绘制中

    var _allShapeJson$current2 = (_allShapeJson$current3 = allShapeJson.current) === null || _allShapeJson$current3 === void 0 ? void 0 : _allShapeJson$current3[curId],
      points = _allShapeJson$current2.attrs.points,
      shape_type = _allShapeJson$current2.shape_type,
      curLen = points.length,
      curScale = (curTransform === null || curTransform === void 0 ? void 0 : (_curTransform$current3 = curTransform.current) === null || _curTransform$current3 === void 0 ? void 0 : _curTransform$current3.k) || 1,
      tempPoints = [];
    for (var i = 0; i < curLen; i++) {
      var _points$i = _slicedToArray(points[i], 2),
        x = _points$i[0],
        y = _points$i[1];
      x = x * curScale;
      y = y * curScale;
      tempPoints[i] = [x, y];
    }
    var pointString = lineCreater.current(tempPoints);
    if (shape_type === 'polygon') {
      pointString += 'Z';
    }
    svgRoot.current.select('#path-add-point').attr('d', pointString);
  };
  // 更新射线（path最后一点与鼠标的连线）
  var updateStretchLine = function updateStretchLine(e) {
    var _curTransform$current4;
    var points = curShapePoints.current || [],
      curLen = points.length;
    if (!isPathing.current || !curLen) return;
    var curScale = (curTransform === null || curTransform === void 0 ? void 0 : (_curTransform$current4 = curTransform.current) === null || _curTransform$current4 === void 0 ? void 0 : _curTransform$current4.k) || 1,
      _points = _slicedToArray(points[curLen - 1], 2),
      startX = _points[0],
      startY = _points[1],
      _getD3Posi = getD3Posi(e),
      _getD3Posi2 = _slicedToArray(_getD3Posi, 2),
      lastX = _getD3Posi2[0],
      lastY = _getD3Posi2[1];
    startX = startX * curScale;
    startY = startY * curScale;
    lastX = lastX * curScale;
    lastY = lastY * curScale;
    var stretchLinePoints = [[startX, startY], [lastX, lastY]],
      pointString = lineCreater.current(stretchLinePoints);
    d3.select('#path-stretch-line').attr('d', pointString);
  };
  // 更新顶点的位置
  var updatePoint = function updatePoint(e) {
    var _curShape$current$att2, _allShapeJson$current4, _allShapeJson$current5, _allShapeJson$current6, _curTransform$current5;
    if (!curShape.current || !curShape.current.attr('id')) return false;
    var curId = (_curShape$current$att2 = curShape.current.attr('id')) === null || _curShape$current$att2 === void 0 ? void 0 : _curShape$current$att2.substring(6),
      points = ((_allShapeJson$current4 = allShapeJson.current) === null || _allShapeJson$current4 === void 0 ? void 0 : (_allShapeJson$current5 = _allShapeJson$current4[curId]) === null || _allShapeJson$current5 === void 0 ? void 0 : (_allShapeJson$current6 = _allShapeJson$current5.attrs) === null || _allShapeJson$current6 === void 0 ? void 0 : _allShapeJson$current6.points) || curShapePoints.current || [],
      curLen = points.length,
      curScale = (curTransform === null || curTransform === void 0 ? void 0 : (_curTransform$current5 = curTransform.current) === null || _curTransform$current5 === void 0 ? void 0 : _curTransform$current5.k) || 1;
    if (!curLen) return;
    updateAddPointPath(curId);

    // 手动调整point的scale
    for (var i = 0; i < curLen; i++) {
      var curEl = d3.select("#path-point-group #path-point-".concat(i + 1)),
        _points$i2 = _slicedToArray(points[i], 2),
        x = _points$i2[0],
        y = _points$i2[1];
      x = x * curScale;
      y = y * curScale;
      curEl.attr('cx', x).attr('cy', y).attr('display', 'inline');
    }
    // 调整射线
    if (e) {
      updateStretchLine(e);
    }
  };

  // 更新网格尺寸位置
  var updateGrid = function updateGrid(force) {
    var showGrid = force ? props.showGrid : tempProps.current.showGrid;
    if (!showGrid) return;
    curTransform.current = curTransform.current || d3.zoomIdentity;
    if (curTransform.current.k < 1) {
      svgRoot.current.select('#grid').attr('display', 'none');
    } else {
      var _curImgInfo$current = curImgInfo.current,
        imgX = _curImgInfo$current.x,
        imgY = _curImgInfo$current.y,
        imgW = _curImgInfo$current.w,
        imgH = _curImgInfo$current.h,
        k = curTransform.current.k,
        curPatternSize = 10 * k,
        curPatternX = imgX * k,
        curPatternY = imgY * k;
      svgRoot.current.select('#gridPattern').attr('width', curPatternSize).attr('height', curPatternSize).attr('x', curPatternX).attr('y', curPatternY);
      svgRoot.current.select('#grid').attr('display', 'inline').attr('x', curPatternX).attr('y', curPatternY).attr('width', imgW * k).attr('height', imgH * k);
    }
  };

  // 设置绘制图形颜色（指定标签）
  var setDrawColor = function setDrawColor(labelParam) {
    var _tempProps$current = tempProps.current,
      curLabel = _tempProps$current.curLabel,
      colorBindLabel = _tempProps$current.colorBindLabel,
      tempLabel = labelParam || curLabel;
    if (colorBindLabel) {
      var curLabelColor = labelColorJson.current[tempLabel] || getRandomColor(labelColorJson.current);
      shapeInfo.shapeCommon.stroke = curLabelColor;
      shapeInfo.font.fill = curLabelColor;
      if (labelParam) {
        labelColorJson.current[tempLabel] = curLabelColor;
      }
    }
  };
  // 设置蒙版颜色
  var setMaskColor = function setMaskColor(colorP) {
    var color = colorP || shapeInfo.shapeCommon.stroke;
    return d3.color(color).copy({
      opacity: 0.2
    });
  };
  // 切换单个元素的颜色
  var changeSingleShapeColor = function changeSingleShapeColor(id, color) {
    var tempShape = d3.select("#shape-".concat(id));
    tempShape.attr('stroke', color);
    if (tempProps.current.showLabel) {
      svgRoot.current.select("#shape-label-".concat(id)).attr('fill', color);
    }
    if (maskShapeId.current === 'shape-' + id) {
      tempShape.attr('fill', setMaskColor(color));
    }
  };
  // 切换色块（改变当前和以后的绘制）
  var changeColor = function changeColor(color) {
    var _curShape$current$att4;
    var _tempProps$current2 = tempProps.current,
      colorBindLabel = _tempProps$current2.colorBindLabel,
      lastLabel = _tempProps$current2.curLabel;
    if (colorBindLabel) {
      var _curShape$current$att3, _allShapeJson$current8, _Object$keys;
      if (selectShapeIds.current || !curShape.current) return;
      var _curId = (_curShape$current$att3 = curShape.current.attr('id')) === null || _curShape$current$att3 === void 0 ? void 0 : _curShape$current$att3.substring(6),
        _allShapeJson$current7 = (_allShapeJson$current8 = allShapeJson.current) === null || _allShapeJson$current8 === void 0 ? void 0 : _allShapeJson$current8[_curId],
        curLabel = _allShapeJson$current7.label,
        lastLabelColor = labelColorJson.current[lastLabel];

      // 同标签变色
      (_Object$keys = Object.keys(allShapeJson.current)) === null || _Object$keys === void 0 ? void 0 : _Object$keys.forEach(function (item) {
        var label = allShapeJson.current[item].label;
        if (label === curLabel) {
          changeSingleShapeColor(item, color);
        }
      });
      if (lastLabelColor) {
        shapeInfo.shapeCommon.stroke = lastLabelColor;
        shapeInfo.font.fill = lastLabelColor;
      }
      labelColorJson.current[curLabel] = color;
      tempProps.current.changeBindColor(labelColorJson.current);
      return;
    }
    shapeInfo.shapeCommon.stroke = color;
    shapeInfo.font.fill = color;
    if (selectShapeIds.current) {
      var _selectShapeIds$curre;
      (_selectShapeIds$curre = selectShapeIds.current) === null || _selectShapeIds$curre === void 0 ? void 0 : _selectShapeIds$curre.forEach(function (item) {
        changeSingleShapeColor(item, color);
      });
      return;
    }
    if (!curShape.current) return;
    var curId = (_curShape$current$att4 = curShape.current.attr('id')) === null || _curShape$current$att4 === void 0 ? void 0 : _curShape$current$att4.substring(6);
    changeSingleShapeColor(curId, color);
  };

  // 更新文本的位置
  var updateLabel = function updateLabel(curNum, showLabel, updateColor) {
    var _curTransform$current6;
    if (!showLabel) return;
    var curScale = (curTransform === null || curTransform === void 0 ? void 0 : (_curTransform$current6 = curTransform.current) === null || _curTransform$current6 === void 0 ? void 0 : _curTransform$current6.k) || 1,
      _allShapeJson$current9 = allShapeJson.current[curNum],
      shape_type = _allShapeJson$current9.shape_type,
      attrs = _allShapeJson$current9.attrs,
      curShapeLabel = svgRoot.current.select("#shape-label-".concat(curNum)),
      x = 0,
      y = 0;
    if (shape_type === 'ellipse') {
      // 显示在最上正中
      var cx = attrs.cx,
        cy = attrs.cy,
        ry = attrs.ry;
      x = cx;
      y = cy - ry;
    } else if (shape_type === 'rect') {
      x = attrs.x;
      y = attrs.y;
    } else {
      // 多边形。显示在最上最左的那个顶点上
      var points = attrs.points;
      var _points$ = _slicedToArray(points[0], 2);
      x = _points$[0];
      y = _points$[1];
      for (var i = 1; i < points.length; i++) {
        var _points$i3 = _slicedToArray(points[i], 2),
          curX = _points$i3[0],
          curY = _points$i3[1];
        if (y > curY) {
          y = curY;
          x = curX;
        } else if (y === curY && x > curX) {
          x = curX;
        }
      }
    }
    x = x * curScale || 0;
    y = y * curScale || 0;
    curShapeLabel.attr('x', x).attr('y', y);
    if (updateColor) {
      curShapeLabel.attr('fill', shapeInfo.font.fill);
    }
  };
  var updateAllLabel = function updateAllLabel(force) {
    var showLabel = force ? props.showLabel : tempProps.current.showLabel;
    if (!showLabel) return;
    var shapeIds = Object.keys(allShapeJson.current);
    shapeIds === null || shapeIds === void 0 ? void 0 : shapeIds.forEach(function (item) {
      updateLabel(item, showLabel);
    });
  };

  // 插入撤销栈，同时清空重做栈（add、move、del）
  var insertStack = function insertStack() {
    for (var _len = arguments.length, arg = new Array(_len), _key = 0; _key < _len; _key++) {
      arg[_key] = arguments[_key];
    }
    undoStack.current.push(arg);
    redoStack.current = [];
    // console.log(undoStack.current);
  };
  // 记录移动操作前的数据
  var recordBeforeMove = function recordBeforeMove() {
    var recordData = [],
      curJson = {};
    if (selectShapeIds.current) {
      var _selectShapeIds$curre2;
      var _curDom = {};
      (_selectShapeIds$curre2 = selectShapeIds.current) === null || _selectShapeIds$curre2 === void 0 ? void 0 : _selectShapeIds$curre2.forEach(function (item) {
        var curShape = d3.select("#shape-".concat(item));
        curJson[item] = JSON.parse(JSON.stringify(allShapeJson.current[item]));
        _curDom[item] = curShape;
      });
      recordData = [selectShapeIds.current, curJson, _curDom];
    } else if (curShape.current) {
      var _curShape$current2, _curShape$current2$at;
      var curNum = (_curShape$current2 = curShape.current) === null || _curShape$current2 === void 0 ? void 0 : (_curShape$current2$at = _curShape$current2.attr('id')) === null || _curShape$current2$at === void 0 ? void 0 : _curShape$current2$at.substring(6);
      curJson[curNum] = JSON.parse(JSON.stringify(allShapeJson.current[curNum]));
      recordData = [curShape.current, curJson];
    }
    return recordData;
  };
  // 修改位置、尺寸前记录初始数据
  var recordStartInfo = function recordStartInfo(e) {
    var _curShape$current3, _curShape$current3$at, _allShapeJson$current11;
    var curShapeId = (_curShape$current3 = curShape.current) === null || _curShape$current3 === void 0 ? void 0 : (_curShape$current3$at = _curShape$current3.attr('id')) === null || _curShape$current3$at === void 0 ? void 0 : _curShape$current3$at.substring(6),
      _allShapeJson$current10 = (_allShapeJson$current11 = allShapeJson.current) === null || _allShapeJson$current11 === void 0 ? void 0 : _allShapeJson$current11[curShapeId],
      attrs = _allShapeJson$current10.attrs,
      shape_type = _allShapeJson$current10.shape_type;
    startInfo.current = attrs;
    if (shape_type === 'polygon' || shape_type === 'line') {
      var _curShape$current4, _curShape$current4$no;
      startInfo.current.boundRect = (_curShape$current4 = curShape.current) === null || _curShape$current4 === void 0 ? void 0 : (_curShape$current4$no = _curShape$current4.node()) === null || _curShape$current4$no === void 0 ? void 0 : _curShape$current4$no.getBBox();
      startInfo.current.close = shape_type === 'polygon';
    }
    // 鼠标位置
    var _getD3Posi3 = getD3Posi(e);
    var _getD3Posi4 = _slicedToArray(_getD3Posi3, 2);
    startInfo.current.mx = _getD3Posi4[0];
    startInfo.current.my = _getD3Posi4[1];
  };

  // 获取外部需要的标注数据（相对于图片）
  var getMarkData = function getMarkData() {
    // console.log(allShapeJson.current);
    var shapeIds = Object.keys(allShapeJson.current),
      res = [],
      _curImgInfo$current2 = curImgInfo.current,
      imgX = _curImgInfo$current2.x,
      imgY = _curImgInfo$current2.y,
      imgScale = _curImgInfo$current2.scale;
    shapeIds === null || shapeIds === void 0 ? void 0 : shapeIds.forEach(function (shapeId) {
      var _allShapeJson$current12 = allShapeJson.current[shapeId],
        attrs = _allShapeJson$current12.attrs,
        label = _allShapeJson$current12.label,
        shape_type = _allShapeJson$current12.shape_type,
        hide = _allShapeJson$current12.hide,
        curAttrs = {};
      curAttrs['label'] = label || shapeId;
      curAttrs['shape_type'] = shape_type;
      curAttrs['attrs'] = {};
      curAttrs['hide'] = hide || false;
      curAttrs['id'] = shapeId;
      if (shape_type === 'rect') {
        curAttrs['attrs']['x'] = (attrs['x'] - imgX) * imgScale;
        curAttrs['attrs']['y'] = (attrs['y'] - imgY) * imgScale;
        curAttrs['attrs']['width'] = attrs['width'] * imgScale;
        curAttrs['attrs']['height'] = attrs['height'] * imgScale;
      } else if (shape_type === 'ellipse') {
        curAttrs['attrs']['cx'] = (attrs['cx'] - imgX) * imgScale;
        curAttrs['attrs']['cy'] = (attrs['cy'] - imgY) * imgScale;
        curAttrs['attrs']['rx'] = attrs['rx'] * imgScale;
        curAttrs['attrs']['ry'] = attrs['ry'] * imgScale;
      } else {
        var _attrs$points;
        // path
        curAttrs['attrs']['points'] = [];
        (_attrs$points = attrs['points']) === null || _attrs$points === void 0 ? void 0 : _attrs$points.forEach(function (item, index) {
          curAttrs['attrs']['points'][index] = [(item[0] - imgX) * imgScale, (item[1] - imgY) * imgScale];
        });
      }
      res.push(curAttrs);
    });
    // console.log('size', res);
    return res;
  };

  // 动态设置光标（default箭头、pointer手、crosshair十字、move、grab拖拽手）（注：鼠标按下后无法修改cursor）
  var setCursor = function setCursor(event) {
    var target = (event === null || event === void 0 ? void 0 : event.target) || (event === null || event === void 0 ? void 0 : event.srcElement),
      curShapeId = d3.select(target).attr('id'),
      curCursor = null,
      drawTool = tempProps.current.drawTool;
    if (selectedGripId.current || selectedPointId.current) {
      curCursor = 'crosshair';
    } else if (isCtrlKey.current && !isShiftKey.current && !isAltKey.current || drawTool === 'drag') {
      // 拖拽整体（ctrl快捷拖动）
      curCursor = 'grab';
    } else if (curShapeId === 'path-add-point') {
      // 添加顶点
      curCursor = 'pointer';
    } else if (curShape.current && !isPathing.current && maskShapeId.current === curShapeId || selectShapeIds.current && selectShapeIds.current.includes(curShapeId === null || curShapeId === void 0 ? void 0 : curShapeId.substring(6))) {
      curCursor = 'move';
    } else if (!drawTool || drawTool === 'move') {
      curCursor = 'default';
    }
    d3.select(curDom.current).style('cursor', curCursor);
  };
  // 更新瞄准线
  var updateCrosshair = function updateCrosshair(e) {
    if (!tempProps.current.showCrosshair) return;
    svgRoot.current.select('#crosshair-v-line').attr('x', e.layerX);
    svgRoot.current.select('#crosshair-h-line').attr('y', e.layerY);
  };

  // 添加多选外框
  var addSelectPath = function addSelectPath(index) {
    var curShapePath = d3.select("#shape-path-group #shape-path-".concat(index));
    if (!curShapePath.node()) {
      curShapePath = d3.select('#shape-path-group').append('path').attr('id', "shape-path-".concat(index)).style('pointer-events', 'none');
      var lineAttrs = shapeInfo['line'];
      Object.keys(lineAttrs).forEach(function (key) {
        curShapePath.attr(key, lineAttrs[key]);
      });
    } else {
      curShapePath.attr('display', 'inline');
    }
    return curShapePath;
  };
  // 更新选中图形的外框
  var updateSelectPath = function updateSelectPath() {
    var _curTransform$current7, _selectShapeIds$curre3;
    var curScale = (curTransform === null || curTransform === void 0 ? void 0 : (_curTransform$current7 = curTransform.current) === null || _curTransform$current7 === void 0 ? void 0 : _curTransform$current7.k) || 1;
    (_selectShapeIds$curre3 = selectShapeIds.current) === null || _selectShapeIds$curre3 === void 0 ? void 0 : _selectShapeIds$curre3.forEach(function (item, index) {
      var curShape = d3.select("#shape-".concat(item)),
        _curShape$node$getBBo = curShape.node().getBBox(),
        x = _curShape$node$getBBo.x,
        y = _curShape$node$getBBo.y,
        width = _curShape$node$getBBo.width,
        height = _curShape$node$getBBo.height,
        curShapePath = addSelectPath(index);
      x = x * curScale || 0;
      y = y * curScale || 0;
      width = width * curScale || 0;
      height = height * curScale || 0;
      var points = [[x - 2, y - 2], [x + width + 2, y - 2], [x + width + 2, y + height + 2], [x - 2, y + height + 2]],
        pointString = lineCreater.current(points);
      curShapePath.attr('d', pointString + 'Z');
    });
  };

  // 选中图形，添加蒙版
  var getSelectIds = function getSelectIds() {
    var _selectShapeIds$curre4, _curShape$current5, _curShape$current5$at;
    if ((_selectShapeIds$curre4 = selectShapeIds.current) !== null && _selectShapeIds$curre4 !== void 0 && _selectShapeIds$curre4.length) return selectShapeIds.current;
    if (curShape.current) return [(_curShape$current5 = curShape.current) === null || _curShape$current5 === void 0 ? void 0 : (_curShape$current5$at = _curShape$current5.attr('id')) === null || _curShape$current5$at === void 0 ? void 0 : _curShape$current5$at.substring(6)];
    return [];
  };
  var selectShape = function selectShape(targetP, isShiftKeyP) {
    var _d3$selectAll2, _allShapeJson$current14, _curTargetId2;
    var isShiftKey = isShiftKeyP,
      target = targetP;
    var curTargetId = '',
      curShapeId = '';
    if (target instanceof Array) {
      // 外部直接选中
      selectShapeIds.current = target;
      isShiftKey = true;
    } else if (typeof target === 'string') {
      curTargetId = 'shape-' + target;
      target = svgRoot.current.select("#".concat(curTargetId));
    } else {
      var _target, _curShape$current6;
      curTargetId = (_target = target) === null || _target === void 0 ? void 0 : _target.attr('id');
      curShapeId = (_curShape$current6 = curShape.current) === null || _curShape$current6 === void 0 ? void 0 : _curShape$current6.attr('id');
    }

    // console.log(22, curTargetId, curShapeId, selectShapeIds.current);
    if (isShiftKey && (curShapeId && curTargetId !== curShapeId || selectShapeIds.current)) {
      var _curTargetId, _selectShapeIds$curre6;
      // 多选
      curShape.current = null;
      curTargetId = (_curTargetId = curTargetId) === null || _curTargetId === void 0 ? void 0 : _curTargetId.substring(6);
      if (!selectShapeIds.current) {
        var _curShapeId;
        // console.log(1);
        curShapeId = (_curShapeId = curShapeId) === null || _curShapeId === void 0 ? void 0 : _curShapeId.substring(6);
        selectShapeIds.current = [curTargetId, curShapeId];
        tempProps.current.changeSelect(getSelectIds());
      } else if (curTargetId) {
        // console.log(2);
        var curIdIndex = selectShapeIds.current.indexOf(curTargetId);
        if (curIdIndex >= 0) {
          var _selectShapeIds$curre5;
          selectShapeIds.current.splice(curIdIndex, 1);
          if (!((_selectShapeIds$curre5 = selectShapeIds.current) !== null && _selectShapeIds$curre5 !== void 0 && _selectShapeIds$curre5.length)) {
            selectShapeIds.current = null;
          }
        } else {
          selectShapeIds.current.push(curTargetId);
        }
        tempProps.current.changeSelect(getSelectIds());
      } else {
        tempProps.current.changeSelect(getSelectIds());
      }
      (_selectShapeIds$curre6 = selectShapeIds.current) === null || _selectShapeIds$curre6 === void 0 ? void 0 : _selectShapeIds$curre6.forEach(function (item, index) {
        addSelectPath(index);
      });
      delEditStatus();
      updateSelectPath();

      // console.log(selectShapeIds.current);
      return;
    }

    // console.log(666);
    curShape.current = target;
    (_d3$selectAll2 = d3.selectAll('#shape-path-group *')) === null || _d3$selectAll2 === void 0 ? void 0 : _d3$selectAll2.attr('display', 'none');
    selectShapeIds.current = null;
    var _allShapeJson$current13 = (_allShapeJson$current14 = allShapeJson.current) === null || _allShapeJson$current14 === void 0 ? void 0 : _allShapeJson$current14[(_curTargetId2 = curTargetId) === null || _curTargetId2 === void 0 ? void 0 : _curTargetId2.substring(6)],
      shape_type = _allShapeJson$current13.shape_type,
      hide = _allShapeJson$current13.hide;
    if (maskShapeId.current) {
      // 将旧的蒙版去掉
      d3.select('#' + maskShapeId.current).attr('fill', shapeInfo.shapeCommon.fill);
    }
    if (maskShapeId.current === curTargetId) {
      maskShapeId.current = '';
      if (shape_type === 'line' || shape_type === 'polygon') {
        editPathId.current = '';
        svgRoot.current.selectAll('#path-point-group circle,#path-add-point').attr('display', 'none');
        updateGrip();
      }
    } else if (maskShapeId.current !== curTargetId) {
      maskShapeId.current = curTargetId;
      target.attr('fill', setMaskColor(target.attr('stroke')));
      if (shape_type === 'line' || shape_type === 'polygon') {
        var _d3$selectAll3;
        editPathId.current = curTargetId;
        (_d3$selectAll3 = d3.selectAll('#shape-grip-group')) === null || _d3$selectAll3 === void 0 ? void 0 : _d3$selectAll3.attr('display', 'none');
        if (hide) {
          d3.selectAll('#path-point-group circle,#path-add-point').attr('display', 'none');
        } else {
          var _svgRoot$current$sele;
          (_svgRoot$current$sele = svgRoot.current.select('#path-add-point')) === null || _svgRoot$current$sele === void 0 ? void 0 : _svgRoot$current$sele.attr('display', 'inline');
          updatePoint();
        }
      } else {
        editPathId.current = '';
        svgRoot.current.selectAll('#path-point-group circle,#path-add-point').attr('display', 'none');
        updateGrip();
      }
    }
    tempProps.current.changeSelect(getSelectIds());
  };

  // 删除图形
  var delShape = function delShape(targetP) {
    var _target$attr, _svgRoot$current$sele2, _allShapeJson$current15;
    var target = targetP || curShape.current;
    if (!target) return;
    delEditStatus();
    var curNum = (_target$attr = target.attr('id')) === null || _target$attr === void 0 ? void 0 : _target$attr.substring(6),
      curIndex = drawNumArr.current.indexOf(curNum);
    drawNumArr.current.splice(curIndex, 1);
    target === null || target === void 0 ? void 0 : target.remove();
    (_svgRoot$current$sele2 = svgRoot.current.select("#shape-label-".concat(curNum))) === null || _svgRoot$current$sele2 === void 0 ? void 0 : _svgRoot$current$sele2.attr('display', 'none');
    curShape.current = null;
    curShapePoints.current = null;
    (_allShapeJson$current15 = allShapeJson.current) === null || _allShapeJson$current15 === void 0 ? true : delete _allShapeJson$current15[curNum];
  };
  var delSelectShape = function delSelectShape() {
    var _curShape$current$att5;
    var record = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    var curJson = {};
    if (selectShapeIds.current) {
      var _selectShapeIds$curre7;
      var _curDom2 = {};
      (_selectShapeIds$curre7 = selectShapeIds.current) === null || _selectShapeIds$curre7 === void 0 ? void 0 : _selectShapeIds$curre7.forEach(function (item) {
        var curShape = d3.select("#shape-".concat(item));
        curJson[item] = JSON.parse(JSON.stringify(allShapeJson.current[item]));
        _curDom2[item] = curShape;
        delShape(curShape);
      });
      // 操作记录
      if (record) {
        insertStack('del', selectShapeIds.current, curJson, _curDom2);
      }
      selectShapeIds.current = null;
      tempProps.current.changeSize(getMarkData());
      tempProps.current.changeSelect(getSelectIds());
      return [curJson, _curDom2];
    }
    if (!curShape.current) return;
    // 操作记录
    var curNum = (_curShape$current$att5 = curShape.current.attr('id')) === null || _curShape$current$att5 === void 0 ? void 0 : _curShape$current$att5.substring(6);
    curJson[curNum] = JSON.parse(JSON.stringify(allShapeJson.current[curNum]));
    if (record) {
      insertStack('del', curShape.current, curJson);
    }
    delShape();
    tempProps.current.changeSize(getMarkData());
    tempProps.current.changeSelect(getSelectIds());
    return [curJson];
  };

  // 选中顶点后可删除
  var delPoint = function delPoint() {
    var _curShape$current$att6, _allShapeJson$current16;
    if (!selectedPointId.current || !curShape.current) return;
    var curId = (_curShape$current$att6 = curShape.current.attr('id')) === null || _curShape$current$att6 === void 0 ? void 0 : _curShape$current$att6.substring(6),
      _ref2 = ((_allShapeJson$current16 = allShapeJson.current) === null || _allShapeJson$current16 === void 0 ? void 0 : _allShapeJson$current16[curId]) || {},
      points = _ref2.attrs.points,
      shape_type = _ref2.shape_type,
      curLen = points.length,
      curJson = {};

    // 操作记录

    curJson[curId] = JSON.parse(JSON.stringify(allShapeJson.current[curId]));
    if (curLen <= 2) {
      insertStack('del', curShape.current, curJson);
      delShape();
      delEditStatus();
      return;
    }
    insertStack('edit', curShape.current, curJson);
    d3.select("#path-point-group #path-point-".concat(curLen)).attr('display', 'none');
    d3.select("#path-point-group #path-point-".concat(selectedPointId.current)).attr('fill', shapeInfo['point'].fill);
    points.splice(selectedPointId.current - 1, 1);
    selectedPointId.current = null;
    var pointString = lineCreater.current(points);
    if (shape_type === 'polygon') {
      pointString += 'Z';
    }
    curShape.current.attr('d', pointString);
    updateLabel(curId, tempProps.current.showLabel);
    updatePoint();
  };

  // 根据数据修改图形大小、位置
  var editShapeFromJson = function editShapeFromJson(target, curJson) {
    var shape_type = curJson.shape_type,
      attrs = curJson.attrs;
    if (shape_type === 'rect' || shape_type === 'ellipse') {
      var curAttrs = Object.keys(attrs);
      curAttrs === null || curAttrs === void 0 ? void 0 : curAttrs.forEach(function (item) {
        target.attr(item, attrs[item]);
      });
    } else {
      var points = attrs.points,
        pointString = lineCreater.current(points);
      if (shape_type === 'polygon') {
        pointString += 'Z';
      }
      target.attr('d', pointString);
    }
  };

  // 执行撤销、重做
  var popStack = function popStack(cmd) {
    var _ref3 = cmd || [],
      _ref4 = _toArray(_ref3),
      type = _ref4[0],
      arg = _ref4.slice(1),
      _arg = _slicedToArray(arg, 3),
      target = _arg[0],
      curJson = _arg[1],
      domArr = _arg[2],
      recordData = [];
    if (type === 'add') {
      // 新增图形-》删除
      if (target instanceof Array) {
        selectShapeIds.current = target;
      } else {
        selectShapeIds.current = null;
        curShape.current = target;
      }
      recordData = delSelectShape(false);
      // return [target, ...recordData];
    } else if (type === 'del') {
      // 删除图形-》新增
      if (target instanceof Array) {
        target === null || target === void 0 ? void 0 : target.forEach(function (item) {
          var _svgRoot$current$sele3;
          drawNumArr.current.splice(item - 1, 0, +item);
          (_svgRoot$current$sele3 = svgRoot.current.select("#shape-label-".concat(item))) === null || _svgRoot$current$sele3 === void 0 ? void 0 : _svgRoot$current$sele3.attr('display', 'inline');
          svgRoot.current.select('#shape').insert(function () {
            return domArr[item].node();
          });
        });
      } else {
        var _Object$keys2, _svgRoot$current$sele4;
        var curNum = (_Object$keys2 = Object.keys(curJson)) === null || _Object$keys2 === void 0 ? void 0 : _Object$keys2[0];
        drawNumArr.current.splice(curNum - 1, 0, curNum);
        (_svgRoot$current$sele4 = svgRoot.current.select("#shape-label-".concat(curNum))) === null || _svgRoot$current$sele4 === void 0 ? void 0 : _svgRoot$current$sele4.attr('display', 'inline');
        svgRoot.current.select('#shape').insert(function () {
          return target.node();
        });
      }
      allShapeJson.current = Object.assign({}, allShapeJson.current, curJson);
      // return [target];
    } else if (type === 'edit') {
      // 位移、尺寸变化-》还原
      var recordJson = {};
      if (target instanceof Array) {
        target === null || target === void 0 ? void 0 : target.forEach(function (item) {
          recordJson[item] = JSON.parse(JSON.stringify(allShapeJson.current[item]));
          editShapeFromJson(domArr[item], curJson[item]);
        });
        recordData = [recordJson, domArr];
      } else {
        var _target$attr2, _Object$values;
        var _curNum = (_target$attr2 = target.attr('id')) === null || _target$attr2 === void 0 ? void 0 : _target$attr2.substring(6);
        recordJson[_curNum] = JSON.parse(JSON.stringify(allShapeJson.current[_curNum]));
        editShapeFromJson(target, (_Object$values = Object.values(curJson)) === null || _Object$values === void 0 ? void 0 : _Object$values[0]);
        recordData = [recordJson];
      }
      allShapeJson.current = Object.assign({}, allShapeJson.current, curJson);
      // return [target, ...recordData];
    }

    selectShapeIds.current = null;
    curShape.current = null;
    tempProps.current.changeSize(getMarkData());
    tempProps.current.changeSelect([]);
    delEditStatus();
    updateAllLabel();
    if (type === 'del') {
      return [target];
    }
    return [target].concat(_toConsumableArray(recordData));
  };

  // 撤销操作（相反操作）
  var undoSvg = function undoSvg() {
    if (!undoStack.current.length) return;
    var cmd = undoStack.current.pop(),
      _ref5 = cmd || [],
      _ref6 = _slicedToArray(_ref5, 1),
      type = _ref6[0],
      recordData = popStack(cmd);
    if (type === 'add') {
      // 新增图形-》删除
      redoStack.current.push(['del'].concat(_toConsumableArray(recordData)));
      return;
    } else if (type === 'del') {
      // 删除图形-》新增
      redoStack.current.push(['add'].concat(_toConsumableArray(recordData)));
    } else if (type === 'edit') {
      // 位移、尺寸变化-》还原
      redoStack.current.push([type].concat(_toConsumableArray(recordData)));
    }
  };
  // 重做操作
  var redoSvg = function redoSvg() {
    if (!redoStack.current.length) return;
    var cmd = redoStack.current.pop(),
      _ref7 = cmd || [],
      _ref8 = _slicedToArray(_ref7, 1),
      type = _ref8[0],
      recordData = popStack(cmd);
    if (type === 'add') {
      // let [curEl, curGroup, curNum] = arg,
      //   curPosi = this.getInsertNum(curGroup, curNum);
      // this.svgRoot.select(`#shape-${curGroup}`).insert(() => {
      //   return curEl.node();
      // }, `g:nth-child(${curPosi})`);
      // curEl.select(":last-child").attr('fill', this.shapeInfo.shapeCommon.fill);
      // this.calcCurNum(true, curGroup, curNum, curPosi - 1);

      undoStack.current.push(['del'].concat(_toConsumableArray(recordData)));
    } else if (type === 'del') {
      undoStack.current.push(['add'].concat(_toConsumableArray(recordData)));
      return;
    } else if (type === 'edit') {
      undoStack.current.push([type].concat(_toConsumableArray(recordData)));
    }
  };

  // 移动图形
  var moveShape = function moveShape(diff, e, targetP) {
    var _target$attr3;
    var target = targetP || curShape.current;
    if (!target) return;
    var showLabel = tempProps.current.showLabel,
      _diff = _slicedToArray(diff, 2),
      diffX = _diff[0],
      diffY = _diff[1],
      curShapeId = target === null || target === void 0 ? void 0 : (_target$attr3 = target.attr('id')) === null || _target$attr3 === void 0 ? void 0 : _target$attr3.substring(6),
      _allShapeJson$current17 = allShapeJson.current[curShapeId],
      startInfo = _allShapeJson$current17.attrs,
      shape_type = _allShapeJson$current17.shape_type,
      finalBox = {};
    if (shape_type === 'rect') {
      var x = startInfo.x,
        y = startInfo.y,
        width = startInfo.width,
        height = startInfo.height;
      x += diffX;
      y += diffY;
      target.attr('x', x).attr('y', y);
      finalBox = {
        x: x,
        y: y,
        width: width,
        height: height
      };
    } else if (shape_type === 'ellipse') {
      var cx = startInfo.cx,
        cy = startInfo.cy,
        rx = startInfo.rx,
        ry = startInfo.ry;
      cx += diffX;
      cy += diffY;
      target.attr('cx', cx).attr('cy', cy);
      finalBox = {
        cx: cx,
        cy: cy,
        rx: rx,
        ry: ry
      };
    } else {
      // path
      var points = startInfo.points,
        close = shape_type === 'polygon' ? true : false,
        len = (points === null || points === void 0 ? void 0 : points.length) || 0,
        newPoints = [];
      for (var i = 0; i < len; i++) {
        var _points$i4 = _slicedToArray(points[i], 2),
          _x = _points$i4[0],
          _y = _points$i4[1];
        _x += diffX;
        _y += diffY;
        newPoints[i] = [_x, _y];
      }
      var pointString = lineCreater.current(newPoints);
      target.attr('d', pointString + (close ? 'Z' : ''));
      finalBox = {
        points: newPoints
      };
      newPoints = null;
    }
    allShapeJson.current[curShapeId].attrs = finalBox;
    if (selectShapeIds.current) {
      updateSelectPath();
    } else if (shape_type === 'rect' || shape_type === 'ellipse') {
      updateGrip();
    } else {
      updatePoint(e);
    }
    updateLabel(curShapeId, showLabel);
    return;
  };
  var moveSelectShape = function moveSelectShape(diff, e) {
    if (selectShapeIds.current) {
      var _selectShapeIds$curre8;
      (_selectShapeIds$curre8 = selectShapeIds.current) === null || _selectShapeIds$curre8 === void 0 ? void 0 : _selectShapeIds$curre8.forEach(function (item) {
        var curShape = d3.select("#shape-".concat(item));
        moveShape(diff, e, curShape);
      });
      return;
    }
    moveShape(diff, e);
  };

  // 添加label文本
  var addLabel = function addLabel(curNum, curLabel, middle) {
    var curShape = svgRoot.current.select("#shape-label-".concat(curNum)),
      showLabel = tempProps.current.showLabel;
    if (curShape.node()) {
      curShape.text(curLabel).attr('display', 'inline');
      updateLabel(curNum, showLabel, true);
      return;
    }
    var curText = svgRoot.current.select('#shape-label-group').append('text').attr('id', "shape-label-".concat(curNum)).style('user-select', 'none').text(curLabel),
      textAttrs = Object.assign({}, shapeInfo['font']);
    if (middle) {
      textAttrs['text-anchor'] = 'middle';
    }
    Object.keys(textAttrs).forEach(function (key) {
      curText.attr(key, textAttrs[key]);
    });
    updateLabel(curNum, showLabel);
  };

  // 拖拽移动图形/整体、grip变更图形、point变更path
  var dragChange = function dragChange(type) {
    for (var _len2 = arguments.length, params = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      params[_key2 - 1] = arguments[_key2];
    }
    // console.log(8, type);
    var e = params[0],
      curTarget = params[1],
      posi = getD3Posi(e),
      diffX = posi[0] - startInfo.current.mx,
      diffY = posi[1] - startInfo.current.my;

    // 拖拽grip（8个方向拖拽点）
    if (type === 'moveGrip') {
      var _curShape$current7, _curShape$current7$at, _allShapeJson$current19;
      var curDir = '',
        curShapeId = (_curShape$current7 = curShape.current) === null || _curShape$current7 === void 0 ? void 0 : (_curShape$current7$at = _curShape$current7.attr('id')) === null || _curShape$current7$at === void 0 ? void 0 : _curShape$current7$at.substring(6),
        _allShapeJson$current18 = (_allShapeJson$current19 = allShapeJson.current) === null || _allShapeJson$current19 === void 0 ? void 0 : _allShapeJson$current19[curShapeId],
        shape_type = _allShapeJson$current18.shape_type;
      if (selectedGripId.current) {
        curDir = selectedGripId.current.substring(12);
      } else {
        curDir = curTarget.attr('id').substring(12);
      }
      var finalBox = dragGrip(shape_type, isShiftKey.current, curDir, diffX, diffY, startInfo.current);
      if (shape_type === 'polygon' || shape_type === 'line') {
        var pointString = lineCreater.current(finalBox.points);
        curShape.current.attr('d', pointString + (startInfo.current.close ? 'Z' : ''));
      } else {
        Object.keys(finalBox).forEach(function (key) {
          curShape.current.attr(key, finalBox[key]);
        });
      }
      allShapeJson.current[curShapeId].attrs = finalBox;
      updateGrip();
      updateLabel(curShapeId, tempProps.current.showLabel);
      return;
    }

    // 拖拽图形
    if (type === 'moveShape') {
      moveSelectShape([e.dx, e.dy], e);
      return;
    }

    // 拖拽整体
    if (type === 'moveWhole') {
      var _curTransform$current8, _curTransform$current9;
      curTransform.current = curTransform.current.translate(diffX, diffY);
      d3.zoom().transform(svgRoot.current, curTransform.current);
      svgRoot.current.selectAll('g.layer').attr('transform', curTransform.current);
      svgRoot.current.selectAll('g#shape-related-group').attr('transform', "translate(".concat((_curTransform$current8 = curTransform.current) === null || _curTransform$current8 === void 0 ? void 0 : _curTransform$current8.x, ",").concat((_curTransform$current9 = curTransform.current) === null || _curTransform$current9 === void 0 ? void 0 : _curTransform$current9.y, ")"));
      updateGrid();
    }

    // 拖动path的控制点
    if (type === 'movePoint') {
      var _curShape$current8, _curShape$current8$at;
      var curIndex = '',
        _curShapeId2 = (_curShape$current8 = curShape.current) === null || _curShape$current8 === void 0 ? void 0 : (_curShape$current8$at = _curShape$current8.attr('id')) === null || _curShape$current8$at === void 0 ? void 0 : _curShape$current8$at.substring(6),
        _allShapeJson$current20 = allShapeJson.current[_curShapeId2],
        points = _allShapeJson$current20.attrs.points,
        _shape_type = _allShapeJson$current20.shape_type,
        close = _shape_type === 'polygon' ? true : false;
      if (selectedPointId.current) {
        curIndex = selectedPointId.current;
      } else {
        curIndex = curTarget.attr('id').substring(11);
      }
      points[curIndex - 1] = posi;
      allShapeJson.current[_curShapeId2].attrs = {
        points: points
      };
      var _pointString = lineCreater.current(points);
      curShape.current.attr('d', _pointString + (close ? 'Z' : ''));
      updatePoint(e);
      updateLabel(_curShapeId2, tempProps.current.showLabel);
    }
  };

  // 进入path的顶点范围，判断能否进行闭合、移动
  var changePointStatus = function changePointStatus(event) {
    var target = (event === null || event === void 0 ? void 0 : event.target) || (event === null || event === void 0 ? void 0 : event.srcElement),
      curId = d3.select(target).attr('id'),
      points = curShapePoints.current || [],
      curLen = points.length;
    d3.selectAll('#path-point-group circle').attr('r', shapeInfo['point'].r);
    if (event.type === 'touchstart' || event.type === 'mouseenter') {
      if (isPathing.current) {
        if (curId !== 'path-point-1' || curLen < 3) return;
      }
      d3.select("#".concat(curId)).attr('r', 6);
      d3.select(target).style('cursor', 'pointer');
    } else {
      d3.select(target).style('cursor', null);
    }
  };
  // 添加多边形的顶点展示
  var addPoint = function addPoint(curId, curIndex) {
    var show = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    var pointCont = d3.select('#path-point-group'),
      oldPoints = pointCont.selectAll('circle'),
      oldLen = oldPoints.size(),
      // 此前path顶点最多的数量
      pointAttrs = shapeInfo['point'];
    if (!oldLen || oldLen <= curIndex) {
      var firstPoint = pointCont.append('circle').attr('id', curId).call(initDrag('point', dragChange));
      firstPoint.on('touchstart touchend mouseenter mouseleave', changePointStatus);
      Object.keys(pointAttrs).forEach(function (key) {
        firstPoint.attr(key, pointAttrs[key]);
      });
      firstPoint.attr('display', show ? 'inline' : 'none');
      return firstPoint;
    }
    return d3.select('#' + curId).attr('display', show ? 'inline' : 'none');
  };
  // 多边形在单击位置插入顶点
  var insertPoint = function insertPoint(event) {
    var _allShapeJson$current22;
    var posi = getD3Posi(event),
      curId = maskShapeId.current.substring(6),
      _allShapeJson$current21 = (_allShapeJson$current22 = allShapeJson.current) === null || _allShapeJson$current22 === void 0 ? void 0 : _allShapeJson$current22[curId],
      points = _allShapeJson$current21.attrs.points,
      shape_type = _allShapeJson$current21.shape_type,
      curLen = points.length,
      nearestIndex = -1,
      nearestDistance = Infinity,
      curJson = {};

    // 操作记录

    curJson[curId] = JSON.parse(JSON.stringify(allShapeJson.current[curId]));
    insertStack('edit', curShape.current, curJson);
    for (var i = 0; i < curLen; i++) {
      var j = (i + 1) % curLen,
        // 下一个坐标
        p1 = points[i],
        p2 = points[j],
        distance = pointToLineDistance(posi, p1, p2);
      if (distance < nearestDistance) {
        nearestIndex = j;
        nearestDistance = distance;
      }
    }
    points.splice(nearestIndex, 0, posi);
    var pointString = lineCreater.current(points);
    if (shape_type === 'polygon') {
      pointString += 'Z';
    }
    curShape.current.attr('d', pointString);
    var curPointId = "path-point-".concat(curLen + 1);
    addPoint(curPointId, curLen);
    updatePoint(event);
  };

  // 完成path绘制（close是否闭合）
  var endClickDraw = function endClickDraw(close) {
    var _d3$select, _curShape$current$att7;
    (_d3$select = d3.select('#path-stretch-line')) === null || _d3$select === void 0 ? void 0 : _d3$select.attr('display', 'none');
    var curPathString = curShape.current.attr('d');
    if (close) {
      curShape.current.attr('d', curPathString + 'Z');
    }
    var curNum = (_curShape$current$att7 = curShape.current.attr('id')) === null || _curShape$current$att7 === void 0 ? void 0 : _curShape$current$att7.substring('6'),
      _tempProps$current3 = tempProps.current,
      curLabel = _tempProps$current3.curLabel,
      colorBindLabel = _tempProps$current3.colorBindLabel;
    if (colorBindLabel && curLabel && !labelColorJson.current[curLabel]) {
      labelColorJson.current[curLabel] = shapeInfo.shapeCommon.stroke;
      tempProps.current.changeBindColor(labelColorJson.current);
    }
    curLabel = curLabel || curNum;
    allShapeJson.current[curNum] = {
      shape_type: close ? 'polygon' : 'line',
      label: curLabel,
      attrs: {
        points: curShapePoints.current
      }
    };
    // isPathing.current = false;
    curShapePoints.current = null;
    // console.log(allShapeJson.current);

    editPathId.current = "shape-".concat(curNum);
    maskShapeId.current = editPathId.current;
    d3.select('#' + maskShapeId.current).attr('fill', setMaskColor(curShape.current.attr('stroke')));
    tempProps.current.changeSize(getMarkData());
    tempProps.current.changeSelect(getSelectIds());
    addLabel(curNum, curLabel, true);
    svgRoot.current.select('#path-add-point').attr('display', 'inline');
    updateAddPointPath(curNum);
    insertStack('add', curShape.current);
    tempProps.current.endDraw({
      id: curNum,
      label: curLabel
    });
  };
  // 开始单击绘制（多边形、线段）
  var clickDraw = function clickDraw(e, drawTool, eType, target) {
    var _curTransform$current10;
    var sourceE = (e === null || e === void 0 ? void 0 : e.sourceEvent) || e,
      pathingPoints = curShapePoints.current || [],
      curLen = pathingPoints === null || pathingPoints === void 0 ? void 0 : pathingPoints.length; // 正在绘制的线

    if (sourceE.button === 2) {
      // 按下鼠标右键直接完成path
      if (!curLen) return;
      if (curLen < 2) {
        delShape();
      } else {
        endClickDraw();
      }
      return;
    }

    // 闭合，完成polygon
    if (eType === 'point' && target.attr('id') === 'path-point-1' && curLen >= 3) {
      endClickDraw(true);
      return;
    }
    var pointCont = d3.select('#path-point-group'),
      oldPoints = pointCont.selectAll('circle'),
      oldLen = oldPoints.size(),
      _getD3Posi5 = getD3Posi(e),
      _getD3Posi6 = _slicedToArray(_getD3Posi5, 2),
      x = _getD3Posi6[0],
      y = _getD3Posi6[1],
      lineAttrs = shapeInfo['line'];

    // 辅助线

    // 创建图形、修改图形
    if (!curLen) {
      var _d3$select2;
      // 初始创建
      isPathing.current = true;
      delEditStatus();
      (_d3$select2 = d3.select('#path-stretch-line')) === null || _d3$select2 === void 0 ? void 0 : _d3$select2.attr('display', 'inline');
      // 设置颜色
      setDrawColor();
      var shapeAttrs = Object.assign({}, shapeInfo.shapeCommon, shapeInfo[drawTool]);
      curShape.current = svgCont.current.select('#shape').append(drawTool).call(initDrag('shape', dragChange));
      var curNum = getCurNum(); // 当前默认编号
      curShape.current.attr('id', "shape-".concat(curNum));
      Object.keys(shapeAttrs).forEach(function (key) {
        curShape.current.attr(key, shapeAttrs[key]);
      });

      // 记录坐标
      curShapePoints.current = [[x, y]];
    } else {
      // 修改
      curShapePoints.current.push([x, y]);
      var pointString = lineCreater.current(curShapePoints.current);
      curShape.current.attr('d', pointString);
    }

    // 第一次绘制path，添加待确定的点跟随鼠标的连线
    if (!oldLen) {
      pointCont.append('path').attr('id', 'path-stretch-line').style('pointer-events', 'none');
      Object.keys(lineAttrs).forEach(function (key) {
        d3.select('#path-stretch-line').attr(key, lineAttrs[key]);
      });
    }

    // 添加顶点、修改顶点
    var curId = "path-point-".concat(curLen + 1);
    addPoint(curId, curLen);
    var curScale = (curTransform === null || curTransform === void 0 ? void 0 : (_curTransform$current10 = curTransform.current) === null || _curTransform$current10 === void 0 ? void 0 : _curTransform$current10.k) || 1,
      cx = x * curScale,
      cy = y * curScale;
    d3.select('#' + curId).attr('cx', cx).attr('cy', cy);
    // 调整射线
    updateStretchLine(e);
  };

  // 鼠标移动事件
  var mouseMove = function mouseMove(event) {
    setCursor(event);
    updateCrosshair(event);
    updateStretchLine(event);
  };

  // 单击画布
  var clickCanvas = function clickCanvas(type, event, target) {
    var drawTool = tempProps.current.drawTool;
    if (!drawTool || event.defaultPrevented) return;

    // console.log('');
    // console.log(1, type, '----click select');

    // 单击控制点，切换控制点选中状态
    if (type === 'grip') {
      var curId = target.attr('id');
      if (selectedGripId.current) {
        // 将旧的选中还原
        d3.select('#' + selectedGripId.current).attr('fill', shapeInfo['grip'].fill);
      }
      if (selectedGripId.current === curId) {
        selectedGripId.current = null;
      } else {
        selectedGripId.current = curId;
        target.attr('fill', '#ff0'); // 选中的颜色

        // 记录当前数据
        recordStartInfo(event);
      }
      return;
    }
    // 有控制点被选中，单击其他任何地方都是切换尺寸
    if (selectedGripId.current) {
      // 记录移动操作前的数据
      var recordData = recordBeforeMove();
      insertStack.apply(void 0, ['edit'].concat(_toConsumableArray(recordData)));
      recordData = null;
      dragChange('moveGrip', event, target);
      tempProps.current.changeSize(getMarkData());
      return;
    }

    // 单击顶点选中，切换控制点选中状态
    if (type === 'point') {
      var _curId2 = target.attr('id').substring(11);
      if (selectedPointId.current) {
        // 将旧的选中还原
        d3.select('#path-point-' + selectedPointId.current).attr('fill', shapeInfo['point'].fill);
      }
      if (selectedPointId.current === _curId2) {
        selectedPointId.current = null;
      } else {
        selectedPointId.current = _curId2;
        target.attr('fill', '#ff0'); // 选中的颜色

        // 记录当前数据
        recordStartInfo(event);
      }
      return;
    }
    // 有顶点被选中，单击其他任何地方都是切换尺寸
    if (selectedPointId.current) {
      // 记录移动操作前的数据
      var _recordData = recordBeforeMove();
      insertStack.apply(void 0, ['edit'].concat(_toConsumableArray(_recordData)));
      _recordData = null;
      dragChange('movePoint', event, target);
      tempProps.current.changeSize(getMarkData());
      return;
    }

    // 插入顶点
    if (type === 'insertPoint') {
      insertPoint(event);
      return;
    }

    // 单击图形切换选中状态，选中编辑
    if (type === 'shape') {
      var _event$sourceEvent;
      selectShape(target, isShiftKey.current || (event === null || event === void 0 ? void 0 : (_event$sourceEvent = event.sourceEvent) === null || _event$sourceEvent === void 0 ? void 0 : _event$sourceEvent.shiftKey));
      return;
    }

    // 单击空白区域（去掉图形编辑状态）
    if (type === 'whole') {
      delEditStatus();
      curShape.current = null;
      selectShapeIds.current = null;
      tempProps.current.changeSelect([]);
      return;
    }
  };

  // 结束拖拽绘制图形
  var endMoveDraw = function endMoveDraw() {
    // console.log('stop', e);
    if (!curShape.current || !isDrawing.current) return false;
    isDrawing.current = false;
    delEditStatus();
    var ifMini = delShapeIfMini();
    if (ifMini) return false;
    var _tempProps$current4 = tempProps.current,
      drawTool = _tempProps$current4.drawTool,
      curLabel = _tempProps$current4.curLabel,
      colorBindLabel = _tempProps$current4.colorBindLabel,
      curNum = getCurNum(); // 当前默认编号
    if (colorBindLabel && curLabel && !labelColorJson.current[curLabel]) {
      labelColorJson.current[curLabel] = shapeInfo.shapeCommon.stroke;
      tempProps.current.changeBindColor(labelColorJson.current);
    }
    curLabel = curLabel || curNum;
    curShape.current.attr('id', "shape-".concat(curNum));
    allShapeJson.current[curNum] = {
      shape_type: drawTool,
      label: curLabel,
      attrs: curShapePoints.current
    };
    curShapePoints.current = null;
    updateGrip();
    tempProps.current.changeSize(getMarkData());
    addLabel(curNum, curLabel, drawTool === 'ellipse');
    insertStack('add', curShape.current);
    tempProps.current.endDraw({
      id: curNum,
      label: curLabel
    });
  };

  // 开始绘制框选图形
  var startSelect = function startSelect(e) {
    var posi = getD3Posi(e);
    isDrawing.current = true;
    curShape.current = null;
    delEditStatus();
    var _posi = _slicedToArray(posi, 2);
    startInfo.current.x = _posi[0];
    startInfo.current.y = _posi[1];
    d3.select('#shape-selector').attr('display', 'inline').attr('x', posi[0]).attr('y', posi[1]).attr('width', 0).attr('height', 0);
    return false;
  };
  // 判断元素是否进入框选区域
  var selectNodesInRange = function selectNodesInRange() {
    var _curTransform$current11;
    var selectBox = d3.select('#shape-selector').node().getBoundingClientRect(),
      shapeIds = Object.keys(allShapeJson.current),
      selectIds = [],
      curScale = (curTransform === null || curTransform === void 0 ? void 0 : (_curTransform$current11 = curTransform.current) === null || _curTransform$current11 === void 0 ? void 0 : _curTransform$current11.k) || 1;
    shapeIds === null || shapeIds === void 0 ? void 0 : shapeIds.forEach(function (item) {
      var curShape = d3.select("#shape-".concat(item)),
        curLen = selectIds.length,
        curShapePath = d3.select("#shape-path-group #shape-path-".concat(curLen)),
        curShapeInfo = curShape.node().getBoundingClientRect(),
        shapeInRange = curShapeInfo.bottom > selectBox.top && curShapeInfo.top < selectBox.bottom && curShapeInfo.left < selectBox.right && curShapeInfo.right > selectBox.left;
      if (shapeInRange) {
        // 进入范围边框的变色
        selectIds.push(item);
        var _curShape$node$getBBo2 = curShape.node().getBBox(),
          x = _curShape$node$getBBo2.x,
          y = _curShape$node$getBBo2.y,
          width = _curShape$node$getBBo2.width,
          height = _curShape$node$getBBo2.height;
        if (!curShapePath.node()) {
          curShapePath = addSelectPath(curLen);
        } else {
          curShapePath.attr('display', 'inline');
        }
        x = x * curScale || 0;
        y = y * curScale || 0;
        width = width * curScale || 0;
        height = height * curScale || 0;
        var points = [[x - 2, y - 2], [x + width + 2, y - 2], [x + width + 2, y + height + 2], [x - 2, y + height + 2]],
          pointString = lineCreater.current(points);
        curShapePath.attr('d', pointString + 'Z');
      } else if (curShapePath.node()) {
        curShapePath.attr('display', 'none');
      }
    });
    selectShapeIds.current = (selectIds === null || selectIds === void 0 ? void 0 : selectIds.length) && selectIds;
  };
  // 移动绘制框选图形
  var moveSelect = function moveSelect(e) {
    var _curTransform$current12;
    if (!isDrawing.current) return false;

    // svgRoot.current.attr("shape-rendering", "crispEdges");

    var posi = getD3Posi(e),
      _startInfo$current = startInfo.current,
      x = _startInfo$current.x,
      y = _startInfo$current.y,
      moveX = posi[0] - x,
      moveY = posi[1] - y,
      curScale = (curTransform === null || curTransform === void 0 ? void 0 : (_curTransform$current12 = curTransform.current) === null || _curTransform$current12 === void 0 ? void 0 : _curTransform$current12.k) || 1;
    var width = Math.abs(moveX),
      height = Math.abs(moveY);
    if (moveX < 0) {
      x = posi[0];
    }
    if (moveY < 0) {
      y = posi[1];
    }
    x = x * curScale || 0;
    y = y * curScale || 0;
    width = width * curScale || 0;
    height = height * curScale || 0;
    d3.select('#shape-related-group #shape-selector').attr('x', x).attr('y', y).attr('width', width).attr('height', height);
    selectNodesInRange();
    return false;
  };
  // 结束绘制框选图形
  var endSelect = function endSelect() {
    if (!isDrawing.current) return false;
    isDrawing.current = false;
    // svgRoot.current.attr("shape-rendering", null);
    d3.selectAll('#shape-related-group #shape-selector').attr('display', 'none');
  };

  // 根据当前工具、鼠标位置、图形状态获取当前的操作
  var getCurOpera = function getCurOpera(eType, drawTool, target) {
    var _target$attr4;
    if (eType === 'grip') {
      // 移动控制点
      return 'moveGrip';
    }
    if (eType === 'point' && !isPathing.current) {
      // 单击顶点
      return 'movePoint';
    }
    if (eType === 'insertPoint') return eType;
    if (drawTool === 'drag' || isCtrlKey.current && !isShiftKey.current && !isAltKey.current) return 'moveWhole'; // 按住ctrl快捷拖动整体
    if (eType === 'shape' && !isCtrlKey.current && (drawTool === 'move' || maskShapeId.current === target.attr('id') || selectShapeIds.current && selectShapeIds.current.includes((_target$attr4 = target.attr('id')) === null || _target$attr4 === void 0 ? void 0 : _target$attr4.substring(6)))) {
      // 移动图形
      return 'moveShape';
    }
    if (eType === 'whole' && drawTool === 'move' && !isCtrlKey.current && !isAltKey.current) {
      // 框选图形
      return 'selectShape';
    }
    if (drawTool === 'rect' || drawTool === 'ellipse') {
      // 拖动绘制图形
      return 'shape';
    }
    return drawTool; // path、rect、ellipse、move、drag
  };
  // 初始化拖拽事件(grip、shape、whole、point、path)
  var initDrag = function initDrag(type, cb) {
    var drawTool = '',
      curOpera = '',
      curTarget = null,
      // 当前事件所在元素
      isSelect = false,
      recordData = null; // 记录移动操作前的数据

    return d3.drag().filter(function (event) {
      getFocus();
      drawTool = tempProps.current.drawTool;
      curTarget = d3.select(this);
      curOpera = getCurOpera(type, drawTool, curTarget);
      if (!drawTool) return false;
      return !event.button || event.button === 2 && isPathing.current && curOpera === 'path';
    }).on('start', function (event) {
      var _event$sourceEvent2, _event$sourceEvent3;
      event === null || event === void 0 ? void 0 : (_event$sourceEvent2 = event.sourceEvent) === null || _event$sourceEvent2 === void 0 ? void 0 : _event$sourceEvent2.stopPropagation();
      event === null || event === void 0 ? void 0 : (_event$sourceEvent3 = event.sourceEvent) === null || _event$sourceEvent3 === void 0 ? void 0 : _event$sourceEvent3.preventDefault();
      isMoving.current = false;
      isSelect = false;
      // console.log("");
      // console.log(1, 'dragstart', type, curOpera);
      // console.log(event);

      if (selectedGripId.current || selectedPointId.current) return;
      if (curOpera === 'path') {
        // 绘制多边形（单击绘制，所以直接执行，去掉选中图形功能）
        selectShapeIds.current = null;
        clickDraw(event, drawTool, type, curTarget);
        return;
      }

      // 拖动图形（初始）
      if (curOpera === 'moveShape') {
        var _curTarget$attr, _event$sourceEvent5;
        // console.log(isSelect);
        var curId = (_curTarget$attr = curTarget.attr('id')) === null || _curTarget$attr === void 0 ? void 0 : _curTarget$attr.substring(6);
        if (!selectShapeIds.current && maskShapeId.current !== curTarget.attr('id') || selectShapeIds.current && !selectShapeIds.current.includes(curId)) {
          var _event$sourceEvent4;
          // 非多选，且当前图形没有选中，或shift按下，多选但不包含该图形时，执行选中操作
          // console.log('选中');
          isSelect = true;
          selectShape(curTarget, isShiftKey.current || (event === null || event === void 0 ? void 0 : (_event$sourceEvent4 = event.sourceEvent) === null || _event$sourceEvent4 === void 0 ? void 0 : _event$sourceEvent4.shiftKey));
        }
        if (isAltKey.current || event !== null && event !== void 0 && (_event$sourceEvent5 = event.sourceEvent) !== null && _event$sourceEvent5 !== void 0 && _event$sourceEvent5.altKey) {
          // 复制图形（keydown连续按下有延迟）
          copySelectShape();
        }
      } else if (curOpera.indexOf('move') >= 0 && curOpera.length > 4) {
        // 移动记录初始数据（整体、单击拖拽点）
        if (curOpera === 'moveWhole') {
          curTransform.current = curTransform.current || d3.zoomIdentity;
        } else if (curOpera === 'moveGrip') {
          recordStartInfo(event);
        }
        // 鼠标位置
        var _getD3Posi7 = getD3Posi(event);
        var _getD3Posi8 = _slicedToArray(_getD3Posi7, 2);
        startInfo.current.mx = _getD3Posi8[0];
        startInfo.current.my = _getD3Posi8[1];
      }
      // 记录移动操作前的数据
      if (curOpera.indexOf('move') >= 0 && curOpera.length > 4 && curOpera !== 'moveWhole') {
        recordData = recordBeforeMove();
      }
    }).on('drag', function (event) {
      var _event$sourceEvent6, _event$sourceEvent7;
      // console.log('drag', event.dx, event.dy);
      event === null || event === void 0 ? void 0 : (_event$sourceEvent6 = event.sourceEvent) === null || _event$sourceEvent6 === void 0 ? void 0 : _event$sourceEvent6.stopPropagation();
      event === null || event === void 0 ? void 0 : (_event$sourceEvent7 = event.sourceEvent) === null || _event$sourceEvent7 === void 0 ? void 0 : _event$sourceEvent7.preventDefault();
      if (event !== null && event !== void 0 && event.sourceEvent) {
        mouseMove(event.sourceEvent); // 手动触发，因为drag导致mouseMove没有触发
      }

      if (selectedGripId.current || selectedPointId.current || curOpera === 'path' || curOpera === 'insertPoint') return; // 选中拖拽点\顶点、绘制path时无需移动
      if (event.dx === 0 && event.dy === 0) return; // 兼容向日葵远程时，单击被识别成移动，无法选中图形

      isMoving.current = true;

      // 移动
      if (curOpera.indexOf('move') >= 0) {
        cb(curOpera, event, curTarget);
        return;
      }

      // 绘制
      if (curOpera === 'shape') {
        if (isDrawing.current) {
          moveDraw(event, drawTool);
        } else {
          // 不放在start里面是因为start一定会执行，没拖动也执行
          selectShapeIds.current = null;
          startMoveDraw(event, drawTool);
        }
        return;
      }

      // 框选
      if (curOpera === 'selectShape') {
        if (isDrawing.current) {
          moveSelect(event);
        } else {
          startSelect(event);
        }
      }
    }).on('end', function (event) {
      var _event$sourceEvent8, _event$sourceEvent9;
      event === null || event === void 0 ? void 0 : (_event$sourceEvent8 = event.sourceEvent) === null || _event$sourceEvent8 === void 0 ? void 0 : _event$sourceEvent8.stopPropagation();
      event === null || event === void 0 ? void 0 : (_event$sourceEvent9 = event.sourceEvent) === null || _event$sourceEvent9 === void 0 ? void 0 : _event$sourceEvent9.preventDefault();
      // console.log('dragend', event);
      if (isMoving.current) {
        // 绘制
        if (curOpera === 'shape') {
          endMoveDraw();
          tempProps.current.changeSelect(getSelectIds());
          return;
        } else if (curOpera === 'selectShape') {
          endSelect();
          tempProps.current.changeSelect(getSelectIds());
          return;
        } else if (curOpera !== 'moveWhole' && curOpera.indexOf('move') >= 0 && curOpera.length > 4) {
          tempProps.current.changeSize(getMarkData());
          if (recordData) {
            insertStack.apply(void 0, ['edit'].concat(_toConsumableArray(recordData)));
          }
          recordData = null;
        }
      } else if (isPathing.current && curOpera === 'path') {
        if (!curShapePoints.current) {
          // 路径绘制完tool变更为move
          isPathing.current = false;
          // tempProps.current.changeTool('move');
        }
      } else if (!isSelect) {
        // 未拖动执行单击
        clickCanvas(type, event, curTarget);
        return;
      }
    });
  };

  // 初始化缩放、拖动整体事件，及ctrl快捷操作（pc滚轮放大，触摸屏双指放大、拖动）
  var initZoom = function initZoom(cb) {
    var _tempProps$current5;
    var _ref9 = '',
      drawTool = _ref9.drawTool;
    return d3.zoom().scaleExtent((_tempProps$current5 = tempProps.current) === null || _tempProps$current5 === void 0 ? void 0 : _tempProps$current5.scaleExtent).filter(function (event) {
      return (!event.ctrlKey || event.type === 'wheel') && !event.button;
    }).on('start', function (event) {
      var _event$sourceEvent10, _event$sourceEvent11;
      // console.log("");
      // console.log(1, 'zoomstart');
      drawTool = tempProps.current.drawTool;
      getFocus();
      event === null || event === void 0 ? void 0 : (_event$sourceEvent10 = event.sourceEvent) === null || _event$sourceEvent10 === void 0 ? void 0 : _event$sourceEvent10.stopPropagation();
      event === null || event === void 0 ? void 0 : (_event$sourceEvent11 = event.sourceEvent) === null || _event$sourceEvent11 === void 0 ? void 0 : _event$sourceEvent11.preventDefault();
      if (!drawTool) return;
    }).on('zoom', function (event) {
      var _event$sourceEvent12, _event$sourceEvent13;
      // console.log('zoom');
      // console.log(event);
      event === null || event === void 0 ? void 0 : (_event$sourceEvent12 = event.sourceEvent) === null || _event$sourceEvent12 === void 0 ? void 0 : _event$sourceEvent12.stopPropagation();
      event === null || event === void 0 ? void 0 : (_event$sourceEvent13 = event.sourceEvent) === null || _event$sourceEvent13 === void 0 ? void 0 : _event$sourceEvent13.preventDefault();
      if (!drawTool) return;
      if (cb) {
        cb(event);
      }
    }).on('end', function (event) {
      var _event$sourceEvent14, _event$sourceEvent15;
      event === null || event === void 0 ? void 0 : (_event$sourceEvent14 = event.sourceEvent) === null || _event$sourceEvent14 === void 0 ? void 0 : _event$sourceEvent14.stopPropagation();
      event === null || event === void 0 ? void 0 : (_event$sourceEvent15 = event.sourceEvent) === null || _event$sourceEvent15 === void 0 ? void 0 : _event$sourceEvent15.preventDefault();
      if (!drawTool) return;
    });
  };
  // 拖动、放大整体
  var zoomWhole = function zoomWhole(event) {
    var _selectShapeIds$curre9;
    var isZoom = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    if (isZoom) {
      curTransform.current = event.transform;
    }
    svgRoot.current.selectAll('g.layer').attr('transform', curTransform.current);
    svgRoot.current.selectAll('g#shape-related-group').attr('transform', "translate(".concat(curTransform.current.x, ", ").concat(curTransform.current.y, ")"));
    if ((_selectShapeIds$curre9 = selectShapeIds.current) !== null && _selectShapeIds$curre9 !== void 0 && _selectShapeIds$curre9.length) {
      updateSelectPath();
    } else {
      updateGrip();
      if (isZoom) {
        updatePoint(event);
      } else {
        updatePoint();
      }
    }
    updateAllLabel();
    // 网格
    updateGrid();
    curScale.current = curTransform.current.k;
    tempProps.current.changeScale(curScale.current);
  };

  // 复制图形
  var copyShape = function copyShape(targetP) {
    var _target$attr5, _allShapeJson$current24;
    var multiShape = true,
      target = targetP;
    if (!target) {
      var _svgRoot$current$sele5;
      target = curShape.current;
      target.attr('fill', shapeInfo.shapeCommon.fill);
      multiShape = false;
      (_svgRoot$current$sele5 = svgRoot.current.select('#path-add-point')) === null || _svgRoot$current$sele5 === void 0 ? void 0 : _svgRoot$current$sele5.attr('display', 'inline');
    }
    var curNum = (_target$attr5 = target.attr('id')) === null || _target$attr5 === void 0 ? void 0 : _target$attr5.substring(6),
      _allShapeJson$current23 = allShapeJson.current[curNum],
      curLabel = _allShapeJson$current23.label,
      shape_type = _allShapeJson$current23.shape_type,
      newShape = target.clone(),
      newNum = getCurNum();
    newShape = svgCont.current.select('#shape').append(function () {
      return newShape.node();
    }).attr('id', "shape-".concat(newNum)).call(initDrag('shape', dragChange));
    allShapeJson.current[newNum] = JSON.parse(JSON.stringify((_allShapeJson$current24 = allShapeJson.current) === null || _allShapeJson$current24 === void 0 ? void 0 : _allShapeJson$current24[curNum]));
    addLabel(newNum, curLabel, shape_type !== 'rect');
    if (multiShape) {
      return '' + newNum;
    }
    newShape.attr('fill', setMaskColor(newShape.attr('stroke')));
    maskShapeId.current = "shape-".concat(newNum);
    return newShape;
  };
  var copySelectShape = function copySelectShape() {
    if (selectShapeIds.current) {
      var _selectShapeIds$curre10;
      var newIds = [];
      (_selectShapeIds$curre10 = selectShapeIds.current) === null || _selectShapeIds$curre10 === void 0 ? void 0 : _selectShapeIds$curre10.forEach(function (item) {
        var curShape = d3.select("#shape-".concat(item));
        newIds.push(copyShape(curShape));
      });
      selectShapeIds.current = newIds;
      tempProps.current.changeSelect(getSelectIds());
      insertStack('add', selectShapeIds.current);
      return;
    }
    if (!curShape.current) return;
    curShape.current = copyShape();
    tempProps.current.changeSelect(getSelectIds());
    insertStack('add', curShape.current);
  };

  // 开始拖拽绘制图形（矩形、椭圆形）
  var startMoveDraw = function startMoveDraw(e, drawTool) {
    // console.log("");
    // console.log('start', e.subject);
    // console.log('start', e);
    var posi = getD3Posi(e);
    isDrawing.current = true;
    curShape.current = svgCont.current.select('#shape').append(drawTool).call(initDrag('shape', dragChange));

    // 设置颜色
    setDrawColor();
    var shapeAttrs = Object.assign({}, shapeInfo.shapeCommon, shapeInfo[drawTool]),
      attrX = 'x',
      attrY = 'y';
    if (drawTool === 'ellipse') {
      attrX = 'cx';
      attrY = 'cy';
    }
    var _posi2 = _slicedToArray(posi, 2);
    startInfo.current.x = _posi2[0];
    startInfo.current.y = _posi2[1];
    var _posi3 = _slicedToArray(posi, 2);
    shapeAttrs[attrX] = _posi3[0];
    shapeAttrs[attrY] = _posi3[1];
    Object.keys(shapeAttrs).forEach(function (key) {
      curShape.current.attr(key, shapeAttrs[key]);
    });
    return false;
  };
  // 拖拽绘制图形（矩形【shift正方形】、椭圆形【shift圆形】）
  var moveDraw = function moveDraw(e, drawTool) {
    // console.log("");
    // console.log('move', e);
    if (!curShape.current || !isDrawing.current) return false;
    var posi = getD3Posi(e),
      _startInfo$current2 = startInfo.current,
      x = _startInfo$current2.x,
      y = _startInfo$current2.y,
      moveX = posi[0] - x,
      moveY = posi[1] - y;

    // 矩形
    if (drawTool === 'rect') {
      var width = Math.abs(moveX),
        height = Math.abs(moveY);
      // 修改坐标
      if (moveX < 0) {
        if (isShiftKey.current && width < height) {
          x = x - height;
        } else {
          x = posi[0];
        }
      }
      if (moveY < 0) {
        if (isShiftKey.current && width > height) {
          y = y - width;
        } else {
          y = posi[1];
        }
      }
      // 修改尺寸（选大的边）
      if (isShiftKey.current) {
        if (width > height) {
          height = width;
        } else {
          width = height;
        }
      }
      curShapePoints.current = {
        x: x,
        y: y,
        width: width,
        height: height
      };
      curShape.current.attr('x', x).attr('y', y).attr('width', width).attr('height', height);
      return false;
    }
    // 椭圆形
    if (drawTool === 'ellipse') {
      var midMoveX = moveX / 2 || 0,
        midMoveY = moveY / 2 || 0,
        rx = Math.abs(midMoveX),
        ry = Math.abs(midMoveY);
      if (isShiftKey.current) {
        // 选大的边
        if (rx > ry) {
          midMoveY = midMoveY > 0 ? rx : -rx;
          ry = rx;
        } else {
          midMoveX = midMoveX > 0 ? ry : -ry;
          rx = ry;
        }
      }
      x = x + midMoveX;
      y = y + midMoveY;
      curShapePoints.current = {
        cx: x,
        cy: y,
        rx: rx,
        ry: ry
      };
      curShape.current.attr('cx', x).attr('cy', y).attr('rx', rx).attr('ry', ry);
    }
    return false;
  };

  // 切换tool
  var switchDrawTool = function switchDrawTool(drawTool) {
    // console.log('switchDrawTool', tempProps.current);
    // console.log('switchDrawTool', drawTool);
    if (drawTool !== 'path' && isPathing.current) {
      delShape();
      isPathing.current = false;
      return;
    }
  };

  // 画布外部监听mouseup
  var outMouseup = function outMouseup() {
    if (isDrawing.current) {
      // 绘制
      endMoveDraw();
      return;
    }
  };

  // 监听按键
  var keydown = function keydown(event) {
    isCtrlKey.current = event.ctrlKey;
    isAltKey.current = event.altKey;
    isShiftKey.current = event.shiftKey;
    var curKey = event.keyCode || event.which || event.charCode;
    if (isPathing.current) {
      if (curKey === 27) {
        // esc，删除正在绘制的path
        delShape();
      }
      return;
    }

    // 快捷删除
    if (curKey === 8 || curKey === 46) {
      if (selectedPointId.current) {
        delPoint();
        tempProps.current.changeSize(getMarkData());
      } else {
        delSelectShape();
      }
      return;
    }

    // 复制
    if (isCtrlKey.current && curKey === 67) {
      var _curShape$current9;
      copyIds.current = selectShapeIds.current && _toConsumableArray(selectShapeIds.current) || ((_curShape$current9 = curShape.current) === null || _curShape$current9 === void 0 ? void 0 : _curShape$current9.attr('id')) || null;
    }
    // 粘贴
    if (isCtrlKey.current && curKey === 86) {
      if (!copyIds.current) return;
      delEditStatus();
      var multiShape = _typeof(copyIds.current) === 'object';
      if (multiShape) {
        selectShapeIds.current = _toConsumableArray(copyIds.current);
      } else {
        curShape.current = d3.select("#".concat(copyIds.current));
      }
      copySelectShape();
      if (multiShape) {
        updateSelectPath();
      } else if (['rect', 'ellipse'].includes(allShapeJson.current[copyIds.current.substring(6)].shape_type)) {
        updateGrip();
      } else {
        updatePoint();
      }
      tempProps.current.changeSize(getMarkData());
    }

    // 快捷移动当前选中框
    if ([37, 38, 39, 40].includes(curKey)) {
      var dx = 0,
        dy = 0;
      if (curKey === 37) {
        // 左移
        dx = -1;
      } else if (curKey === 38) {
        // 上
        dy = -1;
      } else if (curKey === 39) {
        // 右
        dx = 1;
      } else if (curKey === 40) {
        // 下
        dy = 1;
      }
      // 记录移动操作前的数据
      var recordData = recordBeforeMove();
      insertStack.apply(void 0, ['edit'].concat(_toConsumableArray(recordData)));
      recordData = null;
      moveSelectShape([dx, dy], event);
    }
  };
  var keyup = function keyup(event) {
    isCtrlKey.current = event.ctrlKey;
    isAltKey.current = event.altKey;
    isShiftKey.current = event.shiftKey;
  };
  // 画布获取、失去焦点
  var focus = function focus(status) {
    if (status) {
      d3.select('body').on('keyup', keyup);
    } else {
      d3.select('body').on('keyup', null);
      isCtrlKey.current = false;
      isAltKey.current = false;
      isShiftKey.current = false;
      outMouseup();
    }
  };

  // 初始化布局
  var initLayout = function initLayout() {
    var _d3$select$select;
    // 1、添加svgRoot
    (_d3$select$select = d3.select(curDom.current).select('div>svg')) === null || _d3$select$select === void 0 ? void 0 : _d3$select$select.remove();
    svgRoot.current = d3.select(curDom.current).selectChild('div').append('svg').attr('id', 'svgroot');

    // 1.2 添加网格
    var defs = svgRoot.current.append('defs'),
      gridPattern = defs.append('pattern').attr('id', 'gridPattern').attr('patternUnits', 'userSpaceOnUse').attr('x', 0).attr('y', 0).attr('width', '10').attr('height', '10'),
      gridRect = gridPattern.append('rect');
    gridRect.attr('fill', 'none').attr('stroke', '#787878').attr('stroke-width', '0.5').attr('x', 0).attr('y', 0).attr('width', '100%').attr('height', '100%');

    // 2、添加svgCont
    svgCont.current = svgRoot.current.append('svg').attr('id', 'svgcont'); // .attr('fill', bgColor)
    // 2.1添加g放置图片和图形
    svgCont.current.append('g').attr('class', 'layer').attr('id', 'img').style('pointer-events', 'none');
    svgCont.current.append('g').attr('class', 'layer').attr('id', "shape");

    // 3、放置图形相关的控制点、控制线
    var relatedGroup = svgRoot.current.append('g').attr('id', 'shape-related-group'),
      // 3.1 框选的虚线框
      shapeSelector = relatedGroup.append('rect').attr('id', 'shape-selector').attr('display', 'none').style('pointer-events', 'none'),
      rectAttrs = Object.assign({}, shapeInfo['rect'], shapeInfo['selectBox']);
    Object.keys(rectAttrs).forEach(function (key) {
      shapeSelector.attr(key, rectAttrs[key]);
    });

    // 单击多边形的隐形外框，用于单击添加顶点
    var pathAddPoint = relatedGroup.append('path').attr('id', 'path-add-point').attr('display', 'none'),
      pathAddPointAttrs = shapeInfo['pathAddPoint'];
    Object.keys(pathAddPointAttrs).forEach(function (key) {
      pathAddPoint.attr(key, pathAddPointAttrs[key]);
    });

    // 3.2 创建拖拽图形的控制点和线（8个方向控制点、控制线path的顶点）
    relatedGroup.append('g').attr('class', 'grip-layer').attr('id', 'shape-grip-group').attr('display', 'none');
    // 3.2.1 添加控制线
    d3.select('#shape-grip-group').append('path').attr('id', 'resize-path').style('pointer-events', 'none');
    var lineAttrs = shapeInfo['line'];
    Object.keys(lineAttrs).forEach(function (key) {
      d3.select('#resize-path').attr(key, lineAttrs[key]);
    });
    // 3.2.2 添加控制点
    for (var i = 0; i < 8; i++) {
      d3.select('#shape-grip-group').append('rect').attr('id', 'resize-grip-' + dirArr[i]).style('cursor', dirArr[i] + '-resize');
    }
    var gripAttrs = shapeInfo['grip'];
    Object.keys(gripAttrs).forEach(function (key) {
      d3.selectAll('#shape-grip-group rect').attr(key, gripAttrs[key]);
    });

    // 3.3 添加放置path的顶点
    relatedGroup.append('g').attr('class', 'point_layer').attr('id', 'path-point-group');

    // 3.4 添加放置图形外围框
    relatedGroup.append('g').attr('class', 'path_layer').attr('id', 'shape-path-group').style('pointer-events', 'none');

    // 3.5 添加放置图形文本label
    relatedGroup.append('g').attr('class', 'label_layer').attr('id', 'shape-label-group').attr('display', 'none').style('pointer-events', 'none');

    // 4 显示网格（不放在img层是因为scale导致grid边框放大，"non-scaling-stroke"对pattern无效）
    relatedGroup.append('rect').attr('id', 'grid').attr('display', 'none').style('pointer-events', 'none').attr('x', 0).attr('y', 0).attr('width', '0').attr('height', '0').attr('fill', 'url(#gridPattern)').attr('stroke', 'none');

    // 5 显示定位线
    var crosshairGroup = svgRoot.current.append('g').attr('class', 'crosshair_layer').style('pointer-events', 'none').attr('display', 'none');
    crosshairGroup.append('rect').attr('id', 'crosshair-v-line').attr('width', 0.5).attr('height', '100%');
    crosshairGroup.append('rect').attr('id', 'crosshair-h-line').attr('width', '100%').attr('height', 0.5);
    crosshairGroup.selectAll('rect').attr('x', 0).attr('y', 0).attr('fill', '#00f').attr('stroke', 'none');
  };

  // 设置画布大小
  var setCanvasSize = function setCanvasSize() {
    var boxInfo = curDom.current.getBoundingClientRect(),
      w = boxInfo.right - boxInfo.left || shapeInfo.svg.width,
      h = boxInfo.bottom - boxInfo.top || shapeInfo.svg.height;
    var _ref10 = [w, h];
    shapeInfo.svg.width = _ref10[0];
    shapeInfo.svg.height = _ref10[1];
    d3.select('#svgcanvas').style('width', w + 'px').style('height', h + 'px'); // style对象设置方式无效，只能用链式方式
    d3.selectAll('#svgroot,#svgcont').attr('width', w).attr('height', h);
  };

  // 初始化事件
  var initEvent = function initEvent() {
    svgRoot.current
    // .on('click', (...params) => clickCanvas('whole', ...params))
    .on('mousemove touchmove', mouseMove).call(initDrag('whole', dragChange)).call(initZoom(function (event) {
      zoomWhole(event);
    })).on('dblclick.zoom', null);
    d3.selectAll('#shape-grip-group rect').call(initDrag('grip', dragChange));
    svgRoot.current.select('#path-add-point').call(initDrag('insertPoint', dragChange));
  };

  // 初始化
  var init = function init() {
    // 初始化d3的事件
    lineCreater.current = d3.line();
    initLayout();
    setCanvasSize();
    initEvent();
    toggleCrosshair(tempProps.current.showCrosshair);
  };

  // zoom重载(回到初始化状态)
  var zoomReload = function zoomReload() {
    svgRoot.current.selectAll('g.layer,g#shape-related-group').attr('transform', null);
    curTransform.current = null;
    svgRoot.current.call(initZoom().transform, d3.zoomIdentity); // 重置zoom。
    tempProps.current.changeScale('1');
  };

  // 清空绘制的图形（false不更新数据，因loadimg后续就更新了数据）
  var clearShape = function clearShape() {
    var _svgRoot$current$sele6, _svgRoot$current$sele7;
    var update = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    // console.log(888, 'clear');
    undoStack.current = [];
    redoStack.current = [];
    // 删除图形状态
    delEditStatus();
    if (curShape.current) {
      curShape.current = null;
    }
    if (selectShapeIds.current) {
      selectShapeIds.current = null;
    }

    // 删除图形数据
    allShapeJson.current = {};
    if (update) {
      tempProps.current.changeSize(getMarkData());
    }
    drawNumArr.current = [];
    tempProps.current.changeSelect([]);

    // 删除图形
    (_svgRoot$current$sele6 = svgRoot.current.selectAll('#shape *')) === null || _svgRoot$current$sele6 === void 0 ? void 0 : _svgRoot$current$sele6.remove();
    (_svgRoot$current$sele7 = svgRoot.current.selectAll('#shape-label-group *')) === null || _svgRoot$current$sele7 === void 0 ? void 0 : _svgRoot$current$sele7.attr('display', 'none');
  };
  // 全部重置
  var reload = function reload() {
    var _svgCont$current$sele;
    var update = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    (_svgCont$current$sele = svgCont.current.select('g#img').select('image')) === null || _svgCont$current$sele === void 0 ? void 0 : _svgCont$current$sele.remove();
    clearShape(update);
    zoomReload();
  };

  // 显示隐藏图形
  var toggleShape = function toggleShape(id) {
    var _curShape$current10, _curShape$current10$a;
    var hide = allShapeJson.current[id].hide,
      curId = (_curShape$current10 = curShape.current) === null || _curShape$current10 === void 0 ? void 0 : (_curShape$current10$a = _curShape$current10.attr('id')) === null || _curShape$current10$a === void 0 ? void 0 : _curShape$current10$a.substring(6);
    hide = !hide;
    allShapeJson.current[id].hide = hide;
    svgRoot.current.selectAll("g#shape #shape-".concat(id, ",#shape-label-").concat(id)).attr('display', hide ? 'none' : 'inline');
    if (selectShapeIds.current && selectShapeIds.current.includes(id)) {
      var _selectShapeIds$curre11;
      var curIdIndex = selectShapeIds.current.indexOf(id);
      selectShapeIds.current.splice(curIdIndex, 1);
      if (!((_selectShapeIds$curre11 = selectShapeIds.current) !== null && _selectShapeIds$curre11 !== void 0 && _selectShapeIds$curre11.length)) {
        selectShapeIds.current = null;
        d3.selectAll('#shape-path-group *').attr('display', 'none');
        tempProps.current.changeSelect([]);
      } else {
        var _d3$select3;
        (_d3$select3 = d3.select("#shape-path-".concat(selectShapeIds.current.length))) === null || _d3$select3 === void 0 ? void 0 : _d3$select3.attr('display', 'none');
        updateSelectPath();
        tempProps.current.changeSelect(getSelectIds());
      }
    } else if (curId && curId === id) {
      delEditStatus();
      curShape.current = null;
      tempProps.current.changeSelect([]);
    }
    tempProps.current.changeSize(getMarkData());
  };

  // 加载图片
  var loadImg = function loadImg(src) {
    if (!src) return false;
    setCanvasSize();
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function (e) {
        var _svgCont$current$sele2, _svgCont$current$sele3;
        var originW = e.target.width,
          originH = e.target.height,
          curImgW = originW,
          curImgH = originH,
          x = 0,
          y = 0,
          imgScale = 1,
          _shapeInfo$svg = shapeInfo.svg,
          svgW = _shapeInfo$svg.width,
          svgH = _shapeInfo$svg.height;

        // 超出
        // if (originW > svgW || originH > svgH) {
        var boxRatio = svgW / svgH,
          imgRatio = originW / originH;
        if (boxRatio > imgRatio) {
          curImgH = svgH;
          curImgW = curImgH * imgRatio;
          imgScale = originH / curImgH;
        } else {
          curImgW = svgW;
          curImgH = curImgW / imgRatio;
          imgScale = originW / curImgW;
        }
        // }
        x = (svgW - curImgW) / 2;
        y = (svgH - curImgH) / 2;
        curImgInfo.current = {
          x: x,
          y: y,
          scale: imgScale,
          w: curImgW,
          h: curImgH
        };
        (_svgCont$current$sele2 = svgCont.current.select('g#img').select('image')) === null || _svgCont$current$sele2 === void 0 ? void 0 : _svgCont$current$sele2.remove();
        (_svgCont$current$sele3 = svgCont.current.select('g#img').append('image')
        // .insert('image', '#grid')
        .attr('width', curImgW).attr('height', curImgH).attr('x', x).attr('y', y).attr('xlink:href', src).attr('draggable', 'false')) === null || _svgCont$current$sele3 === void 0 ? void 0 : _svgCont$current$sele3.style('filter', imgFilterStr.current);
        updateGrid();
        tempProps.current.imgLoaded({
          width: originW,
          height: originH
        });
        resolve(true);
      };
      img.src = src;
    });
  };

  // 更新文本的颜色
  var updateLabelColor = function updateLabelColor(status) {
    if (!status) return;
    var shapeIds = Object.keys(allShapeJson.current);
    shapeIds === null || shapeIds === void 0 ? void 0 : shapeIds.forEach(function (item) {
      var curShape = svgRoot.current.select("#shape-".concat(item));
      svgRoot.current.select("#shape-label-".concat(item)).attr('fill', curShape.attr('stroke'));
    });
  };

  // 显示、隐藏网格
  var toggleGrid = function toggleGrid(status) {
    svgRoot.current.select('#grid').attr('display', status && (!curTransform.current || curTransform.current.k >= 1) ? 'inline' : 'none');
    updateGrid(true);
  };
  // 显示、隐藏十字准线
  var toggleCrosshair = function toggleCrosshair(status) {
    svgRoot.current.select('.crosshair_layer').attr('display', status && props.drawTool !== 'move' && props.drawTool !== 'drag' ? 'inline' : 'none');
  };

  // 调整图片（brightness亮度）
  var adjustImg = function adjustImg(val) {
    var _svgCont$current$sele4;
    imgFilterStr.current = val;
    (_svgCont$current$sele4 = svgCont.current.select('#img image')) === null || _svgCont$current$sele4 === void 0 ? void 0 : _svgCont$current$sele4.style('filter', val);
  };
  // 显示、隐藏标签
  var toggleLabel = function toggleLabel(status) {
    svgRoot.current.select('#shape-label-group').attr('display', status ? 'inline' : 'none');
    updateAllLabel(true);
    updateLabelColor(status);
  };
  // 修改图形标签
  var editLabel = function editLabel(id, newLabel) {
    if (!allShapeJson.current[id]) return;
    allShapeJson.current[id].label = newLabel;
    svgRoot.current.select("#shape-label-".concat(id)).text(newLabel);
    tempProps.current.changeSize(getMarkData());
    var _tempProps$current6 = tempProps.current,
      colorBindLabel = _tempProps$current6.colorBindLabel,
      curLabel = _tempProps$current6.curLabel;
    if (colorBindLabel) {
      var curColor = '',
        update = labelColorJson.current[newLabel];
      if (!curLabel) {
        curColor = shapeInfo.shapeCommon.stroke;
      } else {
        curColor = labelColorJson.current[newLabel] || getRandomColor(labelColorJson.current);
      }
      changeSingleShapeColor(id, curColor);
      if (!update) {
        labelColorJson.current[newLabel] = curColor;
        tempProps.current.changeBindColor(labelColorJson.current);
      }
    }
  };

  // 修改画布缩放（enlarge、narrow、具体数值）
  var changeScale = function changeScale(type) {
    var scaleNum = +curScale.current,
      speed = 0,
      scaleExtent = tempProps.current.scaleExtent;
    if (!isNaN(type)) {
      scaleNum = +type;
    } else if (type === 'enlarge') {
      speed = (scaleExtent[1] - scaleNum) / 20;
      speed = speed > 0.1 ? speed : 0.2;
      scaleNum = scaleNum + speed;
    } else if (type === 'narrow') {
      speed = (scaleNum - scaleExtent[0]) / 5;
      scaleNum = scaleNum - speed;
    }
    scaleNum = scaleNum < scaleExtent[0] ? scaleExtent[0] : scaleNum;
    scaleNum = scaleNum > scaleExtent[1] ? scaleExtent[1] : scaleNum;
    initZoom().scaleTo(svgRoot.current, scaleNum);
    curTransform.current = d3.zoomTransform(svgRoot.current.node());
    zoomWhole(curTransform.current, false);
  };

  // 转换数据格式：attr=》points
  var convertToPoints = function convertToPoints(sizeArr) {
    if (!sizeArr || !(sizeArr !== null && sizeArr !== void 0 && sizeArr.length)) return [];
    var newArr = [];
    try {
      newArr = sizeArr.map(function (item) {
        var _attrs3;
        if (!(item !== null && item !== void 0 && item.attrs)) return item;
        var attrs = item.attrs,
          shape_type = item.shape_type,
          rest = _objectWithoutProperties(item, _excluded);
        if (shape_type.indexOf('rect') >= 0) {
          // 矩形
          var _attrs = attrs,
            x = _attrs.x,
            y = _attrs.y,
            width = _attrs.width,
            height = _attrs.height;
          attrs = [[x, y], [x + width, y + height]];
          return _objectSpread({
            points: attrs,
            shape_type: 'rectangle'
          }, rest);
        } else if (shape_type === 'ellipse') {
          // 椭圆形
          var _attrs2 = attrs,
            cx = _attrs2.cx,
            cy = _attrs2.cy,
            rx = _attrs2.rx,
            ry = _attrs2.ry;
          if (rx === ry) {
            // 圆形
            attrs = [[cx, cy], [cx, cy + ry]];
            return _objectSpread({
              points: attrs,
              shape_type: 'circle'
            }, rest);
          }
          attrs = [[cx, cy], [cx, cy + ry],
          // 下
          [cx + rx, cy] // 右
          ];

          return _objectSpread({
            points: attrs,
            shape_type: 'ellipse'
          }, rest);
        }
        // 多边形
        return _objectSpread({
          points: (_attrs3 = attrs) === null || _attrs3 === void 0 ? void 0 : _attrs3.points,
          shape_type: shape_type
        }, rest);
      });
    } catch (e) {
      console.error(e.toString());
    }
    return newArr;
  };

  // 转换数据格式：points=》attr
  var convertToAttrs = function convertToAttrs(sizeArr) {
    if (!sizeArr || !(sizeArr !== null && sizeArr !== void 0 && sizeArr.length)) return [];
    var newArr = [];
    try {
      newArr = sizeArr.map(function (item, index) {
        var _item;
        item = _objectSpread(_objectSpread({}, item), {}, {
          id: "".concat(index + 1)
        });
        if ((_item = item) !== null && _item !== void 0 && _item.attrs) return item;
        var _item2 = item,
          points = _item2.points,
          shape_type = _item2.shape_type,
          rest = _objectWithoutProperties(_item2, _excluded2);
        if (shape_type.indexOf('rect') >= 0) {
          // 矩形
          var _points2 = points,
            _points3 = _slicedToArray(_points2, 2),
            _points3$ = _slicedToArray(_points3[0], 2),
            x = _points3$[0],
            y = _points3$[1],
            _points3$2 = _slicedToArray(_points3[1], 2),
            x2 = _points3$2[0],
            y2 = _points3$2[1],
            width = Math.abs(x2 - x),
            height = Math.abs(y2 - y);
          var curX = x,
            curY = y;
          if (curX > x2) {
            curX = x2;
          }
          if (curY > y2) {
            curY = y2;
          }
          points = {
            x: curX,
            y: curY,
            width: width,
            height: height
          };
          return _objectSpread({
            attrs: points,
            shape_type: 'rect'
          }, rest);
        } else if (shape_type === 'circle') {
          // 圆形
          var _points4 = points,
            _points5 = _slicedToArray(_points4, 2),
            _points5$ = _slicedToArray(_points5[0], 2),
            _x2 = _points5$[0],
            _y2 = _points5$[1],
            _points5$2 = _slicedToArray(_points5[1], 2),
            _x3 = _points5$2[0],
            _y3 = _points5$2[1],
            r = Math.sqrt(Math.pow(_x3 - _x2, 2) + Math.pow(_y3 - _y2, 2));
          points = {
            cx: _x2,
            cy: _y2,
            rx: r,
            ry: r
          };
          return _objectSpread({
            attrs: points,
            shape_type: 'ellipse'
          }, rest);
        } else if (shape_type === 'ellipse') {
          // 椭圆形
          var _points6 = points,
            _points7 = _slicedToArray(_points6, 3),
            _points7$ = _slicedToArray(_points7[0], 2),
            _x4 = _points7$[0],
            _y4 = _points7$[1],
            _points7$2 = _slicedToArray(_points7[1], 2),
            _y5 = _points7$2[1],
            _points7$3 = _slicedToArray(_points7[2], 1),
            x3 = _points7$3[0],
            ry = _y5 - _y4,
            rx = x3 - _x4;
          points = {
            cx: _x4,
            cy: _y4,
            rx: rx,
            ry: ry
          };
          return _objectSpread({
            attrs: points,
            shape_type: 'ellipse'
          }, rest);
        } else if (shape_type === 'polygon') {
          // 多边形
          return _objectSpread({
            attrs: {
              points: points
            },
            shape_type: shape_type
          }, rest);
        }
        // 其他
        return _objectSpread({
          attrs: {
            points: points
          },
          shape_type: 'line'
        }, rest);
      });
    } catch (e) {
      console.error(e.toString());
    }
    return newArr;
  };

  // 从数据绘制图形时，更新相关信息
  var updateFromSize = function updateFromSize(id, shape_type, label, hide, newAttrs) {
    drawNumArr.current.push(id);
    allShapeJson.current[id] = {
      label: label,
      shape_type: shape_type,
      hide: hide,
      attrs: newAttrs
    };
    if (label) {
      addLabel(id, label, shape_type !== 'rect');
    }
    // 显示文本代码
    svgRoot.current.selectAll("g#shape #shape-".concat(id, ",#shape-label-").concat(id)).attr('display', hide ? 'none' : 'inline');
  };

  // 加载图片后，将绘制在画布上的图形，即getMarkData返回的数据，重新绘制在图片上（若是读取外部json文件，另需添加基本的顶点）
  var drawShapeFromSize = function drawShapeFromSize(sizeArr) {
    var update = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    if (!sizeArr || !(sizeArr !== null && sizeArr !== void 0 && sizeArr.length)) return;
    try {
      var _curImgInfo$current3 = curImgInfo.current,
        imgX = _curImgInfo$current3.x,
        imgY = _curImgInfo$current3.y,
        imgScale = _curImgInfo$current3.scale,
        shapeBox = svgCont.current.select('#shape');
      sizeArr.forEach(function (item) {
        // console.log(item);
        var attrs = item.attrs,
          id = item.id,
          hide = item.hide,
          label = item.label,
          shape_type = item.shape_type,
          curShape = null,
          newAttrs = null;

        // 矩形、椭圆形
        if (shape_type === 'rect' || shape_type === 'ellipse') {
          var _newAttrs;
          var attrNames = getShapeAttrNames(shape_type),
            x = attrs[attrNames.x],
            y = attrs[attrNames.y],
            w = attrs[attrNames.w],
            h = attrs[attrNames.h];

          // 是否有效图形
          if (!+w || !+h) {
            return;
          }
          if (!id) {
            id = getCurNum();
          }
          curShape = shapeBox.append(shape_type).attr('id', "shape-".concat(id)).call(initDrag('shape', dragChange));
          // 设置颜色
          setDrawColor(label);
          var shapeAttrs = Object.assign({}, shapeInfo.shapeCommon, shapeInfo[shape_type]);
          Object.keys(shapeAttrs).forEach(function (key) {
            curShape.attr(key, shapeAttrs[key]);
          });
          x = +x / imgScale + imgX;
          y = +y / imgScale + imgY;
          w = w / imgScale;
          h = h / imgScale;
          curShape.attr(attrNames.x, x).attr(attrNames.y, y).attr(attrNames.w, w).attr(attrNames.h, h);
          newAttrs = (_newAttrs = {}, _defineProperty(_newAttrs, attrNames.x, x), _defineProperty(_newAttrs, attrNames.y, y), _defineProperty(_newAttrs, attrNames.w, w), _defineProperty(_newAttrs, attrNames.h, h), _newAttrs);
        } else {
          // 多边形
          if (!id) {
            id = getCurNum();
          }
          // 设置颜色
          setDrawColor(label);
          var points = attrs.points,
            curLen = points.length,
            _curShape = shapeBox.append('path').attr('id', "shape-".concat(id)).call(initDrag('shape', dragChange)),
            _shapeAttrs = Object.assign({}, shapeInfo.shapeCommon, shapeInfo['path']),
            newPoints = [];
          Object.keys(_shapeAttrs).forEach(function (key) {
            _curShape.attr(key, _shapeAttrs[key]);
          });

          // 更新point位置
          for (var i = 0; i < curLen; i++) {
            var _points$i5 = _slicedToArray(points[i], 2),
              _x5 = _points$i5[0],
              _y6 = _points$i5[1];
            _x5 = +_x5 / imgScale + imgX;
            _y6 = +_y6 / imgScale + imgY;
            newPoints[i] = [_x5, _y6];
            var curPointId = "path-point-".concat(i + 1);
            addPoint(curPointId, i, false);
          }
          var pointString = lineCreater.current(newPoints);
          if (shape_type === 'polygon') {
            pointString += 'Z';
          }
          _curShape.attr('d', pointString);
          newAttrs = {
            points: newPoints
          };
        }
        item.id = id;
        updateFromSize(id, shape_type, label, hide, newAttrs);
      });
      tempProps.current.changeBindColor(labelColorJson.current);
      if (update) {
        tempProps.current.changeSize(sizeArr);
      }
    } catch (e) {
      console.error(e.toString());
    }
  };
  var canUndo = function canUndo() {
    return undoStack.current.length > 0;
  };
  var canRedo = function canRedo() {
    return redoStack.current.length > 0;
  };

  // 获取当前组件dom
  var getCurDom = function getCurDom(c) {
    if (c && !curDom.current) {
      // console.log('dom有了');
      curDom.current = c;
    }
  };
  useEffect(function () {
    if (curDom.current) {
      init();
      window.addEventListener('resize', setCanvasSize);
      // window.addEventListener('touchend', outMouseup);
      // window.addEventListener('mouseup', outMouseup);
    }

    return function () {
      d3.select('body').on('keyup', null);
      window.removeEventListener('resize', setCanvasSize);
      // window.removeEventListener('touchend', outMouseup);
      // window.removeEventListener('mouseup', outMouseup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(function () {
    if (props.src !== tempProps.current.src) {
      loadImg(props.src);
    }
    if (props.drawTool !== tempProps.current.drawTool) {
      switchDrawTool(props.drawTool);
      toggleCrosshair(props.showCrosshair);
    }
    if (props.showLabel !== tempProps.current.showLabel) {
      toggleLabel(props.showLabel);
    }
    if (props.showGrid !== tempProps.current.showGrid) {
      toggleGrid(props.showGrid);
    }
    if (props.showCrosshair !== tempProps.current.showCrosshair) {
      toggleCrosshair(props.showCrosshair);
    }
    tempProps.current = props;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props]);
  useImperativeHandle(ref, function () {
    return {
      reload: reload,
      // 全部重置
      zoomReload: zoomReload,
      // 缩放回到初始状态
      loadImg: loadImg,
      // 加载图片
      clearShape: clearShape,
      // 清空图形
      toggleShape: toggleShape,
      // 切换图形显示隐藏
      getMarkData: getMarkData,
      // 获取图形数据
      selectShape: selectShape,
      // 选中图形
      delSelectShape: delSelectShape,
      // 删除选中的图形
      getSelectIds: getSelectIds,
      // 获取选中、正在编辑的图形id
      editLabel: editLabel,
      // 修改图形标签
      adjustImg: adjustImg,
      // 编辑图片（亮度、曝光度等）
      undoSvg: undoSvg,
      // 撤销
      canUndo: canUndo,
      // 能否撤销
      redoSvg: redoSvg,
      // 重做
      canRedo: canRedo,
      changeScale: changeScale,
      // 修改画布缩放
      changeColor: changeColor,
      // 修改画框颜色
      drawShapeFromSize: drawShapeFromSize,
      // 加载图片后重载图形
      setCanvasSize: setCanvasSize,
      // 变更画布尺寸
      convertToPoints: convertToPoints,
      // 转换数据格式：attr=》points
      convertToAttrs: convertToAttrs // 转换数据格式：points=》attr
    };
  });

  return /*#__PURE__*/React.createElement("div", {
    ref: getCurDom,
    className: "w-draw-container ".concat(tempProps.current.className || ''),
    onKeyDown: keydown
  }, /*#__PURE__*/React.createElement("div", {
    id: "svgcanvas",
    className: "w-svg-box",
    tabIndex: -1,
    onFocus: function onFocus() {
      return focus(true);
    },
    onBlur: function onBlur() {
      return focus(false);
    }
  }), props === null || props === void 0 ? void 0 : props.children);
});
WDraw.defaultProps = {
  src: '',
  // 图片路径
  curLabel: '',
  // 当前的label
  showLabel: false,
  // 显示标签
  showGrid: false,
  // 显示网格
  showCrosshair: false,
  // 显示定位线
  minSize: [4, 4],
  // 误触尺寸，小于它的直接删除
  drawTool: '',
  // 默认绘制工具（rect、ellipse、path、move、drag）
  scaleExtent: [0.02, 30],
  // 图形缩放比例阀值
  colorBindLabel: true,
  // 颜色跟标签绑定
  // changeTool: () => { }, // 变更工具
  changeSize: function changeSize() {},
  // 尺寸、位置发生变化
  changeBindColor: function changeBindColor() {},
  // 颜色绑定标签时，标签颜色发生变化
  changeSelect: function changeSelect() {},
  // 选中、正在编辑的图形id
  changeScale: function changeScale() {},
  // 修改画布scale
  imgLoaded: function imgLoaded() {},
  // 图片加载完的回调
  endDraw: function endDraw() {} // 绘制完一个图形的回调
};

export default WDraw;
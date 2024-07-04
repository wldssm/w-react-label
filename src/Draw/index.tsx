/* eslint-disable @typescript-eslint/no-use-before-define */
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import * as d3 from 'd3';

import {
  dirArr,
  dragGrip,
  getAfterRotate,
  getRandomColor,
  getRotateCenterDiff,
  isTouchEvent,
  pointToLineDistance,
  shapeInfo,
} from './common.js';

import './assets/index.css';

type func = (...param: any) => any;

const WDraw = forwardRef((props: any, ref) => {
  // let { className, src, drawTool, scaleExtent } = props;
  let tempProps: any = useRef(props), // 最新的
    curDom: any = useRef(null), // 当前根dom
    // svg元素
    svgRoot: any = useRef(null),
    svgCont: any = useRef(null),
    curShape: any = useRef(null), // 正在绘制的图像，即拖拽点出现的图像，而不是蒙版出现的。因为绘制完图形可以直接拖动控制点修改。
    maskShapeId: any = useRef(null), // 有蒙版的元素id
    editPathId: any = useRef(null), // 可以编辑顶点的path的id
    selectedGripId: any = useRef(''), // 选中的grip（拖拽点）
    selectedPointId: any = useRef(null), // 选中的顶点
    lineCreater: any = useRef(null), // d3.line()，为了生成path的节点
    curTransform: any = useRef(null), // 当前缩放transform
    startInfo: any = useRef({ x: 0, y: 0, w: 0, h: 0, mx: 0, my: 0 }), // 临时初始数据
    isDrawing = useRef(false), // 是否绘制rect、ellipse中
    isPathing = useRef(false), // 是否绘制path中
    isMoving = useRef(false), // drag、zoom是否执行了drag\zoom方法，即是否移动，还是只有单击
    drawNumArr: any = useRef([]), // 记录已绘制的图形num编号
    curScale = useRef('1'), // 画布的scale
    curImgInfo = useRef({ x: 0, y: 0, scale: 1, w: 0, h: 0 }), // 图片初始展示信息
    selectShapeIds: any = useRef(null), // 多选选中的图形id
    copyIds: any = useRef(null),
    imgFilterStr: any = useRef(''), // 图片的调整样式
    // 按键
    isCtrlKey: any = useRef(false), // ctrl是否按下。为了兼容触摸屏touch事件的ctrl始终为false
    isShiftKey: any = useRef(false),
    isAltKey: any = useRef(false),
    // json记录(label、points、shape_type)
    allShapeJson: any = useRef({}), // 所有已绘制图形的坐标尺寸数据
    curShapePoints: any = useRef(null), // 当前正在绘制的图形的坐标尺寸数据
    labelColorJson: any = useRef({}), // 标签绑定的颜色
    // 操作记录
    undoStack: any = useRef([]), // 撤销栈
    redoStack: any = useRef([]); // 重做栈（重做的是最新的连续的撤销操作）

  // 删除元素蒙版、可编辑状态
  const delEditStatus = () => {
    d3.selectAll(
      '#shape-grip-group,#path-point-group *,#shape-path-group *,#path-add-point',
    )?.attr('display', 'none');
    editPathId.current = '';
    if (maskShapeId.current) {
      d3.select('#' + maskShapeId.current).attr(
        'fill',
        shapeInfo.shapeCommon.fill,
      );
      maskShapeId.current = '';
    }
    if (selectedGripId.current) {
      d3.select('#' + selectedGripId.current).attr(
        'fill',
        shapeInfo['grip'].fill,
      );
      selectedGripId.current = '';
    }
    if (selectedPointId.current) {
      d3.select('#path-point-' + selectedPointId.current).attr(
        'fill',
        shapeInfo['point'].fill,
      );
      selectedPointId.current = '';
    }
  };

  // mouse才会触发focus，所以手动触发画布获取焦点
  const getFocus = () => {
    if (document.getElementById('svgcanvas') !== document.activeElement) {
      document.getElementById('svgcanvas')?.focus();
    }
  };

  // 获取d3鼠标相对容器的坐标的坐标
  const getD3Posi = (event: any) => {
    const e = event?.sourceEvent || event;
    let posi = [];

    if (isTouchEvent(e)) {
      posi = d3.pointer(
        e.touches[0] || e.changedTouches[0],
        svgRoot.current.node(),
      );
    } else {
      posi = d3.pointer(e, svgRoot.current.node());
    }

    // 放大后鼠标位置发生偏移，需反向计算回去
    if (curTransform.current) {
      let { x, y, k } = curTransform.current;
      posi[0] = (posi[0] - x) / k;
      posi[1] = (posi[1] - y) / k;
    }
    return posi;
  };

  // 计算当前图形的编号，递增插入
  const getCurNum = () => {
    let len = drawNumArr.current.length || 0,
      curNum: any = 0;
    for (let i = 0; i < len; i++) {
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
  const getShapeAttrNames = (type: string) => {
    if (type === 'ellipse') {
      return { x: 'cx', y: 'cy', w: 'rx', h: 'ry' };
    }
    return { x: 'x', y: 'y', w: 'width', h: 'height' };
  };

  // 判断误操作（尺寸过小），删除图形
  const delShapeIfMini = () => {
    let { drawTool }: any = tempProps.current,
      { minSize }: any = props,
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

  // 获取旋转中心点（尺寸没变化时）
  const getRotateCenter = (id: any) => {
    const curShape = d3.select(`#shape-${id}`);
    if (!curShape) return {};

    const attrs = curShape?.node()?.getBBox(), // 获取图形的尺寸坐标
      curScale = curTransform?.current?.k || 1,
      { x, y, width, height } = attrs,
      centerX = x + width / 2, // 图形的中心
      centerY = y + height / 2,
      gripCenterX = centerX * curScale, // 图形控制点的中心
      gripCenterY = centerY * curScale;

    return { centerX, centerY, gripCenterX, gripCenterY };
  };
  // 获取旋转差值（尺寸变化时）
  const updateRotateCenter = () => {
    if (!curShape.current) return;

    const curId = curShape.current.attr('id')?.substring(6);
    const curRotate = allShapeJson.current[curId]?.rotate;
    if (!curRotate) return;

    const [rotateAngle, curCenterX, curCenterY] = curRotate,
      attrs = curShape.current?.node()?.getBBox(), // 获取图形的尺寸坐标
      { x, y, width, height } = attrs;

    const { changeX, changeY } = getRotateCenterDiff(
      x,
      y,
      width,
      height,
      curCenterX,
      curCenterY,
      rotateAngle,
    );
    // console.log(changeX, changeY);
    moveSelectShape([changeX, changeY]);
    return [changeX, changeY];
  };

  // 更新控制点位置（selection）
  const updateGrip = () => {
    if (!curShape.current || isPathing.current || editPathId.current) {
      return false;
    }

    const curId = curShape.current.attr('id')?.substring(6),
      { hide, rotate } = allShapeJson.current?.[curId],
      gripGroupEl = d3.select('#shape-grip-group');

    gripGroupEl.attr('display', hide ? 'none' : 'inline');
    if (hide) return;

    let curScale = curTransform?.current?.k || 1,
      { x, y, width, height } = curShape.current?.node()?.getBBox(), // 获取图形的尺寸坐标
      // 拖拽点
      gWidth = shapeInfo['grip'].width / 2,
      gHeight = shapeInfo['grip'].height / 2;

    // 手动调整scale
    x = x * curScale || 0;
    y = y * curScale || 0;
    width = width * curScale || 0;
    height = height * curScale || 0;

    // 更新旋转
    if (tempProps.current.rotateEnable) {
      // 旋转图标
      const rX = x + width / 2;
      gripGroupEl
        .select('#rotate-line')
        .attr('x1', rX)
        .attr('y1', y - 4)
        .attr('x2', rX)
        .attr('y2', y - 16);
      gripGroupEl
        .select('#rotate-circle')
        .attr('cx', rX)
        .attr('cy', y - 20);
    }
    // 旋转中心点
    if (rotate) {
      const [rotateAngle, centerX, centerY] = rotate,
        gripCenterX = centerX * curScale, // 图形控制点的中心
        gripCenterY = centerY * curScale;

      gripGroupEl.attr(
        'transform',
        `rotate(${rotateAngle} ${gripCenterX},${gripCenterY})`,
      );
      curShape.current.attr(
        'transform',
        `rotate(${rotateAngle} ${centerX},${centerY})`,
      );
    } else {
      gripGroupEl.attr('transform', null);
    }

    // 线
    const points = [
        [x, y],
        [x + width, y],
        [x + width, y + height],
        [x, y + height],
      ],
      pointString = lineCreater.current(points);
    d3.select('#resize-path').attr('d', pointString + 'Z');
    // 点
    gripGroupEl
      .select('#resize-grip-nw')
      .attr('x', x - gWidth)
      .attr('y', y - gHeight);
    gripGroupEl
      .select('#resize-grip-n')
      .attr('x', x + width / 2 - gWidth)
      .attr('y', y - gHeight);
    gripGroupEl
      .select('#resize-grip-ne')
      .attr('x', x + width - gWidth)
      .attr('y', y - gHeight);
    gripGroupEl
      .select('#resize-grip-w')
      .attr('x', x - gWidth)
      .attr('y', y + height / 2 - gHeight);
    gripGroupEl
      .select('#resize-grip-e')
      .attr('x', x + width - gWidth)
      .attr('y', y + height / 2 - gHeight);
    gripGroupEl
      .select('#resize-grip-sw')
      .attr('x', x - gWidth)
      .attr('y', y + height - gHeight);
    gripGroupEl
      .select('#resize-grip-s')
      .attr('x', x + width / 2 - gWidth)
      .attr('y', y + height - gHeight);
    gripGroupEl
      .select('#resize-grip-se')
      .attr('x', x + width - gWidth)
      .attr('y', y + height - gHeight);
  };
  // 更新添加多边形的顶点
  const updateAddPointPath = (curId: any) => {
    if (curShapePoints.current) return; // 绘制中

    let {
        attrs: { points },
        shape_type,
      } = allShapeJson.current?.[curId],
      curLen = points.length,
      curScale = curTransform?.current?.k || 1,
      tempPoints = [];

    for (let i = 0; i < curLen; i++) {
      let [x, y] = points[i];
      x = x * curScale;
      y = y * curScale;
      tempPoints[i] = [x, y];
    }

    let pointString = lineCreater.current(tempPoints);
    if (shape_type === 'polygon') {
      pointString += 'Z';
    }
    svgRoot.current.select('#path-add-point').attr('d', pointString);
  };
  // 更新射线（path最后一点与鼠标的连线）
  const updateStretchLine = (e: any) => {
    let points = curShapePoints.current || [],
      curLen = points.length;
    if (!isPathing.current || !curLen) return;

    let curScale = curTransform?.current?.k || 1,
      [startX, startY] = points[curLen - 1],
      [lastX, lastY] = getD3Posi(e);

    startX = startX * curScale;
    startY = startY * curScale;
    lastX = lastX * curScale;
    lastY = lastY * curScale;

    let stretchLinePoints = [
        [startX, startY],
        [lastX, lastY],
      ],
      pointString = lineCreater.current(stretchLinePoints);
    d3.select('#path-stretch-line').attr('d', pointString);
  };
  // 更新顶点的位置
  const updatePoint = (e?: any) => {
    if (!curShape.current || !curShape.current.attr('id')) return false;

    const curId = curShape.current.attr('id')?.substring(6),
      points =
        allShapeJson.current?.[curId]?.attrs?.points ||
        curShapePoints.current ||
        [],
      curLen = points.length,
      curScale = curTransform?.current?.k || 1;

    if (!curLen) return;

    updateAddPointPath(curId);

    // 手动调整point的scale
    for (let i = 0; i < curLen; i++) {
      let curEl = d3.select(`#path-point-group #path-point-${i + 1}`),
        [x, y] = points[i];

      x = x * curScale;
      y = y * curScale;
      curEl.attr('cx', x).attr('cy', y);
      if (isPathing.current || editPathId.current) {
        curEl.attr('display', 'inline');
      }
    }
    // 调整射线
    if (e) {
      updateStretchLine(e);
    }

    // 更新旋转中心点
    if (isPathing.current) return;
    const { rotate } = allShapeJson.current?.[curId];
    if (rotate) {
      const [rotateAngle, centerX, centerY] = rotate,
        gripCenterX = centerX * curScale, // 图形控制点的中心
        gripCenterY = centerY * curScale,
        newRotate = `rotate(${rotateAngle} ${gripCenterX},${gripCenterY})`;

      d3.select('#path-point-group').attr('transform', newRotate);
      d3.select('#path-add-point').attr('transform', newRotate);
      curShape.current.attr(
        'transform',
        `rotate(${rotateAngle} ${centerX},${centerY})`,
      );
    } else {
      d3.select('#path-point-group').attr('transform', null);
      d3.select('#path-add-point').attr('transform', null);
    }
  };

  // 更新网格尺寸位置
  const updateGrid = (force?: boolean) => {
    let showGrid = force ? props.showGrid : tempProps.current.showGrid;
    if (!showGrid) return;

    curTransform.current = curTransform.current || d3.zoomIdentity;
    if (curTransform.current.k < 1) {
      svgRoot.current.select('#grid').attr('display', 'none');
    } else {
      let { x: imgX, y: imgY, w: imgW, h: imgH } = curImgInfo.current,
        { k } = curTransform.current,
        curPatternSize = 10 * k,
        curPatternX = imgX * k,
        curPatternY = imgY * k;
      svgRoot.current
        .select('#gridPattern')
        .attr('width', curPatternSize)
        .attr('height', curPatternSize)
        .attr('x', curPatternX)
        .attr('y', curPatternY);

      svgRoot.current
        .select('#grid')
        .attr('display', 'inline')
        .attr('x', curPatternX)
        .attr('y', curPatternY)
        .attr('width', imgW * k)
        .attr('height', imgH * k);
    }
  };

  // 设置绘制图形颜色（指定标签）
  const setDrawColor = (labelParam?: any) => {
    const { curLabel, colorBindLabel }: any = tempProps.current,
      tempLabel = labelParam || curLabel;

    if (colorBindLabel) {
      const curLabelColor =
        labelColorJson.current[tempLabel] ||
        getRandomColor(labelColorJson.current);
      shapeInfo.shapeCommon.stroke = curLabelColor;
      shapeInfo.font.fill = curLabelColor;
      if (labelParam) {
        labelColorJson.current[tempLabel] = curLabelColor;
      }
    }
  };
  // 设置蒙版颜色
  const setMaskColor = (colorP: string) => {
    const color = colorP || shapeInfo.shapeCommon.stroke;
    return d3.color(color).copy({ opacity: 0.2 });
  };
  // 切换单个元素的颜色
  const changeSingleShapeColor = (id: any, color: string) => {
    const tempShape = d3.select(`#shape-${id}`);
    tempShape.attr('stroke', color);
    if (tempProps.current.showLabel) {
      svgRoot.current.select(`#shape-label-${id}`).attr('fill', color);
    }

    if (maskShapeId.current === 'shape-' + id) {
      tempShape.attr('fill', setMaskColor(color));
    }
  };
  // 切换色块（改变当前和以后的绘制）
  const changeColor = (color: string) => {
    const { colorBindLabel, curLabel: lastLabel } = tempProps.current;
    if (colorBindLabel) {
      if (selectShapeIds.current || !curShape.current) return;

      const curId = curShape.current.attr('id')?.substring(6),
        { label: curLabel } = allShapeJson.current?.[curId],
        lastLabelColor = labelColorJson.current[lastLabel];

      // 同标签变色
      Object.keys(allShapeJson.current)?.forEach((item) => {
        const { label } = allShapeJson.current[item];
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
      selectShapeIds.current?.forEach((item: any) => {
        changeSingleShapeColor(item, color);
      });
      return;
    }

    if (!curShape.current) return;
    const curId = curShape.current.attr('id')?.substring(6);
    changeSingleShapeColor(curId, color);
  };

  // 更新文本的位置
  const updateLabel = (
    curNum: any,
    showLabel: boolean,
    updateColor?: boolean,
  ) => {
    if (!showLabel) return;

    let curScale = curTransform?.current?.k || 1,
      { shape_type, attrs, rotate } = allShapeJson.current[curNum],
      curShapeLabel = svgRoot.current.select(`#shape-label-${curNum}`),
      x = 0,
      y = 0;

    if (shape_type === 'ellipse') {
      // 显示在最上正中
      let { cx, cy, ry } = attrs;
      x = cx;
      y = cy - ry;
    } else if (shape_type === 'rect') {
      ({ x, y } = attrs);
    } else {
      // 多边形。显示在最上最左的那个顶点上
      let { points } = attrs;
      [x, y] = points[0];
      for (let i = 1; i < points.length; i++) {
        const [curX, curY] = points[i];
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

    // 更新旋转中心点
    if (rotate) {
      const [rotateAngle, centerX, centerY] = rotate,
        gripCenterX = centerX * curScale, // 图形控制点的中心
        gripCenterY = centerY * curScale;

      curShapeLabel.attr(
        'transform',
        `rotate(${rotateAngle} ${gripCenterX},${gripCenterY})`,
      );
    }
  };
  const updateAllLabel = (force?: boolean) => {
    let showLabel = force ? props.showLabel : tempProps.current.showLabel;
    if (!showLabel) return;

    let shapeIds = Object.keys(allShapeJson.current);
    shapeIds?.forEach((item) => {
      updateLabel(item, showLabel);
    });
  };

  // 插入撤销栈，同时清空重做栈（add、move、del）
  const insertStack = (...arg: any) => {
    undoStack.current.push(arg);
    redoStack.current = [];
    // console.log(undoStack.current);
  };
  // 记录移动操作前的数据
  const recordBeforeMove = () => {
    let recordData: any = [],
      curJson: any = {};
    if (selectShapeIds.current) {
      let curDom: any = {};
      selectShapeIds.current?.forEach((item: string | number) => {
        let curShape = d3.select(`#shape-${item}`);
        curJson[item] = JSON.parse(JSON.stringify(allShapeJson.current[item]));
        curDom[item] = curShape;
      });
      recordData = [selectShapeIds.current, curJson, curDom];
    } else if (curShape.current) {
      let curNum = curShape.current?.attr('id')?.substring(6);
      curJson[curNum] = JSON.parse(
        JSON.stringify(allShapeJson.current[curNum]),
      );
      recordData = [curShape.current, curJson];
    }
    return recordData;
  };
  // 修改位置、尺寸前记录初始数据
  const recordStartInfo = (e: any) => {
    let curShapeId = curShape.current?.attr('id')?.substring(6),
      { attrs, shape_type, rotate } = allShapeJson.current?.[curShapeId];

    startInfo.current = attrs;
    if (shape_type === 'polygon' || shape_type === 'line') {
      startInfo.current.boundRect = curShape.current?.node()?.getBBox();
      startInfo.current.close = shape_type === 'polygon';
    }
    // 计算旋转后的坐标
    let posi = getD3Posi(e); // 鼠标位置
    if (rotate) {
      const [rotateAngle, curCenterX, curCenterY] = rotate;
      posi = getAfterRotate(...posi, curCenterX, curCenterY, rotateAngle, true);
    }
    [startInfo.current.mx, startInfo.current.my] = posi;
  };

  // 获取外部需要的标注数据（相对于图片）
  const getMarkData = () => {
    // console.log(allShapeJson.current);
    const shapeIds = Object.keys(allShapeJson.current),
      res: any = [],
      { x: imgX, y: imgY, scale: imgScale } = curImgInfo.current;
    shapeIds?.forEach((shapeId: any) => {
      const { attrs, label, shape_type, hide, rotate }: any =
          allShapeJson.current[shapeId],
        curAttrs: any = {};

      curAttrs['label'] = label || shapeId;
      curAttrs['shape_type'] = shape_type;
      curAttrs['attrs'] = {};
      curAttrs['hide'] = hide || false;
      curAttrs['id'] = shapeId;
      if (rotate) {
        curAttrs['rotate'] = rotate[0];
      }

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
        // path
        curAttrs['attrs']['points'] = [];
        attrs['points']?.forEach((item: number[], index: string | number) => {
          curAttrs['attrs']['points'][index] = [
            (item[0] - imgX) * imgScale,
            (item[1] - imgY) * imgScale,
          ];
        });
      }

      res.push(curAttrs);
    });
    // console.log('size', res);
    return res;
  };

  // 动态设置光标（default箭头、pointer手、crosshair十字、move、grab拖拽手）（注：鼠标按下后无法修改cursor）
  const setCursor = (event: any) => {
    const target = event?.target || event?.srcElement,
      curShapeId = d3.select(target).attr('id');
    let curCursor = null,
      { drawTool }: any = tempProps.current;

    if (selectedGripId.current || selectedPointId.current) {
      curCursor = 'crosshair';
    } else if (
      (isCtrlKey.current && !isShiftKey.current && !isAltKey.current) ||
      drawTool === 'drag'
    ) {
      // 拖拽整体（ctrl快捷拖动）
      curCursor = 'grab';
    } else if (curShapeId === 'path-add-point') {
      // 添加顶点
      curCursor = 'pointer';
    } else if (
      (curShape.current &&
        !isPathing.current &&
        maskShapeId.current === curShapeId) ||
      (selectShapeIds.current &&
        selectShapeIds.current.includes(curShapeId?.substring(6)))
    ) {
      curCursor = 'move';
    } else if (!drawTool || drawTool === 'move') {
      curCursor = 'default';
    }

    d3.select(curDom.current).style('cursor', curCursor);
  };
  // 更新瞄准线
  const updateCrosshair = (e: any) => {
    if (!tempProps.current.showCrosshair) return;
    svgRoot.current.select('#crosshair-v-line').attr('x', e.layerX);
    svgRoot.current.select('#crosshair-h-line').attr('y', e.layerY);
  };

  // 添加多选外框（0开始）
  const addSelectPath = (index: any) => {
    let curShapePath = d3.select(`#shape-path-group #shape-path-${index}`);
    if (!curShapePath.node()) {
      curShapePath = d3
        .select('#shape-path-group')
        .append('path')
        .attr('id', `shape-path-${index}`)
        .style('pointer-events', 'none');
      let lineAttrs = shapeInfo['line'];
      Object.keys(lineAttrs).forEach((key) => {
        curShapePath.attr(key, lineAttrs[key]);
      });
    } else {
      curShapePath.attr('display', 'inline').attr('transform', null);
    }
    return curShapePath;
  };
  // 更新选中图形的外框
  const updateSelectPath = () => {
    const curScale = curTransform?.current?.k || 1;
    selectShapeIds.current?.forEach((item: any, index: any) => {
      let curShape = d3.select(`#shape-${item}`),
        { x, y, width, height } = curShape.node().getBBox(),
        curShapePath = addSelectPath(index);

      x = x * curScale || 0;
      y = y * curScale || 0;
      width = width * curScale || 0;
      height = height * curScale || 0;

      const points = [
          [x - 2, y - 2],
          [x + width + 2, y - 2],
          [x + width + 2, y + height + 2],
          [x - 2, y + height + 2],
        ],
        pointString = lineCreater.current(points);
      curShapePath.attr('d', pointString + 'Z');

      // 更新旋转中心点
      const { rotate } = allShapeJson.current?.[item];
      if (rotate) {
        const [rotateAngle, centerX, centerY] = rotate,
          gripCenterX = centerX * curScale, // 图形控制点的中心
          gripCenterY = centerY * curScale;

        curShape.attr(
          'transform',
          `rotate(${rotateAngle} ${centerX},${centerY})`,
        );
        curShapePath.attr(
          'transform',
          `rotate(${rotateAngle} ${gripCenterX},${gripCenterY})`,
        );
      }
    });
  };

  // 选中图形，添加蒙版
  const getSelectIds = () => {
    if (selectShapeIds.current?.length) return selectShapeIds.current;
    if (curShape.current) return [curShape.current?.attr('id')?.substring(6)];
    return [];
  };
  const selectShape = (targetP: any, isShiftKeyP: boolean) => {
    let isShiftKey = isShiftKeyP,
      target = targetP;

    let curTargetId = '',
      curShapeId = '';
    if (target instanceof Array) {
      // 外部直接选中
      selectShapeIds.current = target;
      isShiftKey = true;
    } else if (typeof target === 'string') {
      curTargetId = 'shape-' + target;
      target = svgRoot.current.select(`#${curTargetId}`);
    } else {
      curTargetId = target?.attr('id');
      curShapeId = curShape.current?.attr('id');
    }

    // console.log(22, curTargetId, curShapeId, selectShapeIds.current);
    if (
      isShiftKey &&
      ((curShapeId && curTargetId !== curShapeId) || selectShapeIds.current)
    ) {
      // 多选
      curShape.current = null;
      curTargetId = curTargetId?.substring(6);

      if (!selectShapeIds.current) {
        // console.log(1);
        curShapeId = curShapeId?.substring(6);
        selectShapeIds.current = [curTargetId, curShapeId];
        tempProps.current.changeSelect(getSelectIds());
      } else if (curTargetId) {
        // console.log(2);
        let curIdIndex = selectShapeIds.current.indexOf(curTargetId);
        if (curIdIndex >= 0) {
          selectShapeIds.current.splice(curIdIndex, 1);
          if (!selectShapeIds.current?.length) {
            selectShapeIds.current = null;
          }
        } else {
          selectShapeIds.current.push(curTargetId);
        }
        tempProps.current.changeSelect(getSelectIds());
      } else {
        tempProps.current.changeSelect(getSelectIds());
      }

      selectShapeIds.current?.forEach((item: any, index: any) => {
        addSelectPath(index);
      });
      delEditStatus();
      updateSelectPath();

      // console.log(selectShapeIds.current);
      return;
    }

    // console.log(666);
    curShape.current = target;
    d3.selectAll('#shape-path-group *')?.attr('display', 'none');
    selectShapeIds.current = null;

    let { shape_type, hide } =
      allShapeJson.current?.[curTargetId?.substring(6)];

    if (maskShapeId.current) {
      // 将旧的蒙版去掉
      d3.select('#' + maskShapeId.current).attr(
        'fill',
        shapeInfo.shapeCommon.fill,
      );
    }
    if (maskShapeId.current === curTargetId) {
      maskShapeId.current = '';
      if (shape_type === 'line' || shape_type === 'polygon') {
        editPathId.current = '';
        svgRoot.current
          .selectAll('#path-point-group circle,#path-add-point')
          .attr('display', 'none');
        updateGrip();
      }
    } else if (maskShapeId.current !== curTargetId) {
      maskShapeId.current = curTargetId;
      target.attr('fill', setMaskColor(target.attr('stroke')));
      if (shape_type === 'line' || shape_type === 'polygon') {
        editPathId.current = curTargetId;
        svgRoot.current
          .selectAll('#path-point-group circle,#shape-grip-group')
          ?.attr('display', 'none');
        if (hide) {
          svgRoot.current.select('#path-add-point')?.attr('display', 'none');
        } else {
          svgRoot.current.select('#path-add-point')?.attr('display', 'inline');
          updatePoint();
        }
      } else {
        editPathId.current = '';
        svgRoot.current
          .selectAll('#path-point-group circle,#path-add-point')
          .attr('display', 'none');
        updateGrip();
      }
    }
    tempProps.current.changeSelect(getSelectIds());
  };

  // 删除图形
  const delShape = (targetP?: any) => {
    let target = targetP || curShape.current;
    if (!target) return;
    delEditStatus();

    let curNum = target.attr('id')?.substring(6),
      curIndex = drawNumArr.current.indexOf(curNum);
    drawNumArr.current.splice(curIndex, 1);

    target?.remove();
    svgRoot.current.select(`#shape-label-${curNum}`)?.attr('display', 'none');
    curShape.current = null;
    curShapePoints.current = null;
    delete allShapeJson.current?.[curNum];
  };
  const delSelectShape = (record = true) => {
    let curJson: any = {};
    if (selectShapeIds.current) {
      let curDom: any = {};
      selectShapeIds.current?.forEach((item: string | number) => {
        let curShape = d3.select(`#shape-${item}`);
        curJson[item] = JSON.parse(JSON.stringify(allShapeJson.current[item]));
        curDom[item] = curShape;
        delShape(curShape);
      });
      // 操作记录
      if (record) {
        insertStack('del', selectShapeIds.current, curJson, curDom);
      }
      selectShapeIds.current = null;
      tempProps.current.changeSize(getMarkData());
      tempProps.current.changeSelect(getSelectIds());
      return [curJson, curDom];
    }
    if (!curShape.current) return;
    // 操作记录
    let curNum = curShape.current.attr('id')?.substring(6);
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
  const delPoint = () => {
    if (!selectedPointId.current || !curShape.current) return;
    let curId = curShape.current.attr('id')?.substring(6),
      {
        attrs: { points },
        shape_type,
      } = allShapeJson.current?.[curId] || {},
      curLen = points.length,
      curJson: any = {}; // 操作记录

    curJson[curId] = JSON.parse(JSON.stringify(allShapeJson.current[curId]));

    if (curLen <= 2) {
      insertStack('del', curShape.current, curJson);
      delShape();
      delEditStatus();
      return;
    }
    insertStack('edit', curShape.current, curJson);

    d3.select(`#path-point-group #path-point-${curLen}`).attr(
      'display',
      'none',
    );
    d3.select(`#path-point-group #path-point-${selectedPointId.current}`).attr(
      'fill',
      shapeInfo['point'].fill,
    );
    points.splice(selectedPointId.current - 1, 1);
    selectedPointId.current = null;

    let pointString = lineCreater.current(points);
    if (shape_type === 'polygon') {
      pointString += 'Z';
    }
    curShape.current.attr('d', pointString);

    updateLabel(curId, tempProps.current.showLabel);
    updatePoint();
  };

  // 根据数据修改图形大小、位置
  const editShapeFromJson = (target: any, curJson: any) => {
    let { shape_type, attrs, rotate } = curJson;
    if (shape_type === 'rect' || shape_type === 'ellipse') {
      let curAttrs = Object.keys(attrs);
      curAttrs?.forEach((item) => {
        target.attr(item, attrs[item]);
      });
    } else {
      let { points } = attrs,
        pointString = lineCreater.current(points);
      if (shape_type === 'polygon') {
        pointString += 'Z';
      }
      target.attr('d', pointString);
    }

    if (rotate) {
      target.attr(
        'transform',
        `rotate(${rotate[0]} ${rotate[1]},${rotate[2]})`,
      );
    } else {
      target.attr('transform', null);
    }
  };

  // 执行撤销、重做
  const popStack = (cmd: any) => {
    let [type, ...arg] = cmd || [],
      [target, curJson, domArr] = arg,
      recordData: any = [];
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
        target?.forEach((item) => {
          drawNumArr.current.splice(item - 1, 0, +item);
          svgRoot.current
            .select(`#shape-label-${item}`)
            ?.attr('display', 'inline');
          svgRoot.current.select('#shape').insert(() => {
            return domArr[item].node();
          });
        });
      } else {
        let curNum: any = Object.keys(curJson)?.[0];
        drawNumArr.current.splice(curNum - 1, 0, curNum);
        svgRoot.current
          .select(`#shape-label-${curNum}`)
          ?.attr('display', 'inline');
        svgRoot.current.select('#shape').insert(() => {
          return target.node();
        });
      }
      allShapeJson.current = Object.assign({}, allShapeJson.current, curJson);
      // return [target];
    } else if (type === 'edit') {
      // 位移、尺寸变化-》还原
      let recordJson: any = {};
      if (target instanceof Array) {
        target?.forEach((item) => {
          recordJson[item] = JSON.parse(
            JSON.stringify(allShapeJson.current[item]),
          );
          editShapeFromJson(domArr[item], curJson[item]);
        });
        recordData = [recordJson, domArr];
      } else {
        let curNum = target.attr('id')?.substring(6);
        recordJson[curNum] = JSON.parse(
          JSON.stringify(allShapeJson.current[curNum]),
        );
        editShapeFromJson(target, Object.values(curJson)?.[0]);
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
    return [target, ...recordData];
  };

  // 撤销操作（相反操作）
  const undoSvg = () => {
    if (!undoStack.current.length) return;

    let cmd = undoStack.current.pop(),
      [type] = cmd || [],
      recordData = popStack(cmd);

    if (type === 'add') {
      // 新增图形-》删除
      redoStack.current.push(['del', ...recordData]);
      return;
    } else if (type === 'del') {
      // 删除图形-》新增
      redoStack.current.push(['add', ...recordData]);
    } else if (type === 'edit') {
      // 位移、尺寸变化-》还原
      redoStack.current.push([type, ...recordData]);
    }
  };
  // 重做操作
  const redoSvg = () => {
    if (!redoStack.current.length) return;

    let cmd = redoStack.current.pop(),
      [type] = cmd || [],
      recordData = popStack(cmd);

    if (type === 'add') {
      // let [curEl, curGroup, curNum] = arg,
      //   curPosi = this.getInsertNum(curGroup, curNum);
      // this.svgRoot.select(`#shape-${curGroup}`).insert(() => {
      //   return curEl.node();
      // }, `g:nth-child(${curPosi})`);
      // curEl.select(":last-child").attr('fill', this.shapeInfo.shapeCommon.fill);
      // this.calcCurNum(true, curGroup, curNum, curPosi - 1);

      undoStack.current.push(['del', ...recordData]);
    } else if (type === 'del') {
      undoStack.current.push(['add', ...recordData]);
      return;
    } else if (type === 'edit') {
      undoStack.current.push([type, ...recordData]);
    }
  };

  // 移动图形
  const moveShape = (diff: any, targetP?: any) => {
    const target = targetP || curShape.current;
    if (!target) return;

    let { showLabel }: any = tempProps.current,
      [diffX, diffY] = diff,
      curShapeId = target?.attr('id')?.substring(6),
      {
        attrs: startInfo,
        shape_type,
        rotate,
      } = allShapeJson.current[curShapeId],
      finalBox = {};

    if (shape_type === 'rect') {
      let { x, y, width, height } = startInfo;
      x += diffX;
      y += diffY;
      target.attr('x', x).attr('y', y);

      finalBox = { x, y, width, height };
    } else if (shape_type === 'ellipse') {
      let { cx, cy, rx, ry } = startInfo;
      cx += diffX;
      cy += diffY;
      target.attr('cx', cx).attr('cy', cy);

      finalBox = { cx, cy, rx, ry };
    } else {
      // path
      let { points } = startInfo,
        close = shape_type === 'polygon' ? true : false,
        len = points?.length || 0,
        newPoints: any = [];
      for (let i = 0; i < len; i++) {
        let [x, y] = points[i];
        x += diffX;
        y += diffY;
        newPoints[i] = [x, y];
      }
      let pointString = lineCreater.current(newPoints);
      target.attr('d', pointString + (close ? 'Z' : ''));

      finalBox = { points: newPoints };
      newPoints = null;
    }

    // 更新旋转中心
    if (rotate) {
      const { x, y, width, height } = target?.node()?.getBBox(),
        centerX = x + width / 2, // 图形的中心
        centerY = y + height / 2;
      allShapeJson.current[curShapeId].rotate[1] = centerX;
      allShapeJson.current[curShapeId].rotate[2] = centerY;
    }
    allShapeJson.current[curShapeId].attrs = finalBox;
    if (selectShapeIds.current) {
      updateSelectPath();
    } else if (shape_type === 'rect' || shape_type === 'ellipse') {
      updateGrip();
    } else {
      updatePoint();
    }
    updateLabel(curShapeId, showLabel);
    return;
  };
  const moveSelectShape = (diff: any) => {
    if (selectShapeIds.current) {
      selectShapeIds.current?.forEach((item: any) => {
        let curShape = d3.select(`#shape-${item}`);
        moveShape(diff, curShape);
      });
      return;
    }
    moveShape(diff);
  };

  // 添加label文本
  const addLabel = (curNum: any, curLabel: string, middle: boolean) => {
    let curShape = svgRoot.current.select(`#shape-label-${curNum}`),
      { showLabel }: any = tempProps.current;
    if (curShape.node()) {
      curShape.text(curLabel).attr('display', 'inline');
      updateLabel(curNum, showLabel, true);
      return;
    }
    let curText = svgRoot.current
        .select('#shape-label-group')
        .append('text')
        .attr('id', `shape-label-${curNum}`)
        .style('user-select', 'none')
        .text(curLabel),
      textAttrs = Object.assign({}, shapeInfo['font']);
    if (middle) {
      textAttrs['text-anchor'] = 'middle';
    }
    Object.keys(textAttrs).forEach((key) => {
      curText.attr(key, textAttrs[key]);
    });
    updateLabel(curNum, showLabel);
  };

  // 旋转图形
  const rotateShape = (posi: any) => {
    if (!curShape.current) return;

    const curShapeId = curShape.current?.attr('id')?.substring(6),
      { centerX, centerY, gripCenterX, gripCenterY } =
        getRotateCenter(curShapeId),
      diffX = posi[0] - centerX,
      diffY = centerY - posi[1];
    let rotateAngle = (Math.atan2(diffY, diffX) * 180) / Math.PI; // 两点之间的倾斜角。
    // 正常坐标系（上90，右0，下-90，左180度），改为（上0，下180，左正，右负）
    if (rotateAngle < -90) {
      rotateAngle = -270 - rotateAngle;
    } else {
      rotateAngle = 90 - rotateAngle;
    }

    curShape.current.attr(
      'transform',
      `rotate(${rotateAngle} ${centerX},${centerY})`,
    );
    svgRoot.current
      .select('#shape-grip-group')
      .attr(
        'transform',
        `rotate(${rotateAngle} ${gripCenterX},${gripCenterY})`,
      );
    if (tempProps.current.showLabel) {
      svgRoot.current
        .select(`#shape-label-${curShapeId}`)
        .attr(
          'transform',
          `rotate(${rotateAngle} ${gripCenterX},${gripCenterY})`,
        );
    }

    allShapeJson.current[curShapeId].rotate = [rotateAngle, centerX, centerY];
  };

  // 拖拽移动图形/整体、grip变更图形、point变更path
  const dragChange = (type: any, ...params: any) => {
    // console.log(8, type);
    let [e, curTarget] = params,
      posi = getD3Posi(e),
      diffX = posi[0] - startInfo.current.mx,
      diffY = posi[1] - startInfo.current.my;

    // 拖拽grip（8个方向拖拽点）
    if (type === 'moveGrip') {
      let curDir = '',
        curShapeId = curShape.current?.attr('id')?.substring(6),
        { shape_type, rotate } = allShapeJson.current?.[curShapeId];

      // 获取旋转后的差值
      if (rotate) {
        const [rotateAngle, curCenterX, curCenterY] = rotate;
        posi = getAfterRotate(
          ...posi,
          curCenterX,
          curCenterY,
          rotateAngle,
          true,
        );
        diffX = posi[0] - startInfo.current.mx;
        diffY = posi[1] - startInfo.current.my;
      }

      if (selectedGripId.current) {
        curDir = selectedGripId.current.substring(12);
      } else {
        curDir = curTarget.attr('id').substring(12);
      }

      let finalBox = dragGrip(
        shape_type,
        isShiftKey.current,
        curDir,
        diffX,
        diffY,
        startInfo.current,
      );
      if (shape_type === 'polygon' || shape_type === 'line') {
        let pointString = lineCreater.current(finalBox.points);
        curShape.current.attr(
          'd',
          pointString + (startInfo.current.close ? 'Z' : ''),
        );
      } else {
        Object.keys(finalBox).forEach((key) => {
          curShape.current.attr(key, finalBox[key]);
        });
      }

      allShapeJson.current[curShapeId].attrs = finalBox;
      updateGrip();
      updateLabel(curShapeId, tempProps.current.showLabel);

      if (selectedGripId.current && rotate) {
        updateRotateCenter();
        d3.select('#' + selectedGripId.current).attr(
          'fill',
          shapeInfo['grip'].fill,
        );
        selectedGripId.current = null;
      }
      return;
    }

    // 拖拽图形
    if (type === 'moveShape') {
      moveSelectShape([e.dx, e.dy]);
      return;
    }

    // 拖拽整体
    if (type === 'moveWhole') {
      curTransform.current = curTransform.current.translate(diffX, diffY);

      d3.zoom().transform(svgRoot.current, curTransform.current);
      svgRoot.current
        .selectAll('g.layer')
        .attr('transform', curTransform.current);
      svgRoot.current
        .selectAll('g#shape-related-group')
        .attr(
          'transform',
          `translate(${curTransform.current?.x},${curTransform.current?.y})`,
        );
      updateGrid();
      return;
    }

    // 拖动path的控制点
    if (type === 'movePoint') {
      let curIndex: any = '',
        curShapeId = curShape.current?.attr('id')?.substring(6),
        {
          attrs: { points },
          shape_type,
        } = allShapeJson.current[curShapeId],
        curScale = curTransform?.current?.k || 1,
        close = shape_type === 'polygon' ? true : false;

      if (selectedPointId.current) {
        curIndex = selectedPointId.current;
      } else {
        curIndex = curTarget.attr('id').substring(11);
      }

      // points[curIndex - 1] = posi;
      // 更新旋转后坐标
      let curPoint = points[curIndex - 1];
      curPoint[0] = curPoint[0] + e.dx / curScale;
      curPoint[1] = curPoint[1] + e.dy / curScale;
      points[curIndex - 1] = curPoint;

      allShapeJson.current[curShapeId].attrs = { points };
      const pointString = lineCreater.current(points);
      curShape.current.attr('d', pointString + (close ? 'Z' : ''));

      updatePoint();
      updateLabel(curShapeId, tempProps.current.showLabel);
      return;
    }

    // 拖拽rotate旋转点
    if (type === 'moveRotate') {
      rotateShape(posi);
      return;
    }
  };

  // 进入path的顶点范围，判断能否进行闭合、移动
  const changePointStatus = (event: any) => {
    let target = event?.target || event?.srcElement,
      curId = d3.select(target).attr('id'),
      points = curShapePoints.current || [],
      curLen = points.length;
    d3.selectAll('#path-point-group circle').attr('r', shapeInfo['point'].r);

    if (event.type === 'touchstart' || event.type === 'mouseenter') {
      if (isPathing.current) {
        if (curId !== 'path-point-1' || curLen < 3) return;
      }
      d3.select(`#${curId}`).attr('r', 6);
      d3.select(target).style('cursor', 'pointer');
    } else {
      d3.select(target).style('cursor', null);
    }
  };
  // 添加多边形的顶点展示
  const addPoint = (curId: any, curIndex: number, show = true) => {
    let pointCont = d3.select('#path-point-group'),
      oldPoints = pointCont.selectAll('circle'),
      oldLen = oldPoints.size(), // 此前path顶点最多的数量
      pointAttrs = shapeInfo['point'];
    if (!oldLen || oldLen <= curIndex) {
      let firstPoint = pointCont
        .append('circle')
        .attr('id', curId)
        .call(initDrag('point', dragChange));
      firstPoint.on(
        'touchstart touchend mouseenter mouseleave',
        changePointStatus,
      );
      Object.keys(pointAttrs).forEach((key) => {
        firstPoint.attr(key, pointAttrs[key]);
      });
      firstPoint.attr('display', show ? 'inline' : 'none');
      return firstPoint;
    }
    return d3.select('#' + curId).attr('display', show ? 'inline' : 'none');
  };
  // 多边形在单击位置插入顶点
  const insertPoint = (event: any) => {
    let posi = getD3Posi(event),
      curId = maskShapeId.current.substring(6),
      {
        attrs: { points },
        shape_type,
        rotate,
      } = allShapeJson.current?.[curId],
      curLen = points.length,
      nearestIndex = -1, // 计算最近的边
      nearestDistance = Infinity,
      curJson: any = {}; // 操作记录

    curJson[curId] = JSON.parse(JSON.stringify(allShapeJson.current[curId]));
    insertStack('edit', curShape.current, curJson);

    // 获取旋转后的点
    if (rotate) {
      const [rotateAngle, curCenterX, curCenterY] = rotate;
      posi = getAfterRotate(...posi, curCenterX, curCenterY, rotateAngle, true);
    }

    for (let i = 0; i < curLen; i++) {
      let j = (i + 1) % curLen, // 下一个坐标
        p1 = points[i],
        p2 = points[j],
        distance = pointToLineDistance(posi, p1, p2);

      if (distance < nearestDistance) {
        nearestIndex = j;
        nearestDistance = distance;
      }
    }
    points.splice(nearestIndex, 0, posi);

    let pointString = lineCreater.current(points);
    if (shape_type === 'polygon') {
      pointString += 'Z';
    }
    curShape.current.attr('d', pointString);

    // 更新旋转中心
    updateRotateCenter();

    let curPointId = `path-point-${curLen + 1}`;
    addPoint(curPointId, curLen);

    updatePoint();
  };

  // 完成path绘制（close是否闭合）
  const endClickDraw = (close?: boolean) => {
    d3.select('#path-stretch-line')?.attr('display', 'none');

    let curPathString = curShape.current.attr('d');
    if (close) {
      curShape.current.attr('d', curPathString + 'Z');
    }

    let curNum = curShape.current.attr('id')?.substring('6'), // 当前默认编号
      { curLabel, colorBindLabel }: any = tempProps.current;
    if (colorBindLabel && curLabel && !labelColorJson.current[curLabel]) {
      labelColorJson.current[curLabel] = shapeInfo.shapeCommon.stroke;
      tempProps.current.changeBindColor(labelColorJson.current);
    }
    curLabel = curLabel || curNum;
    allShapeJson.current[curNum] = {
      shape_type: close ? 'polygon' : 'line',
      label: curLabel,
      attrs: { points: curShapePoints.current },
    };
    // isPathing.current = false;
    curShapePoints.current = null;
    // console.log(allShapeJson.current);

    editPathId.current = `shape-${curNum}`;
    maskShapeId.current = editPathId.current;
    d3.select('#' + maskShapeId.current).attr(
      'fill',
      setMaskColor(curShape.current.attr('stroke')),
    );

    tempProps.current.changeSize(getMarkData());
    tempProps.current.changeSelect(getSelectIds());
    addLabel(curNum, curLabel, true);

    svgRoot.current.select('#path-add-point').attr('display', 'inline');
    updateAddPointPath(curNum);

    insertStack('add', curShape.current);
    tempProps.current.endDraw({ id: curNum, label: curLabel });
  };
  // 开始单击绘制（多边形、线段）
  const clickDraw = (e: any, drawTool: string, eType: string, target: any) => {
    let sourceE = e?.sourceEvent || e,
      pathingPoints = curShapePoints.current || [],
      curLen = pathingPoints?.length; // 正在绘制的线

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
    if (
      eType === 'point' &&
      target.attr('id') === 'path-point-1' &&
      curLen >= 3
    ) {
      endClickDraw(true);
      return;
    }

    let pointCont = d3.select('#path-point-group').attr('transform', null),
      oldPoints = pointCont.selectAll('circle'), // 此前path顶点最多的数量
      oldLen = oldPoints.size(),
      [x, y] = getD3Posi(e),
      lineAttrs = shapeInfo['line']; // 辅助线

    // 创建图形、修改图形
    if (!curLen) {
      // 初始创建
      isPathing.current = true;
      delEditStatus();
      d3.select('#path-stretch-line')?.attr('display', 'inline');
      // 设置颜色
      setDrawColor();
      let shapeAttrs = Object.assign(
        {},
        shapeInfo.shapeCommon,
        shapeInfo[drawTool],
      );

      curShape.current = svgCont.current
        .select('#shape')
        .append(drawTool)
        .call(initDrag('shape', dragChange));
      let curNum = getCurNum(); // 当前默认编号
      curShape.current.attr('id', `shape-${curNum}`);
      Object.keys(shapeAttrs).forEach((key) => {
        curShape.current.attr(key, shapeAttrs[key]);
      });

      // 记录坐标
      curShapePoints.current = [[x, y]];
    } else {
      // 修改
      curShapePoints.current.push([x, y]);

      let pointString = lineCreater.current(curShapePoints.current);
      curShape.current.attr('d', pointString);
    }

    // 第一次绘制path，添加待确定的点跟随鼠标的连线
    if (!oldLen || !pointCont.select('#path-stretch-line').size()) {
      pointCont
        .append('path')
        .attr('id', 'path-stretch-line')
        .style('pointer-events', 'none');
      Object.keys(lineAttrs).forEach((key) => {
        d3.select('#path-stretch-line').attr(key, lineAttrs[key]);
      });
    }

    // 添加顶点、修改顶点
    let curId = `path-point-${curLen + 1}`;
    addPoint(curId, curLen);

    let curScale = curTransform?.current?.k || 1,
      cx = x * curScale,
      cy = y * curScale;
    d3.select('#' + curId)
      .attr('cx', cx)
      .attr('cy', cy);
    // 调整射线
    updateStretchLine(e);
  };

  // 鼠标移动事件
  const mouseMove = (event: any) => {
    setCursor(event);
    updateCrosshair(event);

    updateStretchLine(event);
  };

  // 单击画布
  const clickCanvas = (type: string, event: any, target: any) => {
    let { drawTool } = tempProps.current;
    if (!drawTool || event.defaultPrevented) return;

    // console.log('');
    // console.log(1, type, '----click select');

    // 单击控制点，切换控制点选中状态
    if (type === 'grip') {
      let curId = target.attr('id');

      if (selectedGripId.current) {
        // 将旧的选中还原
        d3.select('#' + selectedGripId.current).attr(
          'fill',
          shapeInfo['grip'].fill,
        );
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
      let recordData: any = recordBeforeMove();
      insertStack('edit', ...recordData);
      recordData = null;

      dragChange('moveGrip', event, target);
      tempProps.current.changeSize(getMarkData());
      return;
    }

    // 单击顶点选中，切换控制点选中状态
    if (type === 'point') {
      let curId = target.attr('id').substring(11);

      if (selectedPointId.current) {
        // 将旧的选中还原
        d3.select('#path-point-' + selectedPointId.current).attr(
          'fill',
          shapeInfo['point'].fill,
        );
      }
      if (selectedPointId.current === curId) {
        selectedPointId.current = null;
      } else {
        selectedPointId.current = curId;
        target.attr('fill', '#ff0'); // 选中的颜色

        // 记录当前数据
        recordStartInfo(event);
      }
      return;
    }
    // 有顶点被选中，单击其他任何地方都是切换尺寸
    if (selectedPointId.current) {
      // 记录移动操作前的数据
      let recordData: any = recordBeforeMove();
      insertStack('edit', ...recordData);
      recordData = null;

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
      selectShape(target, isShiftKey.current || event?.sourceEvent?.shiftKey);
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
  const endMoveDraw = () => {
    // console.log('stop', e);
    if (!curShape.current || !isDrawing.current) return false;

    isDrawing.current = false;

    delEditStatus();

    let ifMini = delShapeIfMini();
    if (ifMini) return false;

    let { drawTool, curLabel, colorBindLabel }: any = tempProps.current,
      curNum = getCurNum(); // 当前默认编号
    if (colorBindLabel && curLabel && !labelColorJson.current[curLabel]) {
      labelColorJson.current[curLabel] = shapeInfo.shapeCommon.stroke;
      tempProps.current.changeBindColor(labelColorJson.current);
    }
    curLabel = curLabel || curNum;
    curShape.current.attr('id', `shape-${curNum}`);

    allShapeJson.current[curNum] = {
      shape_type: drawTool,
      label: curLabel,
      attrs: curShapePoints.current,
    };
    curShapePoints.current = null;

    updateGrip();

    tempProps.current.changeSize(getMarkData());
    addLabel(curNum, curLabel, drawTool === 'ellipse');

    insertStack('add', curShape.current);
    tempProps.current.endDraw({ id: curNum, label: curLabel });
  };

  // 开始绘制框选图形
  const startSelect = (e: any) => {
    let posi = getD3Posi(e);

    isDrawing.current = true;
    curShape.current = null;

    delEditStatus();
    [startInfo.current.x, startInfo.current.y] = posi;
    d3.select('#shape-selector')
      .attr('display', 'inline')
      .attr('x', posi[0])
      .attr('y', posi[1])
      .attr('width', 0)
      .attr('height', 0);
    return false;
  };
  // 判断元素是否进入框选区域
  const selectNodesInRange = () => {
    let selectBox = d3.select('#shape-selector').node().getBoundingClientRect(),
      shapeIds = Object.keys(allShapeJson.current),
      selectIds: any = [],
      curScale = curTransform?.current?.k || 1;

    shapeIds?.forEach((item) => {
      let curShape = d3.select(`#shape-${item}`),
        curLen = selectIds.length,
        curShapePath = d3.select(`#shape-path-group #shape-path-${curLen}`),
        curShapeInfo = curShape.node().getBoundingClientRect(),
        shapeInRange =
          curShapeInfo.bottom > selectBox.top &&
          curShapeInfo.top < selectBox.bottom &&
          curShapeInfo.left < selectBox.right &&
          curShapeInfo.right > selectBox.left;

      if (shapeInRange) {
        // 进入范围边框的变色
        selectIds.push(item);

        let { x, y, width, height } = curShape.node().getBBox();

        if (!curShapePath.node()) {
          curShapePath = addSelectPath(curLen);
        } else {
          curShapePath.attr('display', 'inline').attr('transform', null);
        }
        x = x * curScale || 0;
        y = y * curScale || 0;
        width = width * curScale || 0;
        height = height * curScale || 0;

        const points = [
            [x - 2, y - 2],
            [x + width + 2, y - 2],
            [x + width + 2, y + height + 2],
            [x - 2, y + height + 2],
          ],
          pointString = lineCreater.current(points);
        curShapePath.attr('d', pointString + 'Z');

        // 更新旋转中心点
        const { rotate } = allShapeJson.current?.[item];
        if (rotate) {
          const [rotateAngle, centerX, centerY] = rotate,
            gripCenterX = centerX * curScale, // 图形控制点的中心
            gripCenterY = centerY * curScale;
          curShapePath.attr(
            'transform',
            `rotate(${rotateAngle} ${gripCenterX},${gripCenterY})`,
          );
        }
      } else {
        curShapePath?.attr('display', 'none');
      }
    });
    selectShapeIds.current = selectIds?.length && selectIds;
  };
  // 移动绘制框选图形
  const moveSelect = (e: any) => {
    if (!isDrawing.current) return false;

    // svgRoot.current.attr("shape-rendering", "crispEdges");

    let posi = getD3Posi(e),
      { x, y } = startInfo.current,
      moveX = posi[0] - x,
      moveY = posi[1] - y,
      curScale = curTransform?.current?.k || 1;

    let width = Math.abs(moveX),
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
    d3.select('#shape-related-group #shape-selector')
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height);
    selectNodesInRange();
    return false;
  };
  // 结束绘制框选图形
  const endSelect = () => {
    if (!isDrawing.current) return false;
    isDrawing.current = false;
    // svgRoot.current.attr("shape-rendering", null);
    d3.selectAll('#shape-related-group #shape-selector').attr(
      'display',
      'none',
    );
  };

  // 根据当前工具、鼠标位置、图形状态获取当前的操作
  const getCurOpera = (eType: string, drawTool: string, target: any) => {
    if (eType === 'grip') {
      // 移动控制点
      return 'moveGrip';
    }
    if (eType === 'rotate') {
      // 移动旋转点
      return 'moveRotate';
    }
    if (eType === 'point' && !isPathing.current) {
      // 单击顶点
      return 'movePoint';
    }
    if (eType === 'insertPoint') return eType;
    if (
      drawTool === 'drag' ||
      (isCtrlKey.current && !isShiftKey.current && !isAltKey.current)
    )
      return 'moveWhole'; // 按住ctrl快捷拖动整体
    if (
      eType === 'shape' &&
      !isCtrlKey.current &&
      (drawTool === 'move' ||
        maskShapeId.current === target.attr('id') ||
        (selectShapeIds.current &&
          selectShapeIds.current.includes(target.attr('id')?.substring(6))))
    ) {
      // 移动图形
      return 'moveShape';
    }
    if (
      eType === 'whole' &&
      drawTool === 'move' &&
      !isCtrlKey.current &&
      !isAltKey.current
    ) {
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
  const initDrag = (type: any, cb: func) => {
    let drawTool = '',
      curOpera = '',
      curTarget: any = null, // 当前事件所在元素
      isSelect = false,
      recordData: any = null; // 记录移动操作前的数据

    return d3
      .drag()
      .filter(function (event: any) {
        getFocus();
        ({ drawTool } = tempProps.current);
        curTarget = d3.select(this);
        curOpera = getCurOpera(type, drawTool, curTarget);

        if (!drawTool) return false;
        return (
          !event.button ||
          (event.button === 2 && isPathing.current && curOpera === 'path')
        );
      })
      .on('start', function (event: any) {
        event?.sourceEvent?.stopPropagation();
        event?.sourceEvent?.preventDefault();

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
          // console.log(isSelect);
          let curId = curTarget.attr('id')?.substring(6);
          if (
            (!selectShapeIds.current &&
              maskShapeId.current !== curTarget.attr('id')) ||
            (selectShapeIds.current && !selectShapeIds.current.includes(curId))
          ) {
            // 非多选，且当前图形没有选中，或shift按下，多选但不包含该图形时，执行选中操作
            // console.log('选中');
            isSelect = true;
            selectShape(
              curTarget,
              isShiftKey.current || event?.sourceEvent?.shiftKey,
            );
          }
          if (isAltKey.current || event?.sourceEvent?.altKey) {
            // 复制图形（keydown连续按下有延迟）
            copySelectShape();
          }
        } else if (curOpera.indexOf('move') >= 0 && curOpera.length > 4) {
          // 移动记录初始数据（整体、单击拖拽点）
          if (curOpera === 'moveWhole') {
            curTransform.current = curTransform.current || d3.zoomIdentity;
            [startInfo.current.mx, startInfo.current.my] = getD3Posi(event); // 鼠标位置
          } else if (curOpera === 'moveGrip') {
            recordStartInfo(event);
          } else {
            [startInfo.current.mx, startInfo.current.my] = getD3Posi(event); // 鼠标位置
          }
        }
        // 记录移动操作前的数据
        if (
          curOpera.indexOf('move') >= 0 &&
          curOpera.length > 4 &&
          curOpera !== 'moveWhole'
        ) {
          recordData = recordBeforeMove();
        }
      })
      .on('drag', function (event: any) {
        // console.log('drag', event.dx, event.dy);
        event?.sourceEvent?.stopPropagation();
        event?.sourceEvent?.preventDefault();

        if (event?.sourceEvent) {
          mouseMove(event.sourceEvent); // 手动触发，因为drag导致mouseMove没有触发
        }

        if (
          selectedGripId.current ||
          selectedPointId.current ||
          curOpera === 'path' ||
          curOpera === 'insertPoint'
        )
          return; // 选中拖拽点\顶点、绘制path时无需移动
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
      })
      .on('end', function (event: any) {
        event?.sourceEvent?.stopPropagation();
        event?.sourceEvent?.preventDefault();
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
          } else if (
            curOpera !== 'moveWhole' &&
            curOpera.indexOf('move') >= 0 &&
            curOpera.length > 4
          ) {
            // 更新旋转中心
            if (curOpera === 'moveGrip' || curOpera === 'movePoint') {
              updateRotateCenter();
            }
            tempProps.current.changeSize(getMarkData());
            if (recordData) {
              insertStack('edit', ...recordData);
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
  const initZoom = (cb?: any) => {
    let { drawTool }: any = '';

    return d3
      .zoom()
      .scaleExtent(tempProps.current?.scaleExtent)
      .filter(function (event: any) {
        return (!event.ctrlKey || event.type === 'wheel') && !event.button;
      })
      .on('start', function (event: any) {
        ({ drawTool } = tempProps.current);
        // console.log("");
        // console.log(1, 'zoomstart');
        getFocus();
        event?.sourceEvent?.stopPropagation();
        event?.sourceEvent?.preventDefault();

        if (!drawTool) return;
      })
      .on('zoom', function (event: any) {
        // console.log('zoom');
        // console.log(event);
        event?.sourceEvent?.stopPropagation();
        event?.sourceEvent?.preventDefault();

        if (!drawTool) return;

        if (cb) {
          cb(event);
        }
      })
      .on('end', function (event: any) {
        event?.sourceEvent?.stopPropagation();
        event?.sourceEvent?.preventDefault();

        if (!drawTool) return;
      });
  };
  // 拖动、放大整体
  const zoomWhole = (event: any, isZoom = true) => {
    if (isZoom) {
      curTransform.current = event.transform;
    }

    svgRoot.current
      .selectAll('g.layer')
      .attr('transform', curTransform.current);
    svgRoot.current
      .selectAll('g#shape-related-group')
      .attr(
        'transform',
        `translate(${curTransform.current.x}, ${curTransform.current.y})`,
      );
    if (selectShapeIds.current?.length) {
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
  const copyShape = (targetP?: any) => {
    let multiShape = true,
      target = targetP;
    if (!target) {
      target = curShape.current;
      target.attr('fill', shapeInfo.shapeCommon.fill);
      multiShape = false;
      svgRoot.current.select('#path-add-point')?.attr('display', 'inline');
    }

    let curNum = target.attr('id')?.substring(6),
      { label: curLabel, shape_type } = allShapeJson.current[curNum],
      newShape = target.clone(),
      newNum = getCurNum();

    newShape = svgCont.current
      .select('#shape')
      .append(() => {
        return newShape.node();
      })
      .attr('id', `shape-${newNum}`)
      .call(initDrag('shape', dragChange));

    allShapeJson.current[newNum] = JSON.parse(
      JSON.stringify(allShapeJson.current?.[curNum]),
    );
    addLabel(newNum, curLabel, shape_type !== 'rect');

    if (multiShape) {
      return '' + newNum;
    }
    newShape.attr('fill', setMaskColor(newShape.attr('stroke')));
    maskShapeId.current = `shape-${newNum}`;
    return newShape;
  };
  const copySelectShape = () => {
    if (selectShapeIds.current) {
      let newIds: any = [];
      selectShapeIds.current?.forEach((item: any) => {
        let curShape = d3.select(`#shape-${item}`);
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
  const startMoveDraw = (e: any, drawTool: string) => {
    // console.log("");
    // console.log('start', e.subject);
    // console.log('start', e);
    let posi = getD3Posi(e);

    isDrawing.current = true;
    curShape.current = svgCont.current
      .select('#shape')
      .append(drawTool)
      .call(initDrag('shape', dragChange));

    // 设置颜色
    setDrawColor();
    let shapeAttrs = Object.assign(
        {},
        shapeInfo.shapeCommon,
        shapeInfo[drawTool],
      ),
      attrX = 'x',
      attrY = 'y';
    if (drawTool === 'ellipse') {
      attrX = 'cx';
      attrY = 'cy';
    }

    [startInfo.current.x, startInfo.current.y] = posi;
    [shapeAttrs[attrX], shapeAttrs[attrY]] = posi;
    Object.keys(shapeAttrs).forEach((key) => {
      curShape.current.attr(key, shapeAttrs[key]);
    });
    return false;
  };
  // 拖拽绘制图形（矩形【shift正方形】、椭圆形【shift圆形】）
  const moveDraw = (e: any, drawTool: string) => {
    // console.log("");
    // console.log('move', e);
    if (!curShape.current || !isDrawing.current) return false;

    let posi = getD3Posi(e),
      { x, y } = startInfo.current,
      moveX = posi[0] - x,
      moveY = posi[1] - y;

    // 矩形
    if (drawTool === 'rect') {
      let width = Math.abs(moveX),
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
      curShapePoints.current = { x, y, width, height };
      curShape.current
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height);
      return false;
    }
    // 椭圆形
    if (drawTool === 'ellipse') {
      let midMoveX = moveX / 2 || 0,
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
      curShapePoints.current = { cx: x, cy: y, rx, ry };
      curShape.current
        .attr('cx', x)
        .attr('cy', y)
        .attr('rx', rx)
        .attr('ry', ry);
    }
    return false;
  };

  // 切换tool
  const switchDrawTool = (drawTool: string) => {
    // console.log('switchDrawTool', tempProps.current);
    // console.log('switchDrawTool', drawTool);
    if (drawTool !== 'path' && isPathing.current) {
      delShape();
      isPathing.current = false;
      return;
    }
  };

  // 画布外部监听mouseup
  const outMouseup = () => {
    if (isDrawing.current) {
      // 绘制
      endMoveDraw();
      return;
    }
  };

  // 监听按键
  const keydown = (event: any) => {
    isCtrlKey.current = event.ctrlKey;
    isAltKey.current = event.altKey;
    isShiftKey.current = event.shiftKey;

    let curKey = event.keyCode || event.which || event.charCode;

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
      copyIds.current =
        (selectShapeIds.current && [...selectShapeIds.current]) ||
        curShape.current?.attr('id') ||
        null;
    }
    // 粘贴
    if (isCtrlKey.current && curKey === 86) {
      if (!copyIds.current) return;
      delEditStatus();

      let multiShape = typeof copyIds.current === 'object';
      if (multiShape) {
        selectShapeIds.current = [...copyIds.current];
      } else {
        curShape.current = d3.select(`#${copyIds.current}`);
      }
      copySelectShape();

      if (multiShape) {
        updateSelectPath();
      } else if (
        ['rect', 'ellipse'].includes(
          allShapeJson.current[copyIds.current.substring(6)].shape_type,
        )
      ) {
        updateGrip();
      } else {
        updatePoint();
      }
      tempProps.current.changeSize(getMarkData());
    }

    // 快捷移动当前选中框
    if ([37, 38, 39, 40].includes(curKey)) {
      let dx = 0,
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
      let recordData: any = recordBeforeMove();
      insertStack('edit', ...recordData);
      recordData = null;

      moveSelectShape([dx, dy]);
    }
  };
  const keyup = (event: any) => {
    isCtrlKey.current = event.ctrlKey;
    isAltKey.current = event.altKey;
    isShiftKey.current = event.shiftKey;
  };
  // 画布获取、失去焦点
  const focus = (status: boolean) => {
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

  // 切换旋转功能
  const toggleRotate = (rotateEnable: any) => {
    let rLineEl = svgRoot.current?.select('#shape-grip-group #rotate-line');
    let rCircleEl = svgRoot.current?.select('#shape-grip-group #rotate-circle');
    if (rotateEnable) {
      if (!rLineEl?.size()) {
        // 线
        rLineEl = svgRoot.current
          .select('#shape-grip-group')
          .append('line')
          .attr('id', 'rotate-line')
          .style('pointer-events', 'none');
        const rLineAttrs = shapeInfo['rotateLine'];
        Object.keys(rLineAttrs).forEach((key) => {
          rLineEl.attr(key, rLineAttrs[key]);
        });
        // 圆点
        rCircleEl = svgRoot.current
          .select('#shape-grip-group')
          .append('circle')
          .attr('id', 'rotate-circle')
          .attr('class', 'w-svg-rotate')
          .call(initDrag('rotate', dragChange)); // 添加事件
        const rCircleAttrs = shapeInfo['rotateCircle'];
        Object.keys(rCircleAttrs).forEach((key) => {
          rCircleEl.attr(key, rCircleAttrs[key]);
        });
      } else {
        rLineEl.attr('display', 'inline');
        rCircleEl.attr('display', 'inline');
      }
      // 更新位置
      if (curShape.current) {
        let curScale = curTransform?.current?.k || 1,
          { x, y, width } = curShape.current?.node()?.getBBox();
        // 手动调整scale
        x = x * curScale || 0;
        y = y * curScale || 0;
        width = width * curScale || 0;
        const rX = x + width / 2;

        rLineEl
          .attr('x1', rX)
          .attr('y1', y - 4)
          .attr('x2', rX)
          .attr('y2', y - 16);
        rCircleEl.attr('cx', rX).attr('cy', y - 20);
      }
    } else if (rLineEl?.size()) {
      rLineEl.attr('display', 'none');
      rCircleEl.attr('display', 'none');
    }
  };

  // 初始化布局
  const initLayout = () => {
    // 1、添加svgRoot
    d3.select(curDom.current).select('div>svg')?.remove();
    svgRoot.current = d3
      .select(curDom.current)
      .selectChild('div')
      .append('svg')
      .attr('id', 'svgroot');

    // 1.2 添加网格
    let defs = svgRoot.current.append('defs'),
      gridPattern = defs
        .append('pattern')
        .attr('id', 'gridPattern')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', '10')
        .attr('height', '10'),
      gridRect = gridPattern.append('rect');

    gridRect
      .attr('fill', 'none')
      .attr('stroke', '#787878')
      .attr('stroke-width', '0.5')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', '100%')
      .attr('height', '100%');

    // 2、添加svgCont
    svgCont.current = svgRoot.current.append('svg').attr('id', 'svgcont'); // .attr('fill', bgColor)
    // 2.1添加g放置图片和图形
    svgCont.current
      .append('g')
      .attr('class', 'layer')
      .attr('id', 'img')
      .style('pointer-events', 'none');
    svgCont.current.append('g').attr('class', 'layer').attr('id', `shape`);

    // 3、放置图形相关的控制点、控制线
    let relatedGroup = svgRoot.current
        .append('g')
        .attr('id', 'shape-related-group'),
      // 3.1 框选的虚线框
      shapeSelector = relatedGroup
        .append('rect')
        .attr('id', 'shape-selector')
        .attr('display', 'none')
        .style('pointer-events', 'none'),
      rectAttrs = Object.assign({}, shapeInfo['rect'], shapeInfo['selectBox']);
    Object.keys(rectAttrs).forEach((key) => {
      shapeSelector.attr(key, rectAttrs[key]);
    });

    // 单击多边形的隐形外框，用于单击添加顶点
    const pathAddPoint = relatedGroup
        .append('path')
        .attr('id', 'path-add-point')
        .attr('display', 'none'),
      pathAddPointAttrs = shapeInfo['pathAddPoint'];
    Object.keys(pathAddPointAttrs).forEach((key) => {
      pathAddPoint.attr(key, pathAddPointAttrs[key]);
    });

    // 3.2 创建拖拽图形的控制点和线（8个方向控制点、控制线path的顶点）
    const gripGroupEl = relatedGroup
      .append('g')
      .attr('class', 'grip-layer')
      .attr('id', 'shape-grip-group')
      .attr('display', 'none');
    // 3.2.1 添加控制线
    const resizePathEl = gripGroupEl
      .append('path')
      .attr('id', 'resize-path')
      .style('pointer-events', 'none');
    const lineAttrs = shapeInfo['line'];
    Object.keys(lineAttrs).forEach((key) => {
      resizePathEl.attr(key, lineAttrs[key]);
    });
    // 3.2.2 添加控制点
    for (let i = 0; i < 8; i++) {
      gripGroupEl
        .append('rect')
        .attr('id', 'resize-grip-' + dirArr[i])
        .style('cursor', dirArr[i] + '-resize');
    }
    let gripAttrs = shapeInfo['grip'];
    Object.keys(gripAttrs).forEach((key) => {
      d3.selectAll('#shape-grip-group rect').attr(key, gripAttrs[key]);
    });
    // 3.2.3 添加旋转线、圆按钮
    toggleRotate(props.rotateEnable);

    // 3.3 添加放置path的顶点
    relatedGroup
      .append('g')
      .attr('class', 'point_layer')
      .attr('id', 'path-point-group');

    // 3.4 添加放置图形外围框
    relatedGroup
      .append('g')
      .attr('class', 'path_layer')
      .attr('id', 'shape-path-group')
      .style('pointer-events', 'none');

    // 3.5 添加放置图形文本label
    relatedGroup
      .append('g')
      .attr('class', 'label_layer')
      .attr('id', 'shape-label-group')
      .attr('display', 'none')
      .style('pointer-events', 'none');

    // 4 显示网格（不放在img层是因为scale导致grid边框放大，"non-scaling-stroke"对pattern无效）
    relatedGroup
      .append('rect')
      .attr('id', 'grid')
      .attr('display', 'none')
      .style('pointer-events', 'none')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', '0')
      .attr('height', '0')
      .attr('fill', 'url(#gridPattern)')
      .attr('stroke', 'none');

    // 5 显示定位线
    let crosshairGroup = svgRoot.current
      .append('g')
      .attr('class', 'crosshair_layer')
      .style('pointer-events', 'none')
      .attr('display', 'none');
    crosshairGroup
      .append('rect')
      .attr('id', 'crosshair-v-line')
      .attr('width', 0.5)
      .attr('height', '100%');
    crosshairGroup
      .append('rect')
      .attr('id', 'crosshair-h-line')
      .attr('width', '100%')
      .attr('height', 0.5);
    crosshairGroup
      .selectAll('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', '#00f')
      .attr('stroke', 'none');
  };

  // 设置画布大小
  const setCanvasSize = () => {
    let boxInfo = curDom.current.getBoundingClientRect(),
      w = boxInfo.right - boxInfo.left || shapeInfo.svg.width,
      h = boxInfo.bottom - boxInfo.top || shapeInfo.svg.height;

    [shapeInfo.svg.width, shapeInfo.svg.height] = [w, h];
    d3.select('#svgcanvas')
      .style('width', w + 'px')
      .style('height', h + 'px'); // style对象设置方式无效，只能用链式方式
    d3.selectAll('#svgroot,#svgcont').attr('width', w).attr('height', h);
  };

  // 初始化事件
  const initEvent = () => {
    svgRoot.current
      // .on('click', (...params) => clickCanvas('whole', ...params))
      .on('mousemove touchmove', mouseMove)
      .call(initDrag('whole', dragChange))
      .call(
        initZoom((event: any) => {
          zoomWhole(event);
        }),
      )
      .on('dblclick.zoom', null);

    d3.selectAll('#shape-grip-group rect').call(initDrag('grip', dragChange));
    svgRoot.current
      .select('#path-add-point')
      .call(initDrag('insertPoint', dragChange));
  };

  // 初始化
  const init = () => {
    // 初始化d3的事件
    lineCreater.current = d3.line();

    initLayout();
    setCanvasSize();
    initEvent();
    toggleCrosshair(tempProps.current.showCrosshair);
  };

  // zoom重载(回到初始化状态)
  const zoomReload = () => {
    svgRoot.current
      .selectAll('g.layer,g#shape-related-group')
      .attr('transform', null);
    curTransform.current = null;
    svgRoot.current.call(initZoom().transform, d3.zoomIdentity); // 重置zoom。
    tempProps.current.changeScale('1');
  };

  // 清空绘制的图形（false不更新数据，因loadimg后续就更新了数据）
  const clearShape = (update = true) => {
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
    svgRoot.current.selectAll('#shape *')?.remove();
    svgRoot.current.selectAll('#shape-label-group *')?.attr('display', 'none');
  };
  // 全部重置
  const reload = (update = true) => {
    svgCont.current.select('g#img').select('image')?.remove();
    clearShape(update);
    zoomReload();
  };

  // 显示隐藏图形
  const toggleShape = (id: any) => {
    let { hide } = allShapeJson.current[id],
      curId = curShape.current?.attr('id')?.substring(6);
    hide = !hide;
    allShapeJson.current[id].hide = hide;
    svgRoot.current
      .selectAll(`g#shape #shape-${id},#shape-label-${id}`)
      .attr('display', hide ? 'none' : 'inline');

    if (selectShapeIds.current && selectShapeIds.current.includes(id)) {
      let curIdIndex = selectShapeIds.current.indexOf(id);
      selectShapeIds.current.splice(curIdIndex, 1);
      if (!selectShapeIds.current?.length) {
        selectShapeIds.current = null;
        d3.selectAll('#shape-path-group *').attr('display', 'none');
        tempProps.current.changeSelect([]);
      } else {
        d3.select(`#shape-path-${selectShapeIds.current.length}`)?.attr(
          'display',
          'none',
        );
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
  const loadImg = (src: string) => {
    if (!src) return false;
    setCanvasSize();
    return new Promise((resolve) => {
      let img = new Image();
      img.onload = (e: any) => {
        let originW = e.target.width, // 原始宽
          originH = e.target.height,
          curImgW = originW,
          curImgH = originH,
          x = 0,
          y = 0,
          imgScale = 1,
          { width: svgW, height: svgH } = shapeInfo.svg;
        // 超出
        // if (originW > svgW || originH > svgH) {
        let boxRatio = svgW / svgH,
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
        curImgInfo.current = { x, y, scale: imgScale, w: curImgW, h: curImgH };
        svgCont.current.select('g#img').select('image')?.remove();
        svgCont.current
          .select('g#img')
          .append('image')
          // .insert('image', '#grid')
          .attr('width', curImgW)
          .attr('height', curImgH)
          .attr('x', x)
          .attr('y', y)
          .attr('xlink:href', src)
          .attr('draggable', 'false')
          ?.style('filter', imgFilterStr.current);

        updateGrid();
        tempProps.current.imgLoaded({ width: originW, height: originH });
        resolve(true);
      };
      img.onerror = () => {
        tempProps.current.imgLoaded(false);
        resolve(false);
      };
      img.src = src;
    });
  };

  // 更新文本的颜色
  const updateLabelColor = (status: boolean) => {
    if (!status) return;

    let shapeIds = Object.keys(allShapeJson.current);
    shapeIds?.forEach((item) => {
      let curShape = svgRoot.current.select(`#shape-${item}`);
      svgRoot.current
        .select(`#shape-label-${item}`)
        .attr('fill', curShape.attr('stroke'));
    });
  };

  // 显示、隐藏网格
  const toggleGrid = (status: boolean) => {
    svgRoot.current
      .select('#grid')
      .attr(
        'display',
        status && (!curTransform.current || curTransform.current.k >= 1)
          ? 'inline'
          : 'none',
      );
    updateGrid(true);
  };
  // 显示、隐藏十字准线
  const toggleCrosshair = (status: boolean) => {
    svgRoot.current
      .select('.crosshair_layer')
      .attr(
        'display',
        status && props.drawTool !== 'move' && props.drawTool !== 'drag'
          ? 'inline'
          : 'none',
      );
  };

  // 调整图片（brightness亮度）
  const adjustImg = (val: string) => {
    imgFilterStr.current = val;
    svgCont.current.select('#img image')?.style('filter', val);
  };
  // 显示、隐藏标签
  const toggleLabel = (status: boolean) => {
    svgRoot.current
      .select('#shape-label-group')
      .attr('display', status ? 'inline' : 'none');
    updateAllLabel(true);
    updateLabelColor(status);
  };
  // 修改图形标签
  const editLabel = (id: any, newLabel: any) => {
    if (!allShapeJson.current[id]) return;
    allShapeJson.current[id].label = newLabel;
    svgRoot.current.select(`#shape-label-${id}`).text(newLabel);
    tempProps.current.changeSize(getMarkData());

    const { colorBindLabel, curLabel } = tempProps.current;
    if (colorBindLabel) {
      let curColor = '',
        update = labelColorJson.current[newLabel];
      if (!curLabel) {
        curColor = shapeInfo.shapeCommon.stroke;
      } else {
        curColor =
          labelColorJson.current[newLabel] ||
          getRandomColor(labelColorJson.current);
      }
      changeSingleShapeColor(id, curColor);
      if (!update) {
        labelColorJson.current[newLabel] = curColor;
        tempProps.current.changeBindColor(labelColorJson.current);
      }
    }
  };

  // 修改画布缩放（enlarge、narrow、具体数值）
  const changeScale = (type: any) => {
    let scaleNum = +curScale.current,
      speed = 0,
      { scaleExtent }: any = tempProps.current;
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
  const convertToPoints = (sizeArr: any) => {
    if (!sizeArr || !sizeArr?.length) return [];
    let newArr: any = [];
    try {
      newArr = sizeArr.map((item: any) => {
        if (!item?.attrs) return item;

        let { attrs, shape_type, ...rest } = item;

        if (shape_type.indexOf('rect') >= 0) {
          // 矩形
          const { x, y, width, height }: any = attrs;
          attrs = [
            [x, y],
            [x + width, y + height],
          ];
          return { points: attrs, shape_type: 'rectangle', ...rest };
        } else if (shape_type === 'ellipse') {
          // 椭圆形
          const { cx, cy, rx, ry }: any = attrs;
          if (rx === ry) {
            // 圆形
            attrs = [
              [cx, cy],
              [cx, cy + ry],
            ];
            return { points: attrs, shape_type: 'circle', ...rest };
          }
          attrs = [
            [cx, cy],
            [cx, cy + ry], // 下
            [cx + rx, cy], // 右
          ];
          return { points: attrs, shape_type: 'ellipse', ...rest };
        }
        // 多边形
        return { points: attrs?.points, shape_type, ...rest };
      });
    } catch (e: any) {
      console.error(e.toString());
    }
    return newArr;
  };

  // 转换数据格式：points=》attr
  const convertToAttrs = (sizeArr: any) => {
    if (!sizeArr || !sizeArr?.length) return [];
    let newArr: any = [];
    try {
      newArr = sizeArr.map((item: any, index: number) => {
        item = { ...item, id: `${index + 1}` };
        if (item?.attrs) return item;

        let { points, shape_type, ...rest } = item;

        if (shape_type.indexOf('rect') >= 0) {
          // 矩形
          const [[x, y], [x2, y2]] = points,
            width = Math.abs(x2 - x),
            height = Math.abs(y2 - y);
          let curX = x,
            curY = y;
          if (curX > x2) {
            curX = x2;
          }
          if (curY > y2) {
            curY = y2;
          }
          points = { x: curX, y: curY, width, height };
          return { attrs: points, shape_type: 'rect', ...rest };
        } else if (shape_type === 'circle') {
          // 圆形
          const [[x, y], [x2, y2]] = points,
            r = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2));
          points = { cx: x, cy: y, rx: r, ry: r };
          return { attrs: points, shape_type: 'ellipse', ...rest };
        } else if (shape_type === 'ellipse') {
          // 椭圆形
          const [[x, y], [, y2], [x3]] = points,
            ry = y2 - y,
            rx = x3 - x;
          points = { cx: x, cy: y, rx, ry };
          return { attrs: points, shape_type: 'ellipse', ...rest };
        } else if (shape_type === 'polygon') {
          // 多边形
          return { attrs: { points }, shape_type, ...rest };
        }
        // 其他
        return { attrs: { points }, shape_type: 'line', ...rest };
      });
    } catch (e: any) {
      console.error(e.toString());
    }
    return newArr;
  };

  // 从数据绘制图形时，更新相关信息
  const updateFromSize = (
    id: any,
    shape_type: string,
    label: string,
    hide: boolean,
    newAttrs: any,
    newRotate: any,
  ) => {
    drawNumArr.current.push(id);
    allShapeJson.current[id] = {
      label,
      shape_type,
      hide,
      attrs: newAttrs,
      rotate: newRotate,
    };
    if (label) {
      addLabel(id, label, shape_type !== 'rect');
    }
    // 显示文本代码
    svgRoot.current
      .selectAll(`g#shape #shape-${id},#shape-label-${id}`)
      .attr('display', hide ? 'none' : 'inline');
  };

  // 加载图片后，将绘制在画布上的图形，即getMarkData返回的数据，重新绘制在图片上（若是读取外部json文件，另需添加基本的顶点）
  const drawShapeFromSize = (sizeArr: any, update = false) => {
    if (!sizeArr || !sizeArr?.length) return;
    try {
      let { x: imgX, y: imgY, scale: imgScale } = curImgInfo.current,
        shapeBox = svgCont.current.select('#shape');
      sizeArr.forEach((item: any) => {
        // console.log(item);
        let { attrs, id, hide, label, shape_type, rotate } = item,
          curShape: any = null,
          newAttrs = null,
          newRotate = null;

        // 矩形、椭圆形
        if (shape_type === 'rect' || shape_type === 'ellipse') {
          let attrNames = getShapeAttrNames(shape_type),
            {
              [attrNames.x]: x,
              [attrNames.y]: y,
              [attrNames.w]: w,
              [attrNames.h]: h,
            } = attrs;
          // 是否有效图形
          if (!+w || !+h) {
            return;
          }
          if (!id) {
            id = getCurNum();
          }
          curShape = shapeBox
            .append(shape_type)
            .attr('id', `shape-${id}`)
            .call(initDrag('shape', dragChange));
          // 设置颜色
          setDrawColor(label);
          let shapeAttrs = Object.assign(
            {},
            shapeInfo.shapeCommon,
            shapeInfo[shape_type],
          );
          Object.keys(shapeAttrs).forEach((key) => {
            curShape.attr(key, shapeAttrs[key]);
          });
          x = +x / imgScale + imgX;
          y = +y / imgScale + imgY;
          w = w / imgScale;
          h = h / imgScale;
          curShape
            .attr(attrNames.x, x)
            .attr(attrNames.y, y)
            .attr(attrNames.w, w)
            .attr(attrNames.h, h);

          newAttrs = {
            [attrNames.x]: x,
            [attrNames.y]: y,
            [attrNames.w]: w,
            [attrNames.h]: h,
          };
          if (rotate) {
            const { centerX, centerY } = getRotateCenter(id);
            newRotate = [rotate, centerX, centerY];
            curShape.attr(
              'transform',
              `rotate(${rotate} ${centerX},${centerY})`,
            );
          }
        } else {
          // 多边形
          if (!id) {
            id = getCurNum();
          }
          // 设置颜色
          setDrawColor(label);
          let { points } = attrs,
            curLen = points.length,
            curShape = shapeBox
              .append('path')
              .attr('id', `shape-${id}`)
              .call(initDrag('shape', dragChange)),
            shapeAttrs = Object.assign(
              {},
              shapeInfo.shapeCommon,
              shapeInfo['path'],
            ),
            newPoints = [];
          Object.keys(shapeAttrs).forEach((key) => {
            curShape.attr(key, shapeAttrs[key]);
          });

          // 更新point位置
          for (let i = 0; i < curLen; i++) {
            let [x, y] = points[i];
            x = +x / imgScale + imgX;
            y = +y / imgScale + imgY;
            newPoints[i] = [x, y];

            let curPointId = `path-point-${i + 1}`;
            addPoint(curPointId, i, false);
          }
          let pointString = lineCreater.current(newPoints);
          if (shape_type === 'polygon') {
            pointString += 'Z';
          }
          curShape.attr('d', pointString);

          newAttrs = { points: newPoints };

          if (rotate) {
            const { centerX, centerY } = getRotateCenter(id);
            newRotate = [rotate, centerX, centerY];
            curShape.attr(
              'transform',
              `rotate(${rotate} ${centerX},${centerY})`,
            );
          }
        }
        item.id = id;
        updateFromSize(id, shape_type, label, hide, newAttrs, newRotate);
      });
      tempProps.current.changeBindColor(labelColorJson.current);
      if (update) {
        tempProps.current.changeSize(sizeArr);
      }
    } catch (e: any) {
      console.error(e.toString());
    }
  };

  const canUndo = () => {
    return undoStack.current.length > 0;
  };
  const canRedo = () => {
    return redoStack.current.length > 0;
  };

  // 获取当前组件dom
  const getCurDom = (c: any) => {
    if (c && !curDom.current) {
      // console.log('dom有了');
      curDom.current = c;
    }
  };

  useEffect(() => {
    if (curDom.current) {
      init();
      window.addEventListener('resize', setCanvasSize);
      // window.addEventListener('touchend', outMouseup);
      // window.addEventListener('mouseup', outMouseup);
    }
    return () => {
      d3.select('body').on('keyup', null);
      window.removeEventListener('resize', setCanvasSize);
      // window.removeEventListener('touchend', outMouseup);
      // window.removeEventListener('mouseup', outMouseup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
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
    if (props.rotateEnable !== tempProps.current.rotateEnable) {
      toggleRotate(props.rotateEnable);
    }
    tempProps.current = props;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props]);

  useImperativeHandle(ref, () => {
    return {
      reload, // 全部重置
      zoomReload, // 缩放回到初始状态
      loadImg, // 加载图片
      clearShape, // 清空图形
      toggleShape, // 切换图形显示隐藏
      getMarkData, // 获取图形数据
      selectShape, // 选中图形
      delSelectShape, // 删除选中的图形
      getSelectIds, // 获取选中、正在编辑的图形id
      editLabel, // 修改图形标签
      adjustImg, // 编辑图片（亮度、曝光度等）
      undoSvg, // 撤销
      canUndo, // 能否撤销
      redoSvg, // 重做
      canRedo,
      changeScale, // 修改画布缩放
      changeColor, // 修改画框颜色
      drawShapeFromSize, // 加载图片后重载图形
      setCanvasSize, // 变更画布尺寸
      convertToPoints, // 转换数据格式：attr=》points
      convertToAttrs, // 转换数据格式：points=》attr
    };
  });

  return (
    <div
      ref={getCurDom}
      className={`w-draw-container ${tempProps.current.className || ''}`}
      onKeyDown={keydown}
    >
      <div
        id="svgcanvas"
        className="w-svg-box"
        tabIndex={-1}
        onFocus={() => focus(true)}
        onBlur={() => focus(false)}
      ></div>
      {props?.children}
    </div>
  );
});

WDraw.defaultProps = {
  src: '', // 图片路径
  curLabel: '', // 当前的label
  showLabel: false, // 显示标签
  showGrid: false, // 显示网格
  showCrosshair: false, // 显示定位线
  minSize: [4, 4], // 误触尺寸，小于它的直接删除
  drawTool: '', // 默认绘制工具（rect、ellipse、path、move、drag）
  scaleExtent: [0.02, 30], // 图形缩放比例阀值
  colorBindLabel: true, // 颜色跟标签绑定
  rotateEnable: false, // 能否旋转
  // changeTool: () => { }, // 变更工具
  changeSize: () => {}, // 尺寸、位置发生变化
  changeBindColor: () => {}, // 颜色绑定标签时，标签颜色发生变化
  changeSelect: () => {}, // 选中、正在编辑的图形id
  changeScale: () => {}, // 修改画布scale
  imgLoaded: () => {}, // 图片加载完的回调
  endDraw: () => {}, // 绘制完一个图形的回调
};

export default WDraw;

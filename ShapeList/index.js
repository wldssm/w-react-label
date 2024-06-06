import _toConsumableArray from "@babel/runtime/helpers/esm/toConsumableArray";
import _slicedToArray from "@babel/runtime/helpers/esm/slicedToArray";
import React, { useEffect, useRef, useState } from 'react';

// import styles from './index.css';

var WShapeList = function WShapeList(props) {
  var shapeList = props.shapeList,
    selectShapeIds = props.selectShapeIds,
    delFunc = props.delFunc,
    selectFunc = props.selectFunc,
    leftRender = props.leftRender,
    rightRender = props.rightRender,
    topRender = props.topRender,
    title = props.title,
    className = props.className,
    boxRef = useRef(null),
    _useState = useState([]),
    _useState2 = _slicedToArray(_useState, 2),
    selectIds = _useState2[0],
    setSelectIds = _useState2[1],
    minIndex = useRef(-1),
    maxIndex = useRef(-1); // 最大的index

  useEffect(function () {
    setSelectIds(selectShapeIds);
  }, [selectShapeIds]);

  // 更新选中的index
  var updateIndex = function updateIndex() {
    maxIndex.current = -1;
    minIndex.current = -1;
    var shapeLen = shapeList.length,
      selectLen = selectShapeIds === null || selectShapeIds === void 0 ? void 0 : selectShapeIds.length;
    if (!shapeLen || !selectLen) return;
    var newSelectIds = _toConsumableArray(selectShapeIds);
    newSelectIds.sort(function (a, b) {
      return a - b;
    });
    for (var i = 0; i < shapeLen; i++) {
      var curId = shapeList[i].id;
      if (curId === newSelectIds[0]) {
        minIndex.current = i;
      }
      if (curId === newSelectIds[selectLen - 1]) {
        maxIndex.current = i;
      }
    }
  };

  // 图形列表区域获取、失去焦点
  var focus = function focus(status) {
    if (status) {
      boxRef.current.classList.add('box-active');
      updateIndex();
    } else {
      boxRef.current.classList.remove('box-active');
    }
  };

  // 修改画布的编辑状态
  var changeDraw = function changeDraw(ids) {
    if (!selectFunc) return;
    if (ids.length === 1) {
      selectFunc(ids[0]);
    } else {
      selectFunc(ids);
    }
  };

  // 监听按键
  var keydown = function keydown(event) {
    var curKey = event.keyCode || event.which || event.charCode;

    // 快捷删除
    if (curKey === 8 || curKey === 46) {
      event === null || event === void 0 ? void 0 : event.stopPropagation();
      if (delFunc) delFunc();
      return;
    }

    // 快捷全选图形
    if (event.ctrlKey && curKey === 65) {
      event === null || event === void 0 ? void 0 : event.stopPropagation();
      var newIds = shapeList === null || shapeList === void 0 ? void 0 : shapeList.map(function (item) {
        return item === null || item === void 0 ? void 0 : item.id;
      });
      setSelectIds(_toConsumableArray(newIds));
      changeDraw(newIds);
      maxIndex.current = shapeList.length - 1;
      minIndex.current = 0;
      return;
    }

    // 快捷切换图形
    var resIndex = -1,
      lastIndex = shapeList.length - 1;
    if (curKey === 38 && (minIndex.current > 0 || selectIds.length > 1)) {
      // 上
      resIndex = minIndex.current - 1;
      resIndex = resIndex < 0 ? 0 : resIndex;
    } else if (curKey === 40 && (maxIndex.current < lastIndex || selectIds.length > 1)) {
      // 下
      resIndex = maxIndex.current + 1;
      resIndex = resIndex > lastIndex ? lastIndex : resIndex;
    }
    if (resIndex !== -1) {
      var _shapeList$resIndex;
      event === null || event === void 0 ? void 0 : event.stopPropagation();
      selectIds = [(_shapeList$resIndex = shapeList[resIndex]) === null || _shapeList$resIndex === void 0 ? void 0 : _shapeList$resIndex.id];
      setSelectIds(selectIds);
      changeDraw(selectIds);
      maxIndex.current = resIndex;
      minIndex.current = resIndex;
    }
  };

  // 单击选中图形（可shift多选）
  var selectShape = function selectShape(id, index, e) {
    e.stopPropagation();
    var newSelectIds = _toConsumableArray(selectIds),
      curIdIndex = newSelectIds.indexOf(id);
    if (e.shiftKey) {
      if (index <= minIndex.current) {
        minIndex.current = index;
      } else {
        maxIndex.current = index;
      }
      minIndex.current = minIndex.current < 0 ? 0 : minIndex.current;
      newSelectIds = [];
      for (var i = minIndex.current; i <= maxIndex.current; i++) {
        var _shapeList$i;
        newSelectIds.push((_shapeList$i = shapeList[i]) === null || _shapeList$i === void 0 ? void 0 : _shapeList$i.id);
      }
    } else if (e.ctrlKey) {
      if (curIdIndex >= 0) {
        // 已有取消
        if (newSelectIds.length === 1) {
          minIndex.current = -1;
          maxIndex.current = -1;
        } else if (index === minIndex.current) {
          for (var _i = minIndex.current + 1; _i <= maxIndex.current; _i++) {
            var _shapeList$_i;
            if (newSelectIds.includes((_shapeList$_i = shapeList[_i]) === null || _shapeList$_i === void 0 ? void 0 : _shapeList$_i.id)) {
              minIndex.current = _i;
              break;
            }
          }
        } else if (index === maxIndex.current) {
          for (var _i2 = maxIndex.current - 1; _i2 >= minIndex.current; _i2--) {
            var _shapeList$_i2;
            if (newSelectIds.includes((_shapeList$_i2 = shapeList[_i2]) === null || _shapeList$_i2 === void 0 ? void 0 : _shapeList$_i2.id)) {
              maxIndex.current = _i2;
              break;
            }
          }
        }
        newSelectIds.splice(curIdIndex, 1);
      } else {
        newSelectIds.push(id);
        if (index < minIndex.current) {
          minIndex.current = index;
        }
        if (index > maxIndex.current) {
          maxIndex.current = index;
        }
      }
    } else {
      newSelectIds = [id];
      maxIndex.current = index;
      minIndex.current = index;
    }
    setSelectIds(newSelectIds);
    changeDraw(newSelectIds);
  };

  // 单击空白区域，删除选中状态
  var delAllSelectStatus = function delAllSelectStatus() {
    if (selectIds.length) {
      setSelectIds([]);
      changeDraw([]);
      maxIndex.current = -1;
      minIndex.current = -1;
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "win-box ".concat(className)
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-head"
  }, title || '图形列表', /*#__PURE__*/React.createElement("div", {
    className: "flex-center"
  }, topRender && topRender())), /*#__PURE__*/React.createElement("div", {
    className: "w-box w-box-overflow",
    ref: boxRef,
    tabIndex: -1,
    onFocus: function onFocus() {
      return focus(true);
    },
    onBlur: function onBlur() {
      return focus(false);
    },
    onClick: delAllSelectStatus,
    onKeyDown: keydown
  }, shapeList && shapeList.map(function (item, index) {
    var curId = item === null || item === void 0 ? void 0 : item.id;
    return /*#__PURE__*/React.createElement("div", {
      key: index,
      className: "list-item ".concat(selectIds.includes(curId) ? 'on' : ''),
      onClick: function onClick(e) {
        return selectShape(curId, index, e);
      }
    }, leftRender && leftRender(item, index), /*#__PURE__*/React.createElement("p", {
      className: "list-txt",
      title: item === null || item === void 0 ? void 0 : item.label
    }, item === null || item === void 0 ? void 0 : item.label), rightRender && rightRender(item, index));
  })));
};
WShapeList.defaultProps = {
  className: '',
  title: '',
  // 标题
  shapeList: [],
  // 图形列表
  selectShapeIds: [],
  // 选中的id
  leftRender: null,
  // 插入左侧渲染
  rightRender: null,
  // 插入右侧渲染
  topRender: null,
  // 头部插入
  delFunc: function delFunc() {},
  // 删除
  selectFunc: function selectFunc() {} // 选中事件
};

export default WShapeList;
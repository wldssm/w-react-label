import _slicedToArray from "@babel/runtime/helpers/esm/slicedToArray";
import React, { useEffect, useState } from 'react';
import "./index.css";
var WColorBlock = function WColorBlock(props) {
  var colorBlocks = props.colorBlocks,
    _useState = useState(colorBlocks[0]),
    _useState2 = _slicedToArray(_useState, 2),
    curColor = _useState2[0],
    setCurColor = _useState2[1];
  useEffect(function () {
    if (props.color) {
      setCurColor(props.color);
    }
  }, []);

  // 切换颜色
  var changeColor = function changeColor(color, e) {
    setCurColor(color);
    if (props.onChange) {
      props.onChange(color, e);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "w-color-block-box"
  }, colorBlocks.map(function (item, index) {
    return /*#__PURE__*/React.createElement("div", {
      onClick: function onClick(e) {
        return changeColor(item, e);
      },
      className: "w-color-block ".concat(item === curColor ? 'on' : ''),
      style: {
        background: item
      },
      key: index
    });
  }));
};
WColorBlock.defaultProps = {
  color: '',
  colorBlocks: ['#f00', '#FFA500', '#ff0', '#0f0', '#0ff', '#00f', '#800080', '#fff'],
  onChange: function onChange() {}
};
export default WColorBlock;
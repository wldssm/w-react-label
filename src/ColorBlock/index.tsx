import React, { useEffect, useState } from 'react';

import './index.css';

const WColorBlock = (props: any) => {
  let { colorBlocks } = props,
    [curColor, setCurColor] = useState(colorBlocks[0]);

  useEffect(() => {
    if (props.color) {
      setCurColor(props.color);
    }
  }, []);

  // 切换颜色
  const changeColor = (color: string) => {
    setCurColor(color);

    if (props.onChange) {
      props.onChange(color);
    }
  };

  return (
    <div className="w-color-block-box">
      {colorBlocks.map((item: string, index: any) => {
        return (
          <div
            onClick={() => changeColor(item)}
            className={`w-color-block ${item === curColor ? 'on' : ''}`}
            style={{ background: item }}
            key={index}
          ></div>
        );
      })}
    </div>
  );
};

WColorBlock.defaultProps = {
  color: '',
  colorBlocks: [
    '#f00',
    '#FFA500',
    '#ff0',
    '#0f0',
    '#0ff',
    '#00f',
    '#800080',
    '#fff',
  ],
  onChange: () => {},
};

export default WColorBlock;

import React, { useEffect, useRef, useState } from 'react';

// import styles from './index.css';

const WShapeList = (props: any) => {
  let {
      shapeList,
      selectShapeIds,
      delFunc,
      selectFunc,
      leftRender,
      rightRender,
      topRender,
      title,
      className,
    } = props,
    boxRef: any = useRef(null),
    [selectIds, setSelectIds]: any = useState([]), // 选中的id
    minIndex = useRef(-1), // 选中的最小的index
    maxIndex = useRef(-1); // 最大的index

  useEffect(() => {
    setSelectIds(selectShapeIds);
  }, [selectShapeIds]);

  // 更新选中的index
  const updateIndex = () => {
    maxIndex.current = -1;
    minIndex.current = -1;

    const shapeLen = shapeList.length,
      selectLen = selectShapeIds?.length;
    if (!shapeLen || !selectLen) return;

    let newSelectIds = [...selectShapeIds];
    newSelectIds.sort((a, b) => a - b);
    for (let i = 0; i < shapeLen; i++) {
      let curId = shapeList[i].id;
      if (curId === newSelectIds[0]) {
        minIndex.current = i;
      }
      if (curId === newSelectIds[selectLen - 1]) {
        maxIndex.current = i;
      }
    }
  };

  // 图形列表区域获取、失去焦点
  const focus = (status: any) => {
    if (status) {
      boxRef.current.classList.add('box-active');
      updateIndex();
    } else {
      boxRef.current.classList.remove('box-active');
    }
  };

  // 修改画布的编辑状态
  const changeDraw = (ids: any) => {
    if (!selectFunc) return;
    if (ids.length === 1) {
      selectFunc(ids[0]);
    } else {
      selectFunc(ids);
    }
  };

  // 监听按键
  const keydown = (event: any) => {
    let curKey = event.keyCode || event.which || event.charCode;

    // 快捷删除
    if (curKey === 8 || curKey === 46) {
      event?.stopPropagation();
      if (delFunc) delFunc();
      return;
    }

    // 快捷全选图形
    if (event.ctrlKey && curKey === 65) {
      event?.stopPropagation();
      let newIds = shapeList?.map((item: any) => item?.id);
      setSelectIds([...newIds]);
      changeDraw(newIds);
      maxIndex.current = shapeList.length - 1;
      minIndex.current = 0;
      return;
    }

    // 快捷切换图形
    let resIndex = -1,
      lastIndex = shapeList.length - 1;
    if (curKey === 38 && (minIndex.current > 0 || selectIds.length > 1)) {
      // 上
      resIndex = minIndex.current - 1;
      resIndex = resIndex < 0 ? 0 : resIndex;
    } else if (
      curKey === 40 &&
      (maxIndex.current < lastIndex || selectIds.length > 1)
    ) {
      // 下
      resIndex = maxIndex.current + 1;
      resIndex = resIndex > lastIndex ? lastIndex : resIndex;
    }

    if (resIndex !== -1) {
      event?.stopPropagation();
      selectIds = [shapeList[resIndex]?.id];
      setSelectIds(selectIds);
      changeDraw(selectIds);

      maxIndex.current = resIndex;
      minIndex.current = resIndex;
    }
  };

  // 单击选中图形（可shift多选）
  const selectShape = (id: any, index: any, e: any) => {
    e.stopPropagation();
    let newSelectIds = [...selectIds],
      curIdIndex = newSelectIds.indexOf(id);
    if (e.shiftKey) {
      if (index <= minIndex.current) {
        minIndex.current = index;
      } else {
        maxIndex.current = index;
      }
      minIndex.current = minIndex.current < 0 ? 0 : minIndex.current;
      newSelectIds = [];
      for (let i = minIndex.current; i <= maxIndex.current; i++) {
        newSelectIds.push(shapeList[i]?.id);
      }
    } else if (e.ctrlKey) {
      if (curIdIndex >= 0) {
        // 已有取消
        if (newSelectIds.length === 1) {
          minIndex.current = -1;
          maxIndex.current = -1;
        } else if (index === minIndex.current) {
          for (let i = minIndex.current + 1; i <= maxIndex.current; i++) {
            if (newSelectIds.includes(shapeList[i]?.id)) {
              minIndex.current = i;
              break;
            }
          }
        } else if (index === maxIndex.current) {
          for (let i = maxIndex.current - 1; i >= minIndex.current; i--) {
            if (newSelectIds.includes(shapeList[i]?.id)) {
              maxIndex.current = i;
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
  const delAllSelectStatus = () => {
    if (selectIds.length) {
      setSelectIds([]);
      changeDraw([]);
      maxIndex.current = -1;
      minIndex.current = -1;
    }
  };

  return (
    <div className={`win-box ${className}`}>
      <div className="w-head">
        {title || '图形列表'}
        <div className="flex-center">{topRender && topRender()}</div>
      </div>
      <div
        className="w-box w-box-overflow"
        ref={boxRef}
        tabIndex={-1}
        onFocus={() => focus(true)}
        onBlur={() => focus(false)}
        onClick={delAllSelectStatus}
        onKeyDown={keydown}
      >
        {shapeList &&
          shapeList.map((item: any, index: any) => {
            let curId = item?.id;
            return (
              <div
                key={index}
                className={`list-item ${selectIds.includes(curId) ? 'on' : ''}`}
                onClick={(e) => selectShape(curId, index, e)}
              >
                {leftRender && leftRender(item, index)}
                <p className="list-txt" title={item?.label}>
                  {item?.label}
                </p>
                {rightRender && rightRender(item, index)}
              </div>
            );
          })}
      </div>
    </div>
  );
};

WShapeList.defaultProps = {
  className: '',
  title: '', // 标题
  shapeList: [], // 图形列表
  selectShapeIds: [], // 选中的id
  leftRender: null, // 插入左侧渲染
  rightRender: null, // 插入右侧渲染
  topRender: null, // 头部插入
  delFunc: () => {}, // 删除
  selectFunc: () => {}, // 选中事件
};

export default WShapeList;

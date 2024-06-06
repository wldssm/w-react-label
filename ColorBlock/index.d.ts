import React from 'react';
import './index.css';
declare const WColorBlock: {
    (props: any): React.JSX.Element;
    defaultProps: {
        color: string;
        colorBlocks: string[];
        onChange: () => void;
    };
};
export default WColorBlock;

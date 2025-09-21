import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
/**
 * 정렬 옵션에 따라 flex 컨테이너 스타일을 반환하는 함수
 * @param {Object} options
 *  - direction: 'vertical' | 'vertical-reverse' | 'horizontal' | 'horizontal-reverse'
 *  - align: 'center' | 'start' | 'end' (세로축)
 *  - justify: 'center' | 'start' | 'end' (가로축)
 */
function getFlexStyles(options = {}) {
    let flexDirection = 'row';
    switch (options.direction) {
        case 'vertical':
            flexDirection = 'column';
            break;
        case 'vertical-reverse':
            flexDirection = 'column-reverse';
            break;
        case 'horizontal':
            flexDirection = 'row';
            break;
        case 'horizontal-reverse':
            flexDirection = 'row-reverse';
            break;
        default:
            flexDirection = 'row';
    }

    // alignItems: 세로축 정렬, justifyContent: 가로축 정렬
    // flexDirection에 따라 축이 바뀌므로, 옵션을 그대로 사용
    let alignItems = 'center';
    let justifyContent = 'center';

    if (options.align === 'start') alignItems = 'flex-start';
    else if (options.align === 'end') alignItems = 'flex-end';
    else if (options.align === 'center') alignItems = 'center';

    if (options.justify === 'start') justifyContent = 'flex-start';
    else if (options.justify === 'end') justifyContent = 'flex-end';
    else if (options.justify === 'center') justifyContent = 'center';

    return {
        display: 'flex',
        flexDirection,
        alignItems,
        justifyContent,
        width: '100%',
        height: '100%',
    };
}

/**
 * 정렬 옵션을 받아서 children을 flex로 감싸주는 컴포넌트
 * @param {Object} props
 *  - options: getFlexStyles에 전달할 옵션 객체
 *  - style: 추가 스타일
 *  - children: 렌더링할 자식
 */

const FlexAlign = forwardRef(({ options = {}, style = {}, className, children, width, height, ...rest }, ref) => {
    const flexStyle = getFlexStyles(options);
    const mergedStyle = { ...flexStyle, ...style };
    if (width) mergedStyle.width = width;
    if (height) mergedStyle.height = height;
    return (
        <div
            style={mergedStyle}
            className={className}
            ref={ref}
            {...rest}
        >
            {children}
        </div>
    );
});

FlexAlign.propTypes = {
    options: PropTypes.object,
    style: PropTypes.object,
    className: PropTypes.string,
    children: PropTypes.node,
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(FlexAlign);
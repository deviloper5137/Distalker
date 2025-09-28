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

    // 기본값
    let alignItems = 'center';
    let justifyContent = 'center';

    // 입력값 해석 함수
    const toFlexValue = (v) => v === 'start' ? 'flex-start' : v === 'end' ? 'flex-end' : 'center';

    // 규칙: options.align = 세로축 정렬, options.justify = 가로축 정렬
    // row(가로)에서는 align->alignItems(세로), justify->justifyContent(가로)
    // column(세로)에서는 align->justifyContent(세로), justify->alignItems(가로)로 스왑
    if (flexDirection === 'column' || flexDirection === 'column-reverse') {
        justifyContent = toFlexValue(options.align ?? 'center');
        alignItems = toFlexValue(options.justify ?? 'center');
    } else {
        alignItems = toFlexValue(options.align ?? 'center');
        justifyContent = toFlexValue(options.justify ?? 'center');
    }

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
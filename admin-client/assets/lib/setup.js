/* eslint-disable */
// Shared setup — CDN globals (React, htm) re-exported as ES modules
// class → className, for → htmlFor 자동 변환 래퍼 포함
const { useState, useEffect, useCallback, useRef, useMemo } = React;

function h(type, props, ...children) {
    if (props) {
        if (props.class !== undefined) {
            props.className = props.class;
            delete props.class;
        }
        if (props.for !== undefined) {
            props.htmlFor = props.for;
            delete props.for;
        }
    }
    return React.createElement(type, props, ...children);
}

const html = htm.bind(h);

export { html, useState, useEffect, useCallback, useRef, useMemo };

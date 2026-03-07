/* eslint-disable */
// Shared setup — CDN globals (React, htm) re-exported as ES modules
const { useState, useEffect, useCallback, useRef, useMemo } = React;
const html = htm.bind(React.createElement);

export { html, useState, useEffect, useCallback, useRef, useMemo };

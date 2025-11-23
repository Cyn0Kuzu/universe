/**
 * Ensures React.useMemo exists even if Hermes strips it while tree-shaking.
 * Some production bundles (especially with aggressive minification) were
 * missing the hook, which causes runtime crashes when components destructure
 * it from 'react'. We patch the loaded React module before any application
 * code executes.
 */
(function ensureReactUseMemo(globalRef) {
  const safeConsole =
    globalRef?.console && typeof globalRef.console.warn === 'function'
      ? globalRef.console
      : {
          warn: () => {},
        };
  try {
    const requireFn = globalRef?.require || globalRef?.__r || globalRef?.metroRequire;
    if (typeof requireFn !== 'function') {
      return;
    }

    const reactModule = requireFn('react');
    if (!reactModule) {
      return;
    }

    const resolvedReact = reactModule.default || reactModule;
    if (typeof resolvedReact.useMemo === 'function') {
      // Keep exports in sync in case some modules import named exports
      if (reactModule.default && reactModule.default.useMemo !== resolvedReact.useMemo) {
        reactModule.default.useMemo = resolvedReact.useMemo;
      }
      if (reactModule.useMemo !== resolvedReact.useMemo) {
        reactModule.useMemo = resolvedReact.useMemo;
      }
      return;
    }

    const fallback = (factory) => {
      try {
        return typeof factory === 'function' ? factory() : factory;
      } catch (error) {
        safeConsole.warn('[useMemoPolyfill] factory execution failed:', error);
        return undefined;
      }
    };

    resolvedReact.useMemo = fallback;
    if (reactModule.default) {
      reactModule.default.useMemo = fallback;
    }
    reactModule.useMemo = fallback;

    if (globalRef) {
      // Keep global React (if exposed) consistent
      const globalReact = globalRef.React || globalRef.react;
      if (globalReact && typeof globalReact.useMemo !== 'function') {
        globalReact.useMemo = fallback;
      }
    }

    safeConsole.warn('[useMemoPolyfill] React.useMemo missing – fallback applied.');
  } catch (error) {
    safeConsole.warn('[useMemoPolyfill] Failed to apply fallback:', error);
  }
})(typeof globalThis !== 'undefined'
  ? globalThis
  : typeof global !== 'undefined'
    ? global
    : this);



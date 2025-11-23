/**
 * Ensures `require` is available globally in production bundles.
 * Hermes/metro exposes `__r` but not always `require` when using
 * custom bundling commands (e.g. expo export embed). Some third-party
 * modules still call the CommonJS `require` helper, so we alias it
 * before any application modules execute.
 */
(function ensureGlobalRequireAlias(globalRef) {
  if (!globalRef) {
    return;
  }

  const babelRuntimeFallbacks = (() => {
    const helpers = Object.create(null);

    const createExtendsHelper = () => {
      const cachedAssign =
        Object.assign ||
        function assignPolyfill(target, ...sources) {
          for (let index = 0; index < sources.length; index += 1) {
            const source = sources[index];
            if (source == null) {
              continue;
            }

            const keys = Object.keys(source);
            for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
              const key = keys[keyIndex];
              target[key] = source[key];
            }

            if (typeof Object.getOwnPropertySymbols === 'function') {
              const symbols = Object.getOwnPropertySymbols(source);
              for (let symIndex = 0; symIndex < symbols.length; symIndex += 1) {
                const sym = symbols[symIndex];
                if (Object.prototype.propertyIsEnumerable.call(source, sym)) {
                  target[sym] = source[sym];
                }
              }
            }
          }
          return target;
        };

      function _extends() {
        _extends = cachedAssign;
        return _extends.apply(this, arguments);
      }

      const helper = function extendsShim() {
        return _extends.apply(this, arguments);
      };

      helper.default = helper;
      helper.__esModule = true;
      return helper;
    };

    helpers['@babel/runtime/helpers/extends'] = createExtendsHelper();
    return helpers;
  })();

  const resolveMetroRequire = () =>
    globalRef.__r ||
    globalRef.metroRequire ||
    globalRef.__metroRequire ||
    globalRef[`${globalRef.__METRO_GLOBAL_PREFIX__ || ''}__r`];
  let cachedBaseRequire = null;
  const runtimeRequireWrapper = (baseRequire) => {
    if (typeof baseRequire !== 'function') {
      return null;
    }

    const shim = function shimmedMetroRequire(moduleId) {
      if (typeof moduleId === 'string' && babelRuntimeFallbacks[moduleId]) {
        return babelRuntimeFallbacks[moduleId];
      }
      return baseRequire(moduleId);
    };

    // Preserve helper methods that Metro attaches (importDefault, etc.)
    if (baseRequire.importDefault) {
      shim.importDefault = baseRequire.importDefault.bind(baseRequire);
    }
    if (baseRequire.importAll) {
      shim.importAll = baseRequire.importAll.bind(baseRequire);
    }
    if (baseRequire.context) {
      shim.context = baseRequire.context.bind(baseRequire);
    }
    if (baseRequire.unpackModuleId) {
      shim.unpackModuleId = baseRequire.unpackModuleId.bind(baseRequire);
    }
    if (baseRequire.packModuleId) {
      shim.packModuleId = baseRequire.packModuleId.bind(baseRequire);
    }

    return shim;
  };

  const defineRequire = (fn) => {
    if (typeof fn !== 'function') {
      return;
    }

    const wrapped = runtimeRequireWrapper(fn);
    if (!wrapped) {
      return;
    }

    cachedBaseRequire = fn;

    try {
      Object.defineProperty(globalRef, 'require', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: wrapped,
      });
    } catch {
      globalRef.require = wrapped; // Fallback if defineProperty fails
    }
  };

  if (typeof globalRef.require !== 'function') {
    defineRequire(resolveMetroRequire());
  }

  // Hermes might define __r slightly later; patch once available.
  if (typeof globalRef.require !== 'function') {
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function patchedDefineProperty(target, property, descriptor) {
      if (target === globalRef && property === '__r' && typeof descriptor?.value === 'function') {
        defineRequire(descriptor.value);
        try {
          Object.defineProperty = originalDefineProperty;
        } catch {
          // no-op
        }
      }
      return originalDefineProperty.call(Object, target, property, descriptor);
    };
  }
})(typeof globalThis !== 'undefined'
  ? globalThis
  : typeof global !== 'undefined'
    ? global
    : this);


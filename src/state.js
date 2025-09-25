const isPrimitive = (v) => ((typeof(v) !== 'object' && typeof(v) !== 'function') || v === null);

const TypedArray = Object.getPrototypeOf(Int8Array));

class State {
  constructor(value){
    this.current = value;
    this.listeners = {};
  }

  set(key, value) {
    if (this.current[key] === value) {
      // skip
      return;
    }
    this.current[key] = value;
    if (!this.listeners[key]) {
      return;
    }
    for (let [subscription, [path, setter]] of this.listeners[key].entries()) {
      let broke = false;
      let v = value;
      let changed = false;
      for (let i = 0; i < path.length; i++) {
        const entry = path[i];
        const {key: prop, value: previous} = entry;
        if (v === previous) {
          broke = true;
          break;
        }
        entry.value = v;
        if (i !== path.length - 1) {
          previous.listeners[path[i+1].key].delete(subscription);
          v = v?.current?.[path[i+1].key];
          changed = true;
        }
      }
      if (changed) {
        this.subscribe(path, setter, subscription);
      }
      !broke && setter(isPrimitive(v) ? v : wrapState(v));
      v = isPrimitive(v) ? v : v.current;
    }
  }

  subscribe(path, setter, subscription) {
    let state = this;
    let i = 0;
    subscription ??= Symbol();
    for (let {key: k, value: v} of path) {
      state.listeners[k] ??= new Map();
      state.listeners[k].set(subscription, [path.slice(i), setter]);
      state = state.current[k];
      i++;
    }
  }
}

const recursiveWrap = (obj, wrapper, checkShared) => {
  let reached;
  if (checkShared) {
    reached = new Map();
  }
  const _recursive = (obj) => {
    if (isPrimitive(obj)) {
      return obj;
    }
    if (checkShared && reached.has(obj)) {
      return reached.get(obj)
    }
    let ret;
    // instanceof TypedArray
    if (obj instanceof TypedArray) {
      ret = obj;
    } else if (obj instanceof Array) {
      ret = obj.map(_recursive);
    } else {
      ret = {};
      for (let k of Object.keys(obj)) {
        ret[k] = _recursive(obj[k]);
      } 
    }
    ret = wrapper(ret);
    if (checkShared) {
      reached.set(obj, ret);
    }
    return ret;
  }
  return _recursive(obj);
};

const _unwrap = Symbol();

const update = Symbol();

const wrapState = (value) =>
  new Proxy(value, {
    get: (target, key) => {
      if (key === _unwrap) {
        return target;
      } else {
        if (target.current instanceof Array) {
          if (["push", "pop", "shift", "unshift", "splice"].includes(key)) {
            return (...args) => {
              if (target.listeners[update]) {
                for (let [_, [path, setter]] of target.listeners[update]?.entries()) {
                  setter((arr) => { const copy = arr.slice(); target.current[key].apply(copy, args); return copy; });
                }
              }
              const result = target.current[key].apply(target.current, args);
              return isPrimitive(result) ? result : wrapState(result);
            }
          } else if (key === Symbol.iterator) {
            return function* () {
              for (let item of target.current) {
                yield isPrimitive(item) ? item : wrapState(item);
              }
            };
          }
        }
        const current = target.current[key];
        return (isPrimitive(current)) ? current : wrapState(current);
      }
    },   
    set: (target, key, value) => {
      if (!isPrimitive(value)) {
        if (value[_unwrap]) {
          value = value[_unwrap];
        } else {
          throw new Error("Assigned object must be wrapped by treeState(...)");
        }
      }
      target.set(key, value);
      return true;
    },
    has: (target, key) =>
      (key in target.current),
    ownKeys: (target) =>
      Reflect.ownKeys(target.current),
    getOwnPropertyDescriptor: (target, prop) =>
      ({
        enumerable: true,
        configurable: true
      }),
  });

const treeState = (value, skipSharedCheck) =>
  wrapState(recursiveWrap(value, (x) => new State(x), !skipSharedCheck));

const binder = (obj) => {
  const root = obj[_unwrap];
  const _binder = (s, path) =>
    (isPrimitive(s)) ?
      (setter) => {
        root.subscribe(path, setter);
        setter(s);
      } :
      new Proxy(() => {}, {
        get: (target, key) => 
          _binder(s.current[key], [...path, {key, value:s.current[key]}]),
        set: (target, key, value) => {
          throw new Error("Binder object is not assignable");
        },
        apply: (target, thisArg, args) => {
          const [setter, ...rest] = args;
          root.subscribe(path, setter);
          setter(wrapState(s)); },
        has: (target, key) =>
          (key in s.current),
        ownKeys: (target) =>
          Reflect.ownKeys(s.current),
        getOwnPropertyDescriptor: (target, prop) =>
          ({
              enumerable: true,
              configurable: true
          }),
      });
  return _binder(root, []);
}

export { treeState, binder, update };

import { treeState, binder, update } from "../src/state.js";
import * as binduct from "../src/index.js";
import {jest} from '@jest/globals';

const makeState = () => {
  let value;
  return [ jest.fn(()=> value),
           jest.fn((v) => { 
             value = (typeof(v) === 'function') ? v(value) : v }) ];
};

describe("treeState", () => {
  test("Store a value at a state", () => {
    const state = treeState({ a: 1, b: { c: 2 } });
    expect(state.a).toBe(1);
    state.a = 10;
    expect(state.a).toBe(10);
    const stateB = state.b;
    expect(stateB.c).toBe(2);
    state.b.c = 5;
    expect(stateB.c).toBe(5);
  });

  test("Assignment triggers the setter function", () => {
    const state = treeState({ a: 1, b: { c: 2 } });
    const [getValue, setValue] = makeState();
    binder(state).b.c(setValue);
    expect(getValue()).toBe(2);
    state.b.c = 7;
    expect(getValue()).toBe(7);
  });

  test("Assignment of another state", () => {
    const state = treeState({ a: 1, b: { c: 2 } });
    const [getValue, setValue] = makeState();
    binder(state).b.c(setValue);
    let newB = treeState({ c: 10 });
    state.b = newB;
    expect(state.b.c).toBe(10);
    expect(getValue()).toBe(10);
  });

  test("Assignment of sliced state", () => {
    const state = treeState({ a: 1, b: { c: 2 } });
    const [getValue, setValue] = makeState();
    binder(state).b.c(setValue);
    const state2 = treeState({ a: 3, b: { c: 6 } });
    state.b = state2.b;
    expect(state.a).toBe(1);
    expect(state.b.c).toBe(6);
    expect(getValue()).toBe(6);
  });

  test("Assignment of sliced state", () => {
    const state = treeState({ a: 1, b: { c: 2 } });
    const [getValue, setValue] = makeState();
    let oldB = state.b;
    binder(oldB).c(setValue);
    let newB = treeState({ c: 6 });
    state.b = newB;
    state.b.c = 6;
    expect(getValue()).toBe(2);
    oldB.c = 5;
    expect(getValue()).toBe(5);
    expect(state.b.c).toBe(6);
  });

  test("Multiple setters", () => {
    const state = treeState({ a: 1, b: { c: 2, d: 3 } });
    const [getValue1, setValue1] = makeState();
    const [getValue2, setValue2] = makeState();
    const [getValue3, setValue3] = makeState();
    binder(state).b.c(setValue1);
    binder(state).b.c(setValue2);
    binder(state).b.d(setValue3);
    expect(getValue1()).toBe(2);
    expect(getValue2()).toBe(2);
    expect(getValue3()).toBe(3);
    state.b.c = 12;
    expect(getValue1()).toBe(12);
    expect(getValue2()).toBe(12);
    expect(getValue3()).toBe(3);
    state.b = treeState({ c: 5, d: 6 });
    expect(getValue1()).toBe(5);
    expect(getValue2()).toBe(5);
    expect(getValue3()).toBe(6);
  });

  test("Delete state", () => {
    const state = treeState({ a: 1, b: { c: 2, d: 3 } });
    const [getValue, setValue] = makeState();
    binder(state).b.c(setValue);
    state.b = treeState({});
    expect(getValue()).toBeUndefined();
    state.b.c = 4;
    expect(getValue()).toBe(4);
  });

  test("Update state", () => {
    const state = treeState({ a: 1, b: { vector: {x: 2, y: 3}, c: 3 } });
    const [getValue1, setValue1] = makeState();
    const [getValue2, setValue2] = makeState();
    binder(state).b.vector.x(setValue1);
    binder(state).b.c(setValue2);
    expect(setValue1).toHaveBeenCalledTimes(1);
    expect(setValue2).toHaveBeenCalledTimes(1);
    state.b = treeState({ ...state.b, c: 5 });
    expect(setValue1).toHaveBeenCalledTimes(1);
    expect(setValue2).toHaveBeenCalledTimes(2);
    expect(getValue1()).toBe(2);
    expect(getValue2()).toBe(5);
    state.b.vector.x = 3;
    expect(getValue1()).toBe(3);
  });

  test("Special property names", () => {
    const state = treeState({ arguments: [ { topic: "Election", caller: "John" }, ] });
    const [getValue, setValue] = makeState();
    binder(state).arguments[0].caller(setValue);
    expect(getValue()).toBe("John");
    state.arguments[0].caller = "Anna";
    expect(getValue()).toBe("Anna");
  });

  test("Shared object detection", () => {
    const sharedObject = { x: 3 };
    const state = treeState({ a: sharedObject, b: sharedObject });
    const [getValue, setValue] = makeState();
    binder(state).a.x(setValue);
    expect(getValue()).toBe(3);
    state.b.x = 7;
    expect(state.a.x).toBe(7);
    expect(getValue()).toBe(7);
  });

  test("Object level binding", () => {
    const state = treeState({ a: 1, b: { vector: { x: 2, y: 3 }, scalar: 3 } });
    const [getValue1, setValue1] = makeState();
    const [getValue2, setValue2] = makeState();
    const [getValue3, setValue3] = makeState();
    binder(state).b.vector(setValue1);
    const v = getValue1();
    expect(v.x).toBe(2);
    binder(v).x(setValue2);
    state.b.vector.x = 0;
    expect(getValue1().x).toBe(0);
    expect(getValue2()).toBe(0);
    state.b = treeState({ vector: { x: 4, y: 5 }, scalar: 2 });
    console.log(state.b.vector);
    expect(getValue1().x).toBe(4);
    // value 2 is bound to the old vector v
    expect(getValue2()).toBe(0);
    binder(getValue1()).x(setValue3);
    state.b.vector.x = 6;
    expect(getValue1().x).toBe(6);
    expect(getValue2()).toBe(0);
    expect(getValue3()).toBe(6);
  });

  test("List keys", () => {
    const state = treeState({ a: 1, b: { c: 2, d: 3 } });
    expect("a" in state).toBeTruthy();
    expect("b" in state).toBeTruthy();
    expect("c" in state).toBeFalsy();
    expect(Object.keys(state)).toContain("a");
    expect(Object.keys(state)).toContain("b");
    expect(Object.keys(state)).not.toContain("c");
    expect("a" in binder(state)).toBeTruthy();
    expect("c" in binder(state)).toBeFalsy();
    expect(Object.keys(binder(state))).toContain("a");
    expect(Object.keys(binder(state))).toContain("b");
    expect(Object.keys(binder(state))).not.toContain("c");
    expect(Object.keys(state.b)).not.toContain("a");
    expect(Object.keys(state.b)).not.toContain("b");
    expect(Object.keys(state.b)).toContain("c");
    expect(Object.keys(state.b)).toContain("d");
    expect(Object.keys(binder(state.b))).toContain("c");
    expect(Object.keys(binder(state).b)).toContain("c");
  });

  test("Store a value at an array state", () => {
    const state = treeState([ 2, 3 ]);
    expect(state[0]).toBe(2);
    state[1] = 10;
    expect(state[1]).toBe(10);
  });

  test("Enumerate array state", () => {
    const state = treeState([ 2, 3 ]);
    expect(state[Symbol.iterator]).not.toBeFalsy();
    let result = [];
    for (let k of state) {
      result.push(k);
    }
    expect(result[0]).toBe(2);
    expect(result[1]).toBe(3);
    expect(result.length).toBe(2);
  });

  test("Modify array state", () => {
    const state = treeState({ numbers: [ 2, 3, 4, 5 ] });
    const [getValue, setValue] = makeState();
    binder(state).numbers[update](setValue);
    binder(state).numbers(setValue);
    expect(getValue()[0]).toBe(2);
    expect(getValue().length).toBe(4);
    expect(state.numbers.pop()).toBe(5);
    expect(getValue().length).toBe(3);
  });

  test("Modify typed array state", () => {
    const state = treeState({ numbers: Uint8Array.from([ 2, 3, 4, 5 ]) });
    const [getValue, setValue] = makeState();
    binder(state).numbers[update](setValue);
    binder(state).numbers(setValue);
    expect(getValue()[0]).toBe(2);
    expect(getValue().length).toBe(4);
    expect(state.numbers.pop()).toBe(5);
    expect(getValue().length).toBe(3);
  });

  test("Assigning unwrapped object throws error", () => {
    const state = treeState({ a: 1, b: { c: 2 } });
    expect(() => {
      state.b = { c: 5 };
    }).toThrow("Assigned object must be wrapped by treeState(...)");
  });
});

describe("subscription lifecycle", () => {
  test("public entry exposes update and registrations return callables", () => {
    expect(typeof binduct.update).toBe("symbol");
    const state = binduct.treeState({ count: 0, nested: { label: "x" }, items: [1] });
    const stopLeaf = binduct.binder(state).count(() => {});
    const stopObject = binduct.binder(state).nested(() => {});
    const stopArrayUpdate = binduct.binder(state).items[binduct.update](() => {});
    expect(typeof stopLeaf).toBe("function");
    expect(typeof stopObject).toBe("function");
    expect(typeof stopArrayUpdate).toBe("function");
    stopLeaf();
    stopObject();
    stopArrayUpdate();
  });

  test("ordinary binding delivers immediately and disposal stops it", () => {
    const state = binduct.treeState({ value: 1 });
    const setter = jest.fn();
    const stop = binduct.binder(state).value(setter);
    expect(typeof stop).toBe("function");
    expect(setter).toHaveBeenCalledTimes(1);
    expect(setter).toHaveBeenLastCalledWith(1);
    state.value = 2;
    expect(setter).toHaveBeenLastCalledWith(2);
    stop();
    stop();
    state.value = 3;
    expect(setter).toHaveBeenCalledTimes(2);
  });

  test("disposal detaches only its own registration for the same setter", () => {
    const state = binduct.treeState({ value: 1 });
    const setter = jest.fn();
    const stopFirst = binduct.binder(state).value(setter);
    const stopSecond = binduct.binder(state).value(setter);
    expect(typeof stopFirst).toBe("function");
    expect(typeof stopSecond).toBe("function");
    expect(setter).toHaveBeenCalledTimes(2);
    stopFirst();
    state.value = 2;
    expect(setter).toHaveBeenCalledTimes(3);
    expect(setter).toHaveBeenLastCalledWith(2);
    stopSecond();
    state.value = 3;
    expect(setter).toHaveBeenCalledTimes(3);
  });

  test("object binding stops delivering replacements after disposal", () => {
    const state = binduct.treeState({ branch: { value: 1 } });
    const setter = jest.fn();
    const stop = binduct.binder(state).branch(setter);
    expect(typeof stop).toBe("function");
    expect(setter.mock.calls[0][0].value).toBe(1);
    state.branch = binduct.treeState({ value: 2 });
    expect(setter).toHaveBeenCalledTimes(2);
    expect(setter.mock.calls[1][0].value).toBe(2);
    stop();
    stop();
    state.branch = binduct.treeState({ value: 3 });
    expect(setter).toHaveBeenCalledTimes(2);
  });

  test("root-path binding follows replacement and disposal cleans the current path", () => {
    const state = binduct.treeState({ b: { c: 2 } });
    const oldBranch = state.b;
    const setter = jest.fn();
    const stop = binduct.binder(state).b.c(setter);
    expect(typeof stop).toBe("function");
    expect(setter).toHaveBeenLastCalledWith(2);
    state.b = binduct.treeState({ c: 10 });
    expect(setter).toHaveBeenLastCalledWith(10);
    oldBranch.c = 3;
    expect(setter).toHaveBeenCalledTimes(2);
    stop();
    state.b.c = 11;
    expect(setter).toHaveBeenCalledTimes(2);
    state.b = binduct.treeState({ c: 12 });
    expect(setter).toHaveBeenCalledTimes(2);
  });

  test("branch-rooted binding stays on the old branch until disposed", () => {
    const state = binduct.treeState({ b: { c: 2 } });
    const oldBranch = state.b;
    const setter = jest.fn();
    const stop = binduct.binder(oldBranch).c(setter);
    expect(typeof stop).toBe("function");
    expect(setter).toHaveBeenLastCalledWith(2);
    state.b = binduct.treeState({ c: 10 });
    expect(setter).toHaveBeenCalledTimes(1);
    state.b.c = 11;
    expect(setter).toHaveBeenCalledTimes(1);
    oldBranch.c = 4;
    expect(setter).toHaveBeenLastCalledWith(4);
    stop();
    oldBranch.c = 5;
    expect(setter).toHaveBeenCalledTimes(2);
  });

  test("a path can be subscribed again after disposal", () => {
    const state = binduct.treeState({ value: 1 });
    const first = jest.fn();
    const stopFirst = binduct.binder(state).value(first);
    expect(typeof stopFirst).toBe("function");
    stopFirst();
    state.value = 2;
    expect(first).toHaveBeenCalledTimes(1);
    const second = jest.fn();
    const stopSecond = binduct.binder(state).value(second);
    expect(typeof stopSecond).toBe("function");
    expect(second).toHaveBeenLastCalledWith(2);
    state.value = 3;
    expect(second).toHaveBeenLastCalledWith(3);
    stopSecond();
  });

  test("separate trees do not share subscriptions", () => {
    const stateA = binduct.treeState({ value: 1 });
    const stateB = binduct.treeState({ value: 1 });
    const setA = jest.fn();
    const setB = jest.fn();
    const stopA = binduct.binder(stateA).value(setA);
    const stopB = binduct.binder(stateB).value(setB);
    expect(typeof stopA).toBe("function");
    expect(typeof stopB).toBe("function");
    stateA.value = 2;
    expect(setA).toHaveBeenLastCalledWith(2);
    expect(setB).toHaveBeenCalledTimes(1);
    expect(setB).toHaveBeenLastCalledWith(1);
    stopA();
    stopB();
  });

  test("array update receives updater functions without an initial value", () => {
    const state = binduct.treeState({ items: [1, 2] });
    const onUpdate = jest.fn();
    const stop = binduct.binder(state).items[binduct.update](onUpdate);
    expect(typeof stop).toBe("function");
    expect(onUpdate).not.toHaveBeenCalled();
    const original = [1, 2];
    state.items.push(3);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updater = onUpdate.mock.calls[0][0];
    expect(typeof updater).toBe("function");
    expect(updater(original)).toEqual([1, 2, 3]);
    expect(original).toEqual([1, 2]);
    stop();
  });

  test("array update follows replacement and disposes independently", () => {
    const state = binduct.treeState({ items: [1, 2] });
    const oldItems = state.items;
    const onUpdate = jest.fn();
    const onReplace = jest.fn();
    const stopUpdate = binduct.binder(state).items[binduct.update](onUpdate);
    const stopReplace = binduct.binder(state).items(onReplace);
    expect(typeof stopUpdate).toBe("function");
    expect(typeof stopReplace).toBe("function");
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onReplace).toHaveBeenCalledTimes(1);
    state.items = binduct.treeState([3, 4]);
    expect(onReplace).toHaveBeenCalledTimes(2);
    oldItems.push(5);
    expect(onUpdate).not.toHaveBeenCalled();
    state.items.push(5);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updater = onUpdate.mock.calls[0][0];
    expect(updater([3, 4])).toEqual([3, 4, 5]);
    stopUpdate();
    state.items.push(6);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onReplace).toHaveBeenCalledTimes(2);
    state.items = binduct.treeState([7]);
    expect(onReplace).toHaveBeenCalledTimes(3);
    stopReplace();
    state.items = binduct.treeState([8]);
    expect(onReplace).toHaveBeenCalledTimes(3);
  });

  test("disposal survives a missing intermediate path", () => {
    const state = binduct.treeState({ b: { c: 2 } });
    const setter = jest.fn();
    const stop = binduct.binder(state).b.c(setter);
    expect(typeof stop).toBe("function");
    state.b = binduct.treeState({});
    expect(setter).toHaveBeenLastCalledWith(undefined);
    stop();
    state.b.c = 4;
    expect(setter).toHaveBeenCalledTimes(2);
  });
});

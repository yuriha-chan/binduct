import { treeState, binder, update } from "../src/state.js";
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

  test("Assigning unwrapped object throws error", () => {
    const state = treeState({ a: 1, b: { c: 2 } });
    expect(() => {
      state.b = { c: 5 };
    }).toThrow("Assigned object must be wrapped by treeState(...)");
  });
});

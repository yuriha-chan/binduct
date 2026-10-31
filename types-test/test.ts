import { treeState, binder, update } from "binduct";
import type { Binder, StateProxy, Unsubscribe } from "binduct";

type Item = { name: string; content: Array<number>;};
type Stock = { count: number; item: Item; };

const stock: Stock = { count: 4, item: { name: "X Series", content: [1, 2, 3] } };
const state: StateProxy<Stock> = treeState(stock);

console.log(state.count + 1);
// @ts-expect-error
console.log(state.quality);

const stateBinder: Binder<Stock> = binder(state);
const stopCount: Unsubscribe = stateBinder.count((value) => {
  console.log("Count + 1:", value + 1);
  // @ts-expect-error
  console.log("Count First Letter ??:", value.charAt(0));
});
stopCount();

const stopItem: Unsubscribe = stateBinder.item((value) => {
  console.log("Item Name:", value.name);
});
stopItem();

stateBinder.item.name((value) => {
  console.log("Item Name Letter:", value.charAt(0));
});

let copy: number[] = [1, 2, 3];
const stopContentUpdate: Unsubscribe = stateBinder.item.content[update]((updater) => { copy = updater(copy) });
stopContentUpdate();
stateBinder.item.content[0]((value) => console.log(value));
// @ts-expect-error
stateBinder.item.content.x((value) => console.log(value));

// @ts-expect-error
console.log(stateBinder.quality);

state.count = 5;
state.item.name = "A Series";
state.item.content.pop();
state.item = treeState({name: "Y Series", content: [5, 4, 3]});

type MaybeStock = { count: number; item?: Item; };

const stock2: MaybeStock = { count: 3, item: { name: "Z Series", content: [2, 3] } };
const state2: StateProxy<MaybeStock> = treeState(stock2);

binder(state2).item?.name?.((x) => console.log(x));
// x can be undefined
// @ts-expect-error
binder(state2).item?.name?.((x) => console.log(x.charAt(0)));

// @ts-expect-error setter must be a function
stateBinder.count(42);
// @ts-expect-error setter parameter type must match the bound value
stateBinder.count((value: string) => console.log(value));
// @ts-expect-error update setter must be a function
stateBinder.item.content[update](42);
// @ts-expect-error update callback receives an updater function, not an array
stateBinder.item.content[update]((value: number[]) => console.log(value.length));

import { treeState, binder, update } from "binduct";
import type { Binder, WrappedState } from "binduct";

type Item = { name: string; content: Array<number>;};
type Stock = { count: number; item: Item; };

const stock: Stock = { count: 4, item: { name: "X Series", content: [1, 2, 3] } };
const state: WrappedState<Stock> = treeState(stock);

console.log(state.count + 1);
// @ts-expect-error
console.log(state.quality);

const stateBinder: Binder<Stock> = binder(state);
stateBinder.count((value) => {
  console.log("Count + 1:", (value ?? 0) + 1);
  // @ts-expect-error
  console.log("Count First Letter ??:", value.charAt(0));
});

stateBinder.item.name((value) => {
  console.log("Item Name Letter:", (value ?? "Y").charAt(0));
});

let copy: number[] = [1, 2, 3];
stateBinder.item.content[update]((updater) => { copy = updater(copy) });
stateBinder.item.content[0]((value) => console.log(value));
// @ts-expect-error
stateBinder.item.content.x((value) => console.log(value));

// @ts-expect-error
console.log(stateBinder.quality);

state.count = 5;
state.item.name = "A Series";
state.item.content.pop();
state.item = treeState({name: "Y Series", content: [5, 4, 3]});
state.item = undefined;

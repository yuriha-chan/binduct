type Primitive = string | number | boolean | null | undefined | symbol | bigint;

export declare type Unsubscribe = () => void;

export declare const update: unique symbol;
export declare function treeState<T extends object>(value: T): StateProxy<T>;
export declare function binder<T>(obj: StateProxy<T>): Binder<T>;

export declare type StateProxy<T> = {
  [K in keyof T]: T[K] extends Primitive ? T[K] : StateProxy<T[K]>;
};

export declare type Binder<T> = {
  [K in keyof T]: T[K] extends Primitive ?
    (setter: (prev: T[K]) => void) => Unsubscribe
  : T[K] extends any[] ?
    { [update] : (setter: (updater: <U>(prev: U[]) => U[]) => void) => Unsubscribe } & (undefined extends T[K] ? UndefinableBinder<T[K]> : Binder<T[K]>)
  : undefined extends T[K] ?
    UndefinableBinder<T[K]>
  : Binder<T[K]>
} & {
  (setter: (value: StateProxy<T>) => void): Unsubscribe;
};

export declare type UndefinableBinder<T> = {
  [K in keyof T]: T[K] extends Primitive ?
    (setter: (prev: T[K] | undefined) => void) => Unsubscribe
  : T[K] extends any[] ?
    { [update] : (setter: (updater: <U>(prev: U[]) => U[]) => void) => Unsubscribe } & UndefinableBinder<T[K]>
  : UndefinableBinder<T[K]>
} & {
  (setter: (value: StateProxy<T> | undefined) => void): Unsubscribe;
};

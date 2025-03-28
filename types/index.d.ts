type Primitive = string | number | boolean | null | undefined | symbol | bigint;

export declare const update: unique symbol;
export declare function treeState<T extends object>(value: T): StateProxy<T>;
export declare function binder<T>(obj: StateProxy<T>): Binder<T>;

export declare type StateProxy<T> = {
  [K in keyof T]: T[K] extends Primitive ? T[K] : StateProxy<T[K]>;
};

export declare type Binder<T> = {
  [K in keyof T]: T[K] extends Primitive ?
    (setter: (prev: T[K]) => void) => void
  : T[K] extends any[] ?
    { [update] : (setter: (updater: <U>(prev: U[]) => U[]) => void) => void } & (undefined extends T[K] ? UndefinableBinder<T[K]> : Binder<T[K]>)
  : undefined extends T[K] ?
    UndefinableBinder<T[K]>
  : Binder<T[K]>
} & {
  (setter: (value: StateProxy<T>) => void): void;
};

export declare type UndefinableBinder<T> = {
  [K in keyof T]: T[K] extends Primitive ?
    (setter: (prev: T[K] | undefined) => void) => void
  : T[K] extends any[] ?
    { [update] : (setter: (updater: <U>(prev: U[]) => U[]) => void) => void } & UndefinableBinder<T[K]>
  : UndefinableBinder<T[K]>
} & {
  (setter: (value: StateProxy<T> | undefined) => void): void;
};

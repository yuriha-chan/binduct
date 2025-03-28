type Primitive = string | number | boolean | null | undefined | symbol | bigint;

export declare const update: unique symbol;
export declare function treeState<T extends object>(value: T): WrappedState<T>;
export declare function binder<T>(obj: WrappedState<T>): Binder<T>;

export declare type WrappedState<T> = {
  [K in keyof T]: T[K] extends Primitive ? T[K] : WrappedState<T[K]>;
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
  (setter: (value: WrappedState<T>) => void): void;
};

export declare type UndefinableBinder<T> = {
  [K in keyof T]: T[K] extends Primitive ?
    (setter: (prev: T[K] | undefined) => void) => void
  : T[K] extends any[] ?
    { [update] : (setter: (updater: <U>(prev: U[]) => U[]) => void) => void } & UndefinableBinder<T[K]>
  : UndefinableBinder<T[K]>
} & {
  (setter: (value: WrappedState<T> | undefined) => void): void;
};

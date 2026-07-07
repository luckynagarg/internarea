// Utility types to derive valid dot-path keys from a nested object.

export type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

type IsPlainObject<T> = T extends object
  ? T extends any[]
    ? false
    : true
  : false;

export type Paths<T> = T extends object
  ? {
      [K in keyof T & (string)]: IsPlainObject<T[K]> extends true
        ? `${K}${DotPrefix<Paths<T[K]> extends infer P ? (P extends string ? P : never) : never>}` | K
        : K;
    }[keyof T & string]
  : never;

export type TranslationKey<TDict> = Paths<TDict> & string;


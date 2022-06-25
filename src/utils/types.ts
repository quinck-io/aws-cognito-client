export type KeyOf<T> = keyof T

export type StringKeyOf<T> = Extract<T, string>

export type Entries<K extends string, V> = [K, V][]

export type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>
      }
    : T

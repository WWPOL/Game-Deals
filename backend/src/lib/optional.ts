/**
 * Variation of Optional where value is set.
 * @typeParam T - Type of value.
 */
export type SomeT<T> = {
  /**
   * Typing tag.
   */
  _tag: "some";

  /**
   * Stored value.
   */
  value: T;
}

/**
 * Variation of Optional where value is unset.
 */
export type NoneT = {
  /**
   * Typing tag.
   */
  _tag: "none";
}

/**
 * Typing tag value for SomeT.
 */
export const SOME_TYPE_TAG = "some";

/**
 * Typing tag value for NoneT.
 */
export const NONE_TYPE_TAG = "none";

/**
 * Type for a value which can be not set (None) or set (Some).
 * @typeParam T - Type of value.
 */
export type Optional<T> = SomeT<T> | NoneT;

/**
 * Tests if an optional is Some.
 * @typeParam T - Type of value.
 * @param o - Optional to test.
 * @returns True if optional is Some.
 */
export function isSome<T>(o: Optional<T>): o is SomeT<T> {
  if (o._tag === SOME_TYPE_TAG) {
    return true;
  }

  return false;
}

/**
 * Tests if an optional is None.
 * @typeParam T - Type of value.
 * @param o - Optional to test.
 * @returns True if optional is None.
 */
export function isNone<T>(o: Optional<T>): o is NoneT {
  if (isSome(o)) {
    return false;
  }

  return true;
}

/**
 * Construct a Some optional with a value.
 * @typeParam T - Type of value.
 * @param value - The data to store in the optional.
 * @returns Optional with value stored in Some.
 */
export function Some<T>(value: T): Optional<T> {
  return {
    _tag: SOME_TYPE_TAG,
    value: value,
  };
}

/**
 * Construct a None optional.
 * @typeParam T - Type of value.
 * @returns None optional.
 */
export function None<T>(): Optional<T> {
  return {
    _tag: NONE_TYPE_TAG,
  };
}

/**
 * Retrieve a value from an optional. If the value doesn't exist throw an error.
 * Good for cases where you logically know an optional cannot be None, but the type system doesn't know this.
 * @typeParam T - Type of value.
 * @param o - Optional from which to retrieve value.
 * @throws {@link Error}
 * If optional is None.
 * @returns Value if Optional is not None.
 */
export function unwrapPanic<T>(o: Optional<T>): T {
  if (isNone(o)) {
    throw new Error("Optional was None");
  }

  return o.value;
}

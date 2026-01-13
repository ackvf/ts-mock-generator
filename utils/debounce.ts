/**
 * @author Qwerty <qwerty@qwerty.xyz>
 * @link [gist](https://gist.github.com/ackvf/68f992660a5eda645c4671d3599b2acf#file-debounce-ts)
 *
 * @description Returns a function, that, as long as it continues to be invoked, will not
 * trigger the callback. The callback will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the callback on the
 * leading edge, instead of the trailing.
 *
 * `.cancel()` can be called manually to cancel the scheduled *trailing* invocation or reset the *leading* cooldown, allowing *immediate* invocation again.
 *
 * **Note**: The `debounced` output function must be set just once.
 *
 * @example
 * const debounced = debounce((ev) => console.log('once'), 500)
 * window.addEventListener('keypress', debounced)
 *
 * @param wait - [milliseconds]
 * @param immediate - *(optional)* Control whether the callback should be triggered on the leading or trailing edge of the wait interval.
 */

export function debounce<Callback extends AnyFunction<void>>(cb: Callback, wait: number, immediate?: boolean) {
  let timeout: NodeJS.Timeout | undefined

  const later = (self: unknown, args: Parameters<Callback>) => {
    timeout = undefined
    if (!immediate) cb.apply(self, args)
  }

  function debounced(this: unknown, ...args: Parameters<Callback>): void {
    const callNow = !timeout
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait, this, args)
    if (immediate && callNow) cb.apply(this, args)
  }

  /**
   * Call manually to
   * - cancel the scheduled ***trailing*** invocation *(`immediate: false`, default)*
   * - or reset the ***leading*** cooldown, allowing *immediate* invocation again. *(`immediate: true`)*
   */
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = undefined
    }
  }

  return debounced
}

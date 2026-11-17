import 'react';

declare module 'react' {
  interface HTMLAttributes<T> extends DOMAttributes<T> {
    focusgroup?: string;
    'data-layer-focusgroup'?: string;
  }
}

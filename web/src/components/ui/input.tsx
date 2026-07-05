import tw from 'tailwind-styled-components';

export const Input = tw.input`
  h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground
  placeholder:text-faint
  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent
  disabled:opacity-50
`;

export const Textarea = tw.textarea`
  w-full resize-none rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-foreground
  placeholder:text-faint
  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent
  disabled:opacity-50
`;

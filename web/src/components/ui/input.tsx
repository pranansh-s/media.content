import tw from 'tailwind-styled-components';

export const Input = tw.input`
  border-border
  bg-surface
  text-foreground
  placeholder:text-faint
  focus-visible:outline-accent
  h-10
  w-full
  rounded-md
  border
  px-3
  text-sm
  focus-visible:outline-2
  focus-visible:outline-offset-1
  disabled:opacity-50
`;

export const Textarea = tw.textarea`
  border-border
  bg-surface
  text-foreground
  placeholder:text-faint
  focus-visible:outline-accent
  w-full
  resize-none
  rounded-md
  border
  px-3
  py-2.5
  text-sm
  focus-visible:outline-2
  focus-visible:outline-offset-1
  disabled:opacity-50
`;

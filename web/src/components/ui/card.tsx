import tw from 'tailwind-styled-components';

export const Card = tw.div`
  rounded-lg border border-border bg-surface
`;

export const CardHeader = tw.div`
  flex items-center justify-between gap-3 border-b border-border px-4 py-3
`;

export const CardBody = tw.div`
  px-4 py-4
`;

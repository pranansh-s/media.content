import { SHARED_VERSION } from '@media-content/shared';

import { createApp } from './app';

const app = createApp();
const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`media.content server (shared v${SHARED_VERSION}) listening on :${port}`);
});

FROM node:26.3.0-slim

# pnpm pinned to the repo's packageManager version. Node 26 no longer bundles
# corepack, so install via npm.
RUN npm install -g pnpm@11.5.2

WORKDIR /app

# Confine pnpm to a single flat /app/node_modules so one named volume per
# service shadows it (the default symlinked linker writes a node_modules into
# every apps/* and packages/* dir, which would leak onto the bind-mounted host
# tree). Workspace packages like @demo/contracts are still symlinked to the
# bind-mounted source, which is fine — they have no build step.
ENV NPM_CONFIG_NODE_LINKER=hoisted

# Dev image: source arrives at runtime via bind mount, so there is no COPY.
# Each service overrides `command` in docker-compose.yml.
CMD ["node", "--version"]

FROM node:26.3.1-slim

# pnpm pinned to the repo's packageManager version. Node 26 no longer bundles
# corepack, so install via npm.
RUN npm install -g pnpm@11.5.2

WORKDIR /app

# Keep pnpm's content-addressable store on the node_modules volume, not on the
# bind-mounted /app (pnpm otherwise drops a .pnpm-store/ into the host repo on
# every install). pnpm honors the PNPM_CONFIG_<setting> env convention
# (NOT npm_config_/PNPM_STORE_DIR).
ENV PNPM_CONFIG_STORE_DIR=/app/node_modules/.pnpm-store

# Dev image: source arrives at runtime via bind mount, so there is no COPY.
# Each service overrides `command` in docker-compose.yml.
CMD ["node", "--version"]

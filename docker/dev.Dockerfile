# Imagem de desenvolvimento: Node 24 + pnpm. Nada precisa ser instalado no PC.
FROM node:24-bookworm-slim

RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Cliente docker: o Supabase CLI o usa para subir e inspecionar os containers locais.
COPY --from=docker:29-cli /usr/local/bin/docker /usr/local/bin/docker

# Store do pnpm e cache do corepack em volumes nomeados
# (criados aqui para já pertencerem ao usuário node).
RUN mkdir -p /home/node/.pnpm-store /home/node/.cache \
  && chown node:node /home/node/.pnpm-store /home/node/.cache
ENV PNPM_STORE_DIR=/home/node/.pnpm-store \
  COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  NEXT_TELEMETRY_DISABLED=1

# O usuário node tem uid 1000, o mesmo do usuário do PC: arquivos criados
# dentro do container continuam sendo seus.
USER node

# For additional guidance on containerized actions, see https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-docker-container-action
FROM node:lts-alpine

# Install packages including yt-dlp for video streaming
# yt-dlp requires Python3
RUN apk add --no-cache git github-cli ffmpeg curl python3 py3-pip

# Install yt-dlp via pip (Alpine doesn't have yt-dlp in apk)
RUN pip3 install --break-system-packages yt-dlp

# Verify installations
RUN node --version
RUN ffmpeg -version
RUN yt-dlp --version

# Set working directory
WORKDIR /genaiscript/action

# Copy source code
COPY . .

# Install dependencies
RUN npm ci

# GitHub Action forces the WORKDIR to GITHUB_WORKSPACE
ENTRYPOINT ["npm", "--prefix", "/genaiscript/action", "start"]
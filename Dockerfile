FROM node:16-alpine

# Set working directory
WORKDIR /bacstack

# Install dependencies
COPY package.json .
RUN yarn

# Add node-bacstack
Add . .

# Run compliance tests
CMD yarn compliance

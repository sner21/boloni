# 构建 Next.js 生产镜像，用于 Docker Compose 部署。
FROM node:22-alpine

# 应用运行目录。
WORKDIR /app
# 关闭 Next.js 遥测，避免构建时输出额外提示。
ENV NEXT_TELEMETRY_DISABLED=1

# 先复制依赖清单，利用 Docker 层缓存安装依赖。
COPY package*.json ./
RUN npm ci

# 复制项目源码并执行生产构建。
COPY . .
RUN npm run build

# Next.js 生产服务端口。
EXPOSE 3000
# 启动 Next.js 生产服务。
CMD ["npm", "run", "start"]

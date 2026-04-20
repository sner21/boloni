# 博洛尼全屋定制供应链协同系统

本项目是面试题《基于 AI 构建多维表格引擎与供应链应用》的博洛尼业务语境版本，技术栈为 Next.js、TypeScript、Node.js、PostgreSQL、Drizzle、Zod 和 Scalar。

系统包含两个部分：

- 多维表格引擎：支持动态表、动态字段、记录 CRUD、关联字段、公式字段、分组聚合和内联编辑。
- 博洛尼定制协同应用：围绕整体厨房、全屋定制、门墙系统、智慧厨房和工程交付，提供供应商履约评分、定制订单摘要、交付预警和仪表盘。

## 品牌化改造说明

本项目用于博洛尼相关面试演示，不声称为博洛尼官方内部系统。界面和数据参考博洛尼官网公开信息中的业务语境，例如“整体厨房”“全屋定制”“大师联名”“工程业务”“大师设计”“德国品质”“新奢侈主义”和“智慧厨房”。

演示数据使用板材、五金、石材、智能厨电、门墙系统等全屋定制供应链场景，便于面试时把多维表格引擎能力落到博洛尼业务上。

## Docker 运行

推荐使用 Docker Compose 运行，避免本机 Node 版本或 Windows 文件系统差异影响构建。

```bash
docker compose up --build
```

启动后打开：

```text
http://localhost:3000
```

进入页面后点击 `初始化博洛尼演示数据`，系统会创建博洛尼供应商表、博洛尼产品表和博洛尼定制订单表。

如果希望命令行初始化演示数据：

```bash
docker compose --profile seed up seed
```

## 本地开发

本项目要求 Node.js 20 或更高版本。当前机器的系统 Node 曾是 16，因此 Docker 是更稳的默认方式。

如果在 Windows 的 exFAT 磁盘上执行 `next build`，Next.js 可能因为 `readlink` 能力不足失败。解决方式：

- 使用 Docker Compose。
- 或把项目放到 NTFS 路径后再执行生产构建。

本地开发命令：

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run seed
npm run dev
```

## API 文档

系统内置 OpenAPI 和 Scalar 文档：

- OpenAPI JSON：`http://localhost:3000/openapi.json`
- Scalar 文档：`http://localhost:3000/reference`

## AI 配置

默认使用 mock 模式，未配置大模型密钥时也能完整演示博洛尼业务流程。

```bash
AI_PROVIDER=mock
```

接入豆包 / 火山方舟时配置：

```bash
AI_PROVIDER=doubao
ARK_API_KEY=your_key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=your_enabled_model_id
```

建议在火山方舟控制台选择已开通的低价 Doubao Lite、Mini 或 Flash 类模型。代码会在接口失败时回退到 mock 结果，保证演示流程不中断。

## 线上部署

Vercel 部署步骤：

1. 在 Neon、Supabase 或 Render 创建 PostgreSQL 数据库。
2. 将项目部署到 Vercel。
3. 配置 `DATABASE_URL`、`AI_PROVIDER`、`ARK_API_KEY`、`ARK_BASE_URL` 和 `ARK_MODEL`。
4. 在可信终端使用生产 `DATABASE_URL` 执行一次 `npm run db:migrate`。

## 质量检查

运行：

```bash
npm run lint
npm run test
```

检查内容：

- TypeScript 类型检查。
- 单文件不超过 1000 行。
- 人工命名不超过 4 个英文词或 4 段语义单元。
- 公式和 Zod schema 单元测试。

## 关键能力

- 关联字段使用 `record_links` 独立表存储，不依赖 JSON 字符串拼接。
- 公式字段使用安全 AST 计算，不使用 `eval`。
- Zod 负责请求体、字段配置、公式 AST 和 AI 响应校验。
- Scalar 自动展示 OpenAPI 文档。
- 前端支持多级分组折叠、数字/公式聚合、选项 chip 选择和公式模板创建。
- 业务界面以博洛尼全屋定制为语境，强调定制订单、供应商履约、项目交付和高端空间产品系统。

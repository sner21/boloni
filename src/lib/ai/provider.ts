/**
 * 封装豆包/火山方舟和 mock 大模型能力，用于博洛尼供应商履约评分和定制订单摘要。
 */

import { riskResultSchema } from "@/lib/schemas/base";

type ChatMessage = { role: "system" | "user"; content: string };

/** 风险评分输入数据。 */
export type RiskInput = {
  name: string;
  delayDays: number;
  riskLevel?: string;
};

/** 订单摘要输入数据。 */
export type SummaryInput = {
  supplier: string;
  product: string;
  quantity: number;
  amount: number | null;
};

/**
 * 生成博洛尼供应商 AI 履约风险评分。
 *
 * @param input 供应商名称、历史延迟天数和当前风险等级。
 * @returns 返回 0-100 履约风险评分、风险等级和中文原因；接口失败时返回 mock 结果。
 */
export async function makeRisk(input: RiskInput) {
  if (!shouldCallArk()) return mockRisk(input);

  // 博洛尼供应商履约评分 Prompt，要求模型只输出 JSON，便于后续 Zod 校验。
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是博洛尼全屋定制供应链风控助手。只返回 JSON，不要 Markdown。字段为 score、level、reason。level 只能是 低、中、高。",
    },
    {
      role: "user",
      content: `供应商名称：${input.name}\n当前风险等级：${input.riskLevel ?? "未知"}\n历史延迟天数：${input.delayDays}\n请结合博洛尼全屋定制、智慧厨房和工程交付节点，给出 0-100 履约风险评分。延迟超过 10 天应为高风险，并说明对定制项目交付的影响。`,
    },
  ];

  try {
    // 大模型原始返回文本，可能是严格 JSON，也可能带额外文本。
    const raw = await callArk(messages, true);
    // 结构化风险结果，解析失败时回退 mock。
    const parsed = riskResultSchema.safeParse(readJson(raw));
    return parsed.success ? parsed.data : mockRisk(input);
  } catch {
    return mockRisk(input);
  }
}

/**
 * 生成博洛尼定制订单自然语言摘要。
 *
 * @param input 订单关联供应商、产品系统、数量和金额。
 * @returns 返回一段中文定制订单摘要；接口失败时返回 mock 摘要。
 */
export async function makeSummary(input: SummaryInput) {
  if (!shouldCallArk()) return mockSummary(input);

  // 定制订单摘要 Prompt，限定为一句中文，避免生成过长说明。
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "你是博洛尼全屋定制订单协同助手。用一句中文生成订单摘要，包含供应商、产品系统、数量、金额和交付建议，不要列表。",
    },
    {
      role: "user",
      content: `供应商：${input.supplier}\n产品系统：${input.product}\n采购数量：${input.quantity}\n总金额：${input.amount ?? "待计算"}`,
    },
  ];

  try {
    // 大模型生成的摘要文本。
    const raw = await callArk(messages, false);
    return raw.trim() || mockSummary(input);
  } catch {
    return mockSummary(input);
  }
}

/**
 * 判断当前是否应该调用真实火山方舟接口。
 *
 * @returns 配置了 doubao provider 且存在 API key 时返回 true。
 */
function shouldCallArk() {
  return process.env.AI_PROVIDER === "doubao" && Boolean(process.env.ARK_API_KEY);
}

/**
 * 调用火山方舟 OpenAI 兼容接口。
 *
 * @param messages Chat Completions 消息列表。
 * @param json 是否要求模型按 JSON object 返回。
 * @returns 返回模型回复文本；HTTP 异常时抛出错误。
 */
async function callArk(messages: ChatMessage[], json: boolean) {
  // 火山方舟 API 基础地址。
  const baseUrl = process.env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3";
  // 火山方舟模型 ID，必须是控制台已开通的模型。
  const model = process.env.ARK_MODEL ?? "doubao-lite-32k";
  // Chat Completions HTTP 响应。
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Ark request failed: ${response.status}`);
  }

  // 火山方舟响应 JSON，结构与 OpenAI Chat Completions 兼容。
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * 根据延迟天数生成稳定的 mock 风险评分。
 *
 * @param input 风险评分输入。
 * @returns mock 风险评分对象。
 */
function mockRisk(input: RiskInput) {
  if (input.delayDays > 10) {
    return { score: 88, level: "高" as const, reason: "历史延迟超过 10 天，可能影响博洛尼定制项目安装节点。" };
  }
  if (input.delayDays > 5) {
    return { score: 62, level: "中" as const, reason: "历史延迟处于中等区间，建议跟进柜体、板材或厨电到货计划。" };
  }
  return { score: 24, level: "低" as const, reason: "历史延迟较少，可支撑博洛尼全屋定制项目稳定交付。" };
}

/**
 * 生成稳定的 mock 订单摘要。
 *
 * @param input 订单摘要输入。
 * @returns 中文摘要文本。
 */
function mockSummary(input: SummaryInput) {
  return `${input.supplier} 将为博洛尼 ${input.product} 提供 ${input.quantity} 件定制采购，当前总金额为 ${input.amount ?? "待计算"}，建议同步项目交付节点。`;
}

/**
 * 从模型输出中读取 JSON。
 *
 * @param value 模型原始输出文本。
 * @returns JSON 对象；无法解析时返回空对象。
 */
function readJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}

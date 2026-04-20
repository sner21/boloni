/**
 * 渲染博洛尼定制交付仪表盘，包括订单金额、供应商风险和交付预警。
 */

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardData } from "./types";

/**
 * 渲染博洛尼定制交付仪表盘。
 *
 * @param props 包含仪表盘统计数据，未加载时允许为 null。
 * @returns 定制订单金额、供应商风险分布图和交付预警列表。
 */
export function Dashboard({ data }: { data: DashboardData | null }) {
  // 定制订单公式汇总后的总金额。
  const total = data?.totalAmount ?? 0;
  // 当前低于安全库存、可能影响项目交付的产品列表。
  const warnings = data?.warnings ?? [];

  return (
    <section className="panel">
      <h3>定制交付仪表盘</h3>
      <p>定制订单总额、供应商风险和项目交付缺口。</p>
      <div className="metric-row" style={{ marginTop: 12 }}>
        <div className="metric">
          <span className="muted">定制订单总额</span>
          <strong>{formatMoney(total)}</strong>
        </div>
        <div className="metric">
          <span className="muted">供应商风险</span>
          <strong>{data?.riskDist.length ?? 0}</strong>
        </div>
        <div className="metric">
          <span className="muted">交付预警</span>
          <strong>{warnings.length}</strong>
        </div>
      </div>
      <div className="chart-box">
        <ResponsiveContainer>
          <BarChart data={data?.riskDist ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ded8cf" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#b89157" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="warn-list">
        {warnings.map((item) => (
          <div className="warn-item" key={item.id}>
            <strong>{item.sku}</strong>
            <div className="muted">
              当前 {item.current} / 安全 {item.safe}，交付缺口 {item.shortage}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * 把数值格式化为人民币金额。
 *
 * @param value 原始金额数值。
 * @returns 人民币格式文本。
 */
function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

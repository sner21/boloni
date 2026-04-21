/**
 * 渲染博洛尼定制交付仪表盘，包括采购总金额和供应商风险分布。
 */

"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { DashboardData } from "./types";

const riskColors = ["#b89157", "#4a433c", "#a8453d", "#8f6f3f", "#394b59"];

/**
 * 渲染博洛尼定制交付仪表盘。
 *
 * @param props 包含仪表盘统计数据和加载状态。
 * @returns 定制订单金额和供应商风险分布图。
 */
export function Dashboard({ data, loading = false }: { data: DashboardData | null; loading?: boolean }) {
  // 定制订单公式汇总后的总金额。
  const total = data?.totalAmount ?? 0;
  // 供应商风险等级分布。
  const riskDist = data?.riskDist ?? [];
  // 供应商总数，用于展示风险分布统计口径。
  const supplierCount = riskDist.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <section className="dashboard-page">
        <div className="dash-summary">
          <Skeleton className="dash-skeleton" />
          <Skeleton className="dash-skeleton" />
        </div>
        <Skeleton className="dash-chart-skeleton" />
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dash-summary">
        <Card>
          <CardHeader>
            <CardDescription>采购总金额统计</CardDescription>
          </CardHeader>
          <CardContent>
            <strong className="dash-value">{formatMoney(total)}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>风险等级供应商</CardDescription>
          </CardHeader>
          <CardContent>
            <strong className="dash-value">{supplierCount}</strong>
          </CardContent>
        </Card>
      </div>
      <Card className="dash-chart-card">
        <CardHeader>
          <CardTitle>各风险等级供应商数量分布</CardTitle>
          <CardDescription>按供应商表中的风险等级字段聚合。</CardDescription>
        </CardHeader>
        <CardContent className="dash-chart">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={riskDist} dataKey="value" nameKey="name" innerRadius={72} outerRadius={118} paddingAngle={2}>
                {riskDist.map((item, index) => (
                  <Cell fill={riskColors[index % riskColors.length]} key={item.name} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
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

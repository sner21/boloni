/**
 * 组合博洛尼全屋定制协同台主界面，负责表切换、数据刷新、AI 操作和交付预警入口。
 */

"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Dashboard } from "./Dashboard";
import { DynamicGrid } from "./DynamicGrid";
import { FieldPanel } from "./FieldPanel";
import type { DashboardData, FieldMeta, TableData, TableMeta } from "./types";

/**
 * 渲染博洛尼定制协同台主应用。
 *
 * @returns 博洛尼全屋定制供应链协同台页面。
 */
export function SupplyApp() {
  // 当前系统中的表列表，包含供应商、产品和定制订单三类业务表。
  const [tables, setTables] = useState<TableMeta[]>([]);
  // 当前选中的表 ID。
  const [selected, setSelected] = useState("");
  // 当前选中表的字段和记录数据。
  const [data, setData] = useState<TableData | null>(null);
  // 仪表盘统计数据。
  const [dash, setDash] = useState<DashboardData | null>(null);
  // 页面状态提示文本，面向演示操作者展示当前动作结果。
  const [status, setStatus] = useState("博洛尼定制协同台准备就绪。");

  // 当前选中的表元数据。
  const selectedTable = useMemo(() => tables.find((table) => table.id === selected), [selected, tables]);

  /**
   * 加载表列表，并在未选中表时默认选择第一张表。
   *
   */
  const loadTables = useCallback(async () => {
    const res = await fetch("/api/tables");
    const list = (await res.json()) as TableMeta[];
    setTables(list);
    setSelected((current) => current || list[0]?.id || "");
  }, []);

  /**
   * 加载当前选中表的字段、记录和解析后的单元格。
   *
   */
  const loadData = useCallback(async () => {
    if (!selected) {
      setData(null);
      return;
    }
    const res = await fetch(`/api/tables/${selected}/records`);
    setData(await res.json());
  }, [selected]);

  /**
   * 加载博洛尼定制供应链仪表盘统计数据。
   *
   */
  const loadDash = useCallback(async () => {
    const res = await fetch("/api/dashboard/supply-chain");
    setDash(await res.json());
  }, []);

  /**
   * 同时刷新表列表、当前表数据和仪表盘。
   *
   */
  const refresh = useCallback(async () => {
    await loadTables();
    await loadData();
    await loadDash();
  }, [loadDash, loadData, loadTables]);

  useEffect(() => {
    loadTables().catch(() => setStatus("博洛尼业务表加载失败。"));
    loadDash().catch(() => setStatus("定制交付仪表盘加载失败。"));
  }, [loadDash, loadTables]);

  useEffect(() => {
    loadData().catch(() => setStatus("定制协同数据加载失败。"));
  }, [loadData]);

  /**
   * 初始化博洛尼全屋定制演示数据。
   *
   */
  async function seed() {
    setStatus("正在初始化博洛尼演示数据...");
    await fetch("/api/seed/supply-chain", { method: "POST" });
    await refresh();
    setStatus("博洛尼演示数据已初始化。");
  }

  /**
   * 提交单元格编辑并刷新页面数据。
   * @param recordId 被编辑的记录 ID。
   * @param field 被编辑的字段元数据。
   * @param value 新单元格值。
   */
  async function patchCell(recordId: string, field: FieldMeta, value: unknown) {
    await fetch(`/api/records/${recordId}/cells`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cells: { [field.id]: value } }),
    });
    await loadData();
    await loadDash();
  }

  /**
   * 在当前表新增一条空记录。
   *
   */
  async function addRecord() {
    if (!selected) return;
    await fetch(`/api/tables/${selected}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cells: {} }),
    });
    await loadData();
    setStatus("定制协同记录已创建。");
  }

  /**
   * 批量运行当前表的 AI 字段生成。
   *
   * @param kind AI 操作类型，risk 为供应商履约评分，summary 为定制订单摘要。
   */
  async function runAi(kind: "risk" | "summary") {
    if (!data) return;
    const endpoint = kind === "risk" ? "/api/ai/risk-score" : "/api/ai/order-summary";
    const validRows = kind === "risk" ? data.table.slug === "suppliers" : data.table.slug === "purchase-orders";
    if (!validRows) {
      setStatus(kind === "risk" ? "请选择博洛尼供应商表。" : "请选择博洛尼定制订单表。");
      return;
    }
    setStatus("正在调用 AI 生成博洛尼协同内容...");
    for (const row of data.records) {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: row.id }),
      });
    }
    await loadData();
    setStatus("博洛尼 AI 协同字段已更新。");
  }

  /**
   * 执行库存预警自动化并刷新数据。
   *
   */
  async function runWarning() {
    setStatus("正在执行定制交付预警...");
    const res = await fetch("/api/automation/inventory-warning", { method: "POST" });
    const result = await res.json();
    await refresh();
    setStatus(`交付预警完成，新增 ${result.created?.length ?? 0} 条定制采购申请。`);
  }

  return (
    <main className="app-shell">
      <aside className="side">
        <div className="brand">
          <div>
            <h1>Boloni Base</h1>
            <span>全屋定制供应链工作台</span>
          </div>
          <Sparkles size={24} />
        </div>
        <img
          alt="博洛尼全屋定制空间"
          src="https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80"
        />
        <nav className="nav-list">
          {tables.map((table) => (
            <button
              className={`nav-button ${table.id === selected ? "active" : ""}`}
              key={table.id}
              onClick={() => setSelected(table.id)}
              type="button"
            >
              {table.name}
            </button>
          ))}
        </nav>
        <a className="nav-button" href="/reference" target="_blank">
          Scalar API 文档
        </a>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <h2>{selectedTable?.name ?? "博洛尼定制数据"}</h2>
            <p>{data ? `${data.records.length} 条记录 · ${data.fields.length} 个字段` : "初始化博洛尼演示数据后开始协同"}</p>
          </div>
          <div className="actions">
            <button className="btn secondary" onClick={seed} type="button">
              初始化博洛尼演示数据
            </button>
            <button className="btn secondary" onClick={refresh} type="button">
              <RefreshCw size={15} /> 刷新
            </button>
          </div>
        </header>
        <div className="actions">
          <button className="btn" onClick={() => runAi("risk")} type="button">
            <Sparkles size={15} /> 供应商履约评分
          </button>
          <button className="btn" onClick={() => runAi("summary")} type="button">
            <Sparkles size={15} /> 定制订单摘要
          </button>
          <button className="btn" onClick={runWarning} type="button">
            交付预警
          </button>
          <span className="status">{status}</span>
        </div>
        <DynamicGrid data={data} onAdd={addRecord} onPatch={patchCell} />
      </section>

      <aside className="right">
        <Dashboard data={dash} />
        <FieldPanel
          fields={data?.fields ?? []}
          tableId={selected}
          tables={tables}
          onCreated={refresh}
          setStatus={setStatus}
        />
      </aside>
    </main>
  );
}

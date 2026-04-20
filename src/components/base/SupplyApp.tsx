/**
 * 组合博洛尼全屋定制协同台主界面，负责页面导航、表切换、AI 操作和数据刷新。
 */

"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Dashboard } from "./Dashboard";
import { DynamicGrid } from "./DynamicGrid";
import { FieldPanel } from "./FieldPanel";
import type { DashboardData, FieldMeta, TableData, TableMeta } from "./types";

type AppPage = "table" | "dashboard" | "fields";

/**
 * 渲染博洛尼定制协同台主应用。
 *
 * @returns 博洛尼全屋定制供应链协同台页面。
 */
export function SupplyApp() {
  // 当前应用页面，切换时先更新页面框架，再让各数据区独立加载。
  const [page, setPage] = useState<AppPage>("table");
  // 左侧导航是否收起。
  const [collapsed, setCollapsed] = useState(false);
  // 当前系统中的表列表，包含供应商、产品和定制订单三类业务表。
  const [tables, setTables] = useState<TableMeta[]>([]);
  // 当前选中的表 ID。
  const [selected, setSelected] = useState("");
  // 当前选中表的字段和记录数据。
  const [data, setData] = useState<TableData | null>(null);
  // 仪表盘统计数据。
  const [dash, setDash] = useState<DashboardData | null>(null);
  // 表列表加载状态。
  const [loadingTables, setLoadingTables] = useState(true);
  // 当前表数据加载状态。
  const [loadingData, setLoadingData] = useState(false);
  // 仪表盘加载状态。
  const [loadingDash, setLoadingDash] = useState(false);
  // 页面状态提示文本，面向演示操作者展示当前动作结果。
  const [status, setStatus] = useState("博洛尼定制协同台准备就绪。");

  // 当前选中的表元数据。
  const selectedTable = useMemo(() => tables.find((table) => table.id === selected), [selected, tables]);
  // 当前表对应的业务操作按钮。
  const tableActions = useMemo(() => buildActions(data?.table.slug), [data?.table.slug]);

  /**
   * 加载表列表，并在未选中表时默认选择第一张表。
   */
  const loadTables = useCallback(async () => {
    setLoadingTables(true);
    try {
      const res = await fetch("/api/tables");
      const list = (await res.json()) as TableMeta[];
      setTables(list);
      setSelected((current) => current || list[0]?.id || "");
    } finally {
      setLoadingTables(false);
    }
  }, []);

  /**
   * 加载指定表的字段、记录和解析后的单元格。
   *
   * @param tableId 要加载的表 ID。
   */
  const loadData = useCallback(async (tableId: string) => {
    if (!tableId) {
      setData(null);
      return;
    }
    setLoadingData(true);
    setData(null);
    try {
      const res = await fetch(`/api/tables/${tableId}/records`);
      setData(await res.json());
    } finally {
      setLoadingData(false);
    }
  }, []);

  /**
   * 加载博洛尼定制供应链仪表盘统计数据。
   */
  const loadDash = useCallback(async () => {
    setLoadingDash(true);
    try {
      const res = await fetch("/api/dashboard/supply-chain");
      setDash(await res.json());
    } finally {
      setLoadingDash(false);
    }
  }, []);

  /**
   * 同时刷新当前页面所需数据。
   */
  const refresh = useCallback(async () => {
    await loadTables();
    if (selected) await loadData(selected);
    if (page === "dashboard") await loadDash();
  }, [loadDash, loadData, loadTables, page, selected]);

  useEffect(() => {
    loadTables().catch(() => setStatus("博洛尼业务表加载失败。"));
  }, [loadTables]);

  useEffect(() => {
    loadData(selected).catch(() => setStatus("定制协同数据加载失败。"));
  }, [loadData, selected]);

  useEffect(() => {
    if (page === "dashboard") {
      loadDash().catch(() => setStatus("定制交付仪表盘加载失败。"));
    }
  }, [loadDash, page]);

  /**
   * 切换到指定表页面。
   *
   * @param tableId 目标表 ID。
   */
  function openTable(tableId: string) {
    setPage("table");
    setSelected(tableId);
  }

  /**
   * 提交单元格编辑并刷新页面数据。
   *
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
    await loadData(selected);
    if (page === "dashboard") await loadDash();
  }

  /**
   * 在当前表新增一条空记录。
   */
  async function addRecord() {
    if (!selected) return;
    await fetch(`/api/tables/${selected}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cells: {} }),
    });
    await loadData(selected);
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
    setStatus("正在调用 AI 生成博洛尼协同内容...");
    for (const row of data.records) {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: row.id }),
      });
    }
    await loadData(selected);
    setStatus("博洛尼 AI 协同字段已更新。");
  }

  /**
   * 执行库存预警自动化并刷新数据。
   */
  async function runWarning() {
    setStatus("正在执行定制交付预警...");
    const res = await fetch("/api/automation/inventory-warning", { method: "POST" });
    const result = await res.json();
    await loadData(selected);
    setStatus(`交付预警完成，新增 ${result.created?.length ?? 0} 条定制采购申请。`);
  }

  return (
    <main className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className="side">
        <button className="collapse-btn" onClick={() => setCollapsed((value) => !value)} type="button">
          {collapsed ? "展开" : "收起"}
        </button>
        <div className="brand">
          <div>
            <h1>{collapsed ? "B" : "Boloni Base"}</h1>
            {!collapsed ? <span>全屋定制供应链工作台</span> : null}
          </div>
          <Sparkles size={22} />
        </div>
        <nav className="nav-list">
          <NavButton active={page === "dashboard"} collapsed={collapsed} label="仪表盘" mark="仪" onClick={() => setPage("dashboard")} />
          <NavButton active={page === "fields"} collapsed={collapsed} label="字段管理" mark="字" onClick={() => setPage("fields")} />
          {!collapsed ? <span className="nav-group">业务表</span> : null}
          {loadingTables ? <div className="nav-loading">加载中</div> : null}
          {tables.map((table) => (
            <NavButton
              active={page === "table" && table.id === selected}
              collapsed={collapsed}
              key={table.id}
              label={table.name}
              mark={table.name.slice(0, 1)}
              onClick={() => openTable(table.id)}
            />
          ))}
        </nav>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <h2>{pageTitle(page, selectedTable)}</h2>
            <p>{pageDesc(page, data, loadingData)}</p>
          </div>
          <div className="actions">
            {page === "table" && tableActions.includes("risk") ? (
              <button className="btn" onClick={() => runAi("risk")} type="button">
                <Sparkles size={15} /> 供应商履约评分
              </button>
            ) : null}
            {page === "table" && tableActions.includes("summary") ? (
              <button className="btn" onClick={() => runAi("summary")} type="button">
                <Sparkles size={15} /> 定制订单摘要
              </button>
            ) : null}
            {page === "table" && tableActions.includes("warning") ? (
              <button className="btn" onClick={runWarning} type="button">
                交付预警
              </button>
            ) : null}
            <button className="btn secondary" onClick={refresh} type="button">
              <RefreshCw size={15} /> 刷新
            </button>
          </div>
        </header>
        <div className="status-row">
          <span className="status">{status}</span>
        </div>
        {page === "dashboard" ? <Dashboard data={dash} loading={loadingDash} /> : null}
        {page === "fields" ? (
          <FieldPanel fields={data?.fields ?? []} tableId={selected} tables={tables} onCreated={refresh} setStatus={setStatus} />
        ) : null}
        {page === "table" ? <DynamicGrid data={data} loading={loadingData} onAdd={addRecord} onPatch={patchCell} /> : null}
      </section>
    </main>
  );
}

/**
 * 渲染侧栏导航按钮。
 *
 * @param props 导航按钮状态、折叠状态、文案和点击事件。
 * @returns 侧栏导航按钮。
 */
function NavButton({
  active,
  collapsed,
  label,
  mark,
  onClick,
}: {
  active: boolean;
  collapsed: boolean;
  label: string;
  mark: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick} title={label} type="button">
      <span className="nav-mark">{mark}</span>
      {!collapsed ? <span>{label}</span> : null}
    </button>
  );
}

/**
 * 按当前页面和选中表生成标题。
 *
 * @param page 当前页面。
 * @param table 当前表元数据。
 * @returns 页面标题。
 */
function pageTitle(page: AppPage, table?: TableMeta) {
  if (page === "dashboard") return "数据仪表盘";
  if (page === "fields") return "字段管理";
  return table?.name ?? "博洛尼定制数据";
}

/**
 * 按当前页面和加载状态生成说明文本。
 *
 * @param page 当前页面。
 * @param data 当前表数据。
 * @param loading 当前表是否正在加载。
 * @returns 页面说明文本。
 */
function pageDesc(page: AppPage, data: TableData | null, loading: boolean) {
  if (page === "dashboard") return "采购总金额统计和各风险等级供应商数量分布。";
  if (page === "fields") return "新增字段并配置关联、选项和公式模板。";
  if (loading) return "正在加载当前业务表数据。";
  return data ? `${data.records.length} 条记录 · ${data.fields.length} 个字段` : "请选择一张业务表。";
}

/**
 * 根据表 slug 返回当前页面可用业务动作。
 *
 * @param slug 当前表 slug。
 * @returns 业务动作列表。
 */
function buildActions(slug?: string) {
  if (slug === "suppliers") return ["risk"];
  if (slug === "purchase-orders") return ["summary"];
  if (slug === "products") return ["warning"];
  return [];
}

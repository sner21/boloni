/**
 * 组合博洛尼全屋定制协同台主界面，负责侧栏导航、页面切换和业务数据刷新。
 */

"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, LayoutDashboard, RefreshCw, SlidersHorizontal, Sparkles, Table2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { Dashboard } from "./Dashboard";
import { DynamicGrid } from "./DynamicGrid";
import { FieldPanel } from "./FieldPanel";
import type { DashboardData, FieldMeta, TableData, TableMeta } from "./types";

type AppPage = "table" | "dashboard" | "fields";

/**
 * 渲染博洛尼定制协同台主应用。
 */
export function SupplyApp() {
  // 当前应用页面，切换时先切页面框架，再局部加载内容。
  const [page, setPage] = useState<AppPage>("table");
  // 左侧导航是否收起。
  const [collapsed, setCollapsed] = useState(false);
  // 当前系统中的表列表。
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
  // 页面状态提示文本。
  const [status, setStatus] = useState("博洛尼定制协同台准备就绪。");

  // 当前选中的表元数据。
  const selectedTable = useMemo(() => tables.find((table) => table.id === selected), [selected, tables]);
  // 当前表对应的业务动作按钮。
  const tableActions = useMemo(() => buildActions(data?.table.slug), [data?.table.slug]);
  // 顶部高密度状态条。
  const pageStats = useMemo(() => buildPageStats(page, data, dash, selectedTable), [dash, data, page, selectedTable]);

  /**
   * 加载业务表列表，并在未选中表时默认选择第一张表。
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
   * 刷新当前页面所需数据。
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
   * 执行交付预警自动化并刷新数据。
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
      <aside className="side-shell">
        <Card className="side-card side-brand">
          <CardContent className="side-brand-body">
            <div className="brand-copy">
              <h1>Boloni Base</h1>
              {!collapsed ? <p>全屋定制供应链工作台</p> : null}
            </div>
            <Button onClick={() => setCollapsed((current) => !current)} size="icon" type="button" variant="ghost">
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </CardContent>
        </Card>

        {!collapsed ? (
          <Card className="side-card side-image-card">
            <CardContent className="side-image-body">
              <Image
                alt="博洛尼全屋定制空间"
                className="side-image"
                height={360}
                priority
                src="/images/boloni-space.jpg"
                width={540}
              />
            </CardContent>
          </Card>
        ) : null}

        <Card className="side-card side-menu-card">
          <CardContent className="side-menu-body">
            <div className="menu-group">页面</div>
            <MenuButton
              active={page === "dashboard"}
              collapsed={collapsed}
              icon={<LayoutDashboard size={16} />}
              label="仪表盘"
              onClick={() => setPage("dashboard")}
            />
            <MenuButton
              active={page === "fields"}
              collapsed={collapsed}
              icon={<SlidersHorizontal size={16} />}
              label="字段管理"
              onClick={() => setPage("fields")}
            />
            <Separator />
            {!collapsed ? <div className="menu-group">业务表</div> : null}
            {loadingTables ? <div className="nav-loading">正在加载业务表...</div> : null}
            {tables.map((table) => (
              <MenuButton
                active={page === "table" && table.id === selected}
                collapsed={collapsed}
                icon={<Table2 size={16} />}
                key={table.id}
                label={table.name}
                onClick={() => openTable(table.id)}
              />
            ))}
          </CardContent>
        </Card>
      </aside>

      <section className="main-shell">
        <Card className="page-head">
          <CardContent className="page-head-body">
            <div className="page-head-main">
              <div className="page-copy">
                <div className="page-copy-top">
                  <Badge>{pageBadge(page)}</Badge>
                  {selectedTable ? <Badge>{selectedTable.slug}</Badge> : null}
                </div>
                <h2>{pageTitle(page, selectedTable)}</h2>
                <p>{pageDesc(page, data, loadingData)}</p>
              </div>

              <div className="page-actions">
                {page === "table" && tableActions.includes("risk") ? (
                  <Button onClick={() => runAi("risk")} type="button">
                    <Sparkles size={15} /> 供应商履约评分
                  </Button>
                ) : null}
                {page === "table" && tableActions.includes("summary") ? (
                  <Button onClick={() => runAi("summary")} type="button">
                    <Sparkles size={15} /> 定制订单摘要
                  </Button>
                ) : null}
                {page === "table" && tableActions.includes("warning") ? (
                  <Button onClick={runWarning} type="button">
                    <Sparkles size={15} /> 交付预警
                  </Button>
                ) : null}
                <Button onClick={refresh} type="button" variant="outline">
                  <RefreshCw size={15} /> 刷新
                </Button>
              </div>
            </div>

            <div className="page-stats">
              {pageStats.map((item) => (
                <div className="page-stat" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="page-status">
              <span>{status}</span>
            </div>
          </CardContent>
        </Card>

        <div className="page-body">
          {page === "dashboard" ? <Dashboard data={dash} loading={loadingDash} /> : null}
          {page === "fields" ? (
            <FieldPanel fields={data?.fields ?? []} onCreated={refresh} setStatus={setStatus} table={selectedTable} tables={tables} />
          ) : null}
          {page === "table" ? <DynamicGrid data={data} loading={loadingData} onAdd={addRecord} onPatch={patchCell} /> : null}
        </div>
      </section>
    </main>
  );
}

/**
 * 渲染左侧菜单按钮。
 *
 * @param props 选中状态、折叠状态、图标、文案和点击事件。
 */
function MenuButton({
  active,
  collapsed,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      className={`menu-button ${active ? "active" : ""} ${collapsed ? "icon-only" : ""}`}
      onClick={onClick}
      title={label}
      type="button"
      variant="ghost"
    >
      <span className="menu-icon">{icon}</span>
      {!collapsed ? <span>{label}</span> : null}
    </Button>
  );
}

/**
 * 按当前页面生成顶部徽标文本。
 *
 * @param page 当前页面。
 * @returns 页面徽标文案。
 */
function pageBadge(page: AppPage) {
  if (page === "dashboard") return "概览";
  if (page === "fields") return "配置";
  return "工作区";
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
  if (page === "dashboard") return "采购总金额和风险等级分布集中展示，方便快速做业务判断。";
  if (page === "fields") return "关联、选项和公式字段都在这里配置，字段创建仍然保留为独立页面。";
  if (loading) return "正在加载当前业务表数据。";
  return data ? `${data.records.length} 条记录 · ${data.fields.length} 个字段` : "请选择一张业务表。";
}

/**
 * 根据当前页面生成顶部统计条。
 *
 * @param page 当前页面。
 * @param data 当前业务表数据。
 * @param dash 仪表盘数据。
 * @param table 当前表元数据。
 * @returns 统计条数组。
 */
function buildPageStats(page: AppPage, data: TableData | null, dash: DashboardData | null, table?: TableMeta) {
  if (page === "dashboard") {
    return [
      { label: "采购总金额", value: String(dash?.totalAmount ?? 0) },
      { label: "风险层级", value: String(dash?.riskDist.length ?? 0) },
      { label: "交付预警", value: String(dash?.warnings.length ?? 0) },
      { label: "业务范围", value: "全屋定制" },
    ];
  }

  if (page === "fields") {
    return [
      { label: "当前表", value: table?.name ?? "未选择" },
      { label: "字段总数", value: String(data?.fields.length ?? 0) },
      { label: "关联字段", value: String(data?.fields.filter((field) => field.type === "link").length ?? 0) },
      { label: "公式字段", value: String(data?.fields.filter((field) => field.type === "formula").length ?? 0) },
    ];
  }

  return [
    { label: "当前表", value: table?.name ?? "未选择" },
    { label: "记录", value: String(data?.records.length ?? 0) },
    { label: "字段", value: String(data?.fields.length ?? 0) },
    { label: "业务动作", value: String(buildActions(table?.slug).length) },
  ];
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

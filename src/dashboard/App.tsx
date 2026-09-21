import { useEffect, useMemo, useState } from "react";
import { TabList } from "./TabList";
import { isInitiallySelected } from "../services/classifier";
import type { ExtensionMessage, ScanResponse } from "../shared/messages";
import type { TabHealthStatus, TabScanResult } from "../shared/types";

function request(message: ExtensionMessage): Promise<ScanResponse> { return chrome.runtime.sendMessage(message); }
const flagged = (result: TabScanResult) => result.status !== "healthy";

export function App() {
  const [results, setResults] = useState<TabScanResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<"all" | TabHealthStatus>("all");
  const [scanning, setScanning] = useState(false);

  const applyResults = (next: TabScanResult[]) => { setResults(next); setSelected(new Set(next.filter(isInitiallySelected).map((r) => r.tabId))); };
  useEffect(() => { request({ type: "getResults" }).then((response) => applyResults(response.results)); }, []);
  const visible = useMemo(() => results.filter(flagged).filter((r) => filter === "all" || r.status === filter), [results, filter]);
  const ids = [...selected];
  const runScan = async () => { setScanning(true); try { applyResults((await request({ type: "scanTabs" })).results); } finally { setScanning(false); } };
  const act = async (message: ExtensionMessage) => applyResults((await request(message)).results);

  return <main className="dashboard"><header><div><p className="eyebrow">TAB HEALTH</p><h1>Dead Tab Cleaner</h1></div><button onClick={runScan} disabled={scanning}>{scanning ? "Scanning…" : "Scan tabs"}</button></header>
    <section className="summary">{(["dead", "restricted", "temporary_error", "unknown"] as TabHealthStatus[]).map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status.replace("_", " ")}: {results.filter((r) => r.status === status).length}</button>)}<button onClick={() => setFilter("all")}>All flagged</button></section>
    <TabList results={visible} selectedIds={selected} onSelectionChange={(id, checked) => setSelected((current) => { const next = new Set(current); checked ? next.add(id) : next.delete(id); return next; })} />
    <footer className="actions"><span>{ids.length} selected</span><button disabled={!ids.length} onClick={() => { if (confirm(`Close ${ids.length} tabs?`)) act({ type: "closeTabs", tabIds: ids }); }}>Close</button><button disabled={!ids.length} onClick={() => act({ type: "moveToWindow", tabIds: ids })}>Move to new window</button><button disabled={!ids.length} onClick={() => { const title = prompt("Group name", "Dead tabs"); if (title) act({ type: "groupTabs", tabIds: ids, title }); }}>Add to group</button><button onClick={() => act({ type: "undoClose" })}>Undo close</button></footer>
  </main>;
}

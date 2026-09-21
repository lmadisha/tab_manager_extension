import { useEffect, useState } from "react";
import type { ScanResponse } from "../shared/messages";
import type { TabScanResult } from "../shared/types";

export function App() {
  const [results, setResults] = useState<TabScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  useEffect(() => { chrome.runtime.sendMessage({ type: "getResults" }).then((response: ScanResponse) => setResults(response.results)); }, []);
  const scan = async () => { setScanning(true); try { setResults((await chrome.runtime.sendMessage({ type: "scanTabs" }) as ScanResponse).results); } finally { setScanning(false); } };
  return <main className="popup"><p className="eyebrow">TAB HEALTH</p><h1>Dead Tab Cleaner</h1><p>{results.length ? `${results.filter((r) => r.status === "dead").length} dead tabs found` : "Ready to check your open tabs"}</p><button onClick={scan} disabled={scanning}>{scanning ? "Scanning…" : "Scan tabs"}</button><button className="secondary" onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/index.html") })}>Review results</button></main>;
}

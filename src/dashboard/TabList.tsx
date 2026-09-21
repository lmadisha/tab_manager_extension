import type { TabScanResult } from "../shared/types";

interface TabListProps {
  results: TabScanResult[];
  selectedIds: Set<number>;
  onSelectionChange: (tabId: number, selected: boolean) => void;
}

export function TabList({ results, selectedIds, onSelectionChange }: TabListProps) {
  if (!results.length) return <p className="empty">No flagged tabs in this scan.</p>;
  return <ul className="tab-list">{results.map((result) => <li key={result.tabId} className={`tab-result ${result.status}`}>
    <label>
      <input aria-label={result.title} type="checkbox" checked={selectedIds.has(result.tabId)} onChange={(event) => onSelectionChange(result.tabId, event.target.checked)} />
      <span><strong>{result.title}</strong><small>{result.url}</small><em>{result.reason} · {result.confidence} confidence</em></span>
    </label>
  </li>)}</ul>;
}

import { useEffect, useState } from "react";
import type { TabScanResult } from "../shared/types";

const RESULTS_BATCH_SIZE = 100;

interface TabListProps {
  results: TabScanResult[];
  selectedIds: Set<number>;
  emptyMessage?: string;
  onSelectionChange: (tabId: number, selected: boolean) => void;
}

export function TabList({ results, selectedIds, emptyMessage = "No flagged tabs in this scan.", onSelectionChange }: TabListProps) {
  const [visibleCount, setVisibleCount] = useState(RESULTS_BATCH_SIZE);
  useEffect(() => setVisibleCount(RESULTS_BATCH_SIZE), [results]);
  if (!results.length) return <p className="empty">{emptyMessage}</p>;
  const visibleResults = results.slice(0, visibleCount);
  return <>
    <ul className="tab-list">{visibleResults.map((result) => <li key={result.tabId} className={`tab-result ${result.status}`}>
      <label>
        <input aria-label={result.title} type="checkbox" checked={selectedIds.has(result.tabId)} onChange={(event) => onSelectionChange(result.tabId, event.target.checked)} />
        <span><strong>{result.title}</strong>{result.duplicateOfTabId !== undefined && <small className="duplicate-marker">Duplicate of tab #{result.duplicateOfTabId}</small>}<small>{result.url}</small><em>{result.reason} · {result.confidence} confidence</em></span>
      </label>
    </li>)}</ul>
    <div className="result-count">
      <span>Showing {visibleResults.length} of {results.length}</span>
      {visibleCount < results.length && <button type="button" className="secondary" onClick={() => setVisibleCount((count) => count + RESULTS_BATCH_SIZE)}>Load {Math.min(RESULTS_BATCH_SIZE, results.length - visibleCount)} more</button>}
    </div>
  </>;
}

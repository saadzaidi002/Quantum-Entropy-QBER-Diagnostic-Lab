import type { MarkovModel } from "../lib/entropy";
import { THRESHOLDS } from "../lib/verdict";
import { Icon } from "./Icon";

export function MarkovTable({ m }: { m: MarkovModel }) {
  const cell = (a: 0 | 1, b: 0 | 1) => {
    const p = m.P[a][b];
    const off = m.rowTotals[a] > 0 && Math.abs(p - 0.5) > THRESHOLDS.markovCellDeviation;
    return (
      <td className={off ? "cell-warn" : ""}>
        P({b}|{a}) = {p.toFixed(3)}
        <span className="cell-count">n = {m.counts[a][b]}</span>
        {off && (
          <span className="cell-flag">
            <Icon name="alert" size={12} /> far from 0.5
          </span>
        )}
      </td>
    );
  };
  return (
    <table className="matrix-table">
      <caption className="sr-only">First-order Markov transition matrix with counts</caption>
      <thead>
        <tr>
          <th scope="col">Previous \ next</th>
          <th scope="col">Next = 0</th>
          <th scope="col">Next = 1</th>
          <th scope="col">Row total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Previous = 0</th>
          {cell(0, 0)}
          {cell(0, 1)}
          <td>{m.rowTotals[0]}</td>
        </tr>
        <tr>
          <th scope="row">Previous = 1</th>
          {cell(1, 0)}
          {cell(1, 1)}
          <td>{m.rowTotals[1]}</td>
        </tr>
      </tbody>
    </table>
  );
}

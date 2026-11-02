// The sign on a letter: how many more stops wait behind the one on screen.
import "./MoreWaiting.css";

export function MoreWaiting({ count }: { count: number }) {
  return count > 0 ? <p className="more-waiting">{count} more waiting</p> : null;
}

import Skeleton from "react-loading-skeleton";
import "./preview.css";

export default function SkeletonPreview() {
  return (
    <div className="sites-skeleton-shell">
      <div className="sites-skeleton-status" role="status">
        <Skeleton baseColor="#eceae7" highlightColor="#f9f8f6" duration={2.8} />
      </div>
      <div className="sites-skeleton-search-placeholder" />
    </div>
  );
}

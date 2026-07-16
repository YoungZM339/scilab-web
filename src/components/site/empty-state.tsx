export function EmptyState({
  title = "内容正在整理中",
  description = "相关内容将在准备完成后发布，欢迎稍后再来。",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

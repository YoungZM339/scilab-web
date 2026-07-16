import Link from "next/link";

export default function NotFound() {
  return (
    <section className="content-section">
      <div className="narrow-container empty-state">
        <p className="eyebrow" style={{ justifyContent: "center" }}>
          404
        </p>
        <h1 className="section-title">页面未找到</h1>
        <p>该内容可能尚未发布、已被取消发布，或访问地址有误。</p>
        <div className="button-row" style={{ justifyContent: "center" }}>
          <Link className="button button-primary" href="/">
            返回首页
          </Link>
        </div>
      </div>
    </section>
  );
}

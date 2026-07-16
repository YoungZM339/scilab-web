import type { Metadata } from "next";

import { PersonCard } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { MEMBER_GROUP_LABELS, type MemberGroup } from "@/lib/constants";
import { getMembers } from "@/server/services/public";

export const metadata: Metadata = {
  title: "团队成员",
  description: "认识实验室的教师、研究人员、学生与校友。",
  alternates: { canonical: "/people" },
};

const groupOrder: MemberGroup[] = [
  "principal_investigator",
  "faculty",
  "postdoc_researcher",
  "student",
  "alumni",
];

export default async function PeoplePage() {
  const members = await getMembers();

  return (
    <>
      <PageHero
        description="因共同的科学兴趣相聚，以开放协作推动研究向前。"
        eyebrow="People"
        title="团队成员"
      />
      <section className="content-section">
        <div className="site-container">
          {members.length === 0 ? (
            <EmptyState description="团队成员信息尚未发布。" />
          ) : (
            groupOrder.map((group) => {
              const groupedMembers = members.filter(
                (member) => member.group === group,
              );
              if (groupedMembers.length === 0) return null;

              return (
                <section className="group-section" key={group}>
                  <h2 className="group-title">{MEMBER_GROUP_LABELS[group]}</h2>
                  <div className="site-grid grid-4">
                    {groupedMembers.map((member) => (
                      <PersonCard key={member.id} member={member} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}

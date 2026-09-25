import { Card, Hero, Section } from '@angisoft/ui';
import { safeGet } from '@angisoft/api-client';
import { useAsync } from '@/hooks/useAsync';

interface StaffMember {
  id?: string;
  name?: string;
  title?: string;
  role?: string;
  avatarUrl?: string;
  avatar?: string;
  photo?: string;
}

interface StaffPayload {
  data?: StaffMember[];
  staff?: StaffMember[];
}

const normalizeStaff = (raw: unknown): StaffMember[] => {
  if (Array.isArray(raw)) return raw as StaffMember[];
  const obj = raw as StaffPayload;
  if (Array.isArray(obj.data)) return obj.data;
  if (Array.isArray(obj.staff)) return obj.staff;
  return [];
};

const avatarOf = (member: StaffMember): string | undefined =>
  member.avatarUrl ?? member.avatar ?? member.photo ?? undefined;

const initialsOf = (member: StaffMember): string => {
  const name = member.name ?? 'Team';
  const parts = name.split(' ').filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
};

export default function Staff() {
  const staff = useAsync(async () => {
    const res = await safeGet<unknown>('/staff');
    return res.ok ? normalizeStaff(res.data) : [];
  }, []);

  return (
    <>
      <Hero
        badge="Our team"
        title="The people behind the products"
        subtitle="Engineers, designers and operators who care about the details."
      />

      <Section>
        {staff.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!staff.loading && (!staff.data || staff.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            Our team profiles will appear here shortly.
          </div>
        ) : null}
        {!staff.loading && staff.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {staff.data.map((member, i) => (
              <Card key={member.id ?? i} className="p-6 text-center">
                {avatarOf(member) ? (
                  <img
                    src={avatarOf(member)}
                    alt={member.name ?? 'Team member'}
                    className="mx-auto h-20 w-20 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0875FF]/10 text-xl font-bold text-[#0875FF]">
                    {initialsOf(member)}
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                  {member.name ?? 'Team member'}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{member.title ?? member.role ?? 'Team'}</p>
              </Card>
            ))}
          </div>
        ) : null}
      </Section>
    </>
  );
}
// @ts-nocheck
import { resolveIcon } from '../iconRegistry';
import { resolveAssetUrl } from '../constants';

export type ApiSolutionItem = { id?: string; icon?: string; name: string };
export type ApiSolutionCategory = { id?: string; name: string; bgImage?: string; items?: ApiSolutionItem[] };
export type NormalizedSolution = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: ReturnType<typeof resolveIcon>;
  bgImage: string;
  features: string[];
};

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const getSolutionRoute = (slug?: string) => `/solutions/${slug || ''}`;

export function normalizeSolutions(categories: ApiSolutionCategory[] = []): NormalizedSolution[] {
  return categories.flatMap((category, categoryIndex) =>
    (category.items || []).map((item, itemIndex) => ({
      id: item.id || `solution-${categoryIndex}-${itemIndex}`,
      slug: slugify(item.name),
      name: item.name,
      description: category.name,
      icon: resolveIcon(item.icon),
      bgImage: resolveAssetUrl(category.bgImage || ''),
      features: [category.name],
    })),
  );
}

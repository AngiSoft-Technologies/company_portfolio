const normalizeIdentifier = (value) => {
  if (!value) return '';
  return String(value).trim();
};

const slugify = (value) => normalizeIdentifier(value)
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const firstIdentifier = (...values) => values.map(normalizeIdentifier).find(Boolean) || '';

export const getServiceDetailPath = (service) => {
  const identifier = firstIdentifier(service?.slug, service?.id, service?._id);
  return identifier ? `/service/${identifier}` : '/services';
};

export const getProjectDetailPath = (project) => {
  const identifier = firstIdentifier(project?.slug, project?.id, project?._id);
  return identifier ? `/project/${identifier}` : '/projects';
};

export const getStaffDetailPath = (member) => {
  const identifier = firstIdentifier(member?.username, member?.slug, member?.id, member?._id);
  return identifier ? `/staff/${identifier}` : '/staff';
};

export const getBlogDetailPath = (post) => {
  const identifier = firstIdentifier(post?.slug, post?.id, post?._id);
  return identifier ? `/blog/${identifier}` : '/blog';
};

export const PRODUCT_DETAIL_PATHS = {
  petroflow: '/products/petroflow',
  dukaflow: '/products/dukaflow',
  'duka-flow': '/products/dukaflow',
  kejalink: '/products/kejalink',
  'keja-link': '/products/kejalink',
  angitunes: '/products/angitunes',
  'angi-tunes': '/products/angitunes',
};

export const getProductDetailPath = (product) => {
  const key = slugify(firstIdentifier(product?.slug, product?.key, product?.id, product?.name, product?.title));
  return key ? `/products/${key}` : '/products';
};

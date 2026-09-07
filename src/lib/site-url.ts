export function withBasePath(pathname: string, basePath = import.meta.env.BASE_URL) {
  return `${basePath.replace(/\/?$/, '/')}${pathname.replace(/^\//, '')}`;
}

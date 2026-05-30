export function buildSlug(title: string, city: string, uf: string, id: string): string {
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  return `${normalize(title)}-em-${normalize(city)}-${normalize(uf)}-${id}`
}

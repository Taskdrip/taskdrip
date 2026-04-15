import { useQuery } from "@tanstack/react-query";

interface ContentBlock {
  id: string;
  page: string;
  section: string;
  key: string;
  value: string | null;
  defaultValue: string | null;
  type: string;
  label: string;
}

export function usePageContent(page: string) {
  const { data = [] } = useQuery<ContentBlock[]>({
    queryKey: ["/api/page-content", page],
    queryFn: () => fetch(`/api/page-content/${page}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  function get(section: string, key: string, fallback = ""): string {
    const block = data.find((b) => b.section === section && b.key === key);
    if (!block) return fallback;
    return block.value || block.defaultValue || fallback;
  }

  return { get, blocks: data };
}

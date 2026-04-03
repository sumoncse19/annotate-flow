import { useQuery } from "@tanstack/react-query"
import api from "@/shared/api"
import type { PipelineStatus, RecentJob, Analytics } from "./types"

export function usePipelineStatus() {
  return useQuery<PipelineStatus>({
    queryKey: ["pipeline-status"],
    queryFn: () => api.get("/pipeline/status").then((r) => r.data),
    refetchInterval: 3000,
  })
}

export function useAnalytics() {
  return useQuery<Analytics>({
    queryKey: ["analytics"],
    queryFn: () => api.get("/pipeline/analytics").then((r) => r.data),
  })
}

export function useRecentJobs(limit = 20) {
  return useQuery<RecentJob[]>({
    queryKey: ["pipeline-recent", limit],
    queryFn: () =>
      api.get("/pipeline/recent", { params: { limit } }).then((r) => r.data),
    refetchInterval: 3000,
  })
}

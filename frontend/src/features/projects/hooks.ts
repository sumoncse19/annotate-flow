import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/shared/api"
import type { PaginatedResponse } from "@/shared/types"
import type { Project } from "./types"

export function useProjects(search: string, page: number, limit = 12) {
  const skip = page * limit
  return useQuery<PaginatedResponse<Project>>({
    queryKey: ["projects", search, page, limit],
    queryFn: () =>
      api
        .get("/projects/", {
          params: { search: search || undefined, skip, limit },
        })
        .then((r) => r.data),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.post("/projects/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

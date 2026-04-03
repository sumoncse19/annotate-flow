import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/shared/api"
import type { Task } from "./types"

export function useTasks(projectId: string) {
  return useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/tasks/`).then((r) => r.data),
  })
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      title: string
      description: string
      task_type: string
    }) => api.post(`/projects/${projectId}/tasks/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

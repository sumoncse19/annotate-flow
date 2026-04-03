import { useState } from "react"
import { DashboardLayout } from "@/shared/layout/DashboardLayout"
import { ProjectList } from "@/features/projects/ProjectList"
import { PipelineMonitor } from "@/features/pipeline/PipelineMonitor"

type Tab = "projects" | "pipeline"

interface DashboardPageProps {
  onLogout: () => void
}

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("projects")

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={onLogout}
    >
      {activeTab === "projects" && <ProjectList />}
      {activeTab === "pipeline" && <PipelineMonitor />}
    </DashboardLayout>
  )
}
